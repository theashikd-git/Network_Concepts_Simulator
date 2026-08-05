<?php
// Queries used by the dashboard, quiz, notes, and favorites pages.

require_once __DIR__ . '/db.php';

function getActiveSimulations(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT id, slug, title, description, icon
         FROM simulations
         WHERE is_active = 1
         ORDER BY sort_order ASC'
    );
    return $stmt->fetchAll();
}

// Returns [slug => progress row]. A module with no entry hasn't been started.
function getUserProgressBySlug(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT s.slug, up.status, up.last_opened_at, up.completed_at
         FROM user_progress up
         JOIN simulations s ON s.id = up.simulation_id
         WHERE up.user_id = :uid'
    );
    $stmt->execute(['uid' => $userId]);

    $bySlug = [];
    foreach ($stmt->fetchAll() as $row) {
        $bySlug[$row['slug']] = $row;
    }
    return $bySlug;
}

function getRecentSimulations(PDO $pdo, int $userId, int $limit = 3): array
{
    $stmt = $pdo->prepare(
        'SELECT s.slug, s.title, s.icon, up.status, up.last_opened_at
         FROM user_progress up
         JOIN simulations s ON s.id = up.simulation_id
         WHERE up.user_id = :uid AND up.last_opened_at IS NOT NULL
         ORDER BY up.last_opened_at DESC
         LIMIT ' . (int) $limit
    );
    $stmt->execute(['uid' => $userId]);
    return $stmt->fetchAll();
}

function getProgressSummary(PDO $pdo, int $userId): array
{
    $active = getActiveSimulations($pdo);
    $total = count($active);

    if ($total === 0) {
        return ['completed' => 0, 'total' => 0, 'percent' => 0];
    }

    $stmt = $pdo->prepare(
        "SELECT COUNT(*) AS n
         FROM user_progress up
         JOIN simulations s ON s.id = up.simulation_id
         WHERE up.user_id = :uid AND up.status = 'completed' AND s.is_active = 1"
    );
    $stmt->execute(['uid' => $userId]);
    $completed = (int) $stmt->fetch()['n'];

    return [
        'completed' => $completed,
        'total'     => $total,
        'percent'   => (int) round(($completed / $total) * 100),
    ];
}

// First active module the student hasn't finished yet, or null if all done.
function getContinueLearningTarget(PDO $pdo, int $userId): ?array
{
    $active = getActiveSimulations($pdo);
    $progress = getUserProgressBySlug($pdo, $userId);

    foreach ($active as $sim) {
        $status = $progress[$sim['slug']]['status'] ?? 'not_started';
        if ($status !== 'completed') {
            return $sim;
        }
    }
    return null;
}

function avatarInitial(string $name): string
{
    $name = trim($name);
    return $name === '' ? '?' : strtoupper(substr($name, 0, 1));
}

function getSimulationBySlug(PDO $pdo, string $slug): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM simulations WHERE slug = :slug AND is_active = 1');
    $stmt->execute(['slug' => $slug]);
    $row = $stmt->fetch();
    return $row ?: null;
}

// Every active module tagged with this student's status + favorite flag.
function getAllModulesWithStatus(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        "SELECT s.id, s.slug, s.title, s.icon,
                COALESCE(up.status, 'not_started') AS status,
                (f.user_id IS NOT NULL) AS is_favorite
         FROM simulations s
         LEFT JOIN user_progress up ON up.simulation_id = s.id AND up.user_id = :uid1
         LEFT JOIN favorites f ON f.simulation_id = s.id AND f.user_id = :uid2
         WHERE s.is_active = 1
         ORDER BY s.sort_order ASC"
    );
    $stmt->execute(['uid1' => $userId, 'uid2' => $userId]);
    return $stmt->fetchAll();
}

function getFavoriteModules(PDO $pdo, int $userId): array
{
    $stmt = $pdo->prepare(
        'SELECT s.slug, s.title, s.icon
         FROM favorites f
         JOIN simulations s ON s.id = f.simulation_id
         WHERE f.user_id = :uid
         ORDER BY f.created_at DESC'
    );
    $stmt->execute(['uid' => $userId]);
    return $stmt->fetchAll();
}

function getQuizSummaryForUser(PDO $pdo, int $userId, int $simulationId): array
{
    $stmt = $pdo->prepare(
        'SELECT MAX(score) AS best_score, MAX(total_questions) AS total_questions, COUNT(*) AS attempts
         FROM quiz_attempts WHERE user_id = :uid AND simulation_id = :sid'
    );
    $stmt->execute(['uid' => $userId, 'sid' => $simulationId]);
    return $stmt->fetch();
}
