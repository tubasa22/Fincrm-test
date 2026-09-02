function bootApp(){
  document.getElementById('loginScreen').style.display='none';
  document.getElementById('loginSpinner').style.display='none';
  document.getElementById('app').classList.add('on');
  setSyncStatus(isDemo?'데모 모드':'연결됨',true);
  const banner = document.getElementById('demoBanner');
  if(banner) banner.style.display = isDemo ? 'block' : 'none';
  const saved = localStorage.getItem('fcrm_user');
  if(saved){ try{ updateUserUI(JSON.parse(saved)); }catch(e){} }
  document.getElementById('userWrap').style.display = 'block';
  
  // ── Twilio 설정 복원 ──
  const t = JSON.parse(localStorage.getItem('twilio')||'{}');
  if(t.sid) document.getElementById('twilioSid').value = t.sid;
  if(t.token) document.getElementById('twilioToken').value = t.token;
  if(t.from) document.getElementById('twilioFrom').value = t.from;
  updateTwilioStatus();
  
  // ── 온보딩 체크 ── 최초 실행 시 프로필 입력 (데모 제외)
  const profile = localStorage.getItem('fcrm_user_profile');
  if(!profile && !isDemo){  // ★ 데모 모드면 onboarding 스킵
    setTimeout(()=>openOnboarding(), 600);
  } else {
    applyUserCode();
  }
  if(!isDemo) loadAll().then(restoreFromHash); else { renderAll(); restoreFromHash(); }
}

// 새로고침 시 URL hash 보고 위치 복원
function restoreFromHash(){
  const hash = location.hash.replace('#','');
  if(!hash) return;
  if(hash.startsWith('detail-')){
    const rowIdx = parseInt(hash.replace('detail-',''));
    if(!isNaN(rowIdx)){
      const c = clients.find(x=>x.rowIdx===rowIdx);
      if(c){ openDetail(rowIdx); return; }
    }
  }
  // 탭 복원
  const tabMap = {dashboard:'dashboard',clients:'clients',schedule:'schedule',birthday:'birthday',sms:'sms',automation:'automation'};
  if(tabMap[hash]){
    const tabEl = Array.from(document.querySelectorAll('.tab')).find(t=>t.getAttribute('onclick')&&t.getAttribute('onclick').includes("'"+hash+"'"));
    if(tabEl) showTab(hash, tabEl);
  }
}

// ══════════════════════════════════════
// SHEETS API
// ══════════════════════════════════════
async function sheetsReq(method,path,body=null){
  const url=`https://sheets.googleapis.com/v4/spreadsheets/${path}`;
  const r=await fetch(url,{method,headers:{'Authorization':'Bearer '+accessToken,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e?.error?.message||`HTTP ${r.status}`);}
  return r.json();
}

// ══════════════════════════════════════
// DRIVE API
// ══════════════════════════════════════
async function driveUpload(file, clientName, fileType) {
  if(!accessToken) throw new Error('로그인이 필요합니다');
  let folderId = await findOrCreateFolder('FinCRM_고객서류');
  let clientFolderId = await findOrCreateFolder(clientName, folderId);
  const meta = {name:`[${fileType}] ${file.name}`,parents:[clientFolderId]};
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(meta)],{type:'application/json'}));
  form.append('file', file);
  const r = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',{
    method:'POST',headers:{Authorization:'Bearer '+accessToken},body:form
  });
  if(!r.ok){
    const e=await r.json().catch(()=>({}));
    const msg=e?.error?.message||`HTTP ${r.status}`;
    if(r.status===401) throw new Error('인증 만료 — 페이지를 새로고침 후 다시 로그인해주세요');
    if(r.status===403) throw new Error('Drive 권한 없음 — 로그아웃 후 다시 로그인해주세요');
    throw new Error(msg);
  }
  const data = await r.json();
  try{
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`,{
      method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
      body:JSON.stringify({role:'reader',type:'anyone'})
    });
  }catch(e){}
  return data;
}

async function findOrCreateFolder(name, parentId=null) {
  const q = parentId
    ? `name='${name}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const r = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,{headers:{Authorization:'Bearer '+accessToken}});
  const d = await r.json();
  if(d.files && d.files.length>0) return d.files[0].id;
  const meta = {name, mimeType:'application/vnd.google-apps.folder',...(parentId?{parents:[parentId]}:{})};
  const cr = await fetch('https://www.googleapis.com/drive/v3/files?fields=id',{
    method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:JSON.stringify(meta)
  });
  const cd = await cr.json();
  return cd.id;
}

