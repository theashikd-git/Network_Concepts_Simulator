<?php
// POST { slug } from the ⭐ button — toggles the favorite on/off.

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/dashboard_data.php';

header('Content-Type: application/json');

if (!isLoggedIn() || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Not logged in.']);
    exit;
}

$sentToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $sentToken)) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Security check failed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$slug = $input['slug'] ?? '';

$simulation = getSimulationBySlug($pdo, $slug);
if (!$simulation) {
    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'Unknown module.']);
    exit;
}

$userId = (int) $_SESSION['user_id'];

$stmt = $pdo->prepare('SELECT 1 FROM favorites WHERE user_id = :uid AND simulation_id = :sid');
$stmt->execute(['uid' => $userId, 'sid' => $simulation['id']]);

if ($stmt->fetch()) {
    $stmt = $pdo->prepare('DELETE FROM favorites WHERE user_id = :uid AND simulation_id = :sid');
    $stmt->execute(['uid' => $userId, 'sid' => $simulation['id']]);
    echo json_encode(['ok' => true, 'favorited' => false]);
} else {
    $stmt = $pdo->prepare('INSERT INTO favorites (user_id, simulation_id) VALUES (:uid, :sid)');
    $stmt->execute(['uid' => $userId, 'sid' => $simulation['id']]);
    echo json_encode(['ok' => true, 'favorited' => true]);
}
