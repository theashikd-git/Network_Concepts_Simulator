/* =============================================================================
   NETWORK CONCEPTS SIMULATOR
============================================================================= */
(function () {
  "use strict";

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $all = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  // Make a random string of hex characters (0-9, a-f), n characters long.
  function randHex(n) {
    let s = "";
    for (let i = 0; i < n; i++) {
      s += Math.floor(Math.random() * 16).toString(16);
    }
    return s;
  }

  // Make a fake MAC address like "A4:B2:9F:10:C3:7E".
  function randMac() {
    const parts = [];
    for (let i = 0; i < 6; i++) parts.push(randHex(2));
    return parts.join(":").toUpperCase();
  }

  // Turn any text into a single number ("hash" it).
  // We use this so the SAME domain always gives the SAME fake IP address,
  // instead of a different one every time.
  function hashStr(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) >>> 0; // >>> 0 keeps it a positive number
    }
    return h;
  }

  // Build a pretend public IP address for a website (e.g. "83.14.201.42").
  // NOTE: this is NOT a real lookup — we just invent a believable-looking IP
  // from the domain name so the demo has consistent numbers to show.
  function fakePublicIP(domain) {
    const h = hashStr(domain);
    const a = 40 + (h % 180);
    const b = (h >> 8) % 256;
    const c = (h >> 16) % 256;
    const d = 1 + ((h >> 24) % 253);
    return [a, b, c, d].join(".");
  }

  // Tidy up whatever the user typed so it looks like a plain domain.
  function cleanDomain(raw) {
    let d = (raw || "").trim().toLowerCase();
    d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!d) d = "example.com";
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) {
      d = d.replace(/[^a-z0-9.-]/g, "") || "example.com";
    }
    return d;
  }

  /* ===========================================================================
     THE STEP PLAYER  (a reusable "slideshow" engine)
     -----------------------------------------------------------------------
     The OSI demo is really just a list of steps that you can Play, Pause,
     go Next/Previous, or Replay. We keep that control logic in one place
     here so it stays easy to follow and easy to reuse if more modules
     are added later.

     You give createPlayer:
       - steps:      an array of step objects (each has a title, desc, etc.)
       - els:        the buttons and text areas it should control
       - autoplayMs: how long to wait on each step when playing (milliseconds)
       - onRender:   a function we call every time the step changes, so the
                     specific demo can update its own picture/animation.
  =========================================================================== */
  function createPlayer(opts) {
    const { steps, els, autoplayMs = 2400, onRender } = opts;

    let idx = 0;        // which step we're currently on (0 = first step)
    let timer = null;   // the auto-play timer (so we can stop it later)
    let playing = false;

    // Draw the little row of progress dots under the controls.
    function renderDots() {
      els.dots.innerHTML = "";
      steps.forEach((s, i) => {
        const b = document.createElement("button");
        b.className = "pd" + (i < idx ? " done" : "") + (i === idx ? " current" : "");
        b.addEventListener("click", () => { stop(); goTo(i); });
        els.dots.appendChild(b);
      });
    }

    // Show the current step: fill in the title, description, badge, counter,
    // and any extra "details" key/value pairs.
    function render() {
      const s = steps[idx];
      els.title.textContent = s.title;
      els.desc.textContent = s.desc;
      if (els.badge) els.badge.textContent = s.badge || "→";
      els.count.textContent = `step ${idx + 1}/${steps.length}`;

      if (els.detail) {
        els.detail.innerHTML = "";
        if (s.details) {
          Object.entries(s.details).forEach(([key, value]) => {
            const span = document.createElement("span");
            span.innerHTML = `<b>${key}:</b> ${value}`;
            els.detail.appendChild(span);
          });
        }
      }

      renderDots();
      els.prev.disabled = idx === 0;

      if (onRender) onRender(s, idx);
    }

    function goTo(i) {
      idx = Math.max(0, Math.min(steps.length - 1, i));
      render();
      if (idx === steps.length - 1) stop();
    }

    function next() { if (idx < steps.length - 1) goTo(idx + 1); else stop(); }
    function prev() { goTo(idx - 1); }

    function stop() {
      playing = false;
      clearInterval(timer);
      els.play.textContent = "▶";
    }

    function play() {
      if (idx >= steps.length - 1) goTo(0);
      playing = true;
      els.play.textContent = "❚❚";
      timer = setInterval(() => {
        if (idx < steps.length - 1) goTo(idx + 1);
        else stop();
      }, autoplayMs);
    }

    function toggle() { playing ? stop() : play(); }
    function replay() { stop(); goTo(0); }

    els.prev.addEventListener("click", () => { stop(); prev(); });
    els.next.addEventListener("click", () => { stop(); next(); });
    els.play.addEventListener("click", toggle);
    els.replay.addEventListener("click", replay);

    render();

    return {
      goTo, play, stop, replay,
      refresh: () => { if (onRender) onRender(steps[idx], idx); },
    };
  }

  /* ===========================================================================
     OSI DEMO  (the "type a website" simulator)
     -----------------------------------------------------------------------
     The idea: when you visit a website, your data travels DOWN the 7 layers of
     your PC (each layer wraps it in a header — "encapsulation"), across the
     network, then UP the 7 layers of the server (each layer unwraps it —
     "decapsulation"). This commit adds the layer facts and builds the two
     towers of layer rows. The actual step-by-step simulation is wired up in
     a later commit.
  =========================================================================== */

  // The 7 layers of the OSI model, each with a short beginner explanation.
  const LAYERS = [
    { n: 7, name: "Application", abbr: "HTTP / DNS / SMTP",
      purpose: "The layer users and applications actually interact with where requests like \"load this webpage\" or \"send this email\" originate.",
      header: "HTTP request line + headers (e.g. GET / HTTP/1.1)",
      example: "A browser building an HTTP GET request for a page." },
    { n: 6, name: "Presentation", abbr: "TLS / encoding",
      purpose: "Formats and translates data between the application and the network character encoding, compression, and encryption.",
      header: "Typically no separate header on the wire; folded into TLS/application data in practice.",
      example: "Encrypting an HTTP request into HTTPS via TLS." },
    { n: 5, name: "Session", abbr: "sessions / dialogs",
      purpose: "Opens, manages, and closes the communication session between two devices, keeping dialogs in sync.",
      header: "No distinct header in most modern web traffic handled implicitly by TCP connections and application logic.",
      example: "Keeping a login session alive across multiple requests." },
    { n: 4, name: "Transport", abbr: "TCP / UDP",
      purpose: "Breaks data into segments, assigns port numbers, and (with TCP) guarantees ordered, reliable delivery.",
      header: "TCP header source/destination port, sequence number, flags.",
      example: "TCP port 443 identifying that this traffic is HTTPS." },
    { n: 3, name: "Network", abbr: "IP / routing",
      purpose: "Adds logical addressing and figures out the path which routers to cross to reach the destination network.",
      header: "IP header source and destination IP address, TTL.",
      example: "A router deciding the next hop based on the destination IP." },
    { n: 2, name: "Data Link", abbr: "MAC / framing",
      purpose: "Handles delivery across a single local link using physical (MAC) addresses, and detects transmission errors.",
      header: "Ethernet header (source/destination MAC) + trailer (frame check sequence).",
      example: "A switch forwarding a frame based on the destination MAC address." },
    { n: 1, name: "Physical", abbr: "bits / signals",
      purpose: "Converts frames into raw bits and transmits them as electrical, optical, or radio signals over real media.",
      header: "No header just a stream of bits on the wire, fiber, or radio spectrum.",
      example: "Voltage changes on an Ethernet cable representing 1s and 0s." },
  ];

  // A shorter version of the same layers, used to label the two towers.
  const LAYER_META = {
    7: { name: "Application",  abbr: "HTTP/DNS" },
    6: { name: "Presentation", abbr: "TLS/encoding" },
    5: { name: "Session",      abbr: "sessions" },
    4: { name: "Transport",    abbr: "TCP/UDP" },
    3: { name: "Network",      abbr: "IP/routing" },
    2: { name: "Data Link",    abbr: "MAC/frames" },
    1: { name: "Physical",     abbr: "bits" },
  };

  // Build both towers of 7 layer rows. onLayerClick runs when a row is clicked
  // (for now it's just a placeholder — real behavior is added in a later commit).
  function buildTowers(onLayerClick) {
    ["client", "server"].forEach((side) => {
      const host = $("#tower-" + side + "-layers");
      host.innerHTML = "";
      // We go from 7 down to 1 so Application is on top and Physical at the bottom.
      for (let n = 7; n >= 1; n--) {
        const meta = LAYER_META[n];
        const row = document.createElement("div");
        row.className = "tlayer";
        row.dataset.n = n;
        row.dataset.side = side;
        row.setAttribute("role", "button");
        row.setAttribute("tabindex", "0");
        row.innerHTML = `<div class="tl-num">${n}</div><div class="tl-name">${meta.name}</div><div class="tl-abbr">${meta.abbr}</div>`;
        row.addEventListener("click", () => onLayerClick(n));
        row.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onLayerClick(n); }
        });
        host.appendChild(row);
      }
    });
  }

  // A few values we keep for the whole simulation session.
  const clientMac = randMac();      // our PC's MAC
  const gatewayMac = randMac();     // the gateway's MAC
  const clientIP = "192.168.1." + (2 + Math.floor(Math.random() * 250)); // our PC's IP

  // Build the full list of steps for a given website.
  // It's 15 steps: 7 going DOWN our PC, 1 crossing the network, 7 going UP the server.
  // This function only RETURNS the data it isn't wired into the player yet
  // (that happens in the next commit).
  function buildWebsiteSteps(domain) {
    const serverIP = fakePublicIP(domain);
    const serverMac = randMac();
    const steps = [];

    // "pdu" is the label that will later be shown on the moving packet.
    // Watch it GROW as headers are added on the way down, and SHRINK as
    // they're removed on the way up.

    // ---- SENDER: your PC, going DOWN (adding headers = encapsulation) ----
    steps.push({ side: "client", layer: 7, title: "Application build the request",
      desc: `You searched ${domain}. The application layer builds the HTTP request: GET / HTTP/1.1, Host: ${domain}. This is the raw data every layer below will wrap. (DNS, also here, has already resolved ${domain} to ${serverIP}.)`,
      pdu: "DATA", details: { Protocol: "HTTP", Host: domain, "Resolved IP": serverIP } });

    steps.push({ side: "client", layer: 6, title: "Presentation \u2192 encrypt & format",
      desc: `The presentation layer encrypts the request with TLS (because it's HTTPS) and handles formatting/encoding, so the data is unreadable in transit.`,
      pdu: "TLS\u00b7DATA", details: { Encryption: "TLS (simplified)" } });

    steps.push({ side: "client", layer: 5, title: "Session \u2192 open the conversation",
      desc: `The session layer starts and manages the dialog between your PC and ${domain}'s server, keeping this exchange organized as one session.`,
      pdu: "TLS\u00b7DATA", details: { Session: "client \u21c4 server" } });

    steps.push({ side: "client", layer: 4, title: "Transport \u2192 add TCP header",
      desc: `The transport layer breaks data into segments and adds a TCP header with port 443 (HTTPS) and a sequence number, so delivery is reliable and ordered.`,
      pdu: "TCP\u00b7DATA", details: { "Dst port": "443 (HTTPS)", Unit: "segment" } });

    steps.push({ side: "client", layer: 3, title: "Network \u2192 add IP header",
      desc: `The network layer adds an IP header with your IP (${clientIP}) as source and ${serverIP} as destination, forming a packet routers can forward.`,
      pdu: "IP\u00b7TCP\u00b7DATA", details: { "Src IP": clientIP, "Dst IP": serverIP, Unit: "packet" } });

    steps.push({ side: "client", layer: 2, title: "Data Link \u2192 add Ethernet frame",
      desc: `The data link layer wraps the packet in a frame with MAC addresses (yours plus the gateway's, found via ARP) and an error-check trailer.`,
      pdu: "ETH\u00b7IP\u00b7TCP\u00b7DATA", details: { "Src MAC": clientMac, "Dst MAC": gatewayMac, Unit: "frame" } });

    steps.push({ side: "client", layer: 1, title: "Physical \u2192 send as bits",
      desc: `The physical layer turns the frame into electrical, light, or radio signals and pushes the raw bits onto the wire or Wi-Fi.`,
      pdu: "BITS", details: { Unit: "bits", Medium: "copper / fiber / radio" } });

    // ---- ACROSS the network ----
    steps.push({ side: "cross", layer: 1, title: "Across the network",
      desc: `The bits travel across the local network to the switch, up through your router, hop-by-hop across the internet, and finally reach ${domain}'s server. Routers along the way only unwrap down to the IP header to decide the next hop.`,
      pdu: "BITS", details: { Destination: serverIP } });

    // ---- RECEIVER: the server, going UP (removing headers = decapsulation) ----
    steps.push({ side: "server", layer: 1, title: "Physical \u2192 receive the bits",
      desc: `The server's physical layer receives the raw signals and reconstructs them back into a frame of 1s and 0s.`,
      pdu: "BITS", details: { Server: domain } });

    steps.push({ side: "server", layer: 2, title: "Data Link \u2192 read & strip the frame",
      desc: `The data link layer checks the frame reached the right MAC address, verifies the error-check trailer, then removes the Ethernet header.`,
      pdu: "IP\u00b7TCP\u00b7DATA", details: { "Server MAC": serverMac } });

    steps.push({ side: "server", layer: 3, title: "Network \u2192 read & strip the IP header",
      desc: `The network layer confirms the packet's destination IP (${serverIP}) is this server, then removes the IP header.`,
      pdu: "TCP\u00b7DATA", details: { "Dst IP": serverIP } });

    steps.push({ side: "server", layer: 4, title: "Transport \u2192 reassemble segments",
      desc: `The transport layer uses the TCP header to reassemble segments in order and hand them to the right application via port 443, then removes the TCP header.`,
      pdu: "TLS\u00b7DATA", details: { Port: "443" } });

    steps.push({ side: "server", layer: 5, title: "Session \u2192 match the session",
      desc: `The session layer ties the data to the correct ongoing conversation with your PC.`,
      pdu: "TLS\u00b7DATA", details: {} });

    steps.push({ side: "server", layer: 6, title: "Presentation \u2192 decrypt",
      desc: `The presentation layer decrypts the TLS-protected data back into a readable HTTP request.`,
      pdu: "DATA", details: { Decryption: "TLS" } });

    steps.push({ side: "server", layer: 7, title: "Application \u2192 server handles the request",
      desc: `The application layer finally reads the original request, ${domain}'s web server finds the page, and prepares a response to send back down its own seven layers to you.`,
      pdu: "DATA", details: { Result: "200 OK", Next: "response returns the same way" } });

    return steps;
  }

  // For one step: highlight the active layer and move the packet to it.
  function renderJourney(step) {
    $all(".tlayer").forEach((r) => r.classList.remove("active"));

    const arrow = $("#jm-arrow");
    arrow.classList.toggle("active", step.side === "cross");

    $("#tower-client-sub").textContent =
      step.side === "client" ? "sending \u25bc" : step.side === "cross" ? "sent" : "waiting";
    $("#tower-server-sub").textContent =
      step.side === "server" ? "receiving \u25b2" : "waiting";

    const packet = $("#journey-packet");
    $("#journey-packet-label").textContent = step.pdu;

    let targetRow = null;
    if (step.side === "client") {
      targetRow = document.querySelector(`.tlayer[data-side="client"][data-n="${step.layer}"]`);
    } else if (step.side === "server") {
      targetRow = document.querySelector(`.tlayer[data-side="server"][data-n="${step.layer}"]`);
    }
    if (targetRow) targetRow.classList.add("active");

    const journey = $("#osi-journey");
    requestAnimationFrame(() => {
      const jr = journey.getBoundingClientRect();

      if (step.side === "cross") {
        const mid = $(".journey-mid").getBoundingClientRect();
        packet.style.left = mid.left - jr.left + mid.width / 2 + "px";
        packet.style.top = mid.top - jr.top + mid.height / 2 + "px";

      } else if (targetRow) {
        const tr = targetRow.getBoundingClientRect();
        const stacked = window.matchMedia("(max-width:640px)").matches;
        const edgeX = stacked
          ? tr.left - jr.left + tr.width / 2
          : step.side === "client" ? tr.right - jr.left : tr.left - jr.left;
        packet.style.left = edgeX + "px";
        packet.style.top = tr.top - jr.top + tr.height / 2 + "px";
      }

      packet.classList.add("show");
    });
  }

  // Fill in the little info line at the top (your IP/MAC, the server's IP).
  function buildSession(domain) {
    const serverIP = fakePublicIP(domain);
    $("#tower-server-name").textContent = domain;
    $("#website-session").innerHTML = `
      <span><b>Your IP</b> ${clientIP}</span>
      <span><b>Your MAC</b> ${clientMac}</span>
      <span><b>Gateway MAC</b> ${gatewayMac}</span>
      <span><b>${domain}</b> ${serverIP}</span>
    `;
  }

  // The text shown in the detail box before the user clicks a specific layer.
  const WEBSITE_OVERVIEW = `
    <div class="field"><label>What you're looking at</label>
      <div>Two seven-layer stacks: your PC on the left and the website's server on the right. Your request travels DOWN your layers (each one wraps it in a header), across the network, then UP the server's layers (each one unwraps it).</div></div>
    <div class="field"><label>Tip</label><div>Press Simulate to play automatically (3s per step), step with \u2039 \u203a, or click any layer to read what it does.</div></div>
  `;

  // Show the details for one layer (or the overview text if n is null).
  function renderWebsiteLayerDetail(n) {
    const box = $("#website-layer-detail");
    if (n == null) { box.innerHTML = WEBSITE_OVERVIEW; return; }

    const layer = LAYERS.find((l) => l.n === n); // look up the facts for this layer
    if (!layer) { box.innerHTML = WEBSITE_OVERVIEW; return; }

    box.innerHTML = `
      <div class="field"><label>Layer ${layer.n}</label><div>${layer.name} \u00b7 <span class="mono" style="color:var(--text-dim);">${layer.abbr}</span></div></div>
      <div class="field"><label>Purpose</label><div>${layer.purpose}</div></div>
      <div class="field"><label>Header added</label><div class="mono" style="font-size:12.5px;">${layer.header}</div></div>
      <div class="field"><label>Real-world example</label><div>${layer.example}</div></div>
    `;
  }

  // True once the user has clicked a layer — while pinned, the detail box
  // stops auto-following the simulation so they can read in peace.
  let websiteLayerPinned = false;

  let websitePlayer = null;

  // Create the player for the OSI simulation using the shared step-player engine.
  function createWebsitePlayer(steps) {
    const els = {
      title: $("#website-title"), desc: $("#website-desc"), badge: $("#website-badge"),
      count: $("#website-count"), dots: $("#website-dots"), prev: $("#website-prev"),
      next: $("#website-next"), play: $("#website-play"), replay: $("#website-replay"),
      detail: $("#website-detail"),
    };
    return createPlayer({
      steps,
      els,
      autoplayMs: 3000,
      onRender: (s) => {
        els.badge.textContent =
          s.side === "cross" ? "Across the network"
          : s.side === "client" ? `Your PC \u00b7 Layer ${s.layer}`
          : `Server \u00b7 Layer ${s.layer}`;
        renderJourney(s);

        // Auto-update the layer detail box to match the active layer,
        // UNLESS the user has "pinned" a layer by clicking it.
        if (!websiteLayerPinned && s.layer != null && s.side !== "cross") {
          renderWebsiteLayerDetail(s.layer);
        }
      },
    });
  }

  // Run the OSI simulation for whatever domain the user typed.
  function runWebsiteSim(rawDomain, autoplay) {
    const domain = cleanDomain(rawDomain);
    $("#website-input").value = domain;
    buildSession(domain);

    // Highlight whichever quick-domain button matches what's loaded now.
    $all(".quick-domains button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.domain === domain);
    });

    // Start fresh: nothing pinned, show the overview text.
    websiteLayerPinned = false;
    $all(".tlayer").forEach((r) => r.classList.remove("pinned"));
    renderWebsiteLayerDetail(null);

    const steps = buildWebsiteSteps(domain);
    websitePlayer = createWebsitePlayer(steps);

    if (autoplay) websitePlayer.play();
  }

  // First-time setup for the OSI tab.
  function initWebsite() {
    // Build the two towers. Clicking a layer "pins" its details and pauses
    // the simulation so the student can read without it auto-advancing.
    buildTowers((n) => {
      websiteLayerPinned = true;
      if (websitePlayer) websitePlayer.stop();
      $all(".tlayer").forEach((r) => r.classList.toggle("pinned", Number(r.dataset.n) === n));
      renderWebsiteLayerDetail(n);
    });

    // Pressing "Simulate" runs the current text box value.
    $("#website-go").addEventListener("click", () => runWebsiteSim($("#website-input").value, true));

    // Pressing Enter in the text box does the same.
    $("#website-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") runWebsiteSim($("#website-input").value, true);
    });

    // The quick-pick domain buttons.
    $all(".quick-domains button").forEach((btn) => {
      btn.addEventListener("click", () => runWebsiteSim(btn.dataset.domain, true));
    });

    // Load once (without auto-playing) so there's something to see at the start.
    runWebsiteSim("example.com", false);
  }

  /* ===========================================================================
     TABS
  =========================================================================== */
  function activateTab(name) {
    $all(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
    $all(".panel").forEach((p) => p.classList.remove("active"));
    const panel = document.getElementById("panel-" + name);
    if (panel) panel.classList.add("active");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function initTabs() {
    $all(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.panel));
    });

    $all(".mod-card[data-goto]").forEach((card) => {
      card.addEventListener("click", () => activateTab(card.dataset.goto));
    });

    const learn = $("#learn-card");
    if (learn) {
      learn.style.cursor = "pointer";
      learn.addEventListener("click", () => {
        const target = $("#fundamentals");
        if (target) {
          const header = $("header.top");
          const offset = (header ? header.offsetHeight : 0) + 14;
          const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
          window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
        }
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
    initWebsite();
  });
})();
