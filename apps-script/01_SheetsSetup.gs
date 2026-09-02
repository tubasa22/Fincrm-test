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

