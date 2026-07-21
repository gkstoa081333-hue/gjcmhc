// app.js — 사례 목록, 편집기, 자동저장, AI 요약, 인쇄
/* ================================================================
   6. 진행률 계산  — v1과 동일
================================================================ */
function progressOf(c){
  let done=0, total=0;
  const cnt=(fields,data)=>fields.forEach(f=>{
    if(f.cond && (data?.[f.cond[0]]!==f.cond[1])) return;
    total++;
    const v=data?.[f.k];
    if(Array.isArray(v)?v.length:(v!==undefined&&v!==null&&v!=='')) done++;
  });
  cnt(S1, c.s1);
  S2.forEach(g=>cnt(g.items, c.s2));
  S3.forEach(g=>{
    if(g.special==='cognition'){
      total+=4;
      const d=c.s3||{};
      if(d.oriTime)done++; if(d.oriPlace)done++; if(d.oriPerson)done++;
      if((d.serial7||[]).some(x=>x!==''&&x!==undefined))done++;
    } else cnt(g.items, c.s3);
  });
  return total?Math.round(done/total*100):0;
}
function secPct(fields,data){let d=0,t=0;fields.forEach(f=>{if(f.cond&&data?.[f.cond[0]]!==f.cond[1])return;t++;const v=data?.[f.k];if(Array.isArray(v)?v.length:(v!==undefined&&v!==''))d++;});return t?Math.round(d/t*100):0;}
function secPct2(data){let d=0,t=0;S2.forEach(g=>g.items.forEach(f=>{t++;const v=data?.[f.k];if(Array.isArray(v)?v.length:(v!==undefined&&v!==''))d++;}));return t?Math.round(d/t*100):0;}
function msePct(data){let d=0,t=0;S3.forEach(g=>{if(g.special){t+=4;if(data?.oriTime)d++;if(data?.oriPlace)d++;if(data?.oriPerson)d++;if((data?.serial7||[]).some(x=>x!==''&&x!==undefined))d++;}else g.items.forEach(f=>{if(f.cond&&data?.[f.cond[0]]!==f.cond[1])return;t++;const v=data?.[f.k];if(Array.isArray(v)?v.length:(v!==undefined&&v!==''))d++;});});return t?Math.round(d/t*100):0;}

/* ================================================================
   7. 사례 목록 (시안 D — 스토어 그리드)
================================================================ */
function renderList(){
  const q=($('q').value||'').toLowerCase();
  const arr = Object.entries(CASES)
    .filter(([,c])=>c.status!=='deleted')
    .filter(([,c])=>canSee(c))
    .filter(([,c])=>!q || (c.caseNo||'').toLowerCase().includes(q) || (c.title||'').toLowerCase().includes(q) || (c.ownerName||'').toLowerCase().includes(q))
    .sort((a,b)=>(b[1].updatedAt||0)-(a[1].updatedAt||0));
  $('listCount').textContent = arr.length+'건';
  renderKPI();
  $('caseList').innerHTML = arr.length ? arr.map(([cid,c])=>{
    const p = (c.s1 ? progressOf(c) : (c.recProgress||0));
    return `<div class="gc" onclick="openCase('${cid}')">
      <span class="no">${esc(c.caseNo||'번호없음')}${c.visibility==='private'?' 🔒':''}</span>
      <span class="nm">${esc(c.title||'(제목 없음)')}</span>
      <span class="mt">${esc(c.ownerName||'-')} · ${c.updatedAt?new Date(c.updatedAt).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}):''} 수정</span>
      <div class="pr"><i style="width:${p}%"></i></div>
      <div class="foot"><span class="lk">기록 열기 ›</span><button class="del" onclick="event.stopPropagation();delCase('${cid}')">삭제</button></div>
    </div>`;
  }).join('')
  : `<div class="empty" style="grid-column:1/-1">등록된 사례가 없습니다. ‘＋ 새 사례’로 시작하세요.</div>`;
}

// PC 화면 상단 현황 지표 (모바일에서는 CSS로 숨김)
function renderKPI(){
  const el = $('kpiBar'); if(!el) return;
  const all = Object.entries(CASES).filter(([,c])=>c.status!=='deleted' && canSee(c)).map(([,c])=>c);
  const now = new Date(), ym = now.getFullYear()+'-'+now.getMonth();
  const newThisMonth = all.filter(c=>{
    if(!c.createdAt) return false;
    const d = new Date(c.createdAt);
    return d.getFullYear()+'-'+d.getMonth() === ym;
  }).length;
  const mine = all.filter(c=>c.ownerUid===ME.uid).length;
  const incomplete = all.filter(c=>(c.s1?progressOf(c):(c.recProgress||0)) < 100).length;
  const kpis = [
    {n:all.length, t:'전체 사례'},
    {n:newThisMonth, t:'이번 달 신규'},
    {n:mine, t:'내 담당'},
    {n:incomplete, t:'작성 중'}
  ];
  el.innerHTML = kpis.map(k=>`<div class="k${k.warn?' warn':''}"><div class="n">${k.n}</div><div class="t">${k.t}</div></div>`).join('');
}

