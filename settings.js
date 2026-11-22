/* Pengaturan — profil bisnis: logo, nama, kontak, mata uang, format tanggal */
(function(){
"use strict";
const F=window.F, $=F.$;
let tempLogo=null; // null = tidak berubah, "" = dihapus, string = logo baru

document.addEventListener("DOMContentLoaded", async ()=>{
  try{
    await F.dataReady;
    const p=F.getBusinessProfile();
    $("#settingsBusinessName").value=p.businessName||"";
    $("#settingsContactPhone").value=p.contactPhone||"";
    $("#settingsContactEmail").value=p.contactEmail||"";
    $("#settingsCurrency").value=p.currency||"IDR";
    $("#settingsDateFormat").value=p.dateFormat||"id-long";
    $("#settingsLogoPreview").src=p.logo||"logo.png";
    tempLogo=null;

    $("#settingsLogoInput").addEventListener("change", e=>{
      const file=e.target.files[0]; if(!file) return;
      if(file.size>500*1024){ F.showToast("Ukuran logo melebihi 500 KB", "error"); e.target.value=""; return; }
      const reader=new FileReader();
      reader.onload=()=>{ tempLogo=String(reader.result); $("#settingsLogoPreview").src=tempLogo; };
      reader.readAsDataURL(file);
    });
    $("#settingsLogoRemove").addEventListener("click", ()=>{
      tempLogo="";
      $("#settingsLogoPreview").src="logo.png";
      F.showToast("Logo akan dihapus setelah disimpan");
    });
    $("#settingsProfileForm").addEventListener("submit", e=>{
      e.preventDefault();
      const cur=F.getBusinessProfile();
      const next={
        businessName:$("#settingsBusinessName").value.trim()||cur.businessName||"Fnatix ID",
        contactPhone:$("#settingsContactPhone").value.trim(),
        contactEmail:$("#settingsContactEmail").value.trim(),
        logo: tempLogo===null? (cur.logo||"") : tempLogo,
        currency:$("#settingsCurrency").value,
        dateFormat:$("#settingsDateFormat").value
      };
      F.setData("fnatixBusinessProfile", next);
      F.logActivity("Memperbarui pengaturan bisnis", "settings", "settings");
      if(F.applyBusinessBranding) F.applyBusinessBranding();
      if(window.__syncNotifBadge) window.__syncNotifBadge();
      const hint=$("#settingsSavedHint"); hint.style.display="block";
      F.showToast("Pengaturan tersimpan");
      setTimeout(()=>{ hint.style.display="none"; }, 5000);
    });
  }catch(e){
    const err=$("#setError"); if(err){ err.style.display="block"; err.textContent="Pengaturan belum bisa dimuat. Periksa koneksi lalu muat ulang halaman."; }
  }
});
})();
