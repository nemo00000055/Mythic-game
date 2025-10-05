// src/boot.js
// Show a loading screen, then an opening screen (Start / Load).
// If a save exists in localStorage under 'mythic-arena-save', enable the Load button.
// When "Load Saved Game" is clicked, we trigger your in-game #btn-load.

const SAVE_KEY = 'mythic-arena-save';

const $ = (s) => document.querySelector(s);

function show(id) {
  document.querySelectorAll('.boot-screen').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); }
  catch { return false; }
}

function enableOpeningLoadIfNeeded() {
  const btnLoad = $('#btn-open-load');
  if (!btnLoad) return;
  btnLoad.disabled = !hasSave();
}

function wireOpening() {
  $('#btn-open-start')?.addEventListener('click', () => {
    show('screen-select');
  });

  $('#btn-open-load')?.addEventListener('click', async () => {
    if (!hasSave()) return;
    // Wait for your game UI to be ready, then click its Load button.
    await waitFor(() => document.getElementById('btn-load'), 6000);
    document.getElementById('btn-load').click();
    show('screen-select'); // hand control to your main UI
  });
}

function waitFor(testFn, timeout = 4000, step = 50) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const tick = () => {
      try {
        if (testFn()) return resolve(true);
      } catch {}
      if (performance.now() - start > timeout) return reject(new Error('waitFor: timeout'));
      setTimeout(tick, step);
    };
    tick();
  });
}

// Keep the Loading screen on first paint, then switch to Opening when ready.
(async function boot() {
  if (document.readyState === 'complete') {
    // already loaded
  } else {
    await new Promise(r => window.addEventListener('load', r, { once: true }));
  }

  // One animation frame for layout, then reveal opening UI.
  requestAnimationFrame(() => {
    enableOpeningLoadIfNeeded();
    wireOpening();
    show('screen-opening');
  });

  // Optional: auto-continue if you prefer
  // if (hasSave()) $('#btn-open-load')?.click();
})();
