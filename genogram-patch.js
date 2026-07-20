// ============================================================
// 가계도 앱 v2.8 연동 패치 — 사례관리 기록지 앱과 연결
// ============================================================
// 사용법: 가계도 앱 index.html의 초기화 코드(로그인 완료 직후) 근처에
//         아래 함수를 추가하고, 앱 시작 시 handleCaseLink()를 한 번 호출.
//
// 동작:
//   사례기록 앱에서 "가계도 열기 ›" 클릭
//   → https://가계도앱주소/?case=S-2026-014 로 열림
//   → 아래 코드가 ?case= 파라미터를 읽어
//      해당 사례번호의 가계도가 있으면 바로 열고, 없으면 새로 생성 제안.
//
// 보안: URL로는 사례번호만 오갑니다. 이름·개인정보는 절대 전달되지 않으며,
//        가계도 데이터 접근 권한은 가계도 앱 자체 로그인이 그대로 통제합니다.

function handleCaseLink() {
  const params = new URLSearchParams(location.search);
  const caseNo = params.get('case');
  if (!caseNo) return; // 일반 접속 — 아무것도 안 함

  // 1) 사례번호 형식 검증 (S-YYYY-NNN 외 값은 무시 — 주입 방지)
  if (!/^S-\d{4}-\d{1,4}$/.test(caseNo)) return;

  // 2) 기존 가계도 검색
  //    ※ 아래 'genograms'는 가계도 앱의 실제 데이터 경로명으로 교체하세요.
  //    ※ 연동을 위해 가계도 데이터에 caseNo 필드를 저장하는 것을 권장합니다.
  //       (가계도 저장 시 caseNo 입력란 하나 추가)
  firebase.database().ref('genograms').orderByChild('caseNo').equalTo(caseNo)
    .once('value').then(snap => {
      const found = snap.val();
      if (found) {
        const gid = Object.keys(found)[0];
        openGenogramById(gid); // ← 가계도 앱의 기존 "가계도 열기" 함수명으로 교체
      } else {
        if (confirm(`사례 ${caseNo}의 가계도가 아직 없습니다. 새로 만들까요?`)) {
          createNewGenogram({ caseNo }); // ← 기존 "새 가계도" 함수에 caseNo 전달하도록 교체
        }
      }
      // 3) URL 정리 (뒤로가기 시 재실행 방지)
      history.replaceState(null, '', location.pathname);
    });
}

// 앱 초기화(로그인 성공) 직후 1회 호출:
// handleCaseLink();

// ============================================================
// (선택) 역방향 링크 — 가계도에서 사례기록으로 돌아가기
// 가계도 화면 상단에 버튼 하나 추가:
//
// const CASE_RECORD_URL = 'https://사례기록앱주소.netlify.app';
// function openCaseRecord(caseNo){
//   window.open(`${CASE_RECORD_URL}/?case=${encodeURIComponent(caseNo)}`, 'caserecord');
// }
// ============================================================
