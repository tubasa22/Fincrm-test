function openDetail(rowIdx){
  const c=clients.find(x=>x.rowIdx===rowIdx);
  if(!c){ alert('고객 정보를 찾을 수 없습니다.'); return; }

  // #app 숨기고 #detailPg 표시
  document.getElementById('app').style.display = 'none';
  var dp = document.getElementById('detailPg');
  dp.style.display = 'block';
  window.scrollTo(0,0);

  var d = elapsed(c.next);
  var db = d!==null ? '<span class="badge '+(d>=30?'bre':d>=14?'bam':'bgr')+'">D+'+d+'</span>' : '';
  var memos = allMemos.filter(function(m){ return m.name===c.name; }).sort(function(a,b){ return new Date(b.date||0)-new Date(a.date||0); });

  // 헤더
  document.getElementById('dHead').innerHTML =
    '<div class="dh">' +
      '<div class="dh-av" style="background:'+ac(c.name)+'">'+c.name[0]+'</div>' +
      '<div class="dh-info">' +
        '<h2>'+c.name+
          (c.ref==='TRUE' ? ' <span class="badge bpu">리퍼</span>'+(c.agent?' <span style="font-size:12px;color:var(--text2)">'+c.agent+'</span>':'') : '') +
          (c.plan ? ' <span class="badge '+pb(c.plan)+'">'+c.plan+'</span>' : '') +
        '</h2>' +
        '<p>📞 '+(c.phone||'—')+(c.phone2?' / '+c.phone2:'')+' &nbsp;|&nbsp; ✉️ '+(c.email||'—')+' &nbsp;|&nbsp; 📅 마지막 연락: '+(c.next||'없음')+' '+db+'</p>' +
      '</div>' +
      '<div class="dh-right">' +
        (c.phone ? '<a href="tel:'+c.phone+'" class="btn sm grn" onclick="setTimeout(()=>updateLastContact('+c.rowIdx+',true),1000)">📞 전화</a>' : '') +
        (c.phone ? '<button class="btn sm" onclick="openSingleSms(\''+esc(c.name)+'\',\''+c.phone+'\');setTimeout(()=>updateLastContact('+c.rowIdx+',true),1000)" style="background:#0ea5e9;color:#fff;border-color:#0ea5e9">💬 메시지</button>' : '') +
        (c.phone ? '<a href="https://open.kakao.com/o/s'+c.phone.replace(/[^0-9]/g,'')+'" target="_blank" class="btn sm" style="background:#FFE812;color:#000;border-color:#FFE812;text-decoration:none" onclick="setTimeout(()=>updateLastContact('+c.rowIdx+',true),500)">🔔 카톡</a>' : '') +
        '<button class="btn sm" onclick="openAddMemoFor(\''+esc(c.name)+'\')">📝 메모</button>' +
        '<button class="btn sm" onclick="openFileUpload(\''+esc(c.name)+'\')">📎 서류 업로드</button>' +
        '<button class="btn sm" onclick="openEditClient('+c.rowIdx+')">✏️ 수정</button>' +
        '<button class="btn sm pri" onclick="openSheetView(\''+esc(c.name)+'\',\''+( c.durl||'')+'\')">📋 상세 페이지</button>' +
      '</div>' +
    '</div>';

  // 본문 그리드
  var memoListHtml = memos.length ? memos.map(function(m){
    return '<div class="mi" style="border-left:3px solid var(--blue);padding-left:12px;margin-bottom:10px;background:var(--sur);border-radius:0 var(--rs) var(--rs) 0">' +
      '<div class="mi-d" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<span class="badge bbl" style="font-size:10px">'+(m.type||'기타')+'</span>' +
        '<span style="font-weight:600;color:var(--text)">'+(m.date||'')+'</span>' +
        (m.ts ? '<span style="font-size:11px;color:var(--text3)">작성: '+m.ts+'</span>' : '') +
      '</div>' +
      '<div class="mi-t" style="margin-top:6px;white-space:pre-wrap">'+(m.text||'')+'</div>' +
    '</div>';
  }).join('') : '<p style="color:var(--text3);font-size:13px;padding:10px 0">상담 이력 없음</p>';

  document.getElementById('dGrid').innerHTML =
    '<div class="dgrid">' +
      '<div class="dc">' +
        '<h4>기본 정보</h4>' +
        dr('연락처 1', c.phone) +
        (c.phone2 ? dr('연락처 2', c.phone2) : '') +
        dr('이메일', c.email) +
        (c.address1 ? dr('주소', c.address1+(c.city?', '+c.city:'')+(c.zip?' '+c.zip:'')) : '') +
        (c.state ? dr('State', c.state) : '') +
        (c.dob ? dr('생년월일', c.dob) : '') +
        dr('플랜', c.plan ? '<span class="badge '+pb(c.plan)+'">'+c.plan+'</span>' : '—') +
        dr('가입상품', c.prod||'—') +
        dr('리퍼', c.ref==='TRUE' ? '<span class="badge bpu">리퍼 ✓</span>'+(c.agent?' <strong>'+c.agent+'</strong>':'') : '없음') +
      '</div>' +
      '<div class="dc">' +
        '<h4>메모 &amp; 일정 <button class="btn sm" onclick="toggleMemoEdit('+c.rowIdx+',\''+esc(c.memo||'')+'\')">✏️ 수정</button></h4>' +
        dr('마지막 연락일', (c.next||'없음')+' '+db) +
        '<div id="memoView_'+c.rowIdx+'" style="margin-top:10px;background:var(--g2);border-radius:var(--rs);padding:10px;font-size:13px;line-height:1.7;color:var(--text2)">'+(c.memo||'(메모 없음)')+'</div>' +
        '<div id="memoEdit_'+c.rowIdx+'" style="display:none;margin-top:10px">' +
          '<textarea id="memoTa_'+c.rowIdx+'" style="width:100%;border:1px solid var(--blue);border-radius:var(--rs);padding:10px;font-size:13px;min-height:80px;resize:vertical;font-family:inherit;outline:none;line-height:1.7">'+(c.memo||'')+'</textarea>' +
          '<div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end">' +
            '<button class="btn sm" onclick="cancelMemoEdit('+c.rowIdx+',\''+esc(c.memo||'')+'\')">취소</button>' +
            '<button class="btn sm pri" onclick="saveMemoEdit('+c.rowIdx+')">💾 저장</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      // MAPD/PDP 플랜 추가 정보 패널
      (['MAPD','PDP'].includes(c.plan) ?
        '<div class="dc full" style="border:1.5px solid #bfdbfe;background:linear-gradient(135deg,#eff6ff,#fff)">' +
          '<h4 style="color:var(--blue)">🏥 '+c.plan+' 플랜 상세 정보' +
            ' <button class="btn sm" onclick="openEditClient('+c.rowIdx+')" style="font-size:11px">✏️ 수정</button>' +
          '</h4>' +
          renderPlanInfo(c.name) +
        '</div>'
      : '') +
      '<div class="dc">' +
        '<h4>📎 고객 서류 <button class="btn sm" onclick="openFileUpload(\''+esc(c.name)+'\')">+ 업로드</button></h4>' +
        '<div id="docsList_'+rowIdx+'"><div style="color:var(--text3);font-size:13px;padding:12px">불러오는 중...</div></div>' +
      '</div>' +
      '<div class="dc full">' +
        '<h4>📋 상담 이력 ('+memos.length+'건) <button class="btn sm pri" onclick="openAddMemoFor(\''+esc(c.name)+'\')">+ 메모 추가</button></h4>' +
        memoListHtml +
      '</div>' +
    '</div>';

  loadClientDocs(c.name, rowIdx);
}

