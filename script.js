/* =============================================================================
   NETWORK CONCEPTS SIMULATOR
============================================================================= */
(function () {
  "use strict";

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $all = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  function activateTab(name) {
    $all(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.panel === name));
    $all(".panel").forEach((p) => p.classList.remove("active"));
    const panel = document.getElementById("panel-" + name);
    if (panel) panel.classList.add("active");
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function initTabs() {
    // The top navigation buttons.
    $all(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.panel));
    });

    // Dashboard module cards jump straight to their module tab.
    $all(".mod-card[data-goto]").forEach((card) => {
      card.addEventListener("click", () => activateTab(card.dataset.goto));
    });

    // The "Learn Networking" card scrolls down to the fundamentals section
    // instead of switching tabs, since the glossary lives on this same page.
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
  });
})();
