// ── 피드백·버그 대시보드 ──
function renderFeedbackDash(){
  const all = JSON.parse(localStorage.getItem('fcrm_feedback_log')||'[]');
  const pending = JSON.parse(localStorage.getItem('fcrm_pending_reports')||'[]');
  const bugs = all.filter(r=>r.type==='bug');
  const feedbacks = all.filter(r=>r.type==='feedback');
  const sevColors = {심각:'#E24B4A',보통:'#BA7517',낮음:'#1D9E75'};

  const statHtml = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
      ${devStat('전체 리포트', all.length, '#7F77DD')}
      ${devStat('버그 신고', bugs.length, '#E24B4A')}
      ${devStat('피드백', feedbacks.length, '#1D9E75')}
      ${devStat('미전송 대기', pending.length, pending.length?'#BA7517':'#888')}
    </div>`;

  const listHtml = all.length ? [...all].reverse().map(r => {
    const isBug = r.type==='bug';
    const sev = r.severity||'';
    const col = isBug ? (sevColors[sev]||'#E24B4A') : '#1D9E75';
    const statusKey = 'dev_status_'+r.ts;
    const status = localStorage.getItem(statusKey)||'미검토';
    const statusColors = {'미검토':'#888','검토중':'#BA7517','완료':'#1D9E75','보류':'#7F77DD'};
    return `<div style="border:1px solid #e5e3db;border-radius:8px;padding:12px;margin-bottom:8px;border-left:4px solid ${col}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="background:${col};color:#fff;font-size:10px;padding:2px 8px;border-radius:20px;font-weight:600">
            ${isBug?'🐛 '+sev:'💬 '+( r.subtype||'피드백')}
          </span>
          <span style="font-size:11px;color:#888">${r.page||''}</span>
          <span style="font-size:11px;color:#888">${r.ts||''}</span>
          <span style="font-size:11px;color:#888">by ${r.user||'익명'}</span>
          ${r.stars?'⭐'.repeat(r.stars):''}
        </div>
        <select onchange="setDevStatus('${r.ts}',this.value)" style="font-size:11px;padding:3px 6px;border:1px solid #ddd;border-radius:4px;color:${statusColors[status]||'#888'};cursor:pointer">
          ${['미검토','검토중','완료','보류'].map(s=>`<option value="${s}"${s===status?' selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      ${isBug ? `
        <div style="font-size:12px;margin-bottom:4px"><strong>동작:</strong> ${r.action||''}</div>
        <div style="font-size:12px;margin-bottom:4px"><strong>증상:</strong> ${r.desc||''}</div>
        ${r.expected?`<div style="font-size:12px;color:#888"><strong>예상:</strong> ${r.expected}</div>`:''}
        ${r.env?`<div style="font-size:11px;color:#aaa;margin-top:4px">${r.env}</div>`:''}
      ` : `
        <div style="font-size:13px;line-height:1.6">${r.text||''}</div>
        ${r.contact?`<div style="font-size:11px;color:#888;margin-top:4px">연락처: ${r.contact}</div>`:''}
      `}
    </div>`;
  }).join('') : '<div style="text-align:center;padding:40px;color:#aaa;font-size:13px">수신된 리포트 없음<br><br>사용자가 💬 피드백 또는 🐛 버그 버튼을 누르면 여기에 쌓입니다</div>';

  return statHtml + `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:600">리포트 목록 (최신순)</div>
      <div style="display:flex;gap:6px">
        <button onclick="exportFeedbackCsv()" style="${devBtnStyle()}">📥 CSV 내보내기</button>
        <button onclick="clearFeedbackLog()" style="${devBtnStyle('#E24B4A')}">🗑 전체 삭제</button>
      </div>
    </div>
    <div style="max-height:480px;overflow-y:auto">${listHtml}</div>`;
}

function setDevStatus(ts, val){
  localStorage.setItem('dev_status_'+ts, val);
  toast('상태 업데이트: '+val);
}

