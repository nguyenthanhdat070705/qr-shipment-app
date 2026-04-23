/**
 * ═══════════════════════════════════════════════════════════════
 * Google Apps Script — ĐỒNG BỘ 2 CHIỀU DIM_HOM (Supabase ↔ Google Sheets)
 * ═══════════════════════════════════════════════════════════════
 *
 * TÍNH NĂNG CHÍNH:
 * - Giữ nguyên các cột/dữ liệu hiện hành của Sheet và chỉ map những cột tương ứng với DB.
 * - Sửa một dòng trên Sheet 👉 tự động upsert lên DB tương ứng (Mapping qua ma_hom).
 * - Mỗi 5 phút kéo DB về 👉 cập nhật / thêm mới vào lại Sheet mà ko phá vỡ dữ liệu cũ.
 * 
 * HƯỚNG DẪN CÀI ĐẶT:
 * 1. Mở Google Sheet (dim_hom) của bạn.
 * 2. Vào menu: Phần mở rộng (Extensions) → Apps Script.
 * 3. Xóa code mặc định, dán toàn bộ nội dung file này vào.
 * 4. Thay đổi biến SUPABASE_URL và SUPABASE_KEY cho chuẩn xác.
 * 5. Lưu (Ctrl+S).
 * 6. Tải lại trang (F5) Google Sheet, bạn sẽ thấy menu "🔄 Đồng bộ dim_hom" bên trên.
 * 7. Nhấn "🔄 Đồng bộ dim_hom" > "⚙️ Cài đặt lần đầu" để script chạy lần đầu. Cấp quyền khi được hỏi.
 *
 * ═══════════════════════════════════════════════════════════════
 */

// ─── CẤU HÌNH (SỬA THÀNH THÔNG TIN THỰC TẾ) ─────────
var SUPABASE_URL = 'https://zspazvdyrrkdosqigomk.supabase.co'; // Link Supabase của bạn
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Key ANON / SERVICE_ROLE của Supabase

var TABLE_NAME = 'dim_hom';
var LOG_SHEET = 'Nhật Ký Đồng Bộ';

// Bảng map "Cột trên DB" <=> "Tên cột trên Google Sheet"
// Nếu bên trái (DB) chưa có cột trên Sheet, hệ thống sẽ tự động thêm mới vào cuối Sheet.
var MAPPING = {
  'id': 'ID_DB (Ẩn)', // Chứa uuid DB (Mục đích dùng làm key phụ, có thể ẩn)
  'ma_hom': 'ma_hom', // Dùng làm Key chính nối 2 bên
  'ten_hom': 'ten_hom',
  'Ten_mkt': 'Ten_mkt',
  'Ten_ky_thuat': 'Ten_ky_thuat',
  'Ten_Hom_The_Hien': 'Ten_Hom_The_Hien',
  'Ten_chuan_hoa': 'Ten_chuan_hoa',
  'don_vi_tinh': 'Don_vi',
  'loai_hom': 'Loai_go',
  'muc_dich_su_dung': 'Muc_dich',
  'Goi_dich_vu': 'Goi_dich_vu',
  'Mau_Sac': 'Mau_Sac',
  'nhom_san_pham': 'Nhom_Hang_Hoa',
  'Loai_san_pham': 'Loai_san_pham',
  'Ton_giao': 'Tôn giáo',
  'Dac_diem': 'Dac_diem',
  'Nap': 'Nắp',
  'NCC': 'Nguon_goc',
  'do_day_thanh': 'Thanh',
  'Liet': 'Liet',
  'kich_thuoc': 'Kich_thuoc',
  'Be_mat': 'Be_mat',
  'gia_von': 'gia_von',
  'gia_ban': 'gia_ban',
  'mo_ta': 'mo_ta',
  'hinh_anh': 'hinh_anh',
  'thong_so_khac': 'thong_so_khac',
  'tinh_chat': 'tinh_chat',
  'is_active': 'is_active',
  'updated_at': 'updated_at'
};


// ═══════════════════════════════════════════════════════════════
// MENU TRONG SHEET
// ═══════════════════════════════════════════════════════════════
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 Đồng bộ dim_hom')
    .addItem('📥 Kéo Data từ Supabase về (Pull)', 'pullFromSupabase')
    .addItem('📤 Đẩy toàn bộ lên Supabase (Push)', 'pushAllToSupabase')
    .addSeparator()
    .addItem('⚙️ Cài đặt lần đầu & Auto Sync', 'setup')
    .addItem('❌ Gỡ bỏ Auto Sync', 'removeTriggers')
    .addToUi();
}

