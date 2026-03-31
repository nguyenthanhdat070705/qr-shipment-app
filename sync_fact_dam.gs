/**
 * ═══════════════════════════════════════════════════════════════
 * Pipeline hoàn chỉnh:
 *   Excel file → THÁNG tabs → Data2Sync → Supabase fact_dam
 *
 * CÁCH DÙNG:
 *   Menu "🔄 Sync Data" → "Sync from Excel File"
 *   → Tự động sync toàn bộ lên Supabase
 *
 * CÀI ĐẶT (1 lần):
 *   1. Mở Apps Script (Extensions → Apps Script)
 *   2. Xóa code cũ, paste toàn bộ file này
 *   3. Lưu (Ctrl+S)
 *   4. Chạy "setupTriggers" để cài trigger tự động
 *   5. Cấp quyền khi được hỏi
 * ═══════════════════════════════════════════════════════════════
 */

// ─── CẤU HÌNH ──────────────────────────────────────────────────
// ID của file Excel nguồn trên Google Drive
const SOURCE_EXCEL_ID = '1iT6MIn6AN9R-LeIjjiMqx0RqUapH8twI';

// Sheet tổng hợp (nơi data từ các THÁNG được gom lại)
const TARGET_SHEET_NAME = 'Data2Sync';

// Sheet Data2Sync có 4 dòng header (rows 1-4), data bắt đầu từ row 5
const HEADER_ROWS = 4;

// Supabase
var SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzcGF6dmR5cnJrZG9zcWlnb21rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyMjA5NywiZXhwIjoyMDg5Mzk4MDk3fQ.qCT5RKZu8pCXJnxYi87HcfSgXIb5SHxsxYMHjvBNgWY';
// ───────────────────────────────────────────────────────────────


// ═══════════════════════════════════════════════════════════════
// MENU
// ═══════════════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Sync Data')
    .addItem('▶ Sync từ Excel → Supabase (Toàn bộ)', 'syncExcelToStaging')
    .addItem('▶ Chỉ push Data2Sync → Supabase', 'syncData2SyncToSupabase')
    .addSeparator()
    .addItem('🔍 Kiểm tra kết nối Supabase', 'testConnection')
    .addItem('📋 Xem nhật ký', 'showLog')
    .addSeparator()
    .addItem('⏰ Cài trigger tự động', 'setupTriggers')
    .addItem('❌ Gỡ trigger', 'removeTriggers')
    .addToUi();
}


// ═══════════════════════════════════════════════════════════════
// BƯỚC 1+2+3: Excel → THÁNG tabs → Data2Sync → Supabase
// ═══════════════════════════════════════════════════════════════
function syncExcelToStaging() {
  const stagingSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let tempFileId = null;

  try {
    logSync('▶ Bắt đầu sync: Excel → THÁNG tabs → Data2Sync → Supabase');

    // ── 1. Lấy blob từ file Excel ──────────────────────────────
    const excelFile = DriveApp.getFileById(SOURCE_EXCEL_ID);
    const blob = excelFile.getBlob();
    logSync('📥 Đọc Excel: ' + excelFile.getName());

    // ── 2. Convert Excel → Google Sheet tạm thời ───────────────
    const resource = {
      name: 'Temp_Sync_' + new Date().getTime(),
      mimeType: MimeType.GOOGLE_SHEETS
    };
    const tempFile = Drive.Files.create(resource, blob);
    tempFileId = tempFile.id;

    // ── 3. Đọc dữ liệu từ sheet tạm ───────────────────────────
    const tempSpreadsheet = SpreadsheetApp.openById(tempFileId);
    const tempSheets = tempSpreadsheet.getSheets();
    logSync('📋 Tìm thấy ' + tempSheets.length + ' tabs trong Excel');

    // ── 4. Sync từng tab vào staging spreadsheet ───────────────
    let tabsSynced = 0;
    for (let i = 0; i < tempSheets.length; i++) {
      const sourceSheet = tempSheets[i];
      const sheetName = sourceSheet.getName();
      const data = sourceSheet.getDataRange().getValues();

      // Bỏ qua sheet rỗng
      if (data.length === 0 || (data.length === 1 && data[0][0] === '')) continue;

      let stagingSheet = stagingSpreadsheet.getSheetByName(sheetName);
      if (!stagingSheet) {
        stagingSheet = stagingSpreadsheet.insertSheet(sheetName);
      }
      stagingSheet.clear();
      stagingSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
      tabsSynced++;
    }
    logSync('✅ Đã sync ' + tabsSynced + ' tabs từ Excel');

    // ── 5. Gom các THÁNG → Data2Sync ──────────────────────────
    consolidateThangSheets();

    // ── 6. Push Data2Sync → Supabase fact_dam ─────────────────
    syncData2SyncToSupabase();

    SpreadsheetApp.getActiveSpreadsheet().toast(
      '✅ Hoàn tất! Excel → Data2Sync → Supabase',
      '🔄 Sync Data', 8
    );

  } catch (error) {
    logSync('❌ Lỗi syncExcelToStaging: ' + error.message);
    SpreadsheetApp.getUi().alert('❌ Lỗi Sync', error.message, SpreadsheetApp.getUi().ButtonSet.OK);
    Logger.log(error);
  } finally {
    // Xóa file tạm
    if (tempFileId) {
      try { DriveApp.getFileById(tempFileId).setTrashed(true); } catch(e) {}
    }
  }
}


