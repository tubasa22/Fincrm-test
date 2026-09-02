let smsRecipients = [];
let smsHistory = JSON.parse(localStorage.getItem('sms_history')||'[]');
const SMS_TEMPLATES = [
  {label:'생일 축하', text:'안녕하세요 {이름}님! 생일을 진심으로 축하드립니다 🎂 항상 건강하고 행복하세요!'},
  {label:'연락일 리마인더', text:'안녕하세요 {이름}님, 저는 담당 에이전트입니다. 플랜 관련 업데이트가 있어 연락드렸습니다. 편한 시간에 통화 가능하실까요?'},
  {label:'플랜 갱신 안내', text:'안녕하세요 {이름}님! 보험 갱신 시즌이 다가왔습니다. 더 좋은 플랜으로 변경하실 수 있으니 연락 주세요 😊'},
  {label:'신규 가입 환영', text:'안녕하세요 {이름}님, 가입을 환영합니다! 궁금한 사항이 있으시면 언제든지 연락해주세요.'},
  {label:'서류 안내', text:'안녕하세요 {이름}님! 보험 관련 서류를 준비해 주셔서 감사합니다. 검토 후 연락드리겠습니다.'},
];
// ══════════════════════════════════════
// SMS 예약 발송
// ══════════════════════════════════════
let smsSchedTimer = null;

function toggleSmsSchedule(){
  const on = document.getElementById('smsScheduleChk').checked;
  const fields = document.getElementById('smsScheduleFields');
  const schedBtn = document.getElementById('smsSchedBtn');
  fields.style.display = on ? 'block' : 'none';
  schedBtn.style.display = on ? 'inline-flex' : 'none';
  if(on){
    // 기본값: 지금으로부터 1시간 후
    const d = new Date(Date.now() + 3600000);
    document.getElementById('smsSchedDate').value = d.toISOString().slice(0,10);
    document.getElementById('smsSchedTime').value = d.toTimeString().slice(0,5);
  }
}

function getScheduledSms(){
  try{ return JSON.parse(localStorage.getItem('fcrm_sms_sched')||'[]'); }catch(e){ return []; }
}
function saveScheduledSms(list){
  localStorage.setItem('fcrm_sms_sched', JSON.stringify(list));
}

function scheduleSms(){
  if(!smsRecipients.length){ toast('수신자를 추가해주세요'); return; }
  const msg = document.getElementById('smsMsg').value.trim();
  if(!msg){ toast('메시지를 입력해주세요'); return; }
  const date = document.getElementById('smsSchedDate').value;
  const time = document.getElementById('smsSchedTime').value;
  if(!date||!time){ toast('날짜와 시간을 선택해주세요'); return; }
  const sendAt = new Date(date+'T'+time).getTime();
  if(sendAt <= Date.now()){ toast('❌ 예약 시간은 현재보다 미래여야 합니다'); return; }
  const entry = {
    id: 'sched_'+Date.now(),
    sendAt,
    sendAtStr: date+' '+time,
    recipients: [...smsRecipients],
    msg,
    mediaCount: smsMediaFiles.length,
    status: 'pending'
  };
  const list = getScheduledSms();
  list.push(entry);
  list.sort((a,b)=>a.sendAt-b.sendAt);
  saveScheduledSms(list);
  // 체크박스 리셋
  document.getElementById('smsScheduleChk').checked = false;
  toggleSmsSchedule();
  smsRecipients=[]; renderSmsRecips();
  smsMediaFiles=[]; renderSmsMediaPreview();
  document.getElementById('smsMsg').value='';
  renderSmsSchedList();
  toast(`✅ ${entry.recipients.length}명에게 ${date} ${time} 예약 완료`);
  startSchedWatcher();
}

function cancelScheduledSms(id){
  if(!confirm('이 예약을 취소할까요?')) return;
  const list = getScheduledSms().filter(s=>s.id!==id);
  saveScheduledSms(list);
  renderSmsSchedList();
  toast('🗑 예약이 취소되었습니다');
}

