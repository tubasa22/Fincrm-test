function showTab(id,el){
  history.replaceState(null,'','#'+id);
  document.querySelectorAll('.pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-'+id).classList.add('on');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  if(id==='birthday') renderBirthday();
  if(id==='sms') initSmsTab();
  if(id==='automation') initAutomation();
}
function closeOv(id){document.getElementById(id).classList.remove('on');}
function setSyncStatus(txt,ok){set('syncTxt',txt);const p=document.getElementById('syncPill'),dot=p.querySelector('.dot');p.className='pill '+(ok?'ok':'err');dot.className='dot '+(ok?'ok':'err');}
function showLoad(t){set('loadTxt',t);document.getElementById('loadOv').classList.add('on');}
function hideLoad(){document.getElementById('loadOv').classList.remove('on');}
let _tid;
function toast(msg,dur=2600){const e=document.getElementById('toast');e.textContent=msg;e.classList.add('on');clearTimeout(_tid);_tid=setTimeout(()=>e.classList.remove('on'),dur);}
function set(id,v){const e=document.getElementById(id);if(e)e.innerHTML=(v===undefined||v===null)?'':v;}
function elapsed(s){if(!s)return null;const d=new Date(s);d.setHours(0,0,0,0);const t=new Date();t.setHours(0,0,0,0);return Math.ceil((t-d)/864e5);}
function pb(p){return{'PDP':'bbl','MAPD':'bgr','MA':'bte','SNP':'bpu','C-SNP':'bpu','D-SNP':'bte','Medigap':'bam'}[p]||'bgy';}
function dr(l,v){return `<div class="dr"><span class="dr-l">${l}</span><span class="dr-v">${v||'—'}</span></div>`;}
function esc(s){return(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}
const AVC=['#1a56db','#059669','#7c3aed','#0d9488','#b45309','#dc2626','#6366f1','#ec4899'];
function ac(n){return AVC[(n||'A').charCodeAt(0)%AVC.length];}

// ══════════════════════════════════════
// 전화번호 자동 포맷
// ══════════════════════════════════════
function fmtPhone(el){
  let v = el.value.replace(/\D/g,'');
  if(v.length>10) v=v.slice(0,10);
  if(v.length>=7) el.value=v.slice(0,3)+'-'+v.slice(3,6)+'-'+v.slice(6);
  else if(v.length>=4) el.value=v.slice(0,3)+'-'+v.slice(3);
  else el.value=v;
}

// MBI: 1XX9-XX9-XX99 형식 (영숫자 11자, 하이픈 자동)
function fmtMbi(el){
  const pos = el.selectionStart;
  let v = el.value.replace(/[^A-Z0-9]/gi,'').toUpperCase().slice(0,11);
  let out = '';
  for(let i=0;i<v.length;i++){
    if(i===4||i===7) out+='-';
    out+=v[i];
  }
  el.value = out;
}

// 대문자 변환
function toUpper(el){
  const pos = el.selectionStart;
  el.value = el.value.toUpperCase();
  try{ el.setSelectionRange(pos,pos); }catch(e){}
}

// 소문자 변환 (이메일)
function toLower(el){
  const pos = el.selectionStart;
  el.value = el.value.toLowerCase();
  try{ el.setSelectionRange(pos,pos); }catch(e){}
}

// 단어 첫글자 대문자 (이름, 도시)
function toTitleCase(el){
  const pos = el.selectionStart;
  el.value = el.value.replace(/\b\w/g, c=>c.toUpperCase());
  try{ el.setSelectionRange(pos,pos); }catch(e){}
}

// DOB: DD/MM/YYYY 자동 슬래시
function fmtDob(el){
  let v = el.value.replace(/\D/g,'').slice(0,8);
  let out = '';
  if(v.length>4) out = v.slice(0,2)+'/'+v.slice(2,4)+'/'+v.slice(4);
  else if(v.length>2) out = v.slice(0,2)+'/'+v.slice(2);
  else out = v;
  el.value = out;
}

function numOnly(el, maxLen){
  el.value = el.value.replace(/\D/g,'').slice(0, maxLen||99);
}

// ══════════════════════════════════════
// 주소 자동완성 (Google Places Autocomplete API)
// ══════════════════════════════════════
let addrSuggestList = [];
let addrSelIdx = -1;
let addrTimer = null;

async function addrInput(el){
  const q = el.value.trim();
  const box = document.getElementById('addrSuggest');
  if(q.length < 4){ box.style.display='none'; return; }
  clearTimeout(addrTimer);
  addrTimer = setTimeout(async()=>{

    // ── 1순위: Photon (Komoot) — 키 없음, 빠름, 미국 필터 ──
    try{
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=7&lang=en&bbox=-125,24,-66,50`,
        { headers:{ 'Accept-Language':'en' } }
      );
      const data = await res.json();
      const usOnly = (data.features||[]).filter(f=>
        f.properties.country_code==='us' || f.properties.country==='United States'
      );
      if(usOnly.length){
        addrSuggestList = usOnly.map(f=>{
          const p = f.properties;
          const num  = p.housenumber||'';
          const road = p.street||p.name||'';
          const city = p.city||p.county||'';
          const state= p.state||'';
          const zip  = p.postcode||'';
          return {
            label:   [num,road,city,state,zip].filter(Boolean).join(', '),
            address: [num,road].filter(Boolean).join(' '),
            city, state, zip
          };
        });
        renderAddrSuggest();
        return;
      }
    } catch(e){}

    // ── 2순위: US Census Geocoder — 미국 정부 공식, 키 없음 ──
    try{
      const res = await fetch(
        `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`
      );
      const data = await res.json();
      const matches = data?.result?.addressMatches || [];
      if(matches.length){
        addrSuggestList = matches.map(m=>({
          label:   m.matchedAddress,
          address: m.addressComponents?.streetName
                   ? (m.addressComponents.fromAddress||'')+' '+m.addressComponents.streetName
                   : m.matchedAddress.split(',')[0],
          city:    m.addressComponents?.city||'',
          state:   m.addressComponents?.state||'',
          zip:     m.addressComponents?.zip||'',
        }));
        renderAddrSuggest();
        return;
      }
    } catch(e){}

    // ── 3순위: Nominatim 폴백 ──
    try{
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5&countrycodes=us`,
        { headers:{ 'Accept-Language':'en','User-Agent':'FinCRM/1.0' } }
      );
      const data = await res.json();
      addrSuggestList = data.map(d=>({
        label:   d.display_name,
        address: [d.address.house_number,d.address.road].filter(Boolean).join(' '),
        city:    d.address.city||d.address.town||d.address.village||d.address.county||'',
        state:   d.address.state_code||d.address.state||'',
        zip:     d.address.postcode||'',
      }));
      renderAddrSuggest();
    } catch(e){
      addrSuggestList=[];
      document.getElementById('addrSuggest').style.display='none';
    }

  }, 320);
}