function exportFeedbackCsv(){
  const all = JSON.parse(localStorage.getItem('fcrm_feedback_log')||'[]');
  if(!all.length){ toast('내보낼 데이터 없음'); return; }
  const header = 'type,subtype,severity,page,text,stars,user,ts,mode';
  const rows = all.map(r => [r.type,r.subtype||'',r.severity||'',r.page||'',
    (r.text||r.desc||'').replace(/,/g,' '),r.stars||'',r.user||'',r.ts||'',r.mode||''].join(','));
  const blob = new Blob([header+'\n'+rows.join('\n')], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'fincrm_feedback_'+new Date().toISOString().slice(0,10)+'.csv';
  a.click(); toast('📥 CSV 다운로드 시작');
}

function clearFeedbackLog(){
  if(!confirm('모든 리포트를 삭제할까요?')) return;
  localStorage.removeItem('fcrm_feedback_log');
  renderDevTab('feedback');
  toast('🗑 삭제 완료');
}

// ── AI 에이전트 협업 로그 ──
function renderAgentsDash(){
  const logs = JSON.parse(localStorage.getItem('fcrm_agent_log')||'[]');
  const webhook = localStorage.getItem('fcrm_feedback_webhook')||'';

  const agentStatus = [
    {name:'Jarvice (총괄)', id:'jarvice', desc:'텔레그램 오케스트레이터'},
    {name:'Lead Agent', id:'agt07', desc:'AGT-07 리드 스코어링'},
    {name:'Calendar Agent', id:'agt10', desc:'AGT-10 구글 캘린더'},
    {name:'CRM Agent', id:'agt06', desc:'AGT-06 FinCRM 연동'},
    {name:'Collector', id:'collector', desc:'피드백 수집'},
    {name:'Analyst', id:'analyst', desc:'데이터 분석'},
  ].map(a => {
    const lastSeen = localStorage.getItem('agent_ping_'+a.id);
    const online = lastSeen && (Date.now()-parseInt(lastSeen)) < 5*60*1000;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e5e3db;border-radius:8px;margin-bottom:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:${online?'#1D9E75':'#ddd'};flex-shrink:0"></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${a.name}</div>
        <div style="font-size:11px;color:#888">${a.desc} ${lastSeen?'· 마지막: '+new Date(parseInt(lastSeen)).toLocaleTimeString('ko-KR'):''}</div>
      </div>
      <span style="font-size:11px;padding:2px 8px;border-radius:20px;background:${online?'#E1F5EE':'#f5f5f5'};color:${online?'#0F6E56':'#aaa'}">${online?'온라인':'대기'}</span>
    </div>`;
  }).join('');

  const logsHtml = logs.length ? [...logs].reverse().slice(0,30).map(l => `
    <div style="display:flex;gap:10px;padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:12px">
      <span style="color:#aaa;flex-shrink:0;width:90px">${l.ts||''}</span>
      <span style="background:#EEEDFE;color:#534AB7;padding:1px 7px;border-radius:10px;font-size:10px;flex-shrink:0;height:fit-content">${l.agent||'system'}</span>
      <span style="color:#333;line-height:1.5">${l.msg||''}</span>
    </div>`).join('')
  : '<div style="text-align:center;padding:30px;color:#aaa;font-size:12px">에이전트 협업 로그가 여기에 쌓입니다<br>n8n Webhook을 연결하면 자동으로 기록됩니다</div>';

  return `
    <div style="margin-bottom:18px">
      <div style="font-size:13px;font-weight:600;margin-bottom:10px">에이전트 상태</div>
      ${agentStatus}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:600">협업 로그 (최근 30건)</div>
      <button onclick="clearAgentLog()" style="${devBtnStyle('#E24B4A')}">🗑 로그 초기화</button>
    </div>
    <div style="max-height:400px;overflow-y:auto;border:1px solid #e5e3db;border-radius:8px;padding:8px 12px">
      ${logsHtml}
    </div>
    <div style="margin-top:16px;background:#f8f7f3;border-radius:8px;padding:12px;font-size:12px">
      <div style="font-weight:600;margin-bottom:6px">로그 수신 Webhook (n8n → FinCRM)</div>
      <div style="color:#888;margin-bottom:8px">n8n에서 아래 형식으로 POST 요청을 보내면 이 화면에 자동 기록됩니다</div>
      <pre style="background:#fff;padding:8px;border-radius:6px;font-size:11px;border:1px solid #e5e3db">POST /webhook → FinCRM localStorage
{ "agent": "jarvice", "msg": "처리 완료", "ts": "14:30" }</pre>
    </div>`;
}

function clearAgentLog(){
  if(!confirm('에이전트 로그를 초기화할까요?')) return;
  localStorage.removeItem('fcrm_agent_log');
  renderDevTab('agents');
  toast('🗑 로그 초기화');
}

// 외부에서 에이전트 로그 추가 (n8n webhook으로 호출 가능)
window.addAgentLog = function(agent, msg){
  const logs = JSON.parse(localStorage.getItem('fcrm_agent_log')||'[]');
  logs.push({agent, msg, ts: new Date().toLocaleTimeString('ko-KR')});
  localStorage.setItem('fcrm_agent_log', JSON.stringify(logs.slice(-200)));
};

// ── 시스템 상태 ──
function renderSystemDash(){
  const lsKeys = Object.keys(localStorage).filter(k=>k.startsWith('fcrm')||k.startsWith('sms')||k.startsWith('twilio')||k.startsWith('agent'));
  const lsSize = JSON.stringify(localStorage).length;
  const pending = JSON.parse(localStorage.getItem('fcrm_pending_reports')||'[]');
  const feedbackLog = JSON.parse(localStorage.getItem('fcrm_feedback_log')||'[]');
  const webhook = localStorage.getItem('fcrm_feedback_webhook')||'';

  const items = [
    ['앱 버전', 'FinCRM v1.0 (2026-05)'],
    ['모드', isDemo ? '🎭 데모 모드' : '🔴 라이브 모드'],
    ['총 고객 수', clients.length+'명'],
    ['상담 메모', allMemos.length+'건'],
    ['수동 일정', JSON.parse(localStorage.getItem('fcrm_schedules')||'[]').length+'건'],
    ['피드백 수신', feedbackLog.length+'건'],
    ['미전송 리포트', pending.length+'건'],
    ['localStorage 사용', Math.round(lsSize/1024)+'KB / ~5MB'],
    ['Webhook URL', webhook ? '✅ 설정됨' : '❌ 미설정'],
    ['구글 Sheets ID', typeof MAIN_ID!=='undefined'&&MAIN_ID ? MAIN_ID.slice(0,20)+'...' : '—'],
    ['브라우저', navigator.userAgent.match(/(Chrome|Safari|Firefox|Edge)\/[\d.]+/)?.[0]||'—'],
    ['화면 해상도', window.innerWidth+'×'+window.innerHeight],
  ].map(([k,v])=>`
    <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px">
      <span style="color:#888">${k}</span>
      <span style="font-weight:500;color:#333">${v}</span>
    </div>`).join('');

  const lsDetail = lsKeys.map(k=>{
    const v = localStorage.getItem(k)||'';
    return `<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:11px;border-bottom:1px solid #f8f8f8">
      <span style="color:#888;font-family:monospace">${k}</span>
      <span style="color:#aaa">${Math.round(v.length/1024*10)/10}KB</span>
    </div>`;
  }).join('');

  return `
    <div style="border:1px solid #e5e3db;border-radius:8px;overflow:hidden;margin-bottom:16px">
      ${items}
    </div>
    <div style="font-size:13px;font-weight:600;margin-bottom:8px">LocalStorage 상세</div>
    <div style="border:1px solid #e5e3db;border-radius:8px;padding:8px 12px;max-height:200px;overflow-y:auto">
      ${lsDetail||'<div style="color:#aaa;font-size:12px">저장된 데이터 없음</div>'}
    </div>`;
}

// ── 개발 도구 ──
function renderToolsDash(){
  return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div style="border:1px solid #e5e3db;border-radius:8px;padding:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">📊 데이터 관리</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button onclick="devExportAll()" style="${devBtnStyle()}">📥 전체 데이터 JSON 내보내기</button>
          <button onclick="devImportAll()" style="${devBtnStyle()}">📤 데이터 가져오기 (JSON)</button>
          <button onclick="devClearLS()" style="${devBtnStyle('#E24B4A')}">🗑 LocalStorage 초기화</button>
        </div>
      </div>
      <div style="border:1px solid #e5e3db;border-radius:8px;padding:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">🔧 Webhook 테스트</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button onclick="devSendTestFeedback()" style="${devBtnStyle()}">💬 피드백 테스트 전송</button>
          <button onclick="devSendTestBug()" style="${devBtnStyle()}">🐛 버그 테스트 전송</button>
          <button onclick="devSendPing()" style="${devBtnStyle()}">🏓 Ping 전송</button>
        </div>
      </div>
      <div style="border:1px solid #e5e3db;border-radius:8px;padding:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">🔐 접근 코드 변경</div>
        <input id="devNewKey" placeholder="새 접근 코드" style="width:100%;border:1px solid #ddd;border-radius:6px;padding:7px 10px;font-size:12px;margin-bottom:6px">
        <button onclick="devChangeKey()" style="${devBtnStyle('#7F77DD')}">변경</button>
      </div>
      <div style="border:1px solid #e5e3db;border-radius:8px;padding:14px">
        <div style="font-size:13px;font-weight:600;margin-bottom:10px">📋 에이전트 로그 추가 (테스트)</div>
        <input id="devLogAgent" placeholder="에이전트명 (예: jarvice)" style="width:100%;border:1px solid #ddd;border-radius:6px;padding:7px 10px;font-size:12px;margin-bottom:4px">
        <input id="devLogMsg" placeholder="메시지" style="width:100%;border:1px solid #ddd;border-radius:6px;padding:7px 10px;font-size:12px;margin-bottom:6px">
        <button onclick="devAddLog()" style="${devBtnStyle('#7F77DD')}">로그 추가</button>
      </div>
    </div>`;
}

function devBtnStyle(col){
  const c = col||'#534AB7';
  return `width:100%;padding:8px;border:1px solid ${c};border-radius:6px;background:${c}15;color:${c};font-size:12px;cursor:pointer;text-align:left`;
}
function devStat(label, val, col){
  return `<div style="border:1px solid ${col}30;border-radius:8px;padding:12px;text-align:center;border-left:4px solid ${col}">
    <div style="font-size:22px;font-weight:700;color:${col}">${val}</div>
    <div style="font-size:11px;color:#888;margin-top:2px">${label}</div>
  </div>`;
}

function devExportAll(){
  const data = {};
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k.startsWith('fcrm')||k.startsWith('sms')||k.startsWith('agent')||k.startsWith('dev_'))
      data[k]=localStorage.getItem(k);
  }
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='fincrm_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click();
  toast('📥 백업 파일 다운로드');
}

function devImportAll(){
  const input=document.createElement('input'); input.type='file'; input.accept='.json';
  input.onchange=function(e){
    const file=e.target.files[0]; if(!file) return;
    const r=new FileReader();
    r.onload=function(ev){
      try{
        const data=JSON.parse(ev.target.result);
        Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,v));
        toast('✅ 데이터 복원 완료 — 새로고침 필요');
      }catch(err){ toast('❌ 파일 형식 오류'); }
    }; r.readAsText(file);
  }; input.click();
}

