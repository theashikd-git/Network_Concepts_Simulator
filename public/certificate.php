<?php
// Certificate once every module is completed. Generated once per
// student — later visits just show the same certificate/ID again.

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/dashboard_data.php';
requireLogin();

$user = currentUser();
$userId = (int) $user['id'];

$progress = getProgressSummary($pdo, $userId);
$eligible = $progress['total'] > 0 && $progress['completed'] === $progress['total'];

$certificate = null;

if ($eligible) {
    $stmt = $pdo->prepare('SELECT certificate_code, issued_at FROM certificates WHERE user_id = :uid');
    $stmt->execute(['uid' => $userId]);
    $certificate = $stmt->fetch();

    // First time reaching 100%: mint a certificate now.
    if (!$certificate) {
        $code = 'NCS-' . strtoupper(bin2hex(random_bytes(5)));
        $stmt = $pdo->prepare('INSERT INTO certificates (user_id, certificate_code) VALUES (:uid, :code)');
        $stmt->execute(['uid' => $userId, 'code' => $code]);

        $stmt = $pdo->prepare('SELECT certificate_code, issued_at FROM certificates WHERE user_id = :uid');
        $stmt->execute(['uid' => $userId]);
        $certificate = $stmt->fetch();
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Certificate — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/dashboard.css">
<style>
  .cert{
    max-width:720px; margin:0 auto; background:var(--panel); border:2px solid var(--green-dim);
    border-radius:14px; padding:56px 48px; text-align:center; position:relative;
  }
  .cert::before{
    content:''; position:absolute; inset:10px; border:1px solid var(--border-soft); border-radius:8px; pointer-events:none;
  }
  .cert .cert-label{font-family:var(--font-mono); font-size:11px; letter-spacing:2px; color:var(--green); text-transform:uppercase;}
  .cert h1{font-size:26px; margin:14px 0 24px;}
  .cert .cert-name{font-family:var(--font-display); font-size:34px; color:var(--text); margin:10px 0; border-bottom:2px solid var(--green); display:inline-block; padding-bottom:6px;}
  .cert p{color:var(--text-dim); font-size:14.5px;}
  .cert .cert-meta{
    display:flex; justify-content:center; gap:40px; margin-top:34px; padding-top:20px;
    border-top:1px solid var(--border-soft); font-family:var(--font-mono); font-size:12px; color:var(--text-faint);
  }
  .print-btn{display:block; margin:22px auto 0;}
  @media print{
    .topbar, .print-btn, .no-print{display:none !important;}
    body{background:#fff; color:#111;}
    .cert{border-color:#333; color:#111;}
    .cert p, .cert .cert-meta{color:#333;}
  }
</style>
</head>
<body>

  <div class="topbar no-print">
    <div class="brand">Network Concepts Simulator</div>
    <div class="user">
      <a href="dashboard.php" class="logout-link">← Dashboard</a>
      <a href="logout.php" class="logout-link">Log out</a>
    </div>
  </div>

  <main style="max-width:820px;">
    <?php if (!$eligible): ?>
      <div class="card" style="text-align:center;">
        <h1 style="font-size:20px; margin-bottom:8px;">Not quite yet</h1>
        <p style="color:var(--text-dim); margin-bottom:16px;">
          You've completed <?= $progress['completed'] ?> of <?= $progress['total'] ?> modules
          (<?= $progress['percent'] ?>%). Finish every module to unlock your certificate.
        </p>
        <a href="dashboard.php" class="continue-btn" style="text-decoration:none; display:inline-block;">Back to dashboard</a>
      </div>
    <?php else: ?>
      <div class="cert">
        <div class="cert-label">Certificate of Completion</div>
        <h1>This certifies that</h1>
        <div class="cert-name"><?= htmlspecialchars($user['name']) ?></div>
        <p>has successfully completed all modules of the<br><strong>Network Simulation Learning Platform</strong></p>
        <div class="cert-meta">
          <span>Issued: <?= htmlspecialchars(date('F j, Y', strtotime($certificate['issued_at']))) ?></span>
          <span>Certificate ID: <?= htmlspecialchars($certificate['certificate_code']) ?></span>
        </div>
      </div>
      <button class="auth-btn print-btn no-print" style="width:auto; padding:10px 22px;" onclick="window.print()">Print / Save as PDF</button>
    <?php endif; ?>
  </main>
</body>
</html>
