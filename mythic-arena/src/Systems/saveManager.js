// Multi-slot save system using localStorage.
// Slots under key "mythic-arena-saves": { id, createdAt, updatedAt, meta, blob }

const SLOTS_KEY = "mythic-arena-saves";

function uid() { return "S" + Math.random().toString(36).slice(2) + Date.now().toString(36); }

export function listSaves() {
  try {
    const arr = JSON.parse(localStorage.getItem(SLOTS_KEY) || "[]");
    if (!Array.isArray(arr)) return [];
    return arr.sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0));
  } catch { return []; }
}

export function saveNewSlot({ blob, meta }) {
  const now = Date.now();
  const slot = { id: uid(), createdAt: now, updatedAt: now, meta: meta || {}, blob: blob || {} };
  const arr = listSaves();
  arr.unshift(slot);
  localStorage.setItem(SLOTS_KEY, JSON.stringify(arr));
  return slot;
}

export function deleteSave(id) {
  const arr = listSaves().filter(s => s.id !== id);
  localStorage.setItem(SLOTS_KEY, JSON.stringify(arr));
}

export function loadSave(id) {
  const arr = listSaves();
  return arr.find(s => s.id === id) || null;
}

export function updateSlot(id, { blob, meta }) {
  const arr = listSaves();
  const idx = arr.findIndex(s => s.id === id);
  if (idx < 0) return null;
  arr[idx] = {
    ...arr[idx],
    updatedAt: Date.now(),
    meta: meta ? { ...arr[idx].meta, ...meta } : arr[idx].meta,
    blob: blob ?? arr[idx].blob
  };
  localStorage.setItem(SLOTS_KEY, JSON.stringify(arr));
  return arr[idx];
}
