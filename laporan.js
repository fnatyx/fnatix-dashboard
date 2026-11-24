/* Laporan Pendapatan: KPI, filter periode, grafik, tabel, ekspor, backup, milestones. */
(function(){
"use strict";
const F=window.F, $=F.$, $$=F.$$;
let chart=null;
let range={ from:F.localDateKey(new Date(Date.now()-6*864e5)), to:F.localDateKey() };

function rangeFor(mode){
  const today=new Date(); const tk=F.localDateKey(today);
  if(mode==="today") return { from:tk, to:tk };
  if(mode==="7days") return { from:F.localDateKey(new Date(today.getTime()-6*864e5)), to:tk };
  if(mode==="30days") return { from:F.localDateKey(new Date(today.getTime()-29*864e5)), to:tk };
  if(mode==="month") return { from:tk.slice(0,7)+"-01", to:tk };
  return range;
}
function inRange(t, r){ const d=String(t.date||""); return d>=r.from && d<=r.to; }
function sumTx(list){ return list.reduce((s,t)=> s+(Number(t.price)||0),0); }
function badgeHTML(cur, prev){
  if(prev===0 && cur===0) return '<span class="trend">0%</span> pembanding kosong';
  if(prev===0) return '<span class="trend up">Baru</span> dari periode pembanding';
  const pct=Math.round(((cur-prev)/prev)*100);
  return `<span class="trend ${pct>=0?"up":"down"}">${pct>0?"+":""}${pct}%</span> dari periode pembanding`;
}
function render(){
  const txs=F.getTransactions();
  const periodTx=txs.filter(t=> inRange(t, range));
  $("#kpiTotal").textContent=F.formatCurrencyValue(sumTx(periodTx));
  $("#kpiTotalMeta").textContent=`${periodTx.length} pesanan, ${F.formatDateValue(range.from)} sampai ${F.formatDateValue(range.to)}`;

  const tk=F.localDateKey(); const yk=F.localDateKey(new Date(Date.now()-864e5));
  const todaySum=sumTx(txs.filter(t=> t.date===tk)); const yestSum=sumTx(txs.filter(t=> t.date===yk));
  $("#kpiToday").textContent=F.formatCurrencyValue(todaySum);
  $("#kpiTodayBadge").innerHTML=badgeHTML(todaySum, yestSum);

  const mk=tk.slice(0,7);
  const mStart=mk+"-01";
  const monthTx=txs.filter(t=> String(t.date)>=mStart && String(t.date)<=tk);
  const dayNum=Number(tk.slice(8,10));
  const pm=new Date(); pm.setMonth(pm.getMonth()-1);
  const pmStart=F.localMonthKey(pm)+"-01";
  const pmEnd=F.localDateKey(new Date(pm.getFullYear(), pm.getMonth(), dayNum));
  const prevMonthTx=txs.filter(t=> String(t.date)>=pmStart && String(t.date)<=pmEnd);
  $("#kpiMonth").textContent=F.formatCurrencyValue(sumTx(monthTx));
  $("#kpiMonthBadge").innerHTML=badgeHTML(sumTx(monthTx), sumTx(prevMonthTx));

  renderChart(periodTx);
  renderRecent(txs);
  renderTable(periodTx);
  renderMilestones();
  F.refreshIcons();
}
function renderChart(periodTx){
  const canvas=$("#revenueChartCanvas");
  const days=[]; const sums=[];
  const start=F.parseKey(range.from), end=F.parseKey(range.to);
  for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)){
    const k=F.localDateKey(d); days.push(k);
    sums.push(sumTx(periodTx.filter(t=> t.date===k)));
  }
  const has=sums.some(v=> v>0);
  $("#chartEmpty").classList.toggle("hidden", has);
  canvas.style.display=has? "block":"none";
  if(!has){ if(chart){ chart.destroy(); chart=null; } return; }
  if(!window.Chart) return;
  const labels=days.map(k=> { const d=F.parseKey(k); return d.getDate()+" "+F.MONTHS_SHORT[d.getMonth()]; });
  const cs=getComputedStyle(document.documentElement);
  const grid=(cs.getPropertyValue("--hair")||"#1E2532").trim();
  const tick=(cs.getPropertyValue("--ink-2")||"#94A3B8").trim();
  const acc=(cs.getPropertyValue("--accent")||"#3B82F6").trim();
  const dark=document.documentElement.getAttribute("data-theme")==="dark";
  const cfg={ type:"line",
    data:{ labels, datasets:[{ data:sums, borderColor:dark? acc : "#65A30D", backgroundColor:dark? "rgba(214,255,63,.15)":"rgba(132,204,22,.18)", fill:true, tension:.3, pointRadius:3, pointBackgroundColor:dark? acc : "#65A30D", borderWidth:2.2 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:(c)=> " "+F.formatCurrencyValue(c.parsed.y) } } },
      scales:{ x:{ grid:{ display:false }, ticks:{ color:tick, font:{ family:"Plus Jakarta Sans", size:11 }, maxTicksLimit:10 } },
               y:{ grid:{ color:grid }, border:{ display:false }, ticks:{ color:tick, font:{ family:"Plus Jakarta Sans", size:11 }, callback:(v)=> "Rp"+Number(v).toLocaleString("id-ID") } } } } };
  if(chart){ chart.data=cfg.data; chart.options=cfg.options; chart.update(); return; }
  chart=new window.Chart(canvas.getContext("2d"), cfg);
}
function renderRecent(txs){
  const recent=txs.slice().sort((a,b)=> String(b.date).localeCompare(String(a.date))).slice(0,6);
  $("#recentEmpty").classList.toggle("hidden", recent.length>0);
  $("#reportRecent").innerHTML=recent.map(t=> `
    <div class="lrow">
      <div class="grow"><div class="title">${F.esc(t.name)}</div><div class="sub">${F.esc(t.category)}, ${F.esc(F.formatDateValue(t.date))}</div></div>
      <span class="stamp">${F.icon("check","icon-xs")} Selesai</span>
      <span class="amount num">${F.esc(F.formatCurrencyValue(t.price))}</span>
    </div>`).join("");
}
function renderTable(periodTx){
  const byDate=new Map();
  periodTx.forEach(t=>{ const k=String(t.date); if(!byDate.has(k)) byDate.set(k,{count:0,total:0}); const e=byDate.get(k); e.count+=1; e.total+=Number(t.price)||0; });
  const rows=Array.from(byDate.entries()).sort((a,b)=> b[0].localeCompare(a[0]));
  $("#tableEmpty").classList.toggle("hidden", rows.length>0);
  $("#revenueTable tbody").innerHTML=rows.map(([d,e])=> `
    <tr><td>${F.esc(F.formatDateValue(d))}</td><td class="r num">${e.count}</td><td class="r num">${F.esc(F.formatCurrencyValue(e.total))}</td></tr>`).join("");
}

