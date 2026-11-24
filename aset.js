/* Aset & Pricelist: galeri aset, CRUD, pricelist, ekspor teks/gambar. */
(function(){
"use strict";
const F=window.F, $=F.$, $$=F.$$;
let assetFilter="all";
let priceQuery="";
let tempImage="";

function compressImage(file){
  return new Promise((resolve, reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{
      const max=1280;
      let w=img.naturalWidth, h=img.naturalHeight;
      const scale=Math.min(1, max/Math.max(w,h));
      w=Math.round(w*scale); h=Math.round(h*scale);
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      let out=c.toDataURL("image/jpeg", 0.87);
      if(file.type==="image/png"){
        const png=c.toDataURL("image/png");
        if(png.length<2.8*1024*1024) out=png;
      }
      resolve(out);
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error("img")); };
    img.src=url;
  });
}
const TYPE_LABEL={ logo:"Logo", qris:"QRIS", lainnya:"Lainnya" };

function renderAssets(){
  const list=F.getAssets().filter(a=> assetFilter==="all" || a.type===assetFilter);
  const box=$("#assetGrid");
  $("#assetEmpty").classList.toggle("hidden", list.length>0);
  box.innerHTML=list.map(a=> `
    <article class="asset-card">
      <div class="thumb"><img src="${a.image}" alt="${F.esc(a.title)}"></div>
      <div class="meta">
        <span class="tag ${a.type==="qris"?"tag-azure":""}" style="align-self:flex-start">${TYPE_LABEL[a.type]||"Lainnya"}</span>
        <span class="name">${F.esc(a.title)}</span>
        ${a.note? `<span class="note">${F.esc(a.note)}</span>`:""}
      </div>
      <div class="acts">
        <button type="button" class="icon-btn" data-asset-preview="${a.id}" aria-label="Pratinjau ${F.esc(a.title)}">${F.icon("eye","icon-sm")}</button>
        <button type="button" class="icon-btn" data-asset-edit="${a.id}" aria-label="Edit ${F.esc(a.title)}">${F.icon("pencil","icon-sm")}</button>
        <button type="button" class="icon-btn" data-action="use-logo" data-asset-logo="${a.id}" aria-label="Pakai ${F.esc(a.title)} sebagai logo bisnis">${F.icon("badge-check","icon-sm")}</button>
        <button type="button" class="icon-btn danger" data-asset-del="${a.id}" aria-label="Hapus ${F.esc(a.title)}">${F.icon("trash-2","icon-sm")}</button>
      </div>
    </article>`).join("");
  $$("[data-asset-preview]",box).forEach(b=> b.addEventListener("click", ()=> previewAsset(b.dataset.assetPreview)));
  $$("[data-asset-edit]",box).forEach(b=> b.addEventListener("click", ()=> openAssetModal(F.getAssets().find(a=> a.id===b.dataset.assetEdit))));
  $$("[data-asset-logo]",box).forEach(b=> b.addEventListener("click", ()=>{
    const a=F.getAssets().find(x=> x.id===b.dataset.assetLogo); if(!a) return;
    const p=F.getBusinessProfile(); p.logo=a.image;
    F.setData("fnatixBusinessProfile", p);
    if(F.applyBusinessBranding) F.applyBusinessBranding();
    F.showToast("Logo bisnis diganti dari aset "+a.title);
  }));
  $$("[data-asset-del]",box).forEach(b=> b.addEventListener("click", async ()=>{
    const a=F.getAssets().find(x=> x.id===b.dataset.assetDel); if(!a) return;
    const ok=await F.showActionConfirm({ title:"Hapus Aset", message:"Aset "+a.title+" akan dihapus permanen.", confirmLabel:"Ya, hapus aset", danger:true });
    if(!ok) return;
    F.saveAssets(F.getAssets().filter(x=> x.id!==a.id));
    F.showToast("Aset dihapus"); renderAssets();
  }));
  F.refreshIcons();
}
function previewAsset(id){
  const a=F.getAssets().find(x=> x.id===id); if(!a) return;
  const ov=F.openModal(`
    ${F.modalHead(a.title)}
    <img src="${a.image}" alt="${F.esc(a.title)}" style="width:100%; border-radius:10px; border:1px solid var(--hair)">
    ${a.note? `<p class="muted" style="margin-top:10px">${F.esc(a.note)}</p>`:""}
    <div class="modal-actions">
      <button type="button" class="btn btn-secondary" data-close-modal>Tutup</button>
      <button type="button" class="btn btn-primary" id="assetDownload">Unduh</button>
    </div>`);
  $("#assetDownload",ov).addEventListener("click", ()=>{
    const link=document.createElement("a"); link.href=a.image; link.download=a.title.replace(/\s+/g,"-").toLowerCase(); link.click();
  });
}
function openAssetModal(asset){
  const isEdit=!!asset;
  tempImage=asset? asset.image : "";
  const ov=F.openModal(`
    ${F.modalHead(isEdit?"Edit Aset":"Tambah Aset")}
    <form id="assetForm">
      <div class="grid-2">
        <div class="field"><label for="assetType">Jenis</label>
          <select class="control" id="assetType">
            <option value="logo" ${asset&&asset.type==="logo"?"selected":""}>Logo</option>
            <option value="qris" ${asset&&asset.type==="qris"?"selected":""}>QRIS</option>
            <option value="lainnya" ${asset&&asset.type==="lainnya"?"selected":""}>Lainnya</option>
          </select>
        </div>
        <div class="field"><label for="assetTitle">Nama</label><input class="control" id="assetTitle" value="${F.esc(asset?asset.title:"")}" placeholder="Nama aset"></div>
      </div>
      <div class="field"><label for="assetNote">Catatan (opsional)</label><input class="control" id="assetNote" value="${F.esc(asset?asset.note||"":"")}" placeholder="Catatan singkat"></div>
      <div class="field"><label>Gambar</label>
        <div class="drop-zone" id="dropZone" tabindex="0" role="button" aria-label="Unggah gambar aset">
          ${tempImage? `<img src="${tempImage}" alt="Pratinjau aset">` : "Klik atau seret gambar ke sini. PNG, JPG, WebP, maksimal 3 MB."}
        </div>
        <input type="file" id="assetFile" accept="image/png,image/jpeg,image/webp" class="hidden">
      </div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Batal</button>
      <button type="submit" class="btn btn-primary">${isEdit?"Simpan Perubahan":"Tambah Aset"}</button></div>
    </form>`);
  const dz=$("#dropZone",ov), fileInput=$("#assetFile",ov);
  const setFile=async (file)=>{
    if(!file) return;
    if(file.size>3*1024*1024){ F.showToast("Ukuran gambar melebihi 3 MB", "error"); return; }
    try{ tempImage=await compressImage(file); dz.innerHTML=`<img src="${tempImage}" alt="Pratinjau aset">`; }
    catch(e){ F.showToast("Gambar tidak bisa dibaca", "error"); }
  };
  dz.addEventListener("click", ()=> fileInput.click());
  dz.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" "){ e.preventDefault(); fileInput.click(); } });
  fileInput.addEventListener("change", ()=> setFile(fileInput.files[0]));
  dz.addEventListener("dragover", e=>{ e.preventDefault(); dz.classList.add("drag"); });
  dz.addEventListener("dragleave", ()=> dz.classList.remove("drag"));
  dz.addEventListener("drop", e=>{ e.preventDefault(); dz.classList.remove("drag"); setFile(e.dataTransfer.files[0]); });
  $("#assetForm",ov).addEventListener("submit", e=>{
    e.preventDefault();
    const title=$("#assetTitle",ov).value.trim();
    if(!title){ F.showToast("Nama aset wajib diisi", "error"); return; }
    if(!tempImage){ F.showToast("Pilih gambar dulu", "error"); return; }
    const rec={ id: asset? asset.id : F.uid(), type:$("#assetType",ov).value, title, note:$("#assetNote",ov).value.trim(), image:tempImage };
    const list=F.getAssets();
    if(isEdit){ const i=list.findIndex(a=> a.id===asset.id); if(i>-1) list[i]=rec; }
    else list.unshift(rec);
    F.saveAssets(list);
    F.closeModal(); F.showToast(isEdit?"Aset diperbarui":"Aset ditambahkan");
    renderAssets();
  });
}

