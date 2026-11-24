/* Freelance: target bulanan, donat admin, pesanan, quick pricing batch, dan rekap gajian. */
(function(){
"use strict";
const F=window.F, $=F.$, $$=F.$$;
const ADMIN_LIST=["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","SM"];
const ADMIN_COLOR_PALETTE=["#D6FF3F","#34D399","#38BDF8","#A3E635","#10B981","#0EA5E9","#BEF264","#6EE7B7","#7DD3FC","#65A30D","#059669","#0284C7","#4D7C0F","#047857","#0369A1","#84CC16","#2DD4BF","#869083"];
const FREELANCE_GROUP_VISIBLE_LIMIT=5;
const BATCH_PRICING_STEP=5000, BATCH_PRICING_MIN=10000, BATCH_PRICING_MAX=100000;
const FREELANCE_CUT_PERCENT=40, FREELANCE_CUT_PERCENT_BELOW_TARGET=50;
const EDIT_TYPE_ROTATION=["Edit Pas Foto","Ganti Background","Hapus Objek","Retouch","Edit Foto Keluarga","Edit Background"];
let chart=null;
let expandedGroups=new Set();
let incomeEditId=null;

function adminColor(a){ const i=ADMIN_LIST.indexOf(a); return ADMIN_COLOR_PALETTE[i>=0?i:0]; }
function monthOf(o){ return String(o.date||"").slice(0,7); }
function getFreelanceCutInfo(monthKey){
  const files=F.getFreelanceOrders().filter(o=> monthOf(o)===monthKey).length;
  const target=F.getFreelanceTarget();
  const below=files<target;
  return { files, target, below, percent: below? FREELANCE_CUT_PERCENT_BELOW_TARGET : FREELANCE_CUT_PERCENT };
}
function generateFreelanceFileCode(admin, offset, date){
  const mk=String(date||F.localDateKey()).slice(0,7);
  const count=F.getFreelanceOrders().filter(o=> o.admin===admin && monthOf(o)===mk).length+(offset||0)+1;
  return "F"+mk.slice(5,7)+admin+String(count).padStart(2,"0");
}
function getRandomFreelanceEditType(){ return EDIT_TYPE_ROTATION[Math.floor(Math.random()*EDIT_TYPE_ROTATION.length)]; }
function buildFreelanceEditTypeSequence(count, baseType){
  const out=[]; for(let i=0;i<count;i++) out.push(baseType||getRandomFreelanceEditType()); return out;
}
function computeBatchPricingDistribution(total, count){
  if(count<=0) return [];
  let base=Math.round((total/count)/BATCH_PRICING_STEP)*BATCH_PRICING_STEP;
  base=Math.max(BATCH_PRICING_MIN, Math.min(BATCH_PRICING_MAX, base));
  const arr=new Array(count).fill(base);
  let diff=total-base*count;
  let i=0, guard=0;
  while(diff!==0 && guard<20000){
    const idx=i%count;
    if(diff>0){ const add=Math.min(BATCH_PRICING_STEP, diff); if(arr[idx]+add<=BATCH_PRICING_MAX){ arr[idx]+=add; diff-=add; } }
    else { const sub=Math.min(BATCH_PRICING_STEP, -diff); if(arr[idx]-sub>=BATCH_PRICING_MIN){ arr[idx]-=sub; diff+=sub; } }
    i++; guard++;
    if(guard>count*4 && diff!==0){ arr[0]+=diff; diff=0; }
  }
  return arr;
}

function renderTarget(){
  const mk=F.localMonthKey();
  const cut=getFreelanceCutInfo(mk);
  const pct=Math.min(100, Math.round(cut.files/cut.target*100));
  $("#freelanceTargetLabel").textContent="Target "+F.monthLabel(mk);
  $("#freelanceTargetText").textContent=cut.files+" / "+cut.target+" file";
  $("#freelanceTargetFill").style.width=pct+"%";
  $("#freelanceTargetNote").textContent= cut.files>=cut.target? "Target bulan ini tercapai." : "Sisa "+(cut.target-cut.files)+" file lagi untuk mencapai target bulan ini.";
  const badgeRow=$("#freelanceCutBadgeRow");
  if(badgeRow){
    badgeRow.innerHTML='<span class="tag '+(cut.below? "tag-amber" : "tag-green")+'">Potongan aktif bulan ini: '+cut.percent+"%</span>";
  }
}

let flCcRaf=null;
function animateFlCenterValue(total){
  const el=$("#flChartCenterVal"); if(!el) return;
  if(flCcRaf) cancelAnimationFrame(flCcRaf);
  const reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce){ el.textContent=total; return; }
  const t0=performance.now(), dur=600;
  const step=(t)=>{ const p=Math.min(1,(t-t0)/dur); const e=1-Math.pow(1-p,3); el.textContent=Math.round(total*e); if(p<1) flCcRaf=requestAnimationFrame(step); };
  flCcRaf=requestAnimationFrame(step);
}
function renderChart(){
  const orders=F.getFreelanceOrders();
  const counts=ADMIN_LIST.map(a=> orders.filter(o=> o.admin===a).length);
  const total=orders.length;
  $("#flChartEmpty").classList.toggle("hidden", total>0);
  const canvas=$("#freelanceAdminChart");
  canvas.style.display=total? "block":"none";
  const center=$("#flChartCenter");
  if(center){ center.classList.toggle("hidden", !total); if(total) animateFlCenterValue(total); }
  const entries=ADMIN_LIST.map((a,i)=> ({ admin:a, count:counts[i], color:ADMIN_COLOR_PALETTE[i] })).filter(e=> e.count>0).sort((x,y)=> y.count-x.count);
  $("#freelanceLegend").innerHTML=`<span><strong>Total: ${total} pesanan</strong></span>`+
    entries.map(e=> `<span><span class="dot" style="background:${e.color}"></span>${e.admin}: ${e.count} <span class="val">(${total? Math.round(e.count/total*100):0}%)</span></span>`).join("");
  if(!total){ if(chart){ chart.destroy(); chart=null; } return; }
  if(!window.Chart) return;
  const surf=(getComputedStyle(document.documentElement).getPropertyValue("--surface")||"#FCFBF8").trim();
  const data={ labels:entries.map(e=> e.admin), datasets:[{ data:entries.map(e=> e.count), backgroundColor:entries.map(e=> e.color), borderWidth:2, borderColor:surf, hoverOffset:6 }] };
  if(chart){ chart.data=data; chart.update(); return; }
  chart=new window.Chart(canvas.getContext("2d"), { type:"doughnut", data,
    options:{ responsive:true, maintainAspectRatio:false, cutout:"70%", animation:{ duration:550, easing:"easeOutQuart" }, plugins:{ legend:{ display:false },
      tooltip:{ callbacks:{ label:(c)=> " "+c.label+": "+c.parsed+" pesanan ("+(total? Math.round(c.parsed/total*100):0)+"%)" } } } } });
}

function currentFilters(){
  return { q:($("#freelanceSearch").value||"").trim().toLowerCase(),
           month:$("#freelanceMonthFilter").value||"",
           admin:$("#freelanceAdminFilter").value||"" };
}
function renderList(){
  const f=currentFilters();
  let list=F.getFreelanceOrders().slice().sort((a,b)=> String(b.date).localeCompare(String(a.date)));
  if(f.month) list=list.filter(o=> monthOf(o)===f.month);
  if(f.admin) list=list.filter(o=> o.admin===f.admin);
  if(f.q) list=list.filter(o=> String(o.fileName||"").toLowerCase().includes(f.q));
  const groups=new Map();
  list.forEach(o=>{ const k=monthOf(o); if(!groups.has(k)) groups.set(k,[]); groups.get(k).push(o); });
  const box=$("#freelanceOrderList");
  $("#flEmpty").classList.toggle("hidden", list.length>0);
  box.innerHTML=Array.from(groups.entries()).map(([mk, items])=>{
    const expanded=expandedGroups.has(mk);
    const shown=expanded? items : items.slice(0, FREELANCE_GROUP_VISIBLE_LIMIT);
    return `<div class="group-label">${F.esc(F.monthLabel(mk))}, ${items.length} file</div>
    <div class="ledger">
      ${shown.map(o=> `
      <div class="lrow">
        <span class="pd-dot" style="background:${adminColor(o.admin)}"></span>
        <span class="tag tag-amber">${F.esc(o.admin)}</span>
        <div class="grow"><div class="title">${F.esc(o.fileName)}</div><div class="sub">${F.esc(o.editType||"-")}, ${F.esc(F.formatDateValue(o.date))}</div></div>
        <span class="amount num">${o.price? F.esc(F.formatCurrencyValue(o.price)) : '<span class="muted" style="font-weight:500">Belum dihargai</span>'}</span>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-fo-edit="${o.id}" aria-label="Edit pesanan ${F.esc(o.fileName)}">${F.icon("pencil","icon-sm")}</button>
          <button type="button" class="icon-btn danger" data-fo-del="${o.id}" aria-label="Hapus pesanan ${F.esc(o.fileName)}">${F.icon("trash-2","icon-sm")}</button>
        </div>
      </div>`).join("")}
    </div>
    ${items.length>FREELANCE_GROUP_VISIBLE_LIMIT? `<div class="load-more-row"><button type="button" class="btn btn-ghost btn-sm" data-group-toggle="${mk}">${expanded? "Tutup sebagian" : "Tampilkan semua ("+items.length+")"}</button></div>`:""}`;
  }).join("");
  $$("[data-group-toggle]",box).forEach(b=> b.addEventListener("click", ()=>{
    const k=b.dataset.groupToggle;
    if(expandedGroups.has(k)) expandedGroups.delete(k); else expandedGroups.add(k);
    renderList();
  }));
  $$("[data-fo-edit]",box).forEach(b=> b.addEventListener("click", ()=> openFreelanceModal(F.getFreelanceOrders().find(o=> o.id===b.dataset.foEdit))));
  $$("[data-fo-del]",box).forEach(b=> b.addEventListener("click", async ()=>{
    const o=F.getFreelanceOrders().find(x=> x.id===b.dataset.foDel); if(!o) return;
    const ok=await F.showActionConfirm({ title:"Hapus Pesanan Freelance", message:"Pesanan "+o.fileName+" (admin "+o.admin+") akan dihapus permanen.", confirmLabel:"Ya, hapus pesanan", danger:true });
    if(!ok) return;
    F.saveFreelanceOrders(F.getFreelanceOrders().filter(x=> x.id!==o.id));
    F.showToast("Pesanan freelance dihapus"); renderAll();
  }));
  F.refreshIcons();
}

function adminOptions(sel){ return ADMIN_LIST.map(a=> `<option value="${a}" ${a===sel?"selected":""}>Admin ${a}</option>`).join(""); }
function openFreelanceModal(order){
  const isEdit=!!order;
  const ov=F.openModal(`
    ${F.modalHead(isEdit?"Edit Pesanan Freelance":"Tambah Pesanan Freelance")}
    <form id="foForm">
      <div class="grid-2">
        <div class="field"><label for="foAdmin">Admin</label><select class="control" id="foAdmin">${adminOptions(order?order.admin:"A")}</select></div>
        ${isEdit?"":'<div class="field"><label for="foQty">Jumlah File</label><input class="control num" type="number" id="foQty" min="1" max="200" value="1"><div class="hint">Kode file dibuat otomatis berurutan per bulan: F, bulan, admin, nomor urut.</div></div>'}
      </div>
      <div class="field"><label for="foName">Nama File</label><input class="control" id="foName" value="${F.esc(order?order.fileName:"")}" placeholder="Nama file atau kode"></div>
      <div class="grid-2">
        <div class="field"><label for="foType">Jenis Edit</label><input class="control" id="foType" value="${F.esc(order?order.editType||"":"")}" placeholder="Jenis edit"></div>
        <div class="field"><label for="foPrice">Harga (opsional)</label><input class="control num" type="number" id="foPrice" min="0" step="1000" value="${order&&order.price? F.esc(order.price):""}" placeholder="Bisa diisi akhir bulan"></div>
      </div>
      <div class="field"><label for="foDate">Tanggal</label><input class="control" type="date" id="foDate" value="${F.esc(order?order.date:F.localDateKey())}"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Batal</button>
      <button type="submit" class="btn btn-primary">${isEdit?"Simpan Perubahan":"Tambah Pesanan"}</button></div>
    </form>`);
  $("#foForm",ov).addEventListener("submit", e=>{
    e.preventDefault();
    const admin=$("#foAdmin",ov).value;
    const baseName=$("#foName",ov).value.trim();
    const type=$("#foType",ov).value.trim();
    const priceRaw=$("#foPrice",ov).value;
    const price=priceRaw===""? null : Number(priceRaw);
    const date=$("#foDate",ov).value||F.localDateKey();
    const list=F.getFreelanceOrders();
    if(isEdit){
      const i=list.findIndex(o=> o.id===order.id);
      if(i>-1) list[i]=Object.assign({}, list[i], { admin, fileName:baseName||list[i].fileName, editType:type, price, date });
      F.saveFreelanceOrders(list);
      F.showToast("Pesanan freelance diubah");
    }else{
      let qty=parseInt($("#foQty",ov).value,10); if(isNaN(qty)) qty=1; qty=Math.min(200, Math.max(1,qty));
      const types=buildFreelanceEditTypeSequence(qty, type||null);
      for(let k=0;k<qty;k++){
        const code=generateFreelanceFileCode(admin, k, date);
        list.unshift({ id:F.uid(), admin, fileName: qty>1? (baseName? baseName+" "+code : code) : (baseName||code), editType:types[k], price, date });
      }
      F.saveFreelanceOrders(list);
      F.showToast(qty>1? qty+" pesanan freelance ditambahkan":"Pesanan freelance ditambahkan");
    }
    F.closeModal(); renderAll();
  });
}

function batchFiles(){
  const mk=$("#batchMonth").value; const admin=$("#batchAdmin").value;
  if(!mk||!admin) return [];
  return F.getFreelanceOrders().filter(o=> monthOf(o)===mk && o.admin===admin)
    .sort((a,b)=> String(a.date).localeCompare(String(b.date)));
}
function updateBatchPricingPreview(){
  const files=batchFiles();
  const total=Number($("#batchTotal").value)||0;
  const box=$("#batchPreview");
  if(!files.length){ box.textContent="Tidak ada file untuk bulan dan admin ini."; return null; }
  const priced=files.filter(o=> o.price).length;
  if(!total){ box.textContent=files.length+" file ditemukan. Status: "+(priced? priced+" sudah dihargai, "+(files.length-priced)+" belum":"Belum Dihargai")+". Isi total harga untuk pratinjau pembagian."; return { files, dist:null }; }
  const dist=computeBatchPricingDistribution(total, files.length);
  const min=Math.min.apply(null,dist), max=Math.max.apply(null,dist);
  box.innerHTML=files.length+" file, total "+F.esc(F.formatCurrencyValue(total))+", harga per file "+(min===max? F.esc(F.formatCurrencyValue(min)) : F.esc(F.formatCurrencyValue(min))+" sampai "+F.esc(F.formatCurrencyValue(max)))+". Status: "+(priced? priced+" sudah dihargai, akan ditimpa":"Belum Dihargai")+".";
  return { files, dist };
}
function applyBatchPricing(){
  const res=updateBatchPricingPreview();
  if(!res||!res.dist){ F.showToast("Isi bulan, admin, dan total harga yang benar dulu", "error"); return; }
  const list=F.getFreelanceOrders();
  res.files.forEach((f,i)=>{ const rec=list.find(o=> o.id===f.id); if(rec) rec.price=res.dist[i]; });
  F.saveFreelanceOrders(list);
  F.showToast("Harga diterapkan ke "+res.files.length+" file");
  renderAll();
}

function updateIncomePanels(){
  const mk=$("#incomeMonth").value||F.localMonthKey();
  const orders=F.getFreelanceOrders().filter(o=> monthOf(o)===mk);
  const totalPriced=orders.reduce((s,o)=> s+(Number(o.price)||0),0);
  const perAdmin=ADMIN_LIST.map(a=>{
    const os=orders.filter(o=> o.admin===a);
    if(!os.length) return "";
    return `<div class="kv"><span class="k">Admin ${a}</span><span class="v num">${os.length} file, ${F.esc(F.formatCurrencyValue(os.reduce((s,o)=> s+(Number(o.price)||0),0)))}</span></div>`;
  }).join("");
  $("#freelanceMonthAdminBreakdown").innerHTML=
    `<div class="kv"><span class="k">Total harga pesanan ${F.esc(F.monthLabel(mk))}</span><span class="v num">${F.esc(F.formatCurrencyValue(totalPriced))}</span></div>`+
    perAdmin+
    `<button type="button" class="btn btn-ghost btn-sm" id="useOrderTotalButton" style="margin-top:6px">Gunakan angka ini</button>`;
  const uob=$("#useOrderTotalButton");
  if(uob) uob.addEventListener("click", ()=>{ $("#incomeGross").value=totalPriced||""; updateCutPreview(); });
  updateCutPreview();
}
function updateCutPreview(){
  const mk=$("#incomeMonth").value||F.localMonthKey();
  const gross=Number($("#incomeGross").value)||0;
  const cut=getFreelanceCutInfo(mk);
  const net=Math.round(gross*(100-cut.percent)/100);
  $("#freelanceCutPreview").innerHTML=
    `File bulan ini: <span class="num">${cut.files}</span> dari target <span class="num">${cut.target}</span>. Potongan <span class="num">${cut.percent}%</span>${cut.below? " karena di bawah target":""}.`+
    (gross? ` Gajian bersih setelah potongan: <strong class="num">${F.esc(F.formatCurrencyValue(net))}</strong>.`:"");
}
function renderIncomeList(){
  const list=F.getFreelanceIncome().slice().sort((a,b)=> String(b.month).localeCompare(String(a.month)));
  $("#incomeEmpty").classList.toggle("hidden", list.length>0);
  $("#freelanceIncomeList").innerHTML=list.map(e=>{
    const cut=getFreelanceCutInfo(e.month);
    const net=Math.round((Number(e.gross)||0)*(100-cut.percent)/100);
    return `
    <div class="lrow">
      <div class="grow"><div class="title">${F.esc(F.monthLabel(e.month))}</div><div class="sub">Gross ${F.esc(F.formatCurrencyValue(e.gross))}, potongan ${cut.percent}%</div></div>
      <span class="amount num">${F.esc(F.formatCurrencyValue(net))}</span>
      <div class="row-actions">
        <button type="button" class="icon-btn" data-inc-edit="${e.id}" aria-label="Edit gajian ${F.esc(F.monthLabel(e.month))}">${F.icon("pencil","icon-sm")}</button>
        <button type="button" class="icon-btn danger" data-inc-del="${e.id}" aria-label="Hapus gajian ${F.esc(F.monthLabel(e.month))}">${F.icon("trash-2","icon-sm")}</button>
      </div>
    </div>`;
  }).join("");
  $$("[data-inc-edit]").forEach(b=> b.addEventListener("click", ()=>{
    const e=F.getFreelanceIncome().find(x=> x.id===b.dataset.incEdit); if(!e) return;
    incomeEditId=e.id;
    $("#incomeMonth").value=e.month; $("#incomeGross").value=e.gross;
    updateIncomePanels();
    F.showToast("Mode edit gajian "+F.monthLabel(e.month)+", ubah lalu simpan");
    $("#incomeGross").focus();
  }));
  $$("[data-inc-del]").forEach(b=> b.addEventListener("click", async ()=>{
    const e=F.getFreelanceIncome().find(x=> x.id===b.dataset.incDel); if(!e) return;
    const ok=await F.showActionConfirm({ title:"Hapus Riwayat Gajian", message:"Catatan gajian "+F.monthLabel(e.month)+" akan dihapus permanen.", confirmLabel:"Ya, hapus catatan", danger:true });
    if(!ok) return;
    F.saveFreelanceIncome(F.getFreelanceIncome().filter(x=> x.id!==e.id));
    F.showToast("Riwayat gajian dihapus"); renderIncomeList();
  }));
  F.refreshIcons();
}

function renderAll(){ renderTarget(); renderChart(); renderList(); updateIncomePanels(); renderIncomeList(); }

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    document.body.classList.remove("is-data-loading");
    const mk=F.localMonthKey();
    $("#freelanceMonthFilter").value="";
    $("#incomeMonth").value=mk;
    $("#batchMonth").value=mk;
    $("#batchAdmin").innerHTML=ADMIN_LIST.map(a=> `<option value="${a}">Admin ${a}</option>`).join("");
    $("#freelanceAdminFilter").innerHTML='<option value="">Semua Admin</option>'+ADMIN_LIST.map(a=> `<option value="${a}">Admin ${a}</option>`).join("");
    renderAll();
    window.__refreshPage=renderAll;
    window.__onThemeChange=()=>{ if(chart){ chart.destroy(); chart=null; } renderChart(); };

    $("#addFreelanceBtn").addEventListener("click", ()=> openFreelanceModal(null));
    $("#editTargetBtn").addEventListener("click", ()=>{
      const ov=F.openModal(`${F.modalHead("Ubah Target Bulanan")}
        <form id="targetForm"><div class="field"><label for="targetInput">Target file per bulan</label>
        <input class="control num" type="number" id="targetInput" min="1" value="${F.getFreelanceTarget()}"></div>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Batal</button>
        <button type="submit" class="btn btn-primary">Simpan Target</button></div></form>`);
      $("#targetForm",ov).addEventListener("submit", e=>{
        e.preventDefault();
        const v=parseInt($("#targetInput",ov).value,10);
        if(!(v>0)){ F.showToast("Target harus lebih dari 0", "error"); return; }
        F.setData("fnatixFreelanceTarget", v);
        F.closeModal(); F.showToast("Target bulanan diperbarui"); renderAll();
      });
    });
    const syncMonthLabel=()=>{
      const v=$("#freelanceMonthFilter").value;
      $("#flMonthLabel").textContent= v? F.monthLabel(v) : "Semua bulan";
    };
    syncMonthLabel();
    $("#freelanceMonthFilter").addEventListener("change", ()=>{ syncMonthLabel(); renderList(); });
    $("#flClearFilter").addEventListener("click", ()=>{ $("#freelanceMonthFilter").value=""; syncMonthLabel(); renderList(); });
    const shiftMonth=(delta)=>{
      let v=$("#freelanceMonthFilter").value||F.localMonthKey();
      const d=F.parseKey(v+"-01"); d.setMonth(d.getMonth()+delta);
      $("#freelanceMonthFilter").value=F.localMonthKey(d);
      syncMonthLabel(); renderList();
    };
    $("#flPrevMonth").addEventListener("click", ()=> shiftMonth(-1));
    $("#flNextMonth").addEventListener("click", ()=> shiftMonth(1));
    $("#freelanceSearch").addEventListener("input", renderList);
    $("#freelanceAdminFilter").addEventListener("change", renderList);

    ["batchMonth","batchAdmin"].forEach(id=> $("#"+id).addEventListener("change", updateBatchPricingPreview));
    $("#batchTotal").addEventListener("input", updateBatchPricingPreview);
    $("#applyBatchPricingButton").addEventListener("click", applyBatchPricing);
    updateBatchPricingPreview();

    $("#incomeMonth").addEventListener("change", updateIncomePanels);
    $("#incomeGross").addEventListener("input", updateCutPreview);
    $("#freelanceIncomeForm").addEventListener("submit", e=>{
      e.preventDefault();
      const month=$("#incomeMonth").value; const gross=Number($("#incomeGross").value);
      if(!month||!(gross>=0)||$("#incomeGross").value===""){ F.showToast("Isi bulan dan total gajian yang benar", "error"); return; }
      const list=F.getFreelanceIncome();
      if(incomeEditId){
        const i=list.findIndex(x=> x.id===incomeEditId);
        if(i>-1) list[i]=Object.assign({}, list[i], { month, gross });
        incomeEditId=null;
      }else{
        const i=list.findIndex(x=> x.month===month);
        if(i>-1) list[i]=Object.assign({}, list[i], { gross });
        else list.push({ id:F.uid(), month, gross });
      }
      F.saveFreelanceIncome(list);
      F.showToast("Pendapatan freelance tersimpan");
      renderIncomeList();
    });
  }catch(e){
    document.body.classList.remove("is-data-loading");
    const err=$("#flError"); if(err){ err.classList.add("show"); err.textContent="Data freelance belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
