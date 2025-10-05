import { $, $$, openModal, closeModal, clear } from "./ui/dom.js";
import { buildSelectionLists, renderBattleHUD, updateNextWavePreview } from "./ui/render.js";
import { listSaves, saveNewSlot, deleteSave, loadSave } from "./systems/saveManager.js";

const state = {
  ui: {
    screen: "opening",            // "opening" | "saves" | "select" | "battle"
    pending: { side: "", name: "", className: "" },
    loadSlotId: null
  }
};
window.state = state;

/* ---------------- Routing ---------------- */
function showScreen(id) {
  for (const s of $$(".screen")) s.classList.remove("active");
  $(id).classList.add("active");
  state.ui.screen =
    id === "#screen-opening" ? "opening" :
    id === "#screen-saves" ? "saves" :
    id === "#screen-select" ? "select" : "battle";
}

/* ---------------- Toast ---------------- */
let toastTimer = null;
function toast(msg) {
  clearTimeout(toastTimer);
  let el = $("#__toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "__toast";
    Object.assign(el.style, {
      position:"fixed", right:"12px", bottom:"12px", background:"rgba(0,0,0,.7)",
      border:"1px solid #333a", padding:"8px 10px", borderRadius:"8px",
      color:"#fff", fontSize:"13px"
    });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  toastTimer = setTimeout(() => (el.style.opacity = "0"), 1800);
}

/* ---------------- Opening ---------------- */
function setupOpening() {
  $("#btn-open-start").addEventListener("click", showSelection);
  $("#btn-open-load").addEventListener("click", showSaves);
}

/* ---------------- Saves ---------------- */
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

    const title = document.createElement("strong");
    title.textContent = s.meta?.name || "Unnamed";

    const b = (t)=>{ const x=document.createElement("span"); x.className="badge"; x.textContent=t; return x; };
    meta.appendChild(title);
    meta.appendChild(b(s.meta?.side || "—"));
    meta.appendChild(b(s.meta?.className || "—"));
    meta.appendChild(b("Wave " + (s.meta?.wave ?? "—")));
    meta.appendChild(b("LV " + (s.meta?.level ?? "—")));
    meta.appendChild(b("Updated " + new Date(s.updatedAt||Date.now()).toLocaleString()));

    const actions = document.createElement("div");
    actions.className = "save-actions";

    const btnLoad = document.createElement("button");
    btnLoad.className = "btn"; btnLoad.textContent = "Load";
    btnLoad.addEventListener("click", () => handleLoadSlot(s.id));

    const btnDelete = document.createElement("button");
    btnDelete.className = "btn"; btnDelete.textContent = "Delete";
    btnDelete.addEventListener("click", () => { if (confirm("Delete this save?")) { deleteSave(s.id); renderSavesList(); } });

    actions.appendChild(btnLoad); actions.appendChild(btnDelete);

    row.appendChild(meta); row.appendChild(actions);
    root.appendChild(row);
  }
}
function setupSaves() {
  $("#btn-saves-refresh").addEventListener("click", renderSavesList);
  $("#btn-saves-new").addEventListener("click", showSelection);
  $("#btn-saves-back").addEventListener("click", showOpening);
}
function handleLoadSlot(slotId) {
  const slot = loadSave(slotId);
  if (!slot) return toast("Save not found.");
  if (window.__deserializeGameState && slot.blob && !slot.blob.marker) {
    window.__deserializeGameState(slot.blob);
    state.ui.loadSlotId = slotId;
    showBattle();
    toast("Game loaded.");
    return;
  }
  if (slot.blob?.pending) {
    state.ui.pending = slot.blob.pending;
    showSelection();
    $("#input-name").value = state.ui.pending.name || "";
    $("#select-side").value = state.ui.pending.side || "";
    buildSelectionLists(state);
    if (state.ui.pending.side === "hero" && state.ui.pending.className) $("#select-hero").value = state.ui.pending.className;
    if (state.ui.pending.side === "creature" && state.ui.pending.className) $("#select-creature").value = state.ui.pending.className;
    syncStartButton();
    toast("Selection restored. Press Start to begin.");
  } else {
    toast("This save is not compatible.");
  }
}

