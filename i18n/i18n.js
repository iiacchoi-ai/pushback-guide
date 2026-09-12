// i18n/i18n.js — 언어 상태·사전 조회·키워드 정규식. 브라우저 전역 + node(CommonJS) 겸용
// 사전: UI_EN (i18n/ui.en.js), HB_EN (i18n/handbook.en.js). 원문: HANDBOOK (gates.js)
(function (root) {
  const LANGS = ["ko", "en"];

  function getLang() {
    try { const v = root.localStorage.getItem("lang"); if (LANGS.includes(v)) return v; } catch (e) {}
    return "ko";
  }
  function setLang(l) {
    if (!LANGS.includes(l)) return;
    try { root.localStorage.setItem("lang", l); } catch (e) {}
  }

  // UI 사전: 한글 원문이 곧 키. 미등록이면 원문 그대로 (화면이 깨지지 않게)
  // bare 식별자로 조회: 최상위 const/let 은 전역 객체 프로퍼티가 아니라 전역 렉시컬 스코프에만 묶이므로 root.UI_EN 으로는 찾을 수 없다
  function t(s) {
    if (getLang() !== "en") return s;
    const d = (typeof UI_EN !== "undefined") ? UI_EN : {};
    return Object.prototype.hasOwnProperty.call(d, s) ? d[s] : s;
  }
  function tf(s, vars) {
    let r = t(s);
    for (const k in vars) r = r.split("{" + k + "}").join(String(vars[k]));
    return r;
  }

  // 한글 원문 해시 (djb2). 원문이 바뀌면 사전 항목이 무효가 되도록 한다
  function hbHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(16).padStart(6, "0").slice(-6);
  }

  // 절차 본문 조회. 영문 모드에서 사전에 없거나 원문이 바뀌었으면 한글 + ko:true
  function hb(gid, i) {
    const HB = (typeof HANDBOOK !== "undefined") ? HANDBOOK : {};
    const p = (HB[gid] || [])[i] || ["", ""];
    const title = String(p[0] || ""), body = String(p[1] || "");
    if (getLang() !== "en") return { title, body, ko: false };
    const D = (typeof HB_EN !== "undefined") ? HB_EN : {};
    const e = D[gid + ":" + i];
    if (!e || !e.en || e.hash !== hbHash(body)) return { title, body, ko: true };
    return { title: e.title || title, body: e.en, ko: false };
  }

  // 키워드 정규식. 긴 키를 앞에 두어 한 번만 훑는다 (index.html colorize 의 기존 규칙)
  // 영문 모드: 대소문자 무시, "Point N" 키는 AIP 표기 "spot N" 도 매칭
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const POINT = /^point (\d+[a-z]?)$/i;
  function kwRegex(keys) {
    const en = getLang() === "en";
    const sorted = keys.slice().sort((a, b) => b.length - a.length);
    const alts = sorted.map(k => {
      const m = en && k.match(POINT);
      return m ? "(?:point|spot) " + esc(m[1]) : esc(k);
    });
    return new RegExp("(^|[^A-Za-z0-9])(" + alts.join("|") + ")(?![A-Za-z0-9])", en ? "gi" : "g");
  }
  function kwCanon(keys, matched) {
    const norm = s => String(s).toLowerCase().replace(/^spot /, "point ");
    const m = norm(matched);
    for (const k of keys) if (norm(k) === m) return k;
    return null;
  }

  const api = { getLang, setLang, t, tf, hbHash, hb, kwRegex, kwCanon };
  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
