function getLoginLog(){ return JSON.parse(localStorage.getItem('fcrm_login_log')||'[]'); }
function addLoginLog(type, userName){
  const log = getLoginLog();
  log.unshift({type, user: userName||'알 수 없음', time: new Date().toLocaleString('ko-KR')});
  localStorage.setItem('fcrm_login_log', JSON.stringify(log.slice(0,20)));
}

// ══════════════════════════════════════
// 로그인 화면 패널 전환
// ══════════════════════════════════════
function showPanel(id){
  ['lp_main','lp_apply','lp_applied','lp_code'].forEach(p=>{
    const el = document.getElementById(p);
    if(el) el.style.display = p===id ? 'block' : 'none';
  });
}

// 액세스 코드 포맷 (FC-XX-0000)
function fmtAccessCode(el){
  try {
    let v = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // FC 제거
    if(v.startsWith('FC')) v = v.substring(2);
    
    if(v.length >= 1){
      // 숫자 위치 찾기
      let numStartIdx = -1;
      for(let i = 0; i < v.length; i++){
        if(/\d/.test(v[i])){
          numStartIdx = i;
          break;
        }
      }
      
      // 영문자와 숫자 분리
      let alpha = numStartIdx === -1 ? v : v.substring(0, numStartIdx);
      let nums = numStartIdx === -1 ? '' : v.substring(numStartIdx).replace(/[^0-9]/g, '').substring(0, 4);
      
      // 영문자 길이 제한 (최대 4글자)
      if(alpha.length > 4) alpha = alpha.substring(0, 4);
      
      // ★ 이중 형식 지원
      if(alpha.length === 4 && nums.length === 4){
        // 신규: FC-XXXX1234
        el.value = 'FC-' + alpha + nums;
      } else if((alpha.length === 1 || alpha.length === 2) && nums.length === 4){
        // 기존: FC-X-0000 또는 FC-XY-0000
        el.value = 'FC-' + alpha + '-' + nums;
      } else if(alpha.length === 3 && nums.length === 4){
        // 마스터: FC-DEV9999 (3글자 + 4숫자)
        el.value = 'FC-' + alpha + nums;
      } else if(alpha.length === 4){
        el.value = 'FC-' + alpha + (nums ? nums : '');
      } else if((alpha.length === 1 || alpha.length === 2)){
        el.value = 'FC-' + alpha + (nums ? '-' + nums : '');
      } else if(alpha.length === 3){
        el.value = 'FC-' + alpha + (nums ? nums : '');
      } else if(alpha){
        el.value = 'FC-' + alpha;
      } else {
        el.value = 'FC-';
      }
    } else {
      el.value = 'FC-';
    }
  } catch(e) {
    console.error('코드 포맷 중 오류:', e);
    el.value = 'FC-';
  }
}

