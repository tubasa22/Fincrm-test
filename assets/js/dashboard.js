function updateKPIs(){
  const n=clients.length,wp=clients.filter(c=>c.plan).length;
  const td=clients.filter(c=>{const d=elapsed(c.next);return d!==null&&d>=30;}).length;
  const rf=clients.filter(c=>c.ref==='TRUE').length;
  set('kT',n);set('kTs','명 등록됨');
  set('kP',wp);set('kPs',n?Math.round(wp/n*100)+'%':'—');
  set('kC',td);set('kCs',td?'즉시 연락 필요':'양호');
  set('kR',rf);set('kRs',n?Math.round(rf/n*100)+'% 리퍼':'—');
}

// ══════════════════════════════════════
// CLIENTS TABLE
// ══════════════════════════════════════
function renderClients(list){
  const data=list||clients;
  set('cntBadge','('+data.length+'명)');
  const tb=document.getElementById('cBody');
  if(!data.length){tb.innerHTML=`<tr class="empty"><td colspan="12">고객 없음<br><br><button class="btn pri sm" onclick="openAddClient()" style="margin-top:8px">+ 등록</button></td></tr>`;return;}
  const today=new Date(); today.setHours(0,0,0,0);
  tb.innerHTML=data.map(c=>{
    const el_d=elapsed(c.next);
    const dh=el_d===null?'—':`<span class="badge ${el_d>=30?'bre':el_d>=14?'bam':'bgr'}">D+${el_d}</span>`;
    const mc=allMemos.filter(m=>m.name===c.name).length;
    const memoEl=c.memo?(c.memo.length>20?`<span class="tip">${c.memo.slice(0,20)}…<span class="tipbox">${c.memo}</span></span>`:c.memo):'—';
    // 나이 계산
    let ageHtml = '—';
    const parsed = parseDob(c.dob);
    if(parsed){
      const {m,d,y} = parsed;
      let age = today.getFullYear()-y;
      if(today.getMonth()+1 < m || (today.getMonth()+1===m && today.getDate()<d)) age--;
      // 65세 3개월 전 리마인더 체크
      const bday65 = new Date(y+65,m-1,d); bday65.setHours(0,0,0,0);
      const daysTo65 = Math.ceil((bday65-today)/864e5);
      const showMedicare = daysTo65>0 && daysTo65<=90;
      ageHtml = `<span style="font-weight:600">${age}세</span>`
        + (showMedicare ? `<div style="font-size:10px;background:#dbeafe;color:#1e40af;border-radius:3px;padding:1px 5px;margin-top:2px;white-space:nowrap">🏥 New Medicare D-${daysTo65}</div>` : '');
    }
    return `<tr class="click" onclick="openDetail(${c.rowIdx})">
      <td style="text-align:center;font-size:11px;color:var(--text3)">${c.no}</td>
      <td><div class="nc"><div class="av" style="background:${ac(c.name)};flex-shrink:0">${c.name[0]}</div>
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
      </div></td>
      <td style="text-align:center;font-size:12px">${ageHtml}</td>
      <td style="font-size:12px">${c.phone||'—'}${c.phone2?`<div style='font-size:11px;color:var(--text3);margin-top:2px'>${c.phone2}</div>`:''}</td>
      <td style="font-size:11px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.email||'—'}</td>
      <td style="text-align:center">${c.plan?`<span class="badge ${pb(c.plan)}">${c.plan}</span>`:'—'}</td>
      <td style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.prod||'—'}</td>
      <td style="text-align:center;font-size:12px">${c.next||'—'}</td>
      <td style="text-align:center">${dh}</td>
      <td style="text-align:center">${c.ref==='TRUE'?`<span class="badge bpu" style="font-size:10px">리퍼</span>${c.agent?`<div style="font-size:10px;color:var(--text3);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.agent}</div>`:''}`:'—'}</td>
      <td style="font-size:12px;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${memoEl}${mc?` <span class="badge bgy" style="font-size:10px">${mc}</span>`:''}</td>
      <td style="text-align:center" onclick="event.stopPropagation()"><div class="ra" style="justify-content:center">
        <button class="ib" onclick="openDetail(${c.rowIdx})" title="상세">🔍</button>
        <button class="ib" onclick="openEditClient(${c.rowIdx})" title="수정">✏️</button>
        ${c.phone?`<a href="tel:${c.phone}" class="ib" title="전화" style="text-decoration:none" onclick="setTimeout(()=>updateLastContact(${c.rowIdx},false),1000)">📞</a>`:''}
        ${c.phone?`<button class="ib" onclick="smsAndReset('${esc(c.name)}','${c.phone}',${c.rowIdx});event.stopPropagation()" title="문자">💬</button>`:''}
        <button class="ib" onclick="openFileUpload('${esc(c.name)}')" title="파일 업로드">📎</button>
        <button class="ib del" onclick="delClient(${c.rowIdx},'${esc(c.name)}')" title="삭제">🗑</button>
      </div></td>
    </tr>`;
  }).join('');
}
function filterClients(){
  const q=document.getElementById('cSearch').value.toLowerCase();
  const pf=document.getElementById('planF').value;
  const rf=document.getElementById('refF').value;
  renderClients(clients.filter(c=>(!q||c.name.toLowerCase().includes(q)||c.phone.includes(q)||c.phone2.includes(q)||(c.memo||'').toLowerCase().includes(q)||(c.agent||'').toLowerCase().includes(q))&&(!pf||c.plan===pf)&&(!rf||c.ref===rf)));
}

