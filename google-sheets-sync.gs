/**
 * ═══════════════════════════════════════════════════════════════
 * Google Apps Script — Kết nối trực tiếp Google Sheets ↔ Supabase
 * ═══════════════════════════════════════════════════════════════
 *
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet muốn đồng bộ
 * 2. Vào menu: Phần mở rộng → Apps Script
 * 3. Xóa code mặc định, dán toàn bộ nội dung file này vào
 * 4. Cập nhật 2 biến bên dưới: SUPABASE_URL và SUPABASE_KEY
 *    (Lấy từ Supabase Dashboard → Settings → API)
 * 5. Lưu (Ctrl+S)
 * 6. Chạy hàm "setupAutoSync" một lần để cài trigger tự động
 * 7. Cấp quyền khi được hỏi
 *
 * Script sẽ tự động đồng bộ dữ liệu mỗi 5 phút.
 * ═══════════════════════════════════════════════════════════════
 */

// ─── CẤU HÌNH (BẮT BUỘC SỬA) ─────────────────────────────────
// Lấy từ Supabase Dashboard → Settings → API
var SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';   // ← Sửa lại
var SUPABASE_KEY = 'YOUR_ANON_KEY_HERE';                     // ← Sửa lại (anon/public key)

// ─── TÊN BẢNG SUPABASE ────────────────────────────────────────
var TABLE_PRODUCTS = 'products';
var TABLE_EXPORTS  = 'export_confirmations';

// ─── TÊN SHEET TRONG GOOGLE SHEETS ────────────────────────────
var SHEET_PRODUCTS = 'Sản phẩm';
var SHEET_EXPORTS  = 'Lịch sử xuất kho';
var SHEET_LOG      = 'Nhật ký đồng bộ';

// ═══════════════════════════════════════════════════════════════
// SUPABASE REST API — Đọc dữ liệu trực tiếp
// ═══════════════════════════════════════════════════════════════

/**
 * Gọi Supabase REST API để lấy dữ liệu từ một bảng.
 * @param {string} tableName  Tên bảng Supabase (VD: 'products')
 * @param {string} select     Cột cần lấy (VD: '*' = tất cả)
 * @param {string} orderBy    Cột sắp xếp (VD: 'created_at.desc')
 * @returns {Array}           Mảng dữ liệu JSON
 */
function supabaseFetch(tableName, select, orderBy) {
  var url = SUPABASE_URL + '/rest/v1/' + tableName
    + '?select=' + (select || '*')
    + '&order=' + (orderBy || 'created_at.desc');

  var response = UrlFetchApp.fetch(url, {
    method: 'get',
    muteHttpExceptions: true,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  });

  var code = response.getResponseCode();
  if (code !== 200) {
    throw new Error('Supabase HTTP ' + code + ': ' + response.getContentText().substring(0, 300));
  }

  return JSON.parse(response.getContentText());
}

// ═══════════════════════════════════════════════════════════════
// ĐỒNG BỘ CHÍNH
// ═══════════════════════════════════════════════════════════════

/**
 * Đồng bộ toàn bộ dữ liệu từ Supabase → Google Sheets.
 * Có thể chạy thủ công hoặc qua trigger tự động.
 */
function syncAll() {
  try {
    // ── 1. Lấy danh sách sản phẩm ─────────────────────────
    var products = supabaseFetch(TABLE_PRODUCTS, '*', 'created_at.desc');
    writeProductsSheet(products);

    // ── 2. Lấy lịch sử xuất kho ───────────────────────────
    var exports = supabaseFetch(TABLE_EXPORTS, '*', 'created_at.desc');
    writeExportsSheet(exports);

    // ── 3. Log ─────────────────────────────────────────────
    var msg = '✅ Đồng bộ thành công — '
      + products.length + ' sản phẩm, '
      + exports.length + ' lần xuất kho';
    logSync(msg);

  } catch (e) {
    logSync('❌ Lỗi: ' + e.message);
  }
}

