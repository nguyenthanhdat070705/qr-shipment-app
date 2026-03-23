/**
 * ═══════════════════════════════════════════════════════════════
 * Google Apps Script — Auto Sync Supabase → Google Sheets
 * ═══════════════════════════════════════════════════════════════
 *
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet muốn đồng bộ
 * 2. Vào menu: Phần mở rộng → Apps Script
 * 3. Xóa code mặc định, dán toàn bộ nội dung file này vào
 * 4. Cập nhật 2 biến bên dưới: API_URL và API_KEY
 * 5. Lưu (Ctrl+S)
 * 6. Chạy hàm "setupAutoSync" một lần để cài trigger tự động
 * 7. Cấp quyền khi được hỏi
 *
 * Script sẽ tự động đồng bộ dữ liệu mỗi 5 phút.
 * Bạn cũng có thể chạy "syncAll" thủ công bất cứ lúc nào.
 * ═══════════════════════════════════════════════════════════════
 */

// ─── CẤU HÌNH (BẮT BUỘC SỬA) ─────────────────────────────────
var API_URL = 'https://qr-shipment-app.vercel.app/api/sync-sheets';
var API_KEY = 'YOUR_SYNC_API_KEY_HERE'; // Thay bằng giá trị thực từ biến SYNC_API_KEY

// ─── TÊN SHEET ────────────────────────────────────────────────
var SHEET_PRODUCTS = 'Sản phẩm';
var SHEET_EXPORTS  = 'Lịch sử xuất kho';
var SHEET_LOG      = 'Nhật ký đồng bộ';

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Đồng bộ toàn bộ dữ liệu (products + exports) từ Supabase.
 * Có thể chạy thủ công hoặc qua trigger tự động.
 */
function syncAll() {
  try {
    var response = UrlFetchApp.fetch(API_URL + '?table=all&key=' + API_KEY, {
      method: 'get',
      muteHttpExceptions: true,
      headers: { 'Accept': 'application/json' }
    });

    var code = response.getResponseCode();
    if (code !== 200) {
      logSync('❌ Lỗi API: HTTP ' + code + ' — ' + response.getContentText().substring(0, 200));
      return;
    }

    var data = JSON.parse(response.getContentText());

    // ── Sync Products ───────────────────────────────────────
    if (data.products) {
      writeProductsSheet(data.products);
    }

    // ── Sync Exports ────────────────────────────────────────
    if (data.exports) {
      writeExportsSheet(data.exports);
    }

    var msg = '✅ Đồng bộ thành công — '
      + (data.products_count || 0) + ' sản phẩm, '
      + (data.exports_count || 0) + ' lần xuất kho';
    logSync(msg);

  } catch (e) {
    logSync('❌ Lỗi: ' + e.message);
  }
}

/**
 * Ghi dữ liệu sản phẩm lên sheet "Sản phẩm"
 */
function writeProductsSheet(products) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PRODUCTS);
  }

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
      p.gia_ban || '',
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

  // Write header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Write data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // ── Format header ────────────────────────────────────────
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#1B2A4A');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');

  // Auto-resize columns
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Freeze header row
  sheet.setFrozenRows(1);

  // Add timestamp
  sheet.getRange(rows.length + 3, 1).setValue('⏱ Cập nhật lần cuối: ' + new Date().toLocaleString('vi-VN'));
  sheet.getRange(rows.length + 3, 1).setFontColor('#999999').setFontStyle('italic');
}

/**
 * Ghi dữ liệu lịch sử xuất kho lên sheet "Lịch sử xuất kho"
 */
function writeExportsSheet(exports) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_EXPORTS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_EXPORTS);
  }

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

  // Write header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Write data
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // ── Format header ────────────────────────────────────────
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#2D6B7A');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setHorizontalAlignment('center');

  // Auto-resize
  for (var i = 1; i <= headers.length; i++) {
    sheet.autoResizeColumn(i);
  }

  // Freeze header
  sheet.setFrozenRows(1);

  // Add timestamp
  sheet.getRange(rows.length + 3, 1).setValue('⏱ Cập nhật lần cuối: ' + new Date().toLocaleString('vi-VN'));
  sheet.getRange(rows.length + 3, 1).setFontColor('#999999').setFontStyle('italic');
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
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncAll') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new time-based trigger: every 5 minutes
  ScriptApp.newTrigger('syncAll')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Run initial sync immediately
  syncAll();

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Đã cài đặt đồng bộ tự động mỗi 5 phút! 🎉',
    'Auto Sync',
    10
  );
}

/**
 * Gỡ bỏ trigger tự động.
 */
function removeAutoSync() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'syncAll') {
      ScriptApp.deleteTrigger(trigger);
      count++;
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Đã gỡ ' + count + ' trigger tự động.',
    'Auto Sync',
    5
  );
}

// ═══════════════════════════════════════════════════════════════
// CUSTOM MENU
// ═══════════════════════════════════════════════════════════════

/**
 * Thêm menu tùy chỉnh khi mở Google Sheet.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Đồng bộ Supabase')
    .addItem('📥 Đồng bộ ngay', 'syncAll')
    .addSeparator()
    .addItem('⏰ Bật đồng bộ tự động (5 phút)', 'setupAutoSync')
    .addItem('⏹ Tắt đồng bộ tự động', 'removeAutoSync')
    .addSeparator()
    .addItem('📋 Xem nhật ký', 'showLog')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

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
 * Format ISO date → "dd/MM/yyyy HH:mm"
 */
function formatDate(isoString) {
  if (!isoString) return '';
  try {
    var d = new Date(isoString);
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    return pad(d.getDate()) + '/'
         + pad(d.getMonth() + 1) + '/'
         + d.getFullYear() + ' '
         + pad(d.getHours()) + ':'
         + pad(d.getMinutes());
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
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#C5A55A').setFontColor('#1B2A4A');
    sheet.setFrozenRows(1);
  }

  // Append log at row 2 (newest first)
  sheet.insertRowAfter(1);
  sheet.getRange(2, 1, 1, 2).setValues([
    [new Date().toLocaleString('vi-VN'), message]
  ]);

  // Keep only last 100 logs
  var lastRow = sheet.getLastRow();
  if (lastRow > 101) {
    sheet.deleteRows(102, lastRow - 101);
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
