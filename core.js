/* Fnatix ID — Gelap Lembut: core bersama.
   Shell: rel ikon ramping di desktop, bilah atas + bilah ikon bawah di HP.
   Data: Supabase app_data lewat window.cloudStorage (key beku), fallback lokal. */
(function(){
"use strict";

/* storage */
const hasCloud = typeof window.cloudStorage !== "undefined";
const memFallback = {};
const store = {
  get(k){
    try{
      if(hasCloud){ const v = window.cloudStorage.getItem(k); return v==null? null : v; }
      const v = localStorage.getItem("lembar:"+k);
      return v==null? (k in memFallback? memFallback[k] : null) : v;
    }catch(e){ return k in memFallback? memFallback[k] : null; }
  },
  set(k,v){
    memFallback[k]=v;
    try{
      if(hasCloud) window.cloudStorage.setItem(k, v);
      else localStorage.setItem("lembar:"+k, v);
    }catch(e){}
  }
};
function getData(key, fallback){
  try{ const raw = store.get(key); if(raw==null) return fallback; const v = JSON.parse(raw); return v==null? fallback : v; }
  catch(e){ return fallback; }
}
function setData(key, value){ store.set(key, JSON.stringify(value)); }
window.dataReady = (window.cloudStorage && window.cloudStorage.ready)? window.cloudStorage.ready : Promise.resolve();
const dataReady = window.dataReady;

/* util */
const $ = (s, r)=> (r||document).querySelector(s);
const $$ = (s, r)=> Array.from((r||document).querySelectorAll(s));
function esc(s){ return String(s==null?"":s).replace(/[&<>"']/g, c=> ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function uid(){ return "id"+Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function icon(name, cls){ return '<i data-lucide="'+name+'" class="'+(cls||"icon")+'"></i>'; }
function refreshIcons(){ if(window.lucide && window.lucide.createIcons) window.lucide.createIcons(); }

/* tanggal */
const MONTHS_ID = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
function pad2(n){ return String(n).padStart(2,"0"); }
function localDateKey(d){
  d = d? new Date(d) : new Date();
  return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
}
function localMonthKey(d){
  d = d? new Date(d) : new Date();
  return d.getFullYear()+"-"+pad2(d.getMonth()+1);
}
function parseKey(key){
  const p = String(key||"").split("-").map(Number);
  return new Date(p[0]||1970, (p[1]||1)-1, p[2]||1);
}
function monthLabel(monthKey){
  if(monthKey instanceof Date) return MONTHS_ID[monthKey.getMonth()]+" "+monthKey.getFullYear();
  const p = String(monthKey||"").split("-");
  const mi = (Number(p[1])||1)-1;
  return (MONTHS_ID[mi]||"")+" "+(p[0]||"");
}
function formatDateValue(iso){
  if(!iso) return "-";
  const d = parseKey(iso);
  if(isNaN(d.getTime())) return String(iso);
  const fmt = getBusinessProfile().dateFormat || "id-long";
  if(fmt==="dd-mm-yyyy") return pad2(d.getDate())+"-"+pad2(d.getMonth()+1)+"-"+d.getFullYear();
  if(fmt==="mm-dd-yyyy") return pad2(d.getMonth()+1)+"-"+pad2(d.getDate())+"-"+d.getFullYear();
  if(fmt==="yyyy-mm-dd") return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());
  return d.getDate()+" "+MONTHS_ID[d.getMonth()]+" "+d.getFullYear();
}

/* profil & uang */
function getBusinessProfile(){
  const p = getData("fnatixBusinessProfile", {}) || {};
  const phone = p.contactPhone || p.phone || "";
  const email = p.contactEmail || p.email || "";
  return {
    businessName: p.businessName || "Fnatix ID",
    phone, contactPhone: phone,
    email, contactEmail: email,
    currency: p.currency || "IDR",
    dateFormat: p.dateFormat || "id-long",
    logo: p.logo || ""
  };
}
function formatCurrencyValue(n){
  const v = Number(n)||0;
  const cur = getBusinessProfile().currency || "IDR";
  if(cur==="IDR") return "Rp"+Math.round(v).toLocaleString("id-ID");
  const sym = {USD:"$", MYR:"RM", SGD:"S$", EUR:"€"}[cur] || (cur+" ");
  return sym+Math.round(v).toLocaleString("id-ID");
}

/* data domain */
/* Normalisasi id: data produksi dari aplikasi lama menyimpan id sebagai
   ANGKA (Date.now()), sedangkan dataset HTML selalu terbaca sebagai
   string. Tanpa penyamaan ini, pencarian t.id === dataset.id gagal
   diam-diam dan tombol aksi baris (struk/edit/duplikat/hapus) mati.
   Semua baca koleksi lewat getter di bawah, jadi normalisasi di sini
   menutup seluruh basis: render menulis id string, lookup membandingkan
   string dengan string. */
function normIds(list){
  if(Array.isArray(list)) list.forEach(r=>{ if(r && r.id != null && typeof r.id !== "string") r.id = String(r.id); });
  return list;
}
function getTransactions(){ const t = getData("fnatixTransactions", []); return Array.isArray(t)? normIds(t) : []; }
function saveTransactions(list){ setData("fnatixTransactions", list); }
const DEFAULT_CATEGORIES = ["Edit Pas Foto","Edit Background","Edit Foto Keluarga","Tambah / Hapus Objek","Retouch","Edit Data","Jasa Desain"];
function getCategories(){
  const c = getData("fnatixCategories", null);
  return Array.isArray(c) && c.length? c.slice() : DEFAULT_CATEGORIES.slice();
}
function getFreelanceOrders(){ const t = getData("fnatixFreelanceOrders", []); return Array.isArray(t)? normIds(t) : []; }
function saveFreelanceOrders(list){ setData("fnatixFreelanceOrders", list); }
function getFreelanceIncome(){ const t = getData("fnatixFreelanceIncome", []); return Array.isArray(t)? normIds(t) : []; }
function saveFreelanceIncome(list){ setData("fnatixFreelanceIncome", list); }
function getFreelanceTarget(){ const v = Number(getData("fnatixFreelanceTarget", 80)); return v>0? v : 80; }
/* Produk digital: buku toko digital, key sendiri, tidak pernah masuk total jasa edit atau freelance. */
const PRODUK_DIGITAL_PRODUCTS = [
  { id:"relight", label:"Relight", price:35000 },
  { id:"graduation", label:"Graduation", price:30000 },
  { id:"wedding", label:"Wedding", price:30000 },
  { id:"bundle", label:"Paket Bundle 3-in-1", price:80000 }
];
function getProdukDigital(){ const t = getData("produkDigital", []); return Array.isArray(t)? normIds(t) : []; }
function saveProdukDigital(list){ setData("produkDigital", list); }
function getAssets(){ const t = getData("fnatixAssets", []); return Array.isArray(t)? normIds(t) : []; }
function saveAssets(list){ setData("fnatixAssets", list); }
function getPricelist(){ const t = getData("fnatixPricelist", []); return Array.isArray(t)? normIds(t) : []; }
function savePricelist(list){ setData("fnatixPricelist", list); }

/* aktivitas / notifikasi */
function getActivityLog(){ const t = getData("fnatixActivityLog", []); return Array.isArray(t)? t : []; }
function logActivity(text, iconName, kind){
  const log = getActivityLog();
  log.unshift({ id: uid(), text: String(text||""), icon: iconName||"activity", kind: kind||"info", at: new Date().toISOString() });
  setData("fnatixActivityLog", log.slice(0,40));
  updateNotifBadge();
}
function activityReadAt(){ return String(getData("fnatixActivityLogReadAt", "") || ""); }
function unreadActivityCount(){
  const readAt = activityReadAt();
  return getActivityLog().filter(e=> !readAt || String(e.at) > readAt).length;
}
function relTime(iso){
  const t = new Date(iso).getTime(); if(isNaN(t)) return "";
  const diff = Date.now()-t;
  const m = Math.floor(diff/60000);
  if(m < 1) return "baru saja";
  if(m < 60) return m+" mnt lalu";
  const h = Math.floor(m/60);
  if(h < 24) return h+" jam lalu";
  const d = Math.floor(h/24);
  if(d < 7) return d+" hari lalu";
  return formatDateValue(localDateKey(new Date(iso)));
}

/* customer */
function normalizePhoneCustomer(phone){
  let p = String(phone||"").replace(/[^0-9]/g,"");
  if(!p) return "";
  if(p.startsWith("0")) p = "62"+p.slice(1);
  else if(p.startsWith("8")) p = "62"+p;
  return p;
}
function fnv1a(str){
  let h = 0x811c9dc5;
  for(let i=0;i<str.length;i++){ h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
function customerAvatarNumber(name){
  const key = String(name||"").trim().toLowerCase();
  const overrides = getData("fnatixCustomerAvatars", {}) || {};
  const o = Number(overrides[key]);
  if(o>=1 && o<=16) return o;
  return (fnv1a(key) % 16) + 1;
}
function avatarSrc(name){
  return "assets/avatars/a"+pad2(customerAvatarNumber(name))+".webp";
}
function buildCustomers(){
  const map = new Map();
  getTransactions().forEach(t=>{
    const name = String(t.name||"").trim();
    if(!name) return;
    const key = name.toLowerCase();
    if(!map.has(key)) map.set(key, { name, phone: t.phone||"", orders: 0, total: 0, lastDate: "" });
    const c = map.get(key);
    c.orders += 1;
    c.total += Number(t.price)||0;
    if(t.phone && !c.phone) c.phone = t.phone;
    if(String(t.date||"") > c.lastDate) c.lastDate = String(t.date||"");
  });
  return Array.from(map.values()).sort((a,b)=> b.total - a.total);
}
function computeCustomerMilestoneStats(c){
  return { isRepeat: (c && c.orders >= 2), orders: c? c.orders : 0, total: c? c.total : 0 };
}

/* toast & modal */
function showToast(msg, kind){
  let zone = $(".toast-zone");
  if(!zone){ zone = document.createElement("div"); zone.className = "toast-zone"; document.body.appendChild(zone); }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = String(msg||"");
  if(kind==="error") el.style.background = "var(--danger)";
  zone.appendChild(el);
  setTimeout(()=>{ el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(()=> el.remove(), 320); }, 2600);
}
const modalStack = [];
function openModal(html){
  const ov = document.createElement("div");
  ov.className = "modal-overlay";
  ov.innerHTML = '<div class="modal" role="dialog" aria-modal="true">'+html+"</div>";
  ov.addEventListener("click", e=>{ if(e.target === ov) closeModal(ov); });
  document.body.appendChild(ov);
  modalStack.push(ov);
  document.body.style.overflow = "hidden";
  refreshIcons();
  return ov;
}
function closeModal(ov){
  const target = ov || modalStack[modalStack.length-1];
  if(target){
    if(typeof target._confirmSettle === "function") target._confirmSettle(false);
    const i = modalStack.indexOf(target);
    if(i >= 0) modalStack.splice(i, 1);
    target.remove();
  }
  if(!modalStack.length) document.body.style.overflow = "";
}
function modalHead(title, sub){
  return '<div class="modal-head"><div><h2>'+esc(title)+"</h2>"+(sub? '<p class="sub">'+esc(sub)+"</p>" : "")+
    '</div><button type="button" class="icon-btn" data-close-modal aria-label="Tutup">'+icon("x")+"</button></div>";
}
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-close-modal]");
  if(b){ const ov = b.closest(".modal-overlay"); if(ov) closeModal(ov); }
});
document.addEventListener("keydown", e=>{
  if(e.key === "Escape") closeModal();
});
function showActionConfirm(opts){
  const o = opts || {};
  let settled = false, resolveFn = null;
  const promise = new Promise(r=>{ resolveFn = r; });
  const ov = openModal(
    modalHead(o.title || "Konfirmasi") +
    '<p class="muted" style="font-size:14px; line-height:1.55">'+esc(o.message || "")+"</p>"+
    '<div class="modal-actions">'+
      '<button type="button" class="btn btn-secondary" id="acCancel">Batal</button>'+
      '<button type="button" class="btn '+(o.danger === false? "btn-primary" : "btn-danger-solid")+'" id="acOk">'+esc(o.confirmLabel || "Ya, Lanjutkan")+"</button>"+
    "</div>");
  ov._confirmSettle = val=>{ if(settled) return; settled = true; if(resolveFn) resolveFn(val); };
  $("#acCancel", ov).addEventListener("click", ()=>{ ov._confirmSettle(false); closeModal(ov); });
  $("#acOk", ov).addEventListener("click", ()=>{ ov._confirmSettle(true); closeModal(ov); if(typeof o.onConfirm === "function") o.onConfirm(); });
  return promise;
}

/* baris pesanan */
function txActionsHTML(id){
  return '<span class="row-actions">'+
    '<button type="button" class="icon-btn" data-act="receipt" data-id="'+esc(id)+'" title="Struk" aria-label="Struk">'+icon("receipt-text","icon-sm")+"</button>"+
    '<button type="button" class="icon-btn" data-act="edit" data-id="'+esc(id)+'" title="Edit" aria-label="Edit">'+icon("pencil","icon-sm")+"</button>"+
    '<button type="button" class="icon-btn" data-act="dup" data-id="'+esc(id)+'" title="Duplikat" aria-label="Duplikat">'+icon("copy","icon-sm")+"</button>"+
    '<button type="button" class="icon-btn danger" data-act="del" data-id="'+esc(id)+'" title="Hapus" aria-label="Hapus">'+icon("trash-2","icon-sm")+"</button>"+
  "</span>";
}
function txTableRowHTML(tx){
  return '<tr>'+
    '<td class="c-date">'+esc(formatDateValue(tx.date))+"</td>"+
    '<td class="c-cust"><span class="cust-flex"><img class="avatar" src="'+avatarSrc(tx.name)+'" alt="">'+esc(tx.name)+"</span></td>"+
    '<td class="c-cat">'+esc(tx.category||"")+"</td>"+
    '<td class="c-status"><span class="stamp">Lunas</span></td>'+
    '<td class="c-amt r">'+esc(formatCurrencyValue(tx.price))+"</td>"+
    '<td class="c-act">'+txActionsHTML(tx.id)+"</td>"+
  "</tr>";
}
function txRowHTML(tx){
  return '<div class="lrow">'+
    '<img class="avatar" src="'+avatarSrc(tx.name)+'" alt="">'+
    '<div class="grow"><div class="title">'+esc(tx.name)+'</div>'+
    '<div class="sub">'+esc(tx.category||"")+", "+esc(formatDateValue(tx.date))+"</div></div>"+
    '<span class="stamp">Lunas</span>'+
    '<span class="amount">'+esc(formatCurrencyValue(tx.price))+"</span>"+
    txActionsHTML(tx.id)+
  "</div>";
}
function refreshPage(){ if(typeof window.__refreshPage === "function") window.__refreshPage(); }
function bindTxActions(container){
  if(!container || container.dataset.txBound) return;
  container.dataset.txBound = "1";
  container.addEventListener("click", e=>{
    const b = e.target.closest("[data-act]");
    if(!b) return;
    const tx = getTransactions().find(t=> t.id === b.dataset.id);
    if(!tx) return;
    const act = b.dataset.act;
    if(act === "receipt") openReceiptModal(tx);
    else if(act === "edit") openOrderModal(tx, refreshPage);
    else if(act === "dup"){
      const list = getTransactions();
      list.unshift(Object.assign({}, tx, { id: uid() }));
      saveTransactions(list);
      logActivity("Pesanan "+tx.name+" diduplikat", "copy", "order");
      showToast("Pesanan diduplikat");
      refreshPage();
    }
    else if(act === "del"){
      showActionConfirm({
        title: "Hapus Pesanan",
        message: "Hapus pesanan "+tx.name+" ("+(tx.category||"")+") senilai "+formatCurrencyValue(tx.price)+"? Tindakan ini tidak bisa dibatalkan.",
        confirmLabel: "Hapus",
        onConfirm(){
          saveTransactions(getTransactions().filter(t=> t.id !== tx.id));
          logActivity("Pesanan "+tx.name+" dihapus", "trash-2", "order");
          showToast("Pesanan dihapus");
          refreshPage();
        }
      });
    }
  });
}

/* modal pesanan */
function customerSuggestions(){
  return buildCustomers().map(c=> c.name);
}
function openOrderModal(existing, onSaved){
  const isEdit = !!(existing && existing.id);
  const tx = existing || { name:"", phone:"", category: getCategories()[0], price:"", date: localDateKey() };
  const cats = getCategories();
  if(tx.category && !cats.includes(tx.category)) cats.unshift(tx.category);
  const ov = openModal(
    modalHead(isEdit? "Edit Pesanan" : "Tambah Pesanan", isEdit? "Perubahan langsung tersimpan ke data pesanan." : "Satu pesanan tercatat sebagai satu baris kas.")+
    '<form id="orderForm">'+
      '<div class="field"><label for="ordName">Nama Customer</label>'+
        '<input class="control" id="ordName" list="customerNameSuggestions" autocomplete="off" placeholder="Nama customer" value="'+esc(tx.name||"")+'">'+
        '<datalist id="customerNameSuggestions">'+customerSuggestions().map(n=> '<option value="'+esc(n)+'">').join("")+"</datalist></div>"+
      '<div class="grid-2">'+
        '<div class="field"><label for="ordPhone">Nomor WhatsApp</label><input class="control" id="ordPhone" inputmode="tel" placeholder="08xxxxxxxxxx" value="'+esc(tx.phone||"")+'"></div>'+
        '<div class="field"><label for="ordCategory">Layanan</label><select class="control" id="ordCategory">'+
          cats.map(c=> '<option value="'+esc(c)+'"'+(c===tx.category?" selected":"")+">"+esc(c)+"</option>").join("")+"</select></div>"+
      "</div>"+
      '<div class="grid-2">'+
        '<div class="field"><label for="ordPrice">Harga (Rp)</label><input class="control num" id="ordPrice" type="number" min="0" step="500" placeholder="50000" value="'+esc(tx.price==null?"":tx.price)+'"></div>'+
        '<div class="field"><label for="ordDate">Tanggal</label><input class="control" id="ordDate" type="date" value="'+esc(tx.date||localDateKey())+'"></div>'+
      "</div>"+
      (isEdit? "" : '<div class="field"><label for="ordQty">Jumlah Pesanan</label><input class="control num" id="ordQty" type="number" min="1" max="20" value="1"><p class="hint">Jumlah di atas 1 membuat beberapa baris pesanan terpisah dengan data yang sama.</p></div>')+
      '<p class="error-text" id="ordFormError"></p>'+
      '<div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Batal</button>'+
      '<button type="submit" class="btn btn-primary">'+(isEdit? "Simpan Perubahan" : "Tambah Pesanan")+"</button></div>"+
    "</form>");
  $("#orderForm", ov).addEventListener("submit", e=>{
    e.preventDefault();
    const name = $("#ordName", ov).value.trim();
    const phone = $("#ordPhone", ov).value.trim();
    const category = $("#ordCategory", ov).value;
    const price = Number($("#ordPrice", ov).value);
    const date = $("#ordDate", ov).value || localDateKey();
    const err = $("#ordFormError", ov);
    if(!name){ err.textContent = "Nama customer wajib diisi."; return; }
    if(!category){ err.textContent = "Layanan wajib dipilih."; return; }
    if(!(price >= 0) || $("#ordPrice", ov).value === ""){ err.textContent = "Harga wajib diisi dengan angka yang valid."; return; }
    const list = getTransactions();
    if(isEdit){
      const i = list.findIndex(t=> t.id === existing.id);
      if(i >= 0) list[i] = Object.assign({}, list[i], { name, phone, category, price, date });
      saveTransactions(list);
      logActivity("Pesanan "+name+" diubah", "pencil", "order");
      showToast("Pesanan diperbarui");
    } else {
      let qty = parseInt($("#ordQty", ov).value, 10);
      if(!(qty >= 1)) qty = 1; if(qty > 20) qty = 20;
      for(let i=0;i<qty;i++) list.unshift({ id: uid(), name, phone, category, price, date });
      saveTransactions(list);
      logActivity(qty > 1? qty+" pesanan baru dari "+name : "Pesanan baru dari "+name, "plus-circle", "order");
      showToast(qty > 1? qty+" pesanan ditambahkan" : "Pesanan ditambahkan");
    }
    closeModal(ov);
    if(typeof onSaved === "function") onSaved(); else refreshPage();
  });
  setTimeout(()=>{ const f = $("#ordName", ov); if(f) f.focus(); }, 30);
  return ov;
}

/* struk */
function receiptHTML(tx){
  const p = getBusinessProfile();
  return '<div class="receipt-paper" id="receiptPaper">'+
    '<div class="r-head"><img src="'+esc(p.logo || "logo.png")+'" alt="">'+
      '<div class="r-biz">'+esc(p.businessName)+"</div>"+
      '<div class="r-sub">Struk Pembayaran'+(p.phone? " , "+esc(p.phone) : "")+"</div></div>"+
    '<div class="receipt-row"><span class="k">Customer</span><span class="v">'+esc(tx.name||"-")+"</span></div>"+
    (tx.phone? '<div class="receipt-row"><span class="k">WhatsApp</span><span class="v">'+esc(tx.phone)+"</span></div>" : "")+
    '<div class="receipt-row"><span class="k">Layanan</span><span class="v">'+esc(tx.category||"-")+"</span></div>"+
    '<div class="receipt-row"><span class="k">Tanggal</span><span class="v">'+esc(formatDateValue(tx.date))+"</span></div>"+
    '<div class="receipt-row receipt-total"><span class="k">Total Bayar</span><span class="v amt">'+esc(formatCurrencyValue(tx.price))+"</span></div>"+
    '<div class="r-foot">Terima kasih sudah order di '+esc(p.businessName)+".</div>"+
  "</div>";
}
function receiptText(tx){
  const p = getBusinessProfile();
  return "Struk "+p.businessName+"\nCustomer: "+(tx.name||"-")+"\nLayanan: "+(tx.category||"-")+"\nTanggal: "+formatDateValue(tx.date)+"\nTotal: "+formatCurrencyValue(tx.price)+"\nTerima kasih sudah order.";
}
function openReceiptModal(tx){
  const ov = openModal(
    modalHead("Struk Pesanan", "Bagikan struk ke customer lewat WhatsApp.")+
    receiptHTML(tx)+
    '<div class="modal-actions">'+
      '<button type="button" class="btn btn-secondary" id="rcCopy">'+icon("copy","icon-sm")+" Salin Teks</button>"+
      '<button type="button" class="btn btn-secondary" id="rcPrint">'+icon("printer","icon-sm")+" Cetak</button>"+
      '<button type="button" class="btn btn-primary" id="rcWa">'+icon("send","icon-sm")+" Kirim WhatsApp</button>"+
    "</div>");
  refreshIcons();
  $("#rcCopy", ov).addEventListener("click", async ()=>{
    try{ await navigator.clipboard.writeText(receiptText(tx)); showToast("Teks struk disalin"); }
    catch(e){ showToast("Gagal menyalin teks struk", "error"); }
  });
  $("#rcPrint", ov).addEventListener("click", ()=>{
    const w = window.open("", "_blank", "width=420,height=640");
    if(!w){ showToast("Popup cetak diblokir browser", "error"); return; }
    w.document.write('<html><head><title>Struk '+esc(getBusinessProfile().businessName)+'</title><style>body{font-family:sans-serif;padding:16px}.receipt-paper{border:1px solid #ccc;border-radius:12px;padding:20px}.r-head{text-align:center;border-bottom:1.5px dashed #bbb;padding-bottom:12px;margin-bottom:10px}.r-head img{width:52px;height:52px}.r-biz{font-weight:700;font-size:16px}.r-sub{color:#666;font-size:12px}.receipt-row{display:flex;justify-content:space-between;padding:5px 0}.receipt-row .k{color:#666}.receipt-row .v{font-weight:600}.receipt-total{border-top:1.5px dashed #bbb;margin-top:8px;padding-top:10px}.r-foot{text-align:center;color:#666;font-size:12px;margin-top:12px}</style></head><body>'+receiptHTML(tx)+"<script>window.onload=function(){window.print()}<\/script></body></html>");
    w.document.close();
  });
  $("#rcWa", ov).addEventListener("click", async ()=>{
    const wa = normalizePhoneCustomer(tx.phone);
    const text = encodeURIComponent(receiptText(tx));
    const paper = $("#receiptPaper", ov);
    let shared = false;
    if(window.html2canvas && paper && navigator.share){
      try{
        const canvas = await window.html2canvas(paper, { backgroundColor: "#ffffff", scale: 2 });
        const blob = await new Promise(r=> canvas.toBlob(r, "image/png"));
        if(blob){
          const file = new File([blob], "struk-"+String(tx.name||"customer").replace(/\s+/g,"-")+".png", { type: "image/png" });
          if(navigator.canShare && navigator.canShare({ files: [file] })){
            await navigator.share({ files: [file], title: "Struk "+getBusinessProfile().businessName });
            shared = true;
          } else {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
            setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
          }
        }
      }catch(e){ /* lanjut ke tautan wa.me */ }
    }
    if(!shared) window.open("https://wa.me/"+(wa||"")+"?text="+text, "_blank");
  });
  return ov;
}

/* kelola kategori */
function openCategoryManager(onChange){
  function draw(ov){
    const cats = getCategories();
    const txs = getTransactions();
    const list = $("#catList", ov);
    list.innerHTML = cats.map(c=>{
      const n = txs.filter(t=> t.category === c).length;
      return '<div class="lrow"><div class="grow"><div class="title">'+esc(c)+'</div><div class="sub">'+n+" pesanan memakai kategori ini</div></div>"+
        '<button type="button" class="icon-btn danger" data-cat-del="'+esc(c)+'" aria-label="Hapus kategori '+esc(c)+'">'+icon("trash-2","icon-sm")+"</button></div>";
    }).join("") || '<p class="muted small">Belum ada kategori.</p>';
    refreshIcons();
    $$("[data-cat-del]", list).forEach(b=> b.addEventListener("click", ()=>{
      const cat = b.dataset.catDel;
      const used = getTransactions().some(t=> t.category === cat);
      showActionConfirm({
        title: "Hapus Kategori",
        message: used? "Kategori "+cat+" masih dipakai pesanan yang ada. Pesanan lama tidak berubah, kategori hanya hilang dari pilihan." : "Hapus kategori "+cat+" dari daftar pilihan?",
        confirmLabel: "Hapus",
        onConfirm(){
          setData("fnatixCategories", getCategories().filter(c=> c !== cat));
          logActivity("Kategori "+cat+" dihapus", "tag", "order");
          showToast("Kategori dihapus");
          draw(ov);
          if(typeof onChange === "function") onChange(); else refreshPage();
        }
      });
    }));
  }
  const ov = openModal(
    modalHead("Kelola Kategori", "Kategori dipakai pada formulir pesanan dan pricelist.")+
    '<div id="catList"></div>'+
    '<form id="catAddForm" style="margin-top:16px"><div class="field" style="margin-bottom:10px"><label for="catNew">Kategori Baru</label>'+
    '<input class="control" id="catNew" placeholder="Nama kategori" autocomplete="off"></div>'+
    '<div class="modal-actions" style="margin-top:0"><button type="submit" class="btn btn-primary">Tambah Kategori</button></div></form>');
  draw(ov);
  $("#catAddForm", ov).addEventListener("submit", e=>{
    e.preventDefault();
    const v = $("#catNew", ov).value.trim();
    if(!v) return;
    const cats = getCategories();
    if(cats.some(c=> c.toLowerCase() === v.toLowerCase())){ showToast("Kategori itu sudah ada", "error"); return; }
    cats.push(v);
    setData("fnatixCategories", cats);
    logActivity("Kategori "+v+" ditambahkan", "tag", "order");
    showToast("Kategori ditambahkan");
    draw(ov);
    if(typeof onChange === "function") onChange(); else refreshPage();
  });
  return ov;
}

/* pencarian global */
const NAV = [
  { id:"dashboard", label:"Dashboard", href:"index.html", icon:"layout-dashboard" },
  { id:"pesanan", label:"Pesanan", href:"pesanan.html", icon:"receipt-text" },
  { id:"customers", label:"Customers", href:"customers.html", icon:"users" },
  { id:"laporan", label:"Laporan", href:"laporan.html", icon:"chart-no-axes-combined" },
  { id:"freelance", label:"Freelance", href:"freelance.html", icon:"briefcase-business" },
  { id:"produk", label:"Produk Digital", href:"produk-digital.html", icon:"shopping-bag" },
  { id:"aset", label:"Aset & Pricelist", href:"aset.html", icon:"folder-open" },
  { id:"settings", label:"Pengaturan", href:"settings.html", icon:"settings" }
];
function openGlobalSearch(){
  const ov = openModal(
    '<div class="search-input-row">'+icon("search")+'<input id="gsInput" type="text" placeholder="Cari halaman, customer, pesanan, kategori" autocomplete="off">'+
    '<button type="button" class="icon-btn" data-close-modal aria-label="Tutup">'+icon("x")+"</button></div>"+
    '<div id="gsResults"></div>');
  const input = $("#gsInput", ov), box = $("#gsResults", ov);
  function draw(){
    const q = input.value.trim().toLowerCase();
    if(!q){ box.innerHTML = '<div class="empty"><p>Ketik untuk mencari di seluruh data Fnatix ID.</p></div>'; return; }
    const pages = NAV.filter(n=> n.label.toLowerCase().includes(q));
    const custs = buildCustomers().filter(c=> c.name.toLowerCase().includes(q)).slice(0,5);
    const txs = getTransactions().filter(t=> String(t.name||"").toLowerCase().includes(q) || String(t.category||"").toLowerCase().includes(q)).slice(0,6);
    const cats = getCategories().filter(c=> c.toLowerCase().includes(q));
    let html = "";
    if(pages.length) html += '<div class="search-group-label">Halaman</div>'+pages.map(n=> '<button type="button" class="search-hit" data-go="'+n.href+'">'+icon(n.icon)+'<span class="grow"><span class="title">'+esc(n.label)+'</span></span></button>').join("");
    if(custs.length) html += '<div class="search-group-label">Customer</div>'+custs.map(c=> '<button type="button" class="search-hit" data-go="customers.html"><img class="avatar" src="'+avatarSrc(c.name)+'" alt=""><span class="grow"><span class="title">'+esc(c.name)+'</span><span class="sub" style="display:block">'+c.orders+" pesanan, "+esc(formatCurrencyValue(c.total))+"</span></span></button>").join("");
    if(txs.length) html += '<div class="search-group-label">Pesanan</div>'+txs.map(t=> '<button type="button" class="search-hit" data-go="pesanan.html">'+icon("receipt-text")+'<span class="grow"><span class="title">'+esc(t.name)+'</span><span class="sub" style="display:block">'+esc(t.category||"")+", "+esc(formatDateValue(t.date))+'</span></span><span class="num" style="font-weight:600">'+esc(formatCurrencyValue(t.price))+"</span></button>").join("");
    if(cats.length) html += '<div class="search-group-label">Kategori</div>'+cats.map(c=> '<button type="button" class="search-hit" data-go="pesanan.html">'+icon("tag")+'<span class="grow"><span class="title">'+esc(c)+"</span></span></button>").join("");
    box.innerHTML = html || '<div class="empty"><p>Tidak ada hasil untuk pencarian ini.</p></div>';
    refreshIcons();
    $$("[data-go]", box).forEach(b=> b.addEventListener("click", ()=>{ location.href = b.dataset.go; }));
  }
  input.addEventListener("input", draw);
  draw();
  setTimeout(()=> input.focus(), 30);
  return ov;
}

/* tema & branding */
function currentTheme(){ return document.documentElement.getAttribute("data-theme") || "light"; }
function applyTheme(t){
  document.documentElement.setAttribute("data-theme", t);
  try{ localStorage.setItem("fnatixTheme", t); }catch(e){}
  $$("[data-theme-toggle]").forEach(b=>{ b.innerHTML = icon(t === "dark"? "sun" : "moon"); });
  refreshIcons();
  if(typeof window.__onThemeChange === "function") window.__onThemeChange();
}
function applyBusinessBranding(){
  const p = getBusinessProfile();
  $$(".brand-name").forEach(el=>{ el.textContent = p.businessName; });
  $$(".brand-logo").forEach(el=>{ el.src = p.logo || "logo-glyph.png"; });
}

/* notifikasi */
function updateNotifBadge(){
  const badge = $("#notifBadge");
  if(!badge) return;
  const n = unreadActivityCount();
  badge.textContent = n > 99? "99+" : String(n);
  badge.classList.toggle("hidden", n === 0);
}
function renderNotifPop(pop){
  const log = getActivityLog();
  pop.innerHTML = '<div class="pop-head"><b>Notifikasi</b>'+
    '<button type="button" class="btn btn-ghost btn-sm" id="notifReadBtn">Tandai dibaca</button></div>'+
    (log.length? log.map(e=> '<div class="notif-item"><span class="n-ic">'+icon(e.icon || "activity", "icon-sm")+'</span><p>'+esc(e.text)+'<span class="when">'+esc(relTime(e.at))+"</span></p></div>").join("")
      : '<div class="notif-empty">Belum ada aktivitas tercatat.</div>');
  refreshIcons();
  const rb = $("#notifReadBtn", pop);
  if(rb) rb.addEventListener("click", ()=>{
    setData("fnatixActivityLogReadAt", new Date().toISOString());
    updateNotifBadge();
    renderNotifPop(pop);
  });
}

/* indikator geser navigasi liquid: sorotan meluncur ke item aktif,
   mulai dari posisi halaman sebelumnya (sessionStorage) bila ada */
function placeNavInd(ind, link, axis){
  if(!ind || !link){ if(ind) ind.classList.remove("on"); return; }
  if(axis === "y"){
    ind.style.height = link.offsetHeight+"px";
    ind.style.transform = "translateY("+link.offsetTop+"px)";
  } else {
    ind.style.width = link.offsetWidth+"px";
    ind.style.transform = "translateX("+link.offsetLeft+"px)";
  }
  ind.classList.add("on");
}
function initNavIndicators(){
  const navs = [
    { ind: $(".bb-ind"), links: $$(".bb-link"), axis: "x" },
    { ind: $(".rail-ind"), links: $$(".rail-link"), axis: "y" }
  ];
  let prevHref = null;
  try{ prevHref = sessionStorage.getItem("fnatixNavHref"); }catch(e){}
  navs.forEach(nv=>{
    if(!nv.ind || !nv.links.length) return;
    const ai = nv.links.findIndex(a=> a.classList.contains("active"));
    if(ai < 0){ nv.ind.classList.remove("on"); return; }
    nv.activeLink = nv.links[ai];
    const pi = prevHref? nv.links.findIndex(a=> a.getAttribute("href") === prevHref) : -1;
    if(pi >= 0 && pi !== ai){
      nv.ind.classList.add("no-anim");
      placeNavInd(nv.ind, nv.links[pi], nv.axis);
      void nv.ind.offsetWidth;
      nv.ind.classList.remove("no-anim");
      requestAnimationFrame(()=> placeNavInd(nv.ind, nv.links[ai], nv.axis));
    } else {
      placeNavInd(nv.ind, nv.links[ai], nv.axis);
    }
  });
  const activeLink = $(".bb-link.active") || $(".rail-link.active");
  if(activeLink){ try{ sessionStorage.setItem("fnatixNavHref", activeLink.getAttribute("href")); }catch(e){} }
  if(!window.__navIndBound){
    window.__navIndBound = true;
    const reposition = ()=> navs.forEach(nv=>{
      if(nv.ind && nv.activeLink){
        nv.ind.classList.add("no-anim");
        placeNavInd(nv.ind, nv.activeLink, nv.axis);
        nv.ind.classList.remove("no-anim");
      }
    });
    window.addEventListener("resize", reposition);
    window.addEventListener("load", reposition);
  }
}

/* shell: rel ikon ramping + bilah HP */
function buildShell(){
  const host = $("#shell");
  if(!host) return;
  const page = document.body.dataset.page || "dashboard";
  const p = getBusinessProfile();
  const now = new Date();
  const weekdayText = now.toLocaleDateString("id-ID", { weekday:"long" });
  const dayText = String(now.getDate());
  const monthText = MONTHS_ID[now.getMonth()];
  const yearText = String(now.getFullYear());
  const dateText = weekdayText+", "+dayText+" "+monthText+" "+yearText;
  const navLinks = NAV.map(n=> ({ id:n.id, label:n.label, href:n.href, icon:n.icon }));
  navLinks.push({ id:"sistem", label:"Sistem", href:"sistem-fnatix.html", icon:"waypoints" });
  const railHTML =
    '<aside class="rail">'+
      '<a class="rail-brand" href="index.html" aria-label="'+esc(p.businessName)+'"><img class="brand-logo" src="'+esc(p.logo || "logo-glyph.png")+'" alt="Logo '+esc(p.businessName)+'"></a>'+
      '<nav class="rail-nav" aria-label="Navigasi halaman">'+
        '<span class="rail-ind" aria-hidden="true"></span>'+
        navLinks.map(n=> '<a class="rail-link'+(n.id === page? " active" : "")+'" href="'+n.href+'" title="'+esc(n.label)+'" aria-label="'+esc(n.label)+'"'+(n.id === page? ' aria-current="page"' : "")+">"+icon(n.icon)+"</a>").join("")+
      "</nav>"+
    "</aside>";
  const dockHTML =
    '<div class="dock">'+
      '<div class="dock-item"><button type="button" class="icon-btn" id="notifBtn" aria-label="Notifikasi">'+icon("bell")+'<span class="badge hidden" id="notifBadge">0</span></button>'+
      '<div class="pop notif-pop hidden" id="notifPop"></div></div>'+
      '<div class="dock-item"><button type="button" class="icon-btn" data-theme-toggle aria-label="Ganti tema"></button></div>'+
      '<div class="dock-item profile-wrap">'+
        '<button type="button" class="icon-btn" id="profileBtn" aria-label="Menu profil">'+icon("circle-user-round")+"</button>"+
        '<div class="pop hidden" id="profilePop">'+
          '<a class="pop-item" href="settings.html">'+icon("settings","icon-sm")+" Pengaturan</a>"+
          '<button type="button" class="pop-item danger" id="logoutBtn">'+icon("log-out","icon-sm")+" Keluar</button>"+
        "</div>"+
      "</div>"+
    "</div>";
  const topbarHTML =
    '<header class="topbar">'+
      '<a class="top-brand" href="index.html"><img class="brand-logo" src="'+esc(p.logo || "logo-glyph.png")+'" alt="Logo '+esc(p.businessName)+'"><span class="brand-stack"><span class="brand-name">'+esc(p.businessName)+'</span><span class="top-date top-date-inline">'+esc(dateText)+"</span></span></a>"+
      '<div class="top-date-block"><span class="top-weekday">'+esc(weekdayText)+'</span>'+
      '<span class="top-date"><span class="td-day num">'+esc(dayText)+' </span><em class="td-month">'+esc(monthText)+'</em><span class="td-year num"> '+esc(yearText)+"</span></span></div>"+
      '<button type="button" class="top-search" data-global-search aria-label="Buka pencarian global (Ctrl+K)">'+icon("search")+'<span class="top-search-label">Cari customer, pesanan, kategori</span><kbd>Ctrl K</kbd></button>'+
    "</header>";
  const bottomHTML =
    '<nav class="bottombar" aria-label="Navigasi halaman">'+
      '<span class="bb-ind" aria-hidden="true"></span>'+
      navLinks.map(n=> '<a class="bb-link'+(n.id === page? " active" : "")+'" href="'+n.href+'" title="'+esc(n.label)+'" aria-label="'+esc(n.label)+'"'+(n.id === page? ' aria-current="page"' : "")+">"+icon(n.icon)+"</a>").join("")+
    "</nav>";
  const main = document.querySelector("main.sheet-main");
  if(main){
    const wrap = document.createElement("div");
    wrap.className = "app";
    wrap.innerHTML = railHTML + dockHTML;
    const content = document.createElement("div");
    content.className = "content";
    const tb = document.createElement("div");
    tb.innerHTML = topbarHTML;
    content.appendChild(tb.firstElementChild);
    content.appendChild(main);
    const foot = document.createElement("footer");
    foot.className = "sheet-foot";
    foot.innerHTML = "<span>"+esc(p.businessName)+" · Dasbor Kas</span><span>Data Fnatix ID dan Freelance selalu terpisah.</span>";
    content.appendChild(foot);
    wrap.appendChild(content);
    const bb = document.createElement("div");
    bb.innerHTML = bottomHTML;
    wrap.appendChild(bb.firstElementChild);
    host.replaceWith(wrap);
  }
  $$("[data-theme-toggle]").forEach(b=> b.addEventListener("click", ()=> applyTheme(currentTheme() === "dark"? "light" : "dark")));
  $$("[data-global-search]").forEach(b=> b.addEventListener("click", ()=> openGlobalSearch()));
  applyTheme(currentTheme());
  applyBusinessBranding();
  updateNotifBadge();
  const activeTab = $(".rail-link.active");
  if(activeTab && activeTab.scrollIntoView) activeTab.scrollIntoView({ block:"nearest", inline:"center" });
  const notifBtn = $("#notifBtn"), notifPop = $("#notifPop");
  const profileBtn = $("#profileBtn"), profilePop = $("#profilePop");
  function closePops(except){
    [notifPop, profilePop].forEach(pp=>{ if(pp && pp !== except) pp.classList.add("hidden"); });
  }
  if(notifBtn) notifBtn.addEventListener("click", e=>{
    e.stopPropagation();
    const willOpen = notifPop.classList.contains("hidden");
    closePops(notifPop);
    if(willOpen){ renderNotifPop(notifPop); notifPop.classList.remove("hidden"); }
    else notifPop.classList.add("hidden");
  });
  if(profileBtn) profileBtn.addEventListener("click", e=>{
    e.stopPropagation();
    const willOpen = profilePop.classList.contains("hidden");
    closePops(profilePop);
    profilePop.classList.toggle("hidden", !willOpen);
  });
  document.addEventListener("click", e=>{
    if(notifPop && !notifPop.contains(e.target)) notifPop.classList.add("hidden");
    if(profilePop && !profilePop.contains(e.target)) profilePop.classList.add("hidden");
  });
  const logout = $("#logoutBtn");
  if(logout) logout.addEventListener("click", ()=>{
    try{ localStorage.removeItem("fnatixAuthed"); }catch(e){}
    location.href = "index.html";
  });
  document.addEventListener("keydown", e=>{
    if((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "k"){ e.preventDefault(); openGlobalSearch(); }
  });
  refreshIcons();
  initNavIndicators();
}

/* splash (dashboard saja) */
function initSplash(){
  const sp = $("#splash");
  if(!sp) return;
  let seen = false;
  try{ seen = sessionStorage.getItem("fnatixSplashSeen") === "1"; }catch(e){}
  if(seen){ sp.remove(); return; }
  setTimeout(()=>{
    sp.classList.add("hide");
    try{ sessionStorage.setItem("fnatixSplashSeen", "1"); }catch(e){}
    setTimeout(()=> sp.remove(), 450);
  }, 2000);
}

document.addEventListener("DOMContentLoaded", ()=>{
  buildShell();
  initSplash();
});

/* ekspor */
window.F = {
  $, $$, esc, uid, icon, refreshIcons, dataReady,
  getData, setData,
  localDateKey, localMonthKey, parseKey, MONTHS_ID, MONTHS_SHORT, monthLabel, formatDateValue,
  getBusinessProfile, formatCurrencyValue, formatRupiah: formatCurrencyValue,
  getTransactions, saveTransactions, getCategories,
  getFreelanceOrders, saveFreelanceOrders, getFreelanceIncome, saveFreelanceIncome, getFreelanceTarget,
  getProdukDigital, saveProdukDigital, PRODUK_DIGITAL_PRODUCTS,
  getAssets, saveAssets, getPricelist, savePricelist,
  logActivity, unreadActivityCount,
  normalizePhoneCustomer, customerAvatarNumber, avatarSrc, buildCustomers, computeCustomerMilestoneStats,
  showToast, openModal, closeModal, modalHead, showActionConfirm,
  txTableRowHTML, txRowHTML, bindTxActions, openOrderModal, openReceiptModal, openCategoryManager,
  openGlobalSearch, applyTheme, applyBusinessBranding, NAV
};
})();
