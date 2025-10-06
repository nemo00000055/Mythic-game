export const $ = (sel,root=document)=>root.querySelector(sel);
export const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
export function el(tag, cls, text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=text; return n; }
export function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }
export function formatGold(g){ return (g|0).toLocaleString(); }
export function openModal(id){ const dlg=document.getElementById(id); if(dlg && !dlg.open){ dlg.showModal(); } }
export function closeModal(id){ const dlg=document.getElementById(id); if(dlg && dlg.open){ dlg.close(); } }
export function bindDialogControls(){
  document.addEventListener("click",(e)=>{ const btn=e.target.closest("[data-close]"); if(btn){ const id=btn.getAttribute("data-close"); closeModal(id); } });
  document.addEventListener("keydown",(e)=>{ if(e.key==="Escape"){ for(const dlg of document.querySelectorAll("dialog[open]")) dlg.close(); } });
}
