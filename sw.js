const C="pushback-v171";
const IMG="pushback-img";   // 도면·항공기 이미지 전용 캐시 — 앱 버전이 바뀌어도 유지
const SHELL=["./","./index.html","./gates.js","./manifest.json","./icon-192.png"];

self.addEventListener("install", e=>{
  // 앱 파일은 캐시를 무시하고 항상 새로 받아 저장
  e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:"reload"})))));
  self.skipWaiting();
});
self.addEventListener("activate", e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(
    k.filter(x=>x!==C && x!==IMG).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));
});
self.addEventListener("message", e=>{ if(e.data==="skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;
  if(new URL(e.request.url).origin!==location.origin) return;   // 외부 요청(통계 픽셀 등)은 관여·캐시하지 않음
  const isImg = e.request.url.includes("/img/");
  if(isImg && e.request.cache!=="reload"){
    // 도면: 저장본 우선 — 온라인이어도 데이터를 다시 쓰지 않음
    e.respondWith(caches.open(IMG).then(c=>
      c.match(e.request,{ignoreSearch:true}).then(m=> m ||
        fetch(e.request).then(r=>{ c.put(e.request,r.clone()); return r; }))));
    return;
  }
  // 앱 파일(및 '전체 도면 저장'의 강제 갱신): 네트워크 우선 — 개정이 즉시 반영
  e.respondWith(
    fetch(e.request).then(r=>{
      const cl=r.clone();
      caches.open(isImg?IMG:C).then(c=>c.put(e.request,cl));
      return r;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(m=>m||caches.match("./")))
  );
});
