<?php
// Session / login helpers, used on every protected page.

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/db.php';

function isLoggedIn(): bool
{
    return isset($_SESSION['user_id']);
}

// Put this at the top of any page that requires login. Also handles the
// case where the session cookie is valid but the user row is gone (e.g.
// DB got reset) — logs them out cleanly instead of crashing downstream.
function requireLogin(): void
{
    if (!isLoggedIn()) {
        header('Location: login.php');
        exit;
    }
    if (currentUser() === null) {
        logOut();
        header('Location: login.php?expired=1');
        exit;
    }
}

function isAdmin(): bool
{
    if (!isLoggedIn()) {
        return false;
    }
    global $pdo;
    $stmt = $pdo->prepare('SELECT role FROM users WHERE id = :id');
    $stmt->execute(['id' => $_SESSION['user_id']]);
    $row = $stmt->fetch();
    return $row && $row['role'] === 'admin';
}

// Non-admins get bounced to the dashboard, not login — they're already logged in.
function requireAdmin(): void
{
    requireLogin();
    if (!isAdmin()) {
        header('Location: ../dashboard.php');
        exit;
    }
}

function currentUser(): ?array
{
    if (!isLoggedIn()) {
        return null;
    }
    global $pdo;
    $stmt = $pdo->prepare('SELECT id, name, email, avatar_path, created_at FROM users WHERE id = :id');
    $stmt->execute(['id' => $_SESSION['user_id']]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function logInAs(int $userId): void
{
    session_regenerate_id(true); // prevent session fixation
    $_SESSION['user_id'] = $userId;
}

function logOut(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function csrfToken(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function csrfField(): string
{
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrfToken()) . '">';
}

function verifyCsrf(): void
{
    $sent = $_POST['csrf_token'] ?? '';
    if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $sent)) {
        http_response_code(403);
        die('Security check failed. Please go back and try again.');
    }
}
