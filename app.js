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
    .filter(([,c])=>!q || (c.caseNo||'').toLowerCase().includes(q) || (c._name||'').toLowerCase().includes(q) || (c.assignedTo||'').toLowerCase().includes(q))
    .sort((a,b)=>(b[1].updatedAt||0)-(a[1].updatedAt||0));
  $('listCount').textContent = arr.length+'건';
  $('caseList').innerHTML = arr.length ? arr.map(([cid,c])=>{
    const p=progressOf(c);
    return `<div class="gc" onclick="openCase('${cid}')">
      <span class="no">${esc(c.caseNo)}</span>
      <span class="nm">${esc(c._name)}</span>
      <span class="mt">담당 ${esc(c.assignedTo||'-')} · ${c.updatedAt?new Date(c.updatedAt).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'}):''} 수정</span>
      <div class="pr"><i style="width:${p}%"></i></div>
      <div class="foot"><span class="lk">기록 열기 ›</span><button class="del" onclick="event.stopPropagation();delCase('${cid}')">삭제</button></div>
    </div>`;
  }).join('')
  : `<div class="empty" style="grid-column:1/-1">등록된 사례가 없습니다. ‘＋ 새 사례’로 시작하세요.</div>`;
}

function nextCaseNo(){
  const yr=new Date().getFullYear();
  const nums=Object.values(CASES).map(c=>{const m=(c.caseNo||'').match(new RegExp(`S-${yr}-(\\d+)`));return m?+m[1]:0;});
  return `S-${yr}-${String(Math.max(0,...nums)+1).padStart(3,'0')}`;
}

function openNewCase(){
  modal(`<h3>새 사례 등록</h3>
    <label>사례번호</label><input id="ncNo" value="${nextCaseNo()}">
    <label>이름 <span style="font-weight:400;color:var(--muted48)">(암호화되어 저장됩니다 🔒)</span></label><input id="ncName">
    <label>담당자</label><input id="ncAssign" value="${esc(ME.name)}">
    <div style="display:flex;gap:8px;margin-top:20px">
      <button class="pill gray" style="flex:1" onclick="closeModal()">취소</button>
      <button class="pill" style="flex:1" onclick="createCase()">등록</button>
    </div>`);
}

async function createCase(){
  const no=$('ncNo').value.trim(), nm=$('ncName').value.trim(), as=$('ncAssign').value.trim();
  if(!no||!nm){ toast('사례번호와 이름을 입력하세요'); return; }
  const cid='c'+Date.now();
  await db.ref('cases/'+cid).set({
    caseNo:no, nameEnc:await encText(nm), assignedTo:as, status:'active',
    s1:{consultDate:new Date().toISOString().slice(0,10), writer:ME.name}, s2:{}, s3:{},
    createdAt:Date.now(), updatedAt:Date.now(), updatedBy:ME.name
  });
  closeModal(); toast('사례가 등록되었습니다');
  setTimeout(()=>openCase(cid),300);
}

function delCase(cid){
  if(!confirm(`[${CASES[cid].caseNo}] 사례를 삭제할까요? (휴지통 이동, 관리자가 DB에서 복구 가능)`)) return;
  db.ref('cases/'+cid+'/status').set('deleted');
  db.ref('cases/'+cid+'/updatedAt').set(Date.now());
  toast('삭제되었습니다');
}

/* ================================================================
   8. 편집기 (시안 B — 컨피규레이터)
================================================================ */
const TABNAMES=['인적','병력','MSE','요약'];

function openCase(cid){
  CUR=cid; CURTAB=0; dirty=false;
  $('edTitle').innerHTML=`${esc(CASES[cid].caseNo)}<small>${esc(CASES[cid]._name)} · ${esc(CASES[cid].assignedTo||'-')}</small>`;
  show('scrEdit'); renderTabs(); renderTab(); updateSticky();
}
function backToList(){ flushSave(); show('scrList'); renderList(); }

