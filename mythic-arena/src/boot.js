// src/boot.js
// Controls the boot flow and guarantees the game screen stays hidden
// until the user explicitly starts or loads a game.

const SAVE_KEY = 'mythic-arena-save';
const $ = (s) => document.querySelector(s);

function showOnly(idToShow) {
  const ids = ['screen-loading', 'screen-opening', 'screen-select'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isActive = (id === idToShow);
    el.classList.toggle('active', isActive);
    el.setAttribute('aria-hidden', String(!isActive));
    // Special handling for the game screen
    if (id === 'screen-select') {
      if (isActive) {
        el.hidden = false;
        // remove head-level blocker once we reveal the game screen
        const blocker = document.querySelector('style[data-boot-hide]');
        if (blocker) blocker.remove();
      } else {
        el.hidden = true;
      }
    }
  });
}

function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); }
  catch { return false; }
}

function enableOpeningLoadIfNeeded() {
  const btnLoad = $('#btn-open-load');
  if (btnLoad) btnLoad.disabled = !hasSave();
}

function wireOpeningButtons() {
  $('#btn-open-start')?.addEventListener('click', () => {
    // reveal the main screen but do not auto-start combat
    showOnly('screen-select');
  });

  $('#btn-open-load')?.addEventListener('click', async () => {
    if (!hasSave()) return;
    // wait for the game's Load button to exist, then click it
    await waitFor(() => document.getElementById('btn-load'), 8000);
    document.getElementById('btn-load').click();
    showOnly('screen-select');
  });
}

function waitFor(test, timeout = 6000, step = 50) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    (function loop(){
      try { if (test()) return resolve(true); } catch {}
      if (performance.now() - start > timeout) return reject(new Error('waitFor timeout'));
      setTimeout(loop, step);
    })();
  });
}

// On first paint we keep the loading screen. When window 'load' fires,
// we switch to the opening screen and arm the buttons.
(function boot() {
  // Ensure loading is visible now.
  showOnly('screen-loading');

  const onLoaded = () => {
    enableOpeningLoadIfNeeded();
    wireOpeningButtons();
    // small delay to avoid layout jank right at load
    requestAnimationFrame(() => showOnly('screen-opening'));
  };

  if (document.readyState === 'complete') onLoaded();
  else window.addEventListener('load', onLoaded, { once: true });
})();