// ═══════════════════════════════════════════════════════════════
// BƯỚC 2: Gom THÁNG tabs → Data2Sync
// ═══════════════════════════════════════════════════════════════
function consolidateThangSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let targetSheet = ss.getSheetByName(TARGET_SHEET_NAME);
  if (!targetSheet) {
    targetSheet = ss.insertSheet(TARGET_SHEET_NAME);
  } else {
    targetSheet.clear();
  }

  const allSheets = ss.getSheets();
  let isFirstSheet = true;
  let allDataToAppend = [];

  for (let i = 0; i < allSheets.length; i++) {
    const sheet = allSheets[i];
    const sheetName = sheet.getName();

    if (!sheetName.includes('THÁNG')) continue;

    const data = sheet.getDataRange().getValues();
    if (data.length <= HEADER_ROWS) continue;

    if (isFirstSheet) {
      // Sheet đầu tiên: giữ nguyên cả header
      allDataToAppend = allDataToAppend.concat(data);
      isFirstSheet = false;
    } else {
      // Các sheet sau: bỏ 4 dòng header đầu
      allDataToAppend = allDataToAppend.concat(data.slice(HEADER_ROWS));
    }
  }

  // Lọc bỏ dòng trắng hoàn toàn
  allDataToAppend = allDataToAppend.filter(row => row.join('').trim() !== '');

  if (allDataToAppend.length > 0) {
    targetSheet.getRange(1, 1, allDataToAppend.length, allDataToAppend[0].length).setValues(allDataToAppend);
    logSync('✅ Gom THÁNG → Data2Sync: ' + allDataToAppend.length + ' dòng');
  } else {
    logSync('⚠️ Không có dữ liệu THÁNG để gom.');
  }
}


// ═══════════════════════════════════════════════════════════════
// BƯỚC 3: Push Data2Sync → Supabase fact_dam
// ═══════════════════════════════════════════════════════════════
function syncData2SyncToSupabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TARGET_SHEET_NAME);

  if (!sheet) {
    logSync('❌ Không tìm thấy sheet "' + TARGET_SHEET_NAME + '"');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= HEADER_ROWS) {
    logSync('⚠️ Sheet Data2Sync không có dữ liệu (lastRow=' + lastRow + ')');
    return;
  }

  const lastCol = Math.max(sheet.getLastColumn(), 47);

  // Đọc toàn bộ data (bỏ qua HEADER_ROWS dòng đầu)
  const dataStartRow = HEADER_ROWS + 1;
  const numRows = lastRow - HEADER_ROWS;
  const data = sheet.getRange(dataStartRow, 1, numRows, lastCol).getValues();

  logSync('📋 Đọc ' + numRows + ' dòng từ Data2Sync (từ row ' + dataStartRow + ')');

  // Parse rows
  const rows = [];
  let skipped = 0;
  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const stt   = String(r[0] || '').trim();
    const maDam = String(r[3] || '').trim();
    if (!stt || !maDam) { skipped++; continue; }
    rows.push(buildFactDamRow(r));
  }

  logSync('✅ Parse được ' + rows.length + ' đám hợp lệ (bỏ qua ' + skipped + ' dòng trống)');

  if (rows.length === 0) {
    logSync('⚠️ Không có dữ liệu để upload lên Supabase.');
    return;
  }

  // Upsert fact_dam
  const CHUNK = 50;
  let success = 0, errors = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK);
    const result = supabaseUpsert('fact_dam', batch, 'ma_dam');
    if (result.ok) {
      success += batch.length;
    } else {
      errors += batch.length;
      logSync('❌ Lỗi chunk ' + (Math.floor(i / CHUNK) + 1) + ': ' + result.error);
    }
  }

  // Sync dim_dam
  const dimRows = rows.map(r => ({
    ma_dam:    r.ma_dam,
    ngay:      r.ngay,
    loai:      r.loai,
    chi_nhanh: r.chi_nhanh,
    nguoi_mat: r.nguoi_mat
  }));
  supabaseUpsert('dim_dam', dimRows, 'ma_dam');

  const finalMsg = errors === 0
    ? '✅ Supabase: ' + success + '/' + rows.length + ' đám upsert thành công'
    : '⚠️ Supabase: ' + success + ' OK, ' + errors + ' lỗi';
  logSync(finalMsg);

  ss.toast(finalMsg, '🔄 Sync → Supabase', 6);
}


