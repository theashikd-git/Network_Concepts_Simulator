<?php
// Student dashboard: progress, continue-learning, recent activity,
// quiz scores, favorites.

require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/dashboard_data.php';
requireLogin();

// Admins don't use this page — send them to the admin panel even if
// they land here directly (bookmark, typed URL, etc.).
if (isAdmin()) {
    header('Location: admin/students.php');
    exit;
}

$user = currentUser();
$userId = (int) $user['id'];
$admin = isAdmin();

$progressSummary = getProgressSummary($pdo, $userId);
$recent           = getRecentSimulations($pdo, $userId);
$continueTarget   = getContinueLearningTarget($pdo, $userId);
$allModules       = getAllModulesWithStatus($pdo, $userId);
$favorites        = getFavoriteModules($pdo, $userId);
$initial          = avatarInitial($user['name']);

/*
 * Inline icon set (Lucide-style). Using real SVG icons instead of emoji
 * is the single biggest fix for the "looks generated" feeling: emoji
 * render differently per OS and sit off-baseline, whereas these are
 * one consistent, monochrome set that inherits the surrounding color.
 */
function ic(string $name, string $cls = 'ic'): string
{
    $p = [
        'log-out'     => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
        'user'        => '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        'shield'      => '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
        'play'        => '<polygon points="6 3 20 12 6 21 6 3"/>',
        'arrow-right' => '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
        'check'       => '<polyline points="20 6 9 17 4 12"/>',
        'clock'       => '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
        'circle'      => '<circle cx="12" cy="12" r="9"/>',
        'star'        => '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
        'activity'    => '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
        'list'        => '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
        'help'        => '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
        'cap'         => '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2.5 9 2.5 12 0v-5"/>',
        'globe'       => '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/>',
        'share'       => '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
        'layers'      => '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
        'server'      => '<rect x="2" y="3" width="20" height="7" rx="2"/><rect x="2" y="14" width="20" height="7" rx="2"/><line x1="6" y1="6.5" x2="6.01" y2="6.5"/><line x1="6" y1="17.5" x2="6.01" y2="17.5"/>',
    ];
    $inner = $p[$name] ?? $p['circle'];
    return '<svg class="' . $cls . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . $inner . '</svg>';
}

// Map a module to a real icon by slug, so no emoji leak in from the DB.
function moduleIcon(string $slug, string $cls = 'ic'): string
{
    $map = ['arp' => 'share', 'dns' => 'globe', 'osi' => 'layers'];
    return ic($map[$slug] ?? 'server', $cls);
}

