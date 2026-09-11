// index.html 의 :root / html[data-theme=dark] 변수 블록을 파싱해 전경·배경 조합별 대비를 계산
const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
function vars(block){ const o={}; for(const m of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{3,8})/g)) o[m[1]]=m[2]; return o; }
const light=vars(html.match(/:root\{([\s\S]*?)\}/)[1]);
const dark=vars(html.match(/html\[data-theme="dark"\]\{([\s\S]*?)\}/)[1]);
function lum(hex){ let h=hex.slice(1); if(h.length===3) h=h.split("").map(c=>c+c).join("");
  const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(c=>c<=.03928?c/12.92:((c+.055)/1.055)**2.4);
  return .2126*r+.7152*g+.0722*b; }
function ratio(a,b){ const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p); return +((x+.05)/(y+.05)).toFixed(2); }
// 실제 사용 조합 (CSS 에서 확인된 것만)
const pairs=[
  ["ink","card"],["ink","bg"],["ink-sub","card"],["ink-sub","bg"],["ink-mut","card"],["ink-mut","bg"],
  ["accent","card"],["accent","accent-soft"],["btn-text","btn-bg"],["badge-text","badge"],
  ["amber-t","amber-bg"],["amber-t","card"],["red-t","red-bg"],["red-body","red-bg"],["red-t","card"],
];
const out={};
for(const [name,v] of [["light",light],["dark",dark]]){
  out[name]=pairs.map(([fg,bg])=>({fg:`--${fg}`,bg:`--${bg}`,fgHex:v[fg],bgHex:v[bg],
    ratio:ratio(v[fg],v[bg]), AA:ratio(v[fg],v[bg])>=4.5, AAA:ratio(v[fg],v[bg])>=7}));
}
// 고정색 조합 (다크 무관)
out.fixed=[["#fff","#0a7d4f","gpsBtn.on"],["#fff","#0f6e56","candBtn.first"],["#e8eef7","#161a21","zoomHint"],
  ["#9aa8bb","#080a0e","lbTip"],["#cfd8e3","#080a0e","lbZoom .pct"],["#dff7ec","#090e16","animMsg"],["#06231a","#5dcaa5","msgChk"],
  ["#9fb3c8","#0f141c","wvSeg"],["#0B2E59","#7FC4FF","wvSeg.on"],["#00e08a","#0a0e1a","wvBadge"]]
  .map(([fg,bg,where])=>({where,fg,bg,ratio:ratio(fg,bg),AA:ratio(fg,bg)>=4.5,AAA:ratio(fg,bg)>=7}));
fs.mkdirSync("docs/superpowers/reviews/raw",{recursive:true});
fs.writeFileSync("docs/superpowers/reviews/raw/audit-contrast.json",JSON.stringify(out,null,2));
const fails=[...out.light,...out.dark,...out.fixed].filter(p=>!p.AA);
console.log(`조합 ${out.light.length*2+out.fixed.length}개, AA 미달 ${fails.length}개`);
fails.forEach(p=>console.log(" ", p.where||`${p.fg}/${p.bg}`, p.ratio));