function devClearLS(){
  if(!confirm('FinCRM 관련 LocalStorage를 모두 초기화할까요?\n(구글 로그인 정보 제외)')) return;
  const keep=['twilio','fcrm_radar_key','fcrm_feedback_webhook','zap_url','dev_unlocked'];
  Object.keys(localStorage).filter(k=>!keep.some(kk=>k.includes(kk)))
    .filter(k=>k.startsWith('fcrm')||k.startsWith('sms_')||k.startsWith('agent_')||k.startsWith('dev_status'))
    .forEach(k=>localStorage.removeItem(k));
  renderDevTab('tools'); toast('🗑 초기화 완료');
}

async function devSendTestFeedback(){
  const url=localStorage.getItem('fcrm_feedback_webhook')||'';
  if(!url){ toast('❌ Webhook URL 미설정'); return; }
  await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({type:'feedback',subtype:'개선 아이디어',page:'대시보드',text:'[개발자 테스트] 테스트 피드백입니다',stars:4,user:'개발자',ts:new Date().toLocaleString('ko-KR'),mode:'test'})});
  toast('✅ 테스트 피드백 전송');
}

async function devSendTestBug(){
  const url=localStorage.getItem('fcrm_feedback_webhook')||'';
  if(!url){ toast('❌ Webhook URL 미설정'); return; }
  await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({type:'bug',severity:'낮음',page:'고객 목록',action:'[테스트] 버그 신고',desc:'개발자 테스트 버그 리포트입니다',user:'개발자',ts:new Date().toLocaleString('ko-KR'),mode:'test'})});
  toast('✅ 테스트 버그 리포트 전송');
}

