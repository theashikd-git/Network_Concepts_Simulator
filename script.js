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
     Both the ARP demo and the OSI demo are really just a list of steps that
     you can Play, Pause, go Next/Previous, or Replay. Rather than writing that
     control logic twice, we write it ONCE here and reuse it.

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
     ARP DEMO  (Address Resolution Protocol)
     -----------------------------------------------------------------------
     The idea: your PC knows another device's IP address, but to actually send
     a frame on the local network it needs that device's MAC (hardware) address.
     ARP is how it finds out: it SHOUTS to everyone ("who has this IP?") and
     only the matching device REPLIES. This commit wires that story into the
     step player and animates the diagram to match.
  =========================================================================== */
  function initARP() {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = $("#arp-svg");
    const cacheBody = $("#arp-cache-body");
    const clientMac = randMac();

    const PC = { id: "pc", x: 270, y: 130, emoji: "\uD83D\uDCBB", label: "Your PC", ip: "192.168.1.15", mac: clientMac };
    const SWITCH = { x: 270, y: 265 };
    const devices = [
      { id: "printer", x: 120, y: 395, emoji: "\uD83D\uDDA8\uFE0F", label: "Printer", ip: "192.168.1.30", mac: randMac() },
      { id: "gateway", x: 270, y: 395, emoji: "\uD83C\uDF10", label: "Gateway", ip: "192.168.1.1",  mac: randMac() },
      { id: "pc2",     x: 420, y: 395, emoji: "\uD83D\uDDA5\uFE0F", label: "PC-2",    ip: "192.168.1.22", mac: randMac() },
    ];
    let target = devices[1];

    function el(name, attrs) {
      const e = document.createElementNS(SVG_NS, name);
      for (const key in attrs) e.setAttribute(key, attrs[key]);
      return e;
    }

    function nodeGroup(d) {
      const g = el("g", { class: "arp-node", "data-id": d.id });

      g.appendChild(el("rect", { class: "node-chip", x: d.x - 48, y: d.y - 72, width: 96, height: 34, rx: 7 }));
      const ip = el("text", { class: "node-ip", x: d.x, y: d.y - 56, "text-anchor": "middle" });
      ip.textContent = d.ip;
      const mac = el("text", { class: "node-mac", x: d.x, y: d.y - 43, "text-anchor": "middle" });
      mac.textContent = "MAC ?";
      mac.dataset.mac = d.mac;

      g.appendChild(el("rect", { class: "node-box", x: d.x - 34, y: d.y - 30, width: 68, height: 60, rx: 10 }));
      const emo = el("text", { class: "node-emoji", x: d.x, y: d.y + 8, "text-anchor": "middle" });
      emo.textContent = d.emoji;

      g.appendChild(el("rect", { class: "node-namebg", x: d.x - 38, y: d.y + 38, width: 76, height: 20, rx: 6 }));
      const lab = el("text", { class: "node-label", x: d.x, y: d.y + 52, "text-anchor": "middle" });
      lab.textContent = d.label;

      g.append(ip, mac, emo, lab);

      // An "X" drawn over the box, hidden until this device rejects the request.
      const rejectX = el("path", {
        class: "arp-reject-x",
        d: `M ${d.x - 12} ${d.y - 12} L ${d.x + 12} ${d.y + 12} M ${d.x + 12} ${d.y - 12} L ${d.x - 12} ${d.y + 12}`,
      });
      g.appendChild(rejectX);

      return g;
    }

    function build() {
      svg.innerHTML = "";

      const sw = el("g", { class: "arp-node", "data-id": "switch" });
      sw.appendChild(el("rect", { class: "node-box", x: SWITCH.x - 30, y: SWITCH.y - 22, width: 60, height: 44, rx: 9 }));
      const se = el("text", { class: "node-emoji", x: SWITCH.x, y: SWITCH.y + 6, "text-anchor": "middle" });
      se.textContent = "\uD83D\uDD00";
      const sl = el("text", { class: "node-label", x: SWITCH.x, y: SWITCH.y + 34, "text-anchor": "middle" });
      sl.textContent = "Switch";
      sw.append(se, sl);

      const links = [];
      links.push(el("line", { class: "arp-link", "data-link": "pc", x1: PC.x, y1: PC.y + 62, x2: SWITCH.x, y2: SWITCH.y - 22 }));
      devices.forEach((d) => {
        links.push(el("line", { class: "arp-link", "data-link": d.id, x1: SWITCH.x, y1: SWITCH.y + 22, x2: d.x, y2: d.y - 30 }));
      });

      links.forEach((l) => svg.appendChild(l));
      svg.appendChild(sw);
      svg.appendChild(nodeGroup(PC));
      devices.forEach((d) => svg.appendChild(nodeGroup(d)));

      const pkt = el("g", { class: "arp-packet", id: "arp-packet" });
      pkt.appendChild(el("rect", { x: -30, y: -11, width: 60, height: 22, rx: 5, fill: "var(--amber)" }));
      const pt = el("text", { x: 0, y: 4, "text-anchor": "middle", fill: "#04121a" });
      pt.textContent = "ARP";
      pkt.appendChild(pt);
      svg.appendChild(pkt);
    }

    // Put the diagram back to its neutral starting look (used before each step).
    function reset() {
      $all(".arp-node", svg).forEach((n) => n.classList.remove("asking", "broadcast", "reject", "match"));
      $all(".arp-link", svg).forEach((l) => l.classList.remove("live-amber", "live-green"));
      $all(".arp-reject-x", svg).forEach((x) => x.classList.remove("show"));
      $all(".node-mac", svg).forEach((m) => (m.textContent = "MAC ?"));
      const pkt = $("#arp-packet", svg);
      if (pkt) pkt.classList.remove("show");
      cacheBody.innerHTML = `<tr><td colspan="3" style="color:var(--text-faint);">Empty resolve an address to fill it in</td></tr>`;
    }

    function node(id) { return svg.querySelector(`.arp-node[data-id="${id}"]`); }
    function link(id) { return svg.querySelector(`.arp-link[data-link="${id}"]`); }

    function movePacket(x, y, color, text) {
      const pkt = $("#arp-packet", svg);
      if (!pkt) return;
      pkt.querySelector("rect").setAttribute("fill", color);
      pkt.querySelector("text").textContent = text;
      pkt.setAttribute("transform", `translate(${x},${y})`);
      pkt.classList.add("show");
    }

    // The 6 steps of the ARP story. Each step has a "stage" name that render()
    // uses to decide what to light up on the diagram.
    function steps() {
      return [
        { stage: "idle", badge: "ARP \u00b7 cache check",
          title: "Your PC needs a MAC address",
          desc: `Your PC wants to send data to ${target.label} at ${target.ip}, but a frame can only be delivered using a MAC (hardware) address. Your PC checks its ARP cache first \u2014 and it's empty. So it must ask the network.`,
          details: { Have: target.ip, Need: `MAC of ${target.ip}` } },

        { stage: "broadcast", badge: "ARP Request \u00b7 broadcast",
          title: "ARP Request \u2014 shout to everyone",
          desc: `Your PC sends an ARP Request as a broadcast: "Who has ${target.ip}? Tell 192.168.1.15." The switch floods it to every device on the network \u2014 that's what broadcast means.`,
          details: { "Dst MAC": "FF:FF:FF:FF:FF:FF", Type: "broadcast" } },

        { stage: "inspect", badge: "ARP Request \u00b7 received",
          title: 'Every device checks: "is that me?"',
          desc: `All three devices receive the same request and compare the asked-for IP (${target.ip}) against their own. Only one of them will match.`,
          details: { Question: `is ${target.ip} mine?` } },

        { stage: "match", badge: "ARP Request \u00b7 result",
          title: "The wrong devices drop it \u2014 one matches",
          desc: `The devices whose IP doesn't match simply discard the request. ${target.label} sees its own IP (${target.ip}) and gets ready to reply.`,
          details: { Match: `${target.label} (${target.ip})` } },

        { stage: "reply", badge: "ARP Reply \u00b7 unicast",
          title: "ARP Reply \u2014 one answer, straight back",
          desc: `${target.label} replies directly to your PC only (a unicast, not a broadcast): "${target.ip} is at ${target.mac}." Notice it travels back along a single path, not to everyone.`,
          details: { From: target.label, MAC: target.mac } },

        { stage: "done", badge: "ARP \u00b7 cache updated",
          title: "Your PC saves it in the ARP cache",
          desc: `Your PC stores the ${target.ip} \u2192 ${target.mac} mapping so it won't need to broadcast again for a while. Now it can finally build and send its frame.`,
          details: { Cached: `${target.ip} \u2192 ${target.mac}` } },
      ];
    }

    // Draw the diagram for whichever step we're on.
    function render(s) {
      reset();
      const pc = node("pc");

      if (s.stage === "idle") {
        pc.classList.add("asking");

      } else if (s.stage === "broadcast") {
        // Light up ALL wires and ALL devices in amber = "sent to everyone".
        pc.classList.add("asking");
        link("pc").classList.add("live-amber");
        devices.forEach((d) => {
          link(d.id).classList.add("live-amber");
          node(d.id).classList.add("broadcast");
        });
        movePacket(SWITCH.x, SWITCH.y, "var(--amber)", "ARP?");

      } else if (s.stage === "inspect") {
        devices.forEach((d) => node(d.id).classList.add("broadcast"));
        movePacket(SWITCH.x, SWITCH.y, "var(--amber)", "ARP?");

      } else if (s.stage === "match") {
        // The matching device turns green; the others get an X.
        devices.forEach((d) => {
          if (d.id === target.id) {
            node(d.id).classList.add("match");
          } else {
            node(d.id).classList.add("reject");
            node(d.id).querySelector(".arp-reject-x").classList.add("show");
          }
        });

      } else if (s.stage === "reply") {
        // ONE green path back to our PC = a unicast reply (not a broadcast).
        node(target.id).classList.add("match");
        pc.classList.add("asking");
        link(target.id).classList.add("live-green");
        link("pc").classList.add("live-green");
        node(target.id).querySelector(".node-mac").textContent = target.mac.slice(0, 8) + "\u2026";
        movePacket((SWITCH.x + target.x) / 2, (SWITCH.y + target.y) / 2, "var(--green)", "MAC");

      } else if (s.stage === "done") {
        node(target.id).classList.add("match");
        pc.classList.add("asking");
        node(target.id).querySelector(".node-mac").textContent = target.mac.slice(0, 8) + "\u2026";
        cacheBody.innerHTML = `<tr class="new"><td>${target.ip}</td><td>${target.mac}</td><td>dynamic</td></tr>`;
      }
    }

    const els = {
      title: $("#arp-title"), desc: $("#arp-desc"), badge: $("#arp-badge"),
      count: $("#arp-count"), dots: $("#arp-dots"), prev: $("#arp-prev"),
      next: $("#arp-next"), play: $("#arp-play"), replay: $("#arp-replay"),
      detail: $("#arp-detail"),
    };
    let player = null;

    function buildTargetButtons() {
      const host = $("#arp-targets");
      host.innerHTML = "";
      devices.forEach((d) => {
        const b = document.createElement("button");
        b.className = "arp-target" + (d.id === target.id ? " selected" : "");
        b.innerHTML = `<b>${d.label}</b><span>${d.ip}</span>`;
        b.addEventListener("click", () => {
          target = d;
          $all(".arp-target", host).forEach((x) => x.classList.remove("selected"));
          b.classList.add("selected");
        });
        host.appendChild(b);
      });
    }

    // Smoothly scroll the diagram into view when the user presses Start,
    // so they don't have to manually scroll down to see the animation.
    function scrollToArp() {
      const stage = $("#panel-arp .website-stage");
      if (!stage) return;
      const header = $("header.top");
      const offset = (header ? header.offsetHeight : 0) + 14; // leave room for the sticky header
      const y = stage.getBoundingClientRect().top + window.pageYOffset - offset;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
    }

    // Create (or re-create) the player with the current target's steps.
    function run(autoplay) {
      player = createPlayer({
        steps: steps(),
        els,
        autoplayMs: 3000, // 3 seconds per step
        onRender: (s) => render(s),
      });
      if (autoplay) {
        scrollToArp();
        // Start playing after the scroll finishes, so the packet lands in view.
        setTimeout(() => { if (player) player.play(); }, 450);
      }
    }

    build();
    buildTargetButtons();
    run(false); // build it but wait for the user to press Start

    // Pressing Start rebuilds the diagram and plays from the beginning.
    $("#arp-go").addEventListener("click", () => { build(); run(true); });
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

  // First-time setup for the OSI tab. The simulation logic (steps, animation,
  // Simulate button) is wired up in later commits — for now this just fills
  // the two towers so they're no longer empty.
  function initWebsite() {
    buildTowers((n) => {
      // Placeholder: clicking a layer doesn't do anything meaningful yet.
      console.log("Layer clicked:", n);
    });
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
    initARP();
    initWebsite();
  });
})();
