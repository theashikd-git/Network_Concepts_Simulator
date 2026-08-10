<?php
// OSI module page, login-gated. CSRF token + slug get handed to
// progress-hook.js so it can report progress back.
require_once __DIR__ . '/../../../includes/auth.php';
requireLogin();
$slug = 'osi';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OSI Model — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/base.css">
<link rel="stylesheet" href="osi.css">
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

  <section class="panel active" id="panel-website">
      <div class="section-head">
        <p class="eyebrow">The OSI model in action</p>
        <h1 style="font-size:30px;">OSI Model</h1>
        <p class="lede">Type a domain and press Simulate. Watch your data travel <b>down</b> the seven layers of your PC, across the network, then <b>up</b> the seven layers of the server one step every 3 seconds. Click any layer to read what it does.</p>
      </div>

      <div class="url-bar">
        <div class="url-input-wrap">
          <span>https://</span>
          <input type="text" id="website-input" placeholder="example.com" value="example.com">
        </div>
        <button class="btn" id="website-go">Simulate</button>
      </div>
      <div class="quick-domains">
        <button data-domain="google.com">google.com</button>
        <button data-domain="youtube.com">youtube.com</button>
        <button data-domain="github.com">github.com</button>
        <button data-domain="wikipedia.org">wikipedia.org</button>
      </div>

      <div class="session-info" id="website-session"></div>

      <div class="website-stage">
        <div class="journey-wrap">
          <div class="osi-journey" id="osi-journey">
            <div class="tower" id="tower-client">
              <div class="tower-cap">
                <span class="tc-icon">💻</span>
                <div class="tc-text"><b>Your PC</b><span id="tower-client-sub">sending</span></div>
              </div>
              <div class="tower-layers" id="tower-client-layers"></div>
              <div class="tower-dir" id="tower-client-dir">▼ encapsulation</div>
            </div>

            <div class="journey-mid">
              <div class="jm-arrow" id="jm-arrow">→</div>
              <div class="jm-line"></div>
              <div class="jm-label">physical medium</div>
            </div>

            <div class="tower" id="tower-server">
              <div class="tower-cap">
                <span class="tc-icon">🖥️</span>
                <div class="tc-text"><b id="tower-server-name">the server</b><span id="tower-server-sub">receiving</span></div>
              </div>
              <div class="tower-layers" id="tower-server-layers"></div>
              <div class="tower-dir" id="tower-server-dir">▲ decapsulation</div>
            </div>

            <div class="journey-packet" id="journey-packet"><span id="journey-packet-label">DATA</span></div>
          </div>
        </div>

        <div class="website-main">
          <div class="player">
            <div class="player-panel">
              <div class="player-top">
                <span class="layer-badge" id="website-badge"></span>
                <span class="step-count" id="website-count">step 1/1</span>
              </div>
              <div class="player-title" id="website-title"></div>
              <p class="player-desc" id="website-desc"></p>
              <div class="player-detail" id="website-detail"></div>
              <div class="player-controls">
                <button class="btn-icon" id="website-prev" title="Previous">‹</button>
                <button class="btn-icon primary" id="website-play" title="Play">▶</button>
                <button class="btn-icon" id="website-next" title="Next">›</button>
                <div class="progress-dots" id="website-dots"></div>
                <button class="btn-ghost" id="website-replay">Replay</button>
              </div>
            </div>
          </div>

          <div class="card website-layer-detail" id="website-layer-detail"></div>
        </div>
      </div>
      <p class="note">This is a teaching simulation, not a live packet capture IPs, MAC addresses, and timings are generated locally for illustration. Real-world HTTPS traffic also includes a TLS handshake, simplified here and planned as a future module.</p>
    </section>

</main>

<footer class="site">
  <p>Network Concepts Simulator — an interactive way to learn how networks actually move data.</p>
</footer>

<script src="../../assets/shared.js"></script>
<script src="osi.js"></script>
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
