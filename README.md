# 사례관리 기록지 (mse) — 파일 분리 버전

공주시정신건강복지센터 · 단일 페이지 앱(SPA) · Firebase RTDB · Netlify

## 폴더 구조

```
mse/
├── index.html            # 화면 뼈대(HTML) + 스크립트 로드
├── style.css             # 스타일 전체 (Apple 디자인 시스템)
├── firebase-config.js    # Firebase 설정 + 초기화
├── crypto.js             # 이름 암호화 (AES-256-GCM / PBKDF2)
├── schema.js             # ★ 서식 문항 스키마 — 서식 바뀌면 여기만 수정
├── auth.js               # 전역 상태·공용 헬퍼·가계도 연동·로그인·부팅 진단
├── app.js                # 사례 목록·편집기·자동저장·AI 요약·인쇄
├── admin.js              # 계정 관리 (관리자)
├── main.js               # 최종 부팅 (반드시 마지막 로드)
├── genogram-patch.js     # (가계도 앱에 붙일 코드 — 이 앱에는 로드 안 함)
├── netlify/functions/
│   └── ai-summary.js     # AI 요약 서버리스 함수
└── README.md
```

### "어디를 고쳐야 하나" 빠른 참조
| 하고 싶은 일 | 열 파일 |
|---|---|
| 서식 문항·선택지·상담 팁 수정 | `schema.js` |
| 색·간격·버튼 등 디자인 | `style.css` |
| 로그인·암호구절·부팅 오류 | `auth.js` |
| 목록/편집/저장/요약/인쇄 동작 | `app.js` |
| 직원 계정 추가·삭제 | `admin.js` |
| 가계도 앱 주소·연동 | `auth.js`의 `GENOGRAM_URL` |

> ⚠ **스크립트 로드 순서를 바꾸지 마세요.** config → crypto → schema → auth → app → admin → main 순서에 의존합니다. 새 JS 파일을 추가하면 `main.js` 바로 앞에 넣으세요.

## 왜 페이지를 index/dashboard로 안 나눴나
이름 암호화 키(AES_KEY)는 **브라우저 메모리에만** 존재합니다(디스크에 안 남김 = 보안 핵심). 페이지를 이동하면 이 키가 사라져 이름 복호화가 전부 깨집니다. 그래서 화면 전환은 페이지 이동이 아니라 `show()` 함수로 처리하는 단일 페이지 구조를 유지합니다.

## 로컬에서 열기
여러 `<script src>`로 나뉘어 있어 `index.html`을 파일 더블클릭(`file://`)으로 열면 브라우저 보안정책에 막힐 수 있습니다. 아래 중 하나로 로컬 서버를 띄우세요.

```bash
# 방법 1: Python (설치돼 있으면)
cd mse && python3 -m http.server 8000
# → 브라우저에서 http://localhost:8000

# 방법 2: VS Code 확장 "Live Server" 설치 후 index.html 우클릭 → Open with Live Server
```
Netlify에 올리면 이 문제는 없습니다(정상 작동).

## GitHub → Netlify 배포
1. GitHub에 새 저장소 `mse` 생성 → 위 폴더 구조 그대로 push
2. Netlify → Add new site → Import from Git → 저장소 선택
   - Build command: 비움 / Publish directory: `.` (루트)
3. Site settings → Environment variables → `OPENAI_API_KEY` 등록
4. 배포 완료 후 접속 → 첫 화면에서 관리자 계정 + 센터 암호구절 등록

## Firebase 준비 (필수)
1. Authentication → 로그인 방법 → **익명(Anonymous) 사용 설정** ← 안 하면 빈 화면
2. Realtime Database 규칙:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "cases": { ".indexOn": ["updatedAt", "status"] }
  }
}
```
3. (권장) Google Cloud Console → API 키 → HTTP 리퍼러 제한 → 배포 도메인만 허용

## 보안 요약
| 항목 | 처리 |
|---|---|
| 주민등록번호 | 입력받지 않음 |
| 이름 | 센터 암호구절 → PBKDF2(15만회) → AES-256-GCM, DB엔 암호문만 |
| 암호화 키 | 브라우저 메모리에만, 새로고침 시 소멸 → 재로그인 |
| AI 요약 | 이름·주소·전화번호 전송 제외 (클라이언트+서버 이중 제거) |
| 계정 비밀번호 | SHA-256 해시 |

⚠ 센터 암호구절 분실 시 이름 복구 불가 — 오프라인 보관 필수.

## 가계도 앱 연동
- 이 앱: `auth.js`의 `GENOGRAM_URL`에 가계도 앱 주소 입력 → 요약 탭 "가계도 열기 ›" 가 `가계도주소/?case=사례번호` 로 이동 (이름·개인정보 미전달)
- 가계도 앱: `genogram-patch.js` 코드를 추가(v2.8), 함수명 2곳만 실제 함수로 교체
- 두 앱을 잇는 유일한 키 = 사례번호(S-YYYY-NNN)
