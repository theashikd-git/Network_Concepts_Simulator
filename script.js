/* =============================================================================
   NETWORK CONCEPTS SIMULATOR
============================================================================= */
(function () {
  "use strict";

  const $all = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function activateTab(name) {
    $all(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
    $all(".panel").forEach((p) => p.classList.remove("active"));
    const panel = document.getElementById("panel-" + name);
    if (panel) panel.classList.add("active");
  }

  function initTabs() {
    $all(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.panel));
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTabs();
  });
})();
