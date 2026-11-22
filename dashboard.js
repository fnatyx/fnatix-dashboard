/* Dashboard — lembar kas bulan berjalan.
   Urutan: judul lembar, baris kas ringkasan + TOTAL garis ganda,
   pencarian besar, tabel kas Pesanan Terbaru, donat kecil + insight/top 3. */
(function(){
"use strict";
const F=window.F, $=F.$, $$=F.$$;
let chartMode="orders";
let chartInst=null;
const PALETTE=["#F471B5","#A78BFA","#8B5CF6","#F9A8D4","#C4B5FD","#6D5BD0","#E8E8F0"];

function sumTx(list){ return list.reduce((s,t)=> s+(Number(t.price)||0),0); }
function setTrend(el, cur, prev){
  if(!el) return;
  if(prev===0 && cur===0){ el.className="trend"; el.textContent="0%"; return; }
  if(prev===0){ el.className="trend up"; el.textContent="Baru"; return; }
  const pct=Math.round((cur-prev)/prev*100);
  el.className="trend "+(pct>=0?"up":"down");
  el.textContent=(pct>0?"+":"")+pct+"%";
}
function freelanceNetOf(entry){
  const files=F.getFreelanceOrders().filter(o=> String(o.date||"").slice(0,7)===entry.month).length;
  const target=F.getFreelanceTarget();
  const cut=files<target? 50:40;
  const gross=Number(entry.gross)||0;
  return { entry, files, target, cut, gross, net:Math.round(gross*(100-cut)/100) };
}
function freelanceLatestNet(){
  const entries=F.getFreelanceIncome().slice().sort((a,b)=> String(b.month).localeCompare(String(a.month)));
  if(!entries.length) return null;
  return freelanceNetOf(entries[0]);
}
/* Rekap freelance baru terhitung di total bulan berjalan bila periodenya memang bulan ini.
   Rekap bulan lalu yang masih tampil di kartu ringkasan tidak ikut masuk total. */
function freelanceMonthNet(mk){
  const entry=F.getFreelanceIncome().find(e=> String(e.month||"")===mk);
  return entry? freelanceNetOf(entry) : null;
}
/* Pendapatan produk digital bulan berjalan; hanya produk katalog, sama seperti halaman Produk Digital. */
function produkMonthAmount(mk){
  const ids=new Set(F.PRODUK_DIGITAL_PRODUCTS.map(p=> p.id));
  return F.getProdukDigital()
    .filter(e=> ids.has(e.product) && String(e.date||"").slice(0,7)===mk)
    .reduce((s,e)=> s+(Number(e.amount)||0),0);
}
function renderSummary(){
  const mk=F.localMonthKey();
  const now=new Date(); const prevDate=new Date(now.getFullYear(), now.getMonth()-1, 1);
  const pmk=F.localMonthKey(prevDate);
  const txs=F.getTransactions();
  const monthTx=txs.filter(t=> String(t.date||"").slice(0,7)===mk);
  const prevTx=txs.filter(t=> String(t.date||"").slice(0,7)===pmk);
  const income=sumTx(monthTx), prevIncome=sumTx(prevTx);
  $("#rowIncome").textContent=F.formatCurrencyValue(income);
  $("#sumStoreMeta").textContent=monthTx.length? "Rata-rata "+F.formatCurrencyValue(Math.round(income/monthTx.length))+" per pesanan" : "Belum ada pesanan bulan ini";
  setTrend($("#rowIncomeTrend"), income, prevIncome);
  $("#rowOrders").textContent=String(monthTx.length);
  $("#rowOrdersUnit").textContent=monthTx.length===1? "pesanan" : "pesanan";
  setTrend($("#rowOrdersTrend"), monthTx.length, prevTx.length);
  const fl=freelanceLatestNet();
  if(fl){
    $("#rowFreelance").textContent=F.formatCurrencyValue(fl.net);
    $("#rowFreelanceMeta").textContent="Rekap "+F.monthLabel(fl.entry.month)+", bersih setelah potongan "+fl.cut+"%";
  } else {
    $("#rowFreelance").textContent=F.formatCurrencyValue(0);
    $("#rowFreelanceMeta").textContent="Belum ada rekap gajian tersimpan";
  }
  const flMonth=freelanceMonthNet(mk);
  const pdMonth=produkMonthAmount(mk);
  $("#rowGrand").textContent=F.formatCurrencyValue(income + pdMonth + (flMonth? flMonth.net:0));
  const hs=$("#heroStoreVal"); if(hs) hs.textContent=F.formatCurrencyValue(income);
  const hp=$("#heroPdVal"); if(hp) hp.textContent=F.formatCurrencyValue(pdMonth);
  const hfRow=$("#heroFlRow"); if(hfRow) hfRow.style.display=flMonth? "" : "none";
  const hf=$("#heroFlVal"); if(hf) hf.textContent=F.formatCurrencyValue(flMonth? flMonth.net : 0);
  const hn=$("#heroNote"); if(hn) hn.textContent=flMonth? "Fnatix ID, Produk Digital, dan freelance rekap bulan ini" : "Fnatix ID bulan ini ditambah Produk Digital bulan ini";
}
function renderRecent(){
  const txs=F.getTransactions().slice().sort((a,b)=> String(b.date).localeCompare(String(a.date))).slice(0,6);
  const body=$("#recentTableBody");
  body.innerHTML=txs.map(t=> F.txTableRowHTML(t)).join("");
  $("#recentTableWrap").classList.toggle("hidden", txs.length===0);
  $("#recentEmpty").classList.toggle("hidden", txs.length>0);
  F.bindTxActions(body);
  F.refreshIcons();
}
let ccRaf=null;
function animateCenterValue(total, fmt){
  const el=$("#chartCenterVal"); if(!el) return;
  if(ccRaf) cancelAnimationFrame(ccRaf);
  const reduce=window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(reduce){ el.textContent=fmt(total); return; }
  const t0=performance.now(), dur=900;
  const step=(t)=>{ const p=Math.min(1,(t-t0)/dur); const e=1-Math.pow(1-p,3); el.textContent=fmt(Math.round(total*e)); if(p<1) ccRaf=requestAnimationFrame(step); };
  ccRaf=requestAnimationFrame(step);
}
function renderChart(){
  const mk=F.localMonthKey();
  const monthTx=F.getTransactions().filter(t=> String(t.date||"").slice(0,7)===mk);
  const byCat=new Map();
  monthTx.forEach(t=>{
    const k=t.category||"Lainnya";
    byCat.set(k, (byCat.get(k)||0) + (chartMode==="orders"? 1 : (Number(t.price)||0)));
  });
  const entries=Array.from(byCat.entries()).sort((a,b)=> b[1]-a[1]);
  const empty=$("#chartEmpty"), canvas=$("#revenueChart");
  if(!entries.length || !window.Chart){
    if(canvas) canvas.style.display="none";
    empty.classList.remove("hidden");
    empty.querySelector("p").textContent = !window.Chart? "Grafik tidak tersedia saat offline." : "Belum ada pesanan bulan ini.";
    const lg0=$("#chartLegend"); if(lg0) lg0.classList.add("hidden");
    const cc0=$("#chartCenter"); if(cc0) cc0.classList.add("hidden");
    return;
  }
  canvas.style.display="";
  empty.classList.add("hidden");
  if(chartInst){ chartInst.destroy(); chartInst=null; }
  chartInst=new window.Chart(canvas.getContext("2d"), {
    type:"doughnut",
    data:{ labels:entries.map(e=> e[0]),
      datasets:[{ data:entries.map(e=> e[1]),
        backgroundColor:entries.map((_,i)=> PALETTE[i%PALETTE.length]),
        borderWidth:2, borderColor:getComputedStyle(document.documentElement).getPropertyValue("--surface")||"#fff" }]},
    options:{ responsive:true, maintainAspectRatio:false, cutout:"68%", animation:{ duration:900, easing:"easeOutQuart", animateScale:true, animateRotate:true },
      plugins:{ legend:{ display:false },
        tooltip:{ callbacks:{ label(ctx){
          return " "+ctx.label+": "+(chartMode==="orders"? ctx.parsed+" pesanan" : F.formatCurrencyValue(ctx.parsed));
        } } } } }
  });
  const total=entries.reduce((s,e)=> s+e[1],0);
  const legend=$("#chartLegend");
  if(legend){
    legend.innerHTML=entries.map((e,i)=> `<span style="animation-delay:${i*45}ms"><span class="dot" style="background:${PALETTE[i%PALETTE.length]}"></span>${F.esc(e[0])} <span class="val">${chartMode==="orders"? e[1]+" pesanan" : F.esc(F.formatCurrencyValue(e[1]))}</span></span>`).join("");
    legend.classList.remove("hidden");
  }
  const cc=$("#chartCenter");
  if(cc){
    $("#chartCenterLbl").textContent= chartMode==="orders"? "pesanan" : "pendapatan";
    animateCenterValue(total, chartMode==="orders"? (v)=> String(v) : (v)=> F.formatCurrencyValue(v));
    cc.classList.remove("hidden");
  }
}
let trendInst=null;
function renderTrend(){
  const canvas=$("#dashTrendChart"), empty=$("#dashChartEmpty");
  if(!canvas) return;
  const now=new Date(); const mk=F.localMonthKey(now);
  const days=new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const sums=new Array(days).fill(0);
  F.getTransactions().filter(t=> String(t.date||"").slice(0,7)===mk).forEach(t=>{
    const d=parseInt(String(t.date).slice(8,10),10);
    if(d>=1 && d<=days) sums[d-1]+=Number(t.price)||0;
  });
  /* Seri kedua: pendapatan Produk Digital per hari dari buku produkDigital
     (hanya produk katalog, sama seperti hitungan Produk Digital lainnya).
     Dua buku tetap terpisah: dua garis sendiri, tidak pernah digabung. */
  const pdSums=new Array(days).fill(0);
  try{
    const pdIds=new Set(F.PRODUK_DIGITAL_PRODUCTS.map(p=> p.id));
    F.getProdukDigital().filter(e=> pdIds.has(e.product) && String(e.date||"").slice(0,7)===mk).forEach(e=>{
      const d=parseInt(String(e.date).slice(8,10),10);
      if(d>=1 && d<=days) pdSums[d-1]+=Number(e.amount)||0;
    });
  }catch(e){}
  const pdHas=pdSums.some(v=> v>0);
  const has=sums.some(v=> v>0) || pdHas;
  if(!has || !window.Chart){
    canvas.style.display="none";
    if(trendInst){ trendInst.destroy(); trendInst=null; }
    if(empty){ empty.classList.remove("hidden");
      const p=empty.querySelector("p");
      if(p) p.textContent=!window.Chart? "Grafik tidak tersedia saat offline." : "Belum ada pendapatan bulan ini."; }
    return;
  }
  canvas.style.display="";
  if(empty) empty.classList.add("hidden");
  if(trendInst){ trendInst.destroy(); trendInst=null; }
  const cs=getComputedStyle(document.documentElement);
  const tick=(cs.getPropertyValue("--ink-2")||"#A2A5B3").trim();
  const grid=(cs.getPropertyValue("--hair")||"#2A2A38").trim();
  const ctx=canvas.getContext("2d");
  let fill="rgba(244,113,181,.14)";
  try{
    const g=ctx.createLinearGradient(0,0,0,260);
    g.addColorStop(0,"rgba(244,113,181,.30)");
    g.addColorStop(1,"rgba(167,139,250,.02)");
    fill=g;
  }catch(e){}
  let pdFill="rgba(139,92,246,.12)";
  try{
    const g2=ctx.createLinearGradient(0,0,0,260);
    g2.addColorStop(0,"rgba(139,92,246,.26)");
    g2.addColorStop(1,"rgba(139,92,246,.02)");
    pdFill=g2;
  }catch(e){}
  const datasets=[{ label:"Fnatix ID", data:sums, borderColor:"#F471B5", backgroundColor:fill, fill:true, tension:.4,
    pointRadius:0, pointHoverRadius:4, pointBackgroundColor:"#A78BFA", borderWidth:2 }];
  if(pdHas) datasets.push({ label:"Produk Digital", data:pdSums, borderColor:"#8B5CF6", backgroundColor:pdFill, fill:true, tension:.4,
    pointRadius:0, pointHoverRadius:4, pointBackgroundColor:"#C4B5FD", borderWidth:2 });
  trendInst=new window.Chart(ctx, { type:"line",
    data:{ labels:sums.map((_,i)=> String(i+1)), datasets },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:pdHas, position:"top", align:"end",
          labels:{ color:tick, font:{ family:"Plus Jakarta Sans", size:11 }, usePointStyle:true, boxWidth:6, boxHeight:6, padding:12 } },
        tooltip:{ callbacks:{ title(items){ return "Tanggal "+(items[0]? items[0].label : ""); },
          label(c){ return " "+(c.dataset.label? c.dataset.label+": ":"")+F.formatCurrencyValue(c.parsed.y); } } } },
      scales:{ x:{ grid:{ display:false }, ticks:{ color:tick, font:{ family:"Plus Jakarta Sans", size:11 }, maxTicksLimit:10 } },
        y:{ grid:{ color:grid }, border:{ display:false }, ticks:{ color:tick, font:{ family:"Plus Jakarta Sans", size:11 }, maxTicksLimit:5,
          callback:v=> "Rp"+Number(v).toLocaleString("id-ID") } } } } });
}
/* Insight Produk Digital: tambahan dari buku produkDigital, selalu dilabeli
   "Produk Digital" agar terpisah dari insight jasa edit. Mengembalikan array
   kosong bila belum ada entri digital, supaya blok Insight tidak berubah. */