function renderTabs(){
  const c=CASES[CUR];
  const pcts=[secPct(S1,c.s1), secPct2(c.s2), msePct(c.s3), null];
  $('tabs').innerHTML=TABNAMES.map((t,i)=>`<button class="${i===CURTAB?'on':''}" onclick="switchTab(${i})">${t}${pcts[i]!==null?`<span class="pc">${pcts[i]}%</span>`:''}</button>`).join('');
}

function switchTab(i){ CURTAB=i; renderTabs(); renderTab(); updateSticky(); window.scrollTo({top:0}); }
function stepTab(dir){
  const n=CURTAB+dir;
  if(n<0) return;
  if(n>=TABNAMES.length){ backToList(); return; }
  switchTab(n);
}

function updateSticky(){
  const c=CASES[CUR]; if(!c) return;
  const pcts=[secPct(S1,c.s1), secPct2(c.s2), msePct(c.s3), null];
  const pct = pcts[CURTAB];
  $('stState').innerHTML = `<b>${TABNAMES[CURTAB]}</b>${pct!==null?` ${pct}%`:''} · <em id="saveState">${dirty?'입력 중…':'자동저장됨'}</em>`;
  $('btnPrev').style.visibility = CURTAB===0?'hidden':'visible';
  $('btnNext').textContent = CURTAB===TABNAMES.length-1 ? '목록으로' : '다음 섹션';
}

function renderTab(){
  const c=CASES[CUR];
  if(CURTAB===0) $('tabBody').innerHTML=`<div class="grp"><h3>1. 인적사항</h3><p class="hint">주민등록번호는 보안 정책상 입력하지 않습니다. 이름은 암호화되어 저장됩니다.</p><div class="fgrid">${S1.map(f=>fieldHTML('s1',f,c.s1)).join('')}</div></div>`;
  if(CURTAB===1) $('tabBody').innerHTML=S2.map(g=>`<div class="grp"><h3>${g.g} <span class="age">${g.age}</span>${g.tip?tipBtn(g.tip):''}</h3>${g.items.map(f=>`<div class="subrow">${fieldHTML('s2',f,c.s2)}</div>`).join('')}</div>`).join('');
  if(CURTAB===2) $('tabBody').innerHTML=S3.map(g=>{
    if(g.special==='cognition') return cognitionHTML(c.s3);
    return `<div class="grp"><h3>${g.g}${g.tip?tipBtn(g.tip):''}</h3>${g.items.map(f=>`<div class="subrow">${fieldHTML('s3',f,c.s3)}</div>`).join('')}</div>`;
  }).join('');
  if(CURTAB===3) $('tabBody').innerHTML=summaryHTML(c);
}

function tipBtn(key){ return ` <button class="tipbtn" onclick="event.stopPropagation();showTip('${key}')">상담 팁 ›</button>`; }
function showTip(key){ const t=TIPS[key]; modal(`<h3>💡 상담 팁 — ${esc(t.t)}</h3><p style="font-size:14px;color:var(--muted80);line-height:1.7">${esc(t.b)}</p><button class="pill gray wide" onclick="closeModal()">닫기</button>`); }

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

function setVal(sec,k,v){ const c=CASES[CUR]; c[sec]=c[sec]||{}; c[sec][k]=v; markDirty(); }
function pick1(sec,k,v){ const c=CASES[CUR]; c[sec]=c[sec]||{}; c[sec][k]=(c[sec][k]===v?null:v); markDirty(); renderTab(); }
function pickN(sec,k,v){ const c=CASES[CUR]; c[sec]=c[sec]||{}; let arr=c[sec][k]||[]; arr=arr.includes(v)?arr.filter(x=>x!==v):[...arr,v]; c[sec][k]=arr; markDirty(); renderTab(); }

/* ---------- 자동저장 ---------- */
function markDirty(){
  dirty=true;
  localStorage.setItem('draft_'+CUR, JSON.stringify({s1:CASES[CUR].s1,s2:CASES[CUR].s2,s3:CASES[CUR].s3,t:Date.now()}));
  clearTimeout(saveTimer); saveTimer=setTimeout(flushSave,1500);
  renderTabs(); updateSticky();
}
async function flushSave(){
  if(!dirty||!CUR) return;
  const c=CASES[CUR];
  await db.ref('cases/'+CUR).update({s1:c.s1||{},s2:c.s2||{},s3:c.s3||{},aiSummary:c.aiSummary||'',updatedAt:Date.now(),updatedBy:ME.name});
  dirty=false; localStorage.removeItem('draft_'+CUR);
  const el=$('saveState'); if(el) el.textContent='자동저장됨';
}

