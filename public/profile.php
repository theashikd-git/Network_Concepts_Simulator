<?php
// Profile: edit name/email, change password, upload avatar.
// Three separate forms so each one validates/saves independently.

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/dashboard_data.php';
requireLogin();

$user = currentUser();
$userId = (int) $user['id'];

$infoErrors = [];
$infoSuccess = false;
$passwordErrors = [];
$passwordSuccess = false;
$avatarErrors = [];
$avatarSuccess = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    // Update name / email
    if ($action === 'update_info') {
        $name = trim($_POST['name'] ?? '');
        $email = trim($_POST['email'] ?? '');

        if ($name === '') {
            $infoErrors[] = 'Please enter your name.';
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $infoErrors[] = 'Please enter a valid email address.';
        }

        if (empty($infoErrors)) {
            // Make sure no OTHER account already uses this email.
            $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id != :id');
            $stmt->execute(['email' => $email, 'id' => $userId]);
            if ($stmt->fetch()) {
                $infoErrors[] = 'That email is already used by another account.';
            }
        }

        if (empty($infoErrors)) {
            $stmt = $pdo->prepare('UPDATE users SET name = :name, email = :email WHERE id = :id');
            $stmt->execute(['name' => $name, 'email' => $email, 'id' => $userId]);
            $user = currentUser();
            $infoSuccess = true;
        }
    }

    // Change password
    if ($action === 'change_password') {
        $current = $_POST['current_password'] ?? '';
        $new = $_POST['new_password'] ?? '';
        $confirm = $_POST['confirm_password'] ?? '';

        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($current, $row['password_hash'])) {
            $passwordErrors[] = 'Your current password is incorrect.';
        }
        if (strlen($new) < 8) {
            $passwordErrors[] = 'New password must be at least 8 characters.';
        }
        if ($new !== $confirm) {
            $passwordErrors[] = 'New passwords do not match.';
        }

        if (empty($passwordErrors)) {
            $hash = password_hash($new, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
            $stmt->execute(['hash' => $hash, 'id' => $userId]);
            $passwordSuccess = true;
        }
    }

    // Upload / change avatar
    if ($action === 'upload_avatar') {
        if (empty($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            $avatarErrors[] = 'Please choose an image to upload.';
        } else {
            $file = $_FILES['avatar'];
            $maxBytes = 2 * 1024 * 1024; // 2 MB

            // Check the real file content, not just the extension (easy to fake).
            $allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
            $realType = mime_content_type($file['tmp_name']);

            if ($file['size'] > $maxBytes) {
                $avatarErrors[] = 'Image must be smaller than 2 MB.';
            } elseif (!isset($allowed[$realType])) {
                $avatarErrors[] = 'Please upload a JPG, PNG, or WEBP image.';
            }

            if (empty($avatarErrors)) {
                $ext = $allowed[$realType];
                // Filename built from the user's own id, never from user input.
                $filename = 'user_' . $userId . '_' . time() . '.' . $ext;
                $destDir = __DIR__ . '/uploads/avatars/';
                $destPath = $destDir . $filename;

                if (move_uploaded_file($file['tmp_name'], $destPath)) {
                    // Remove the old avatar file, if any, to avoid piling up.
                    if (!empty($user['avatar_path'])) {
                        $old = __DIR__ . '/' . ltrim($user['avatar_path'], '/');
                        if (is_file($old)) {
                            @unlink($old);
                        }
                    }
                    $publicPath = 'uploads/avatars/' . $filename;
                    $stmt = $pdo->prepare('UPDATE users SET avatar_path = :path WHERE id = :id');
                    $stmt->execute(['path' => $publicPath, 'id' => $userId]);
                    $user = currentUser();
                    $avatarSuccess = true;
                } else {
                    $avatarErrors[] = 'Upload failed — please try again.';
                }
            }
        }
    }
}

$initial = avatarInitial($user['name']);
$admin = isAdmin();

