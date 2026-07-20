// auth.js — 전역 상태, 공용 헬퍼, 가계도 연동, 로그인/초기설정/부팅 진단
/* ================================================================
   3. 상태
================================================================ */
let ME = null;
let CASES = {};
let ACCOUNTS = {};
let CUR = null;
let CURTAB = 0;
let dirty = false, saveTimer = null;

const $ = id => document.getElementById(id);
const esc = s => (s??'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m){ $('toast').textContent=m; $('toast').classList.add('show'); setTimeout(()=>$('toast').classList.remove('show'),2200); }
function show(id){ ['scrSetup','scrLogin','scrList','scrEdit'].forEach(s=>$(s).classList.add('hide')); $(id).classList.remove('hide'); }

/* ================================================================
   4. 가계도 앱 연동 (통합 1단계)
   - 사례번호(caseNo)만 쿼리로 전달. 이름·개인정보는 절대 전달하지 않음.
   - 가계도 앱 쪽에서 ?case= 파라미터를 읽어 해당 사례 가계도를 열도록
     v2.8에서 한 줄 추가하면 양방향 연동 완성.
================================================================ */
function openGenogram(caseNo){
  if(GENOGRAM_URL.includes('YOUR-')){ toast('설정에서 GENOGRAM_URL을 가계도 앱 주소로 교체하세요'); return; }
  const url = caseNo ? `${GENOGRAM_URL}/?case=${encodeURIComponent(caseNo)}` : GENOGRAM_URL;
  window.open(url, 'genogram');
}

/* ================================================================
   5. 인증 흐름  — v1과 동일
================================================================ */
function bootError(title, detail, fix){
  document.body.insertAdjacentHTML('beforeend', `
  <div class="auth-wrap" id="bootErr"><div class="auth-box">
    <h1 style="font-size:20px">⚠ ${title}</h1>
    <p class="sub" style="margin-top:8px">${detail}</p>
    <div class="auth-note" style="white-space:pre-line">${fix}</div>
    <button class="pill wide" onclick="location.reload()">다시 시도</button>
  </div></div>`);
}

async function boot(){
  // 0) 설정이 자리표시자인지 먼저 검사
  if(firebaseConfig.apiKey.includes('YOUR')){
    bootError('Firebase 설정이 비어 있습니다',
      'index.html 상단의 firebaseConfig가 아직 예시값(YOUR_API_KEY) 상태입니다.',
      '1. console.firebase.google.com → 프로젝트 설정 → 웹 앱 구성값 복사\n2. index.html의 firebaseConfig에 붙여넣기\n3. databaseURL도 실제 값으로 교체 (README 1번 참고)');
    return;
  }
  // 1) 익명 인증
  try{ await firebase.auth().signInAnonymously(); }
  catch(e){
    const fixes = {
      'auth/operation-not-allowed':'Firebase 콘솔 → Authentication → 로그인 방법 → "익명(Anonymous)" 을 사용 설정하세요.',
      'auth/configuration-not-found':'Firebase 콘솔 → Authentication 메뉴에 처음 들어가 "시작하기"를 누른 뒤, 익명(Anonymous) 로그인을 사용 설정하세요.',
      'auth/api-key-not-valid':'firebaseConfig의 apiKey가 잘못되었습니다. 프로젝트 설정에서 다시 복사하세요.',
      'auth/network-request-failed':'네트워크 오류입니다. 인터넷 연결 또는 API 키의 도메인 제한 설정을 확인하세요.'
    };
    bootError('Firebase 인증 실패', `오류 코드: ${e.code||e.message}`, fixes[e.code] || 'Firebase 콘솔에서 Authentication → 익명 로그인 활성화 여부와 firebaseConfig 값을 확인하세요.');
    return;
  }
  // 2) DB 연결 (7초 타임아웃 — databaseURL 오류 감지)
  try{
    const snap = await Promise.race([
      db.ref('accounts').once('value'),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),7000))
    ]);
    if(!snap.exists()) show('scrSetup');
    else show('scrLogin');
  }catch(e){
    bootError('데이터베이스 연결 실패',
      e.message==='timeout' ? '7초 안에 응답이 없습니다. databaseURL이 잘못되었을 가능성이 큽니다.' : `오류: ${e.message}`,
      '1. Firebase 콘솔 → Realtime Database가 생성되어 있는지 확인\n2. firebaseConfig의 databaseURL이 콘솔 상단에 표시된 주소와 정확히 같은지 확인\n   (지역에 따라 …asia-southeast1.firebasedatabase.app 또는 …firebaseio.com)\n3. 규칙 탭에 auth != null 규칙이 적용되어 있는지 확인 (README 1-5번)');
  }
}

