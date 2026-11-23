/* Produk digital: buku toko digital (key produkDigital), terpisah dari kas jasa edit dan freelance. */
(function(){
"use strict";
const F=window.F, $=F.$, $$=F.$$;
const PRODUCTS=F.PRODUK_DIGITAL_PRODUCTS;
const CHANNELS=["Lynk","PayPal","QRIS","WhatsApp","Lainnya"];
const ICONS={ relight:"sun", graduation:"graduation-cap", wedding:"heart", bundle:"package", poplab:"sparkles" };

function productOf(id){ return PRODUCTS.find(p=> p.id===id) || { id:id, label:id||"-", price:0 }; }
function totals(){
  const entries=F.getProdukDigital();
  const per={};
  PRODUCTS.forEach(p=>{ per[p.id]={ qty:0, amount:0 }; });
  entries.forEach(e=>{
    const k=per[e.product]? e.product : null;
    if(!k) return;
    per[k].qty += Number(e.qty)||0;
    per[k].amount += Number(e.amount)||0;
  });
  return { per, qty:Object.values(per).reduce((s,v)=> s+v.qty,0), amount:Object.values(per).reduce((s,v)=> s+v.amount,0) };
}

function renderSummary(){
  const t=totals();
  $("#pdProductGrid").innerHTML=PRODUCTS.map(p=>{
    const v=t.per[p.id];
    return '<div class="stat-card">'+
      '<div class="stat-top"><span class="stat-ic lav">'+F.icon(ICONS[p.id]||"package")+'</span></div>'+
      '<div class="stat-value num">'+F.esc(F.formatCurrencyValue(v.amount))+'</div>'+
      '<div class="stat-label">'+F.esc(p.label)+' , harga '+F.esc(F.formatCurrencyValue(p.price))+'</div>'+
      '<div class="stat-note">'+v.qty+' unit terjual</div>'+
    '</div>';
  }).join("");
  $("#pdGrandTotal").textContent=F.formatCurrencyValue(t.amount);
  $("#pdGrandQty").textContent=t.qty+" unit";
  F.refreshIcons();
}

function currentFilters(){
  return { q:($("#pdSearch").value||"").trim().toLowerCase(), product:$("#pdProductFilter").value||"" };
}
function renderList(){
  const f=currentFilters();
  let list=F.getProdukDigital().slice().sort((a,b)=> String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)));
  if(f.product) list=list.filter(e=> e.product===f.product);
  if(f.q) list=list.filter(e=> (productOf(e.product).label+" "+(e.channel||"")+" "+(e.note||"")).toLowerCase().includes(f.q));
  $("#pdEmpty").classList.toggle("hidden", list.length>0);
  $("#pdList").innerHTML=list.map(e=>{
    const p=productOf(e.product);
    return '<div class="lrow">'+
      '<div class="grow"><div class="title">'+F.esc(p.label)+'</div>'+
      '<div class="sub">'+F.esc(F.formatDateValue(e.date))+(e.channel? ' , '+F.esc(e.channel) : '')+(e.note? ' , '+F.esc(e.note) : '')+'</div></div>'+
      '<span class="tag tag-azure">'+(Number(e.qty)||0)+' unit</span>'+
      '<span class="amount num">'+F.esc(F.formatCurrencyValue(e.amount))+'</span>'+
      '<span class="row-actions">'+
        '<button type="button" class="icon-btn" data-pd-edit="'+F.esc(e.id)+'" aria-label="Edit penjualan '+F.esc(p.label)+'">'+F.icon("pencil","icon-sm")+'</button>'+
        '<button type="button" class="icon-btn danger" data-pd-del="'+F.esc(e.id)+'" aria-label="Hapus penjualan '+F.esc(p.label)+'">'+F.icon("trash-2","icon-sm")+'</button>'+
      '</span>'+
    '</div>';
  }).join("");
  $$("[data-pd-edit]", $("#pdList")).forEach(b=> b.addEventListener("click", ()=> openProdukModal(F.getProdukDigital().find(e=> e.id===b.dataset.pdEdit))));
  $$("[data-pd-del]", $("#pdList")).forEach(b=> b.addEventListener("click", async ()=>{
    const e=F.getProdukDigital().find(x=> x.id===b.dataset.pdDel); if(!e) return;
    const ok=await F.showActionConfirm({ title:"Hapus Penjualan", message:"Penjualan "+productOf(e.product).label+" senilai "+F.formatCurrencyValue(e.amount)+" akan dihapus dari buku produk digital.", confirmLabel:"Ya, hapus penjualan", danger:true });
    if(!ok) return;
    F.saveProdukDigital(F.getProdukDigital().filter(x=> x.id!==e.id));
    F.showToast("Penjualan produk digital dihapus");
    renderAll();
  }));
  F.refreshIcons();
}

