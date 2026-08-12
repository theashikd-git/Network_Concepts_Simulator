<?php
// Admin: platform-wide stats.

require_once __DIR__ . '/../../includes/auth.php';
requireAdmin();

$totalStudents = (int) $pdo->query("SELECT COUNT(*) AS n FROM users WHERE role = 'student'")->fetch()['n'];

$totalCompleted = (int) $pdo->query("SELECT COUNT(*) AS n FROM user_progress WHERE status = 'completed'")->fetch()['n'];

$avgScoreRow = $pdo->query(
    "SELECT AVG(score / total_questions) * 100 AS avg_pct FROM quiz_attempts WHERE total_questions > 0"
)->fetch();
$avgScorePercent = $avgScoreRow['avg_pct'] !== null ? round((float) $avgScoreRow['avg_pct'], 1) : null;

$mostPopular = $pdo->query(
    "SELECT s.title, COUNT(*) AS opens
     FROM user_progress up
     JOIN simulations s ON s.id = up.simulation_id
     GROUP BY s.id, s.title
     ORDER BY opens DESC
     LIMIT 1"
)->fetch();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin · Reports — Network Concepts Simulator</title>
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
      <a href="scores.php">Quiz scores</a>
      <a href="reports.php" class="active">Reports</a>
    </nav>

    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-value"><?= $totalStudents ?></div>
        <div class="stat-label">Total students</div>
      </div>
      <div class="stat-box">
        <div class="stat-value"><?= $totalCompleted ?></div>
        <div class="stat-label">Completed simulations</div>
      </div>
      <div class="stat-box">
        <div class="stat-value"><?= $avgScorePercent !== null ? $avgScorePercent . '%' : '—' ?></div>
        <div class="stat-label">Average quiz score</div>
      </div>
      <div class="stat-box">
        <div class="stat-value" style="font-size:17px;"><?= $mostPopular ? htmlspecialchars($mostPopular['title']) : '—' ?></div>
        <div class="stat-label">Most popular simulation</div>
      </div>
    </div>
  </main>
</body>
</html>