/* ================================================================
   9. 요약·출력 탭 (+ 가계도 연동 타일)
================================================================ */
function summaryHTML(c){
  return `
    <div class="tile-dark">
      <h3>이 사례의 가계도</h3>
      <p>가계도 앱 v2.7과 연동 — 사례번호(${esc(c.caseNo)})만 전달되며 이름·개인정보는 전송되지 않습니다.</p>
      <span class="lkd" onclick="openGenogram('${esc(c.caseNo)}')">가계도 열기 ›</span>
    </div>
    <div class="grp"><h3>✨ AI 요약 초안</h3>
    <p class="hint">체크 항목과 임상 서술만 전송됩니다. 이름·주소·전화번호는 서버로 전송되지 않습니다. 생성 결과는 반드시 검토·수정 후 사용하세요.</p>
    <div class="ai-out" id="aiOut">${esc(c.aiSummary||'아직 생성된 요약이 없습니다.')}</div>
    <div style="display:flex;gap:8px;margin-top:14px">
      <button class="pill" id="aiBtn" onclick="genSummary()">요약 초안 생성</button>
      <button class="pill ghost" onclick="copySummary()">복사</button>
    </div></div>
    <div class="grp"><h3>기록지 출력</h3>
    <p class="hint">서식 형태로 인쇄하거나 PDF로 저장합니다. 이름이 출력물에 포함되니 보관에 유의하세요.</p>
    <button class="pill ghost" onclick="printCase()">인쇄 / PDF 저장</button></div>`;
}

function anonPayload(c){
  const s1={...(c.s1||{})}; delete s1.address; delete s1.phone;
  return {caseNo:c.caseNo, s1, s2:c.s2||{}, s3:c.s3||{}};
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
  }catch(e){ toast('요약 생성 실패: '+e.message); }
  finally{ btn.disabled=false; btn.textContent='요약 초안 생성'; }
}
function copySummary(){
  const t=CASES[CUR].aiSummary; if(!t){toast('복사할 요약이 없습니다');return;}
  navigator.clipboard.writeText(t).then(()=>toast('복사되었습니다'));
}

/* ---------- 인쇄 (v1과 동일) ---------- */
function fv(v){ return Array.isArray(v)?v.join(', '):esc(v||''); }
function printCase(){
  const c=CASES[CUR], d1=c.s1||{}, d2=c.s2||{}, d3=c.s3||{};
  const row=(th,v)=>`<tr><th>${th}</th><td>${fv(v)||'&nbsp;'}</td></tr>`;
  let h=`<h1>▣ 사례관리 기록지 (S)</h1>
  <table><tr><th>사례번호</th><td>${esc(c.caseNo)}</td><th>작성일</th><td>${fv(d1.consultDate)}</td></tr>
  <tr><th>작성자</th><td>${esc(c.assignedTo||'')}</td><th>상담구분</th><td>${fv(d1.consultType)}</td></tr>
  <tr><th>정보제공자</th><td colspan="3">${fv(d1.informant)}</td></tr></table>
  <h2>1. 인적사항</h2><table>
  <tr><th>이름</th><td>${esc(c._name)}</td><th>나이 / 성별</th><td>만 ${fv(d1.age)}세 / ${fv(d1.gender)}</td></tr>
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
  ${c.aiSummary?`<h2>종합 요약</h2><table><tr><td style="white-space:pre-wrap">${esc(c.aiSummary)}</td></tr></table>`:''}
  <p style="font-size:8pt;margin-top:8pt">출력: ${new Date().toLocaleString('ko-KR')} / ${esc(ME.name)} · 본 문서는 민감정보를 포함하므로 취급에 유의하십시오.</p>`;
  $('printArea').innerHTML=h;
  window.print();
}