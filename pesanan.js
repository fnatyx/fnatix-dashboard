/* Pesanan: toolbar pencarian + filter kategori, ringkasan, dan tabel kas semua pesanan. */
(function(){
"use strict";
const F=window.F, $=F.$;
let query="";
let catFilter="";
let visibleCount=0;
const isMobile=()=> window.matchMedia("(max-width: 767px)").matches;
const step=()=> isMobile()? 5 : 20;

function syncCategoryFilter(){
  const sel=$("#orderCategoryFilter");
  if(!sel) return;
  const cur=sel.value;
  const cats=F.getCategories();
  sel.innerHTML='<option value="">Semua Layanan</option>'+cats.map(c=> '<option value="'+F.esc(c)+'">'+F.esc(c)+'</option>').join("");
  if(cats.includes(cur)) sel.value=cur; else catFilter="";
}

function filtered(){
  let txs=F.getTransactions().slice().sort((a,b)=> String(b.date).localeCompare(String(a.date)));
  if(catFilter) txs=txs.filter(t=> String(t.category||"")===catFilter);
  if(query) txs=txs.filter(t=>
    String(t.name||"").toLowerCase().includes(query) ||
    String(t.category||"").toLowerCase().includes(query) ||
    String(t.phone||"").includes(query));
  return txs;
}

function render(){
  syncCategoryFilter();
  const list=filtered();
  if(visibleCount<=0) visibleCount=step();
  const body=$("#transactionTableBody");
  body.innerHTML=list.slice(0, visibleCount).map(t=> F.txTableRowHTML(t)).join("");
  $("#ordersTableWrap").classList.toggle("hidden", list.length===0);
  $("#ordersEmpty").classList.toggle("hidden", list.length>0);
  $("#loadMoreRow").classList.toggle("hidden", !(list.length>visibleCount && !isMobile()));
  $("#orderCount").textContent=list.length+" pesanan tercatat";

  const totalAmt=list.reduce((s,t)=> s+(Number(t.price)||0), 0);
  const avgAmt=list.length? Math.round(totalAmt/list.length) : 0;
  const sc=$("#ordSummaryCount"); if(sc) sc.textContent=String(list.length);
  const st=$("#ordSummaryTotal"); if(st) st.textContent=F.formatCurrencyValue(totalAmt);
  const sa=$("#ordSummaryAvg"); if(sa) sa.textContent=F.formatCurrencyValue(avgAmt);

  F.bindTxActions(body);
  F.refreshIcons();
}

function loadMore(){
  visibleCount+=step();
  render();
}

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    document.body.classList.remove("is-data-loading");
    render();
    window.__refreshPage=()=>{ render(); };
    $("#orderSearch").addEventListener("input", e=>{ query=e.target.value.trim().toLowerCase(); visibleCount=step(); render(); });
    $("#orderCategoryFilter").addEventListener("change", e=>{ catFilter=e.target.value; visibleCount=step(); render(); });
    $("#addOrderBtn").addEventListener("click", ()=> F.openOrderModal(null, render));
    const eb=$("#emptyAddBtn"); if(eb) eb.addEventListener("click", ()=> F.openOrderModal(null, render));
    $("#manageCategoryButton").addEventListener("click", ()=> F.openCategoryManager(render));
    $("#loadMoreOrdersBtn").addEventListener("click", loadMore);
    let ticking=false;
    window.addEventListener("scroll", ()=>{
      if(!isMobile() || ticking) return;
      ticking=true;
      requestAnimationFrame(()=>{
        ticking=false;
        const list=filtered();
        if(visibleCount<list.length && window.innerHeight+window.scrollY>=document.body.scrollHeight-320) loadMore();
      });
    }, { passive:true });
    const params=new URLSearchParams(location.search);
    const cn=params.get("customerName"), cp=params.get("customerPhone");
    if(cn){
      F.openOrderModal({ name:cn, phone:cp||"", category:F.getCategories()[0], price:"", date:F.localDateKey() }, render);
      history.replaceState(null, "", location.pathname);
    }
  }catch(e){
    document.body.classList.remove("is-data-loading");
    const err=$("#ordError"); if(err){ err.classList.add("show"); err.textContent="Data pesanan belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
