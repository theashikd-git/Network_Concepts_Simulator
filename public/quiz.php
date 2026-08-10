<?php
// Multiple-choice quiz per module — quiz.php?sim=osi
// Submitting grades it, saves the attempt, shows right/wrong answers.

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

$stmt = $pdo->prepare('SELECT * FROM quiz_questions WHERE simulation_id = :sid ORDER BY sort_order ASC');
$stmt->execute(['sid' => $simulation['id']]);
$questions = $stmt->fetchAll();

$result = null; // will hold ['score' => int, 'total' => int, 'answers' => [...]] after grading

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($questions)) {
    verifyCsrf();

    $score = 0;
    $answerReview = [];

    foreach ($questions as $q) {
        $submitted = $_POST['q_' . $q['id']] ?? null;
        $isCorrect = $submitted === $q['correct_option'];
        if ($isCorrect) {
            $score++;
        }
        $answerReview[] = [
            'question'       => $q,
            'submitted'      => $submitted,
            'is_correct'     => $isCorrect,
        ];
    }

    $total = count($questions);

    // Work out which attempt number this is for this student+module.
    $stmt = $pdo->prepare('SELECT COUNT(*) AS n FROM quiz_attempts WHERE user_id = :uid AND simulation_id = :sid');
    $stmt->execute(['uid' => $userId, 'sid' => $simulation['id']]);
    $attemptNumber = ((int) $stmt->fetch()['n']) + 1;

    $stmt = $pdo->prepare(
        'INSERT INTO quiz_attempts (user_id, simulation_id, score, total_questions, attempt_number)
         VALUES (:uid, :sid, :score, :total, :attempt)'
    );
    $stmt->execute([
        'uid'     => $userId,
        'sid'     => $simulation['id'],
        'score'   => $score,
        'total'   => $total,
        'attempt' => $attemptNumber,
    ]);

    $result = ['score' => $score, 'total' => $total, 'answers' => $answerReview, 'attempt' => $attemptNumber];
}

$optionLabels = ['a' => 'A', 'b' => 'B', 'c' => 'C', 'd' => 'D'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= htmlspecialchars($simulation['title']) ?> Quiz — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/dashboard.css">
<style>
  .quiz-q{margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid var(--border-soft);}
  .quiz-q:last-child{border-bottom:none; margin-bottom:0; padding-bottom:0;}
  .quiz-q p.qtext{font-weight:600; margin:0 0 10px;}
  .quiz-opt{display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:7px; margin-bottom:6px; font-size:13.5px; cursor:pointer;}
  .quiz-opt:hover{background:var(--panel-2);}
  .quiz-opt.correct{background:rgba(73,221,142,0.1); border:1px solid var(--green-dim);}
  .quiz-opt.wrong{background:rgba(240,112,138,0.1); border:1px solid #5a2532;}
  .score-banner{font-family:var(--font-display); font-size:22px; margin-bottom:6px;}
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

  <main style="max-width:680px;">
    <h1 style="margin-bottom:6px;"><?= htmlspecialchars($simulation['title']) ?> Quiz</h1>
    <p style="color:var(--text-dim); font-size:14px; margin:0 0 22px;">
      <?= count($questions) ?> multiple-choice questions.
    </p>

    <?php if (empty($questions)): ?>
      <div class="card"><p class="empty-note">No quiz questions have been added for this module yet.</p></div>

    <?php elseif ($result): ?>
      <div class="card" style="margin-bottom:18px;">
        <div class="score-banner">
          You scored <?= $result['score'] ?> / <?= $result['total'] ?>
        </div>
        <p style="color:var(--text-dim); font-size:13.5px; margin:0;">
          Attempt #<?= $result['attempt'] ?> · saved to your dashboard.
        </p>
      </div>

      <div class="card">
        <?php foreach ($result['answers'] as $i => $a): $q = $a['question']; ?>
          <div class="quiz-q">
            <p class="qtext"><?= ($i + 1) ?>. <?= htmlspecialchars($q['question']) ?></p>
            <?php foreach (['a','b','c','d'] as $opt): ?>
              <?php
                $isCorrectOpt = $opt === $q['correct_option'];
                $isSubmittedOpt = $opt === $a['submitted'];
                $class = '';
                if ($isCorrectOpt) $class = 'correct';
                elseif ($isSubmittedOpt && !$a['is_correct']) $class = 'wrong';
              ?>
              <div class="quiz-opt <?= $class ?>">
                <span><?= $optionLabels[$opt] ?>.</span>
                <span><?= htmlspecialchars($q['option_' . $opt]) ?></span>
                <?php if ($isCorrectOpt): ?><span style="margin-left:auto; color:var(--green); font-size:11px;">✓ correct</span><?php endif; ?>
                <?php if ($isSubmittedOpt && !$a['is_correct']): ?><span style="margin-left:auto; color:#f0708a; font-size:11px;">your answer</span><?php endif; ?>
              </div>
            <?php endforeach; ?>
          </div>
        <?php endforeach; ?>
      </div>

      <p style="margin-top:16px;">
        <a href="quiz.php?sim=<?= urlencode($slug) ?>" class="auth-btn" style="display:inline-block; width:auto; padding:9px 18px; text-decoration:none; box-sizing:border-box;">Retake quiz</a>
      </p>

    <?php else: ?>
      <form method="post" class="card">
        <?= csrfField() ?>
        <?php foreach ($questions as $i => $q): ?>
          <div class="quiz-q">
            <p class="qtext"><?= ($i + 1) ?>. <?= htmlspecialchars($q['question']) ?></p>
            <?php foreach (['a','b','c','d'] as $opt): ?>
              <label class="quiz-opt">
                <input type="radio" name="q_<?= $q['id'] ?>" value="<?= $opt ?>" required>
                <span><?= $optionLabels[$opt] ?>. <?= htmlspecialchars($q['option_' . $opt]) ?></span>
              </label>
            <?php endforeach; ?>
          </div>
        <?php endforeach; ?>
        <button type="submit" class="auth-btn" style="width:auto; padding:10px 20px;">Submit quiz</button>
      </form>
    <?php endif; ?>
  </main>
</body>
</html>
