import { $, $$, openModal, closeModal, clear } from "./ui/dom.js";
import { buildSelectionLists, renderBattleHUD, updateNextWavePreview } from "./ui/render.js";
import { HEROES, CREATURES } from "./systems/constants.js";
// NOTE: The rest of your modules (player/inventory/items/waves/etc.) remain unchanged and are used by renderBattleHUD() as before.

const STORAGE_KEY = "mythic-arena-save";

/** ----------------------------------------------------------------
 * State scaffold — keep your original state shape for battle screen.
 * We only add a tiny ui object for screen routing & pending selection.
 * --------------------------------------------------------------- */
const state = {
  // original game state fields will be created/loaded by renderBattleHUD()
  ui: {
    screen: "select", // "select" | "battle"
    pending: { side: "", name: "", className: "" }
  }
};

window.state = state;

/** =======================
 * Routing between screens
 * ======================= */
function showScreen(id) {
  for (const s of $$(".screen")) s.classList.remove("active");
  $(id).classList.add("active");
  state.ui.screen = id === "#screen-select" ? "select" : "battle";
}

/** =======================
 * Save / Load
 * ======================= */
function saveGame() {
  // Delegate to your existing serializer if present on window
  if (window.__serializeGameState) {
    const payload = window.__serializeGameState();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } else {
    // Minimal fallback: store selection if battle hasn’t started
    const payload = { pending: state.ui.pending, marker: "selection-only" };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }
  toast("Game saved.");
}

function loadGame() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return toast("No save found.");
  const data = JSON.parse(raw);

  // If full-game loader exists, prefer it.
  if (window.__deserializeGameState && data && !data.marker) {
    window.__deserializeGameState(data);
    // __deserializeGameState should rebuild UI & wire everything.
    showBattle();
    toast("Game loaded.");
    return;
  }

  // Otherwise, restore selection-only (pre-battle)
  if (data?.pending) {
    state.ui.pending = data.pending;
    $("#input-name").value = state.ui.pending.name || "";
    $("#select-side").value = state.ui.pending.side || "";
    // repopulate lists and select the className if possible
    buildSelectionLists(state);
    if (state.ui.pending.side === "hero" && state.ui.pending.className) {
      $("#select-hero").value = state.ui.pending.className;
    }
    if (state.ui.pending.side === "creature" && state.ui.pending.className) {
      $("#select-creature").value = state.ui.pending.className;
    }
    syncStartButton();
    toast("Selection restored. Press Start to begin.");
  }
}

/** =======================
 * Selection Screen Logic
 * ======================= */
function syncStartButton() {
  const ok = !!(state.ui.pending.side && state.ui.pending.className && state.ui.pending.name);
  $("#btn-start").disabled = !ok;
}

function onSideChange() {
  state.ui.pending.side = $("#select-side").value;
  // Clear the other list per spec
  if (state.ui.pending.side === "hero") {
    $("#select-creature").selectedIndex = -1;
    state.ui.pending.className = $("#select-hero").value || "";
  } else if (state.ui.pending.side === "creature") {
    $("#select-hero").selectedIndex = -1;
    state.ui.pending.className = $("#select-creature").value || "";
  } else {
    state.ui.pending.className = "";
  }
  syncStartButton();
}

function onNameInput() {
  state.ui.pending.name = $("#input-name").value.trim();
  syncStartButton();
}

function onPickChange(evt) {
  const id = evt.target.id;
  if (id === "select-hero" && state.ui.pending.side === "hero") {
    state.ui.pending.className = evt.target.value || "";
  }
  if (id === "select-creature" && state.ui.pending.side === "creature") {
    state.ui.pending.className = evt.target.value || "";
  }
  syncStartButton();
}

function randomPick() {
  const side = $("#select-side").value;
  if (!side) return toast("Choose a side first.");
  if (side === "hero") {
    const opts = Array.from($("#select-hero").options);
    if (!opts.length) return toast("Hero list empty.");
    const idx = Math.floor(Math.random() * opts.length);
    $("#select-hero").selectedIndex = idx;
    state.ui.pending.className = $("#select-hero").value;
  } else {
    const opts = Array.from($("#select-creature").options);
    if (!opts.length) return toast("Creature list empty.");
    const idx = Math.floor(Math.random() * opts.length);
    $("#select-creature").selectedIndex = idx;
    state.ui.pending.className = $("#select-creature").value;
  }
  syncStartButton();
}

/** =======================
 * Start → Battle screen
 * ======================= */
function showBattle() {
  showScreen("#screen-battle");

  // Render/boot the battle HUD using your existing plumbing.
  // This call should:
  //  - Create the Player with (name, className)
  //  - Initialize wave/shop/inventory state if not present
  //  - Wire buttons (#btn-next, #btn-special, #btn-auto, dialogs)
  renderBattleHUD({
    initialName: state.ui.pending.name,
    initialSide: state.ui.pending.side,      // "hero" | "creature"
    initialClassName: state.ui.pending.className
  });

  // After HUD is ready, paint first preview
  updateNextWavePreview();
}

/** =======================
 * Toaster (tiny)
 * ======================= */
let toastTimer = null;
function toast(msg) {
  clearTimeout(toastTimer);
  let el = $("#__toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast";
    el.style.position = "fixed";
    el.style.right = "12px";
    el.style.bottom = "12px";
    el.style.background = "rgba(0,0,0,.7)";
    el.style.border = "1px solid #333a";
    el.style.padding = "8px 10px";
    el.style.borderRadius = "8px";
    el.style.color = "#fff";
    el.style.fontSize = "13px";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  toastTimer = setTimeout(() => (el.style.opacity = "0"), 1800);
}

/** =======================
 * Wire up Selection screen
 * ======================= */
function setupSelection() {
  buildSelectionLists(state); // creates 10-per-side grouped lists

  $("#select-side").addEventListener("change", onSideChange);
  $("#input-name").addEventListener("input", onNameInput);
  $("#select-hero").addEventListener("change", onPickChange);
  $("#select-creature").addEventListener("change", onPickChange);

  $("#btn-random").addEventListener("click", randomPick);
  $("#btn-start").addEventListener("click", showBattle);

  // Save / Load on selection header
  // (IDs are duplicated across screens by design; use closest section scope)
  for (const btn of $$("#screen-select #btn-save")) btn.addEventListener("click", saveGame);
  for (const btn of $$("#screen-select #btn-load")) btn.addEventListener("click", loadGame);

  // Also wire on the battle header now (will work after we switch screens)
  for (const btn of $$("#screen-battle #btn-save")) btn.addEventListener("click", () => {
    // delegate to battle serializer if available; fallback to selection
    saveGame();
  });
  for (const btn of $$("#screen-battle #btn-load")) btn.addEventListener("click", loadGame);

  // Disable Start until a valid pick
  syncStartButton();

  // ESC closes any open dialog (robustness)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      for (const dlg of $$("dialog[open]")) dlg.close();
    }
  });
}

/** =======================
 * Boot
 * ======================= */
document.addEventListener("DOMContentLoaded", () => {
  showScreen("#screen-select");
  setupSelection();
});