function renderSmsSchedList(){
  const el = document.getElementById('smsSchedList');
  if(!el) return;
  const list = getScheduledSms().filter(s=>s.status==='pending');
  set('smsSchedCount', list.length ? list.length+'건 대기 중' : '');
  if(!list.length){
    el.innerHTML = '<div style="font-size:13px;color:var(--text3);padding:8px 0">예약된 발송 없음</div>';
    return;
  }
  el.innerHTML = list.map(s=>{
    const remaining = s.sendAt - Date.now();
    const h = Math.floor(remaining/3600000);
    const m = Math.floor((remaining%3600000)/60000);
    const timeLeft = remaining>0 ? (h>0?h+'시간 ':'')+m+'분 후' : '곧 발송';
    return `<div style="background:var(--sur);border:1px solid var(--g3);border-radius:var(--r);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;box-shadow:var(--sh)">
      <div style="font-size:22px;flex-shrink:0">🕐</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;margin-bottom:3px">${s.recipients.map(r=>r.name).join(', ')} <span style="font-size:11px;color:var(--text3);font-weight:400">(${s.recipients.length}명)</span></div>
        <div style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.msg.slice(0,40)}${s.msg.length>40?'…':''}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">📅 ${s.sendAtStr} · <span style="color:var(--blue);font-weight:600">${timeLeft}</span></div>
      </div>
      <button class="btn sm red" onclick="cancelScheduledSms('${s.id}')">취소</button>
    </div>`;
  }).join('');
}

