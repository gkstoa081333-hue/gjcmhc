// auth.js — 통합 플랫폼 인증
// 가계도 앱(Family-tree)과 동일한 계정 체계를 사용합니다.
//   users/{uid}  = {name, email, orgId, role, approved, createdAt, pinHash}
//   orgCodes/{code} = orgId · orgMembers/{orgId}/{uid} = {...}
// → 한쪽 앱에서 가입하면 다른 앱에서도 그대로 로그인됩니다.

/* ================================================================
   전역 상태 · 공용 헬퍼
================================================================ */
let ME = null;              // {uid, name, email, orgId, role, approved}
let ORG = null;             // {name, joinCode, ...}
let CASES = {};             // caseId -> 케이스 메타 + 기록 병합본
let CUR = null, CURTAB = 0;
let dirty = false, saveTimer = null;
let authBusy = false;

const $ = id => document.getElementById(id);
const esc = s => (s??'').toString().replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(m){ $('toast').textContent=m; $('toast').classList.add('show'); setTimeout(()=>$('toast').classList.remove('show'),2200); }
function show(id){
  ['scrAuth','scrPending','scrPin','scrList','scrEdit'].forEach(s=>{ const el=$(s); if(el) el.classList.add('hide'); });
  const t=$(id); if(t) t.classList.remove('hide');
  $('gnav').classList.toggle('hide', ['scrAuth','scrPending','scrPin'].includes(id));
}
function setMsg(m){ const el=$('authMsg'); if(el) el.textContent=m||''; }

/* ================================================================
   센터 앱 연동 (상단 메뉴)
================================================================ */
function isReady(k){ const u=APP_LINKS[k]&&APP_LINKS[k].url; return !!u && !u.includes('YOUR-'); }
function openApp(k, caseNo){
  const app=APP_LINKS[k]; if(!app) return;
  if(!isReady(k)){ toast(`${app.name} 앱 주소가 아직 연결되지 않았습니다`); return; }
  const base=app.url.replace(/\/+$/,'');
  const url = caseNo ? `${base}/?case=${encodeURIComponent(caseNo)}` : app.url;
  window.open(url, 'gjmhc_'+k);
}
function openGenogram(caseNo){ openApp('genogram', caseNo); }
function markNavLinks(){
  document.querySelectorAll('.gnav a[data-app]').forEach(a=>{
    a.classList.toggle('soon', !isReady(a.getAttribute('data-app')));
  });
}

/* ================================================================
   부팅 · 진단
================================================================ */
function bootLoading(msg){
  let el=$('bootLoad');
  if(!el){
    document.body.insertAdjacentHTML('beforeend',
      `<div class="auth-wrap" id="bootLoad"><div class="auth-box" style="text-align:center">
        <p style="font-size:15px;color:var(--muted48)" id="bootLoadMsg"></p></div></div>`);
    el=$('bootLoad');
  }
  $('bootLoadMsg').textContent=msg;
}
function bootLoadingDone(){ const el=$('bootLoad'); if(el) el.remove(); }

function bootError(title, detail, fix){
  bootLoadingDone();
  if($('bootErr')) return;
  document.body.insertAdjacentHTML('beforeend', `
  <div class="auth-wrap" id="bootErr"><div class="auth-box">
    <h1 style="font-size:20px">⚠ ${title}</h1>
    <p class="sub" style="margin-top:8px">${detail}</p>
    <div class="auth-note" style="white-space:pre-line">${fix}</div>
    <button class="pill wide" onclick="location.reload()">다시 시도</button>
  </div></div>`);
}
window.addEventListener('error', ev=>{
  if($('bootErr')||authBusy) return;
  bootError('스크립트 오류', String(ev.message||''),
    `파일: ${ev.filename||'-'} (${ev.lineno||'?'}행)\n\n스크립트 파일이 모두 업로드되었는지 확인하세요.`);
});

function boot(){
  bootLoading('연결 중…');
  const t=setTimeout(()=>{
    bootError('Firebase 연결 실패', '10초 동안 응답이 없습니다.',
      `현재 도메인: ${location.hostname}\n\n1. Firebase 콘솔 → Authentication → Settings → 승인된 도메인에 "${location.hostname}" 추가\n2. Authentication → 로그인 방법 → 이메일/비밀번호 사용 설정\n3. F12 → Console 탭의 오류 확인`);
  }, 10000);

  auth.onAuthStateChanged(async user=>{
    if(authBusy) return;
    clearTimeout(t); bootLoadingDone();
    if(!user){ show('scrAuth'); switchAuth('login'); return; }
    await routeUser(user);
  });
}

