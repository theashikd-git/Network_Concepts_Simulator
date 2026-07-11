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

    // Create (or re-create) the player with the current target's steps.
    function run(autoplay) {
      player = createPlayer({
        steps: steps(),
        els,
        autoplayMs: 3000, // 3 seconds per step
        onRender: (s) => render(s),
      });
      if (autoplay) player.play();
    }

    build();
    buildTargetButtons();
    run(false); // build it but wait for the user to press Start

    // Pressing Start rebuilds the diagram and plays from the beginning.
    $("#arp-go").addEventListener("click", () => { build(); run(true); });
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
  });
})();