$statusMeta = [
    'completed'   => ['icon' => 'check',  'label' => 'Completed'],
    'in_progress' => ['icon' => 'clock',  'label' => 'In progress'],
    'not_started' => ['icon' => 'circle', 'label' => 'Not started'],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/dashboard.css">
<style>
  /* --- Refinements layered over dashboard.css ---
     These override a few stock "AI-dark-SaaS" flourishes (gradient
     avatar, gradient progress bar) with flatter, more deliberate
     versions, and add the icon + hierarchy treatment. Move these into
     dashboard.css if you want them applied site-wide (e.g. profile). */

  .ic{width:16px; height:16px; flex:none; vertical-align:-2px;}
  .ic-lg{width:20px; height:20px;}

  /* Solid avatar from the initial — drop the green→cyan gradient. */
  .avatar{background:var(--panel-2); color:var(--green); border:1px solid var(--border); font-weight:600;}
  .avatar.lg{border-radius:12px;}

  /* Nav bar: a brand mark on the left, quiet icon-text links on the
     right, and the avatar + name grouped as one identity unit. No more
     scattered bordered pills. */
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

  /* Identity row */
  .welcome-row{margin-bottom:22px;}
  .welcome-row h1{font-size:24px; letter-spacing:-0.4px;}
  .welcome-row .sub{color:var(--text-dim); font-size:13.5px; margin-top:3px;}

  /* Progress: the bar is the focus; the % is a small figure on the
     label row, not a giant standalone number. */
  .progress-card{display:block;}
  .progress-head{display:flex; align-items:baseline; justify-content:space-between; margin-bottom:11px; gap:16px;}
  .progress-head b{font-family:var(--font-display); font-size:14px; font-weight:600; color:var(--text); letter-spacing:-0.1px;}
  .progress-pct{font-family:var(--font-display); font-size:16px; font-weight:600; color:var(--green); flex:none;}
  .progress-track{height:8px;}
  .progress-fill{background:var(--green);} /* flat, not gradient */
  .progress-sub{margin-top:10px; font-family:var(--font-mono); font-size:11.5px; color:var(--text-faint);}
  .cert-link{display:inline-flex; align-items:center; gap:7px; margin-top:14px; font-family:var(--font-mono); font-size:12.5px; color:var(--green);}

  /* Section labels are structural, not decorative: small uppercase
     eyebrow + a matching icon. Consistent across every section. */
  .sec-head{display:flex; align-items:center; gap:8px; margin:0 0 12px;}
  .sec-head .ic{color:var(--text-faint);}
  .sec-head span{font-family:var(--font-mono); font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:var(--text-dim);}

  /* Continue = the primary action, so it gets the only accent card. */
  .primary-card{
    display:flex; align-items:center; gap:16px;
    border-color:var(--green-dim);
    background:linear-gradient(0deg, rgba(73,221,142,0.05), rgba(73,221,142,0.05)), var(--panel);
  }
  .icon-tile{
    width:46px; height:46px; border-radius:11px; flex:none;
    display:flex; align-items:center; justify-content:center;
    background:var(--panel-2); border:1px solid var(--border-soft); color:var(--cyan);
  }
  .primary-card .icon-tile{color:var(--green); border-color:var(--green-dim); background:rgba(73,221,142,0.08);}
  .continue-body{flex:1; min-width:0;}
  .continue-body h3{font-size:16px; margin-bottom:3px;}
  .continue-body p{font-size:12.5px; color:var(--text-dim); margin:0;}
  .continue-btn{display:inline-flex; align-items:center; gap:7px; background:var(--green); color:#04231a; border:none; padding:10px 16px; border-radius:8px; font-weight:600; font-size:13.5px; white-space:nowrap; cursor:pointer;}
  .continue-btn:hover{opacity:.9;}
  .all-done{display:flex; align-items:center; gap:8px; color:var(--green); font-size:13.5px; margin:0;}

  /* Two-column band for the secondary sections. */
  .dash-cols{display:grid; grid-template-columns:1fr; gap:20px; margin-top:24px;}
  @media (min-width:820px){ .dash-cols{grid-template-columns:1fr 1fr;} }
  .stack{display:flex; flex-direction:column; gap:24px; margin-top:24px;}

  /* Module list rows */
  .module-row{display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--border-soft);}
  .module-row:last-child{border-bottom:none;}
  .module-row .mr-tile{width:30px; height:30px; border-radius:8px; flex:none; display:flex; align-items:center; justify-content:center; background:var(--panel-2); border:1px solid var(--border-soft); color:var(--text-dim);}
  .module-row .mr-tile .ic{width:15px; height:15px;}
  .module-row .mr-title{flex:1; min-width:0; font-size:14px; color:var(--text); font-weight:500;}
  .module-row .mr-links{display:flex; gap:12px; font-family:var(--font-mono); font-size:11.5px;}
  .module-row .mr-links a{color:var(--text-faint);}
  .module-row .mr-links a:hover{color:var(--cyan);}
  .star-btn{background:none; border:none; cursor:pointer; padding:0; color:var(--text-faint); display:inline-flex;}
  .star-btn .ic{width:18px; height:18px;}
  .star-btn:hover{color:var(--amber);}
  .star-btn.active{color:var(--amber);}
  .star-btn.active .ic{fill:var(--amber);}

  /* Status as a labelled dot-pill. */
  .pill{display:inline-flex; align-items:center; gap:6px; font-family:var(--font-mono); font-size:10.5px; letter-spacing:0.3px; padding:4px 10px; border-radius:20px; border:1px solid var(--border); color:var(--text-dim); white-space:nowrap;}
  .pill .ic{width:12px; height:12px;}
  .pill.completed{color:var(--green); border-color:var(--green-dim); background:rgba(73,221,142,0.08);}
  .pill.in_progress{color:var(--amber); border-color:var(--amber-dim); background:rgba(245,185,77,0.08);}
  .pill.not_started{color:var(--text-faint); background:var(--panel-2);}

  /* Recent + favorites lists */
  .recent-list{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px;}
  .recent-list li{display:flex; align-items:center; gap:11px; background:var(--panel-2); border:1px solid var(--border-soft); border-radius:8px; padding:10px 12px;}
  .recent-list .ri-tile{width:28px; height:28px; border-radius:7px; flex:none; display:flex; align-items:center; justify-content:center; background:var(--panel); border:1px solid var(--border-soft); color:var(--text-dim);}
  .recent-list .ri-tile .ic{width:14px; height:14px;}
  .recent-list .ri-title{flex:1; min-width:0; font-size:13px; color:var(--text);}
  .fav-list{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:9px;}
  .fav-list li{display:flex; align-items:center; gap:9px; font-size:13.5px; color:var(--text);}
  .fav-list li .ic{width:15px; height:15px; color:var(--amber);}
  .quiz-row{display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-soft); font-size:13.5px;}
  .quiz-row:last-child{border-bottom:none;}
  .quiz-row .qr-title{flex:1;}
  .quiz-row .qr-attempts{color:var(--text-faint); font-family:var(--font-mono); font-size:11px;}
  .empty-note{color:var(--text-faint); font-size:13px; margin:0;}
