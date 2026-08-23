const C="pushback-v143";
const SHELL=["./","./index.html","./gates.js","./manifest.json","./icon-192.png"];

self.addEventListener("install", e=>{
  // 앱 파일은 캐시를 무시하고 항상 새로 받아 저장
  e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:"reload"})))));
  self.skipWaiting();
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));
});
self.addEventListener("message", e=>{ if(e.data==="skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;
  e.respondWith(
    fetch(e.request).then(r=>{
      const cl=r.clone();
      caches.open(C).then(c=>c.put(e.request,cl));
      return r;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(m=>m||caches.match("./")))
  );
});
