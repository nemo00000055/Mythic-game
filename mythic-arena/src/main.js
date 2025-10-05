import { $, $$, openModal, closeModal, clear } from "./ui/dom.js";
import { buildSelectionLists, renderBattleHUD, updateNextWavePreview } from "./ui/render.js";
import { HEROES, CREATURES } from "./systems/constants.js";
import { listSaves, saveNewSlot, deleteSave, loadSave } from "./systems/saveManager.js";

const QUICK_KEY = "mythic-arena-save"; // kept for backward compatibility (single quick-save)

/** ----------------------------------------------------------------
 * Global UI State
 * --------------------------------------------------------------- */
const state = {
  ui: {
    screen: "opening", // "opening" | "saves" | "select" | "battle"
    pending: { side: "", name: "", className: "" },
    // when loading from a slot, we stash it here (for deserializer)
    loadSlotId: null
  }
};
window.state = state;

/** =======================
 * Routing helpers
 * ======================= */
function showScreen(id) {
  for (const s of $$(".screen")) s.classList.remove("active");
  $(id).classList.add("active");
  state.ui.screen =
    id === "#screen-opening" ? "opening" :
    id === "#screen-saves" ? "saves" :
    id === "#screen-select" ? "select" : "battle";
}

/** =======================
 * Toast helper
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
 * Opening Screen
 * ======================= */
function setupOpening() {
  $("#btn-open-start").addEventListener("click", () => {
    showSelection();
  });
  $("#btn-open-load").addEventListener("click", () => {
    showSaves();
  });
}

/** =======================
 * Saved Games Screen
 * ======================= */
function renderSavesList() {
  const root = $("#savelist");
  clear(root);

  const saves = listSaves();
  if (!saves.length) {
    const empty = document.createElement("div");
    empty.className = "card";
    empty.textContent = "No saved games yet.";
    root.appendChild(empty);
    return;
  }

  for (const s of saves) {
    const row = document.createElement("div");
    row.className = "save-row";

    const meta = document.createElement("div");
    meta.className = "save-meta";
    const name = s.meta?.name || "Unnamed";
    const side = s.meta?.side || "—";
    const cls = s.meta?.className || "—";
    const wave = s.meta?.wave ?? "—";
    const level = s.meta?.level ?? "—";
    const created = new Date(s.createdAt || Date.now()).toLocaleString();
    const updated = new Date(s.updatedAt || Date.now()).toLocaleString();

    const title = document.createElement("strong");
    title.textContent = name;

    const b1 = badge(side);
    const b2 = badge(cls);
    const b3 = badge(`Wave ${wave}`);
    const b4 = badge(`LV ${level}`);
    const b5 = badge(`Updated ${updated}`);

    meta.appendChild(title);
    meta.appendChild(b1);
    meta.appendChild(b2);
    meta.appendChild(b3);
    meta.appendChild(b4);
    meta.appendChild(b5);

    const actions = document.createElement("div");
    actions.className = "save-actions";

    const btnLoad = document.createElement("button");
    btnLoad.className = "btn";
    btnLoad.textContent = "Load";
    btnLoad.addEventListener("click", () => {
      handleLoadSlot(s.id);
    });

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn";
    btnDelete.textContent = "Delete";
    btnDelete.addEventListener("click", () => {
      if (confirm("Delete this save?")) {
        deleteSave(s.id);
        renderSavesList();
      }
    });

    actions.appendChild(btnLoad);
    actions.appendChild(btnDelete);

    row.appendChild(meta);
    row.appendChild(actions);

    root.appendChild(row);
  }

  function badge(txt) {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = txt;
    return b;
  }
}

function setupSaves() {
  $("#btn-saves-refresh").addEventListener("click", renderSavesList);
  $("#btn-saves-new").addEventListener("click", () => {
    showSelection();
  });
  $("#btn-saves-back").addEventListener("click", () => {
    // If we came from battle/select via Load, go back there; else opening
    if (historyCanReturnToGame()) {
      historyBackToGame();
    } else {
      showOpening();
    }
  });
}

