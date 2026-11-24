/* Customers: agregasi otomatis dari pesanan, detail, avatar, WA, buat pesanan. */
(function(){
"use strict";
const F=window.F, $=F.$, $$=F.$$;
let query="";

function filtered(){
  const list=F.buildCustomers();
  if(!query) return list;
  return list.filter(c=> c.name.toLowerCase().includes(query)||String(c.phone||"").includes(query));
}
function render(){
  const all=F.buildCustomers();
  $("#customerTotalCount").textContent=String(all.length);
  $("#customerRepeatCount").textContent=String(all.filter(c=> c.orders>=2).length);
  $("#customerTotalSpending").textContent=F.formatCurrencyValue(all.reduce((s,c)=> s+c.total,0));
  const list=filtered();
  const box=$("#customerList");
  box.innerHTML=list.map(c=>{
    const ms=F.computeCustomerMilestoneStats(c);
    return `
    <button type="button" class="cust-cell" data-customer="${F.esc(c.name)}">
      <img class="avatar" width="34" height="34" src="${F.avatarSrc(c.name)}" alt="Avatar ${F.esc(c.name)}">
      <span class="grow" style="min-width:0">
        <span class="name" style="display:block">${F.esc(c.name)}</span>
        <span class="meta" style="display:block">${c.orders} pesanan, total ${F.esc(F.formatCurrencyValue(c.total))}</span>
      </span>
      <span class="tag ${ms.isRepeat?"tag-accent":""}">${ms.isRepeat?"Repeat Order":"Baru"}</span>
    </button>`;
  }).join("");
  $("#custEmpty").classList.toggle("hidden", list.length>0);
  $$("[data-customer]",box).forEach(b=> b.addEventListener("click", ()=> openDetail(b.dataset.customer)));
  F.refreshIcons();
}
function openDetail(name){
  const c=F.buildCustomers().find(x=> x.name===name);
  if(!c) return;
  const history=F.getTransactions().filter(t=> String(t.name||"").trim().toLowerCase()===name.trim().toLowerCase())
    .sort((a,b)=> String(b.date).localeCompare(String(a.date)));
  const avg=c.orders? Math.round(c.total/c.orders):0;
  const ms=F.computeCustomerMilestoneStats(c);
  const wa=F.normalizePhoneCustomer(c.phone);
  const ov=F.openModal(`
    ${F.modalHead("Detail Customer")}
    <div style="display:flex; gap:14px; align-items:center; margin-bottom:10px">
      <img class="avatar" width="58" height="58" style="width:58px;height:58px" src="${F.avatarSrc(c.name)}" alt="Avatar ${F.esc(c.name)}">
      <div class="grow">
        <div style="font-weight:800; font-size:17px">${F.esc(c.name)}</div>
        <div class="muted small">${F.esc(c.phone||"Nomor WhatsApp belum tercatat")}</div>
      </div>
      <span class="tag ${ms.isRepeat?"tag-accent":""}">${ms.isRepeat?"Repeat Order":"Customer Baru"}</span>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" id="changeAvatarBtn" style="margin-bottom:10px">Ganti Avatar</button>
    <div class="kv"><span class="k">Jumlah Order</span><span class="v num">${c.orders}</span></div>
    <div class="kv"><span class="k">Total Spending</span><span class="v num">${F.esc(F.formatCurrencyValue(c.total))}</span></div>
    <div class="kv"><span class="k">Rata-rata per Order</span><span class="v num">${F.esc(F.formatCurrencyValue(avg))}</span></div>
    <div class="kv"><span class="k">Order Terakhir</span><span class="v">${F.esc(F.formatDateValue(c.lastDate))}</span></div>
    <h3 style="margin:16px 0 6px; font-size:14.5px; font-weight:800">Riwayat Order</h3>
    <div id="customerHistoryList">
      ${history.length? history.map(t=> `
        <div class="kv"><span class="k">${F.esc(t.category)}, ${F.esc(F.formatDateValue(t.date))}</span><span class="v num">${F.esc(F.formatCurrencyValue(t.price))}</span></div>`).join("")
      : '<p class="muted small">Belum ada riwayat order.</p>'}
    </div>
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" id="waBtn">${wa?"Kirim WhatsApp":"WhatsApp tidak tersedia"}</button>
      <button type="button" class="btn btn-primary" id="createOrderBtn">Buat Pesanan</button>
    </div>`);
  $("#changeAvatarBtn",ov).addEventListener("click", ()=> openAvatarPicker(c.name));
  $("#waBtn",ov).addEventListener("click", ()=>{
    if(!wa){ F.showToast("Nomor WhatsApp customer belum tercatat", "error"); return; }
    window.open("https://wa.me/"+wa, "_blank");
  });
  $("#createOrderBtn",ov).addEventListener("click", ()=>{
    location.href="pesanan.html?customerName="+encodeURIComponent(c.name)+"&customerPhone="+encodeURIComponent(c.phone||"");
  });
}
function openAvatarPicker(name){
  const cur=F.customerAvatarNumber(name);
  const ov=F.openModal(`
    ${F.modalHead("Pilih Avatar")}
    <p class="muted small" style="margin-bottom:14px">Avatar untuk ${F.esc(name)}. Pilihan tersimpan dan berlaku di semua perangkat.</p>
    <div class="avatar-grid">
      ${Array.from({length:16},(_,i)=> i+1).map(n=> `
        <button type="button" class="avatar-pick ${n===cur?"sel":""}" data-avatar="${n}" aria-label="Avatar ${n}">
          <img width="44" height="44" src="assets/avatars/a${String(n).padStart(2,"0")}.webp" alt="Avatar ${n}">
        </button>`).join("")}
    </div>`);
  $$("[data-avatar]",ov).forEach(b=> b.addEventListener("click", ()=>{
    const overrides=F.getData("fnatixCustomerAvatars",{});
    overrides[String(name).trim().toLowerCase()]=Number(b.dataset.avatar);
    F.setData("fnatixCustomerAvatars", overrides);
    F.closeModal();
    F.closeModal();
    F.showToast("Avatar customer diperbarui");
    render();
  }));
}
document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    document.body.classList.remove("is-data-loading");
    render();
    window.__refreshPage=render;
    $("#customerSearch").addEventListener("input", e=>{ query=e.target.value.trim().toLowerCase(); render(); });
  }catch(e){
    document.body.classList.remove("is-data-loading");
    const err=$("#custError"); if(err){ err.classList.add("show"); err.textContent="Data customer belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
