# 사례관리 기록지 (mse) — 통합 플랫폼 버전

공주시정신건강복지센터 · 가계도 앱(Family-tree)과 계정·기관·케이스를 공유하는 통합 구조

## 아키텍처
- Firebase 프로젝트: **family-tree-d57c9** (가계도 앱과 공용)
- 공유 데이터: users / orgs / orgPrivate / orgCodes / orgMembers / cases/{orgId}/{caseId}
- 이 앱 소유: **records/{orgId}/{caseId}** (MSE 기록)
- 가계도 앱 소유: genograms/{orgId}/{caseId}
- 배포: 정적 호스팅(Cloudflare Pages / GitHub Pages). Firebase는 DB·인증만 담당

## 로그인 흐름
이메일/비밀번호(Firebase Auth) → 기관 가입코드 가입 → 관리자 승인 → PIN(6자리, 두 앱 공용) → 앱
※ 가계도 앱 계정·PIN 그대로 사용됩니다. PIN 해시는 uid 솔트 SHA-256 hex — 두 앱이 반드시 동일해야 함.

## 파일 구성
| 파일 | 역할 |
|---|---|
| index.html | 화면 뼈대 + 스크립트 로드(순서 고정) |
| style.css | Apple 디자인 시스템 + PC 3컬럼/대시보드(@media 1024px+) |
| firebase-config.js | Firebase 설정 + APP_LINKS(가계도·일정·비품 주소) |
| schema.js | ★ 서식 문항 — 서식 수정은 여기만 |
| auth.js | 인증·기관·PIN·케이스 구독·앱 연동 |
| app.js | 목록(KPI/표)·편집기(칩/위험평가/자동채점)·저장·인쇄·AI요약 |
| admin.js | 기관 관리(승인·권한·가입코드) |
| main.js | 부팅 (마지막 로드) |
| worker.js | Cloudflare Worker — 정적 서빙 + AI 요약 API(/api/ai-summary) |
| wrangler-example.jsonc | wrangler.jsonc 수정 참고용 예시 |

## 권한 모델
- 기관 단위 격리(DB 규칙) · 케이스 공개범위: 비공개(소유자+관리자) / 기관 공유
- 기록(records)은 목록에서 일괄 로드하지 않고 케이스 열람 시 개별 로드
- 목록 진행률은 cases의 recProgress 숫자만 사용(민감정보 아님)

## 배포 체크리스트
1. Firebase(family-tree-d57c9) 규칙에 records 가지 포함(firebase-rules.json)
2. Authentication → 승인된 도메인에 배포 도메인 추가
3. 파일 전체 업로드(한 번에 커밋 1회)

## AI 요약 활성화 (Cloudflare Workers)
1. 저장소의 wrangler.jsonc 에 "main": "worker.js" 와 assets "binding": "ASSETS" 추가 (wrangler-example.jsonc 참고)
2. Cloudflare 대시보드 → 프로젝트 → Settings → Variables and Secrets → Secret 추가:
   이름 OPENAI_API_KEY, 값 = OpenAI API 키 (맛하루 Netlify에 등록한 것과 동일한 키 사용 가능)
3. 커밋 → 자동 재배포 → 사례 열기 → 요약 탭 → "요약 초안 생성" 테스트

## 알려진 제한
- 비공개 케이스도 제목·사례번호 등 메타는 기관 구성원에게 규칙상 읽힘(내용은 차단, 목록 숨김은 클라이언트 처리)
- 케이스 삭제는 소프트 삭제(status='deleted') — 완전 삭제 절차 미구현