/**
 * Chỉ đồng bộ sản phẩm.
 */
function syncProducts() {
  try {
    var products = supabaseFetch(TABLE_PRODUCTS, '*', 'created_at.desc');
    writeProductsSheet(products);
    logSync('✅ Đồng bộ sản phẩm: ' + products.length + ' bản ghi');
  } catch (e) {
    logSync('❌ Lỗi sản phẩm: ' + e.message);
  }
}

/**
 * Chỉ đồng bộ lịch sử xuất kho.
 */
function syncExports() {
  try {
    var exports = supabaseFetch(TABLE_EXPORTS, '*', 'created_at.desc');
    writeExportsSheet(exports);
    logSync('✅ Đồng bộ xuất kho: ' + exports.length + ' bản ghi');
  } catch (e) {
    logSync('❌ Lỗi xuất kho: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// GHI DỮ LIỆU LÊN SHEETS
// ═══════════════════════════════════════════════════════════════

/**
 * Ghi dữ liệu sản phẩm lên sheet "Sản phẩm"
 */
function writeProductsSheet(products) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_PRODUCTS);

  // Headers tiếng Việt
  var headers = [
    'Mã sản phẩm',
    'Tên sản phẩm',
    'Nhóm sản phẩm',
    'Mục đích sử dụng',
    'Giá bán',
    'Kho còn hàng',
    'Số serial',
    'Trạng thái',
    'Mô tả',
    'Ngày tạo',
    'Cập nhật lần cuối'
  ];

  // Data rows
  var rows = products.map(function(p) {
    return [
      p.product_code || '',
      p.name || '',
      p.nhom_san_pham || '',
      p.muc_dich_su_dung || '',
      formatCurrency(p.gia_ban),
      p.ton_kho || '',
      p.serial_no || '',
      formatStatus(p.status),
      p.description || '',
      formatDate(p.created_at),
      formatDate(p.updated_at)
    ];
  });

  // Clear + write
  sheet.clearContents();
  sheet.clearFormats();

  // Write header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Write data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // ── Format ───────────────────────────────────────────────
  formatHeaderRow(sheet, headers.length, '#1B2A4A');
  formatDataArea(sheet, rows.length, headers.length);

  // Conditional formatting for status
  applyStatusColors(sheet, 8, rows.length); // column 8 = Trạng thái

  // Timestamp
  writeTimestamp(sheet, rows.length + 3, 1);
}

/**
 * Ghi dữ liệu lịch sử xuất kho lên sheet "Lịch sử xuất kho"
 */
function writeExportsSheet(exports) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_EXPORTS);

  // Headers
  var headers = [
    'STT',
    'Mã sản phẩm',
    'Mã đơn hàng',
    'Người xuất',
    'Ghi chú',
    'Thời gian xuất'
  ];

  // Data rows
  var rows = exports.map(function(e, i) {
    return [
      i + 1,
      e.ma_san_pham || '',
      e.ma_don_hang || '',
      e.nguoi_xuat || '',
      e.ghi_chu || '',
      formatDate(e.created_at)
    ];
  });

  // Clear + write
  sheet.clearContents();
  sheet.clearFormats();

  // Write header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Write data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // Format
  formatHeaderRow(sheet, headers.length, '#2D6B7A');
  formatDataArea(sheet, rows.length, headers.length);

  // Timestamp
  writeTimestamp(sheet, rows.length + 3, 1);
}

// ═══════════════════════════════════════════════════════════════
// AUTO SYNC SETUP
// ═══════════════════════════════════════════════════════════════

/**
 * Cài đặt trigger tự động — chạy hàm này MỘT LẦN duy nhất.
 * Sẽ đồng bộ mỗi 5 phút tự động.
 */
