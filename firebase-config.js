// ============================================================
// firebase-config.js — Firebase 설정 + 초기화
// 이 값들은 클라이언트 공개 설정입니다. 실제 보안은
// (1) Realtime Database 규칙 auth!=null (2) 익명 인증 (3) API 키 도메인 제한 으로 확보.
// ============================================================
/* ================================================================
   0. 설정 — Firebase 프로젝트 값으로 교체 (README 참고)
================================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCw2oY5uJsfYkXXmR6BUVdc6fokKgIOhfs",
  authDomain: "gjcmhc-mse.firebaseapp.com",
  databaseURL: "https://gjcmhc-mse-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gjcmhc-mse",
  storageBucket: "gjcmhc-mse.firebasestorage.app",
  messagingSenderId: "351988317563",
  appId: "1:351988317563:web:6a3b517d365c159d70d1de"
};
const AI_ENDPOINT = "/.netlify/functions/ai-summary";
// 가계도 앱(v2.7) 배포 주소 — 통합 1단계: URL 연동. 사례번호만 전달(이름·개인정보 전달 금지)
const GENOGRAM_URL = "https://YOUR-GENOGRAM-APP.netlify.app";

firebase.initializeApp(firebaseConfig);
const db = firebase.database();