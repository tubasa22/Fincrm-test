let zapBaseUrl = localStorage.getItem('zap_url')||'';
function initAutomation(){
  if(zapBaseUrl){ document.getElementById('zapUrl').value=zapBaseUrl; updateZapUrls(zapBaseUrl); }
  updateZapCounts();
  // 피드백 webhook URL 복원
  const fbUrl = localStorage.getItem('fcrm_feedback_webhook')||'';
  const el = document.getElementById('feedbackWebhookUrl');
  if(el) el.value = fbUrl;
  updatePendingCount();
}

function saveFeedbackWebhook(){
  const url = document.getElementById('feedbackWebhookUrl').value.trim();
  localStorage.setItem('fcrm_feedback_webhook', url);
  const st = document.getElementById('feedbackWebhookStatus');
  if(st) st.textContent = url ? '✅ 저장 완료' : '⚠️ URL 없음 — 로컬 저장 모드';
  toast('💾 Webhook URL 저장됨');
}

async function testFeedbackWebhook(){
  const url = document.getElementById('feedbackWebhookUrl').value.trim();
  if(!url){ toast('❌ URL을 먼저 입력하세요'); return; }
  showLoad('테스트 전송 중...');
  try{
    await fetch(url, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type:'test', text:'FinCRM Webhook 연결 테스트', ts: new Date().toLocaleString('ko-KR'), mode: isDemo?'demo':'live' })
    });
    toast('✅ 테스트 전송 성공! n8n/Zapier에서 수신 확인하세요');
    const st = document.getElementById('feedbackWebhookStatus');
    if(st) st.textContent = '✅ 마지막 테스트: '+new Date().toLocaleTimeString('ko-KR');
  } catch(e){
    toast('❌ 전송 실패: '+e.message);
  } finally { hideLoad(); }
}

function updatePendingCount(){
  const stored = JSON.parse(localStorage.getItem('fcrm_pending_reports')||'[]');
  const el = document.getElementById('pendingReportCount');
  if(el) el.textContent = stored.length ? stored.length+'건 대기 중' : '없음';
}

async function sendPendingReports(){
  const url = localStorage.getItem('fcrm_feedback_webhook')||'';
  if(!url){ toast('❌ Webhook URL을 먼저 등록해주세요'); return; }
  const stored = JSON.parse(localStorage.getItem('fcrm_pending_reports')||'[]');
  if(!stored.length){ toast('전송 대기 중인 리포트가 없습니다'); return; }
  showLoad(`${stored.length}건 재전송 중...`);
  let ok=0, fail=0;
  for(const p of stored){
    try{
      await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});
      ok++;
    }catch(e){ fail++; }
  }
  if(fail===0){
    localStorage.removeItem('fcrm_pending_reports');
    toast(`✅ ${ok}건 모두 전송 완료`);
  } else {
    const remaining = stored.slice(ok);
    localStorage.setItem('fcrm_pending_reports', JSON.stringify(remaining));
    toast(`✅ ${ok}건 전송 / ❌ ${fail}건 실패`);
  }
  hideLoad(); updatePendingCount();
}

function clearPendingReports(){
  if(!confirm('저장된 미전송 리포트를 모두 삭제할까요?')) return;
  localStorage.removeItem('fcrm_pending_reports');
  updatePendingCount();
  toast('🗑 삭제 완료');
}
function saveZapUrl(){
  if(isDemo){ toast('🚫 데모 모드에서는 저장되지 않습니다'); return; }
  zapBaseUrl=document.getElementById('zapUrl').value.trim();
  localStorage.setItem('zap_url',zapBaseUrl);
  updateZapUrls(zapBaseUrl);
  document.getElementById('zapSaved').style.display='block';
  setTimeout(()=>document.getElementById('zapSaved').style.display='none',2000);
}
function updateZapUrls(base){
  const suffs={bday:'?event=birthday',contact:'?event=contact_reminder',new:'?event=new_client',expire:'?event=plan_expire'};
  Object.entries(suffs).forEach(([k,s])=>{const el=document.getElementById('wh_'+k);if(el) el.textContent=base+s;});
}
function updateZapCounts(){
  set('zapContactCnt',clients.filter(c=>{const d=elapsed(c.next);return d!==null&&d>=30;}).length);
  set('zapBdayCnt',getBirthdays().filter(c=>c.daysLeft<=7).length);
}
async function triggerZap(type, label){
  const el=document.getElementById('zapTestResult');
  if(isDemo){
    el.textContent='✅ [데모] '+label+' 시뮬레이션 완료! (실제 전송 안 됨)';
    toast('데모 모드에서는 실제 Zapier 전송이 비활성화됩니다');
    return;
  }
  if(!zapBaseUrl){toast('웹훅 URL을 먼저 등록해주세요');return;}
  const suffs={bday:'?event=birthday',contact:'?event=contact_reminder',new:'?event=new_client'};
  const url=zapBaseUrl+(suffs[type]||'');
  el.textContent='발송 중...';
  try{
    await fetch(url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({event:type,test:true,timestamp:new Date().toISOString(),clients:clients.slice(0,2).map(c=>({name:c.name,phone:c.phone,plan:c.plan}))})
    });
    el.textContent='✅ '+label+' 전송 완료! Zapier에서 확인하세요.';
  }catch(e){el.textContent='❌ '+e.message;}
}
function copyWh(id){
  const txt=document.getElementById(id)?.textContent||'';
  navigator.clipboard.writeText(txt).then(()=>toast('📋 복사됨')).catch(()=>{});
}

// ══════════════════════════════════════
// TAB / UI
// ══════════════════════════════════════