async function devSendPing(){
  const url=localStorage.getItem('fcrm_feedback_webhook')||'';
  if(!url){ toast('❌ Webhook URL 미설정'); return; }
  const t=Date.now();
  await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({type:'ping',ts:new Date().toLocaleString('ko-KR')})});
  toast(`🏓 Ping 응답 (${Date.now()-t}ms)`);
}

function devChangeKey(){
  const k=document.getElementById('devNewKey').value.trim();
  if(!k){ toast('코드를 입력하세요'); return; }
  sessionStorage.setItem('dev_key_override',k);
  toast('🔐 접근 코드 변경됨 (이 세션만)');
}

function devAddLog(){
  const agent=document.getElementById('devLogAgent').value.trim()||'test';
  const msg=document.getElementById('devLogMsg').value.trim();
  if(!msg){ toast('메시지를 입력하세요'); return; }
  window.addAgentLog(agent, msg);
  toast('📋 로그 추가됨');
  document.getElementById('devLogMsg').value='';
}

// 피드백 전송 시 로컬 로그에도 저장 (기존 sendToWebhook 오버라이드)
const _origSendToWebhook = sendToWebhook;
window.sendToWebhook = async function(payload, modalId, successMsg){
  // 로컬 피드백 로그에 저장
  const log = JSON.parse(localStorage.getItem('fcrm_feedback_log')||'[]');
  log.push(payload);
  localStorage.setItem('fcrm_feedback_log', JSON.stringify(log.slice(-500)));
  await _origSendToWebhook(payload, modalId, successMsg);
};
