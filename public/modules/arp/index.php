<?php
// ARP module page, login-gated. CSRF token + slug get handed to
// progress-hook.js so it can report progress back.
require_once __DIR__ . '/../../../includes/auth.php';
requireLogin();
$slug = 'arp';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ARP Simulation — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/base.css">
<link rel="stylesheet" href="arp.css">
</head>
<body>

<header class="top">
  <div class="top-inner">
    <div class="brand">
      <a href="../../dashboard.php" class="back-to-dashboard">← Dashboard</a>
      <b class="brand-title">Network Concepts Simulator</b>
    </div>
  </div>
</header>

<main>

  <section class="panel active" id="panel-arp">
      <div class="section-head">
        <p class="eyebrow">Address Resolution Protocol</p>
        <h1 style="font-size:30px;">Who has this IP?</h1>
        <p class="lede">Your PC wants to talk to another device but only knows its IP address not its physical MAC address. Watch ARP find it: your PC <b>shouts to everyone</b>, and only the right device answers. Plays automatically, 3 seconds per step.</p>
      </div>

      <div class="arp-bar">
        <span class="arp-bar-label">Resolve the MAC address for:</span>
        <div class="arp-targets" id="arp-targets"></div>
        <button class="btn" id="arp-go">Start</button>
      </div>

      <div class="website-stage">
        <div class="journey-wrap arp-diagram-wrap">
          <svg id="arp-svg" viewBox="0 0 540 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Local network ARP diagram"></svg>
        </div>

        <div class="website-main">
          <div class="player">
            <div class="player-panel">
              <div class="player-top">
                <span class="layer-badge" id="arp-badge"></span>
                <span class="step-count" id="arp-count">step 1/1</span>
              </div>
              <div class="player-title" id="arp-title"></div>
              <p class="player-desc" id="arp-desc"></p>
              <div class="player-detail" id="arp-detail"></div>
              <div class="player-controls">
                <button class="btn-icon" id="arp-prev" title="Previous">‹</button>
                <button class="btn-icon primary" id="arp-play" title="Play">▶</button>
                <button class="btn-icon" id="arp-next" title="Next">›</button>
                <div class="progress-dots" id="arp-dots"></div>
                <button class="btn-ghost" id="arp-replay">Replay</button>
              </div>
            </div>
          </div>

          <div class="card arp-cache">
            <h3 style="margin-bottom:10px;">Your PC's ARP cache</h3>
            <table class="cache-table">
              <thead><tr><th>IP Address</th><th>MAC Address</th><th>Type</th></tr></thead>
              <tbody id="arp-cache-body">
                <tr><td colspan="3" style="color:var(--text-faint);">Empty resolve an address to fill it in</td></tr>
              </tbody>
            </table>
            <p class="arp-legend">
              <span class="lg lg-amber">● broadcast (to everyone)</span>
              <span class="lg lg-green">● unicast reply (one device)</span>
            </p>
          </div>
        </div>
      </div>
    </section>

</main>

<footer class="site">
  <p>Network Concepts Simulator — an interactive way to learn how networks actually move data.</p>
</footer>

<script src="../../assets/shared.js"></script>
<script src="arp.js"></script>
<script>
  // Handed to progress-hook.js so it knows who it's talking to and
  // can prove the request came from this page (CSRF protection).
  window.APP_CONTEXT = {
    csrfToken: "<?= htmlspecialchars(csrfToken()) ?>",
    simulationSlug: "<?= $slug ?>"
  };
</script>
<script src="../../assets/progress-hook.js"></script>
</body>
</html>