/* ---------------- Selection ---------------- */
function showSelection() { showScreen("#screen-select"); buildSelectionLists(state); syncStartButton(); }
function showOpening() { showScreen("#screen-opening"); }
function showSaves() { showScreen("#screen-saves"); renderSavesList(); }

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
function onNameInput() { state.ui.pending.name = $("#input-name").value.trim(); syncStartButton(); }
function onPickChange(e) {
  if (e.target.id === "select-hero" && state.ui.pending.side === "hero") state.ui.pending.className = e.target.value || "";
  if (e.target.id === "select-creature" && state.ui.pending.side === "creature") state.ui.pending.className = e.target.value || "";
  syncStartButton();
}
function randomPick() {
  const side = $("#select-side").value;
  if (!side) return toast("Choose a side first.");
  const select = side === "hero" ? $("#select-hero") : $("#select-creature");
  const n = select.options.length; if (!n) return toast("List empty.");
  select.selectedIndex = Math.floor(Math.random() * n);
  state.ui.pending.className = select.value;
  syncStartButton();
}

/* ---------------- Battle ---------------- */
function showBattle() {
  showScreen("#screen-battle");
  renderBattleHUD({
    initialName: state.ui.pending.name,
    initialSide: state.ui.pending.side,
    initialClassName: state.ui.pending.className
  });
  updateNextWavePreview();
}

/* ---------------- Save/Load (header buttons) ---------------- */
function currentGameSnapshotMeta(blob) {
  try {
    const p = blob?.player || {};
    return {
      name: p.name || state.ui.pending.name || "Unnamed",
      side: blob?.side || state.ui.pending.side || "—",
      className: p.className || state.ui.pending.className || "—",
      wave: blob?.wave ?? "—",
      level: p.level ?? "—"
    };
  } catch { return { name:"Unnamed", side:"—", className:"—", wave:"—", level:"—" }; }
}
function serializeForSave() {
  if (window.__serializeGameState) {
    const blob = window.__serializeGameState();
    return { blob, meta: currentGameSnapshotMeta(blob) };
  }
  const blob = { pending: state.ui.pending, marker: "selection-only" };
  return { blob, meta: currentGameSnapshotMeta(blob) };
}
function doSaveToSlot() { const { blob, meta } = serializeForSave(); saveNewSlot({ blob, meta }); toast("Saved to new slot."); }
function wireHeaderSaveLoadButtons() {
  $("#screen-select #btn-save").addEventListener("click", doSaveToSlot);
  $("#screen-select #btn-load").addEventListener("click", showSaves);
  $("#btn-back-opening").addEventListener("click", showOpening);

  $("#screen-battle #btn-save").addEventListener("click", doSaveToSlot);
  $("#screen-battle #btn-load").addEventListener("click", showSaves);
}

/* ---------------- Global ESC closes dialogs ---------------- */
function setupGlobalEscClose() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") for (const dlg of $$("dialog[open]")) dlg.close();
  });
}

/* ---------------- Boot ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  // OPENING screen by default
  showOpening();

  // Open/Saves
  setupOpening(); setupSaves();

  // Selection bindings
  $("#select-side").addEventListener("change", onSideChange);
  $("#input-name").addEventListener("input", onNameInput);
  $("#select-hero").addEventListener("change", onPickChange);
  $("#select-creature").addEventListener("change", onPickChange);
  $("#btn-random").addEventListener("click", randomPick);
  $("#btn-start").addEventListener("click", showBattle);

  wireHeaderSaveLoadButtons();
  setupGlobalEscClose();

  // Debug aid: log which screen is active on boot
  console.log("[MythicArena] Boot screen:", state.ui.screen);
});