function digitalInsightLines(mk, monthTx){
  let valid=[];
  try{
    const ids=new Set(F.PRODUK_DIGITAL_PRODUCTS.map(p=> p.id));
    valid=F.getProdukDigital().filter(e=> ids.has(e.product));
  }catch(e){ valid=[]; }
  if(!valid.length) return [];
  const lines=[];
  const t=produkTotals();
  const per=t.per.filter(v=> v.qty>0 || v.amount>0).sort((a,b)=> (b.qty-a.qty) || (b.amount-a.amount));
  if(per.length){
    const best=per[0];
    lines.push({ icon:"shopping-bag", text:"Produk Digital terlaris: "+best.label+" ("+best.qty+" unit terjual, total "+F.formatCurrencyValue(best.amount)+")." });
  }
  const monthEntries=valid.filter(e=> String(e.date||"").slice(0,7)===mk);
  if(monthEntries.length){
    const pdMonth=monthEntries.reduce((s,e)=> s+(Number(e.amount)||0),0);
    const pdQty=monthEntries.reduce((s,e)=> s+(Number(e.qty)||0),0);
    lines.push({ icon:"wallet", text:"Pendapatan Produk Digital bulan ini "+F.formatCurrencyValue(pdMonth)+" dari "+pdQty+" unit terjual." });
    const flMonth=freelanceMonthNet(mk);
    const grand=sumTx(monthTx)+pdMonth+(flMonth? flMonth.net:0);
    if(grand>0 && pdMonth>0){
      lines.push({ icon:"percent", text:"Produk Digital menyumbang "+Math.round(pdMonth/grand*100)+"% dari Total Bulan Ini." });
    }
  }
  const byChannel=new Map();
  valid.forEach(e=>{
    const ch=String(e.channel||"").trim()||"Lainnya";
    byChannel.set(ch, (byChannel.get(ch)||0)+(Number(e.amount)||0));
  });
  const channels=Array.from(byChannel.entries()).filter(c=> c[1]>0).sort((a,b)=> b[1]-a[1]);
  if(channels.length && t.amount>0){
    lines.push({ icon:"store", text:"Channel Produk Digital dominan: "+channels[0][0]+" ("+Math.round(channels[0][1]/t.amount*100)+"% dari total pendapatan produk digital)." });
  }
  return lines;
}
function renderInsight(){
  const mk=F.localMonthKey();
  const txs=F.getTransactions();
  const monthTx=txs.filter(t=> String(t.date||"").slice(0,7)===mk);
  const box=$("#dashboardInsight");
  const lines=[];
  if(monthTx.length){
    const byCat=new Map();
    monthTx.forEach(t=> byCat.set(t.category||"Lainnya", (byCat.get(t.category||"Lainnya")||0)+1));
    const topCat=Array.from(byCat.entries()).sort((a,b)=> b[1]-a[1])[0];
    const customers=F.buildCustomers();
    const repeat=customers.filter(c=> c.orders>=2).length;
    const avg=Math.round(sumTx(monthTx)/monthTx.length);
    const biggest=customers[0];
    lines.push(
      { icon:"crown", text:"Layanan terlaris bulan ini: "+topCat[0]+" ("+topCat[1]+" pesanan)." },
      { icon:"repeat", text:repeat+" customer sudah repeat order dari total "+customers.length+" customer." },
      { icon:"calculator", text:"Rata-rata nilai pesanan bulan ini "+F.formatCurrencyValue(avg)+"." },
      { icon:"trophy", text:biggest? "Customer terbesar: "+biggest.name+" dengan total "+F.formatCurrencyValue(biggest.total)+"." : "Belum ada customer tercatat." }
    );
  }
  lines.push.apply(lines, digitalInsightLines(mk, monthTx));
  if(!lines.length){
    box.innerHTML='<div class="insight-line">'+F.icon("activity")+"<span>Belum ada data bulan ini. Insight muncul setelah ada pesanan tercatat.</span></div>";
  } else {
    box.innerHTML=lines.map(l=> '<div class="insight-line">'+F.icon(l.icon)+"<span>"+F.esc(l.text)+"</span></div>").join("");
  }
  const top=F.buildCustomers().slice(0,3);
  const list=$("#topCustomerList");
  list.innerHTML=top.map((c,i)=>
    '<div class="rank-row"><span class="rank-num">'+(i+1)+'</span>'+
    '<img class="avatar" src="'+F.avatarSrc(c.name)+'" alt="">'+
    '<span class="grow"><span class="title" style="display:block">'+F.esc(c.name)+'</span>'+
    '<span class="sub">'+c.orders+' pesanan</span></span>'+
    '<span class="amount">'+F.esc(F.formatCurrencyValue(c.total))+"</span></div>").join("");
  $("#topEmpty").classList.toggle("hidden", top.length>0);
  F.refreshIcons();
}
/* Produk Digital: ringkasan buku produkDigital (terpisah dari kas jasa edit).
   Total mengikuti cara hitung halaman Produk Digital: hanya produk katalog. */