/* ================================================================
   로그인 · 가입 · 기관등록
================================================================ */
function switchAuth(mode){
  setMsg('');
  ['formLogin','formSignup','formOrg'].forEach(f=>$(f).classList.add('hide'));
  $({login:'formLogin', signup:'formSignup', org:'formOrg'}[mode]).classList.remove('hide');
  ['tabLogin','tabSignup'].forEach(b=>$(b).classList.remove('on'));
  if(mode==='login')  $('tabLogin').classList.add('on');
  if(mode==='signup') $('tabSignup').classList.add('on');
}

function authErr(e){
  return ({
    'auth/invalid-email':'이메일 형식이 올바르지 않습니다.',
    'auth/user-not-found':'등록되지 않은 이메일입니다.',
    'auth/wrong-password':'비밀번호가 맞지 않습니다.',
    'auth/invalid-credential':'이메일 또는 비밀번호가 맞지 않습니다.',
    'auth/email-already-in-use':'이미 가입된 이메일입니다. 로그인해 주세요.',
    'auth/weak-password':'비밀번호는 6자 이상이어야 합니다.',
    'auth/too-many-requests':'시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    'auth/operation-not-allowed':'Firebase 콘솔에서 이메일/비밀번호 로그인을 사용 설정하세요.',
    'auth/unauthorized-domain':`Firebase 콘솔 → Authentication → Settings → 승인된 도메인에 "${location.hostname}" 을 추가하세요.`
  })[e.code] || (e.message||'처리 중 문제가 발생했습니다.');
}

async function doLogin(){
  const email=$('liEmail').value.trim(), pw=$('liPw').value;
  if(!email||!pw){ setMsg('이메일과 비밀번호를 모두 입력해 주세요.'); return; }
  setMsg(''); $('btnLogin').disabled=true;
  try{ await auth.signInWithEmailAndPassword(email, pw); }
  catch(e){ setMsg(authErr(e)); }
  $('btnLogin').disabled=false;
}

// 가입코드로 기관 확인 후 users + orgMembers 이중 기록 (가계도 앱과 동일 규격)
async function registerMember(user, name, code){
  let orgId=null;
  try{ orgId=(await db.ref('orgCodes/'+code).once('value')).val(); }catch(e){}
  if(!orgId){
    setMsg('가입코드와 일치하는 기관이 없습니다. 코드를 다시 확인해 주세요.');
    try{ await user.delete(); }catch(e){ await auth.signOut(); }
    return false;
  }
  const rec={ name, email:user.email, orgId, role:'member', approved:false, createdAt:Date.now() };
  try{
    await db.ref('users/'+user.uid).set(rec);
    await db.ref('orgMembers/'+orgId+'/'+user.uid).set({
      name, email:user.email, role:'member', approved:false, createdAt:rec.createdAt });
  }catch(e){ setMsg('가입 처리 중 문제가 발생했습니다.'); return false; }
  return true;
}

async function doSignup(){
  const name=$('suName').value.trim(), code=$('suCode').value.trim().toUpperCase();
  const email=$('suEmail').value.trim(), pw=$('suPw').value;
  if(!name||!code||!email||!pw){ setMsg('모든 항목을 입력해 주세요.'); return; }
  setMsg(''); $('btnSignup').disabled=true; authBusy=true;
  let cred;
  try{ cred=await auth.createUserWithEmailAndPassword(email, pw); }
  catch(e){ setMsg(authErr(e)); $('btnSignup').disabled=false; authBusy=false; return; }
  const ok=await registerMember(cred.user, name, code);
  $('btnSignup').disabled=false; authBusy=false;
  if(ok) routeUser(cred.user);
}

// 가입 마무리 (계정은 있으나 기관 미지정)
async function doResume(){
  const name=$('suName').value.trim(), code=$('suCode').value.trim().toUpperCase();
  if(!name||!code){ setMsg('이름과 가입코드를 입력해 주세요.'); return; }
  const user=auth.currentUser; if(!user){ location.reload(); return; }
  authBusy=true;
  const ok=await registerMember(user, name, code);
  authBusy=false;
  if(ok) routeUser(user);
}

