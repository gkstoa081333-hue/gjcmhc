// main.js — 모든 모듈 로드 후 최종 실행 (반드시 마지막에 로드)
// 페이지를 떠날 때 저장 안 된 변경분을 flush
window.addEventListener('beforeunload', e => { if (dirty) { flushSave(); } });
// 앱 부팅 (Firebase 연결 → 로그인/초기설정 화면)
boot();
