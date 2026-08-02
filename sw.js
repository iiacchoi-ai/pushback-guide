const C="pushback-v83";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(["./","./gates.js","./manifest.json","./icon-192.png"]))); self.skipWaiting();});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))); self.clients.claim();});
self.addEventListener("fetch",e=>{
  e.respondWith(fetch(e.request).then(r=>{const cl=r.clone(); caches.open(C).then(c=>c.put(e.request,cl)); return r;})
  .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(m=>m||caches.match("./"))));
});