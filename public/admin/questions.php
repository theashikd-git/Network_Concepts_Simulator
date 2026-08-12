<?php
// Admin: add, edit, delete quiz questions for any module.

require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/dashboard_data.php';
requireAdmin();

$simulations = $pdo->query('SELECT id, slug, title FROM simulations ORDER BY sort_order ASC')->fetchAll();
$activeSlug = $_GET['sim'] ?? ($simulations[0]['slug'] ?? '');
$activeSim = null;
foreach ($simulations as $s) {
    if ($s['slug'] === $activeSlug) { $activeSim = $s; break; }
}

$errors = [];
$editing = null; // question row being edited, if any

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verifyCsrf();
    $action = $_POST['action'] ?? '';

    if (in_array($action, ['add_question', 'update_question'], true)) {
        $question = trim($_POST['question'] ?? '');
        $a = trim($_POST['option_a'] ?? '');
        $b = trim($_POST['option_b'] ?? '');
        $c = trim($_POST['option_c'] ?? '');
        $d = trim($_POST['option_d'] ?? '');
        $correct = $_POST['correct_option'] ?? '';
        $sortOrder = (int) ($_POST['sort_order'] ?? 0);
        $simId = (int) ($_POST['simulation_id'] ?? 0);

        if ($question === '' || $a === '' || $b === '' || $c === '' || $d === '') {
            $errors[] = 'Please fill in the question and all four options.';
        }
        if (!in_array($correct, ['a','b','c','d'], true)) {
            $errors[] = 'Please choose which option is correct.';
        }

        if (empty($errors) && $action === 'add_question') {
            $stmt = $pdo->prepare(
                'INSERT INTO quiz_questions (simulation_id, question, option_a, option_b, option_c, option_d, correct_option, sort_order)
                 VALUES (:sid, :q, :a, :b, :c, :d, :correct, :sort)'
            );
            $stmt->execute(['sid'=>$simId,'q'=>$question,'a'=>$a,'b'=>$b,'c'=>$c,'d'=>$d,'correct'=>$correct,'sort'=>$sortOrder]);
        }

        if (empty($errors) && $action === 'update_question') {
            $qid = (int) ($_POST['question_id'] ?? 0);
            $stmt = $pdo->prepare(
                'UPDATE quiz_questions SET question=:q, option_a=:a, option_b=:b, option_c=:c, option_d=:d,
                 correct_option=:correct, sort_order=:sort WHERE id=:id'
            );
            $stmt->execute(['q'=>$question,'a'=>$a,'b'=>$b,'c'=>$c,'d'=>$d,'correct'=>$correct,'sort'=>$sortOrder,'id'=>$qid]);
        }

        if (empty($errors)) {
            header('Location: questions.php?sim=' . urlencode($activeSlug));
            exit;
        }
    }

    if ($action === 'delete_question') {
        $qid = (int) ($_POST['question_id'] ?? 0);
        $stmt = $pdo->prepare('DELETE FROM quiz_questions WHERE id = :id');
        $stmt->execute(['id' => $qid]);
        header('Location: questions.php?sim=' . urlencode($activeSlug));
        exit;
    }
}

if ($activeSim && isset($_GET['edit'])) {
    $stmt = $pdo->prepare('SELECT * FROM quiz_questions WHERE id = :id AND simulation_id = :sid');
    $stmt->execute(['id' => (int) $_GET['edit'], 'sid' => $activeSim['id']]);
    $editing = $stmt->fetch();
}