async function loadClientDocs(clientName, rowIdx){
  const el=document.getElementById('docsList_'+rowIdx);
  if(!el) return;
  // 데모 모드: 가상 서류 목록
  if(isDemo){
    const demoDocs = {
      '홍 문례':   [{id:'d1',name:'[Medicare 카드] medicare_card.jpg',  date:'2025-01-15'},
                    {id:'d2',name:'[신분증 (ID)] drivers_license.jpg',   date:'2025-01-15'}],
      '김 철수':   [{id:'d3',name:'[보험 카드] kaiser_card.pdf',         date:'2025-03-30'},
                    {id:'d4',name:'[신청서] mapd_application.pdf',       date:'2025-03-28'}],
      '박 영자':   [{id:'d5',name:'[Medicare 카드] medicare_card.jpg',   date:'2024-11-10'},
                    {id:'d6',name:'[계약서] snp_contract.pdf',           date:'2024-11-10'}],
      '강 정숙':   [{id:'d7',name:'[보험 카드] anthem_card.jpg',         date:'2025-01-05'}],
    };
    const docs = demoDocs[clientName] || [];
    if(!docs.length){
      el.innerHTML='<p style="color:var(--text3);font-size:13px;padding:8px 0">업로드된 서류 없음 (데모)</p>';
      return;
    }
    el.innerHTML = docs.map(f=>`
      <div class="doc-item">
        <span style="font-size:18px">${fileIcon(f.name)}</span>
        <div style="flex:1;min-width:0"><div class="doc-name">${f.name}</div><div class="doc-date">${f.date}</div></div>
        <button class="btn sm" onclick="toast('데모 모드에서는 파일 열기가 비활성화됩니다')">열기</button>
        <button class="btn sm red" onclick="toast('데모 모드에서는 삭제가 비활성화됩니다')">🗑</button>
      </div>`).join('');
    return;
  }
  // 실제 모드
  try{
    const fq=`name='${clientName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const fr=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fq)}&fields=files(id)`,{headers:{Authorization:'Bearer '+accessToken}});
    const fd=await fr.json();
    if(!fd.files||fd.files.length===0){el.innerHTML=`<p style="color:var(--text3);font-size:13px;padding:8px 0">업로드된 서류 없음</p>`;return;}
    const folderId=fd.files[0].id;
    const lr=await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent("'"+folderId+"' in parents and trashed=false")}&fields=files(id,name,webViewLink,createdTime)&orderBy=createdTime desc`,{headers:{Authorization:'Bearer '+accessToken}});
    const ld=await lr.json();
    if(!ld.files||ld.files.length===0){el.innerHTML=`<p style="color:var(--text3);font-size:13px;padding:8px 0">업로드된 서류 없음</p>`;return;}
    el.innerHTML=ld.files.map(f=>`
      <div class="doc-item" id="doc-${f.id}">
        <span style="font-size:18px">${fileIcon(f.name)}</span>
        <div style="flex:1;min-width:0"><div class="doc-name">${f.name}</div><div class="doc-date">${f.createdTime?f.createdTime.slice(0,10):''}</div></div>
        <a href="${f.webViewLink}" target="_blank" class="btn sm">열기</a>
        <button class="btn sm red" onclick="deleteDoc('${f.id}','${esc(f.name)}',${rowIdx},'${esc(clientName)}')" title="삭제">🗑</button>
      </div>`).join('');
  }catch(e){
    el.innerHTML=`<p style="color:var(--text3);font-size:12px">서류 목록 로드 실패</p>`;
  }
}

async function deleteDoc(fileId, fileName, rowIdx, clientName){
  if(isDemo){ toast('🚫 데모 모드에서는 삭제가 비활성화됩니다'); return; }
  if(!confirm('"'+fileName+'" 파일을 삭제할까요?')) return;
  try{
    showLoad('삭제 중...');
    const r = await fetch('https://www.googleapis.com/drive/v3/files/'+fileId,{method:'DELETE',headers:{Authorization:'Bearer '+accessToken}});
    if(!r.ok && r.status !== 204) throw new Error('HTTP '+r.status);
    const el = document.getElementById('doc-'+fileId);
    if(el) el.remove();
    toast('🗑 파일 삭제됨');
  }catch(e){ toast('❌ 삭제 실패: '+e.message, 4000); }
  finally{ hideLoad(); }
}

function fileIcon(name){
  if(/\.pdf$/i.test(name)) return '📄';
  if(/\.(jpg|jpeg|png|heic|gif)$/i.test(name)) return '🖼️';
  return '📎';
}

// ══════════════════════════════════════
// INLINE MEMO EDIT
// ══════════════════════════════════════
function toggleMemoEdit(rowIdx, currentMemo){
  document.getElementById('memoView_'+rowIdx).style.display='none';
  const editEl = document.getElementById('memoEdit_'+rowIdx);
  editEl.style.display='block';
  const ta = document.getElementById('memoTa_'+rowIdx);
  ta.value = currentMemo;
  ta.focus();
}
function cancelMemoEdit(rowIdx, originalMemo){
  document.getElementById('memoView_'+rowIdx).style.display='block';
  document.getElementById('memoEdit_'+rowIdx).style.display='none';
  document.getElementById('memoTa_'+rowIdx).value = originalMemo;
}
async function saveMemoEdit(rowIdx){
  const newMemo = document.getElementById('memoTa_'+rowIdx).value.trim();
  const c = clients.find(x=>x.rowIdx===rowIdx);
  if(!c) return;
  showLoad('메모 저장 중...');
  try{
    if(!isDemo){
      // 메인 시트 L열(12번째, 0-indexed) 업데이트
      await sheetsReq('PUT',
        `${MAIN_ID}/values/P${rowIdx}?valueInputOption=USER_ENTERED`,
        {values:[[newMemo]]});
    }
    // 로컬 데이터 즉시 반영
    c.memo = newMemo;
    // 화면 업데이트
    const viewEl = document.getElementById('memoView_'+rowIdx);
    if(viewEl) viewEl.innerHTML = newMemo || '(메모 없음)';
    document.getElementById('memoEdit_'+rowIdx).style.display='none';
    viewEl.style.display='block';
    // 고객 목록도 갱신
    renderClients();
    renderFollowup();
    toast('✅ 메모가 저장되었습니다');
  }catch(e){
    toast('❌ 저장 실패: '+e.message, 4000);
  }finally{
    hideLoad();
  }
}

// ══════════════════════════════════════
// SHEET VIEW MODAL (열람 전용)
// ══════════════════════════════════════
// gid=1613556773 → 고객 상세 탭 (공통)
// durl이 있으면 해당 고객 개인 시트 우선
const DETAIL_GID_SHEET = '1613556773';   // 상세 페이지 탭
const DETAIL_GID_PLAN  = '588166202';    // PlanInfo 탭 (MBI, PCP 등)

function openSheetView(clientName, durl){
  if(isDemo){
    toast('📋 데모 모드에서는 실제 Google Sheets에 연결되지 않습니다');
    return;
  }
  const baseUrl = 'https://docs.google.com/spreadsheets/d/'+DETAIL_ID;
  let gid = DETAIL_GID_SHEET;
  if(durl){
    const m = durl.match(/gid=(\d+)/);
    if(m) gid = m[1];
  }
  const openUrl = baseUrl+'/edit?gid='+gid;
  window.open(openUrl, '_blank');
}

function closeSheetView(){
  document.getElementById('sheetViewModal').classList.remove('on');
  document.getElementById('sheetViewFrame').src = '';
}

function sheetViewReload(){
  var f = document.getElementById('sheetViewFrame');
  var s = f.src;
  svStartLoading();
  f.src = '';
  setTimeout(function(){ f.src = s; }, 100);
}

function sheetViewCenter(){
  var win = document.getElementById('sheetViewWin');
  if(svState.maximized) return;
  win.classList.remove('minimized');
  svState.minimized = false;
  // 현재 창 크기 유지하면서 화면 중앙으로
  var w = win.offsetWidth;
  var h = win.offsetHeight;
  var nx = Math.max(0, (window.innerWidth  - w) / 2);
  var ny = Math.max(0, (window.innerHeight - h) / 2);
  win.style.transform = 'none';
  win.style.left = nx + 'px';
  win.style.top  = ny + 'px';
  try{
    localStorage.setItem('sv_pos', JSON.stringify({
      left: nx+'px', top: ny+'px',
      w: win.style.width, h: win.style.height
    }));
  }catch(e){}
  toast('📋 창을 화면 중앙으로 이동했습니다');
}

// ══════════════════════════════════════
// SHEET VIEW WINDOW — 브라우저 창 방식
// ══════════════════════════════════════
var svState = {
  maximized: false,
  minimized: false,
  // 최대화 전 원래 위치/크기 저장
  prevLeft:'', prevTop:'', prevW:'', prevH:'', prevTransform:''
};

function initDrag(){
  var win = document.getElementById('sheetViewWin');
  // 저장된 위치 복원, 없으면 중앙
  var saved = {};
  try{ saved = JSON.parse(localStorage.getItem('sv_pos')||'{}'); }catch(e){}
  if(saved.left && saved.top){
    win.style.transform = 'none';
    win.style.left = saved.left;
    win.style.top  = saved.top;
    win.style.width  = saved.w  || 'min(1100px,92vw)';
    win.style.height = saved.h  || '82vh';
  } else {
    win.style.left = '50%';
    win.style.top  = '60px';
    win.style.transform = 'translateX(-50%)';
    win.style.width  = 'min(1100px,92vw)';
    win.style.height = '82vh';
  }
  win.classList.remove('maximized','minimized');
  svState.maximized = false;
  svState.minimized = false;
  document.getElementById('svMaxBtn').textContent = '⛶';
  document.getElementById('svMinBtn').textContent = '—';
}

function sheetViewMaximize(){
  var win = document.getElementById('sheetViewWin');
  var btn = document.getElementById('svMaxBtn');
  if(svState.maximized){
    // 복원
    win.classList.remove('maximized');
    win.style.left   = svState.prevLeft;
    win.style.top    = svState.prevTop;
    win.style.width  = svState.prevW;
    win.style.height = svState.prevH;
    win.style.transform = svState.prevTransform;
    btn.textContent = '⛶';
    btn.title = '최대화';
    svState.maximized = false;
    if(svState.minimized){ win.classList.remove('minimized'); svState.minimized=false; }
  } else {
    // 현재 위치 저장
    var r = win.getBoundingClientRect();
    svState.prevLeft = win.style.left;
    svState.prevTop  = win.style.top;
    svState.prevW    = win.style.width  || r.width+'px';
    svState.prevH    = win.style.height || r.height+'px';
    svState.prevTransform = win.style.transform;
    win.classList.add('maximized');
    win.classList.remove('minimized');
    win.style.transform = 'none';
    btn.textContent = '❐';
    btn.title = '이전 크기로';
    svState.maximized = true;
    svState.minimized = false;
  }
}

function sheetViewMinimize(){
  var win = document.getElementById('sheetViewWin');
  var btn = document.getElementById('svMinBtn');
  if(svState.minimized){
    win.classList.remove('minimized');
    btn.textContent = '—';
    btn.title = '최소화';
    svState.minimized = false;
  } else {
    if(svState.maximized) sheetViewMaximize(); // 최대화 상태면 먼저 복원
    win.classList.add('minimized');
    btn.textContent = '□';
    btn.title = '복원';
    svState.minimized = true;
  }
}

// ── 드래그 이동 (좌표 제한 없음 → 멀티모니터 지원) ──
(function(){
  var win = document.getElementById('sheetViewWin');
  var handle = document.getElementById('sheetViewHandle');
  if(!win || !handle) return;
  var dragging=false, resizing=false;
  var ox=0, oy=0, wx=0, wy=0;
  var rox=0, roy=0, rw=0, rh=0;

  // 드래그 이동
  handle.addEventListener('mousedown', function(e){
    if(e.target.closest('a,button') || svState.maximized) return;
    dragging = true;
    var r = win.getBoundingClientRect();
    win.style.left = r.left+'px';
    win.style.top  = r.top+'px';
    win.style.transform = 'none';
    ox=e.clientX; oy=e.clientY; wx=r.left; wy=r.top;
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  // 더블클릭 → 최대화 토글
  handle.addEventListener('dblclick', function(e){
    if(e.target.closest('a,button')) return;
    sheetViewMaximize();
  });

  // 리사이즈 핸들
  var resizeEl = document.getElementById('svResize');
  if(resizeEl){
    resizeEl.addEventListener('mousedown', function(e){
      if(svState.maximized || svState.minimized) return;
      resizing = true;
      var r = win.getBoundingClientRect();
      rox=e.clientX; roy=e.clientY; rw=r.width; rh=r.height;
      document.body.style.userSelect = 'none';
      e.preventDefault(); e.stopPropagation();
    });
  }

  document.addEventListener('mousemove', function(e){
    if(dragging){
      var nx = wx + e.clientX - ox;
      var ny = wy + e.clientY - oy;
      // 헤더가 항상 화면 안에 있도록 제한
      // 상단: 0px 이상 (헤더가 화면 위로 못 나감)
      // 하단: 화면 높이 - 헤더높이(44px) 이상 못 내려감
      // 좌우: 창 너비의 최소 120px는 화면 안에 있어야 함
      var winW = win.offsetWidth || 800;
      var minLeft = -(winW - 120);          // 왼쪽으로 (winW-120)px까지만
      var maxLeft = window.innerWidth - 120; // 오른쪽으로 120px만 남기고
      var minTop  = 0;
      var maxTop  = window.innerHeight - 44; // 헤더 높이만큼 항상 보임
      nx = Math.max(minLeft, Math.min(maxLeft, nx));
      ny = Math.max(minTop,  Math.min(maxTop,  ny));
      win.style.left = nx+'px';
      win.style.top  = ny+'px';
    }
    if(resizing){
      var nw = Math.max(360, rw + e.clientX - rox);
      var nh = Math.max(240, rh + e.clientY - roy);
      win.style.width  = nw+'px';
      win.style.height = nh+'px';
    }
  });

  document.addEventListener('mouseup', function(){
    if(dragging){
      // 위치 저장
      try{
        localStorage.setItem('sv_pos', JSON.stringify({
          left:win.style.left, top:win.style.top,
          w:win.style.width,   h:win.style.height
        }));
      }catch(e){}
    }
    dragging = false;
    resizing = false;
    document.body.style.userSelect = '';
  });

  // 터치 드래그
  handle.addEventListener('touchstart', function(e){
    if(e.target.closest('a,button') || svState.maximized) return;
    var t = e.touches[0];
    dragging = true;
    var r = win.getBoundingClientRect();
    win.style.left = r.left+'px'; win.style.top = r.top+'px'; win.style.transform='none';
    ox=t.clientX; oy=t.clientY; wx=r.left; wy=r.top;
    e.preventDefault();
  },{passive:false});

  document.addEventListener('touchmove', function(e){
    if(!dragging) return;
    var t = e.touches[0];
    var nx = wx + t.clientX - ox;
    var ny = wy + t.clientY - oy;
    var winW = win.offsetWidth || 800;
    nx = Math.max(-(winW-120), Math.min(window.innerWidth-120, nx));
    ny = Math.max(0, Math.min(window.innerHeight-44, ny));
    win.style.left = nx+'px';
    win.style.top  = ny+'px';
  },{passive:true});

  document.addEventListener('touchend', function(){
    dragging = false;
    try{
      localStorage.setItem('sv_pos', JSON.stringify({
        left:win.style.left, top:win.style.top,
        w:win.style.width,   h:win.style.height
      }));
    }catch(e){}
  });
})();

// 로딩 바 애니메이션
function svStartLoading(){
  var bar = document.getElementById('svLoadingBar');
  if(!bar) return;
  bar.style.width='0%';
  bar.style.transition='none';
  setTimeout(function(){
    bar.style.transition='width 1.5s ease';
    bar.style.width='75%';
  },50);
}
function svDoneLoading(){
  var bar = document.getElementById('svLoadingBar');
  if(!bar) return;
  bar.style.transition='width .2s';
  bar.style.width='100%';
  setTimeout(function(){ bar.style.width='0%'; bar.style.transition='none'; },400);
}
// iframe load 감지
document.addEventListener('DOMContentLoaded', function(){
  var frame = document.getElementById('sheetViewFrame');
  if(frame){
    frame.addEventListener('load', function(){
      svDoneLoading();
    });
  }
});

// ══════════════════════════════════════
// 피드백 & 버그 리포트
// ══════════════════════════════════════

// n8n webhook URL (설정에서 변경 가능)
