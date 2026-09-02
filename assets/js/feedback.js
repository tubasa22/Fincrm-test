const FEEDBACK_WEBHOOK = localStorage.getItem('fcrm_feedback_webhook') || '';

function getCurrentPage(){
  const tab = document.querySelector('.tab.on');
  if(document.getElementById('detailPg').style.display==='block') return '고객 상세 페이지';
  if(tab) return tab.textContent.trim();
  return '대시보드';
}

let fbStars = 0;
function setStars(n){
  fbStars = n;
  const labels = ['', '별로예요', '조금 불편해요', '보통이에요', '좋아요', '매우 좋아요'];
  document.querySelectorAll('.fb-star').forEach((el,i)=>{
    el.textContent = i < n ? '⭐' : '☆';
  });
  document.getElementById('fb_star_val').textContent = labels[n]||'';
}

function openFeedback(){
  document.getElementById('fb_page').value = getCurrentPage();
  document.getElementById('fb_text').value = '';
  document.getElementById('fb_contact').value = '';
  document.querySelectorAll('input[name="fbType"]')[0].checked = true;
  fbStars = 0;
  document.querySelectorAll('.fb-star').forEach(el=>el.textContent='☆');
  document.getElementById('fb_star_val').textContent = '';
  document.getElementById('feedbackModal').classList.add('on');
  setTimeout(()=>document.getElementById('fb_text').focus(), 100);
}

async function submitFeedback(){
  const text = document.getElementById('fb_text').value.trim();
  if(!text){ toast('❌ 내용을 입력해주세요'); return; }
  const type = document.querySelector('input[name="fbType"]:checked')?.value || '기타';
  const user = document.getElementById('udName')?.textContent || '익명';
  const payload = {
    type:    'feedback',
    subtype: type,
    page:    document.getElementById('fb_page').value,
    text,
    stars:   fbStars,
    contact: document.getElementById('fb_contact').value.trim(),
    user,
    ts:      new Date().toLocaleString('ko-KR'),
    version: '1.0',
    mode:    isDemo ? 'demo' : 'live'
  };
  await sendToWebhook(payload, 'feedbackModal', `✅ 피드백이 전달되었습니다. 감사합니다!`);
}

function openBugReport(){
  document.getElementById('bug_page').value = getCurrentPage();
  document.getElementById('bug_action').value = '';
  document.getElementById('bug_desc').value = '';
  document.getElementById('bug_expected').value = '';
  document.getElementById('bug_env').value =
    `${navigator.userAgent.match(/(Chrome|Safari|Firefox|Edge)\/[\d.]+/)?.[0]||'Browser'} · ${window.innerWidth}×${window.innerHeight}`;
  document.querySelector('input[name="bugSeverity"][value="보통"]').checked = true;
  document.getElementById('bugModal').classList.add('on');
  setTimeout(()=>document.getElementById('bug_action').focus(), 100);
}

async function submitBugReport(){
  const action = document.getElementById('bug_action').value.trim();
  const desc   = document.getElementById('bug_desc').value.trim();
  if(!action || !desc){ toast('❌ 동작과 문제 설명을 입력해주세요'); return; }
  const user = document.getElementById('udName')?.textContent || '익명';
  const payload = {
    type:      'bug',
    severity:  document.querySelector('input[name="bugSeverity"]:checked')?.value || '보통',
    page:      document.getElementById('bug_page').value,
    action,
    desc,
    expected:  document.getElementById('bug_expected').value.trim(),
    env:       document.getElementById('bug_env').value,
    user,
    ts:        new Date().toLocaleString('ko-KR'),
    version:   '1.0',
    mode:      isDemo ? 'demo' : 'live'
  };
  await sendToWebhook(payload, 'bugModal', `🐛 버그 신고가 접수되었습니다. 빠르게 확인하겠습니다!`);
}

async function sendToWebhook(payload, modalId, successMsg){
  if(!FEEDBACK_WEBHOOK){
    // webhook 미설정 시 — localStorage에 임시 저장 + 안내
    const stored = JSON.parse(localStorage.getItem('fcrm_pending_reports')||'[]');
    stored.push(payload);
    localStorage.setItem('fcrm_pending_reports', JSON.stringify(stored.slice(-50)));
    closeOv(modalId);
    toast(`${successMsg}\n(Webhook 미설정: 로컬에 임시 저장됨)`);
    return;
  }
  showLoad('전송 중...');
  try{
    await fetch(FEEDBACK_WEBHOOK, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    closeOv(modalId);
    toast(successMsg);
  } catch(e){
    // 전송 실패 시도 로컬 백업
    const stored = JSON.parse(localStorage.getItem('fcrm_pending_reports')||'[]');
    stored.push({...payload, send_failed: true});
    localStorage.setItem('fcrm_pending_reports', JSON.stringify(stored.slice(-50)));
    toast(`⚠️ 전송 실패 — 로컬에 저장되었습니다 (${e.message})`);
    closeOv(modalId);
  } finally { hideLoad(); }
}
