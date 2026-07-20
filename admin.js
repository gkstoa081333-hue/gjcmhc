// admin.js — 기관 관리 (관리자 전용)
// 가입 신청 승인 · 구성원 권한 관리 · 가입코드 확인
// 데이터: orgMembers/{orgId}/{uid} 와 users/{uid} 를 함께 갱신 (가계도 앱과 동일 규격)

async function openAdmin(){
  let members={}, joinCode='';
  try{ members=(await db.ref('orgMembers/'+ME.orgId).once('value')).val()||{}; }
  catch(e){ toast('구성원 목록을 불러올 수 없습니다 (관리자만 조회 가능)'); }
  // 가입코드는 관리자만 읽을 수 있는 orgPrivate 에 있습니다
  try{ joinCode=((await db.ref('orgPrivate/'+ME.orgId).once('value')).val()||{}).joinCode||''; }catch(e){}

  const list=Object.entries(members).sort((a,b)=>(a[1].createdAt||0)-(b[1].createdAt||0));
  const pending=list.filter(([,m])=>!m.approved);
  const active =list.filter(([,m])=>m.approved);

  const row=(uid,m,isPending)=>`
    <div class="acct-row">
      <div style="flex:1;min-width:0">
        <b>${esc(m.name||'—')}</b>
        <span style="color:var(--muted48);font-size:12.5px"> ${esc(m.email||'')}</span>
        <span class="rolebadge">${m.role==='admin'?'관리자':'직원'}</span>
      </div>
      ${isPending
        ? `<button class="pill" style="padding:5px 12px;font-size:12px" onclick="approveMember('${uid}')">승인</button>
           <button class="linkbtn" onclick="rejectMember('${uid}')">거절</button>`
        : (uid===ME.uid ? `<span style="font-size:12px;color:var(--muted48)">나</span>`
           : `<button class="linkbtn" onclick="toggleRole('${uid}','${m.role}')">${m.role==='admin'?'직원으로':'관리자로'}</button>
              <button class="linkbtn" onclick="removeMember('${uid}')">삭제</button>`)}
    </div>`;

  modal(`<h3>기관 관리</h3>
    <div class="joincode">
      <span>가입코드</span>
      <b>${esc(joinCode||'—')}</b>
      <button class="linkbtn" onclick="copyCode('${esc(joinCode)}')">복사</button>
    </div>
    <p style="font-size:12px;color:var(--muted48);margin:6px 0 16px;line-height:1.55">
      직원에게 이 코드를 알려주면 가입 신청할 수 있습니다. 신청은 아래에서 승인해야 이용 가능합니다.</p>

    <div class="sec-t">가입 신청 ${pending.length?`<span class="cnt">${pending.length}</span>`:''}</div>
    ${pending.length ? pending.map(([u,m])=>row(u,m,true)).join('')
      : `<p class="pane-empty" style="padding:6px 0">대기 중인 신청이 없습니다.</p>`}

    <div class="sec-t" style="margin-top:18px">구성원 <span class="cnt">${active.length}</span></div>
    ${active.map(([u,m])=>row(u,m,false)).join('')}

    <button class="pill gray wide" onclick="closeModal()">닫기</button>`);
}

function copyCode(code){
  if(!code) return;
  navigator.clipboard.writeText(code).then(()=>toast('가입코드를 복사했습니다'));
}

async function approveMember(uid){
  try{
    await db.ref('orgMembers/'+ME.orgId+'/'+uid+'/approved').set(true);
    await db.ref('users/'+uid+'/approved').set(true);
    toast('승인했습니다');
  }catch(e){ toast('승인 실패: 권한을 확인하세요'); }
  openAdmin();
}

async function rejectMember(uid){
  if(!confirm('가입 신청을 거절할까요?')) return;
  try{
    await db.ref('orgMembers/'+ME.orgId+'/'+uid).remove();
    await db.ref('users/'+uid+'/approved').set(false);
    toast('거절했습니다');
  }catch(e){ toast('처리 실패'); }
  openAdmin();
}

async function toggleRole(uid, cur){
  const next = cur==='admin' ? 'member' : 'admin';
  if(!confirm(next==='admin' ? '이 직원을 관리자로 지정할까요?' : '관리자 권한을 해제할까요?')) return;
  try{
    await db.ref('orgMembers/'+ME.orgId+'/'+uid+'/role').set(next);
    await db.ref('users/'+uid+'/role').set(next);
    toast('권한을 변경했습니다');
  }catch(e){ toast('변경 실패'); }
  openAdmin();
}

async function removeMember(uid){
  if(!confirm('이 구성원을 기관에서 제외할까요?\n(계정 자체는 남으며, 다시 가입 신청할 수 있습니다)')) return;
  try{
    await db.ref('orgMembers/'+ME.orgId+'/'+uid).remove();
    await db.ref('users/'+uid+'/approved').set(false);
    toast('제외했습니다');
  }catch(e){ toast('처리 실패'); }
  openAdmin();
}
