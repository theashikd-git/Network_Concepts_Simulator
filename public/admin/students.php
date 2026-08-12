<?php
// Admin: view every student, delete an account (cascades to their
// progress/notes/favorites/quiz history via the DB foreign keys).

require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/dashboard_data.php';
requireAdmin();

$admin = currentUser();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'delete_student') {
    verifyCsrf();
    $targetId = (int) ($_POST['user_id'] ?? 0);

    // Safety: an admin can't delete their own account from this screen.
    if ($targetId !== (int) $admin['id']) {
        $stmt = $pdo->prepare('DELETE FROM users WHERE id = :id AND role = "student"');
        $stmt->execute(['id' => $targetId]);
    }
    header('Location: students.php');
    exit;
}

$totalActive = (int) $pdo->query('SELECT COUNT(*) AS n FROM simulations WHERE is_active = 1')->fetch()['n'];

$stmt = $pdo->query(
    "SELECT u.id, u.name, u.email, u.created_at,
            COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.simulation_id END) AS completed_count
     FROM users u
     LEFT JOIN user_progress up ON up.user_id = u.id
     WHERE u.role = 'student'
     GROUP BY u.id, u.name, u.email, u.created_at
     ORDER BY u.created_at DESC"
);
$students = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin · Students — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/dashboard.css">
</head>
<body>

  <div class="topbar">
    <div class="brand">Network Concepts Simulator · Admin</div>
    <div class="user">
      <a href="../logout.php" class="logout-link">Log out</a>
    </div>
  </div>

  <main style="max-width:900px;">
    <h1 style="margin-bottom:18px;">Admin</h1>
    <nav class="admin-nav">
      <a href="students.php" class="active">Students</a>
      <a href="questions.php">Quiz questions</a>
      <a href="scores.php">Quiz scores</a>
      <a href="reports.php">Reports</a>
    </nav>

    <div class="card">
      <table class="admin-table">
        <thead>
          <tr><th>Student</th><th>Email</th><th>Progress</th><th>Joined</th><th></th></tr>
        </thead>
        <tbody>
          <?php if (empty($students)): ?>
            <tr><td colspan="5" class="empty-note">No students yet.</td></tr>
          <?php endif; ?>
          <?php foreach ($students as $s): ?>
            <tr>
              <td class="cell-name"><?= htmlspecialchars($s['name']) ?></td>
              <td><?= htmlspecialchars($s['email']) ?></td>
              <td><?= (int) $s['completed_count'] ?> / <?= $totalActive ?></td>
              <td><?= htmlspecialchars(date('M j, Y', strtotime($s['created_at']))) ?></td>
              <td>
                <form method="post" class="inline-form" onsubmit="return confirm('Delete this student and all their data? This cannot be undone.');">
                  <?= csrfField() ?>
                  <input type="hidden" name="action" value="delete_student">
                  <input type="hidden" name="user_id" value="<?= (int) $s['id'] ?>">
                  <button type="submit" class="btn-danger">Delete</button>
                </form>
              </td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