function setupAutoSync() {
  // Remove existing triggers to avoid duplicates
  removeAllSyncTriggers_();

  // Create new time-based trigger: every 5 minutes
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Run initial sync immediately
  syncAll();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    '✅ Đã cài đồng bộ tự động mỗi 5 phút!\n'
    + 'Dữ liệu được lấy trực tiếp từ Supabase.',
    '🔄 Kết nối Supabase thành công',
    10
  );
}

/**
 * Cài trigger mỗi 1 phút (cho trường hợp cần real-time hơn).
 */
function setupAutoSync1Min() {
  removeAllSyncTriggers_();
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .everyMinutes(1)
    .create();
  syncAll();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    '✅ Đồng bộ mỗi 1 phút!', '🔄 Real-time Sync', 5
  );
}

/**
 * Gỡ bỏ trigger tự động.
 */
function removeAutoSync() {
  var count = removeAllSyncTriggers_();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Đã gỡ ' + count + ' trigger tự động.',
    '⏹ Đã tắt', 5
  );
}

function removeAllSyncTriggers_() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncAll') {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });
  return count;
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM MENU
// ═══════════════════════════════════════════════════════════════

/**
 * Thêm menu tùy chỉnh khi mở Google Sheet.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Supabase Sync')
    .addItem('📥 Đồng bộ tất cả ngay', 'syncAll')
    .addItem('📦 Chỉ đồng bộ sản phẩm', 'syncProducts')
    .addItem('📤 Chỉ đồng bộ lịch sử xuất', 'syncExports')
    .addSeparator()
    .addItem('⏰ Bật tự động (mỗi 5 phút)', 'setupAutoSync')
    .addItem('⚡ Bật tự động (mỗi 1 phút)', 'setupAutoSync1Min')
    .addItem('⏹ Tắt tự động', 'removeAutoSync')
    .addSeparator()
    .addItem('📋 Xem nhật ký', 'showLog')
    .addItem('🔍 Kiểm tra kết nối', 'testConnection')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════════
// KIỂM TRA KẾT NỐI
// ═══════════════════════════════════════════════════════════════

/**
 * Kiểm tra kết nối đến Supabase.
 */