function renderAddrSuggest(){
  const box = document.getElementById('addrSuggest');
  if(!addrSuggestList.length){ box.style.display='none'; return; }
  box.innerHTML = addrSuggestList.map((s,i)=>`
    <div onclick="selectAddr(${i})" style="padding:9px 12px;cursor:pointer;font-size:12px;border-bottom:1px solid var(--g3);line-height:1.4;transition:.1s"
      onmouseover="this.style.background='var(--blue2)'" onmouseout="this.style.background=''">
      📍 ${s.label}
    </div>`).join('');
  box.style.display='block';
}

function selectAddr(i){
  const s = addrSuggestList[i];
  document.getElementById('f_address1').value = s.address || s.label.split(',')[0];
  if(s.city) document.getElementById('f_city').value = s.city;
  if(s.state){
    const st = s.state.length > 2
      ? (STATE_ABBR[s.state] || s.state.slice(0,2).toUpperCase())
      : s.state.toUpperCase();
    document.getElementById('f_state').value = st;
  }
  if(s.zip) document.getElementById('f_zip').value = s.zip;
  document.getElementById('addrSuggest').style.display='none';
}

function addrKeydown(e){
  const box = document.getElementById('addrSuggest');
  const items = box.querySelectorAll('div');
  if(e.key==='ArrowDown'){ addrSelIdx=Math.min(addrSelIdx+1,items.length-1); highlightAddr(items); e.preventDefault(); }
  else if(e.key==='ArrowUp'){ addrSelIdx=Math.max(addrSelIdx-1,0); highlightAddr(items); e.preventDefault(); }
  else if(e.key==='Enter' && addrSelIdx>=0){ selectAddr(addrSelIdx); e.preventDefault(); }
  else if(e.key==='Escape'){ box.style.display='none'; }
}
function highlightAddr(items){
  items.forEach((el,i)=>{ el.style.background = i===addrSelIdx?'var(--blue2)':''; });
}
document.addEventListener('click', e=>{
  if(!e.target.closest('#f_address1') && !e.target.closest('#addrSuggest'))
    document.getElementById('addrSuggest').style.display='none';
});