// ══════════════════════════════════════
// LOAD
// ══════════════════════════════════════
async function loadAll(){
  setSyncStatus('동기화 중...',false);
  try{
    const d=await sheetsReq('GET',`${MAIN_ID}/values/A:S`);
    // A=No  B=First  C=Middle  D=Last   E=Email   F=Address  G=City  H=Zip
    // I=State  J=DOB  K=NextContact  L=Phone1  M=Phone2
    // N=Plan  O=Product  P=Memo  Q=Ref(TRUE/FALSE)  R=에이전트이름  S=상세URL
    clients=(d.values||[]).slice(1).map((r,i)=>({
      rowIdx:i+2, no:String(r[0]||''),
      fname:String(r[1]||''), mname:String(r[2]||''), lname:String(r[3]||''),
      name:String([r[3],r[1],r[2]].filter(Boolean).join(' ')||''),
      email:String(r[4]||''),
      address1:String(r[5]||''), city:String(r[6]||''), zip:String(r[7]||''),
      state:String(r[8]||''),
      dob:String(r[9]||''),
      next:String(r[10]||''),
      phone:String(r[11]||''),
      phone2:String(r[12]||''),
      plan:String(r[13]||''),
      prod:String(r[14]||''),
      memo:String(r[15]||''),
      ref:String(r[16]||'FALSE'),
      agent:String(r[17]||''),
      durl:String(r[18]||''),
      biz:'',
    })).filter(c=>c.name.trim());
    try{
      const md=await sheetsReq('GET',`${DETAIL_ID}/values/A:F`);
      allMemos=(md.values||[]).slice(1).map(r=>({
        name:String(r[1]||''),type:String(r[2]||''),text:String(r[3]||''),
        date:String(r[4]||''),ts:String(r[5]||''),
      })).filter(m=>m.name.trim()).sort((a,b)=>new Date(b.date||0)-new Date(a.date||0));
    }catch(e){ allMemos=[]; }
    try{
      const pi=await sheetsReq('GET',`${DETAIL_ID}/values/PlanInfo!A:I`); // gid=588166202 탭
      allPlanInfo=(pi.values||[]).slice(1).map(r=>({
        name:String(r[0]||''),mbi:String(r[1]||''),medical_no:String(r[2]||''),
        pcp:String(r[3]||''),pcp_phone:String(r[4]||''),
        network:String(r[5]||''),group_no:String(r[6]||''),
        meds:String(r[7]||''),conditions:String(r[8]||''),
      })).filter(p=>p.name.trim());
    }catch(e){ allPlanInfo=[]; }
    setSyncStatus('연결됨',true);
    renderAll();
  }catch(e){setSyncStatus('오류',false);toast('❌ '+e.message,4000);}
}
function renderAll(){
  updateKPIs();renderClients();renderSchedule();renderFollowup();renderPlanStats();renderCalendar();buildNotifs();
  renderBdThisMonth();
  renderMedicareReminder();
  // 수동 일정 대상 datalist 채우기
  const dl = document.getElementById('ms_target_list');
  if(dl) dl.innerHTML = clients.map(c=>`<option value="${c.name}">`).join('');
}

// ══════════════════════════════════════
// KPIs
// ══════════════════════════════════════
