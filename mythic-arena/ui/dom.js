export const $ = (q, root = document) => root.querySelector(q);
export const $$ = (q, root = document) => Array.from(root.querySelectorAll(q));
export function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }
export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

export function openModal(id) {
  const dlg = document.getElementById(id);
  if (dlg && !dlg.open) dlg.showModal?.();
}
export function closeModal(id) {
  const dlg = document.getElementById(id);
  if (dlg && dlg.open) dlg.close?.();
}

// Close buttons: data-close="dlg-..."
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-close]");
  if (!btn) return;
  const id = btn.getAttribute("data-close");
  closeModal(id);
});

// Formatting
export function formatGold(n) {
  try { return new Intl.NumberFormat().format(n|0); }
  catch { return String(n|0); }
}