function produkTotals(){
  const entries=F.getProdukDigital();
  const per=F.PRODUK_DIGITAL_PRODUCTS.map((p,i)=>{
    const list=entries.filter(e=> e.product===p.id);
    return { id:p.id, label:p.label, color:PALETTE[i%PALETTE.length],
      qty:list.reduce((s,e)=> s+(Number(e.qty)||0),0),
      amount:list.reduce((s,e)=> s+(Number(e.amount)||0),0) };
  });
  return { entries, per,
    qty:per.reduce((s,v)=> s+v.qty,0),
    amount:per.reduce((s,v)=> s+v.amount,0) };
}
let pdChartInst=null;
function renderProdukChart(t){
  const canvas=$("#pdChart"), empty=$("#pdDashChartEmpty"), wrap=$("#pdDashDonut"),
        legend=$("#pdChartLegend"), cc=$("#pdChartCenter");
  if(!canvas) return;
  t=t||produkTotals();
  const data=t.per.filter(v=> v.amount>0);
  if(!data.length || !window.Chart){
    canvas.style.display="none";
    if(wrap) wrap.classList.add("hidden");
    if(legend) legend.classList.add("hidden");
    if(cc) cc.classList.add("hidden");
    if(pdChartInst){ pdChartInst.destroy(); pdChartInst=null; }
    if(empty){ empty.classList.remove("hidden");
      empty.querySelector("p").textContent=!window.Chart? "Grafik tidak tersedia saat offline." : "Belum ada pendapatan produk digital."; }
    return;
  }
  canvas.style.display="";
  if(wrap) wrap.classList.remove("hidden");
  if(empty) empty.classList.add("hidden");
  if(pdChartInst){ pdChartInst.destroy(); pdChartInst=null; }
  pdChartInst=new window.Chart(canvas.getContext("2d"), {
    type:"doughnut",
    data:{ labels:data.map(v=> v.label),
      datasets:[{ data:data.map(v=> v.amount),
        backgroundColor:data.map(v=> v.color),
        borderWidth:2, borderColor:getComputedStyle(document.documentElement).getPropertyValue("--surface")||"#fff" }]},
    options:{ responsive:true, maintainAspectRatio:false, cutout:"68%", animation:{ duration:900, easing:"easeOutQuart", animateScale:true, animateRotate:true },
      plugins:{ legend:{ display:false },
        tooltip:{ callbacks:{ label(ctx){
          const v=data[ctx.dataIndex];
          return " "+ctx.label+": "+F.formatCurrencyValue(ctx.parsed)+" ("+v.qty+" unit)";
        } } } } }
  });
  if(legend){
    legend.innerHTML=data.map((v,i)=> `<span style="animation-delay:${i*45}ms"><span class="dot" style="background:${v.color}"></span>${F.esc(v.label)} <span class="val">${F.esc(F.formatCurrencyValue(v.amount))}</span></span>`).join("");
    legend.classList.remove("hidden");
  }
  if(cc){
    $("#pdChartCenterVal").textContent=F.formatCurrencyValue(t.amount);
    cc.classList.remove("hidden");
  }
}
function renderProduk(){
  const grid=$("#pdDashGrid"), empty=$("#pdDashEmpty");
  if(!grid) return;
  let t=null;
  try{ t=produkTotals(); }catch(e){ t=null; }
  if(!t || !t.entries.length){
    grid.classList.add("hidden");
    if(empty) empty.classList.remove("hidden");
    return;
  }
  grid.classList.remove("hidden");
  if(empty) empty.classList.add("hidden");
  $("#pdDashTotal").textContent=F.formatCurrencyValue(t.amount);
  $("#pdDashUnits").textContent=String(t.qty);
  $("#pdDashTx").textContent=String(t.entries.length);
  $("#pdDashRows").innerHTML=t.per.map(v=>
    '<div class="rank-row"><span class="pd-dot" style="background:'+v.color+'"></span>'+
    '<span class="grow"><span class="title" style="display:block">'+F.esc(v.label)+'</span>'+
    '<span class="sub">'+v.qty+' unit terjual</span></span>'+
    '<span class="amount num">'+F.esc(F.formatCurrencyValue(v.amount))+"</span></div>").join("");
  renderProdukChart(t);
}
function render(){
  renderSummary();
  renderRecent();
  renderTrend();
  renderChart();
  renderInsight();
  renderProduk();
}
document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    render();
    window.__refreshPage=render;
    window.__onThemeChange=()=>{ renderChart(); renderTrend(); renderProdukChart(); };
    $("#dashAddBtn").addEventListener("click", ()=> F.openOrderModal(null, render));
    const eb=$("#emptyAddBtn"); if(eb) eb.addEventListener("click", ()=> F.openOrderModal(null, render));
    $("#chartModeOrders").addEventListener("click", ()=>{ chartMode="orders"; $("#chartModeOrders").classList.add("active"); $("#chartModeRevenue").classList.remove("active"); renderChart(); });
    $("#chartModeRevenue").addEventListener("click", ()=>{ chartMode="revenue"; $("#chartModeRevenue").classList.add("active"); $("#chartModeOrders").classList.remove("active"); renderChart(); });
  }catch(e){
    const err=$("#dashError"); if(err){ err.classList.add("show"); err.textContent="Data belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
