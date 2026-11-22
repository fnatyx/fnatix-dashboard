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
function freelanceLatestNet(){
  const entries=F.getFreelanceIncome().slice().sort((a,b)=> String(b.month).localeCompare(String(a.month)));
  if(!entries.length) return null;
  const latest=entries[0];
  const files=F.getFreelanceOrders().filter(o=> String(o.date||"").slice(0,7)===latest.month).length;
  const target=F.getFreelanceTarget();
  const cut=files<target? 50:40;
  const gross=Number(latest.gross)||0;
  return { entry:latest, files, target, cut, gross, net:Math.round(gross*(100-cut)/100) };
}
function renderSummary(){
  const mk=F.localMonthKey();
  const now=new Date(); const prevDate=new Date(now.getFullYear(), now.getMonth()-1, 1);
  const pmk=F.localMonthKey(prevDate);
  const txs=F.getTransactions();
  const monthTx=txs.filter(t=> String(t.date||"").slice(0,7)===mk);
  const prevTx=txs.filter(t=> String(t.date||"").slice(0,7)===pmk);
  const income=sumTx(monthTx), prevIncome=sumTx(prevTx);
  const dp=$("#dashPeriod"); if(dp) dp.textContent=F.monthLabel(mk);
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
  $("#rowGrand").textContent=F.formatCurrencyValue(income + (fl? fl.net:0));
  const hs=$("#heroStoreVal"); if(hs) hs.textContent=F.formatCurrencyValue(income);
  const hf=$("#heroFlVal"); if(hf) hf.textContent=F.formatCurrencyValue(fl? fl.net : 0);
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
  const has=sums.some(v=> v>0);
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
  trendInst=new window.Chart(ctx, { type:"line",
    data:{ labels:sums.map((_,i)=> String(i+1)),
      datasets:[{ data:sums, borderColor:"#F471B5", backgroundColor:fill, fill:true, tension:.4,
        pointRadius:0, pointHoverRadius:4, pointBackgroundColor:"#A78BFA", borderWidth:2 }] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false },
        tooltip:{ callbacks:{ title(items){ return "Tanggal "+(items[0]? items[0].label : ""); },
          label(c){ return " "+F.formatCurrencyValue(c.parsed.y); } } } },
      scales:{ x:{ grid:{ display:false }, ticks:{ color:tick, font:{ family:"Plus Jakarta Sans", size:11 }, maxTicksLimit:10 } },
        y:{ grid:{ color:grid }, border:{ display:false }, ticks:{ color:tick, font:{ family:"Plus Jakarta Sans", size:11 }, maxTicksLimit:5,
          callback:v=> "Rp"+Number(v).toLocaleString("id-ID") } } } } });
}
function renderInsight(){
  const mk=F.localMonthKey();
  const txs=F.getTransactions();
  const monthTx=txs.filter(t=> String(t.date||"").slice(0,7)===mk);
  const box=$("#dashboardInsight");
  if(!monthTx.length){
    box.innerHTML='<div class="insight-line">'+F.icon("activity")+"<span>Belum ada data bulan ini. Insight muncul setelah ada pesanan tercatat.</span></div>";
  } else {
    const byCat=new Map();
    monthTx.forEach(t=> byCat.set(t.category||"Lainnya", (byCat.get(t.category||"Lainnya")||0)+1));
    const topCat=Array.from(byCat.entries()).sort((a,b)=> b[1]-a[1])[0];
    const customers=F.buildCustomers();
    const repeat=customers.filter(c=> c.orders>=2).length;
    const avg=Math.round(sumTx(monthTx)/monthTx.length);
    const biggest=customers[0];
    const lines=[
      { icon:"crown", text:"Layanan terlaris bulan ini: "+topCat[0]+" ("+topCat[1]+" pesanan)." },
      { icon:"repeat", text:repeat+" customer sudah repeat order dari total "+customers.length+" customer." },
      { icon:"calculator", text:"Rata-rata nilai pesanan bulan ini "+F.formatCurrencyValue(avg)+"." },
      { icon:"trophy", text:biggest? "Customer terbesar: "+biggest.name+" dengan total "+F.formatCurrencyValue(biggest.total)+"." : "Belum ada customer tercatat." }
    ];
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
function render(){
  renderSummary();
  renderRecent();
  renderTrend();
  renderChart();
  renderInsight();
}
document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    $("#dashDate").textContent=new Date().toLocaleDateString("id-ID",{ weekday:"long", day:"numeric", month:"long", year:"numeric" });
    await F.dataReady;
    render();
    window.__refreshPage=render;
    window.__onThemeChange=()=>{ renderChart(); renderTrend(); };
    $("#dashAddBtn").addEventListener("click", ()=> F.openOrderModal(null, render));
    const eb=$("#emptyAddBtn"); if(eb) eb.addEventListener("click", ()=> F.openOrderModal(null, render));
    $("#globalSearchBtn").addEventListener("click", ()=> F.openGlobalSearch());
    $("#chartModeOrders").addEventListener("click", ()=>{ chartMode="orders"; $("#chartModeOrders").classList.add("active"); $("#chartModeRevenue").classList.remove("active"); renderChart(); });
    $("#chartModeRevenue").addEventListener("click", ()=>{ chartMode="revenue"; $("#chartModeRevenue").classList.add("active"); $("#chartModeOrders").classList.remove("active"); renderChart(); });
  }catch(e){
    const err=$("#dashError"); if(err){ err.classList.add("show"); err.textContent="Data belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
