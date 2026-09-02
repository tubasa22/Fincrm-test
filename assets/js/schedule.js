function getManualSchedules(){
  try{ return JSON.parse(localStorage.getItem('fcrm_schedules')||'[]'); }catch(e){ return []; }
}
function saveManualSchedules(list){
  localStorage.setItem('fcrm_schedules', JSON.stringify(list));
}

function openAddSchedule(dateStr){
  // 날짜 세팅
  document.getElementById('ms_date').value = dateStr;
  document.getElementById('ms_time').value = '';
  document.getElementById('ms_type').value = '상담';
  document.getElementById('ms_title').value = '';
  document.getElementById('ms_target').value = '';
  document.getElementById('ms_note').value = '';
  document.getElementById('msModalTitle').textContent = '📌 일정 추가 — '+dateStr;
  document.getElementById('ms_id').value = '';
  document.getElementById('msDeleteBtn').style.display = 'none';
  document.getElementById('msModal').classList.add('on');
  setTimeout(()=>document.getElementById('ms_title').focus(), 100);
}

function viewManualSchedule(id){
  const list = getManualSchedules();
  const s = list.find(x=>x.id===id);
  if(!s) return;
  document.getElementById('ms_date').value = s.date;
  document.getElementById('ms_time').value = s.time||'';
  document.getElementById('ms_type').value = s.type||'상담';
  document.getElementById('ms_title').value = s.title||'';
  document.getElementById('ms_target').value = s.target||'';
  document.getElementById('ms_note').value = s.note||'';
  document.getElementById('msModalTitle').textContent = '📌 일정 상세 — '+s.date;
  document.getElementById('ms_id').value = id;
  document.getElementById('msDeleteBtn').style.display = 'inline-flex';
  document.getElementById('msModal').classList.add('on');
}

function saveManualSchedule(){
  const title = document.getElementById('ms_title').value.trim();
  if(!title){ toast('❌ 일정 제목을 입력하세요'); return; }
  const date = document.getElementById('ms_date').value;
  if(!date){ toast('❌ 날짜를 선택하세요'); return; }
  const id = document.getElementById('ms_id').value || 'ms_'+Date.now();
  const s = {
    id,
    date,
    time:    document.getElementById('ms_time').value,
    type:    document.getElementById('ms_type').value,
    title,
    target:  document.getElementById('ms_target').value.trim(),
    note:    document.getElementById('ms_note').value.trim(),
    created: new Date().toLocaleString('ko-KR')
  };
  const list = getManualSchedules().filter(x=>x.id!==id);
  list.push(s);
  list.sort((a,b)=>a.date.localeCompare(b.date));
  saveManualSchedules(list);
  document.getElementById('msModal').classList.remove('on');
  renderCalendar();
  toast('✅ 일정이 저장되었습니다');
}

function deleteManualSchedule(){
  const id = document.getElementById('ms_id').value;
  if(!id) return;
  if(!confirm('이 일정을 삭제할까요?')) return;
  const list = getManualSchedules().filter(x=>x.id!==id);
  saveManualSchedules(list);
  document.getElementById('msModal').classList.remove('on');
  renderCalendar();
  toast('🗑 일정이 삭제되었습니다');
}

