// i18n/handbook.en.js — 절차 사전. tools/i18n/match.mjs 와 sheet-import.mjs 가 생성·갱신한다. 손으로 고치지 않는다
// 키 "주기장:순번" (HANDBOOK[주기장][순번]). en: 영문 본문, title: 제목 재정의(선택), src: "aip"|"tr"|"aip+tr",
// aip: AIP AMDT 번호, hash: 한글 원문 해시(i18n.js hbHash), status: "review"|"ok"
// var 사용 이유: i18n.js 가 root.HB_EN(전역 객체 프로퍼티)으로 조회한다 (ui.en.js 의 UI_EN 과 동일한 이유)
var HB_EN = {};
