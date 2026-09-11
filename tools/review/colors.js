const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
const lines=html.split("\n");
const cssEnd=lines.findIndex(l=>l.includes("</style>"));
const out={cssHardcoded:[],jsInlineStyle:[],jsColorLiteral:[]};
lines.forEach((l,i)=>{
  const n=i+1;
  const hexes=l.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)||[];
  if(n<=cssEnd){ if(hexes.length && !/^\s*--/.test(l)) out.cssHardcoded.push({line:n,values:hexes,src:l.trim().slice(0,120)}); }
  else {
    if(/style=["']|style\.cssText|\.style\.[a-zA-Z]+\s*=/.test(l)) out.jsInlineStyle.push({line:n,src:l.trim().slice(0,140)});
    if(hexes.length && !/KWCOLOR|AC_COLORS|fill=|stroke=/.test(l)) out.jsColorLiteral.push({line:n,values:hexes,src:l.trim().slice(0,120)});
  }
});
fs.writeFileSync("docs/superpowers/reviews/raw/audit-colors.json",JSON.stringify(out,null,2));
console.log("CSS 하드코딩",out.cssHardcoded.length,"| JS 인라인 스타일",out.jsInlineStyle.length,"| JS 색 리터럴",out.jsColorLiteral.length);
