// FinCRM - Google Apps Script (수정 버전)

const SHEET_CLIENT = '고객';
const SHEET_MEMO   = '메모';

function doGet(e) {
  // github.io에서 데이터 요청(API 호출)이 들어왔을 때 데이터를 JSON으로 반환합니다.
  if (!e || !e.parameter || !e.parameter.action) {
    return respond({ error: 'No action specified' });
  }
  
  const action = e.parameter.action || '';
  const data   = e.parameter.data ? JSON.parse(decodeURIComponent(e.parameter.data)) : {};
  return respond(route(action, data));
}

function doPost(e) {
  const body   = JSON.parse(e.postData.contents || '{}');
  const action = body.action || '';
  return respond(route(action, body));
}

function route(action, data) {
  try {
    switch (action) {
      case 'initSheets':   return initSheets();
      case 'getClients':   return getClients();
      case 'addClient':    return addClient(data);
      case 'updateClient': return updateClient(data);
      case 'deleteClient': return deleteClient(data);
      case 'getMemos':     return getMemos(data.name);
      case 'addMemo':      return addMemo(data);
      case 'health':       return {ok: true};
      default:             return {error: 'Unknown: ' + action};
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

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function initSheets() {
  let cs = ss().getSheetByName(SHEET_CLIENT);
  if (!cs) {
    cs = ss().insertSheet(SHEET_CLIENT);
    cs.appendRow(['No','고객명','비즈니스','연락처','이메일','플랜구분','가입상품','메모','다음연락일','에이전트리퍼','상세페이지링크']);
    cs.getRange(1,1,1,11).setFontWeight('bold').setBackground('#1a56db').setFontColor('#ffffff');
    cs.setFrozenRows(1);
  }
  let ms = ss().getSheetByName(SHEET_MEMO);
  if (!ms) {
    ms = ss().insertSheet(SHEET_MEMO);
    ms.appendRow(['ID','고객명','유형','내용','날짜']);
    ms.getRange(1,1,1,5).setFontWeight('bold').setBackground('#059669').setFontColor('#ffffff');
    ms.setFrozenRows(1);
  }
  return {ok: true};
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

function getClients() {
  try {
    const sheet = ss().getSheetByName(SHEET_CLIENT);
    if (!sheet) return {error: '고객 시트 없음', clients: []};
    
    const rows = sheet.getDataRange().getValues();
    if (rows.length <= 1) return {clients: []};
    
    const clients = rows.slice(1).map((r, i) => ({
      rowIdx : i + 2,
      no     : String(r[0] || ''),
      name   : String(r[1] || '').trim(),
      biz    : String(r[2] || ''),
      phone  : String(r[3] || ''),
      email  : String(r[4] || ''),
      plan   : String(r[5] || ''),
      prod   : String(r[6] || ''),
      memo   : String(r[7] || ''),
      next   : formatLADate(r[8]),
      ref    : String(r[9] || 'FALSE'),
      durl   : String(r[10] || ''),
    })).filter(c => c.name !== '');
    
    return {clients};
  } catch(err) {
    console.error('getClients error:', err);
    return {error: '고객 데이터 조회 실패', clients: []};
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
    return {ok: true, rowIdx: sheet.getLastRow(), no};
  } catch(err) {
    console.error('addClient error:', err);
    return {error: '고객 추가 실패: ' + err.toString()};
  }
}

function updateClient(d) {
  try {
    const validation = validateClientData(d);
    if (!validation.valid) {
      return {error: '데이터 검증 실패', details: validation.errors};
    }

    const sheet = ss().getSheetByName(SHEET_CLIENT);
    if (!sheet) return {error: '고객 시트 없음'};
    if (!d.rowIdx) return {error: 'rowIdx 필요'};
    
    const rowIdx = Number(d.rowIdx);
    
    if (rowIdx < 2) {
      return {error: '헤더 행은 수정할 수 없습니다'};
    }
    
    const row = [
      d.no || '', 
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
    
    sheet.getRange(rowIdx, 1, 1, row.length).setValues([row]);
    return {ok: true};
  } catch(err) {
    console.error('updateClient error:', err);
    return {error: '고객 정보 수정 실패: ' + err.toString()};
  }
}

function deleteClient(d) {
  try {
    const sheet = ss().getSheetByName(SHEET_CLIENT);
    if (!sheet) return {error: '고객 시트 없음'};
    if (!d.rowIdx) return {error: 'rowIdx 필요'};
    
    const rowIdx = Number(d.rowIdx);
    
    if (rowIdx < 2) {
      return {error: '헤더 행은 삭제할 수 없습니다'};
    }
    
    if (rowIdx > sheet.getLastRow()) {
      return {error: '존재하지 않는 행입니다'};
    }
    
    sheet.deleteRow(rowIdx);
    return {ok: true};
  } catch(err) {
    console.error('deleteClient error:', err);
    return {error: '고객 삭제 실패: ' + err.toString()};
  }
}

function getMemos(clientName) {
  try {
    const sheet = ss().getSheetByName(SHEET_MEMO);
    if (!sheet) return {memos: []};
    
    const rows = sheet.getDataRange().getValues();
    
    const memos = rows.slice(1)
      .filter(r => {
        if (!clientName) return true;
        return String(r[1]).trim() === String(clientName).trim();
      })
      .map(r => ({
        id   : String(r[0] || ''),
        name : String(r[1] || '').trim(),
        type : String(r[2] || ''),
        text : String(r[3] || ''),
        date : formatLADate(r[4]),
      }))
      .filter(m => m.name !== '')
      .sort((a, b) => {
        const dateA = new Date(a.date || '0000-01-01');
        const dateB = new Date(b.date || '0000-01-01');
        return dateB - dateA;
      });
    
    return {memos};
  } catch(err) {
    console.error('getMemos error:', err);
    return {error: '메모 조회 실패', memos: []};
  }
}

function addMemo(d) {
  try {
    const sheet = ss().getSheetByName(SHEET_MEMO);
    if (!sheet) return {error: '메모 시트 없음'};
    
    if (!d.name || String(d.name).trim() === '') {
      return {error: '고객명은 필수입니다'};
    }
    if (!d.text || String(d.text).trim() === '') {
      return {error: '메모 내용은 필수입니다'};
    }
    
    const id = new Date().getTime();
    const now = new Date();
    
    sheet.appendRow([
      id, 
      String(d.name).trim(), 
      String(d.type || ''), 
      String(d.text).trim(), 
      now
    ]);
    
    return {ok: true, id};
  } catch(err) {
    console.error('addMemo error:', err);
    return {error: '메모 추가 실패: ' + err.toString()};
  }
}

function formatLADate(dateValue) {
  if (!dateValue || dateValue === '') return '';
  try {
    return Utilities.formatDate(new Date(dateValue), 'America/Los_Angeles', 'yyyy-MM-dd');
  } catch(err) {
    return '';
  }
}