function nextCaseNo(){
  const yr=new Date().getFullYear();
  const nums=Object.values(CASES).map(c=>{const m=(c.caseNo||'').match(new RegExp(`S-${yr}-(\\d+)`));return m?+m[1]:0;});
  return `S-${yr}-${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
}

function openNewCase(){
  modal(`<h3>새 사례</h3>
    <p style="font-size:13px;color:var(--muted48);margin-bottom:4px">가계도 앱과 공유되는 케이스입니다.</p>
    <label>대상자 / 케이스 이름</label><input id="ncTitle" placeholder="예: 김○수">
    <label>사례번호</label><input id="ncNo" value="${nextCaseNo()}">
    <label>공개범위</label>
    <div class="chips" id="ncVis" style="margin-top:2px">
      <button class="chip on" data-v="private" onclick="pickVis(this)">🔒 비공개</button>
      <button class="chip" data-v="org" onclick="pickVis(this)">👥 기관 공유</button>
    </div>
    <p style="font-size:12px;color:var(--muted48);margin-top:8px;line-height:1.55">
      비공개는 나와 기관 관리자만 볼 수 있습니다. 나중에 바꿀 수 있습니다.</p>
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="pill gray" style="flex:1" onclick="closeModal()">취소</button>
      <button class="pill" style="flex:1" onclick="createCase()">등록</button>
    </div>`);
}
function pickVis(btn){
  document.querySelectorAll('#ncVis .chip').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
}

async function createCase(){
  const title=$('ncTitle').value.trim(), no=$('ncNo').value.trim();
  const visEl=document.querySelector('#ncVis .chip.on');
  const visibility=visEl?visEl.getAttribute('data-v'):'private';
  if(!title){ toast('대상자 이름을 입력하세요'); return; }
  const cid='c'+Date.now();
  const now=Date.now();
  await db.ref(casePath()+'/'+cid).set({
    title, caseNo:no, visibility,
    ownerUid:ME.uid, ownerName:ME.name,      // 규칙상 생성 시 ownerUid 필수
    recProgress:0,                            // 목록 진행률 표시용 (민감정보 아님)
    createdAt:now, updatedAt:now
  });
  await db.ref(recordPath(cid)).set({
    s1:{consultDate:new Date().toISOString().slice(0,10)}, s2:{}, s3:{},
    updatedAt:now, updatedBy:ME.name
  });
  closeModal(); toast('사례가 등록되었습니다');
  setTimeout(()=>openCase(cid),400);
}

function delCase(cid){
  const c=CASES[cid];
  if(!confirm(`[${c.caseNo||''} ${c.title||''}] 사례를 삭제할까요?\n(가계도 앱에서도 사라집니다. 휴지통 이동이라 관리자가 복구 가능)`)) return;
  db.ref(casePath()+'/'+cid).update({status:'deleted', updatedAt:Date.now()});
  toast('삭제되었습니다');
}

/* ================================================================
   8. 편집기 (시안 B — 컨피규레이터)
================================================================ */

/* ================================================================
   상담 모드 — 케이스 아래 3구분
   mse: 사례관리 기록(1건) / gs: 일반상담(회차) / is: 개별상담(회차)
================================================================ */
let MODE = 'mse';                  // 현재 상단 세그먼트
let SESSIONS = { gs:{}, is:{} };   // {sid: 회차데이터}
let CURSID = null;                 // 현재 선택된 회차 id (gs/is 편집 시)
const MODE_TABS = { mse:['인적','병력','MSE','요약'], gs:['상담','조치·요약'], is:['상담'] };
const SESSION_PATHS = {
  gs: cid=>`consultations/${ME.orgId}/${cid}`,
  is: cid=>`sessions/${ME.orgId}/${cid}`
};

const TABNAMES=['인적','병력','MSE','요약'];

async function openCase(cid){
  CUR=cid; CURTAB=0; CURSID=null; MODE='mse'; dirty=false;
  SESSIONS={gs:{}, is:{}};
  const c=CASES[cid];
  if(!c){ toast('사례를 불러오는 중입니다. 잠시 후 다시 열어주세요.'); return; }
  // MSE 기록은 민감정보라 목록에서 일괄 조회하지 않고, 열람 시점에 개별 로드
  if(!c.s1){
    try{
      const rec=(await db.ref(recordPath(cid)).once('value')).val()||{};
      Object.assign(c, {s1:rec.s1||{}, s2:rec.s2||{}, s3:rec.s3||{}, aiSummary:rec.aiSummary||'', overviewSummary:rec.overviewSummary||''});
    }catch(e){
      toast('이 사례의 기록을 볼 권한이 없습니다');
      return;
    }
  }
  // 일반·개별 상담 회차도 열람 시점에 로드
  for(const m of ['gs','is']){
    try{ SESSIONS[m] = (await db.ref(SESSION_PATHS[m](cid)).once('value')).val() || {}; }
    catch(e){ SESSIONS[m] = {}; }
  }
  $('edTitle').innerHTML=`${esc(CASES[cid].title||'')}<small>${esc(CASES[cid].caseNo||'번호없음')} · ${esc(CASES[cid].ownerName||'-')}</small>`;
  show('scrEdit'); syncSegment(); renderTabs(); renderTab(); updateSticky();
}
function backToList(){ flushSave(); show('scrList'); renderList(); }

function renderTabs(){
  const c=CASES[CUR];
  const names = MODE_TABS[MODE];
  let pcts;
  if(MODE==='mse') pcts=[secPct(S1,c.s1), secPct2(c.s2), msePct(c.s3), null];
  else if(MODE==='gs' && CURSID) pcts=[gsPct(SESSIONS.gs[CURSID],0), gsPct(SESSIONS.gs[CURSID],1)];
  else pcts = names.map(()=>null);
  $('tabs').innerHTML = names.map((t,i)=>`<button class="${i===CURTAB?'on':''}" onclick="switchTab(${i})">${t}${pcts[i]!==null?`<span class="pc">${pcts[i]}%</span>`:''}</button>`).join('');
}

function gsPct(d, half){
  if(!d) return 0;
  const groups = half===0 ? GS.slice(0,3) : GS.slice(3);
  let done=0, total=0;
  groups.forEach(g=>g.items.forEach(f=>{
    total++; const v=d[f.k];
    if(Array.isArray(v)?v.length:(v!==undefined&&v!=='')) done++;
  }));
  return total ? Math.round(done/total*100) : 0;
}

function syncSegment(){
  document.querySelectorAll('#segMode button').forEach(b=>{
    b.classList.toggle('on', b.getAttribute('data-mode')===MODE);
  });
  // MSE 이외에는 회차 목록 화면일 때 탭바 숨김 (편집 진입 시 표시)
  $('tabsBar').classList.toggle('hide', MODE!=='mse' && !CURSID);
}

function switchMode(m){
  if(m===MODE) return;
  flushSave();
  MODE = m; CURTAB = 0; CURSID = null;
  syncSegment(); renderTabs(); renderTab(); updateSticky();
  window.scrollTo({top:0});
}

function switchTab(i){ CURTAB=i; renderTabs(); renderTab(); updateSticky(); window.scrollTo({top:0}); }
function stepTab(dir){
  const names = MODE_TABS[MODE];
  const n=CURTAB+dir;
  if(n<0) return;
  if(n>=names.length){
    if(MODE==='mse') backToList();
    else backToSessionList();
    return;
  }
  switchTab(n);
}

function updateSticky(){
  const c=CASES[CUR]; if(!c) return;
  const pcts=[secPct(S1,c.s1), secPct2(c.s2), msePct(c.s3), null];
  const pct = pcts[CURTAB];
  $('stState').innerHTML = `<b>${TABNAMES[CURTAB]}</b>${pct!==null?` ${pct}%`:''} · <em id="saveState">${dirty?'입력 중…':'자동저장됨'}</em>`;
  const names = MODE_TABS[MODE];
  const inSess = MODE!=='mse' && !CURSID;
  $('btnPrev').style.display = inSess?'none':'';
  $('btnNext').style.display = inSess?'none':'';
  if(!inSess){
    $('btnPrev').style.visibility = CURTAB===0?'hidden':'visible';
    const last = CURTAB===names.length-1;
    $('btnNext').textContent = last ? (MODE==='mse'?'목록으로':'회차 목록') : '다음 섹션';
  }
}

function renderTab(){
  if(MODE==='mse') return renderMSE();
  if(MODE==='gs')  return renderSessionMode('gs');
  if(MODE==='is')  return renderSessionMode('is');
}

function renderMSE(){
  const c=CASES[CUR];
  if(CURTAB===0) $('tabBody').innerHTML=`<div class="grp"><h3>1. 인적사항</h3><p class="hint">주민등록번호는 보안 정책상 입력하지 않습니다. 이름은 암호화되어 저장됩니다.</p><div class="fgrid">${S1.map(f=>fieldHTML('s1',f,c.s1)).join('')}</div></div>`;
  if(CURTAB===1) $('tabBody').innerHTML=S2.map(g=>`<div class="grp"><h3>${g.g} <span class="age">${g.age}</span>${g.tip?tipBtn(g.tip):''}</h3>${g.items.map(f=>`<div class="subrow">${fieldHTML('s2',f,c.s2)}</div>`).join('')}</div>`).join('');
  if(CURTAB===2) $('tabBody').innerHTML=S3.map(g=>{
    if(g.special==='cognition') return cognitionHTML(c.s3);
    return `<div class="grp"><h3>${g.g}${g.tip?tipBtn(g.tip):''}</h3>${g.items.map(f=>`<div class="subrow">${fieldHTML('s3',f,c.s3)}</div>`).join('')}</div>`;
  }).join('');
  if(CURTAB===3) $('tabBody').innerHTML=summaryHTML(c);
  renderSidePanes();
}

/* ================================================================
   회차형 상담 (일반상담 gs / 개별상담 is)
================================================================ */
function renderSessionMode(mode){
  syncSegment();
  if(!CURSID) return renderSessionList(mode);
  return renderSessionEdit(mode);
}

function renderSessionList(mode){
  const label = mode==='gs'?'일반상담':'개별상담';
  const list = Object.entries(SESSIONS[mode])
    .sort((a,b)=>(b[1].date||'').localeCompare(a[1].date||''));
  const rows = list.length ? list.map(([sid,s])=>{
    const title = mode==='gs' ? (s.kind||'일반상담') : (s.title||'(제목 없음)');
    const meta  = mode==='gs' ? `${s.method||'-'} · ${s.endType||'진행'}` : (s.content?String(s.content).slice(0,60):'—');
    return `<div class="gc" onclick="openSession('${mode}','${sid}')">
      <span class="no">${esc(s.date||'날짜 없음')}</span>
      <span class="nm">${esc(title)}</span>
      <span class="mt">${esc(meta)}</span>
      <div class="foot"><span class="lk">열기 ›</span>
        <button class="del" onclick="event.stopPropagation();delSession('${mode}','${sid}')">삭제</button></div>
    </div>`;
  }).join('') : `<div class="empty" style="grid-column:1/-1">아직 ${label} 회차가 없습니다.</div>`;
  $('tabBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <h2 style="font-size:19px;font-weight:600;letter-spacing:-.3px">${label} · ${list.length}회</h2>
      <span style="flex:1"></span>
      <button class="pill" onclick="newSession('${mode}')">＋ 새 회차</button>
    </div>
    <div class="grid">${rows}</div>`;
}