// 기관 신규 등록 — 등록자가 관리자
async function doCreateOrg(){
  const orgName=$('orgName').value.trim(), name=$('orgAdmin').value.trim();
  const email=$('orgEmail').value.trim(), pw=$('orgPw').value;
  if(!orgName||!name||!email||!pw){ setMsg('모든 항목을 입력해 주세요.'); return; }
  setMsg(''); $('btnOrg').disabled=true; authBusy=true;
  let cred;
  try{ cred=await auth.createUserWithEmailAndPassword(email, pw); }
  catch(e){ setMsg(authErr(e)); $('btnOrg').disabled=false; authBusy=false; return; }

  const orgId='o'+Date.now();
  let code='';
  for(let i=0;i<5;i++){
    const c=Math.random().toString(36).slice(2,8).toUpperCase();
    try{
      if(!(await db.ref('orgCodes/'+c).once('value')).exists()){
        await db.ref('orgCodes/'+c).set(orgId); code=c; break;
      }
    }catch(e){}
  }
  const now=Date.now();
  try{
    // 보안 규칙상 orgs 생성 시 ownerUid 가 반드시 있어야 합니다
    await db.ref('orgs/'+orgId).set({name:orgName, ownerUid:cred.user.uid, createdAt:now});
    // 가입코드는 관리자만 볼 수 있는 orgPrivate 에 보관
    await db.ref('orgPrivate/'+orgId).set({joinCode:code, createdAt:now});
    await db.ref('users/'+cred.user.uid).set({name, email, orgId, role:'admin', approved:true, createdAt:now});
    await db.ref('orgMembers/'+orgId+'/'+cred.user.uid).set({name, email, role:'admin', approved:true, createdAt:now});
  }catch(e){ setMsg('기관 등록 중 문제가 발생했습니다.'); $('btnOrg').disabled=false; authBusy=false; return; }

  $('btnOrg').disabled=false; authBusy=false;
  alert(`기관이 등록되었습니다.\n\n가입코드: ${code}\n\n직원들에게 이 코드를 알려주면 가입할 수 있습니다.\n(계정 관리 화면에서 다시 확인할 수 있습니다.)`);
  routeUser(cred.user);
}

function doLogout(){ auth.signOut().then(()=>location.reload()); }
function logout(){ doLogout(); }

/* ================================================================
   로그인 후 분기 — 가입 미완 / 승인 대기 / PIN / 앱
================================================================ */
async function routeUser(user){
  let me=null;
  try{ me=(await db.ref('users/'+user.uid).once('value')).val(); }
  catch(e){ toast('계정 정보를 불러오지 못했습니다.'); show('scrAuth'); switchAuth('login'); return; }

  if(!me || !me.orgId){          // 가입이 중간에 끊긴 계정
    show('scrAuth'); switchAuth('signup');
    setMsg('가입이 완료되지 않았습니다. 이름과 가입코드를 입력해 마무리해 주세요.');
    $('suEmail').value=user.email||''; $('suEmail').disabled=true; $('suPw').disabled=true;
    $('btnSignup').setAttribute('onclick','doResume()');
    return;
  }

  ME={uid:user.uid, ...me};
  try{ ORG=(await db.ref('orgs/'+me.orgId).once('value')).val()||{name:'—'}; }catch(e){ ORG={name:'—'}; }

  if(!me.approved){ show('scrPending'); $('pendOrg').textContent=ORG.name||'—'; return; }
  if(!me.pinHash){ startPin('set'); return; }
  if(pinValid()){ enterApp(); return; }
  startPin('verify');
}

/* ================================================================
   PIN 잠금 — 가계도 앱과 동일 위치(users/{uid}/pinHash)
================================================================ */
const PIN_GRACE = 10*60*1000;   // 마지막 사용 후 10분 이내면 PIN 생략
let PIN_BUF='', PIN_MODE='verify', PIN_TMP='', PIN_TRIES=0;

