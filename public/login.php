<form method="POST">

<input
type="email"
name="email">

<input
type="password"
name="password">

  if(password_verify(
$password,
$user['password']))
{
    $_SESSION['user_id']=$user['id'];
}

<button>

Login

</button>

</form>
