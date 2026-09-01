const C="pushback-v181";
const IMG="pushback-img";   // 도면·항공기 이미지 전용 캐시 — 앱 버전이 바뀌어도 유지
const VH="x-pb-ver";        // 저장된 도면이 '어느 앱 버전에서 받은 것인지' 표시
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

// 도면을 저장할 때 현재 앱 버전을 함께 새겨 둔다 (다음 개정 때 갱신 대상 판별용)
async function putStamped(cache, req, res){
  if(!res || !res.ok) return;
  const b = await res.clone().blob();
  const h = new Headers(res.headers);
  h.set(VH, C);
  await cache.put(req, new Response(b, {status:res.status, statusText:res.statusText, headers:h}));
}

// 저장본이 있을 때는 오래 기다리지 않는다 (계류장 약전계 대비)
function fetchTimed(req, ms){
  return new Promise((resolve, reject)=>{
    let done=false;
    const t=setTimeout(()=>{ if(!done){ done=true; reject(new Error("timeout")); } }, ms);
    fetch(req).then(r=>{ if(!done){ done=true; clearTimeout(t); resolve(r); } },
                    e=>{ if(!done){ done=true; clearTimeout(t); reject(e); } });
  });
}

self.addEventListener("fetch", e=>{
  if(e.request.method!=="GET") return;
  if(new URL(e.request.url).origin!==location.origin) return;   // 외부 요청(통계 픽셀 등)은 관여·캐시하지 않음
  const isImg = e.request.url.includes("/img/");

  if(isImg && e.request.cache!=="reload"){
    e.respondWith((async ()=>{
      const c = await caches.open(IMG);
      const m = await c.match(e.request, {ignoreSearch:true});
      // 지금 버전에서 받아 둔 도면 → 그대로 사용. 온라인이어도 데이터를 쓰지 않음
      if(m && m.headers.get(VH)===C) return m;
      // 개정 후 아직 확인 안 한 도면(또는 처음 보는 도면) → 새로 받아 저장
      try{
        const r = await fetchTimed(e.request, m ? 2500 : 15000);
        if(r && r.ok){ await putStamped(c, e.request, r); return r; }
        if(m) return m;
        return r;
      }catch(err){
        if(m) return m;                     // 오프라인·지연 → 저장본으로 계속 사용 가능
        throw err;
      }
    })());
    return;
  }

  // 앱 파일(및 '전체 도면 다운로드'의 강제 갱신): 네트워크 우선 — 개정이 즉시 반영
  e.respondWith(
    fetch(e.request).then(r=>{
      const cl=r.clone();
      caches.open(isImg?IMG:C).then(c=>{ if(isImg) putStamped(c, e.request, cl); else c.put(e.request, cl); });
      return r;
    }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(m=>m||caches.match("./")))
  );
});
