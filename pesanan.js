/* Pesanan — satu lembar: toolbar + tabel kas semua pesanan.
   Di HP tabel menjadi baris dua baris (CSS), tetap satu kolom. */
(function(){
"use strict";
const F=window.F, $=F.$, $$=F.$$;
let query="";
let visibleCount=0;
const isMobile=()=> window.matchMedia("(max-width: 767px)").matches;
const step=()=> isMobile()? 5 : 20;

function filtered(){
  const txs=F.getTransactions().slice().sort((a,b)=> String(b.date).localeCompare(String(a.date)));
  if(!query) return txs;
  return txs.filter(t=>
    String(t.name||"").toLowerCase().includes(query) ||
    String(t.category||"").toLowerCase().includes(query) ||
    String(t.phone||"").includes(query));
}
function render(){
  const list=filtered();
  if(visibleCount<=0) visibleCount=step();
  const body=$("#transactionTableBody");
  body.innerHTML=list.slice(0, visibleCount).map(t=> F.txTableRowHTML(t)).join("");
  $("#ordersTableWrap").classList.toggle("hidden", list.length===0);
  $("#ordersEmpty").classList.toggle("hidden", list.length>0);
  $("#loadMoreRow").classList.toggle("hidden", !(list.length>visibleCount && !isMobile()));
  $("#orderCount").textContent=list.length+" pesanan tercatat";
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
    render();
    window.__refreshPage=()=>{ render(); };
    $("#orderSearch").addEventListener("input", e=>{ query=e.target.value.trim().toLowerCase(); visibleCount=step(); render(); });
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
    const err=$("#ordError"); if(err){ err.classList.add("show"); err.textContent="Data pesanan belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