function testConnection() {
  try {
    var products = supabaseFetch(TABLE_PRODUCTS, 'id', 'id.asc');
    var exports  = supabaseFetch(TABLE_EXPORTS,  'id', 'id.asc');

    SpreadsheetApp.getUi().alert(
      '✅ Kết nối Supabase thành công!\n\n'
      + '📦 Bảng "' + TABLE_PRODUCTS + '": ' + products.length + ' bản ghi\n'
      + '📤 Bảng "' + TABLE_EXPORTS  + '": ' + exports.length  + ' bản ghi\n\n'
      + '🔗 URL: ' + SUPABASE_URL
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert(
      '❌ Không thể kết nối Supabase!\n\n'
      + 'Lỗi: ' + e.message + '\n\n'
      + 'Kiểm tra lại:\n'
      + '• SUPABASE_URL có đúng không?\n'
      + '• SUPABASE_KEY (anon key) có đúng không?\n'
      + '• Bảng "' + TABLE_PRODUCTS + '" có tồn tại không?'
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function formatHeaderRow(sheet, numCols, bgColor) {
  var headerRange = sheet.getRange(1, 1, 1, numCols);
  headerRange.setFontWeight('bold');
  headerRange.setBackground(bgColor);
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);
}

function formatDataArea(sheet, numRows, numCols) {
  if (numRows <= 0) return;

  // Alternating row colors
  for (var i = 0; i < numRows; i++) {
    var row = sheet.getRange(i + 2, 1, 1, numCols);
    if (i % 2 === 0) {
      row.setBackground('#FFFFFF');
    } else {
      row.setBackground('#F8F9FA');
    }
  }

  // Auto-resize columns
  for (var c = 1; c <= numCols; c++) {
    sheet.autoResizeColumn(c);
  }

  // Add borders
  var dataRange = sheet.getRange(1, 1, numRows + 1, numCols);
  dataRange.setBorder(true, true, true, true, true, true, '#E0E0E0', SpreadsheetApp.BorderStyle.SOLID);
}

function applyStatusColors(sheet, col, numRows) {
  if (numRows <= 0) return;

  var statusRange = sheet.getRange(2, col, numRows, 1);
  var values = statusRange.getValues();

  for (var i = 0; i < values.length; i++) {
    var cell = sheet.getRange(i + 2, col);
    var status = values[i][0];

    switch (status) {
      case 'Còn hàng':
      case 'Sẵn sàng xuất':
        cell.setBackground('#E8F5E9').setFontColor('#2E7D32');
        break;
      case 'Đã xuất':
        cell.setBackground('#E3F2FD').setFontColor('#1565C0');
        break;
      case 'Đã giao':
        cell.setBackground('#E0F2F1').setFontColor('#00695C');
        break;
      case 'Hết hàng':
      case 'Đã hủy':
        cell.setBackground('#FFEBEE').setFontColor('#C62828');
        break;
      case 'Chờ xử lý':
      case 'Đang xử lý':
        cell.setBackground('#FFF8E1').setFontColor('#F57F17');
        break;
    }

    cell.setFontWeight('bold');
    cell.setHorizontalAlignment('center');
  }
}

function writeTimestamp(sheet, row, col) {
  sheet.getRange(row, col).setValue(
    '⏱ Cập nhật lần cuối: ' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss')
  );
  sheet.getRange(row, col).setFontColor('#999999').setFontStyle('italic').setFontSize(9);
}

/**
 * Chuyển đổi trạng thái sang tiếng Việt.
 */
function formatStatus(status) {
  var map = {
    'in_stock':    'Còn hàng',
    'exported':    'Đã xuất',
    'delivered':   'Đã giao',
    'returned':    'Đã trả lại',
    'pending':     'Chờ xử lý',
    'cancelled':   'Đã hủy',
    'processing':  'Đang xử lý',
    'available':   'Sẵn sàng xuất',
    'unavailable': 'Hết hàng'
  };
  return map[status] || status || '';
}

/**
 * Format giá tiền VND.
 */
function formatCurrency(value) {
  if (!value && value !== 0) return '';
  var num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('vi-VN') + ' ₫';
}

/**
 * Format ISO date → "dd/MM/yyyy HH:mm"
 */
function formatDate(isoString) {
  if (!isoString) return '';
  try {
    var d = new Date(isoString);
    return Utilities.formatDate(d, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return isoString;
  }
}

/**
 * Ghi log vào sheet "Nhật ký đồng bộ"
 */
function logSync(message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_LOG);
    sheet.getRange(1, 1, 1, 2).setValues([['Thời gian', 'Trạng thái']]);
    var hdr = sheet.getRange(1, 1, 1, 2);
    hdr.setFontWeight('bold').setBackground('#C5A55A').setFontColor('#1B2A4A');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 180);
    sheet.setColumnWidth(2, 500);
  }

  // Append log at row 2 (newest first)
  sheet.insertRowAfter(1);
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
  sheet.getRange(2, 1, 1, 2).setValues([[timestamp, message]]);

  // Color successful vs failed
  var logRow = sheet.getRange(2, 1, 1, 2);
  if (message.indexOf('✅') >= 0) {
    logRow.setBackground('#F1F8E9');
  } else if (message.indexOf('❌') >= 0) {
    logRow.setBackground('#FFF3E0');
  }

  // Keep only last 200 logs
  var lastRow = sheet.getLastRow();
  if (lastRow > 201) {
    sheet.deleteRows(202, lastRow - 201);
  }
}

/**
 * Hiện nhật ký trong popup.
 */
function showLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_LOG);
  if (sheet) {
    ss.setActiveSheet(sheet);
  } else {
    SpreadsheetApp.getUi().alert('Chưa có nhật ký đồng bộ nào.');
  }
}