function openProdukModal(entry){
  const isEdit=!!entry;
  const cur=entry || { product:PRODUCTS[0].id, qty:1, amount:PRODUCTS[0].price, date:F.localDateKey(), channel:"Lynk", note:"" };
  const ov=F.openModal(
    F.modalHead(isEdit? "Edit Penjualan" : "Tambah Penjualan", "Tercatat hanya di buku produk digital.")+
    '<form id="pdForm">'+
      '<div class="field"><label for="pdProduct">Produk</label><select class="control" id="pdProduct">'+
        PRODUCTS.map(p=> '<option value="'+p.id+'"'+(p.id===cur.product?" selected":"")+'>'+F.esc(p.label)+' , '+F.esc(F.formatCurrencyValue(p.price))+'</option>').join("")+'</select></div>'+
      '<div class="grid-2">'+
        '<div class="field"><label for="pdQty">Jumlah Unit</label><input class="control num" type="number" id="pdQty" min="1" max="1000" value="'+F.esc(cur.qty||1)+'"></div>'+
        '<div class="field"><label for="pdAmount">Total Harga (Rp)</label><input class="control num" type="number" id="pdAmount" min="0" step="500" value="'+F.esc(cur.amount==null?"":cur.amount)+'"><p class="hint">Terisi otomatis dari harga produk kali jumlah. Ubah manual bila perlu, misalnya penjualan direct dalam dolar.</p></div>'+
      '</div>'+
      '<div class="grid-2">'+
        '<div class="field"><label for="pdDate">Tanggal</label><input class="control" type="date" id="pdDate" value="'+F.esc(cur.date||F.localDateKey())+'"></div>'+
        '<div class="field"><label for="pdChannel">Kanal</label><select class="control" id="pdChannel">'+
          CHANNELS.concat(cur.channel && !CHANNELS.includes(cur.channel)? [cur.channel] : []).map(c=> '<option value="'+F.esc(c)+'"'+(c===cur.channel?" selected":"")+'>'+F.esc(c)+'</option>').join("")+'</select></div>'+
      '</div>'+
      '<div class="field"><label for="pdNote">Catatan</label><input class="control" id="pdNote" value="'+F.esc(cur.note||"")+'" placeholder="Catatan penjualan" autocomplete="off"></div>'+
      '<p class="error-text" id="pdFormError"></p>'+
      '<div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Batal</button>'+
      '<button type="submit" class="btn btn-primary">'+(isEdit? "Simpan Perubahan" : "Tambah Penjualan")+'</button></div>'+
    '</form>');
  const syncAmount=()=>{
    const p=productOf($("#pdProduct", ov).value);
    const qty=parseInt($("#pdQty", ov).value, 10);
    $("#pdAmount", ov).value=(p.price||0)*(qty>=1? qty : 0);
  };
  $("#pdProduct", ov).addEventListener("change", syncAmount);
  $("#pdQty", ov).addEventListener("input", syncAmount);
  $("#pdForm", ov).addEventListener("submit", e=>{
    e.preventDefault();
    const product=$("#pdProduct", ov).value;
    const qty=parseInt($("#pdQty", ov).value, 10);
    const amount=Number($("#pdAmount", ov).value);
    const date=$("#pdDate", ov).value || F.localDateKey();
    const channel=$("#pdChannel", ov).value;
    const note=$("#pdNote", ov).value.trim();
    const err=$("#pdFormError", ov);
    if(!(qty>=1)){ err.textContent="Jumlah unit wajib diisi, minimal 1."; return; }
    if(!(amount>=0) || $("#pdAmount", ov).value===""){ err.textContent="Total harga wajib diisi dengan angka yang valid."; return; }
    const list=F.getProdukDigital();
    if(isEdit){
      const i=list.findIndex(x=> x.id===entry.id);
      if(i>-1) list[i]=Object.assign({}, list[i], { product, qty, amount, date, channel, note });
      F.showToast("Penjualan diperbarui");
    }else{
      list.unshift({ id:F.uid(), product, qty, amount, date, channel, note });
      F.showToast("Penjualan produk digital ditambahkan");
    }
    F.saveProdukDigital(list);
    F.closeModal(ov);
    renderAll();
  });
  return ov;
}

function renderAll(){ renderSummary(); renderList(); }

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    $("#pdProductFilter").innerHTML='<option value="">Semua Produk</option>'+PRODUCTS.map(p=> '<option value="'+p.id+'">'+F.esc(p.label)+'</option>').join("");
    renderAll();
    window.__refreshPage=renderAll;
    $("#addProdukBtn").addEventListener("click", ()=> openProdukModal(null));
    $("#pdSearch").addEventListener("input", renderList);
    $("#pdProductFilter").addEventListener("change", renderList);
  }catch(e){
    const err=$("#pdError"); if(err){ err.style.display="block"; err.textContent="Data produk digital belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