// ═══════════════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════════════
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet(); 
  
  // Kiểm tra list header (dòng 1) của sheet
  var lastCol = Math.max(1, sheet.getLastColumn());
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  
  var newHeadersNeeded = [];
  
  // Duyệt xem những trường DB nào chưa có mặt trên Sheet thì ta chuẩn bị add
  Object.keys(MAPPING).forEach(function(dbCol) {
    var sheetColName = MAPPING[dbCol];
    if (headers.indexOf(sheetColName) === -1) {
      newHeadersNeeded.push(sheetColName);
    }
  });
  
  // Insert thêm các column còn thiếu
  if (newHeadersNeeded.length > 0) {
    var appendStartCol = headers.length === 1 && !headers[0] ? 1 : headers.length + 1;
    sheet.getRange(1, appendStartCol, 1, newHeadersNeeded.length).setValues([newHeadersNeeded]);
    sheet.getRange(1, appendStartCol, 1, newHeadersNeeded.length).setFontWeight('bold').setBackground('#EFEFEF');
    // Cập nhật lại headers sau khi add
    lastCol = sheet.getLastColumn();
  }
  
  // Chạy pull lần đầu
  pullFromSupabase();
  
  // Cài trigger chạy hàm Pull mỗi 5 phút
  removeTriggers();
  ScriptApp.newTrigger('pullFromSupabase')
    .timeBased()
    .everyDays(7)
    .create();
    
  ss.toast('Đã cài tự động lấy cập nhật dữ liệu 7 ngày 1 lần!', 'Cài đặt thành công', 8);
}

function removeTriggers() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'pullFromSupabase') {
      ScriptApp.deleteTrigger(triggers[i]);
      count++;
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast('Đã gỡ ' + count + ' triggers.', 'Hoàn tất', 5);
}

// Lấy object map Cột Header ra Index nhằm update Sheet độc lập vị trí cột
function getHeaderMap(sheet) {
  var lc = sheet.getLastColumn();
  if (lc === 0) return {};
  var hdrs = sheet.getRange(1, 1, 1, lc).getValues()[0];
  var mapObj = {};
  for (var i = 0; i < hdrs.length; i++) {
    if (hdrs[i]) mapObj[hdrs[i].toString().trim()] = i;
  }
  return mapObj;
}