function newSession(mode){
  const sid = 's'+Date.now();
  const now = new Date().toISOString().slice(0,10);
  const base = mode==='gs' ? {date:now, kind:'일반상담'} : {date:now, title:''};
  SESSIONS[mode][sid] = base;
  CURSID = sid; CURTAB = 0;
  db.ref(SESSION_PATHS[mode](CUR)+'/'+sid).set(Object.assign({}, base,
    {createdAt:Date.now(), updatedAt:Date.now(), updatedBy:ME.name}));
  renderTabs(); renderTab(); updateSticky();
  syncSegment();
}

function openSession(mode, sid){
  CURSID = sid; CURTAB = 0;
  MODE = mode;
  syncSegment(); renderTabs(); renderTab(); updateSticky();
  window.scrollTo({top:0});
}

function backToSessionList(){
  flushSave();
  CURSID = null; CURTAB = 0;
  renderTabs(); renderTab(); updateSticky();
  syncSegment();
}

async function delSession(mode, sid){
  if(!confirm('이 회차를 삭제할까요? (되돌릴 수 없습니다)')) return;
  try{
    await db.ref(SESSION_PATHS[mode](CUR)+'/'+sid).remove();
    delete SESSIONS[mode][sid];
    if(CURSID===sid){ CURSID=null; }
    renderTab(); toast('삭제되었습니다');
  }catch(e){ toast('삭제 실패'); }
}