async function doSetup(){
  const name=$('suName').value.trim(), id=$('suId').value.trim(), pw=$('suPw').value, k1=$('suKey').value, k2=$('suKey2').value;
  const err=$('suErr');
  if(!name||!id||pw.length<4){ err.textContent='이름·아이디를 입력하고 비밀번호는 4자 이상으로 하세요.'; return; }
  if(k1.length<6){ err.textContent='암호구절은 6자 이상을 권장합니다.'; return; }
  if(k1!==k2){ err.textContent='암호구절이 일치하지 않습니다.'; return; }
  AES_KEY = await deriveKey(k1);
  const keycheck = await encText('GJMHC_KEYCHECK_OK');
  const uid = 'u'+Date.now();
  await db.ref('meta/keycheck').set(keycheck);
  await db.ref('accounts/'+uid).set({id, pwHash: await sha256(id+':'+pw), name, role:'admin', createdAt: Date.now()});
  ME = {uid,id,name,role:'admin'};
  toast('초기 설정 완료');
  enterApp();
}

async function doLogin(){
  const id=$('liId').value.trim(), pw=$('liPw').value, key=$('liKey').value;
  const err=$('liErr'); err.textContent=''; $('liBtn').disabled=true;
  try{
    const snap = await db.ref('accounts').once('value');
    const accs = snap.val()||{};
    const hash = await sha256(id+':'+pw);
    const found = Object.entries(accs).find(([u,a])=>a.id===id && a.pwHash===hash);
    if(!found){ err.textContent='아이디 또는 비밀번호가 올바르지 않습니다.'; return; }
    AES_KEY = await deriveKey(key);
    const kc = (await db.ref('meta/keycheck').once('value')).val();
    if(!kc || (await decText(kc))!=='GJMHC_KEYCHECK_OK'){
      AES_KEY=null; err.textContent='센터 암호구절이 올바르지 않습니다.'; return;
    }
    ME = {uid:found[0], ...found[1]}; delete ME.pwHash;
    enterApp();
  } finally { $('liBtn').disabled=false; }
}

function logout(){ location.reload(); }

async function enterApp(){
  $('btnAdmin').style.display = ME.role==='admin' ? '' : 'none';
  $('gnavWho').textContent = ME.name+' 님';
  db.ref('cases').on('value', async snap=>{
    const raw = snap.val()||{};
    for(const [cid,c] of Object.entries(raw)){
      if(c.nameEnc && !(CASES[cid] && CASES[cid]._name && CASES[cid].nameEnc?.ct===c.nameEnc.ct)){
        c._name = (await decText(c.nameEnc)) ?? '(복호화 실패)';
      } else if(CASES[cid]) c._name = CASES[cid]._name;
      CASES[cid]=c;
    }
    for(const cid of Object.keys(CASES)) if(!raw[cid]) delete CASES[cid];
    if(!$('scrList').classList.contains('hide')) renderList();
  });
  show('scrList'); renderList();
}

/* ================================================================
   11. 모달
================================================================ */
function modal(html){ $('modalHost').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`; }
function closeModal(){ $('modalHost').innerHTML=''; }
