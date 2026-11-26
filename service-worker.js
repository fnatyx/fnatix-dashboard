/* FNATIX ID: service worker. Network-first, cache fnatix-fincro-v14. */
const CACHE = "fnatix-fincro-v14";
const ASSETS = [
  "./", "index.html", "pesanan.html", "customers.html", "laporan.html",
  "freelance.html", "produk-digital.html", "aset.html", "settings.html", "sistem-fnatix.html",
  "style.css?v=lg9", "refraction.js?v=lg9", "core.js?v=lg9", "dashboard.js", "pesanan.js", "customers.js",
  "laporan.js", "freelance.js", "produk-digital.js", "aset.js", "settings.js",
  "supabase-config.js", "auth-gate.js",
  "fonts/pjs-var-latin.woff2", "fonts/pjs-var-latin-ext.woff2", "fonts/InstrumentSerif-Regular.woff2", "fonts/InstrumentSerif-Italic.woff2",
  "icon-192.png", "apple-touch-icon.png", "logo.png", "logo-glyph.png", "logo-maskable.png", "favicon.ico", "manifest.json",
  "splash-icon.png",
  "assets/avatars/a01.webp", "assets/avatars/a02.webp", "assets/avatars/a03.webp", "assets/avatars/a04.webp",
  "assets/avatars/a05.webp", "assets/avatars/a06.webp", "assets/avatars/a07.webp", "assets/avatars/a08.webp",
  "assets/avatars/a09.webp", "assets/avatars/a10.webp", "assets/avatars/a11.webp", "assets/avatars/a12.webp",
  "assets/avatars/a13.webp", "assets/avatars/a14.webp", "assets/avatars/a15.webp", "assets/avatars/a16.webp"
];
self.addEventListener("install", e=>{
  e.waitUntil(caches.open(CACHE).then(c=> c.addAll(ASSETS)).then(()=> self.skipWaiting()));
});
self.addEventListener("activate", e=>{
  e.waitUntil(
    caches.keys().then(keys=> Promise.all(keys.filter(k=> k !== CACHE).map(k=> caches.delete(k))))
      .then(()=> self.clients.claim())
  );
});
self.addEventListener("fetch", e=>{
  const req = e.request;
  if(req.method !== "GET") return;
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  e.respondWith(
    fetch(sameOrigin? new Request(req, { cache: "no-cache" }) : req).then(res=>{
      const copy = res.clone();
      if(res.ok && sameOrigin){
        caches.open(CACHE).then(c=> c.put(req, copy));
      }
      return res;
    }).catch(()=>
      caches.match(req).then(hit=> hit || (req.mode === "navigate"? caches.match("index.html") : Promise.reject(new Error("offline"))))
    )
  );
});