function handleLoadSlot(slotId) {
  const slot = loadSave(slotId);
  if (!slot) return toast("Save not found.");

  // Prefer full-game deserializer if available:
  if (window.__deserializeGameState && slot.blob && !slot.blob.marker) {
    window.__deserializeGameState(slot.blob);
    state.ui.loadSlotId = slotId;
    showBattle();
    toast("Game loaded.");
    return;
  }

  // Fallback: selection-only data
  if (slot.blob?.pending) {
    state.ui.pending = slot.blob.pending;
    showSelection();
    // Populate selects with restored values
    $("#input-name").value = state.ui.pending.name || "";
    $("#select-side").value = state.ui.pending.side || "";
    buildSelectionLists(state);
    if (state.ui.pending.side === "hero" && state.ui.pending.className) {
      $("#select-hero").value = state.ui.pending.className;
    }
    if (state.ui.pending.side === "creature" && state.ui.pending.className) {
      $("#select-creature").value = state.ui.pending.className;
    }
    syncStartButton();
    toast("Selection restored. Press Start to begin.");
  } else {
    toast("This save is not compatible.");
  }
}

/** =======================
 * Selection Screen (Main Menu)
 * ======================= */
function showSelection() {
  showScreen("#screen-select");
  buildSelectionLists(state);
  syncStartButton();
}

function showOpening() {
  showScreen("#screen-opening");
}

function showSaves() {
  showScreen("#screen-saves");
  renderSavesList();
}

function syncStartButton() {
  const ok = !!(state.ui.pending.side && state.ui.pending.className && state.ui.pending.name);
  $("#btn-start").disabled = !ok;
}

function onSideChange() {
  state.ui.pending.side = $("#select-side").value;
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
 * Start → Battle
 * ======================= */
function showBattle() {
  showScreen("#screen-battle");
  renderBattleHUD({
    initialName: state.ui.pending.name,
    initialSide: state.ui.pending.side,
    initialClassName: state.ui.pending.className
  });
  updateNextWavePreview();
}

/** =======================
 * Save / Load Buttons in headers
 * ======================= */
function currentGameSnapshotMeta(blob) {
  // Try to extract meta for save listing
  try {
    const p = blob?.player || {};
    return {
      name: p.name || state.ui.pending.name || "Unnamed",
      side: blob?.side || state.ui.pending.side || "—",
      className: p.className || state.ui.pending.className || "—",
      wave: blob?.wave ?? "—",
      level: p.level ?? "—"
    };
  } catch {
    return { name: "Unnamed", side: "—", className: "—", wave: "—", level: "—" };
  }
}

function serializeForSave() {
  if (window.__serializeGameState) {
    const blob = window.__serializeGameState();
    return { blob, meta: currentGameSnapshotMeta(blob) };
  }
  // selection-only fallback
  const blob = { pending: state.ui.pending, marker: "selection-only" };
  return { blob, meta: currentGameSnapshotMeta(blob) };
}

function doSaveToSlot() {
  const { blob, meta } = serializeForSave();
  saveNewSlot({ blob, meta });
  toast("Saved to new slot.");
}

function wireHeaderSaveLoadButtons() {
  // On selection screen
  $("#screen-select #btn-save").addEventListener("click", doSaveToSlot);
  $("#screen-select #btn-load").addEventListener("click", showSaves);
  $("#btn-back-opening").addEventListener("click", showOpening);

  // On battle screen
  $("#screen-battle #btn-save").addEventListener("click", doSaveToSlot);
  $("#screen-battle #btn-load").addEventListener("click", showSaves);
}

/** =======================
 * ESC closes any dialog
 * ======================= */
function setupGlobalEscClose() {
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
  setupOpening();
  setupSaves();

  // Selection screen bindings
  $("#select-side").addEventListener("change", onSideChange);
  $("#input-name").addEventListener("input", onNameInput);
  $("#select-hero").addEventListener("change", onPickChange);
  $("#select-creature").addEventListener("change", onPickChange);
  $("#btn-random").addEventListener("click", randomPick);
  $("#btn-start").addEventListener("click", showBattle);

  wireHeaderSaveLoadButtons();
  setupGlobalEscClose();

  // Start on Opening screen
  showOpening();
});

/** Utilities to decide where to go "Back" from Saves screen */
function historyCanReturnToGame() {
  // If we were on selection or battle before, their sections might be visible in memory
  // Here we simply check if user has made any selection or if a battle HUD might be active
  if (state.ui.pending.side || state.ui.pending.className || state.ui.pending.name) return true;
  // You can expand this with more robust checks if needed
  return false;
}
function historyBackToGame() {
  if ($("#screen-battle").classList.contains("active")) {
    showBattle();
  } else {
    showSelection();
  }
}