// ══════════════════════════════════════
// SCHEDULE
// ══════════════════════════════════════
function renderSchedule(){
  const f=document.getElementById('ddF')?.value||'';
  let data=[...clients].filter(c=>c.next).sort((a,b)=>elapsed(b.next)-elapsed(a.next));
  if(f==='-1') data=data.filter(c=>elapsed(c.next)===0);
  else if(f==='7') data=data.filter(c=>{const d=elapsed(c.next);return d!==null&&d<=7;});
  else if(f==='30') data=data.filter(c=>{const d=elapsed(c.next);return d!==null&&d<=30;});
  const tb=document.getElementById('sBody');
  if(!data.length){tb.innerHTML=`<tr class="empty"><td colspan="8">해당 일정 없음</td></tr>`;return;}
  tb.innerHTML=data.map(c=>{
    const d=elapsed(c.next);
    return `<tr class="click" style="${d!==null&&d>=30?'background:#fff5f5':d!==null&&d>=14?'background:#fffbeb':''}" onclick="openDetail(${c.rowIdx})">
      <td><div class="nc"><div class="av" style="background:${ac(c.name)};width:28px;height:28px;font-size:11px">${c.name[0]}</div><strong>${c.name}</strong></div></td>
      <td>${c.phone||'—'}</td>
      <td>${c.plan?`<span class="badge ${pb(c.plan)}">${c.plan}</span>`:'—'}</td>
      <td style="font-size:12px">${c.prod||'—'}</td>
      <td><strong>${c.next||'—'}</strong></td>
      <td><span class="badge ${d===null?'bgy':d>=30?'bre':d>=14?'bam':'bgr'}">${d===null?'—':'D+'+d}</span></td>
      <td style="font-size:12px;color:var(--text2)">${(c.memo||'').slice(0,30)}</td>
      <td onclick="event.stopPropagation()"><button class="btn sm" onclick="openEditClient(${c.rowIdx})">✏️</button></td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════
// FOLLOWUP
// ══════════════════════════════════════
// ══════════════════════════════════════
// FOLLOWUP
// ══════════════════════════════════════
let fuDismissed = JSON.parse(localStorage.getItem('fcrm_fu_dismissed')||'[]');

function dismissFu(rowIdx){
  if(!fuDismissed.includes(rowIdx)) fuDismissed.push(rowIdx);
  localStorage.setItem('fcrm_fu_dismissed', JSON.stringify(fuDismissed));
  renderFollowup();
}

function renderFollowup(){
  const items = clients
    .filter(c=>c.next && !fuDismissed.includes(c.rowIdx))
    .map(c=>({...c, d:elapsed(c.next)}))
    .filter(c=>c.d!==null && c.d>=7)
    .sort((a,b)=>b.d-a.d)
    .slice(0,8);
  const dismissedCount = clients.filter(c=>c.next && fuDismissed.includes(c.rowIdx) && (elapsed(c.next)||0)>=7).length;
  set('fuCnt', items.length+'명'+(dismissedCount?` <span style="font-size:11px;color:var(--text3);cursor:pointer" onclick="fuDismissed=[];localStorage.removeItem('fcrm_fu_dismissed');renderFollowup()" title="숨김 해제">(+${dismissedCount}명 숨김 · 초기화)</span>`:''));
  const el = document.getElementById('fuList');
  if(!items.length){
    el.innerHTML=`<div class="dc" style="text-align:center;padding:20px;color:var(--text3);font-size:13px;box-shadow:var(--sh)">✅ 7일 이상 미연락 없음${dismissedCount?`<br><span style="font-size:11px;cursor:pointer;color:var(--blue)" onclick="fuDismissed=[];localStorage.removeItem('fcrm_fu_dismissed');renderFollowup()">${dismissedCount}명 숨김 해제</span>`:''}</div>`;
    return;
  }
  el.innerHTML=items.map(c=>`
    <div class="fu" id="fu-${c.rowIdx}">
      <div class="fu-bar ${c.d>=30?'urgent':c.d>=14?'soon':'fine'}"></div>
      <div class="fu-meta" onclick="openDetail(${c.rowIdx})">
        <div class="fu-name">${c.name}
          ${c.ref==='TRUE'?'<span class="badge bpu" style="font-size:10px;margin-left:4px">리퍼</span>':''}
          ${c.plan?`<span class="badge ${pb(c.plan)}" style="font-size:10px;margin-left:3px">${c.plan}</span>`:''}
        </div>
        <div class="fu-sub">${c.prod||'—'}${c.memo?' · '+c.memo.slice(0,22)+'…':''}</div>
      </div>
      <div class="fu-acts">
        ${c.phone?`<a href="tel:${c.phone}" class="btn sm" style="padding:4px 8px" title="전화" onclick="event.stopPropagation();setTimeout(()=>updateLastContact(${c.rowIdx},false),1000)">📞</a>`:''}
        ${c.phone?`<button class="btn sm" style="padding:4px 8px" onclick="smsAndReset('${esc(c.name)}','${c.phone}',${c.rowIdx});event.stopPropagation()" title="문자">💬</button>`:''}
        <button class="btn sm" style="padding:4px 8px" onclick="openAddMemoFor('${esc(c.name)}');event.stopPropagation()" title="메모">📝</button>
      </div>
      <div class="fu-dd" style="color:${c.d>=30?'var(--red)':c.d>=14?'var(--amber)':'var(--green)'}">D+${c.d}</div>
      <button onclick="dismissFu(${c.rowIdx});event.stopPropagation()" title="숨기기"
        style="margin-left:6px;width:20px;height:20px;border-radius:50%;border:1px solid var(--g3);background:var(--g2);cursor:pointer;font-size:11px;color:var(--text3);display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;transition:.15s"
        onmouseover="this.style.background='var(--red2)';this.style.color='var(--red)';this.style.borderColor='var(--red)'"
        onmouseout="this.style.background='var(--g2)';this.style.color='var(--text3)';this.style.borderColor='var(--g3)'">✕</button>
    </div>`).join('');
}

// ══════════════════════════════════════
// 이번 달 생일자 (대시보드)
// ══════════════════════════════════════
function renderBdThisMonth(){
  const el = document.getElementById('bdThisMonthList');
  if(!el) return;
  const today = new Date();
  const thisM = today.getMonth()+1;
  const thisY = today.getFullYear();
  const list = getBirthdays().filter(c=>{
    // 이번 달 생일 (올해 기준)
    return c.bdMonth === thisM;
  }).sort((a,b)=>a.bdDay-b.bdDay);
  set('bdThisMonthCnt', list.length+'명');
  if(!list.length){
    el.innerHTML=`<div style="font-size:13px;color:var(--text3);padding:10px 0">이번 달 생일자 없음</div>`;
    return;
  }
  el.innerHTML = list.map(c=>{
    const isToday = c.daysLeft===0;
    const isPast  = new Date(thisY, c.bdMonth-1, c.bdDay) < today && !isToday;
    return `<div class="fu" style="${isToday?'border-left:3px solid var(--red);background:#fff5f5':''}">
      <div class="fu-bar" style="background:${isToday?'var(--red)':isPast?'var(--g3)':'var(--amber)'}"></div>
      <div class="fu-meta" onclick="openDetail(${c.rowIdx})">
        <div class="fu-name">${c.name}
          ${c.plan?`<span class="badge ${pb(c.plan)}" style="font-size:10px;margin-left:4px">${c.plan}</span>`:''}
          ${c.age?`<span style="font-size:11px;color:var(--text3);margin-left:4px">만 ${c.age}세</span>`:''}
        </div>
        <div class="fu-sub">🎂 ${c.bdMonth}월 ${c.bdDay}일 ${isToday?'· 오늘!':isPast?'· 지남':'· D-'+c.daysLeft}</div>
      </div>
      <div class="fu-acts">
        ${c.phone?`<a href="tel:${c.phone}" class="btn sm" style="padding:4px 8px" onclick="event.stopPropagation();setTimeout(()=>updateLastContact(${c.rowIdx},false),1000)">📞</a>`:''}
        ${c.phone?`<button class="btn sm" style="padding:4px 8px" onclick="smsAndReset('${esc(c.name)}','${c.phone}',${c.rowIdx},'birthday');event.stopPropagation()">💬</button>`:''}
      </div>
      <div class="fu-dd" style="color:${isToday?'var(--red)':isPast?'var(--text3)':'var(--amber)'}">
        ${isToday?'🎂 오늘':isPast?'지남':'D-'+c.daysLeft}
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// Medicare 리마인더 (65세 3개월 전)
// ══════════════════════════════════════
function renderMedicareReminder(){
  const el = document.getElementById('medicareReminderList');
  if(!el) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const list = [];
  clients.forEach(c=>{
    const parsed = parseDob(c.dob);
    if(!parsed) return;
    const {m, d, y} = parsed;
    // 65세 생일
    const bday65 = new Date(y+65, m-1, d); bday65.setHours(0,0,0,0);
    // 이미 65세 이상이면 스킵
    if(bday65 <= today) return;
    // 65세 생일 3개월(90일) 전
    const reminderDate = new Date(bday65); reminderDate.setDate(reminderDate.getDate()-90);
    // 리마인더 기간 안에 있는 경우: 오늘 기준 reminderDate 이후 ~ 65세 생일 전
    if(today >= reminderDate){
      const daysTo65 = Math.ceil((bday65-today)/864e5);
      const age = 64; // 65세 직전
      list.push({...c, bday65, daysTo65, reminderDate});
    }
  });
  list.sort((a,b)=>a.daysTo65-b.daysTo65);
  set('medicareReminderCnt', list.length+'명');
  if(!list.length){
    el.innerHTML=`<div style="font-size:13px;color:var(--text3);padding:10px 0">해당 고객 없음</div>`;
    return;
  }
  el.innerHTML = list.map(c=>{
    const urgent = c.daysTo65 <= 30;
    return `<div class="fu" style="border-left:3px solid ${urgent?'var(--red)':'var(--blue)'}">
      <div class="fu-bar" style="background:${urgent?'var(--red)':'var(--blue)'}"></div>
      <div class="fu-meta" onclick="openDetail(${c.rowIdx})">
        <div class="fu-name" style="display:flex;align-items:center;gap:6px">
          ${c.name}
          <span style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px">🏥 New Medicare</span>
        </div>
        <div class="fu-sub">65세 생일: ${c.bday65.getFullYear()}년 ${c.bday65.getMonth()+1}월 ${c.bday65.getDate()}일 · ${c.phone||'—'}</div>
      </div>
      <div class="fu-acts">
        ${c.phone?`<a href="tel:${c.phone}" class="btn sm" style="padding:4px 8px" onclick="event.stopPropagation();setTimeout(()=>updateLastContact(${c.rowIdx},false),1000)">📞</a>`:''}
        ${c.phone?`<button class="btn sm" style="padding:4px 8px" onclick="smsAndReset('${esc(c.name)}','${c.phone}',${c.rowIdx});event.stopPropagation()">💬</button>`:''}
        <button class="btn sm" style="padding:4px 8px" onclick="openAddMemoFor('${esc(c.name)}');event.stopPropagation()">📝</button>
      </div>
      <div class="fu-dd" style="color:${urgent?'var(--red)':'var(--blue)'}">D-${c.daysTo65}</div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// GLOBAL SEARCH
// ══════════════════════════════════════
function globalSearchFn(){
  const q=document.getElementById('globalSearch').value.toLowerCase().trim();
  const res=document.getElementById('gsResults');
  if(!q){res.classList.remove('on');return;}
  const hits=clients.filter(c=>c.name.toLowerCase().includes(q)||c.phone.includes(q)||c.prod.toLowerCase().includes(q)).slice(0,8);
  if(!hits.length){res.innerHTML='<div class="gsr-item" style="color:var(--text3)">검색 결과 없음</div>';res.classList.add('on');return;}
  res.innerHTML=hits.map(c=>`
    <div class="gsr-item" onclick="document.getElementById('globalSearch').value='';closeGlobalSearch();openDetail(${c.rowIdx})">
      <div class="av" style="background:${ac(c.name)};width:28px;height:28px;font-size:11px;flex-shrink:0">${c.name[0]}</div>
      <div><div class="gsr-name">${c.name}</div><div class="gsr-sub">${c.plan||'플랜 없음'} · ${c.phone||'—'}</div></div>
    </div>`).join('');
  res.classList.add('on');
}
function closeGlobalSearch(){document.getElementById('gsResults').classList.remove('on');}

// ══════════════════════════════════════
// NOTIFICATION
// ══════════════════════════════════════
let notifs=[];
function buildNotifs(){
  notifs=[];
  const urgent=clients.filter(c=>{const d=elapsed(c.next);return d!==null&&d>=30;});
  if(urgent.length) notifs.push({icon:'📞',title:`장기 미연락 ${urgent.length}명`,sub:'30일 이상 연락 없는 고객'});
  const bdays=getBirthdays().filter(c=>c.daysLeft<=7);
  if(bdays.length) notifs.push({icon:'🎂',title:`이번 주 생일 ${bdays.length}명`,sub:bdays.map(c=>c.name).join(', ')});
  const newRef=clients.filter(c=>c.ref==='TRUE');
  if(newRef.length) notifs.push({icon:'🔗',title:`리퍼 고객 ${newRef.length}명`,sub:'에이전트 리퍼 연결 고객'});
  renderNotifs();
}
function renderNotifs(){
  const badge=document.getElementById('notifBadge');
  const list=document.getElementById('notifList');
  if(!notifs.length){badge.classList.remove('on');list.innerHTML='<div class="notif-empty">새 알림 없음</div>';return;}
  badge.textContent=notifs.length;badge.classList.add('on');
  list.innerHTML=notifs.map((n,i)=>`
    <div class="notif-item">
      <div class="ni-title">${n.icon} ${n.title}</div>
      <div class="ni-sub">${n.sub}</div>
    </div>`).join('');
}
function toggleNotif(){document.getElementById('notifPanel').classList.toggle('on');}
function closeNotif(){document.getElementById('notifPanel').classList.remove('on');}
function clearNotifs(){notifs=[];renderNotifs();closeNotif();}
document.addEventListener('click',e=>{if(!e.target.closest('.notif-wrap'))closeNotif();});

// ══════════════════════════════════════
// QUICK FILTER
// ══════════════════════════════════════
function qfFilter(type, el){
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-clients').classList.add('on');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  const clientsTab = Array.from(document.querySelectorAll('.tab')).find(t=>t.textContent.includes('고객 목록'));
  if(clientsTab) clientsTab.classList.add('on');
  const searchInput = document.getElementById('cSearch');
  const planFilter = document.getElementById('planF');
  const refFilter = document.getElementById('refF');
  if(searchInput) searchInput.value = '';
  if(planFilter) planFilter.value = '';
  if(refFilter) refFilter.value = '';
  document.querySelectorAll('.qf').forEach(b=>b.classList.remove('on'));
  if(el) el.classList.add('on');
  let filtered;
  if(!type) filtered=clients;
  else if(type==='ref') filtered=clients.filter(c=>c.ref==='TRUE');
  // ref 필터에서 에이전트 이름 검색 가능하도록 cSearch 연동은 filterClients에서 처리
  else if(type==='urgent') filtered=clients.filter(c=>{const d=elapsed(c.next);return d!==null&&d>=30;});
  else if(type==='recent') filtered=[...clients].reverse();
  else filtered=clients.filter(c=>c.plan===type);
  renderClients(filtered);
}

// ══════════════════════════════════════
// CALENDAR
// ══════════════════════════════════════
let calYear=new Date().getFullYear(), calMonth=new Date().getMonth();
function calNav(dir){calMonth+=dir;if(calMonth>11){calMonth=0;calYear++;}else if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}

// 미국 연방 공휴일 (고정 + 변동)
function getUSHolidays(year){
  const h={};
  function k(m,d){return year+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');}
  // 고정 공휴일
  h[k(1,1)]="🇺🇸 New Year's Day";
  h[k(6,19)]="🇺🇸 Juneteenth";
  h[k(7,4)]="🇺🇸 Independence Day";
  h[k(11,11)]="🇺🇸 Veterans Day";
  h[k(12,25)]="🇺🇸 Christmas";
  // 변동 공휴일 계산
  function nthMon(m,n){ // n번째 월요일
    const d=new Date(year,m-1,1);
    const off=(8-d.getDay())%7;
    return new Date(year,m-1,1+off+(n-1)*7).getDate();
  }
  function lastMon(m){
    const last=new Date(year,m,0);
    return last.getDate()-((last.getDay()+6)%7);
  }
  function nthDay(m,day,n){ // n번째 특정 요일 (0=일,1=월...)
    const d=new Date(year,m-1,1);
    const off=(day-d.getDay()+7)%7;
    return 1+off+(n-1)*7;
  }
  // MLK Day: 1월 3번째 월요일
  h[k(1,nthMon(1,3))]="🇺🇸 MLK Day";
  // Presidents Day: 2월 3번째 월요일
  h[k(2,nthMon(2,3))]="🇺🇸 Presidents' Day";
  // Memorial Day: 5월 마지막 월요일
  h[k(5,lastMon(5))]="🇺🇸 Memorial Day";
  // Labor Day: 9월 첫 번째 월요일
  h[k(9,nthMon(9,1))]="🇺🇸 Labor Day";
  // Columbus Day: 10월 2번째 월요일
  h[k(10,nthMon(10,2))]="🇺🇸 Columbus Day";
  // Thanksgiving: 11월 4번째 목요일
  h[k(11,nthDay(11,4,4))]="🇺🇸 Thanksgiving";
  return h;
}

function renderCalendar(){
  const dows=['일','월','화','수','목','금','토'];
  document.getElementById('calDow').innerHTML=dows.map(d=>`<div class="cal-dow">${d}</div>`).join('');
  document.getElementById('calTitle').textContent=`${calYear}년 ${calMonth+1}월`;
  const first=new Date(calYear,calMonth,1).getDay();
  const days=new Date(calYear,calMonth+1,0).getDate();
  const today=new Date();
  const evMap={};
  const holidays=getUSHolidays(calYear);

  clients.filter(c=>c.next).forEach(c=>{
    const k=c.next;
    if(!evMap[k])evMap[k]=[];
    evMap[k].push({type:'contact',label:c.name,rowIdx:c.rowIdx});
  });
  getBirthdays().forEach(c=>{
    const k=`${calYear}-${String(c.bdMonth).padStart(2,'0')}-${String(c.bdDay).padStart(2,'0')}`;
    if(!evMap[k])evMap[k]=[];
    evMap[k].push({type:'bday',label:'🎂'+c.name});
  });
  allMemos.forEach(m=>{
    if(!m.date)return;
    const [y,mo,d]=m.date.split('-').map(Number);
    if(y===calYear&&mo===calMonth+1){
      if(!evMap[m.date])evMap[m.date]=[];
      evMap[m.date].push({type:'memo',label:'📝'+m.name});
    }
  });
  getManualSchedules().forEach(s=>{
    if(!evMap[s.date])evMap[s.date]=[];
    evMap[s.date].push({type:'manual',label:'📌'+s.title,id:s.id});
  });
  // 공휴일 추가
  Object.entries(holidays).forEach(([k,name])=>{
    if(!evMap[k])evMap[k]=[];
    evMap[k].unshift({type:'holiday',label:name}); // 맨 앞에
  });

  let cells='';
  const prevDays=new Date(calYear,calMonth,0).getDate();
  for(let i=first-1;i>=0;i--) cells+=`<div class="cal-day other"><div class="cal-dn" style="color:var(--text3)">${prevDays-i}</div></div>`;
  for(let d=1;d<=days;d++){
    const isToday=d===today.getDate()&&calMonth===today.getMonth()&&calYear===today.getFullYear();
    const k=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isHoliday=!!holidays[k];
    const evs=evMap[k]||[];
    const evsHtml=evs.slice(0,3).map(e=>{
      if(e.type==='manual') return `<div class="cal-ev manual" onclick="event.stopPropagation();viewManualSchedule('${e.id}')">${e.label}</div>`;
      if(e.type==='holiday') return `<div class="cal-ev holiday" title="${e.label}">${e.label}</div>`;
      return `<div class="cal-ev ${e.type==='bday'?'bday':e.type==='memo'?'memo':''}" onclick="event.stopPropagation();${e.rowIdx?`openDetail(${e.rowIdx})`:''}">${e.label}</div>`;
    }).join('');
    const more=evs.length>3?`<div style="font-size:9px;color:var(--text3)">+${evs.length-3}개</div>`:'';
    cells+=`<div class="cal-day${isToday?' today':''}${isHoliday?' holiday-day':''}" onclick="openAddSchedule('${k}')"><div class="cal-dn">${d}</div>${evsHtml}${more}</div>`;
  }
  const total=first+days;const remain=(7-total%7)%7;
  for(let i=1;i<=remain;i++) cells+=`<div class="cal-day other"><div class="cal-dn" style="color:var(--text3)">${i}</div></div>`;
  document.getElementById('calGrid').innerHTML=cells;
}

// ══════════════════════════════════════
// CHART
// ══════════════════════════════════════
let chartMode = 'bar';
function switchChart(mode, el){
  chartMode = mode;
  document.querySelectorAll('#chartToggleBar,#chartToggleDot').forEach(b=>b.classList.remove('on'));
  if(el) el.classList.add('on');
  renderPlanStats();
}
function renderPlanStats(){
  const cnt={};clients.forEach(c=>{const p=c.plan||'미지정';cnt[p]=(cnt[p]||0)+1;});
  const total=clients.length||1;
  const barCol={PDP:'#1a56db',MAPD:'#059669',MA:'#0d9488',SNP:'#7c3aed',Medigap:'#b45309','미지정':'#9ca3af'};
  const pcol={PDP:'bbl',MAPD:'bgr',MA:'bte',SNP:'bpu',Medigap:'bam','미지정':'bgy'};
  const sorted=Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
  const el=document.getElementById('planStats');
  if(chartMode==='donut'){
    const r=54,cx=70,cy=70,stroke=22;
    const circ=2*Math.PI*r;
    let offset=0;
    const slices=sorted.map(([p,n])=>{
      const pct=n/total;
      const slice={p,n,pct,offset,col:barCol[p]||'#9ca3af'};
      offset+=pct;
      return slice;
    });
    const paths=slices.map(s=>{
      const start=s.offset*circ;
      const len=s.pct*circ;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.col}" stroke-width="${stroke}" stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${circ/4-start}" transform="rotate(-90 ${cx} ${cy})" />`;
    });
    el.innerHTML=`<div class="donut-wrap">
      <svg class="donut-svg" width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="54" fill="none" stroke="var(--g3)" stroke-width="22"/>
        ${paths.join('')}
        <text x="70" y="66" text-anchor="middle" font-size="18" font-weight="700" fill="var(--text)">${total}</text>
        <text x="70" y="82" text-anchor="middle" font-size="10" fill="var(--text3)">전체</text>
      </svg>
      <div class="donut-legend">
        ${slices.map(s=>`<div class="dl-item">
          <div class="dl-dot" style="background:${s.col}"></div>
          <span class="dl-label">${s.p}</span>
          <span class="dl-val">${s.n}명</span>
          <span style="font-size:11px;color:var(--text3);margin-left:4px">${Math.round(s.pct*100)}%</span>
        </div>`).join('')}
      </div>
    </div>`;
  } else {
    el.innerHTML=sorted.map(([p,n])=>`
      <div class="ps">
        <div class="ps-top"><span class="badge ${pcol[p]||'bgy'}">${p}</span>
          <span style="font-size:13px;font-weight:600">${n}명 <span style="font-size:11px;color:var(--text3)">(${Math.round(n/total*100)}%)</span></span>
        </div>
        <div class="ps-bar"><div class="ps-fill" style="width:${Math.round(n/total*100)}%;background:${barCol[p]||'#9ca3af'}"></div></div>
      </div>`).join('');
  }
}

// ══════════════════════════════════════
// DETAIL PAGE
// ══════════════════════════════════════
