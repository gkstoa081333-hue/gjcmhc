// ============================================================
// firebase-config.js — 통합 플랫폼 공용 Firebase 설정
// 가계도 앱(Family-tree)과 같은 프로젝트를 사용합니다.
//   → 계정 · 기관 · 케이스 목록이 두 앱에서 자동으로 공유됩니다.
//
// 데이터 구조
//   공유 : users / orgs / orgCodes / orgMembers / cases/{orgId}/{caseId}
//   가계도: genograms/{orgId}/{caseId}      ← 가계도 앱 소유
//   기록  : records/{orgId}/{caseId}        ← 이 앱 소유
// ============================================================
const firebaseConfig = {
  apiKey:            "AIzaSyAYGXGzru6atoC_hlfuB11h_NUOOKRjSAc",
  authDomain:        "family-tree-d57c9.firebaseapp.com",
  databaseURL:       "https://family-tree-d57c9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "family-tree-d57c9",
  storageBucket:     "family-tree-d57c9.firebasestorage.app",
  messagingSenderId: "193716972298",
  appId:             "1:193716972298:web:35d949ec311a6261b428f3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.database();

// 함께 쓰는 센터 앱 (상단 메뉴)
const APP_LINKS = {
  genogram : { name:'가계도', url:'https://gkstoa081333-hue.github.io/Family-tree/' },
  schedule : { name:'일정',   url:'https://gkstoa081333-hue.github.io/team-scheduler/' },
  inventory: { name:'비품',   url:'https://gkstoa081333-hue.github.io/inventory/' },
};
