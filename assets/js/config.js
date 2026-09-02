const CLIENT_ID = '12663377588-v7o614l1aomfis8f0n5uniom9o7pk7vs.apps.googleusercontent.com';
const MAIN_ID   = '1a3ZAr3_ZB2ySPEAZDuvjS2mwPY3fdOBZBn0freXZ9tM';
const DETAIL_ID = '1ld2vqccy4e7o9QKsOxCDMa5cIR0uxzutQ1R52Sdk0yM';
const SCOPES    = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';

let accessToken = '';
let tokenExpiry  = 0;
let clients      = [];
let allMemos     = [];
let allPlanInfo  = [];
let isDemo       = false;
let tokenClient  = null;
let pendingFiles = [];
let currentUploadClient = '';

// ══════════════════════════════════════
// OAUTH
// ══════════════════════════════════════
window.addEventListener('load', () => {
  const t = localStorage.getItem('fcrm_token');
  const e = localStorage.getItem('fcrm_exp');
  if (t && e && Date.now() < +e) { accessToken=t; tokenExpiry=+e; bootApp(); }
});

document.addEventListener('DOMContentLoaded', () => {
  const chk = setInterval(() => {
    if (window.google?.accounts?.oauth2) {
      clearInterval(chk);
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error) return;
          accessToken = resp.access_token;
          tokenExpiry  = Date.now() + (resp.expires_in-60)*1000;
          localStorage.setItem('fcrm_token', accessToken);
          localStorage.setItem('fcrm_exp', tokenExpiry);
          fetch('https://www.googleapis.com/oauth2/v2/userinfo',{headers:{Authorization:'Bearer '+accessToken}})
            .then(r=>r.json()).then(u=>{
              const name = u.name||u.email||'사용자';
              localStorage.setItem('fcrm_user', JSON.stringify({name, email:u.email||'', picture:u.picture||''}));
              addLoginLog('login', name);
              updateUserUI(u);
            });
          bootApp();
        }
      });
      const btn = document.getElementById('signInBtn');
      if(btn){
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg><span class="signInBtnTxt">Google 계정으로 로그인</span>`;
        renderLastLoginInfo();
      }
    }
  }, 200);
});

// ══════════════════════════════════════
// LOGIN LOG
// ══════════════════════════════════════
