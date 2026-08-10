<?php
// POST { slug, status, timeSpentSeconds } from a module page whenever a
// student opens or finishes a simulation. status: 'in_progress' | 'completed'

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/dashboard_data.php';

header('Content-Type: application/json');

if (!isLoggedIn() || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Not logged in.']);
    exit;
}

// CSRF check for fetch requests: token comes back as a custom header
// instead of a form field.
$sentToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $sentToken)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Security check failed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$slug = $input['slug'] ?? '';
$status = $input['status'] ?? '';
$timeSpent = max(0, (int) ($input['timeSpentSeconds'] ?? 0));

if (!in_array($status, ['in_progress', 'completed'], true)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Invalid status.']);
    exit;
}

$simulation = getSimulationBySlug($pdo, $slug);
if (!$simulation) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Unknown module.']);
    exit;
}

$userId = (int) $_SESSION['user_id'];

// Upsert — never downgrade a completed module back to in_progress.
$stmt = $pdo->prepare(
    "INSERT INTO user_progress (user_id, simulation_id, status, time_spent_seconds, last_opened_at, completed_at)
     VALUES (:uid, :sid, :status, :time, NOW(), :completed_at)
     ON DUPLICATE KEY UPDATE
       status = IF(status = 'completed', 'completed', VALUES(status)),
       time_spent_seconds = time_spent_seconds + VALUES(time_spent_seconds),
       last_opened_at = NOW(),
       completed_at = IF(status = 'completed', completed_at, VALUES(completed_at))"
);
$stmt->execute([
    'uid'          => $userId,
    'sid'          => $simulation['id'],
    'status'       => $status,
    'time'         => $timeSpent,
    'completed_at' => $status === 'completed' ? date('Y-m-d H:i:s') : null,
]);

echo json_encode(['ok' => true]);
