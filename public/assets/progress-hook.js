// Loaded by every module page. Reports "in_progress" on load and
// "completed" once the student hits the final step, without touching
// that module's own script. Needs window.APP_CONTEXT (csrfToken +
// simulationSlug), injected by the module's index.php.
(function () {
  "use strict";

  const ctx = window.APP_CONTEXT || {};
  const startedAt = Date.now();
  let alreadyCompleted = false;

  // Most modules use "#{slug}-count" for their step counter, but OSI's
  // internal id is still "#website-count" (an old rename that stuck).
  const ID_PREFIX_OVERRIDES = { osi: "website" };
  const idPrefix = ID_PREFIX_OVERRIDES[ctx.simulationSlug] || ctx.simulationSlug;

  function secondsSinceStart() {
    return Math.round((Date.now() - startedAt) / 1000);
  }

  function saveProgress(status, { beacon = false } = {}) {
    const payload = JSON.stringify({
      slug: ctx.simulationSlug,
      status,
      timeSpentSeconds: secondsSinceStart(),
    });

    if (beacon && navigator.sendBeacon) {
      // Used on page close since fetch can get cancelled mid-flight.
      // Can't attach the CSRF header this way, so this is best-effort only.
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("../../../api/save_progress.php", blob);
      return;
    }

    fetch("../../../api/save_progress.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": ctx.csrfToken || "",
      },
      body: payload,
      credentials: "same-origin",
    }).catch(() => {});
  }

  // Watches the module's own step counter text (e.g. "step 7/15") to
  // detect completion, instead of modifying that module's script.
  function watchForCompletion() {
    const counter = document.getElementById(idPrefix + "-count");
    if (!counter) return;

    const check = () => {
      const match = counter.textContent.match(/step\s+(\d+)\/(\d+)/i);
      if (!match) return;
      const [, current, total] = match;
      if (!alreadyCompleted && current === total) {
        alreadyCompleted = true;
        saveProgress("completed");
      }
    };

    check();
    const observer = new MutationObserver(check);
    observer.observe(counter, { childList: true, characterData: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!ctx.simulationSlug) return;
    saveProgress("in_progress");
    watchForCompletion();
  });

  window.addEventListener("pagehide", () => {
    if (!alreadyCompleted) {
      saveProgress("in_progress", { beacon: true });
    }
  });
})();
