// FinCRM - Google Apps Script (API + Sync 완전 버전)
// Google Sheets에서 직접 실행

const SHEET_CLIENT = '고객';
const SHEET_MEMO   = '메모';
let spreadsheet = null;

// ═══════════════════════════════════════════════════════════════════════════
// 웹 앱 진입점
// ═══════════════════════════════════════════════════════════════════════════

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || '';
    let data = {};
    
    if (e && e.parameter && e.parameter.data) {
      try {
        data = JSON.parse(decodeURIComponent(e.parameter.data));
      } catch(parseErr) {
        return respond({error: 'GET 데이터 파싱 오류'});
      }
    }
    
    return respond(route(action, data));
  } catch(err) {
    return respond({error: 'doGet 오류: ' + err.toString()});
  }
}

function doPost(e) {
  try {
    let body = {};
    let action = '';
    
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
        action = body.action || '';
      } catch(parseErr) {
        return respond({error: 'POST 데이터 파싱 오류'});
      }
    }
    
    return respond(route(action, body));
  } catch(err) {
    return respond({error: 'doPost 오류: ' + err.toString()});
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 라우팅
// ═══════════════════════════════════════════════════════════════════════════

function route(action, data) {
  try {
    switch (action) {
      case 'initSheets':     return initSheets();
      case 'getClients':     return getClients();
      case 'addClient':      return addClient(data);
      case 'updateClient':   return updateClient(data);
      case 'deleteClient':   return deleteClient(data);
      case 'getMemos':       return getMemos(data.name);
      case 'addMemo':        return addMemo(data);
      case 'getSchedules':   return getSchedules();
      case 'addSchedule':    return addSchedule(data);
      case 'deleteSchedule': return deleteSchedule(data);
      case 'health':         return {ok: true, timestamp: new Date().toISOString()};
      default:               return {error: 'Unknown action: ' + action};
    }
  } catch(err) {
    return {error: err.toString()};
  }
}

function respond(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ═══════════════════════════════════════════════════════════════════════════
// 시트 초기화 및 유틸
// ═══════════════════════════════════════════════════════════════════════════

function ss() { 
  if (!spreadsheet) {
    spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  }
  return spreadsheet;
}

function initSheets() {
  try {
    // 고객 시트
    let cs = ss().getSheetByName(SHEET_CLIENT);
    if (!cs) {
      cs = ss().insertSheet(SHEET_CLIENT);
      cs.appendRow([
        'No', '고객명', '비즈니스', '연락처', '이메일', 
        '플랜구분', '가입상품', '메모', '다음연락일', 
        '에이전트리퍼', '상세페이지링크'
      ]);
      cs.getRange(1,1,1,11).setFontWeight('bold').setBackground('#1a56db').setFontColor('#ffffff');
      cs.setFrozenRows(1);
    }
    
    // 메모 시트
    let ms = ss().getSheetByName(SHEET_MEMO);
    if (!ms) {
      ms = ss().insertSheet(SHEET_MEMO);
      ms.appendRow(['ID', '고객명', '유형', '내용', '날짜']);
      ms.getRange(1,1,1,5).setFontWeight('bold').setBackground('#059669').setFontColor('#ffffff');
      ms.setFrozenRows(1);
    }
    
    // 일정 시트
    let ss_sheet = ss().getSheetByName('일정');
    if (!ss_sheet) {
      ss_sheet = ss().insertSheet('일정');
      ss_sheet.appendRow(['ID', '고객명', '예정일자', '연락유형', '메모', '상태']);
      ss_sheet.getRange(1,1,1,6).setFontWeight('bold').setBackground('#7c3aed').setFontColor('#ffffff');
      ss_sheet.setFrozenRows(1);
    }

    return {ok: true, message: '시트 초기화 완료'};
  } catch(err) {
    return {error: 'initSheets 오류: ' + err.toString()};
  }
}

function validateClientData(d) {
  const errors = [];
  
  if (!d.name || String(d.name).trim() === '') {
    errors.push('고객명은 필수입니다');
  }
  
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(d.email))) {
    errors.push('유효한 이메일 형식이 아닙니다');
  }
  
  if (d.phone && !/^[\d\-\+\(\)\s]+$/.test(String(d.phone))) {
    errors.push('유효한 전화번호 형식이 아닙니다');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

function formatLADate(date) {
  if (!date || date === '') return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return d.toISOString().split('T')[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// 고객 CRUD
// ═══════════════════════════════════════════════════════════════════════════

function getClients() {
  try {
    const sheet = ss().getSheetByName(SHEET_CLIENT);
    if (!sheet) return {error: '고객 시트 없음', clients: []};
    
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return {clients: []};
    
    const clients = rows.slice(1).map((r, i) => ({
      rowIdx: i + 2,
      no: String(r[0] || ''),
      name: String(r[1] || '').trim(),
      biz: String(r[2] || ''),
      phone: String(r[3] || ''),
      email: String(r[4] || ''),
      plan: String(r[5] || ''),
      prod: String(r[6] || ''),
      memo: String(r[7] || ''),
      next: formatLADate(r[8]),
      ref: String(r[9] || 'FALSE'),
      durl: String(r[10] || ''),
    })).filter(c => c.name !== '');
    
    return {ok: true, clients};
  } catch(err) {
    console.error('getClients:', err);
    return {error: '고객 조회 실패', clients: []};
  }
}

function addClient(d) {
  try {
    const validation = validateClientData(d);
    if (!validation.valid) {
      return {error: '데이터 검증 실패', details: validation.errors};
    }

    const sheet = ss().getSheetByName(SHEET_CLIENT);
    if (!sheet) return {error: '고객 시트 없음'};
    
    const no = sheet.getLastRow();
    const row = [
      no,
      String(d.name || '').trim(),
      String(d.biz || ''),
      String(d.phone || ''),
      String(d.email || ''),
      String(d.plan || ''),
      String(d.prod || ''),
      String(d.memo || ''),
      d.next || '',
      String(d.ref || 'FALSE'),
      String(d.durl || '')
    ];
    
    sheet.appendRow(row);
    return {ok: true, message: '고객이 추가되었습니다', data: {no, name: d.name}};
  } catch(err) {
    return {error: 'addClient 오류: ' + err.toString()};
  }
}

function updateClient(d) {
  try {
    if (!d.rowIdx || !d.name) {
      return {error: 'rowIdx와 name이 필수입니다'};
    }

    const sheet = ss().getSheetByName(SHEET_CLIENT);
    if (!sheet) return {error: '고객 시트 없음'};
    
    const row = [
      d.no || '',
      String(d.name).trim(),
      String(d.biz || ''),
      String(d.phone || ''),
      String(d.email || ''),
      String(d.plan || ''),
      String(d.prod || ''),
      String(d.memo || ''),
      d.next || '',
      String(d.ref || 'FALSE'),
      String(d.durl || '')
    ];
    
    sheet.getRange(d.rowIdx, 1, 1, 11).setValues([row]);
    return {ok: true, message: '고객 정보가 수정되었습니다'};
  } catch(err) {
    return {error: 'updateClient 오류: ' + err.toString()};
  }
}

function deleteClient(d) {
  try {
    if (!d.rowIdx) {
      // 이름으로 찾기
      const sheet = ss().getSheetByName(SHEET_CLIENT);
      if (!sheet) return {error: '고객 시트 없음'};
      
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]).trim() === String(d.name).trim()) {
          sheet.deleteRow(i + 1);
          return {ok: true, message: '고객이 삭제되었습니다'};
        }
      }
      return {error: '고객을 찾을 수 없습니다'};
    }
    
    const sheet = ss().getSheetByName(SHEET_CLIENT);
    sheet.deleteRow(d.rowIdx);
    return {ok: true, message: '고객이 삭제되었습니다'};
  } catch(err) {
    return {error: 'deleteClient 오류: ' + err.toString()};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 메모 관리
// ═══════════════════════════════════════════════════════════════════════════

function getMemos(clientName) {
  try {
    const sheet = ss().getSheetByName(SHEET_MEMO);
    if (!sheet) return {memos: []};
    
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return {memos: []};
    
    const memos = rows.slice(1)
      .filter(r => String(r[1]).trim() === String(clientName).trim())
      .map((r, i) => ({
        id: i + 1,
        name: String(r[1] || ''),
        type: String(r[2] || ''),
        content: String(r[3] || ''),
        date: formatLADate(r[4])
      }));
    
    return {ok: true, memos};
  } catch(err) {
    return {error: 'getMemos 오류: ' + err.toString(), memos: []};
  }
}

function addMemo(d) {
  try {
    if (!d.name || !d.content) {
      return {error: '고객명과 내용은 필수입니다'};
    }

    const sheet = ss().getSheetByName(SHEET_MEMO);
    if (!sheet) return {error: '메모 시트 없음'};
    
    const id = sheet.getLastRow();
    const row = [
      id,
      String(d.name).trim(),
      String(d.type || '일반'),
      String(d.content),
      new Date().toISOString().split('T')[0]
    ];
    
    sheet.appendRow(row);
    return {ok: true, message: '메모가 추가되었습니다'};
  } catch(err) {
    return {error: 'addMemo 오류: ' + err.toString()};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 일정 관리
// ═══════════════════════════════════════════════════════════════════════════

function getSchedules() {
  try {
    const sheet = ss().getSheetByName('일정');
    if (!sheet) return {schedules: []};
    
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return {schedules: []};
    
    const schedules = rows.slice(1).map((r, i) => ({
      rowIdx: i + 2,
      id: String(r[0] || ''),
      name: String(r[1] || ''),
      date: formatLADate(r[2]),
      type: String(r[3] || ''),
      memo: String(r[4] || ''),
      status: String(r[5] || '예정')
    })).filter(s => s.name !== '');
    
    return {ok: true, schedules};
  } catch(err) {
    return {error: 'getSchedules 오류: ' + err.toString(), schedules: []};
  }
}

function addSchedule(d) {
  try {
    if (!d.name || !d.date) {
      return {error: '고객명과 일자는 필수입니다'};
    }

    const sheet = ss().getSheetByName('일정');
    if (!sheet) return {error: '일정 시트 없음'};
    
    const id = sheet.getLastRow();
    const row = [
      id,
      String(d.name).trim(),
      d.date,
      String(d.type || '정기 검토'),
      String(d.memo || ''),
      '예정'
    ];
    
    sheet.appendRow(row);
    return {ok: true, message: '일정이 추가되었습니다'};
  } catch(err) {
    return {error: 'addSchedule 오류: ' + err.toString()};
  }
}

function deleteSchedule(d) {
  try {
    if (!d.rowIdx) {
      return {error: 'rowIdx가 필수입니다'};
    }

    const sheet = ss().getSheetByName('일정');
    if (!sheet) return {error: '일정 시트 없음'};
    
    sheet.deleteRow(d.rowIdx);
    return {ok: true, message: '일정이 삭제되었습니다'};
  } catch(err) {
    return {error: 'deleteSchedule 오류: ' + err.toString()};
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Google Sheets 메뉴 (선택사항)
// ═══════════════════════════════════════════════════════════════════════════

function onOpen() {
  const menu = SpreadsheetApp.getUi().createMenu('FinCRM');
  menu.addItem('웹앱으로 열기', 'openWebApp');
  menu.addItem('스프레드시트 초기화', 'initSheetsWrapper');
  menu.addToUi();
}

function openWebApp() {
  const url = ScriptApp.getService().getUrl();
  SpreadsheetApp.getUi().showModelessDialog(
    HtmlService.createHtmlOutput('<iframe src="' + url + '" style="width:100%;height:100%;border:none"></iframe>'),
    'FinCRM'
  );
}

function initSheetsWrapper() {
  const result = initSheets();
  if (result.ok) {
    SpreadsheetApp.getUi().alert('✅ 스프레드시트 초기화 완료');
  } else {
    SpreadsheetApp.getUi().alert('❌ ' + result.error);
  }
}
