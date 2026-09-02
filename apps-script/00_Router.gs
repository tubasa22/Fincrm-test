// FinCRM - Google Apps Script (CORS 헤더 추가 버전)

const SHEET_CLIENT = '고객';
const SHEET_MEMO   = '메모';

function doGet(e) {
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
      default:             return {error: 'Unknown: ' + action};
    }
  } catch(err) {
    return {error: err.toString()};
  }
}

// CORS 헤더 포함 응답
function respond(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