function groupedPrices(){
  const items=F.getPricelist().filter(p=> !priceQuery || String(p.name||"").toLowerCase().includes(priceQuery));
  const cats=F.getCategories();
  const order=[]; const map=new Map();
  items.forEach(p=>{
    const c=p.category||"Lainnya";
    if(!map.has(c)){ map.set(c,[]); order.push(c); }
    map.get(c).push(p);
  });
  order.sort((a,b)=>{
    const ia=cats.indexOf(a), ib=cats.indexOf(b);
    return (ia<0?99:ia)-(ib<0?99:ib);
  });
  return order.map(c=> ({ category:c, items:map.get(c) }));
}
function renderPrices(){
  const groups=groupedPrices();
  const total=F.getPricelist().length;
  $("#priceEmpty").classList.toggle("hidden", total>0);
  $("#priceExportCard").classList.toggle("hidden", total===0);
  $("#priceList").innerHTML=groups.map(g=> `
    <div class="group-label">${F.esc(g.category)}</div>
    <div class="ledger">
      ${g.items.map(p=> `
      <div class="lrow" style="padding-left:0; padding-right:0">
        <div class="grow"><div class="title">${F.esc(p.name)}</div>${p.note? `<div class="sub">${F.esc(p.note)}</div>`:""}</div>
        <span class="amount num">${F.esc(F.formatCurrencyValue(p.price))}</span>
        <div class="row-actions">
          <button type="button" class="icon-btn" data-price-edit="${p.id}" aria-label="Edit harga ${F.esc(p.name)}">${F.icon("pencil","icon-sm")}</button>
          <button type="button" class="icon-btn danger" data-price-del="${p.id}" aria-label="Hapus harga ${F.esc(p.name)}">${F.icon("trash-2","icon-sm")}</button>
        </div>
      </div>`).join("")}
    </div>`).join("");
  $$("[data-price-edit]").forEach(b=> b.addEventListener("click", ()=> openPriceModal(F.getPricelist().find(p=> p.id===b.dataset.priceEdit))));
  $$("[data-price-del]").forEach(b=> b.addEventListener("click", async ()=>{
    const p=F.getPricelist().find(x=> x.id===b.dataset.priceDel); if(!p) return;
    const ok=await F.showActionConfirm({ title:"Hapus Harga", message:"Layanan "+p.name+" akan dihapus dari pricelist.", confirmLabel:"Ya, hapus harga", danger:true });
    if(!ok) return;
    F.savePricelist(F.getPricelist().filter(x=> x.id!==p.id));
    F.showToast("Harga dihapus"); renderPrices();
  }));
  F.refreshIcons();
}
function openPriceModal(item){
  const isEdit=!!item;
  const cats=F.getCategories();
  const ov=F.openModal(`
    ${F.modalHead(isEdit?"Edit Harga":"Tambah Harga")}
    <form id="priceForm">
      <div class="field"><label for="priceCategory">Kategori</label>
        <select class="control" id="priceCategory">${cats.map(c=> `<option value="${F.esc(c)}" ${item&&item.category===c?"selected":""}>${F.esc(c)}</option>`).join("")}</select></div>
      <div class="field"><label for="priceName">Nama Layanan</label><input class="control" id="priceName" value="${F.esc(item?item.name:"")}" placeholder="Nama layanan"></div>
      <div class="grid-2">
        <div class="field"><label for="priceValue">Harga (Rp)</label><input class="control num" type="number" id="priceValue" min="0" step="1000" value="${item? F.esc(item.price):""}" placeholder="50000"></div>
        <div class="field"><label for="priceNote">Keterangan (opsional)</label><input class="control" id="priceNote" value="${F.esc(item?item.note||"":"")}" placeholder="Mulai dari, per foto, dsb."></div>
      </div>
      <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close-modal>Batal</button>
      <button type="submit" class="btn btn-primary">${isEdit?"Simpan Perubahan":"Tambah Harga"}</button></div>
    </form>`);
  $("#priceForm",ov).addEventListener("submit", e=>{
    e.preventDefault();
    const name=$("#priceName",ov).value.trim();
    const price=Number($("#priceValue",ov).value);
    if(!name||!(price>=0)||$("#priceValue",ov).value===""){ F.showToast("Nama layanan dan harga wajib diisi dengan benar", "error"); return; }
    const rec={ id: item? item.id : F.uid(), category:$("#priceCategory",ov).value, name, price, note:$("#priceNote",ov).value.trim() };
    const list=F.getPricelist();
    if(isEdit){ const i=list.findIndex(p=> p.id===item.id); if(i>-1) list[i]=rec; }
    else list.push(rec);
    F.savePricelist(list);
    F.closeModal(); F.showToast(isEdit?"Harga diperbarui":"Harga ditambahkan");
    renderPrices();
  });
}
function buildPricelistText(){
  const p=F.getBusinessProfile();
  const lines=["Pricelist "+String(p.businessName||"FNATIX ID").toUpperCase(), ""];
  groupedPrices().forEach(g=>{
    lines.push(g.category);
    g.items.forEach(it=> lines.push("- "+it.name+": "+F.formatCurrencyValue(it.price)+(it.note? " ("+it.note+")":"")));
    lines.push("");
  });
  lines.push("Order lewat WhatsApp"+(p.contactPhone? " "+p.contactPhone:"")+".");
  return lines.join("\n");
}

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    document.body.classList.remove("is-data-loading");
    renderAssets(); renderPrices();
    window.__refreshPage=()=>{ renderAssets(); renderPrices(); };
    $$("#assetFilter [data-filter]").forEach(b=> b.addEventListener("click", ()=>{
      assetFilter=b.dataset.filter;
      $$("#assetFilter [data-filter]").forEach(x=> x.classList.toggle("active", x===b));
      renderAssets();
    }));
    $("#addAssetBtn").addEventListener("click", ()=> openAssetModal(null));
    $("#addPriceBtn").addEventListener("click", ()=> openPriceModal(null));
    $("#priceSearch").addEventListener("input", e=>{ priceQuery=e.target.value.trim().toLowerCase(); renderPrices(); });
    $("#copyPriceBtn").addEventListener("click", async ()=>{
      try{ await navigator.clipboard.writeText(buildPricelistText()); F.showToast("Teks pricelist disalin"); }
      catch(e){ F.showToast("Gagal menyalin teks", "error"); }
    });
    $("#downloadPriceBtn").addEventListener("click", async ()=>{
      try{
        if(!window.html2canvas) throw new Error("lib");
        const bg=(getComputedStyle(document.documentElement).getPropertyValue("--surface")||"#FCFBF8").trim();
        const canvas=await window.html2canvas($("#priceExportCard"), { backgroundColor:bg, scale:2 });
        const a=document.createElement("a"); a.href=canvas.toDataURL("image/png"); a.download="pricelist-fnatix-id.png"; a.click();
        F.showToast("Gambar pricelist diunduh");
      }catch(e){ F.showToast("Unduh gambar belum bisa dijalankan, library belum termuat", "error"); }
    });
  }catch(e){
    document.body.classList.remove("is-data-loading");
    const err=$("#assetError"); if(err){ err.classList.add("show"); err.textContent="Data aset belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
