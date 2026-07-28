<?php

require '../includes/db.php';

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $password=password_hash($_POST['password'],PASSWORD_DEFAULT);

    $fullname = $_POST['fullname'];
    $email    = $_POST['email'];
    $password = $_POST['password'];

    // Your database insert code will go here
    $stmt=$conn->prepare(
"INSERT INTO users(full_name,email,password)
VALUES(?,?,?)");
}

?>

<!DOCTYPE html>
<html>

<head>
    <title>Register</title>
</head>

<body>

    <h2>Create Account</h2>

    <form method="POST">

        <input
            type="text"
            name="fullname"
            placeholder="Full Name"
            required>

        <br><br>

        <input
            type="email"
            name="email"
            placeholder="Email"
            required>

        <br><br>

        <input
            type="password"
            name="password"
            placeholder="Password"
            required>

        <br><br>

        <button type="submit">Create Account</button>

    </form>

</body>

</html>