// 사용 신청 제출
async function submitApply(){
  const nameEl = document.getElementById('ap_name');
  const emailEl = document.getElementById('ap_email');
  
  if(!nameEl || !emailEl) {
    alert('❌ 입력 필드를 찾을 수 없습니다');
    return;
  }
  
  const name  = nameEl.value.trim();
  const email = emailEl.value.trim();
  if(!name){ alert('이름을 입력해주세요'); return; }
  if(!email){ alert('이메일을 입력해주세요'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ alert('올바른 이메일 형식을 입력해주세요'); return; }

  try {
    showLoad('신청 접수 중...');

    const now = new Date().toLocaleString('ko-KR');
    
    // localStorage에 저장
    const application = {
      신청일시: now,
      이름: name,
      이메일: email,
      id: Date.now()
    };
    
    let applications = JSON.parse(localStorage.getItem('fcrm_applications') || '[]');
    applications.push(application);
    localStorage.setItem('fcrm_applications', JSON.stringify(applications));
    
    console.log('✅ 신청 저장됨:', application);

    hideLoad();
    
    // 정보 표시
    document.getElementById('ap_name_confirm').textContent = name;
    document.getElementById('ap_email_confirm').textContent = email;
    showPanel('lp_applied');
    
    toast('✅ 신청이 접수되었습니다!');

  } catch(e) {
    hideLoad();
    console.error('신청 처리 오류:', e);
    alert('❌ 신청 처리 중 오류가 발생했습니다.');
  }
}

// ★ 개발자용: 신청을 Google Sheets에 일괄 업로드
async function uploadApplicationsToSheets(){
  const applications = JSON.parse(localStorage.getItem('fcrm_applications') || '[]');
  
  if(applications.length === 0){
    alert('업로드할 신청이 없습니다');
    return;
  }
  
  console.log('📤 Google Sheets에 업로드 중...');
  
  const sheetId = '16j-DWyzI7GgsbIfKeulYwUluhk1d5-6xguyJbnNvJAs';
  const range = '신청자목록!A:H';
  
  try {
    // 모든 신청을 배열로 변환
    const values = applications.map(app => [
      app.신청일시,
      app.이름,
      app.이메일,
      '',  // 에이전시명
      '',  // 연락처
      '',  // 지역
      '',  // 코드
      '대기'  // 상태
    ]);
    
    // Google Sheets API로 추가
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&key=AIzaSyBx5XR1-VLU-5Vj7t8Z_J0G7yEq_h8c4dg`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values })
      }
    );
    
    if(response.ok){
      const result = await response.json();
      console.log('✅ Google Sheets 업로드 완료:', result);
      alert(`✅ ${applications.length}건의 신청이 Google Sheets에 업로드되었습니다!`);
      
      // 업로드된 데이터 삭제
      localStorage.removeItem('fcrm_applications');
      console.log('✅ 로컬 저장소 초기화됨');
    } else {
      throw new Error('업로드 실패: ' + response.statusText);
    }
  } catch(e) {
    console.error('❌ 업로드 오류:', e);
    alert('❌ 업로드 중 오류가 발생했습니다.\n\n' + e.message);
  }
}

// ===== 코드 검증 기능 (현재 비활성화 - 나중에 사용) =====
// 신규 사용자는 구글 앱 개발 페이지에 등록으로 접근 허용
// 추후 코드 기반 접근이 필요하면 아래 코드 활성화
/*
function verifyCode(){
  const raw   = document.getElementById('lp_code_input').value.trim().toUpperCase();
  const errEl = document.getElementById('lp_code_err');
  
  if(!raw){
    errEl.textContent = '❌ 코드를 입력해주세요';
    errEl.style.display = 'block';
    return;
  }
  
  const MASTER_DEV_CODE_1 = 'FC-DEV9999';
  const MASTER_DEV_CODE_2 = 'FC-DEV-9999';
  const MASTER_DEV_CODE_3 = 'FCDEV9999';
  
  if(raw === MASTER_DEV_CODE_1 || raw === MASTER_DEV_CODE_2 || raw === MASTER_DEV_CODE_3){
    console.log('🔐 개발자 마스터 코드 감지');
    localStorage.setItem('fcrm_access_code', raw);
    errEl.style.display = 'none';
    
    const wrap = document.getElementById('lp_google_wrap');
    wrap.style.display = 'block';
    document.getElementById('lp_code_input').style.borderColor = 'var(--green)';
    document.getElementById('lp_code_input').disabled = true;
    
    const btn = document.getElementById('signInBtn');
    if(btn){
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      const txt = btn.querySelector('#signInBtnTxt, .signInBtnTxt, span');
      if(txt) txt.textContent = 'Google 계정으로 로그인';
    }
    
    toast('✅ 코드 확인됨! Google로 로그인하세요');
    return;
  }
  
  const oldFormat = /^FC-[A-Z]{1,2}-\d{4}$/;
  const newFormat = /^FC-[A-Z]{4}\d{4}$/;
  
  if(!oldFormat.test(raw) && !newFormat.test(raw)){
    errEl.textContent = '❌ 형식: FC-XX-0000 또는 FC-XXXX1234';
    errEl.style.display = 'block';
    return;
  }
  
  localStorage.setItem('fcrm_access_code', raw);
  errEl.style.display = 'none';

  const wrap = document.getElementById('lp_google_wrap');
  wrap.style.display = 'block';
  document.getElementById('lp_code_input').style.borderColor = 'var(--green)';
  document.getElementById('lp_code_input').disabled = true;

  const btn = document.getElementById('signInBtn');
  if(btn){
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    const txt = btn.querySelector('#signInBtnTxt, .signInBtnTxt, span');
    if(txt) txt.textContent = 'Google 계정으로 로그인';
  }
  
  if(!tokenClient){
    const chk = setInterval(()=>{
      if(window.google?.accounts?.oauth2){
        clearInterval(chk);
        const b = document.getElementById('signInBtn');
        if(b){ b.disabled=false; b.style.opacity='1'; b.style.cursor='pointer'; }
      }
    }, 200);
  }
}
*/

function signInClick(){
  const btn = document.getElementById('signInBtn');
  const spinner = document.getElementById('loginSpinner');
  if(btn){ btn.disabled = true; btn.style.opacity = '0.7'; }
  const txtEl = document.getElementById('signInBtnTxt') || btn?.querySelector('span');
  if(txtEl) txtEl.textContent = '로그인 중...';
  if(spinner) spinner.style.display = 'block';
  if(tokenClient) tokenClient.requestAccessToken({prompt:''});
}
function signIn(){ signInClick(); }

// ★ Medicare/Health 제품 관리
function switchProduct(product) {
  localStorage.setItem('fcrm_current_product', product);
  // Medicare/Health만 유지
  localStorage.setItem('fcrm_current_product', 'health');
}

// ★ 페이지 로드 시 Medicare/Health 설정
window.addEventListener('load', () => {
  localStorage.setItem('fcrm_current_product', 'health');
});
function showApplications(){
  const applications = JSON.parse(localStorage.getItem('fcrm_applications') || '[]');
  console.clear();
  console.log('=== FinCRM 신청 목록 (총 ' + applications.length + '건) ===\n');
  
  if(applications.length === 0){
    console.log('아직 신청이 없습니다.');
    return;
  }
  
  applications.forEach((app, idx) => {
    console.log(`${idx+1}. ${app.이름}`);
    console.log(`   이메일: ${app.이메일}`);
    console.log(`   신청일시: ${app.신청일시}`);
    console.log('');
  });
  
  console.log('\n📋 다음 URL에서 Google Sheets에 입력하세요:');
  console.log('https://docs.google.com/spreadsheets/d/16j-DWyzI7GgsbIfKeulYwUluhk1d5-6xguyJbnNvJAs/edit#gid=0');
  console.log('');
  console.log('탭: "신청자목록"');
  console.log('컬럼: A=신청일시, B=이름, C=이메일, D=에이전시명, E=연락처, F=지역, G=코드, H=상태');
}

// 신청 데이터를 CSV 형식으로 복사 (Sheets 붙여넣기 용)
function copyAsCSV(){
  const applications = JSON.parse(localStorage.getItem('fcrm_applications') || '[]');
  let csv = '신청일시\t이름\t이메일\t에이전시명\t연락처\t지역\t코드\t상태\n';
  
  applications.forEach(app => {
    csv += `${app.신청일시}\t${app.이름}\t${app.이메일}\t\t\t\t\t대기\n`;
  });
  
  navigator.clipboard.writeText(csv).then(() => {
    console.log('✅ CSV 형식으로 복사되었습니다!');
    console.log('Google Sheets에서 Ctrl+V로 붙여넣기하세요');
  });
}

function signOut(){
  const userName = document.getElementById('udName')?.textContent || '';
  addLoginLog('logout', userName);
  if(accessToken && !isDemo) google.accounts.oauth2.revoke(accessToken,()=>{});
  accessToken='';
  localStorage.removeItem('fcrm_token');
  localStorage.removeItem('fcrm_exp');
  document.getElementById('app').classList.remove('on');
  document.getElementById('loginScreen').style.display='flex';
  document.getElementById('userWrap').style.display='none';
  clients=[]; allMemos=[]; isDemo=false;
  renderLastLoginInfo();
  // 로그인 버튼 복구
  const btn = document.getElementById('signInBtn');
  if(btn){ btn.disabled=false; btn.style.opacity='1'; }
  document.getElementById('loginSpinner').style.display='none';
  document.getElementById('signInBtnTxt').textContent='Google 계정으로 로그인';
}