// ═══════════════════════════════════════════════════════════════
// MAPPING CỘT Data2Sync → fact_dam
// ═══════════════════════════════════════════════════════════════

/**
 * Map dòng dữ liệu từ sheet Data2Sync sang object fact_dam.
 *
 * Cấu trúc cột (sau 4 dòng header):
 *   A(0): STT | B(1): Ngày | C(2): Tháng | D(3): Mã đám | E(4): Loại |
 *   F(5): Chi nhánh | G(6): Người mất | H(7): ĐC tổ chức | I(8): ĐC chôn/thiêu |
 *   J(9): Giờ liệm | K(10): Ngày liệm | L(11): Giờ đi quan | M(12): Ngày đi quan |
 *   N(13): Sale | O(14): Điều phối |
 *   P(15): Thầy SL | Q(16): Thầy NCC | R(17): Thầy tên |
 *   S(18): Hòm loại | T(19): Hòm NCC/kho |
 *   U(20): Hoa | V(21): Đá khô/focmol |
 *   W(22): Kèn Tây số lễ | X(23): Kèn Tây NCC |
 *   Y(24): Quay phim gói DV | Z(25): Quay phim NCC |
 *   AA(26): Mâm cúng SL | AB(27): Mâm cúng NCC |
 *   AC(28): Di ảnh/cáo phó | AD(29): Băng rôn | AE(30): Lá triệu/bài vị |
 *   AF(31): Nhạc | AG(32): Thuê rạp/bàn ghế SL | AH(33): Thuê rạp/bàn ghế NCC |
 *   AI(34): Hũ/trổ cột | AJ(35): Teabreak |
 *   AK(36): Xe tang lễ loại | AL(37): Xe tang lễ đạo tỳ | AM(38): Xe tang lễ NCC |
 *   AN(39): Xe khách loại | AO(40): Xe khách NCC |
 *   AP(41): Xe cấp cứu | AQ(42): Xe khác |
 *   AR(43): Thuê NV trực | AS(44): Báo đơn |
 *   AT(45): Ghi chú | AU(46): Chôn/thiêu
 */
function buildFactDamRow(r) {
  return {
    stt:                        cellStr(r[0]),
    ngay:                       cellStr(r[1]),
    thang:                      cellStr(r[2]),
    ma_dam:                     cellStr(r[3]),
    loai:                       cellStr(r[4]),
    chi_nhanh:                  cellStr(r[5]),
    nguoi_mat:                  cellStr(r[6]),
    dia_chi_to_chuc:            cellStr(r[7]),
    dia_chi_chon_thieu:         cellStr(r[8]),
    gio_liem:                   cellStr(r[9]),
    ngay_liem:                  cellStr(r[10]),
    gio_di_quan:                cellStr(r[11]),
    ngay_di_quan:               cellStr(r[12]),
    sale:                       cellStr(r[13]),
    dieu_phoi:                  cellStr(r[14]),
    thay_so_luong:              cellStr(r[15]),
    thay_ncc:                   cellStr(r[16]),
    thay_ten:                   cellStr(r[17]),
    hom_loai:                   cellStr(r[18]),
    hom_ncc_hay_kho:            cellStr(r[19]),
    hoa:                        cellStr(r[20]),
    da_kho_tiem_focmol:         cellStr(r[21]),
    ken_tay_so_le:              cellStr(r[22]),
    ken_tay_ncc:                cellStr(r[23]),
    quay_phim_chup_hinh_goi_dv: cellStr(r[24]),
    quay_phim_chup_hinh_ncc:    cellStr(r[25]),
    mam_cung_so_luong:          cellStr(r[26]),
    mam_cung_ncc:               cellStr(r[27]),
    di_anh_cao_pho:             cellStr(r[28]),
    bang_ron:                   cellStr(r[29]),
    la_trieu_bai_vi:            cellStr(r[30]),
    nhac:                       cellStr(r[31]),
    thue_rap_ban_ghe_so_luong:  cellStr(r[32]),
    thue_rap_ban_ghe_ncc:       cellStr(r[33]),
    hu_tro_cot:                 cellStr(r[34]),
    teabreak:                   cellStr(r[35]),
    xe_tang_le_loai:            cellStr(r[36]),
    xe_tang_le_dao_ty:          cellStr(r[37]),
    xe_tang_le_ncc:             cellStr(r[38]),
    xe_khach_loai:              cellStr(r[39]),
    xe_khach_ncc:               cellStr(r[40]),
    xe_cap_cuu:                 cellStr(r[41]),
    xe_khac:                    cellStr(r[42]),
    thue_nv_truc:               cellStr(r[43]),
    bao_don:                    cellStr(r[44]),
    ghi_chu:                    cellStr(r[45]),
    chon_thieu:                 cellStr(r[46]),
  };
}