// Inline icon set (Lucide-style), same as the dashboard.
function ic(string $name, string $cls = 'ic'): string
{
    $p = [
        'share'        => '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
        'user'         => '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        'shield'       => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'log-out'      => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
        'arrow-left'   => '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
        'image'        => '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
        'id'           => '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 8h4"/><path d="M15 12h4"/><path d="M7 16h10"/>',
        'lock'         => '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        'upload'       => '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
        'save'         => '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>',
        'check-circle' => '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
        'alert'        => '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    ];
    $inner = $p[$name] ?? $p['user'];
    return '<svg class="' . $cls . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $inner . '</svg>';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Profile — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/dashboard.css">
<style>
  /* Shared refinements — same treatment as the dashboard. Move the nav
     and .avatar rules into dashboard.css to apply them everywhere. */
  .ic{width:16px; height:16px; flex:none; vertical-align:-2px;}
  .ic-lg{width:20px; height:20px;}

  .avatar{background:var(--panel-2); color:var(--green); border:1px solid var(--border); font-weight:600;}
  .avatar.lg{border-radius:14px;}

  /* Nav bar */
  .topbar{padding:0 24px; min-height:60px;}
  .brand{display:flex; align-items:center; gap:10px; margin-right:auto;}
  .brand-mark{width:30px; height:30px; border-radius:8px; flex:none; display:flex; align-items:center; justify-content:center;
    background:var(--panel-2); border:1px solid var(--border-soft); color:var(--green);}
  .brand-mark .ic{width:17px; height:17px;}
  .brand-title{font-family:var(--font-display); font-size:15px; color:var(--text); letter-spacing:-0.2px;}
  .nav-actions{display:flex; align-items:center; gap:16px;}
  .nav-link{display:inline-flex; align-items:center; gap:7px; font-size:13px; color:var(--text-dim); transition:color .15s ease;}
  .nav-link .ic{width:15px; height:15px; color:var(--text-faint); transition:color .15s ease;}
  .nav-link:hover{color:var(--text);}
  .nav-link:hover .ic{color:var(--text);}
  .nav-divider{width:1px; height:22px; background:var(--border); flex:none;}
  .nav-id{display:flex; align-items:center; gap:9px;}
  .nav-id .avatar{width:32px; height:32px; font-size:13px; border-radius:9px;}
  .nav-id .user-name{font-size:13px; color:var(--text); font-weight:500;}
  @media (max-width:640px){ .nav-id .user-name{display:none;} .nav-link span{display:none;} }

  /* Page header */
  main.profile{max-width:640px;}
  .page-head{margin-bottom:24px;}
  .page-head .eyebrow{font-family:var(--font-mono); font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:var(--green); margin:0 0 8px;}
  .page-head h1{font-family:var(--font-display); font-size:26px; letter-spacing:-0.5px; margin:0;}

  /* Cards + section eyebrows (matches dashboard sec-head) */
  .p-card{margin-bottom:18px;}
  .p-card:last-child{margin-bottom:0;}
  .sec-head{display:flex; align-items:center; gap:8px; margin:0 0 16px;}
  .sec-head .ic{color:var(--text-faint);}
  .sec-head span{font-family:var(--font-mono); font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:var(--text-dim);}

  /* Avatar row */
  .avatar-row{display:flex; align-items:center; gap:18px; flex-wrap:wrap;}
  .avatar-row form{flex:1; min-width:220px;}
  .avatar-hint{font-size:12px; color:var(--text-faint); margin:10px 0 0;}

  /* File input — style the browser default so it stops looking unfinished */
  input[type=file]{font-family:var(--font-body); font-size:13px; color:var(--text-dim); max-width:100%;}
  input[type=file]::file-selector-button{
    font-family:var(--font-body); font-size:13px; color:var(--text); background:var(--panel-2);
    border:1px solid var(--border); border-radius:8px; padding:8px 14px; margin-right:12px; cursor:pointer;
    transition:all .15s ease;
  }
  input[type=file]::file-selector-button:hover{border-color:var(--cyan); color:var(--cyan);}

  /* Buttons */
  .btn-save{display:inline-flex; align-items:center; gap:8px; background:var(--text); color:var(--bg); border:none;
    padding:10px 18px; border-radius:8px; font-weight:600; font-size:13.5px; cursor:pointer; transition:opacity .12s ease;}
  .btn-save:hover{opacity:.88;}
  .btn-save .ic{width:15px; height:15px;}
  .avatar-row .btn-save{margin-top:12px;}

  /* Alerts get a leading icon */
  .alert{display:flex; align-items:center; gap:8px;}
  .alert .ic{width:15px; height:15px; flex:none;}
</style>
</head>
<body>

  <div class="topbar">
    <div class="brand">
      <span class="brand-mark"><?= ic('share') ?></span>
      <span class="brand-title">Network Concepts Simulator</span>
    </div>
    <div class="nav-actions">
      <a href="dashboard.php" class="nav-link"><?= ic('arrow-left') ?><span>Dashboard</span></a>
      <?php if ($admin): ?><a href="admin/students.php" class="nav-link"><?= ic('shield') ?><span>Admin</span></a><?php endif; ?>
      <span class="nav-divider"></span>
      <div class="nav-id">
        <div class="avatar">
          <?php if (!empty($user['avatar_path'])): ?>
            <img src="<?= htmlspecialchars($user['avatar_path']) ?>?v=<?= time() ?>" alt="">
          <?php else: ?>
            <?= htmlspecialchars($initial) ?>
          <?php endif; ?>
        </div>
        <span class="user-name"><?= htmlspecialchars($user['name']) ?></span>
      </div>
      <a href="logout.php" class="nav-link"><?= ic('log-out') ?><span>Log out</span></a>
    </div>
  </div>

  <main class="profile">

    <div class="page-head">
      <p class="eyebrow">Account</p>
      <h1>Your profile</h1>
    </div>

    <!-- Avatar -->
    <div class="card p-card">
      <div class="sec-head"><?= ic('image') ?><span>Profile picture</span></div>
      <div class="avatar-row">
        <div class="avatar lg">
          <?php if (!empty($user['avatar_path'])): ?>
            <img src="<?= htmlspecialchars($user['avatar_path']) ?>?v=<?= time() ?>" alt="">
          <?php else: ?>
            <?= htmlspecialchars($initial) ?>
          <?php endif; ?>
        </div>
        <form method="post" enctype="multipart/form-data">
          <?= csrfField() ?>
          <input type="hidden" name="action" value="upload_avatar">
          <?php if ($avatarSuccess): ?><div class="alert alert-success"><?= ic('check-circle') ?>Avatar updated.</div><?php endif; ?>
          <?php foreach ($avatarErrors as $e): ?><div class="alert alert-error"><?= ic('alert') ?><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
          <input type="file" name="avatar" accept="image/png, image/jpeg, image/webp" required>
          <p class="avatar-hint">JPG, PNG, or WEBP · up to 2 MB.</p>
          <button type="submit" class="btn-save"><?= ic('upload') ?> Upload</button>
        </form>
      </div>
    </div>

    <!-- Name / email -->
    <div class="card p-card">
      <div class="sec-head"><?= ic('id') ?><span>Account details</span></div>
      <?php if ($infoSuccess): ?><div class="alert alert-success"><?= ic('check-circle') ?>Profile updated.</div><?php endif; ?>
      <?php foreach ($infoErrors as $e): ?><div class="alert alert-error"><?= ic('alert') ?><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
      <form method="post">
        <?= csrfField() ?>
        <input type="hidden" name="action" value="update_info">
        <div class="field">
          <label for="name">Full name</label>
          <input type="text" id="name" name="name" value="<?= htmlspecialchars($user['name']) ?>" required>
        </div>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="<?= htmlspecialchars($user['email']) ?>" required>
        </div>
        <button type="submit" class="btn-save"><?= ic('save') ?> Save changes</button>
      </form>
    </div>

    <!-- Password -->
    <div class="card p-card">
      <div class="sec-head"><?= ic('lock') ?><span>Change password</span></div>
      <?php if ($passwordSuccess): ?><div class="alert alert-success"><?= ic('check-circle') ?>Password changed.</div><?php endif; ?>
      <?php foreach ($passwordErrors as $e): ?><div class="alert alert-error"><?= ic('alert') ?><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
      <form method="post">
        <?= csrfField() ?>
        <input type="hidden" name="action" value="change_password">
        <div class="field">
          <label for="current_password">Current password</label>
          <input type="password" id="current_password" name="current_password" required>
        </div>
        <div class="field">
          <label for="new_password">New password</label>
          <input type="password" id="new_password" name="new_password" minlength="8" required>
        </div>
        <div class="field">
          <label for="confirm_password">Confirm new password</label>
          <input type="password" id="confirm_password" name="confirm_password" minlength="8" required>
        </div>
        <button type="submit" class="btn-save"><?= ic('lock') ?> Update password</button>
      </form>
    </div>

  </main>
</body>
</html>