const STATE_ABBR = {
  'Alabama':'AL','Alaska':'AK','Arizona':'AZ','Arkansas':'AR','California':'CA',
  'Colorado':'CO','Connecticut':'CT','Delaware':'DE','Florida':'FL','Georgia':'GA',
  'Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
  'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Maryland':'MD','Massachusetts':'MA',
  'Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO','Montana':'MT',
  'Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM',
  'New York':'NY','North Carolina':'NC','North Dakota':'ND','Ohio':'OH','Oklahoma':'OK',
  'Oregon':'OR','Pennsylvania':'PA','Rhode Island':'RI','South Carolina':'SC',
  'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT',
  'Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
};

// ══════════════════════════════════════
// 약 리스트 스마트 파싱
// ══════════════════════════════════════
function parseMeds(el){
  const raw = el.value;
  // 줄바꿈 또는 쉼표로 분리
  const lines = raw.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  if(lines.length < 2){ 
    document.getElementById('medsTags').innerHTML='';
    document.getElementById('medsPreview').style.display='none';
    return;
  }
  const parsed = lines.map(line => {
    // 약 이름과 용량 분리: "Metformin 500mg" → {name:"Metformin", dose:"500mg"}
    const m = line.match(/^([A-Za-z][A-Za-z\s\-\/]+?)[\s]+(\d[\d\.]*\s*(?:mg|gm|g|mcg|ml|iu|units?|%|dr|hcl|tab|cap)?[\w\/]*)$/i);
    if(m){
      const name = toTitleCase(m[1].trim());
      const dose = m[2].trim().toLowerCase().replace(/\s+/,'');
      return {name, dose, full:`${name} ${dose}`};
    }
    // 용량 없는 경우
    return {name: toTitleCase(line.trim()), dose:'', full: toTitleCase(line.trim())};
  });

  // 중복 제거 (이름 기준, 대소문자 무시)
  const seen = new Set();
  const unique = parsed.filter(p=>{
    const k = p.name.toLowerCase().replace(/\s+/g,'');
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // 알파벳 정렬
  unique.sort((a,b)=>a.name.localeCompare(b.name));

  // 태그 렌더
  const tags = document.getElementById('medsTags');
  tags.innerHTML = unique.map((p,i)=>`
    <span style="display:inline-flex;align-items:center;gap:4px;background:var(--blue2);color:var(--blue);
      border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;margin-bottom:4px">
      💊 ${p.full}
      <button onclick="removeMed(${i})" style="border:none;background:none;cursor:pointer;color:var(--blue);font-size:13px;line-height:1;padding:0 0 0 2px">✕</button>
    </span>`).join('');

  // 프리뷰
  const preview = document.getElementById('medsPreview');
  const resultStr = unique.map(p=>p.full).join(', ');
  // textarea 값도 정리된 값으로 업데이트 (포커스 잃을 때)
  el.dataset.parsed = resultStr;
  preview.innerHTML = `✅ ${unique.length}개 정리됨 → 저장 시 자동 반영`;
  preview.style.display = 'block';
}

function removeMed(idx){
  const ta = document.getElementById('f_meds');
  const lines = ta.value.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean);
  // 중복제거+정렬 후 idx 제거
  const seen = new Set(); 
  const unique = [];
  lines.forEach(l=>{
    const k = l.toLowerCase().replace(/\s+/g,'');
    if(!seen.has(k)){seen.add(k);unique.push(l);}
  });
  unique.sort((a,b)=>a.localeCompare(b));
  unique.splice(idx,1);
  ta.value = unique.join('\n');
  parseMeds(ta);
}

function toTitleCase(str){
  // 알려진 약어는 대문자 유지
  const keepUpper = ['HCL','DR','SR','XR','ER','LA','SA','EC','OTC','MBI'];
  return str.split(/\s+/).map(w=>{
    if(keepUpper.includes(w.toUpperCase())) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

// 저장 직전 meds textarea 값 정리된 값으로 교체
function getCleanMeds(){
  const ta = document.getElementById('f_meds');
  if(ta.dataset.parsed) return ta.dataset.parsed;
  // dataset 없으면 현재 값 그대로 한줄로
  return ta.value.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean).join(', ');
}

// ══════════════════════════════════════
// 에이전트 리퍼 토글
// ══════════════════════════════════════
function toggleAgentField(){
  const chk = document.getElementById('f_ref_chk').checked;
  document.getElementById('f_ref').value = chk ? 'TRUE' : 'FALSE';
  document.getElementById('f_agent_wrap').style.display = chk ? 'block' : 'none';
  document.getElementById('f_ref_badge').style.display = chk ? 'inline-flex' : 'none';
  if(!chk){
    const agEl = document.getElementById('f_agent');
    if(agEl) agEl.value = '';
  }
}

// ══════════════════════════════════════
// PlanInfo 상세 렌더 함수 (백틱 중첩 방지)
// ══════════════════════════════════════
function renderPlanInfo(clientName){
  const pi = allPlanInfo.find(p=>p.name.trim()===clientName.trim())||{};
  const hasPi = pi.mbi||pi.medical_no||pi.pcp||pi.network||pi.meds||pi.conditions;
  if(!hasPi) return '<p style="color:var(--text3);font-size:13px;padding:8px 0">추가 정보 없음 — 수정 버튼을 눌러 입력해주세요</p>';

  const piRows = [
    pi.mbi        ? {label:'🪪 MBI (Medicare ID)',       val:'<span style="font-family:monospace;font-size:14px;font-weight:700;letter-spacing:1.5px;color:var(--blue)">'+pi.mbi+'</span>'} : null,
    pi.medical_no ? {label:'🏥 Medical # (Medi-Cal)',    val:'<span style="font-family:monospace;font-size:14px;font-weight:700">'+pi.medical_no+'</span>'} : null,
    {label:'👨‍⚕️ PCP 이름',             val: pi.pcp||'—'},
    {label:'📞 PCP 연락처',             val: pi.pcp_phone||'—'},
    {label:'🏨 메디컬 네트워크 / IPA',  val: pi.network||'—'},
    {label:'🔢 그룹 번호',              val: pi.group_no||'—'},
  ].filter(Boolean);

  const mb = (pi.meds||pi.conditions) ? '14px' : '0';
  let html = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--g3);border-radius:var(--rs);overflow:hidden;margin-bottom:'+mb+'">';
  piRows.forEach(function(row, i){
    const bg = i%2===0 ? '#f8fbff' : '#fff';
    html += '<div style="background:'+bg+';padding:10px 14px;display:flex;flex-direction:column;gap:3px">'
          + '<span style="font-size:11px;color:var(--text3);font-weight:600">'+row.label+'</span>'
          + '<span style="font-size:13px;font-weight:500;color:var(--text)">'+row.val+'</span>'
          + '</div>';
  });
  html += '</div>';

  if(pi.meds){
    const medList = pi.meds.split(',').map(function(m){return m.trim();}).filter(Boolean).sort();
    html += '<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:var(--rs);padding:12px 14px;margin-bottom:10px">'
          + '<div style="font-size:11px;font-weight:700;color:#0369a1;margin-bottom:8px">💊 복용 약 리스트 <span style="font-weight:400;color:var(--text3)">('+medList.length+'개)</span></div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:5px">'
          + medList.map(function(m){ return '<span style="background:#dbeafe;color:#1e40af;border-radius:20px;padding:3px 10px;font-size:12px;font-weight:500">💊 '+m+'</span>'; }).join('')
          + '</div></div>';
  }

  if(pi.conditions){
    html += '<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:var(--rs);padding:12px 14px">'
          + '<div style="font-size:11px;font-weight:700;color:#c2410c;margin-bottom:6px">⚠️ 특이사항 / 만성질환</div>'
          + '<div style="font-size:13px;color:var(--text);line-height:1.7">'+pi.conditions+'</div>'
          + '</div>';
  }
  return html;
}

// ══════════════════════════════════════
// USER UI 함수들
// ══════════════════════════════════════
function updateUserUI(u){
  // 온보딩에서 입력한 이름을 우선 사용
  const profile = JSON.parse(localStorage.getItem('fcrm_user_profile')||'null');
  const name = profile?.name || u.name || u.email || '사용자';
  const email = u.email || profile?.email || '';
  const picture = u.picture || '';
  const initials = name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const loginTime = new Date().toLocaleString('ko-KR');
  const firstName = name.split(' ')[0];

  document.getElementById('userWrap').style.display = 'block';
  document.getElementById('userBtnName').textContent = firstName;

  if(picture){
    // 구글 프로필 사진 있으면 표시
    const av = document.getElementById('userAvatar');
    av.src = picture; av.style.display = 'block';
    document.getElementById('userAvatarPlaceholder').style.display = 'none';
    document.getElementById('udAvatar').src = picture;
    document.getElementById('udAvatar').style.display = 'block';
    document.getElementById('udAvatarPlaceholder').style.display = 'none';
  } else {
    // 사진 없으면 이니셜
    document.getElementById('userAvatar').style.display = 'none';
    document.getElementById('userAvatarPlaceholder').style.display = 'flex';
    document.getElementById('userAvatarPlaceholder').textContent = initials;
    document.getElementById('udAvatar').style.display = 'none';
    document.getElementById('udAvatarPlaceholder').style.display = 'flex';
    document.getElementById('udAvatarPlaceholder').textContent = initials;
  }

  document.getElementById('udName').textContent = name;
  document.getElementById('udEmail').textContent = email;
  document.getElementById('udLoginTime').textContent = '🕐 로그인: ' + loginTime;
  renderUdLog();
}

function toggleUserMenu(){
  const dd = document.getElementById('userDropdown');
  dd.classList.toggle('on');
  if(dd.classList.contains('on')) renderUdLog();
}

function renderUdLog(){
  const log = getLoginLog();
  const el = document.getElementById('udLogList');
  if(!log.length){ el.innerHTML='<div style="font-size:11px;color:var(--text3)">이력 없음</div>'; return; }
  el.innerHTML = log.slice(0,5).map(l=>
    '<div class="ud-log-item">'
    + '<div class="ud-log-dot '+(l.type==='login'?'in':'out')+'"></div>'
    + '<span style="flex:1">'+(l.type==='login'?'로그인':'로그아웃')+' — '+l.user+'</span>'
    + '<span style="color:var(--text3);font-size:10px;white-space:nowrap">'+l.time+'</span>'
    + '</div>'
  ).join('');
}

function showLoginLog(){
  var log = getLoginLog();
  if(!log.length){ toast('로그인 이력 없음'); return; }
  var nl = String.fromCharCode(10);
  var rows = log.map(function(l){
    return (l.type==='login'?'[IN] ':'[OUT]')+' '+l.time+' '+l.user;
  }).join(nl);
  alert('로그인 이력 (최근 20건)'+nl+nl+rows);
}

function renderLastLoginInfo(){
  const log = getLoginLog();
  const el = document.getElementById('lastLoginInfo');
  if(!el) return;
  if(!log.length){ el.textContent=''; return; }
  const last = log.find(l=>l.type==='login');
  if(last) el.innerHTML = '마지막 로그인: <strong>'+last.user+'</strong><br>'+last.time;
}

// 드롭다운 외부 클릭 닫기
document.addEventListener('click', function(e){
  if(!e.target.closest('.user-wrap')) {
    const dd = document.getElementById('userDropdown');
    if(dd) dd.classList.remove('on');
  }
});

// 토큰 만료 감지 (5분마다 체크)
setInterval(function(){
  if(!accessToken || isDemo) return;
  const remaining = tokenExpiry - Date.now();
  if(remaining < 5*60*1000 && remaining > 0){
    toast('⚠️ 로그인 세션이 곧 만료됩니다. 페이지를 새로고침해주세요.', 6000);
  } else if(remaining <= 0){
    toast('❌ 세션이 만료되었습니다. 다시 로그인해주세요.', 6000);
    signOut();
  }
}, 5*60*1000);

// ══════════════════════════════════════
// 가입상품 셀렉트 + 직접입력 연동
// ══════════════════════════════════════
function prodSelChange(){
  const sel = document.getElementById('f_prod_sel');
  const inp = document.getElementById('f_prod');
  if(sel.value === '__other__'){
    inp.style.display = 'block';
    inp.value = '';
    inp.focus();
  } else {
    inp.style.display = 'none';
    inp.value = sel.value;
  }
}

function getProdValue(){
  const sel = document.getElementById('f_prod_sel');
  const inp = document.getElementById('f_prod');
  if(sel.value === '__other__' || sel.value === ''){
    return inp.value.trim();
  }
  return sel.value;
}

function setProdValue(val){
  if(!val){
    document.getElementById('f_prod_sel').value='';
    document.getElementById('f_prod').value='';
    document.getElementById('f_prod').style.display='none';
    return;
  }
  const sel = document.getElementById('f_prod_sel');
  const hasOpt = Array.from(sel.options).some(o=>o.value===val||o.text===val);
  if(hasOpt){
    sel.value = val;
    document.getElementById('f_prod').value = val;
    document.getElementById('f_prod').style.display = 'none';
  } else {
    sel.value = '__other__';
    document.getElementById('f_prod').value = val;
    document.getElementById('f_prod').style.display = 'block';
  }
}

function populateMemoSel(){}

// ══════════════════════════════════════
// 온보딩 & 사용자 코드 시스템
// ══════════════════════════════════════
function generateUserCode(name, email){
  // FC + 이름 이니셜 + 랜덤 4자리 숫자
  const initials = (name||'XX').replace(/\s/g,'').slice(0,2).toUpperCase();
  const rand = String(Math.floor(1000+Math.random()*9000));
  return 'FC-'+initials+'-'+rand;
}

function openOnboarding(){
  document.getElementById('onboardingModal').style.display = 'flex';
  setTimeout(()=>document.getElementById('ob_name').focus(), 100);
}

function obNext(step){
  if(step===1){
    const name = document.getElementById('ob_name').value.trim();
    if(!name){ alert('이름을 입력해주세요'); return; }
    document.getElementById('ob_step1').style.display='none';
    document.getElementById('ob_step2').style.display='block';
    document.getElementById('ob_step_bar').style.width='66%';
  } else if(step===2){
    // 로그인 시 입력한 액세스 코드 사용 (없으면 자동 생성)
    const name  = document.getElementById('ob_name').value.trim();
    const email = document.getElementById('ob_email').value.trim();
    const code  = localStorage.getItem('fcrm_access_code') || generateUserCode(name, email);
    document.getElementById('ob_code_display').textContent = code;
    // 요약
    const counties = [...document.querySelectorAll('input[name="ob_county"]:checked')].map(e=>e.value);
    const plans    = [...document.querySelectorAll('input[name="ob_plan"]:checked')].map(e=>e.value);
    document.getElementById('ob_summary').innerHTML =
      `이름: <strong>${name}</strong><br>` +
      (document.getElementById('ob_agency').value ? `에이전시: <strong>${document.getElementById('ob_agency').value}</strong><br>` : '') +
      (email ? `이메일: <strong>${email}</strong><br>` : '') +
      (counties.length ? `서비스 지역: <strong>${counties.join(', ')}</strong><br>` : '') +
      (plans.length   ? `취급 플랜: <strong>${plans.join(', ')}</strong>` : '');
    document.getElementById('ob_step2').style.display='none';
    document.getElementById('ob_step3').style.display='block';
    document.getElementById('ob_step_bar').style.width='100%';
  }
}

function obBack(step){
  if(step===1){
    document.getElementById('ob_step2').style.display='none';
    document.getElementById('ob_step1').style.display='block';
    document.getElementById('ob_step_bar').style.width='33%';
  } else if(step===2){
    document.getElementById('ob_step3').style.display='none';
    document.getElementById('ob_step2').style.display='block';
    document.getElementById('ob_step_bar').style.width='66%';
  }
}

function copyUserCode(){
  const code = document.getElementById('ob_code_display').textContent;
  navigator.clipboard.writeText(code).then(()=>toast('📋 코드 복사됨: '+code));
}

function completeOnboarding(){
  const name     = document.getElementById('ob_name').value.trim();
  const agency   = document.getElementById('ob_agency').value.trim();
  const email    = document.getElementById('ob_email').value.trim();
  const phone    = document.getElementById('ob_phone').value.trim();
  const counties = [...document.querySelectorAll('input[name="ob_county"]:checked')].map(e=>e.value);
  const plans    = [...document.querySelectorAll('input[name="ob_plan"]:checked')].map(e=>e.value);
  // 로그인 시 입력한 액세스 코드 사용 (없으면 자동 생성)
  const code = localStorage.getItem('fcrm_access_code') || generateUserCode(name, email);
  const profile = { name, agency, email, phone, counties, plans, code,
                    joinedAt: new Date().toLocaleString('ko-KR'), version:'1.0' };
  localStorage.setItem('fcrm_user_profile', JSON.stringify(profile));
  document.getElementById('onboardingModal').style.display = 'none';
  applyUserCode();
  // 운영팀에 신규 사용자 알림
  const webhook = localStorage.getItem('fcrm_feedback_webhook')||'';
  if(webhook){
    fetch(webhook, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type:'onboarding', user_code:code, name, agency, email,
        counties, plans, ts: new Date().toLocaleString('ko-KR'), version:'1.0' })
    }).catch(()=>{});
  }
  toast(`🎉 환영합니다, ${name}님! 코드: ${code}`);
}

