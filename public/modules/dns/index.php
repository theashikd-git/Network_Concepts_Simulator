<?php
// DNS module page, login-gated. CSRF token + slug get handed to
// progress-hook.js so it can report progress back.
require_once __DIR__ . '/../../../includes/auth.php';
requireLogin();
$slug = 'dns';
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DNS Lookup — Network Concepts Simulator</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/base.css">
<link rel="stylesheet" href="dns.css">
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

  <section class="panel active" id="panel-dns">
      <div class="section-head">
        <p class="eyebrow">Domain Name System</p>
        <h1 style="font-size:30px;">Turning a name into an IP</h1>
        <p class="lede">Computers route data to IP addresses, but people type names like <b>example.com</b>. DNS is the internet's phone book. Type a domain and watch your resolver walk the hierarchy root → TLD → authoritative until it finds the address. Plays automatically, 3 seconds per step.</p>
      </div>

      <div class="url-bar">
        <div class="url-input-wrap">
          <span>resolve</span>
          <input type="text" id="dns-input" placeholder="example.com" value="example.com">
        </div>
        <button class="btn" id="dns-go">Resolve</button>
      </div>
      <div class="quick-domains">
        <button data-domain="google.com">google.com</button>
        <button data-domain="youtube.com">youtube.com</button>
        <button data-domain="github.com">github.com</button>
        <button data-domain="wikipedia.org">wikipedia.org</button>
      </div>

      <div class="website-stage">
        <div class="journey-wrap dns-diagram-wrap">
          <svg id="dns-svg" viewBox="0 0 540 480" preserveAspectRatio="xMidYMid meet" role="img" aria-label="DNS resolution diagram"></svg>
        </div>

        <div class="website-main">
          <div class="player">
            <div class="player-panel">
              <div class="player-top">
                <span class="layer-badge" id="dns-badge"></span>
                <span class="step-count" id="dns-count">step 1/1</span>
              </div>
              <div class="player-title" id="dns-title"></div>
              <p class="player-desc" id="dns-desc"></p>
              <div class="player-detail" id="dns-detail"></div>
              <div class="player-controls">
                <button class="btn-icon" id="dns-prev" title="Previous">‹</button>
                <button class="btn-icon primary" id="dns-play" title="Play">▶</button>
                <button class="btn-icon" id="dns-next" title="Next">›</button>
                <div class="progress-dots" id="dns-dots"></div>
                <button class="btn-ghost" id="dns-replay">Replay</button>
              </div>
            </div>
          </div>

          <div class="card dns-cache">
            <h3 style="margin-bottom:10px;">Your PC's DNS cache</h3>
            <table class="cache-table">
              <thead><tr><th>Name</th><th>Type</th><th>Address / TTL</th></tr></thead>
              <tbody id="dns-cache-body">
                <tr><td colspan="3" style="color:var(--text-faint);">Empty resolve a domain to fill it in</td></tr>
              </tbody>
            </table>
            <p class="arp-legend">
              <span class="lg lg-cyan">● query (question going out)</span>
              <span class="lg lg-green">● answer / referral (coming back)</span>
            </p>
          </div>
        </div>
      </div>
      <p class="note">This is a teaching simulation: the resolver here queries root → TLD → authoritative in sequence and the addresses are generated locally for illustration. Real resolvers cache heavily and usually answer common names from cache without repeating the full walk.</p>
    </section>

</main>

<footer class="site">
  <p>Network Concepts Simulator — an interactive way to learn how networks actually move data.</p>
</footer>

<script src="../../assets/shared.js"></script>
<script src="dns.js"></script>
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