async function pinHash(pin){
  const d=await crypto.subtle.digest('SHA-256', new TextEncoder().encode('gjmhc-pin:'+pin));
  return btoa(String.fromCharCode(...new Uint8Array(d)));
}
function pinStamp(){ try{ localStorage.setItem('pinOK', JSON.stringify({u:ME.uid,t:Date.now()})); }catch(e){} }
function pinValid(){
  try{ const o=JSON.parse(localStorage.getItem('pinOK')||'null');
       return !!o && o.u===ME.uid && (Date.now()-o.t)<PIN_GRACE; }catch(e){ return false; }
}

function startPin(mode){
  PIN_MODE=mode; PIN_BUF=''; PIN_TMP='';
  show('scrPin'); drawPin();
  $('pinTitle').textContent = mode==='set' ? 'PIN 설정' : 'PIN 입력';
  $('pinDesc').textContent  = mode==='set'
    ? '기록 보호를 위해 6자리 숫자 PIN을 만들어 주세요.'
    : '기록을 열려면 PIN을 입력하세요.';
}
function drawPin(){
  $('pinDots').innerHTML=[0,1,2,3,4,5].map(i=>`<span class="pdot${i<PIN_BUF.length?' on':''}"></span>`).join('');
}
function pinKey(n){
  if(PIN_BUF.length>=6) return;
  PIN_BUF+=n; drawPin();
  if(PIN_BUF.length===6) setTimeout(pinSubmit,120);
}
function pinDel(){ PIN_BUF=PIN_BUF.slice(0,-1); drawPin(); }

async function pinSubmit(){
  const pin=PIN_BUF; PIN_BUF=''; drawPin();
  if(PIN_MODE==='set'){
    if(!PIN_TMP){ PIN_TMP=pin; $('pinDesc').textContent='확인을 위해 한 번 더 입력하세요.'; return; }
    if(PIN_TMP!==pin){ PIN_TMP=''; $('pinDesc').textContent='PIN이 일치하지 않습니다. 다시 설정해 주세요.'; return; }
    const h=await pinHash(pin);
    try{ await db.ref('users/'+ME.uid+'/pinHash').set(h); ME.pinHash=h; }
    catch(e){ $('pinDesc').textContent='저장에 실패했습니다. 다시 시도해 주세요.'; return; }
    pinStamp(); enterApp(); return;
  }
  const h=await pinHash(pin);
  if(h===ME.pinHash){ PIN_TRIES=0; pinStamp(); enterApp(); }
  else{
    PIN_TRIES++;
    $('pinDesc').textContent = PIN_TRIES>=5
      ? 'PIN이 5회 틀렸습니다. 로그아웃 후 다시 시도해 주세요.'
      : `PIN이 맞지 않습니다. (${PIN_TRIES}/5)`;
    if(PIN_TRIES>=5) setTimeout(doLogout,1500);
  }
}
async function openPinChange(){
  if(!confirm('PIN을 새로 설정할까요?')) return;
  try{ await db.ref('users/'+ME.uid+'/pinHash').remove(); }catch(e){}
  ME.pinHash=null; try{ localStorage.removeItem('pinOK'); }catch(e){}
  startPin('set');
}

/* ================================================================
   앱 진입 — 케이스(공유) + 기록(이 앱) 병합 구독
================================================================ */
function casePath(){ return 'cases/'+ME.orgId; }
function recordPath(cid){ return 'records/'+ME.orgId+'/'+cid; }

// 비공개 케이스는 소유자와 관리자만 (가계도 앱과 동일 정책)
function canSee(c){
  if(!c) return false;
  if(ME.role==='admin') return true;
  if(c.visibility==='org') return true;
  return c.ownerUid===ME.uid;
}

function enterApp(){
  $('gnavWho').textContent = `${ME.name} 님 · ${ORG.name||''}`;
  const ab=$('btnAdmin'); if(ab) ab.style.display = ME.role==='admin' ? '' : 'none';
  markNavLinks();

  db.ref(casePath()).on('value', snap=>{
    const raw=snap.val()||{};
    Object.keys(CASES).forEach(cid=>{ if(!raw[cid]) delete CASES[cid]; });
    Object.entries(raw).forEach(([cid,meta])=>{ CASES[cid]=Object.assign(CASES[cid]||{}, meta); });
    if(!$('scrList').classList.contains('hide')) renderList();
  });
  show('scrList'); renderList();
}

/* ================================================================
   모달
================================================================ */
function modal(html){ $('modalHost').innerHTML=`<div class="modal-bg" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`; }
function closeModal(){ $('modalHost').innerHTML=''; }
