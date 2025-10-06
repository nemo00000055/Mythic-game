// src/game-entry.js
// Parses the URL hash to decide whether to auto-load a save or just
// wait for the player to click "Start" (new run).
//
// Supported hashes on game.html:
//   #new  -> just show the game screen; player clicks Start
//   #load -> trigger the Load button once UI is ready

const SAVE_KEY = 'mythic-arena-save';

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

function waitFor(selector, timeout = 8000, step = 50) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    (function loop(){
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (performance.now() - start > timeout)
        return reject(new Error('waitFor timeout: ' + selector));
      setTimeout(loop, step);
    })();
  });
}

(async function entry() {
  const hash = (location.hash || '').toLowerCase();
  if (hash === '#load') {
    // Only attempt to load if a save exists
    if (!hasSave()) return;
    try {
      const btnLoad = await waitFor('#btn-load');
      // Fire the game's load handler
      btnLoad.click();
    } catch (_e) {
      // If for any reason it wasn't found in time, we simply do nothing
      // and the user can press Load manually.
    }
  }
  // If #new or absent: do nothing; player will choose and press Start.
})();