function applyUserCode(){
  const profile = JSON.parse(localStorage.getItem('fcrm_user_profile')||'null');
  if(!profile) return;
  // 사용자 코드를 모든 피드백에 자동 포함 (전역 참조)
  window.CURRENT_USER_PROFILE = profile;
}

// 피드백 전송 시 사용자 코드 자동 포함 (sendToWebhook 보강)
const _baseSendToWebhook = window.sendToWebhook;
window.sendToWebhook = async function(payload, modalId, successMsg){
  const profile = JSON.parse(localStorage.getItem('fcrm_user_profile')||'null');
  if(profile){
    payload.user_code  = profile.code;
    payload.user_name  = profile.name;
    payload.user_agency= profile.agency;
  }
  // 로컬 피드백 로그 저장
  const log = JSON.parse(localStorage.getItem('fcrm_feedback_log')||'[]');
  log.push(payload);
  localStorage.setItem('fcrm_feedback_log', JSON.stringify(log.slice(-500)));
  // 원본 전송
  if(_baseSendToWebhook) await _baseSendToWebhook(payload, modalId, successMsg);
  else {
    const url = localStorage.getItem('fcrm_feedback_webhook')||'';
    if(url){
      try{ await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); }
      catch(e){}
    }
    closeOv(modalId); toast(successMsg);
  }
};
const DEV_KEY = 'fincrm_dev_2026';
let devUnlocked = sessionStorage.getItem('dev_unlocked') === '1';
let devTab = 'agents';

// ★ 개발자 모드는 비활성화됨 (고객용 버전)

// ★ 개발자 모드는 비활성화됨 (고객용 버전)

function openDevPanel(){} // 비활성화됨
function closeDevPanel(){} // 비활성화됨
function switchDevTab(t){} // 비활성화됨
function renderDevTab(t){} // 비활성화됨

// Google 로그인 초기화
function initGoogleSignIn(){
  const btn = document.getElementById('signInBtn');
  if(btn && btn.disabled){
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    const txtEl = document.getElementById('signInBtnTxt');
    if(txtEl) txtEl.textContent = 'Google 계정으로 로그인';
  }
}