function renderSessionEdit(mode){
  const d = SESSIONS[mode][CURSID];
  if(!d){ CURSID=null; return renderTab(); }
  const groups = mode==='gs'
    ? (CURTAB===0 ? GS.slice(0,3) : GS.slice(3))    // 0: 상담 정보/유형/문제  1: 내용/조치
    : IS;
  const body = groups.map(g=>`
    <div class="grp"><h3>${g.g}</h3>
      ${g.items.map(f=>`<div class="subrow">${fieldHTML('sess',f,d)}</div>`).join('')}
    </div>`).join('');
  $('tabBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <button class="nlink" onclick="backToSessionList()">‹ ${mode==='gs'?'일반상담':'개별상담'} 회차 목록</button>
      <span style="flex:1"></span>
      <span class="mut" style="font-size:12.5px;color:var(--muted48)">${esc(d.date||'')}</span>
    </div>
    ${body}`;
  renderSidePanes();
}


// ── PC 3컬럼 레이아웃용: 좌측 목차 + 우측 상담 팁 패널 (모바일에서는 CSS로 숨김)
function isDesktop(){ return window.matchMedia('(min-width:1024px)').matches; }

function renderSidePanes(){
  const toc=$('tocPane'), tip=$('tipPane');
  if(!toc||!tip) return;

  // 현재 탭에 그려진 그룹 제목을 모아 목차 생성
  const heads=[...document.querySelectorAll('#tabBody .grp > h3')];
  heads.forEach((h,i)=>h.id='grp'+i);
  toc.innerHTML = heads.length
    ? `<p class="pane-t">이 섹션</p>` + heads.map((h,i)=>{
        const t=(h.childNodes[0] && h.childNodes[0].textContent || '').trim() || `항목 ${i+1}`;
        return `<button class="toc-it" onclick="gotoGrp(${i})">${esc(t)}</button>`;
      }).join('')
    : '';

  // 현재 탭에 등장하는 상담 팁을 모두 패널에 나열
  const keys=[...new Set([...document.querySelectorAll('#tabBody .tipbtn')]
    .map(b=>b.getAttribute('data-tip')).filter(k=>k && TIPS[k]))];
  tip.innerHTML = `<p class="pane-t">상담 팁</p>` + (keys.length
    ? keys.map(k=>`<div class="tipcard" id="tip_${k}"><h5>${esc(TIPS[k].t)}</h5><p>${esc(TIPS[k].b)}</p></div>`).join('')
    : `<p class="pane-empty">이 섹션에는 등록된 상담 팁이 없습니다.</p>`);
}

function gotoGrp(i){
  const el=document.getElementById('grp'+i);
  if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
  document.querySelectorAll('.toc-it').forEach((b,j)=>b.classList.toggle('on',j===i));
}

function tipBtn(key){ return ` <button class="tipbtn" data-tip="${key}" onclick="event.stopPropagation();showTip('${key}')">상담 팁 ›</button>`; }

function showTip(key){
  const t=TIPS[key]; if(!t) return;
  // PC: 우측 패널의 해당 팁으로 이동·강조 / 모바일: 기존 팝업
  const card = document.getElementById('tip_'+key);
  if(isDesktop() && card){
    document.querySelectorAll('.tipcard.hl').forEach(x=>x.classList.remove('hl'));
    card.classList.add('hl');
    card.scrollIntoView({behavior:'smooth',block:'center'});
    return;
  }
  modal(`<h3>💡 상담 팁 — ${esc(t.t)}</h3><p style="font-size:14px;color:var(--muted80);line-height:1.7">${esc(t.b)}</p><button class="pill gray wide" onclick="closeModal()">닫기</button>`);
}

function chipLabel(on,o){ return on?('✓ '+esc(o)):esc(o); }

function fieldHTML(sec,f,data){
  data=data||{};
  if(f.cond && data[f.cond[0]]!==f.cond[1]) return '';
  const v=data[f.k];
  const lab=`<label>${esc(f.label)}${f.type==='chipN'?'<span class="multi">복수선택</span>':''}${f.tip?tipBtn(f.tip):''}</label>`;
  let body='';
  if(f.type==='text') body=`<input value="${esc(v||'')}" placeholder="${esc(f.ph||'')}" oninput="setVal('${sec}','${f.k}',this.value)">`;
  else if(f.type==='date') body=`<input type="date" value="${esc(v||'')}" oninput="setVal('${sec}','${f.k}',this.value)">`;
  else if(f.type==='textarea') body=`<textarea placeholder="${esc(f.ph||'')}" oninput="setVal('${sec}','${f.k}',this.value)">${esc(v||'')}</textarea>`;
  else if(f.type==='chip1') body=`<div class="chips">${f.opts.map(o=>{const on=v===o;return `<button class="chip ${f.danger?'danger':''} ${on?'on':''}" onclick="pick1('${sec}','${f.k}','${esc(o)}')">${chipLabel(on,o)}</button>`;}).join('')}</div>`;
  else if(f.type==='chipN'){ const arr=v||[]; body=`<div class="chips">${f.opts.map(o=>{const on=arr.includes(o);return `<button class="chip ${f.danger?'danger':''} ${on?'on':''}" onclick="pickN('${sec}','${f.k}','${esc(o)}')">${chipLabel(on,o)}</button>`;}).join('')}</div>`; }
  else if(f.type==='insight') body=INSIGHT.map(o=>`<div class="insight-opt ${v===o.n?'on':''}" onclick="pick1('${sec}','${f.k}','${o.n}')"><b>${o.n}</b><span>${esc(o.d)}</span></div>`).join('');
  let html=`<div class="fld ${f.w2?'w2':''}">${lab}${body}</div>`;
  if(f.risk && v==='유') html+=riskHTML(data);
  return html;
}

function riskHTML(d){
  const yn=(k)=>['유','무'].map(o=>`<button class="chip danger ${d[k]===o?'on':''}" style="flex:1;text-align:center" onclick="setVal('s3','${k}','${o}');renderTab()">${chipLabel(d[k]===o,o)}</button>`).join('');
  return `<div class="riskbox w2"><h4>⚠ 자살위험성 평가 — 자타해사고 '유' 즉시 실시</h4>
    <div class="subrow fld"><label>자살사고</label><div class="chips">${yn('riskIdea')}</div></div>
    <div class="subrow fld"><label>자살계획</label><div class="chips">${yn('riskPlan')}</div></div>
    <div class="subrow fld"><label>자살위험성 수준</label><div class="chips">${['낮음','중간','높음'].map(o=>`<button class="chip danger ${d.riskLevel===o?'on':''}" style="flex:1;text-align:center" onclick="setVal('s3','riskLevel','${o}');renderTab()">${chipLabel(d.riskLevel===o,o)}</button>`).join('')}</div></div>
    <div class="fld"><label>지지체계 · 대처 계획</label><textarea oninput="setVal('s3','riskSupport',this.value)">${esc(d.riskSupport||'')}</textarea></div>
  </div>`;
}

function cognitionHTML(d){
  d=d||{};
  const today=new Date(); const tStr=`${today.getFullYear()}년 ${today.getMonth()+1}월 ${today.getDate()}일`;
  const s7=d.serial7||['','','','',''];
  const jo=(k)=>['정','오'].map(o=>`<button class="chip ${d[k]===o?'on':''}" onclick="setVal('s3','${k}','${o}');renderTab()">${chipLabel(d[k]===o,o)}</button>`).join('');
  const yn=(k)=>['유','무'].map(o=>`<button class="chip ${d[k]===o?'on':''}" onclick="setVal('s3','${k}','${o}');renderTab()">${chipLabel(d[k]===o,o)}</button>`).join('');
  return `<div class="grp"><h3>8. 인지${tipBtn('cognition')}</h3>
    <div class="subrow fld"><label>(1) 지남력 ① 시간 <span style="font-weight:400;color:var(--muted48)">— 오늘: ${tStr}</span></label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input style="flex:1;min-width:150px" placeholder="응답 기록" value="${esc(d.oriTimeAns||'')}" oninput="setVal('s3','oriTimeAns',this.value)"><div class="chips">${jo('oriTime')}</div></div></div>
    <div class="subrow fld"><label>② 장소 — "여기가 어딘가요?"</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input style="flex:1;min-width:150px" placeholder="응답 기록" value="${esc(d.oriPlaceAns||'')}" oninput="setVal('s3','oriPlaceAns',this.value)"><div class="chips">${jo('oriPlace')}</div></div></div>
    <div class="subrow fld"><label>③ 사람 — "저는 누구인가요?"</label>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><input style="flex:1;min-width:150px" placeholder="응답 기록" value="${esc(d.oriPersonAns||'')}" oninput="setVal('s3','oriPersonAns',this.value)"><div class="chips">${jo('oriPerson')}</div></div></div>
    <div class="subrow fld"><label>(2) 메모리 ① 과거기억</label><div class="chips">${yn('memPast')}</div></div>
    <div class="subrow fld"><label>② 최근기억</label><div class="chips">${yn('memRecent')}</div></div>
    <div class="subrow fld"><label>③ 즉각저장 및 회상</label><div class="chips">${yn('memImmediate')}</div></div>
    <div class="subrow fld"><label>(3) 주의집중 — 100-7 연속뺄셈 <span style="font-weight:400;color:var(--muted48)">(자동 채점)</span></label>
      <div class="serial7">100${s7.map((x,i)=>` − 7 = <input inputmode="numeric" value="${esc(x)}" class="${x===''?'':(+x===SERIAL7[i]?'ok':'bad')}" oninput="setSerial7(${i},this)">`).join('')}
      <span class="grade" id="s7grade">${s7grade(s7)}</span></div></div>
    <div class="subrow fld"><label>(4) 추상적사고 — "돌다리도 두들겨 보고 건너라"의 뜻은?</label><input value="${esc(d.abstract||'')}" oninput="setVal('s3','abstract',this.value)" placeholder="응답 기록"></div>
  </div>`;
}
function s7grade(arr){
  const n=arr.filter(x=>x!=='').length; if(!n) return '';
  const ok=arr.filter((x,i)=>x!==''&&+x===SERIAL7[i]).length;
  return `✓ ${ok}/${n} 정답`;
}
function setSerial7(i,el){
  const c=CASES[CUR]; c.s3=c.s3||{};
  const arr=c.s3.serial7||['','','','',''];
  arr[i]=el.value.trim(); c.s3.serial7=arr;
  el.className = el.value===''?'':(+el.value===SERIAL7[i]?'ok':'bad');
  $('s7grade').textContent=s7grade(arr);
  markDirty();
}

function setVal(sec,k,v){
  if(sec==='sess'){ SESSIONS[MODE][CURSID][k]=v; markDirty(); return; }
  const c=CASES[CUR]; c[sec]=c[sec]||{}; c[sec][k]=v; markDirty();
}
function pick1(sec,k,v){
  if(sec==='sess'){ const d=SESSIONS[MODE][CURSID]; d[k]=(d[k]===v?null:v); markDirty(); renderTab(); return; }
  const c=CASES[CUR]; c[sec]=c[sec]||{}; c[sec][k]=(c[sec][k]===v?null:v); markDirty(); renderTab();
}
function pickN(sec,k,v){
  if(sec==='sess'){ const d=SESSIONS[MODE][CURSID]; let arr=d[k]||[]; arr=arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]; d[k]=arr; markDirty(); renderTab(); return; }
  const c=CASES[CUR]; c[sec]=c[sec]||{}; let arr=c[sec][k]||[]; arr=arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]; c[sec][k]=arr; markDirty(); renderTab();
}

/* ---------- 자동저장 ---------- */
function markDirty(){
  dirty=true;
  if(MODE==='mse'){
    localStorage.setItem('draft_'+CUR, JSON.stringify({s1:CASES[CUR].s1,s2:CASES[CUR].s2,s3:CASES[CUR].s3,t:Date.now()}));
  }
  clearTimeout(saveTimer); saveTimer=setTimeout(flushSave,1500);
  renderTabs(); updateSticky();
}
async function flushSave(){
  if(!dirty||!CUR) return;
  const now=Date.now();
  if(MODE==='mse'){
    const c=CASES[CUR];
    await db.ref(recordPath(CUR)).update({s1:c.s1||{},s2:c.s2||{},s3:c.s3||{},aiSummary:c.aiSummary||'',updatedAt:now,updatedBy:ME.name});
    await db.ref(casePath()+'/'+CUR).update({updatedAt:now, recProgress:progressOf(c)});
  } else if(CURSID){
    const d = SESSIONS[MODE][CURSID];
    await db.ref(SESSION_PATHS[MODE](CUR)+'/'+CURSID).update(Object.assign({}, d, {updatedAt:now, updatedBy:ME.name}));
    await db.ref(casePath()+'/'+CUR).update({updatedAt:now});
  }
  dirty=false; localStorage.removeItem('draft_'+CUR);
  const el=$('saveState'); if(el) el.textContent='자동저장됨';
}

/* ================================================================
   9. 요약·출력 탭 (+ 가계도 연동 타일)
================================================================ */
function summaryHTML(c){
  const gsCount = Object.keys(SESSIONS.gs||{}).length;
  const isCount = Object.keys(SESSIONS.is||{}).length;
  return `
    <div class="tile-dark">
      <h3>이 사례의 가계도</h3>
      <p>같은 케이스를 가계도 앱에서 엽니다. 계정·기관·케이스가 공유됩니다.</p>
      <span class="lkd" onclick="openGenogram('${esc(c.caseNo)}')">가계도 열기 ›</span>
    </div>

    <div class="grp"><h3>✨ MSE 요약 초안</h3>
    <p class="hint">MSE 3섹션 입력값을 임상 기록체로 요약합니다. 이름·주소·전화번호는 서버로 전송되지 않습니다.</p>
    <div class="ai-out" id="aiOut">${esc(c.aiSummary||'아직 생성된 요약이 없습니다.')}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="pill" id="aiBtn" onclick="genSummary()">요약 초안 생성</button>
      <button class="pill ghost" onclick="copySummary()">복사</button>
    </div></div>

    <div class="grp"><h3>🧭 대상자 종합 요약 초안 (이력 통합)</h3>
    <p class="hint">
      MSE + 일반상담 ${gsCount}회 + 개별상담 ${isCount}회를 시간순으로 정리해 대상자의 전체 이력을 요약합니다.
      생성 결과는 반드시 검토·수정 후 사용하세요.
    </p>
    <div class="ai-out" id="overOut">${esc(c.overviewSummary||'아직 생성된 종합 요약이 없습니다.')}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="pill" id="overBtn" onclick="genOverview()">종합 요약 생성</button>
      <button class="pill ghost" onclick="copyOverview()">복사</button>
    </div></div>

    <div class="grp"><h3>🖨 기록지 출력</h3>
    <p class="hint">출력할 항목을 선택하세요. 이름이 포함되니 보관에 유의하세요.</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">
      <button class="pill ghost" onclick="printCase()">사례관리 기록지 (MSE)</button>
      <button class="pill ghost" onclick="printGS()">일반상담 회차 (${gsCount}건)</button>
      <button class="pill ghost" onclick="printIS()">개별상담 회차 (${isCount}건)</button>
      <button class="pill" onclick="printAll()">전체 통합 인쇄</button>
    </div></div>`;
}

function anonPayload(c, includeSessions){
  const s1={...(c.s1||{})}; delete s1.address; delete s1.phone;
  const p = {caseNo:c.caseNo, s1, s2:c.s2||{}, s3:c.s3||{}};
  if(includeSessions){
    // 이름·연락처 등 식별정보는 케이스 메타(title 등)에만 있으므로 회차 데이터는 그대로 전송 안전
    p.consultations = Object.values(SESSIONS.gs||{}).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    p.sessions      = Object.values(SESSIONS.is||{}).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  }
  return p;
}

async function genSummary(){
  const btn=$('aiBtn'); btn.disabled=true; btn.innerHTML='<span class="spinner"></span>생성 중…';
  try{
    const res=await fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseData:anonPayload(CASES[CUR])})});
    const data=await res.json();
    if(!res.ok||!data.summary) throw new Error(data.error||'응답 오류');
    CASES[CUR].aiSummary=data.summary;
    $('aiOut').textContent=data.summary;
    markDirty(); flushSave();
  }catch(e){
    toast('요약 생성 실패');
    $('aiOut').textContent = '요약 생성에 실패했습니다: ' + (e.message||'') +
      '\n\n확인할 것:\n1. Cloudflare → 프로젝트 → Settings → Variables and Secrets 에 OPENAI_API_KEY 등록 여부\n2. worker.js 배포 여부 (wrangler.jsonc 의 main 설정)\n(입력·저장 기능과는 무관합니다)';
  }
  finally{ btn.disabled=false; btn.textContent='요약 초안 생성'; }
}
function copySummary(){
  const t=CASES[CUR].aiSummary; if(!t){toast('복사할 요약이 없습니다');return;}
  navigator.clipboard.writeText(t).then(()=>toast('복사되었습니다'));
}

/* ================================================================
   대상자 종합 요약 (MSE + 일반상담 + 개별상담 시간순)
================================================================ */
async function genOverview(){
  const btn=$('overBtn'); btn.disabled=true; btn.innerHTML='<span class="spinner"></span>생성 중…';
  try{
    const payload = anonPayload(CASES[CUR], true);
    const res=await fetch(AI_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({caseData:payload, mode:'overview'})});
    const data=await res.json();
    if(!res.ok||!data.summary) throw new Error(data.error||'응답 오류');
    CASES[CUR].overviewSummary=data.summary;
    $('overOut').textContent=data.summary;
    // 저장 (records 노드에 함께 보관)
    await db.ref(recordPath(CUR)).update({overviewSummary:data.summary, updatedAt:Date.now()});
  }catch(e){
    toast('종합 요약 생성 실패');
    $('overOut').textContent = '생성에 실패했습니다: ' + (e.message||'') +
      '\n\nAI 요약 서버 설정을 확인해 주세요.';
  }
  finally{ btn.disabled=false; btn.textContent='종합 요약 생성'; }
}
function copyOverview(){
  const t=CASES[CUR].overviewSummary; if(!t){toast('복사할 종합 요약이 없습니다');return;}
  navigator.clipboard.writeText(t).then(()=>toast('복사되었습니다'));
}

/* ---------- 인쇄 (v1과 동일) ---------- */
function fv(v){ return Array.isArray(v)?v.join(', '):esc(v||''); }
function buildMseHTML(c){
  const d1=c.s1||{}, d2=c.s2||{}, d3=c.s3||{};
  const row=(th,v)=>`<tr><th>${th}</th><td>${fv(v)||'&nbsp;'}</td></tr>`;
  return `<h2>1. 인적사항</h2><table>
  <tr><th>이름</th><td>${esc(c.title||'')}</td><th>나이 / 성별</th><td>만 ${fv(d1.age)}세 / ${fv(d1.gender)}</td></tr>
  ${row('의료보장',d1.insurance)}${row('정신장애 등급',d1.mDisability)}${row('기타장애',d1.oDisability)}${row('신장/체중',d1.body)}
  ${row('주소',d1.address)}${row('전화번호',d1.phone)}${row('학력',d1.edu)}${row('결혼',d1.marriage)}${row('종교',d1.religion)}${row('군대력',d1.military)}
  ${row('주거형태',d1.housing)}${row('가족형태',d1.famType)}${row('발병연도/나이',(d1.onsetYear||'')+' / '+(d1.onsetAge||''))}
  ${row('가족력',d1.famHist)}${row('진단력',d1.diagnosis)}${row('치료력',d1.treatment)}${row('입원력',d1.admission)}${row('신체질환',d1.physical)}
  ${row('자살시도 나이',d1.suiAge)}${row('문제유형',d1.probType)}${row('시도방법',d1.suiMethod)}
  ${row('현 직업',d1.job)}${row('직업력',d1.jobHist)}${row('센터를 알게 된 동기',d1.referral)}${row('가계도 메모',d1.genogram)}</table>
  <h2>2. 병력정보</h2><table>
  ${row('임신',d2.pregnancy)}${row('출생 시 상태',d2.birth)}${row('발육 상태',d2.growth)}${row('주양육자',d2.caregiver)}
  ${row('훈육 방식',d2.discipline)}${row('아동기 학습태도',d2.cStudy)}${row('아동기 대인관계',d2.cRelation)}${row('아동기 기타',d2.cEtc)}
  ${row('청소년기 학습태도',d2.tStudy)}${row('청소년기 대인관계',d2.tRelation)}${row('청소년기 특이사항',d2.tIssues)}${row('청소년기 기타',d2.tEtc)}
  ${row('성인기 대인관계',d2.aRelation)}${row('이성 교제',d2.dating)}${row('상세내용',d2.aDetail)}</table>
  <h2>3. 임상적평가 (MSE)</h2><table>
  ${row('1. 외관',d3.appearance)}${row('2. 태도',d3.attitude)}${row('3. 행동',d3.behavior)}
  ${row('4. 언어',['자발성:'+(d3.spSpont||'-'),'생산성:'+(d3.spProd||'-'),'속도:'+(d3.spSpeed||'-'),'고저:'+(d3.spPitch||'-'),'톤:'+(d3.spTone||'-'),'장애:'+((d3.spDisorder||[]).join('·')||'-')].join(' / '))}
  ${row('5. 기분(mood)',d3.mood)}${row('정서(affect)',[(d3.affectFit||''),...(d3.affect||[])].filter(Boolean))}
  ${row('6. 지각',d3.perception)}
  ${row('7. 사고 형태·과정',[(d3.thFit||''),...(d3.thProcess||[])].filter(Boolean))}
  ${row('사고내용',d3.thContent==='유'?['유',...(d3.thContentList||[])]:d3.thContent)}
  ${row('망상',d3.delusion)}${row('자타해사고',d3.harmThought)}
  ${d3.harmThought==='유'?row('자살위험성 평가',['자살사고:'+(d3.riskIdea||'-'),'자살계획:'+(d3.riskPlan||'-'),'위험수준:'+(d3.riskLevel||'-'),'지지체계:'+(d3.riskSupport||'-')].join(' / ')):''}
  ${row('8. 지남력',['시간:'+(d3.oriTime||'-'),'장소:'+(d3.oriPlace||'-'),'사람:'+(d3.oriPerson||'-')].join(' / '))}
  ${row('메모리',['과거:'+(d3.memPast||'-'),'최근:'+(d3.memRecent||'-'),'즉각:'+(d3.memImmediate||'-')].join(' / '))}
  ${row('주의집중 (100-7)',(d3.serial7||[]).join(', ')+(d3.serial7?'  ('+s7grade(d3.serial7)+')':''))}
  ${row('추상적사고',d3.abstract)}${row('9. 판단력',d3.judgment)}
  ${row('10. 병식',d3.insight?d3.insight+' — '+(INSIGHT.find(x=>x.n===d3.insight)?.d||''):'')}</table>
  ${c.aiSummary?`<h2>MSE 요약</h2><table><tr><td style="white-space:pre-wrap;line-height:1.6">${esc(c.aiSummary)}</td></tr></table>`:''}`;
}

function printCase(){
  const c=CASES[CUR];
  const h = `<h1>▣ 사례관리 기록지 (S)</h1>
  <table><tr><th>사례번호</th><td>${esc(c.caseNo)}</td><th>작성일</th><td>${fv((c.s1||{}).consultDate)}</td></tr>
  <tr><th>작성자</th><td>${esc(c.ownerName||'')}</td><th>상담구분</th><td>${fv((c.s1||{}).consultType)}</td></tr>
  <tr><th>정보제공자</th><td colspan="3">${fv((c.s1||{}).informant)}</td></tr></table>
  ${buildMseHTML(c)}
  <p style="font-size:8pt;margin-top:8pt">출력: ${new Date().toLocaleString('ko-KR')} / ${esc(ME.name)} · 본 문서는 민감정보를 포함하므로 취급에 유의하십시오.</p>`;
  $('printArea').innerHTML=h;
  window.print();
}

/* ================================================================
   회차 인쇄 (일반상담 / 개별상담) 및 전체 통합 인쇄
================================================================ */
function headerHTML(c, subtitle){
  return `<h1>▣ ${esc(subtitle)}</h1>
    <table>
      <tr><th>사례번호</th><td>${esc(c.caseNo||'')}</td><th>대상자</th><td>${esc(c.title||'')}</td></tr>
      <tr><th>담당자</th><td>${esc(c.ownerName||'')}</td><th>출력</th><td>${new Date().toLocaleString('ko-KR')} / ${esc(ME.name)}</td></tr>
    </table>`;
}

function gsRow(th,v){ return `<tr><th>${th}</th><td>${fv(v)||'&nbsp;'}</td></tr>`; }

function gsSessionHTML(s, idx){
  return `<h2>일반상담 · ${idx+1}회차 (${esc(s.date||'')})</h2><table>
    ${gsRow('상담일시', s.date)}${gsRow('소요시간(분)', s.time)}${gsRow('응급성', s.urgency)}
    ${gsRow('정보제공자', s.informant)}${gsRow('상담이력', s.history)}${gsRow('상담유형', s.method)}
    ${gsRow('상담구분', s.kind)}${gsRow('정보취득경로', s.route)}${gsRow('의뢰경로', s.referral)}
    ${gsRow('문제종류', s.probType)}${gsRow('정신건강문제 분류', s.mhIssue)}
    ${gsRow('상담내용', s.content)}${gsRow('상담결과', s.result)}
    ${gsRow('주요 조치', s.action)}${gsRow('조치·종결형태', s.endType)}${gsRow('다음 조치', s.nextPlan)}
  </table>`;
}

function isSessionHTML(s, idx){
  return `<h2>개별상담 · ${idx+1}회차 (${esc(s.date||'')})</h2><table>
    ${gsRow('제목', s.title)}${gsRow('내용', s.content)}
  </table>`;
}

function printGS(){
  const c=CASES[CUR];
  const list=Object.values(SESSIONS.gs||{}).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(!list.length){ toast('출력할 일반상담 회차가 없습니다'); return; }
  const h = headerHTML(c, '일반상담 회차 기록') + list.map(gsSessionHTML).join('');
  $('printArea').innerHTML=h; window.print();
}

function printIS(){
  const c=CASES[CUR];
  const list=Object.values(SESSIONS.is||{}).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  if(!list.length){ toast('출력할 개별상담 회차가 없습니다'); return; }
  const h = headerHTML(c, '개별상담 회차 기록') + list.map(isSessionHTML).join('');
  $('printArea').innerHTML=h; window.print();
}

function printAll(){
  const c=CASES[CUR];
  const gsList=Object.values(SESSIONS.gs||{}).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const isList=Object.values(SESSIONS.is||{}).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  let h = headerHTML(c, '대상자 종합 기록');
  if(c.overviewSummary){
    h += `<h2>종합 요약</h2><table><tr><td style="white-space:pre-wrap;line-height:1.6">${esc(c.overviewSummary)}</td></tr></table>`;
  }
  h += buildMseHTML(c);
  if(gsList.length){
    h += `<div class="pgbreak"></div>` + gsList.map(gsSessionHTML).join('');
  }
  if(isList.length){
    h += `<div class="pgbreak"></div>` + isList.map(isSessionHTML).join('');
  }
  h += `<p style="font-size:8pt;margin-top:8pt">출력: ${new Date().toLocaleString('ko-KR')} / ${esc(ME.name)} · 본 문서는 민감정보를 포함하므로 취급에 유의하십시오.</p>`;
  $('printArea').innerHTML=h; window.print();
}