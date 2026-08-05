<?php
require_once __DIR__ . '/../includes/auth.php';

logOut();
header('Location: login.php');
exit;