// ═══════════════════════════════════════════════════════════════
// HÀM PULL (LẤY TỪ DB XUỐNG SHEET - DATABASE LÀ SOURCE OF TRUTH)
// ═══════════════════════════════════════════════════════════════
function pullFromSupabase() {
  try {
    var url = SUPABASE_URL + '/rest/v1/' + TABLE_NAME + '?select=*';
    var response = UrlFetchApp.fetch(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Accept': 'application/json'
      }
    });

    if (response.getResponseCode() !== 200) {
      logInfo('❌ Lỗi kéo dữ liệu: ' + response.getContentText().substring(0, 200));
      return;
    }

    var dbData = JSON.parse(response.getContentText());
    if (!dbData || dbData.length === 0) return;

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var hdrMap = getHeaderMap(sheet);
    var maHomColIndex = hdrMap[MAPPING['ma_hom']];
    
    if (maHomColIndex === undefined) {
      logInfo('❌ Không tìm thấy cột "' + MAPPING['ma_hom'] + '" trên Sheet. Hãy chạy lệnh Cài Đặt.');
      return;
    }

    // Đọc data cũ để check tồn tại (Dựa vào ma_hom)
    var lastRow = Math.max(1, sheet.getLastRow());
    var numCols = Math.max(1, sheet.getLastColumn());
    var currentValues = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, numCols).getValues() : [];
    
    var existingMaHomMap = {};
    for (var i = 0; i < currentValues.length; i++) {
        var mh = currentValues[i][maHomColIndex];
        if (mh) existingMaHomMap[mh.toString().trim()] = i; // Lưu index dòng
    }
    
    var newRows = [];
    var editCount = 0;
    
    // Duyệt qua DB data
    for (var j = 0; j < dbData.length; j++) {
      var record = dbData[j];
      var r_ma_hom = record['ma_hom'];
      if (!r_ma_hom) continue;
      
      var destRowIndex = existingMaHomMap[r_ma_hom.toString().trim()];
      
      if (destRowIndex !== undefined) {
         // TRƯỜNG HỢP UPDATE: Đã có trên Sheet, ghi đè những cột mà DB đang quản lý
         var checkEdit = false;
         // Đi từng keys
         Object.keys(MAPPING).forEach(function(dbCol) {
           var sheetHeaderName = MAPPING[dbCol];
           var cIdx = hdrMap[sheetHeaderName];
           if (cIdx !== undefined) {
              var val = record[dbCol];
              if (val === null || val === undefined) val = "";
              if (currentValues[destRowIndex][cIdx] != val) {
                 currentValues[destRowIndex][cIdx] = val;
                 checkEdit = true;
              }
           }
         });
         if (checkEdit) editCount++;
      } else {
         // TRƯỜNG HỢP NEW: Chưa có trên Sheet, tạo mảng mới để push
         var emptyRow = new Array(numCols).fill("");
         Object.keys(MAPPING).forEach(function(dbCol) {
           var sheetHeaderName = MAPPING[dbCol];
           var cIdx = hdrMap[sheetHeaderName];
           if (cIdx !== undefined) {
              var val = record[dbCol];
              if (val === null || val === undefined) val = "";
              emptyRow[cIdx] = val;
           }
         });
         newRows.push(emptyRow);
      }
    }
    
    // Lưu ngược lại các cập nhật cho rows cũ
    if (currentValues.length > 0 && lastRow > 1) {
       sheet.getRange(2, 1, lastRow - 1, numCols).setValues(currentValues);
    }
    
    // Append rows mới
    if (newRows.length > 0) {
       sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, numCols).setValues(newRows);
    }

    if (editCount > 0 || newRows.length > 0) {
       logInfo('✅ Pull OK: Cập nhật ' + editCount + ' dòng cũ, Thêm ' + newRows.length + ' dòng mới');
    }
    
  } catch (e) {
    logInfo('❌ Lỗi EXCEPTION PULL: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// HÀM ONEDIT (SỬA Ở SHEET 👉 PUSH NGAY LÊN DB)
// ═══════════════════════════════════════════════════════════════
function onEdit(e) {
  if (!e || !e.range) return;
  var sheet = e.range.getSheet();
  if (sheet.getName() === LOG_SHEET) return;
  
  var row = e.range.getRow();
  if (row <= 1) return; // Không quan tâm header
  
  var numCols = sheet.getLastColumn();
  var rowData = sheet.getRange(row, 1, 1, numCols).getValues()[0];
  
  var hdrMap = getHeaderMap(sheet);
  
  var maHomColIndex = hdrMap[MAPPING['ma_hom']];
  if (maHomColIndex === undefined) return;
  
  var maHomVal = rowData[maHomColIndex];
  if (!maHomVal) return; // Nếu ko có mã hòm => Chưa đủ điều kiện push DB
  
  var recordToPush = {};
  
  Object.keys(MAPPING).forEach(function(dbCol) {
    if (dbCol === 'created_at' || dbCol === 'updated_at') return; // Không push timestamp ngược
    
    var sheetHeaderName = MAPPING[dbCol];
    var cIdx = hdrMap[sheetHeaderName];
    if (cIdx !== undefined) {
      var val = rowData[cIdx];
      if (val === "" || val === undefined) val = null;
      
      // Data type tuning
      if (dbCol === 'is_active') {
         if (typeof val === 'string') {
             val = (val.toLowerCase() === 'true' || val === '1' || val.toLowerCase() === 'có');
         } else {
             val = !!val;
         }
      }
      if (dbCol === 'gia_von' || dbCol === 'gia_ban') {
         val = parseFloat(val);
         if (isNaN(val)) val = 0;
      }
      
      recordToPush[dbCol] = val;
    }
  });

  // Gửi API Upsert bằng URLFetch (Sửa / Thêm DB)
  try {
     // Lưu ý: Nếu DB không có constraint UNIQUE cho "ma_hom", on_conflict=ma_hom sẽ fail, 
     // lúc đó cần dùng ID uuid. Code này giả định "ma_hom" dùng làm conflict target (hoặc ko dùng).
     var uri = SUPABASE_URL + '/rest/v1/' + TABLE_NAME + '?on_conflict=ma_hom';
     
     // Thử Upsert với on_conflict ma_hom hoặc id, ta thêm ?on_conflict=ma_hom nếu dim_hom có unique constraint.
     // Ở đây chỉ dùng merge-duplicates (Nó sẽ tự tìm PK)
     var response = UrlFetchApp.fetch(uri, {
      method: 'post',
      muteHttpExceptions: true,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      payload: JSON.stringify([recordToPush])
    });
    
    var c = response.getResponseCode();
    if (c !== 200 && c !== 201) {
       logInfo('❌ UPDATE DB THẤT BẠI ma_hom "' + maHomVal + '": ' + response.getContentText().substring(0,250));
       e.range.setBackground('#FFEBEE');
    } else {
       // Optional: Gán DB ID lại cho sheet (nếu là bản mới trên DB sinh UUID)
       var resData = JSON.parse(response.getContentText());
       var idColIndex = hdrMap[MAPPING['id']];
       if (resData && resData.length > 0 && idColIndex !== undefined) {
           var dbID = resData[0].id;
           if (rowData[idColIndex] !== dbID) {
               sheet.getRange(row, idColIndex + 1).setValue(dbID);
           }
       }
       e.range.setBackground('#E8F5E9'); 
       SpreadsheetApp.flush();
       Utilities.sleep(1500);
       e.range.setBackground(null); // Clear
    }
  } catch(e) {
      logInfo('❌ Lỗi Exception Mạng: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// HÀM PUSH TẤT CẢ TỪ SHEET 👉 DB
// ═══════════════════════════════════════════════════════════════
function pushAllToSupabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  
  var hdrMap = getHeaderMap(sheet);
  var numCols = sheet.getLastColumn();
  var dataRows = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
  
  var maHomColIndex = hdrMap[MAPPING['ma_hom']];
  if (maHomColIndex === undefined) return;
  
  var records = [];
  
  for (var r = 0; r < dataRows.length; r++) {
    var rd = dataRows[r];
    var rc = {};
    if (!rd[maHomColIndex]) continue;
    
    Object.keys(MAPPING).forEach(function(dbCol) {
      if (dbCol === 'created_at' || dbCol === 'updated_at') return;
      var cIdx = hdrMap[MAPPING[dbCol]];
      if (cIdx !== undefined) {
        var v = rd[cIdx] === "" ? null : rd[cIdx];
        if (dbCol === 'is_active') v = (v === true || String(v).toLowerCase() === 'true' || v === 1 || String(v).toLowerCase() === 'có');
        if (dbCol === 'gia_von' || dbCol === 'gia_ban') { v = parseFloat(v); if(isNaN(v)) v=0; }
        rc[dbCol] = v;
      }
    });
    records.push(rc);
  }
  
  if (records.length === 0) return;
  
  try {
    // Chia chunk 100 row mỗi lần đẩy để tránh timeout
    var chunkSize = 50;
    for (var i = 0; i < records.length; i += chunkSize) {
       var batch = records.slice(i, i + chunkSize);
       var response = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + TABLE_NAME + '?on_conflict=ma_hom', {
          method: 'post',
          muteHttpExceptions: true,
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates,return=minimal'
          },
          payload: JSON.stringify(batch) 
        });
       if (response.getResponseCode() >= 300) {
          logInfo('❌ Push batch lỗi: ' + response.getContentText().substring(0,250));
       }
    }
    ss.toast('Đẩy toàn bộ lên DB hoàn tất!', 'Thành công', 5);
    logInfo('✅ Push All OK ('+records.length+' bản ghi)');
  } catch(e) {
    logInfo('❌ Lỗi exception Push All: ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
// HÀM GHI LOG
// ═══════════════════════════════════════════════════════════════
function logInfo(msg) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = ss.getSheetByName(LOG_SHEET);
  if (!log) {
    log = ss.insertSheet(LOG_SHEET);
    log.getRange(1, 1, 1, 2).setValues([['Thời gian', 'Nội dung']]);
    log.setFrozenRows(1);
    log.setColumnWidth(1, 150);
    log.setColumnWidth(2, 500);
  }
  log.insertRowAfter(1);
  var ts = Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
  log.getRange(2, 1, 1, 2).setValues([[ts, msg]]);
  
  if (log.getLastRow() > 200) log.deleteRows(201, log.getLastRow() - 200);
}