function groupedDetail(periodTx){
  const map=new Map();
  periodTx.forEach(t=>{
    const key=[t.date,t.name,t.category,t.price].join("|");
    if(!map.has(key)) map.set(key,{ date:t.date, name:t.name, category:t.category, price:Number(t.price)||0, qty:0 });
    map.get(key).qty+=1;
  });
  return Array.from(map.values()).sort((a,b)=> String(a.date).localeCompare(String(b.date)));
}
function exportPDF(){
  try{
    if(!window.jspdf || !window.jspdf.jsPDF) throw new Error("lib");
    const periodTx=F.getTransactions().filter(t=> inRange(t, range));
    const detail=groupedDetail(periodTx);
    const p=F.getBusinessProfile();
    const biz=String(p.businessName||"FNATIX ID").toUpperCase();
    const doc=new window.jspdf.jsPDF();

    /* Header Fincro Obsidian + aksen Electric Lime */
    doc.setFillColor(14, 16, 14);
    doc.rect(0, 0, 210, 34, "F");
    doc.setFillColor(214, 255, 63);
    doc.rect(0, 34, 210, 1.8, "F");

    doc.setTextColor(245, 247, 242);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text(biz, 14, 15);

    doc.setTextColor(163, 171, 160);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Laporan Pendapatan Jasa Edit", 14, 22);

    const periodLabel=F.formatDateValue(range.from)+" s.d. "+F.formatDateValue(range.to);
    doc.setFillColor(214, 255, 63);
    doc.roundedRect(122, 10, 74, 14, 3, 3, "F");
    doc.setTextColor(11, 13, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(periodLabel, 159, 18.5, { align: "center" });

    /* 3 Kartu Ringkasan KPI */
    const total=sumTx(periodTx);
    const months=new Set(periodTx.map(t=> String(t.date).slice(0,7))).size||1;
    const kpis=[
      { label:"TOTAL PENDAPATAN", val:F.formatCurrencyValue(total) },
      { label:"TOTAL PESANAN", val:String(periodTx.length)+" pesanan" },
      { label:"RATA-RATA PER BULAN", val:F.formatCurrencyValue(Math.round(total/months)) }
    ];
    kpis.forEach((k, idx)=>{
      const x=14 + idx*62;
      doc.setFillColor(243, 245, 240);
      doc.setDrawColor(210, 218, 204);
      doc.roundedRect(x, 42, 58, 20, 3, 3, "FD");
      doc.setTextColor(74, 82, 70);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(k.label, x+5, 49);
      doc.setTextColor(17, 20, 16);
      doc.setFontSize(12);
      doc.text(k.val, x+5, 57.5);
    });

    const body=[]; let lastMonth=""; let subtotal=0;
    const flush=()=>{ if(lastMonth) body.push(["", "Subtotal "+F.monthLabel(lastMonth), "", "", "", F.formatCurrencyValue(subtotal)]); };
    detail.forEach(r=>{
      const m=String(r.date).slice(0,7);
      if(m!==lastMonth){ flush(); lastMonth=m; subtotal=0; }
      const line=r.price*r.qty; subtotal+=line;
      body.push([F.formatDateValue(r.date), r.name, r.category, String(r.qty), F.formatCurrencyValue(r.price), F.formatCurrencyValue(line)]);
    });
    flush();
    body.push(["", "Total Keseluruhan", "", "", "", F.formatCurrencyValue(total)]);

    doc.autoTable({
      startY:68,
      head:[["Tanggal","Customer","Layanan","Qty","Harga Satuan","Total"]],
      body,
      theme:"grid",
      styles:{ fontSize:9, textColor:[17,20,16], lineColor:[220,226,214], lineWidth:0.2, cellPadding:3.2 },
      headStyles:{ fillColor:[20,22,20], textColor:[214,255,63], fontStyle:"bold" },
      alternateRowStyles:{ fillColor:[247,249,245] },
      columnStyles:{ 3:{ halign:"right" }, 4:{ halign:"right" }, 5:{ halign:"right" } },
      didParseCell(data){
        if(data.section!=="body" || !Array.isArray(data.row.raw)) return;
        const label=String(data.row.raw[1]||"");
        if(label.startsWith("Subtotal ")){
          data.cell.styles.fillColor=[234,239,229];
          data.cell.styles.fontStyle="bold";
          data.cell.styles.textColor=[17,20,16];
        }else if(label==="Total Keseluruhan"){
          data.cell.styles.fillColor=[20,22,20];
          data.cell.styles.fontStyle="bold";
          data.cell.styles.textColor=[214,255,63];
        }
      }
    });

    const pages=doc.getNumberOfPages();
    for(let i=1;i<=pages;i++){
      doc.setPage(i);
      doc.setDrawColor(220, 226, 214);
      doc.line(14, 283, 196, 283);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(90, 99, 86);
      doc.text(biz+" · Buku Pendapatan Jasa Edit (Terpisah dari Freelance & Produk Digital)", 14, 289);
      doc.text("Halaman "+i+" dari "+pages, 196, 289, { align: "right" });
    }
    doc.save("laporan-pendapatan-fnatix-id.pdf");
    F.showToast("PDF laporan diunduh");
  }catch(e){ F.showToast("Export PDF belum bisa dijalankan, library belum termuat", "error"); }
}
function exportExcel(){
  try{
    if(!window.XLSX) throw new Error("lib");
    const periodTx=F.getTransactions().filter(t=> inRange(t, range));
    const byDate=new Map();
    periodTx.forEach(t=>{ const k=String(t.date); if(!byDate.has(k)) byDate.set(k,{count:0,total:0}); const e=byDate.get(k); e.count+=1; e.total+=Number(t.price)||0; });
    const rows=[["Tanggal","Jumlah Pesanan","Total Pendapatan"]];
    Array.from(byDate.entries()).sort((a,b)=> a[0].localeCompare(b[0])).forEach(([d,e])=> rows.push([d, e.count, e.total]));
    const ws=window.XLSX.utils.aoa_to_sheet(rows);
    const wb=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Laporan Pendapatan");
    window.XLSX.writeFile(wb, "laporan-pendapatan-fnatix-id.xlsx");
    F.showToast("Excel laporan diunduh");
  }catch(e){ F.showToast("Export Excel belum bisa dijalankan, library belum termuat", "error"); }
}
function downloadJSON(obj, filename){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=filename; a.click();
  setTimeout(()=> URL.revokeObjectURL(a.href), 4000);
}
function exportBackup(){
  downloadJSON({ version:2, exportedAt:new Date().toISOString(),
    transactions:F.getTransactions(), freelanceOrders:F.getFreelanceOrders(), freelanceIncome:F.getFreelanceIncome() },
    "fnatix-backup-"+F.localDateKey()+".json");
  F.logActivity("Mengunduh backup data", "download", "backup");
  F.showToast("Backup data diunduh");
}
async function importBackup(file){
  try{
    const data=JSON.parse(await file.text());
    let txs=null, fo=null, fi=null;
    if(Array.isArray(data)) txs=data;
    else { txs=data.transactions||null; fo=data.freelanceOrders||null; fi=data.freelanceIncome||null; }
    if(!txs && !fo && !fi) throw new Error("format");
    const parts=[];
    if(txs) parts.push(txs.length+" pesanan FNATIX ID");
    if(fo) parts.push(fo.length+" pesanan freelance");
    if(fi) parts.push(fi.length+" catatan gajian");
    const ok=await F.showActionConfirm({ title:"Import Backup", message:"Data sekarang akan ditimpa oleh isi backup: "+parts.join(", ")+". Lanjutkan?", confirmLabel:"Ya, impor backup", danger:true });
    if(!ok) return;
    if(txs) F.setData("fnatixTransactions", txs);
    if(fo) F.setData("fnatixFreelanceOrders", fo);
    if(fi) F.setData("fnatixFreelanceIncome", fi);
    F.logActivity("Mengimpor backup data ("+parts.join(", ")+")", "upload", "import");
    F.showToast("Backup berhasil diimpor");
    setTimeout(()=> location.reload(), 700);
  }catch(e){ F.showToast("File backup tidak valid", "error"); }
}

const BUSINESS_MILESTONES=[
  { id:"tx100", label:"100 Transaksi", defTarget:100, metric:"transactions", fmt:(v)=> v+" transaksi" },
  { id:"rev5m", label:"Rp5 Juta Revenue", defTarget:5000000, metric:"revenue", fmt:(v)=> F.formatCurrencyValue(v) },
  { id:"cust100", label:"100 Customer", defTarget:100, metric:"customers", fmt:(v)=> v+" customer" }
];
const MILESTONES_VISIBLE_COUNT=3;
let mileExpanded=false;
function milestoneCurrent(m){
  const txs=F.getTransactions();
  if(m.metric==="transactions") return txs.length;
  if(m.metric==="revenue") return sumTx(txs);
  return F.buildCustomers().length;
}
function renderMilestones(){
  const overrides=F.getData("fnatixMilestoneTargets",{});
  const list=BUSINESS_MILESTONES.map(m=>{
    const target=Number(overrides[m.id])>0? Number(overrides[m.id]): m.defTarget;
    return { m, target, cur:milestoneCurrent(m) };
  });
  const visible=mileExpanded? list : list.slice(0, MILESTONES_VISIBLE_COUNT);
  $("#milestoneExpandBtn").classList.toggle("hidden", list.length<=MILESTONES_VISIBLE_COUNT);
  $("#milestonesList").innerHTML=visible.map(({m,target,cur})=>{
    const pct=Math.min(100, Math.round(cur/target*100));
    return `
    <div class="mile">
      <div class="mile-top">
        <div><strong style="font-size:14px">${F.esc(m.label)}</strong><div class="small muted">${F.esc(m.fmt(cur))} dari ${F.esc(m.fmt(target))}</div></div>
        <span style="display:flex; gap:8px; align-items:center"><span class="num" style="font-weight:700">${pct}%</span>
        <button type="button" class="icon-btn" data-mile-edit="${m.id}" aria-label="Edit target ${F.esc(m.label)}">${F.icon("pencil","icon-sm")}</button></span>
      </div>
      <div class="mile-bar"><div class="mile-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join("") || '<div class="empty"><p>Belum ada milestone.</p></div>';
  $$("[data-mile-edit]").forEach(b=> b.addEventListener("click", ()=> editMilestone(b.dataset.mileEdit)));
  F.refreshIcons();
}
function editMilestone(id){
  const m=BUSINESS_MILESTONES.find(x=> x.id===id); if(!m) return;
  const overrides=F.getData("fnatixMilestoneTargets",{});
  const cur=Number(overrides[id])>0? Number(overrides[id]): m.defTarget;
  const ov=F.openModal(`
    ${F.modalHead("Edit Target Milestone")}
    <form id="mileForm">
      <div class="field"><label for="mileTarget">Target untuk ${F.esc(m.label)}</label>
      <input class="control num" type="number" id="mileTarget" min="1" value="${cur}"></div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Batal</button>
      <button type="submit" class="btn btn-primary">Simpan Target</button></div>
    </form>`);
  $("#mileForm",ov).addEventListener("submit", e=>{
    e.preventDefault();
    const v=Number($("#mileTarget",ov).value);
    if(!(v>0)){ F.showToast("Target harus lebih dari 0", "error"); return; }
    overrides[id]=v; F.setData("fnatixMilestoneTargets", overrides);
    F.closeModal(); F.showToast("Target milestone diperbarui"); renderMilestones();
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    document.body.classList.remove("is-data-loading");
    render();
    window.__refreshPage=render;
    window.__onThemeChange=()=>{ if(chart){ chart.destroy(); chart=null; } render(); };
    const sel=$("#reportPeriod");
    sel.addEventListener("change", ()=>{
      const custom=sel.value==="custom";
      $("#customFromWrap").classList.toggle("hidden", !custom);
      $("#customToWrap").classList.toggle("hidden", !custom);
      $("#applyCustomBtn").classList.toggle("hidden", !custom);
      if(!custom){ range=rangeFor(sel.value); render(); }
    });
    $("#applyCustomBtn").addEventListener("click", ()=>{
      const f=$("#reportCustomFrom").value, t=$("#reportCustomTo").value;
      if(!f||!t){ F.showToast("Isi tanggal dari dan sampai dulu", "error"); return; }
      range={ from:f, to:t }; render();
    });
    $("#exportPdfButton").addEventListener("click", exportPDF);
    $("#exportExcelButton").addEventListener("click", exportExcel);
    $("#exportBackupButton").addEventListener("click", exportBackup);
    $("#importBackupButton").addEventListener("click", ()=> $("#importBackupInput").click());
    $("#importBackupInput").addEventListener("change", e=>{ if(e.target.files[0]) importBackup(e.target.files[0]); e.target.value=""; });
    $("#milestoneExpandBtn").addEventListener("click", ()=>{ mileExpanded=!mileExpanded; $("#milestoneExpandBtn").textContent=mileExpanded?"Tutup":"Lihat Semua"; renderMilestones(); });
  }catch(e){
    document.body.classList.remove("is-data-loading");
    const err=$("#repError"); if(err){ err.classList.add("show"); err.textContent="Data laporan belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
