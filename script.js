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
     ARP DEMO  (Address Resolution Protocol)
     -----------------------------------------------------------------------
     The idea: your PC knows another device's IP address, but to actually send
     a frame on the local network it needs that device's MAC (hardware) address.
     ARP finds it by asking everyone and only the matching device replying.
  =========================================================================== */
  function initARP() {
    const SVG_NS = "http://www.w3.org/2000/svg";
    const svg = $("#arp-svg");

    // Our PC, the switch in the middle, and three other devices.
    // The numbers are x/y positions inside the drawing (540 wide, 480 tall).
    const PC = { id: "pc", x: 270, y: 130, emoji: "\uD83D\uDCBB", label: "Your PC", ip: "192.168.1.15", mac: randMac() };
    const SWITCH = { x: 270, y: 265 };
    const devices = [
      { id: "printer", x: 120, y: 395, emoji: "\uD83D\uDDA8\uFE0F", label: "Printer", ip: "192.168.1.30", mac: randMac() },
      { id: "gateway", x: 270, y: 395, emoji: "\uD83C\uDF10", label: "Gateway", ip: "192.168.1.1",  mac: randMac() },
      { id: "pc2",     x: 420, y: 395, emoji: "\uD83D\uDDA5\uFE0F", label: "PC-2",    ip: "192.168.1.22", mac: randMac() },
    ];

    // Which device are we set up to resolve? Default is the Gateway.
    let target = devices[1];

    // Helper: create one SVG element and set its attributes in one go.
    function el(name, attrs) {
      const e = document.createElementNS(SVG_NS, name);
      for (const key in attrs) e.setAttribute(key, attrs[key]);
      return e;
    }

    // Build one device on the diagram: an IP/MAC label above, a box with an
    // emoji in the middle, and a name below.
    function nodeGroup(d) {
      const g = el("g", { class: "arp-node", "data-id": d.id });

      g.appendChild(el("rect", { class: "node-chip", x: d.x - 48, y: d.y - 72, width: 96, height: 34, rx: 7 }));
      const ip = el("text", { class: "node-ip", x: d.x, y: d.y - 56, "text-anchor": "middle" });
      ip.textContent = d.ip;
      const mac = el("text", { class: "node-mac", x: d.x, y: d.y - 43, "text-anchor": "middle" });
      mac.textContent = "MAC ?"; // unknown until ARP resolves it (later commit)

      g.appendChild(el("rect", { class: "node-box", x: d.x - 34, y: d.y - 30, width: 68, height: 60, rx: 10 }));
      const emo = el("text", { class: "node-emoji", x: d.x, y: d.y + 8, "text-anchor": "middle" });
      emo.textContent = d.emoji;

      g.appendChild(el("rect", { class: "node-namebg", x: d.x - 38, y: d.y + 38, width: 76, height: 20, rx: 6 }));
      const lab = el("text", { class: "node-label", x: d.x, y: d.y + 52, "text-anchor": "middle" });
      lab.textContent = d.label;

      g.append(ip, mac, emo, lab);
      return g;
    }

    // Draw the whole diagram: switch, wires, devices, and a (still hidden) packet.
    function build() {
      svg.innerHTML = "";

      // The switch in the middle (a small box).
      const sw = el("g", { class: "arp-node", "data-id": "switch" });
      sw.appendChild(el("rect", { class: "node-box", x: SWITCH.x - 30, y: SWITCH.y - 22, width: 60, height: 44, rx: 9 }));
      const se = el("text", { class: "node-emoji", x: SWITCH.x, y: SWITCH.y + 6, "text-anchor": "middle" });
      se.textContent = "\uD83D\uDD00";
      const sl = el("text", { class: "node-label", x: SWITCH.x, y: SWITCH.y + 34, "text-anchor": "middle" });
      sl.textContent = "Switch";
      sw.append(se, sl);

      // The connecting wires: PC -> switch, and switch -> each device.
      const links = [];
      links.push(el("line", { class: "arp-link", "data-link": "pc", x1: PC.x, y1: PC.y + 62, x2: SWITCH.x, y2: SWITCH.y - 22 }));
      devices.forEach((d) => {
        links.push(el("line", { class: "arp-link", "data-link": d.id, x1: SWITCH.x, y1: SWITCH.y + 22, x2: d.x, y2: d.y - 30 }));
      });

      // Draw wires FIRST so the device boxes sit on top of them.
      links.forEach((l) => svg.appendChild(l));
      svg.appendChild(sw);
      svg.appendChild(nodeGroup(PC));
      devices.forEach((d) => svg.appendChild(nodeGroup(d)));

      // The packet that will later travel along the wires — drawn but hidden.
      const pkt = el("g", { class: "arp-packet", id: "arp-packet" });
      pkt.appendChild(el("rect", { x: -30, y: -11, width: 60, height: 22, rx: 5, fill: "var(--amber)" }));
      const pt = el("text", { x: 0, y: 4, "text-anchor": "middle", fill: "#04121a" });
      pt.textContent = "ARP";
      pkt.appendChild(pt);
      svg.appendChild(pkt);
    }

    // Draw the "Printer / Gateway / PC-2" chooser buttons.
    // Clicking one just changes which device is selected for now
    // actually resolving it comes in a later commit.
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

    build();
    buildTargetButtons();
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
