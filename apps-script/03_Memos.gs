function getMemos(clientName) {
  const sheet = ss().getSheetByName(SHEET_MEMO);
  if (!sheet) return {memos: []};
  const rows  = sheet.getDataRange().getValues();
  const memos = rows.slice(1)
    .filter(r => !clientName || r[1] === clientName)
    .map(r => ({
      id   : String(r[0] || ''),
      name : String(r[1] || ''),
      type : String(r[2] || ''),
      text : String(r[3] || ''),
      date : r[4] ? Utilities.formatDate(new Date(r[4]), 'America/Los_Angeles', 'yyyy-MM-dd') : '',
    }));
  return {memos};
}

function addMemo(d) {
  const sheet = ss().getSheetByName(SHEET_MEMO);
  const id    = new Date().getTime();
  sheet.appendRow([id, d.name||'', d.type||'', d.text||'', new Date()]);
  return {ok: true, id};
}
