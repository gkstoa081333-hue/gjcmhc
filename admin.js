// admin.js — 계정 관리 (관리자 전용)
/* ================================================================
   10. 계정 관리 (관리자)  — v1과 동일
================================================================ */
async function openAdmin(){
  const snap=await db.ref('accounts').once('value'); ACCOUNTS=snap.val()||{};
  modal(`<h3>계정 관리</h3>
    <div id="acctList">${Object.entries(ACCOUNTS).map(([u,a])=>`
      <div class="acct-row"><b>${esc(a.name)}</b><span style="color:var(--muted48)">@${esc(a.id)} · ${a.role==='admin'?'관리자':'직원'}</span>
      <div style="flex:1"></div>${u!==ME.uid?`<button class="nlink" style="color:var(--muted48)" onclick="delAcct('${u}')">삭제</button>`:''}</div>`).join('')}</div>
    <label>이름</label><input id="naName">
    <label>아이디</label><input id="naId">
    <label>초기 비밀번호</label><input id="naPw">
    <label>권한</label><select id="naRole"><option value="staff">직원</option><option value="admin">관리자</option></select>
    <div style="display:flex;gap:8px;margin-top:18px">
      <button class="pill gray" style="flex:1" onclick="closeModal()">닫기</button>
      <button class="pill" style="flex:1" onclick="addAcct()">계정 추가</button>
    </div>`);
}
async function addAcct(){
  const name=$('naName').value.trim(), id=$('naId').value.trim(), pw=$('naPw').value, role=$('naRole').value;
  if(!name||!id||pw.length<4){toast('입력을 확인하세요 (비밀번호 4자 이상)');return;}
  if(Object.values(ACCOUNTS).some(a=>a.id===id)){toast('이미 존재하는 아이디입니다');return;}
  await db.ref('accounts/u'+Date.now()).set({id,pwHash:await sha256(id+':'+pw),name,role,createdAt:Date.now()});
  toast('계정이 추가되었습니다'); openAdmin();
}
async function delAcct(u){
  if(!confirm('이 계정을 삭제할까요?'))return;
  await db.ref('accounts/'+u).remove(); toast('삭제되었습니다'); openAdmin();
}