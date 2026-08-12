<?php
// Admin: every quiz attempt, newest first.

require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$stmt = $pdo->query(
    "SELECT qa.id, u.name AS student_name, s.title AS module_title,
            qa.score, qa.total_questions, qa.attempt_number, qa.created_at
     FROM quiz_attempts qa
     JOIN users u ON u.id = qa.user_id
     JOIN simulations s ON s.id = qa.simulation_id
     ORDER BY qa.created_at DESC
     LIMIT 200"
);
$attempts = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin · Quiz Scores — Network Concepts Simulator</title>
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

  <main style="max-width:820px;">
    <h1 style="margin-bottom:18px;">Admin</h1>
    <nav class="admin-nav">
      <a href="students.php">Students</a>
      <a href="questions.php">Quiz questions</a>
      <a href="scores.php" class="active">Quiz scores</a>
      <a href="reports.php">Reports</a>
    </nav>

    <div class="card">
      <table class="admin-table">
        <thead><tr><th>Student</th><th>Module</th><th>Score</th><th>Attempt</th><th>Date</th></tr></thead>
        <tbody>
          <?php if (empty($attempts)): ?>
            <tr><td colspan="5" class="empty-note">No quiz attempts yet.</td></tr>
          <?php endif; ?>
          <?php foreach ($attempts as $a): ?>
            <tr>
              <td class="cell-name"><?= htmlspecialchars($a['student_name']) ?></td>
              <td><?= htmlspecialchars($a['module_title']) ?></td>
              <td><?= (int) $a['score'] ?> / <?= (int) $a['total_questions'] ?></td>
              <td>#<?= (int) $a['attempt_number'] ?></td>
              <td><?= htmlspecialchars(date('M j, Y g:ia', strtotime($a['created_at']))) ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </main>
</body>
</html>
