<?php
// One note per student per module — notes.php?sim=osi

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/dashboard_data.php';
requireLogin();

$user = currentUser();
$userId = (int) $user['id'];

$slug = $_GET['sim'] ?? '';
$simulation = getSimulationBySlug($pdo, $slug);

if (!$simulation) {
    http_response_code(404);
    die('Unknown module.');
}

$saved = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $content = trim($_POST['content'] ?? '');

    // Upsert: create the note if this is the first save, otherwise
    // update the existing one. An empty save just clears it.
    $stmt = $pdo->prepare(
        'INSERT INTO notes (user_id, simulation_id, content)
         VALUES (:uid, :sid, :content)
         ON DUPLICATE KEY UPDATE content = VALUES(content)'
    );
    $stmt->execute(['uid' => $userId, 'sid' => $simulation['id'], 'content' => $content]);
    $saved = true;
}

$stmt = $pdo->prepare('SELECT content, updated_at FROM notes WHERE user_id = :uid AND simulation_id = :sid');
$stmt->execute(['uid' => $userId, 'sid' => $simulation['id']]);
$note = $stmt->fetch();
$currentContent = $note['content'] ?? '';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($simulation['title']) ?> Notes — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/dashboard.css">
<style>
  textarea{
    width:100%; min-height:220px; background:var(--panel-2); border:1px solid var(--border);
    border-radius:8px; padding:12px 14px; color:var(--text); font-family:var(--font-body); font-size:14px;
    resize:vertical; outline:none;
  }
  textarea:focus{border-color:var(--green);}
</style>
</head>
<body>

  <div class="topbar">
    <div class="brand">Network Concepts Simulator</div>
    <div class="user">
      <a href="dashboard.php" class="logout-link">← Dashboard</a>
      <a href="logout.php" class="logout-link">Log out</a>
    </div>
  </div>

  <main style="max-width:640px;">
    <h1 style="margin-bottom:4px;"><?= htmlspecialchars($simulation['title']) ?></h1>
    <p style="color:var(--text-dim); font-size:14px; margin:0 0 22px;">My Notes</p>

    <?php if ($saved): ?><div class="alert alert-success">Note saved.</div><?php endif; ?>

    <form method="post" class="card">
      <?= csrfField() ?>
      <textarea name="content" placeholder="Write anything you want to remember about this module..."><?= htmlspecialchars($currentContent) ?></textarea>
      <?php if (!empty($note['updated_at'])): ?>
        <p style="font-size:11.5px; color:var(--text-faint); margin:10px 0 0;">Last saved <?= htmlspecialchars($note['updated_at']) ?></p>
      <?php endif; ?>
      <button type="submit" class="auth-btn" style="width:auto; padding:9px 18px; margin-top:12px;">Save</button>
    </form>
  </main>
</body>
</html>