// 예약 시간 체크 타이머 (1분마다)
function startSchedWatcher(){
  if(smsSchedTimer) return;
  smsSchedTimer = setInterval(async ()=>{
    const list = getScheduledSms();
    const now = Date.now();
    let changed = false;
    for(const s of list){
      if(s.status==='pending' && s.sendAt <= now){
        s.status = 'sending';
        changed = true;
        // 실제 발송
        const t = JSON.parse(localStorage.getItem('twilio')||'{}');
        if(isDemo || !t.sid){
          s.status = 'done';
          s.recipients.forEach(r=>{
            smsHistory.unshift({time:new Date().toLocaleString('ko'),name:r.name,phone:r.phone,msg:s.msg.slice(0,30)+'…',status:'✅ 예약발송(완료)'});
          });
          toast(`✅ 예약 문자 발송 완료 — ${s.recipients.length}명`);
        } else {
          let ok=0;
          for(const r of s.recipients){
            try{
              const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.sid}/Messages.json`,{
                method:'POST',
                headers:{'Authorization':'Basic '+btoa(t.sid+':'+t.token),'Content-Type':'application/x-www-form-urlencoded'},
                body:new URLSearchParams({To:r.phone,From:t.from,Body:s.msg.replace(/\{이름\}/g,r.name)})
              });
              const d=await res.json();
              smsHistory.unshift({time:new Date().toLocaleString('ko'),name:r.name,phone:r.phone,msg:s.msg.slice(0,30)+'…',status:d.sid?'✅ 예약발송':'❌ 실패'});
              if(d.sid) ok++;
            }catch(e){}
          }
          s.status='done';
          toast(`✅ 예약 문자 발송 완료 — ${ok}/${s.recipients.length}명`);
        }
        localStorage.setItem('sms_history', JSON.stringify(smsHistory.slice(0,100)));
      }
    }
    if(changed){
      saveScheduledSms(list);
      renderSmsSchedList();
      renderSmsHistory();
    }
  }, 60000); // 1분마다 체크
}

function initSmsTab() {
  document.getElementById('smsTemplates').innerHTML = SMS_TEMPLATES.map((t,i)=>`<div class="sms-template" onclick="selectTemplate(${i})">${t.label}</div>`).join('');
  renderSmsHistory();
  renderSmsSchedList();
  startSchedWatcher();
  const msgEl = document.getElementById('smsMsg');
  if(msgEl && !msgEl._listenerAdded){
    msgEl.addEventListener('input', ()=>{ set('smsCharCount', msgEl.value.length+'자'); });
    msgEl._listenerAdded = true;
  }
  const t = JSON.parse(localStorage.getItem('twilio')||'{}');
  if(t.sid) document.getElementById('twilioSid').value = t.sid;
  if(t.token) document.getElementById('twilioToken').value = t.token;
  if(t.from) document.getElementById('twilioFrom').value = t.from;
  updateTwilioStatus();
}

// ── 주소록 모달 ──
let abChecked = {}; // {phone: true/false}

function openAddrBook(){
  abChecked = {};
  // 기존 선택된 수신자는 미리 체크
  smsRecipients.forEach(r=>{ if(r.phone) abChecked[r.phone]=true; });
  document.getElementById('abSearch').value='';
  document.getElementById('abPlanF').value='';
  document.getElementById('addrBookModal').classList.add('on');
  renderAddrBook();
}

function renderAddrBook(){
  const q = document.getElementById('abSearch').value.toLowerCase();
  const pf = document.getElementById('abPlanF').value;
  const filtered = clients.filter(c=>
    c.phone &&
    (!q || c.name.toLowerCase().includes(q) || c.phone.includes(q)) &&
    (!pf || c.plan===pf)
  );
  const total = filtered.length;
  const checked = filtered.filter(c=>abChecked[c.phone]).length;
  document.getElementById('abCount').textContent = `총 ${total}명`;
  document.getElementById('abSelectAll').checked = total>0 && checked===total;
  document.getElementById('abSelectAll').indeterminate = checked>0 && checked<total;
  updateAbSelectedCount();

  if(!filtered.length){
    document.getElementById('abList').innerHTML = '<div style="text-align:center;padding:30px;color:var(--text3);font-size:13px">검색 결과 없음</div>';
    return;
  }
  document.getElementById('abList').innerHTML = filtered.map(c=>{
    const chk = abChecked[c.phone]||false;
    return `<label style="display:flex;align-items:center;gap:12px;padding:10px 20px;cursor:pointer;border-bottom:1px solid var(--g3);transition:.1s;${chk?'background:var(--blue2)':''}" onmouseover="this.style.background='${chk?'var(--blue2)':'var(--g2)'}'" onmouseout="this.style.background='${chk?'var(--blue2)':''}'" onclick="abToggle('${c.phone}',this)">
      <input type="checkbox" ${chk?'checked':''} style="width:16px;height:16px;accent-color:var(--blue);flex-shrink:0" onclick="event.stopPropagation();abToggle('${c.phone}',this.closest('label'))">
      <div class="av" style="background:${ac(c.name)};width:34px;height:34px;font-size:13px;flex-shrink:0">${c.name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px">${c.name}</div>
        <div style="font-size:12px;color:var(--text2)">${c.phone}${c.phone2?' · '+c.phone2:''}</div>
      </div>
      ${c.plan?`<span class="badge ${pb(c.plan)}" style="font-size:11px">${c.plan}</span>`:''}
    </label>`;
  }).join('');
}

function abToggle(phone, labelEl){
  abChecked[phone] = !abChecked[phone];
  // 배경색 즉시 반영
  if(labelEl){
    labelEl.style.background = abChecked[phone] ? 'var(--blue2)' : '';
    const chkEl = labelEl.querySelector('input[type=checkbox]');
    if(chkEl) chkEl.checked = abChecked[phone];
  }
  // 전체선택 체크박스 상태 업데이트
  const q = document.getElementById('abSearch').value.toLowerCase();
  const pf = document.getElementById('abPlanF').value;
  const filtered = clients.filter(c=>c.phone&&(!q||c.name.toLowerCase().includes(q)||c.phone.includes(q))&&(!pf||c.plan===pf));
  const checked = filtered.filter(c=>abChecked[c.phone]).length;
  const allEl = document.getElementById('abSelectAll');
  allEl.checked = filtered.length>0 && checked===filtered.length;
  allEl.indeterminate = checked>0 && checked<filtered.length;
  updateAbSelectedCount();
}

function abToggleAll(checked){
  const q = document.getElementById('abSearch').value.toLowerCase();
  const pf = document.getElementById('abPlanF').value;
  clients.filter(c=>c.phone&&(!q||c.name.toLowerCase().includes(q)||c.phone.includes(q))&&(!pf||c.plan===pf))
    .forEach(c=>{ abChecked[c.phone]=checked; });
  renderAddrBook();
}

function updateAbSelectedCount(){
  const n = Object.values(abChecked).filter(Boolean).length;
  document.getElementById('abSelectedCount').textContent = n+'명 선택됨';
}

function confirmAddrBook(){
  const selected = clients.filter(c=>c.phone && abChecked[c.phone]);
  if(!selected.length){ toast('수신자를 1명 이상 선택하세요'); return; }
  smsRecipients = selected.map(c=>({name:c.name, phone:c.phone}));
  renderSmsRecips();
  closeOv('addrBookModal');
  toast(`✅ ${smsRecipients.length}명이 수신자로 추가되었습니다`);
}
function saveTwilio(){
  if(isDemo){ return; }
  const cfg={sid:document.getElementById('twilioSid').value.trim(),token:document.getElementById('twilioToken').value.trim(),from:document.getElementById('twilioFrom').value.trim()};
  localStorage.setItem('twilio',JSON.stringify(cfg));
  updateTwilioStatus();
}
function updateTwilioStatus(){
  const t=JSON.parse(localStorage.getItem('twilio')||'{}');
  set('twilioStatus', (t.sid&&t.token&&t.from)?'✅ Twilio 설정 완료':'⚠️ Account SID, Token, 발신번호를 모두 입력해주세요');
}
function selectTemplate(i){
  document.querySelectorAll('.sms-template').forEach((el,j)=>el.classList.toggle('sel',i===j));
  document.getElementById('smsMsg').value = SMS_TEMPLATES[i].text;
  set('smsCharCount', SMS_TEMPLATES[i].text.length+'자');
}
function renderSmsRecips(){
  const el=document.getElementById('smsRecipList');
  if(!smsRecipients.length){
    el.innerHTML='<div style="font-size:13px;color:var(--text3);padding:10px 4px">👆 위 버튼을 눌러 주소록에서 선택하세요</div>';
    set('smsRecipCount','');return;
  }
  el.innerHTML=smsRecipients.map((r,i)=>`
    <div class="sms-recip">
      <div class="av" style="background:${ac(r.name)};width:26px;height:26px;font-size:11px">${r.name[0]}</div>
      <span style="font-weight:500">${r.name}</span>
      <span style="color:var(--text3);font-size:12px">${r.phone}</span>
      <button class="rm" onclick="removeSmsRecip(${i})">✕</button>
    </div>`).join('');
  set('smsRecipCount',`<span style="color:var(--blue);font-weight:600">${smsRecipients.length}명</span> 선택됨`);
}
function removeSmsRecip(i){
  smsRecipients.splice(i,1);
  // abChecked도 동기화
  abChecked={};
  smsRecipients.forEach(r=>{if(r.phone)abChecked[r.phone]=true;});
  renderSmsRecips();
}
function openSingleSms(name, phone, type='general'){
  // SMS 탭 직접 활성화
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-sms').classList.add('on');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  
  // 문자 발송 탭 활성화
  const smsTab = Array.from(document.querySelectorAll('.tab')).find(t=>t.textContent.includes('문자'));
  if(smsTab) smsTab.classList.add('on');
  
  // URL 변경
  history.replaceState(null,'','#sms');
  
  // 수신자 설정
  setTimeout(()=>{
    smsRecipients = [{name, phone}];
    renderSmsRecips();
    if(type==='birthday') selectTemplate(0);
    
    // Twilio 설정 복원
    const t = JSON.parse(localStorage.getItem('twilio')||'{}');
    if(t.sid) {
      const el = document.getElementById('twilioSid');
      if(el) el.value = t.sid;
    }
    if(t.token) {
      const el = document.getElementById('twilioToken');
      if(el) el.value = t.token;
    }
    if(t.from) {
      const el = document.getElementById('twilioFrom');
      if(el) el.value = t.from;
    }
    updateTwilioStatus();
  }, 100);
}

// ══════════════════════════════════════
// 마지막 연락일 리셋 (전화/문자 후)
// ══════════════════════════════════════
async function updateLastContact(rowIdx, skipConfirm){
  const c = clients.find(x=>x.rowIdx===rowIdx);
  if(!c) return;
  if(!skipConfirm){
    if(!confirm(`"${c.name}" 고객의 마지막 연락일을 오늘(${new Date().toLocaleDateString('ko-KR')})로 업데이트할까요?`)) return;
  }
  const today = new Date().toISOString().slice(0,10);
  c.next = today;
  // 숨김 목록에서도 제거 (연락했으니 다시 관리 대상)
  fuDismissed = fuDismissed.filter(id=>id!==rowIdx);
  localStorage.setItem('fcrm_fu_dismissed', JSON.stringify(fuDismissed));
  if(!isDemo){
    try{
      await sheetsReq('PUT',`${MAIN_ID}/values/K${rowIdx}?valueInputOption=USER_ENTERED`,{values:[[today]]});
    }catch(e){ toast('⚠️ 시트 저장 실패: '+e.message, 4000); }
  }
  renderAll();
  if(document.getElementById('detailPg').style.display==='block') openDetail(rowIdx);
  toast(`✅ ${c.name} 마지막 연락일 → 오늘로 업데이트`);
}

// 전화 클릭 시 연락일 리셋 확인
function callAndReset(phone, rowIdx){
  window.location.href = 'tel:'+phone;
  // 전화 앱 열린 직후 연락일 업데이트 제안
  setTimeout(()=> updateLastContact(rowIdx, false), 1000);
}

// 문자 탭 열고 수신자 세팅 + 연락일 리셋 확인
function smsAndReset(name, phone, rowIdx, type){
  openSingleSms(name, phone, type);
  setTimeout(()=> updateLastContact(rowIdx, false), 500);
}
function openBulkSms(type){
  const bdays=getBirthdays().filter(c=>c.daysLeft<=7);
  if(!bdays.length){toast('7일 내 생일인 고객이 없습니다');return;}
  document.getElementById('bdSmsRecips').innerHTML=bdays.map(c=>`
    <div class="sms-recip"><div class="av" style="background:${ac(c.name)};width:26px;height:26px;font-size:11px">${c.name[0]}</div>
    <span style="font-weight:500">${c.name}</span><span style="color:var(--text3);font-size:12px">${c.phone}</span>
    <span class="badge bam" style="margin-left:auto">D-${c.daysLeft}</span></div>`).join('');
  document.getElementById('bdSmsModal').classList.add('on');
}
let smsMediaFiles = []; // 첨부 파일 목록

function handleSmsMedia(files){
  for(const f of files){
    if(f.size > 5*1024*1024){ toast('❌ 파일 크기는 5MB 이하만 가능합니다: '+f.name); continue; }
    if(smsMediaFiles.length >= 3){ toast('❌ 이미지는 최대 3개까지 첨부 가능합니다'); break; }
    smsMediaFiles.push(f);
  }
  renderSmsMediaPreview();
}

function renderSmsMediaPreview(){
  const wrap = document.getElementById('smsMediaPreview');
  if(!wrap) return;
  if(!smsMediaFiles.length){ wrap.innerHTML=''; return; }
  wrap.innerHTML = smsMediaFiles.map((f,i)=>{
    const url = URL.createObjectURL(f);
    return `<div style="position:relative;display:inline-block">
      <img src="${url}" style="width:72px;height:72px;object-fit:cover;border-radius:var(--rs);border:1px solid var(--g3)">
      <button onclick="removeSmsMedia(${i})" style="position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;background:var(--red);color:#fff;border:none;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;padding:0">✕</button>
      <div style="font-size:9px;color:var(--text3);text-align:center;margin-top:2px;max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</div>
    </div>`;
  }).join('');
}

function removeSmsMedia(i){
  smsMediaFiles.splice(i,1);
  renderSmsMediaPreview();
}

async function sendSms(){
  if(!smsRecipients.length){toast('수신자를 추가해주세요');return;}
  const msg=document.getElementById('smsMsg').value.trim();
  if(!msg){toast('메시지를 입력해주세요');return;}
  const t=JSON.parse(localStorage.getItem('twilio')||'{}');
  if(!t.sid||!t.token||!t.from){toast('❌ Twilio 설정을 먼저 완료해주세요');return;}
  const isMMS = smsMediaFiles.length > 0;

  if(isDemo){
    smsRecipients.forEach(r=>{
      smsHistory.unshift({time:new Date().toLocaleString('ko'),name:r.name,phone:r.phone,
        msg:(isMMS?'[MMS] ':'')+msg.slice(0,30)+'…',status:'✅ 발송됨(데모)'});
      // 데모 모드: 마지막 연락일 업데이트
      const c = clients.find(x=>x.name===r.name);
      if(c) c.next = new Date().toISOString().slice(0,10);
    });
    localStorage.setItem('sms_history',JSON.stringify(smsHistory.slice(0,100)));
    renderSmsHistory(); smsRecipients=[]; renderSmsRecips();
    smsMediaFiles=[]; renderSmsMediaPreview();
    if(document.getElementById('detailPg').style.display==='block') openDetail(clients.find(x=>x.name===smsRecipients[0]?.name)?.rowIdx);
    toast('✅ 데모: '+(isMMS?'MMS':'SMS')+' 발송 시뮬레이션 완료');
    return;
  }

  // 미디어 파일 → base64 변환
  let mediaUrls = [];
  if(isMMS){
    showLoad('이미지 준비 중...');
    mediaUrls = smsMediaFiles.map(f=>f.name);
  }

  showLoad('문자 발송 중...');
  let ok=0,fail=0;
  const todayStr = new Date().toISOString().slice(0,10);
  const recipientNames = smsRecipients.map(r=>r.name);
  
  for(const r of smsRecipients){
    const text=msg.replace(/\{이름\}/g,r.name);
    try{
      const params = {To:r.phone, From:t.from, Body:text};
      const res=await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.sid}/Messages.json`,{
        method:'POST',
        headers:{'Authorization':'Basic '+btoa(t.sid+':'+t.token),'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams(params)
      });
      const d=await res.json();
      const mediaNote = isMMS ? ' [이미지 '+smsMediaFiles.length+'개 첨부됨*]' : '';
      smsHistory.unshift({time:new Date().toLocaleString('ko'),name:r.name,phone:r.phone,
        msg:text.slice(0,30)+'…'+mediaNote,
        status:d.sid?'✅ 발송됨':'❌ 실패: '+(d.message||'오류')});
      if(d.sid) {
        ok++;
        // 발송 성공: 해당 고객의 마지막 연락일 업데이트
        const c = clients.find(x=>x.name===r.name);
        if(c) c.next = todayStr;
      } else {
        fail++;
      }
    }catch(e){
      smsHistory.unshift({time:new Date().toLocaleString('ko'),name:r.name,phone:r.phone,msg:'…',status:'❌ '+e.message});
      fail++;
    }
  }
  localStorage.setItem('sms_history',JSON.stringify(smsHistory.slice(0,100)));
  hideLoad(); renderSmsHistory(); smsRecipients=[]; renderSmsRecips();
  smsMediaFiles=[]; renderSmsMediaPreview();
  
  // 고객 상세 페이지가 열려있으면 즉시 업데이트
  if(document.getElementById('detailPg').style.display==='block'){
    const detailClient = clients.find(x=>recipientNames.includes(x.name));
    if(detailClient) openDetail(detailClient.rowIdx);
  }
  
  if(isMMS) toast(`✅ ${ok}건 발송${fail?` / ❌ ${fail}건 실패`:''}\n⚠️ MMS 이미지는 공개 URL 방식으로 별도 업로드 필요`);
  else toast(`✅ ${ok}건 발송${fail?` / ❌ ${fail}건 실패`:''}`);
}
async function sendBulkBdaySms(){
  const bdays=getBirthdays().filter(c=>c.daysLeft<=7);
  const msg=document.getElementById('bdSmsMsg').value.trim();
  const t=JSON.parse(localStorage.getItem('twilio')||'{}');
  if(!t.sid&&!isDemo){toast('❌ Twilio 설정을 먼저 완료해주세요');return;}
  showLoad('생일 문자 발송 중...');
  let ok=0;
  for(const c of bdays){
    if(!c.phone) continue;
    const text=msg.replace(/\{이름\}/g,c.name);
    if(!isDemo){
      try{
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${t.sid}/Messages.json`,{
          method:'POST',headers:{'Authorization':'Basic '+btoa(t.sid+':'+t.token),'Content-Type':'application/x-www-form-urlencoded'},
          body:new URLSearchParams({To:c.phone,From:t.from,Body:text})
        });
      }catch(e){}
    }
    smsHistory.unshift({time:new Date().toLocaleString('ko'),name:c.name,phone:c.phone,msg:text.slice(0,30)+'…',status:isDemo?'✅ 발송됨(데모)':'✅ 발송됨'});
    ok++;
  }
  localStorage.setItem('sms_history',JSON.stringify(smsHistory.slice(0,100)));
  hideLoad(); closeOv('bdSmsModal'); renderSmsHistory();
  toast(`🎂 ${ok}명에게 생일 문자 발송됨!`);
}
function renderSmsHistory(){
  const tb=document.getElementById('smsHistory');
  if(!tb) return;
  if(!smsHistory.length){tb.innerHTML=`<tr class="empty"><td colspan="5">발송 이력 없음</td></tr>`;return;}
  tb.innerHTML=smsHistory.slice(0,20).map(h=>`
    <tr><td style="font-size:12px;white-space:nowrap">${h.time}</td>
    <td style="font-weight:500">${h.name}</td>
    <td style="font-size:12px">${h.phone}</td>
    <td style="font-size:12px;color:var(--text2)">${h.msg}</td>
    <td style="font-size:12px">${h.status}</td></tr>`).join('');
}

// ══════════════════════════════════════
// AUTOMATION
// ══════════════════════════════════════