</style>
</head>
<body>

  <div class="topbar">
    <div class="brand">
      <span class="brand-mark"><?= ic('share') ?></span>
      <span class="brand-title">Network Concepts Simulator</span>
    </div>
    <div class="nav-actions">
      <?php if ($admin): ?><a href="admin/students.php" class="nav-link"><?= ic('shield') ?><span>Admin</span></a><?php endif; ?>
      <a href="profile.php" class="nav-link"><?= ic('user') ?><span>Profile</span></a>
      <span class="nav-divider"></span>
      <div class="nav-id">
        <div class="avatar">
          <?php if (!empty($user['avatar_path'])): ?>
            <img src="<?= htmlspecialchars($user['avatar_path']) ?>" alt="">
          <?php else: ?>
            <?= htmlspecialchars($initial) ?>
          <?php endif; ?>
        </div>
        <span class="user-name"><?= htmlspecialchars($user['name']) ?></span>
      </div>
      <a href="logout.php" class="nav-link"><?= ic('log-out') ?><span>Log out</span></a>
    </div>
  </div>

  <main>

    <div class="welcome-row">
      <div class="avatar lg">
        <?php if (!empty($user['avatar_path'])): ?>
          <img src="<?= htmlspecialchars($user['avatar_path']) ?>" alt="">
        <?php else: ?>
          <?= htmlspecialchars($initial) ?>
        <?php endif; ?>
      </div>
      <div>
        <h1>Welcome back, <?= htmlspecialchars(explode(' ', $user['name'])[0]) ?></h1>
        <div class="sub">Pick up where you left off.</div>
      </div>
    </div>

    <div class="card progress-card">
      <div class="progress-head">
        <b>Overall progress</b>
        <span class="progress-pct"><?= $progressSummary['percent'] ?>%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: <?= $progressSummary['percent'] ?>%;"></div>
      </div>
      <div class="progress-sub"><?= $progressSummary['completed'] ?> of <?= $progressSummary['total'] ?> modules complete</div>
      <?php if ($progressSummary['percent'] === 100): ?>
        <a class="cert-link" href="certificate.php"><?= ic('cap') ?> View your certificate</a>
      <?php endif; ?>
    </div>

    <div class="stack">

      <!-- Primary action -->
      <div class="dash-section">
        <div class="sec-head"><?= ic('play') ?><span>Continue learning</span></div>
        <?php if ($continueTarget): ?>
          <div class="card primary-card">
            <div class="icon-tile"><?= moduleIcon($continueTarget['slug'], 'ic ic-lg') ?></div>
            <div class="continue-body">
              <h3><?= htmlspecialchars($continueTarget['title']) ?></h3>
              <p><?= htmlspecialchars($continueTarget['description']) ?></p>
            </div>
            <a href="modules/<?= htmlspecialchars($continueTarget['slug']) ?>/" class="continue-btn">Continue <?= ic('arrow-right') ?></a>
          </div>
        <?php else: ?>
          <div class="card"><p class="all-done"><?= ic('check') ?> Every available module is complete.</p></div>
        <?php endif; ?>
      </div>

      <!-- Main content: all modules -->
      <div class="dash-section">
        <div class="sec-head"><?= ic('list') ?><span>All modules</span></div>
        <div class="card">
          <?php foreach ($allModules as $m):
            $meta = $statusMeta[$m['status']] ?? $statusMeta['not_started']; ?>
            <div class="module-row">
              <span class="mr-tile"><?= moduleIcon($m['slug']) ?></span>
              <span class="mr-title"><?= htmlspecialchars($m['title']) ?></span>
              <span class="pill <?= htmlspecialchars($m['status']) ?>"><?= ic($meta['icon']) ?><?= $meta['label'] ?></span>
              <span class="mr-links">
                <a href="modules/<?= urlencode($m['slug']) ?>/">Open</a>
                <a href="quiz.php?sim=<?= urlencode($m['slug']) ?>">Quiz</a>
                <a href="notes.php?sim=<?= urlencode($m['slug']) ?>">Notes</a>
              </span>
              <button class="star-btn <?= $m['is_favorite'] ? 'active' : '' ?>" data-slug="<?= htmlspecialchars($m['slug']) ?>" title="Favorite" aria-label="Toggle favorite"><?= ic('star') ?></button>
            </div>
          <?php endforeach; ?>
        </div>
      </div>

    </div>

    <div class="dash-cols">

      <!-- Recent activity -->
      <div class="dash-section">
        <div class="sec-head"><?= ic('activity') ?><span>Recent activity</span></div>
        <div class="card">
          <?php if (empty($recent)): ?>
            <p class="empty-note">No simulations opened yet.</p>
          <?php else: ?>
            <ul class="recent-list">
              <?php foreach ($recent as $r):
                $meta = $statusMeta[$r['status']] ?? $statusMeta['not_started']; ?>
                <li>
                  <span class="ri-tile"><?= moduleIcon($r['slug']) ?></span>
                  <span class="ri-title"><?= htmlspecialchars($r['title']) ?></span>
                  <span class="pill <?= htmlspecialchars($r['status']) ?>"><?= ic($meta['icon']) ?><?= $meta['label'] ?></span>
                </li>
              <?php endforeach; ?>
            </ul>
          <?php endif; ?>
        </div>
      </div>

      <!-- Quiz scores -->
      <div class="dash-section">
        <div class="sec-head"><?= ic('help') ?><span>Quiz scores</span></div>
        <div class="card">
          <?php
            $anyAttempt = false;
            foreach ($allModules as $m):
              $qs = getQuizSummaryForUser($pdo, $userId, $m['id']);
              if ($qs['attempts'] > 0): $anyAttempt = true; ?>
                <div class="quiz-row">
                  <span class="qr-title"><?= htmlspecialchars($m['title']) ?></span>
                  <span class="pill completed"><?= (int) $qs['best_score'] ?> / <?= (int) $qs['total_questions'] ?></span>
                  <span class="qr-attempts"><?= (int) $qs['attempts'] ?> attempt<?= $qs['attempts'] == 1 ? '' : 's' ?></span>
                </div>
          <?php endif; endforeach;
            if (!$anyAttempt): ?>
              <p class="empty-note">No quizzes taken yet.</p>
          <?php endif; ?>
        </div>
      </div>

    </div>

    <!-- Favorites -->
    <div class="dash-section" style="margin-top:24px;">
      <div class="sec-head"><?= ic('star') ?><span>Favorites</span></div>
      <div class="card">
        <?php if (empty($favorites)): ?>
          <p class="empty-note">Star a module to pin it here.</p>
        <?php else: ?>
          <ul class="fav-list">
            <?php foreach ($favorites as $f): ?>
              <li><?= moduleIcon($f['slug']) ?> <?= htmlspecialchars($f['title']) ?></li>
            <?php endforeach; ?>
          </ul>
        <?php endif; ?>
      </div>
    </div>

  </main>

  <script>
    // Favorite star toggle — talks to api/toggle_favorite.php.
    const CSRF_TOKEN = <?= json_encode(csrfToken()) ?>;
    document.querySelectorAll('.star-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const slug = btn.dataset.slug;
        try {
          const res = await fetch('../api/toggle_favorite.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': CSRF_TOKEN },
            body: JSON.stringify({ slug }),
          });
          const data = await res.json();
          if (data.ok) {
            btn.classList.toggle('active', data.favorited);
            // Simplest correct way to keep the Favorites list in sync: reload.
            location.reload();
          }
        } catch (e) { /* network hiccup — no need to interrupt the student */ }
      });
    });
  </script>
</body>
</html>
