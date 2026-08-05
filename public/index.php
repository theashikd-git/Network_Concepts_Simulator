<?php
// Front door: routes to login, dashboard, or the admin panel.

require_once __DIR__ . '/../includes/auth.php';

if (!isLoggedIn()) {
    header('Location: login.php');
} elseif (isAdmin()) {
    header('Location: admin/students.php');
} else {
    header('Location: dashboard.php');
}
exit;
