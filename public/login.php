<?php
// Checks email + password, starts a session on success.

require_once __DIR__ . '/../includes/auth.php';

if (isLoggedIn()) {
    header('Location: ' . (isAdmin() ? 'admin/students.php' : 'dashboard.php'));
    exit;
}

$errors = [];
$email = '';
$justRegistered = isset($_GET['registered']);
$sessionExpired = isset($_GET['expired']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();

    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($email === '' || $password === '') {
        $errors[] = 'Please enter both email and password.';
    } else {
        $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = :email');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        // Vague on purpose — don't reveal whether the email exists.
        if (!$user || !password_verify($password, $user['password_hash'])) {
            $errors[] = 'Incorrect email or password.';
        } else {
            logInAs((int) $user['id']);
            header('Location: ' . (isAdmin() ? 'admin/students.php' : 'dashboard.php'));
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Log in — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/auth.css">
</head>
<body>
  <div class="auth-wrap">
    <div class="auth-brand">Network Concepts Simulator</div>
    <div class="auth-card">
      <h1>Welcome back</h1>
      <p class="sub">Log in to continue learning.</p>

      <?php if ($justRegistered && empty($errors)): ?>
        <div class="alert alert-success">Account created — you can log in now.</div>
      <?php endif; ?>

      <?php if ($sessionExpired && empty($errors)): ?>
        <div class="alert alert-error">Your session is no longer valid — please log in again.</div>
      <?php endif; ?>

      <?php if (!empty($errors)): ?>
        <div class="alert alert-error">
          <?php foreach ($errors as $e): ?>
            <?= htmlspecialchars($e) ?><br>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <form method="post" novalidate>
        <?= csrfField() ?>
        <div class="field">
          <label for="email">Email</label>
          <input type="email" id="email" name="email" value="<?= htmlspecialchars($email) ?>" required>
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit" class="auth-btn">Log in</button>
      </form>

      <p class="auth-alt">New here? <a href="register.php">Create an account</a></p>
    </div>
  </div>
</body>
</html>