function cellStr(val) {
  if (val === null || val === undefined) return '';
  if (val instanceof Date && !isNaN(val)) {
    return Utilities.formatDate(val, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy');
  }
  return String(val).trim();
}


// ═══════════════════════════════════════════════════════════════
// SUPABASE REST API
// ═══════════════════════════════════════════════════════════════
function supabaseUpsert(tableName, records, onConflict) {
  if (!records || records.length === 0) return { ok: true };

  var url = SUPABASE_URL + '/rest/v1/' + tableName;
  if (onConflict) url += '?on_conflict=' + onConflict;

  try {
    var response = UrlFetchApp.fetch(url, {
      method: 'post',
      muteHttpExceptions: true,
      headers: {
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=minimal'
      },
      payload: JSON.stringify(records)
    });

    var code = response.getResponseCode();
    if (code >= 200 && code < 300) return { ok: true };
    return { ok: false, error: 'HTTP ' + code + ': ' + response.getContentText().substring(0, 300) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function supabaseFetch(tableName, select, limit) {
  var url = SUPABASE_URL + '/rest/v1/' + tableName
    + '?select=' + (select || '*')
    + '&limit=' + (limit || 1);

  var res = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Accept':        'application/json'
    }
  });

  if (res.getResponseCode() !== 200) {
    throw new Error('HTTP ' + res.getResponseCode() + ': ' + res.getContentText().substring(0, 200));
  }
  return JSON.parse(res.getContentText());
}


// ═══════════════════════════════════════════════════════════════
// KIỂM TRA KẾT NỐI
// ═══════════════════════════════════════════════════════════════
function testConnection() {
  try {
    var data = supabaseFetch('fact_dam', 'ma_dam,nguoi_mat', 5);
    SpreadsheetApp.getUi().alert(
      '✅ Kết nối Supabase thành công!\n\n' +
      '📋 fact_dam — 5 bản ghi:\n' +
      data.map(function(d) { return '  • ' + d.ma_dam + ' — ' + (d.nguoi_mat || ''); }).join('\n')
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('❌ Lỗi kết nối!\n\n' + e.message);
  }
}


// ═══════════════════════════════════════════════════════════════
// TRIGGER TỰ ĐỘNG (tùy chọn)
// ═══════════════════════════════════════════════════════════════

/**
 * Cài trigger chạy tự động mỗi ngày lúc 6h sáng.
 * Chạy hàm này 1 lần duy nhất.
 */
function setupTriggers() {
  removeTriggers();

  // Trigger hàng ngày lúc 6-7h sáng
  ScriptApp.newTrigger('syncExcelToStaging')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  // Chạy ngay lập tức
  syncExcelToStaging();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '✅ Đã cài trigger!\nMỗi sáng 6h sẽ tự động sync Excel → Supabase.',
    '⏰ Auto-Sync đã bật', 10
  );
}

function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncExcelToStaging') {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  if (count > 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast('Đã gỡ ' + count + ' trigger.', '⏹ Tắt Auto-Sync', 5);
  }
}


// ═══════════════════════════════════════════════════════════════
// LOG
// ═══════════════════════════════════════════════════════════════
var LOG_SHEET = '📋 Nhật ký sync';

function logSync(msg) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName(LOG_SHEET);
    if (!log) {
      log = ss.insertSheet(LOG_SHEET);
      log.getRange(1, 1, 1, 2).setValues([['Thời gian', 'Trạng thái']]);
      log.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1B2A4A').setFontColor('#FFFFFF');
      log.setFrozenRows(1);
      log.setColumnWidth(1, 180);
      log.setColumnWidth(2, 700);
    }
    var ts = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
    log.insertRowAfter(1);
    log.getRange(2, 1, 1, 2).setValues([[ts, msg]]);
    var row = log.getRange(2, 1, 1, 2);
    if (msg.indexOf('✅') >= 0)      row.setBackground('#E8F5E9');
    else if (msg.indexOf('❌') >= 0) row.setBackground('#FFEBEE');
    else if (msg.indexOf('⚠️') >= 0) row.setBackground('#FFF8E1');
    if (log.getLastRow() > 501) log.deleteRows(502, log.getLastRow() - 501);
  } catch(e) {}
}

function showLog() {
  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LOG_SHEET);
  if (log) {
    SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(log);
  } else {
    SpreadsheetApp.getUi().alert('Chưa có nhật ký. Chạy sync ít nhất 1 lần.');
  }
}
