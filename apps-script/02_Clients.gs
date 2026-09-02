function getClients() {
  const sheet = ss().getSheetByName(SHEET_CLIENT);
  if (!sheet) return {error: '고객 시트 없음'};
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return {clients: []};
  const clients = rows.slice(1).map((r, i) => ({
    rowIdx : i + 2,
    no     : String(r[0] || ''),
    name   : String(r[1] || ''),
    biz    : String(r[2] || ''),
    phone  : String(r[3] || ''),
    email  : String(r[4] || ''),
    plan   : String(r[5] || ''),
    prod   : String(r[6] || ''),
    memo   : String(r[7] || ''),
    next   : r[8] ? Utilities.formatDate(new Date(r[8]), 'America/Los_Angeles', 'yyyy-MM-dd') : '',
    ref    : String(r[9] || 'FALSE'),
    durl   : String(r[10] || ''),
  })).filter(c => c.name.trim());
  return {clients};
}

function addClient(d) {
  const sheet = ss().getSheetByName(SHEET_CLIENT);
  const no    = sheet.getLastRow();
  const row   = [no, d.name||'', d.biz||'', d.phone||'', d.email||'',
                 d.plan||'', d.prod||'', d.memo||'', d.next||'',
                 d.ref||'FALSE', d.durl||''];
  sheet.appendRow(row);
  return {ok: true, rowIdx: sheet.getLastRow(), no};
}

function updateClient(d) {
  const sheet = ss().getSheetByName(SHEET_CLIENT);
  if (!d.rowIdx) return {error: 'rowIdx 필요'};
  const row = [d.no||'', d.name||'', d.biz||'', d.phone||'', d.email||'',
               d.plan||'', d.prod||'', d.memo||'', d.next||'',
               d.ref||'FALSE', d.durl||''];
  sheet.getRange(d.rowIdx, 1, 1, row.length).setValues([row]);
  return {ok: true};
}

function deleteClient(d) {
  const sheet = ss().getSheetByName(SHEET_CLIENT);
  if (!d.rowIdx) return {error: 'rowIdx 필요'};
  sheet.deleteRow(Number(d.rowIdx));
  return {ok: true};
}