$questions = [];
if ($activeSim) {
    $stmt = $pdo->prepare('SELECT * FROM quiz_questions WHERE simulation_id = :sid ORDER BY sort_order ASC');
    $stmt->execute(['sid' => $activeSim['id']]);
    $questions = $stmt->fetchAll();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Admin · Quiz Questions — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../assets/dashboard.css">
<style>
  .qf-row{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
  .qf-row .field{margin-bottom:10px;}
  select, textarea, input[type=text], input[type=number]{
    width:100%; background:var(--panel-2); border:1px solid var(--border); border-radius:7px;
    padding:8px 10px; color:var(--text); font-family:var(--font-body); font-size:13.5px; outline:none;
  }
</style>
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
      <a href="questions.php" class="active">Quiz questions</a>
      <a href="scores.php">Quiz scores</a>
      <a href="reports.php">Reports</a>
    </nav>

    <div style="display:flex; gap:6px; margin-bottom:18px; flex-wrap:wrap;">
      <?php foreach ($simulations as $s): ?>
        <a href="questions.php?sim=<?= urlencode($s['slug']) ?>"
           class="admin-nav-pill"
           style="font-family:var(--font-mono); font-size:12px; padding:6px 12px; border-radius:7px; text-decoration:none;
                  <?= $s['slug'] === $activeSlug ? 'background:var(--green); color:#04231a;' : 'border:1px solid var(--border); color:var(--text-dim);' ?>">
          <?= htmlspecialchars($s['title']) ?>
        </a>
      <?php endforeach; ?>
    </div>

    <?php if (!$activeSim): ?>
      <div class="card"><p class="empty-note">No modules found.</p></div>
    <?php else: ?>

      <?php foreach ($errors as $e): ?><div class="alert alert-error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>

      <div class="card" style="margin-bottom:20px;">
        <h3 style="margin-bottom:12px;"><?= $editing ? 'Edit question' : 'Add a question' ?></h3>
        <form method="post">
          <?= csrfField() ?>
          <input type="hidden" name="action" value="<?= $editing ? 'update_question' : 'add_question' ?>">
          <input type="hidden" name="simulation_id" value="<?= (int) $activeSim['id'] ?>">
          <?php if ($editing): ?><input type="hidden" name="question_id" value="<?= (int) $editing['id'] ?>"><?php endif; ?>

          <div class="field">
            <label>Question</label>
            <textarea name="question" rows="2" required><?= htmlspecialchars($editing['question'] ?? '') ?></textarea>
          </div>
          <div class="qf-row">
            <div class="field"><label>Option A</label><input type="text" name="option_a" value="<?= htmlspecialchars($editing['option_a'] ?? '') ?>" required></div>
            <div class="field"><label>Option B</label><input type="text" name="option_b" value="<?= htmlspecialchars($editing['option_b'] ?? '') ?>" required></div>
            <div class="field"><label>Option C</label><input type="text" name="option_c" value="<?= htmlspecialchars($editing['option_c'] ?? '') ?>" required></div>
            <div class="field"><label>Option D</label><input type="text" name="option_d" value="<?= htmlspecialchars($editing['option_d'] ?? '') ?>" required></div>
          </div>
          <div class="qf-row">
            <div class="field">
              <label>Correct option</label>
              <select name="correct_option" required>
                <?php foreach (['a','b','c','d'] as $opt): ?>
                  <option value="<?= $opt ?>" <?= (($editing['correct_option'] ?? '') === $opt) ? 'selected' : '' ?>><?= strtoupper($opt) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="field">
              <label>Sort order</label>
              <input type="number" name="sort_order" value="<?= (int) ($editing['sort_order'] ?? (count($questions) + 1)) ?>">
            </div>
          </div>

          <button type="submit" class="auth-btn" style="width:auto; padding:9px 18px;"><?= $editing ? 'Save changes' : 'Add question' ?></button>
          <?php if ($editing): ?>
            <a href="questions.php?sim=<?= urlencode($activeSlug) ?>" style="margin-left:10px; font-size:13px;">Cancel</a>
          <?php endif; ?>
        </form>
      </div>

      <div class="card">
        <h3 style="margin-bottom:10px;">Existing questions (<?= count($questions) ?>)</h3>
        <?php if (empty($questions)): ?>
          <p class="empty-note">No questions yet for this module.</p>
        <?php endif; ?>
        <?php foreach ($questions as $i => $q): ?>
          <div class="quiz-q" style="border-bottom:1px solid var(--border-soft); padding:10px 0;">
            <p style="margin:0 0 6px; font-size:13.5px;"><b><?= $i + 1 ?>.</b> <?= htmlspecialchars($q['question']) ?>
              <span style="color:var(--green); font-family:var(--font-mono); font-size:11px;">(correct: <?= strtoupper($q['correct_option']) ?>)</span>
            </p>
            <div style="display:flex; gap:10px;">
              <a href="questions.php?sim=<?= urlencode($activeSlug) ?>&edit=<?= (int) $q['id'] ?>" style="font-size:12px;">Edit</a>
              <form method="post" onsubmit="return confirm('Delete this question?');" class="inline-form">
                <?= csrfField() ?>
                <input type="hidden" name="action" value="delete_question">
                <input type="hidden" name="question_id" value="<?= (int) $q['id'] ?>">
                <button type="submit" class="btn-danger" style="padding:2px 10px; font-size:11px;">Delete</button>
              </form>
            </div>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </main>
</body>
</html>
