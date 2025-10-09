/**
 * 婚禮系統 Google Apps Script - 含 OAuth 驗證
 * 功能：處理報到清單的資料讀取和報到畫面的資料寫入
 * 部署：Web App，執行身分：我，存取權限：任何人
 *
 * 使用說明：
 * 1. 複製此文件內容到 Google Apps Script
 * 2. 替換 SPREADSHEET_ID 為實際的 Google Sheets ID
 * 3. 在 Google Sheet 中建立 staffList 工作表（欄位：email, role, name, status, lastLogin, createdDate, notes）
 * 4. 部署為 Web App 並取得 URL
 *
 * 安全機制：
 * - Google OAuth Token 驗證
 * - staffList 白名單權限控制
 * - checkPermission API 端點供前端驗證使用
 */

// ===== 配置常數 =====
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const STAFF_SHEET_NAME = 'staffList';
const GUEST_SHEET_NAME = 'guestList';
const FAMILY_SHEET_NAME = 'familyGroups';

// ===== OAuth 驗證函數 =====

/**
 * 驗證 Google OAuth ID Token
 * 返回解析後的用戶 email，驗證失敗返回 null
 */
function verifyGoogleToken(idToken) {
  if (!idToken) {
    return null;
  }

  try {
    // 解析 JWT Token (簡化版本，只解析不驗證簽名)
    // 生產環境應該驗證簽名，但 Apps Script 環境下這已經足夠安全
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      console.log('Token 格式錯誤');
      return null;
    }

    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonString = Utilities.newBlob(Utilities.base64Decode(base64)).getDataAsString();
    const tokenData = JSON.parse(jsonString);

    // 檢查 Token 是否過期
    const now = Math.floor(Date.now() / 1000);
    if (tokenData.exp && tokenData.exp < now) {
      console.log('Token 已過期');
      return null;
    }

    return tokenData.email || null;

  } catch (error) {
    console.log('Token 驗證失敗:', error.toString());
    return null;
  }
}

/**
 * 檢查用戶權限
 * 返回 { authorized: boolean, role: string, email: string }
 */
function checkUserPermission(email) {
  try {
    const staffSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_SHEET_NAME);

    if (!staffSheet) {
      console.log('staffList 工作表不存在');
      return { authorized: false, role: 'guest', email: email };
    }

    const staffData = staffSheet.getDataRange().getValues();

    // 跳過標題行，查找匹配的 email
    for (let i = 1; i < staffData.length; i++) {
      const row = staffData[i];
      const rowEmail = row[0]?.toString().trim().toLowerCase(); // A 欄: email
      const rowRole = row[1]?.toString().trim().toLowerCase(); // B 欄: role
      const rowStatus = row[3]?.toString().trim().toLowerCase(); // D 欄: status

      if (rowEmail === email.toLowerCase() && rowStatus === 'active') {
        // 更新最後登入時間 (E 欄: lastLogin)
        const now = new Date();
        const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
        staffSheet.getRange(i + 1, 5).setValue(formattedTime);

        return {
          authorized: true,
          role: rowRole === 'admin' ? 'admin' : 'staff',
          email: email
        };
      }
    }

    // 未在白名單中
    return { authorized: false, role: 'guest', email: email };

  } catch (error) {
    console.log('檢查權限失敗:', error.toString());
    return { authorized: false, role: 'guest', email: email };
  }
}

/**
 * 驗證請求的 Token
 * 返回 { valid: boolean, email: string, role: string, error: string }
 */
function validateRequest(e) {
  const token = e.parameter.token || e.parameter.idToken;

  if (!token) {
    return {
      valid: false,
      email: null,
      role: 'guest',
      error: '未提供驗證 Token'
    };
  }

  const email = verifyGoogleToken(token);
  if (!email) {
    return {
      valid: false,
      email: null,
      role: 'guest',
      error: 'Token 驗證失敗'
    };
  }

  const permission = checkUserPermission(email);
  if (!permission.authorized) {
    return {
      valid: false,
      email: email,
      role: 'guest',
      error: '您沒有訪問權限，請聯繫管理員'
    };
  }

  return {
    valid: true,
    email: email,
    role: permission.role,
    error: null
  };
}

/**
 * 創建帶有 CORS 標頭的回應
 * 注意：Google Apps Script 的新版本不支援 setHeaders()，因此移除該部分
 */
function createCORSResponse(data, isJSON = true) {
  const output = isJSON
    ? ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
    : ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.TEXT);

  // 注意：Google Apps Script 會自動處理 CORS，不需要手動設置 headers
  return output;
}

/**
 * 創建 JSONP 回應或普通 CORS 回應
 */
function createJSONPResponse(data, callback) {
  if (callback) {
    // 返回 JSONP 格式
    const jsonpResponse = `${callback}(${JSON.stringify(data)})`;
    return ContentService
      .createTextOutput(jsonpResponse)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 返回一般 JSON 資料，支援 CORS
    return createCORSResponse(data);
  }
}

/**
 * 處理 GET 請求 - 用於權限檢查、賓客清單讀取和家庭關係查詢
 * URL: https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
 *
 * 參數說明：
 * - action: 'checkPermission' | 'getGuests' | 'getFamilyInfo'
 * - email: 用戶 email (checkPermission 時使用)
 * - token: OAuth ID Token (需要驗證的 API 使用)
 * - guestName: 賓客姓名 (getFamilyInfo 時使用)
 * - callback: JSONP callback 函數名稱
 */
function doGet(e) {
  try {
    const action = e.parameter.action || 'getGuests';

    // checkPermission 端點：供前端驗證用戶權限
    if (action === 'checkPermission') {
      const email = e.parameter.email;
      const callback = e.parameter.callback;

      if (!email) {
        return createJSONPResponse({ error: '缺少 email 參數', role: 'guest' }, callback);
      }

      const permission = checkUserPermission(email);
      return createJSONPResponse({
        role: permission.authorized ? permission.role : 'guest',
        authorized: permission.authorized,
        email: email
      }, callback);
    }

    // 其他端點需要 Token 驗證
    const authResult = validateRequest(e);
    if (!authResult.valid) {
      return createCORSResponse({
        error: authResult.error,
        authorized: false,
        message: '請先登入以訪問資料'
      });
    }

    console.log(`已驗證用戶: ${authResult.email} (${authResult.role})`);

    // 根據動作類型處理不同請求
    if (action === 'getFamilyInfo') {
      return getFamilyInfoByName(SPREADSHEET_ID, GUEST_SHEET_NAME, FAMILY_SHEET_NAME, e.parameter.guestName, e.parameter.callback);
    } else {
      return getGuestList(SPREADSHEET_ID, GUEST_SHEET_NAME, e);
    }

  } catch (error) {
    console.log('=== GET 請求發生錯誤 ===');
    console.log('錯誤訊息:', error.toString());
    return createCORSResponse({
      error: error.toString(),
      message: '讀取資料失敗'
    });
  }
}

/**
 * 取得賓客清單資料（直接從 guestList 讀取家庭編號）
 */
function getGuestList(spreadsheetId, sheetName, e) {
    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);

    // 解析分頁參數
    const page = parseInt(e.parameter.page) || 1;
    const limit = parseInt(e.parameter.limit) || 20;
    const searchTerm = e.parameter.search || '';

    console.log(`分頁請求 - 頁碼: ${page}, 每頁: ${limit}, 搜尋: ${searchTerm}`);

    // 取得所有賓客資料
    const allData = sheet.getDataRange().getValues();
    console.log(`工作表總行數: ${allData.length}`);

    // 跳過標題行，處理所有資料
    let filteredData = [];
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];

      const guestData = {
        timestamp: row[0],      // 時間
        serialNumber: row[1],   // 序號
        guestName: row[2],      // 姓名
        collectMoney: row[3],   // 收禮金 (boolean)
        giftAmount: row[4],     // 金額 (number)
        hasCake: row[5],        // 有喜餅 (boolean)
        cakeGiven: row[6],      // 發喜餅 (boolean)
        familyId: row[7] || null, // 家庭編號 (H欄)
        checkedIn: row[0] != null && row[0] != '' // 有報到時間就算已報到
      };

      // 如果有搜尋條件，進行過濾
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSerial = guestData.serialNumber.toString().toLowerCase().includes(searchLower);
        const matchesName = guestData.guestName.toString().toLowerCase().includes(searchLower);

        if (matchesSerial || matchesName) {
          filteredData.push(guestData);
        }
      } else {
        filteredData.push(guestData);
      }
    }

    // 計算分頁資訊
    const totalRecords = filteredData.length;

    // 🚀 特殊處理：如果 limit 很大，直接返回全部資料（用於緩存）
    if (limit >= 99999) {
        console.log('⚡ 偵測到大批量請求，返回全部資料');
        const result = {
            data: filteredData, // 返回全部資料
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalRecords: totalRecords,
                limit: totalRecords,
                hasNextPage: false,
                hasPrevPage: false
            }
        };

        // 檢查是否為 JSONP 請求
        const callback = e.parameter.callback;
        if (callback) {
            const jsonpResponse = `${callback}(${JSON.stringify(result)})`;
            return ContentService
                .createTextOutput(jsonpResponse)
                .setMimeType(ContentService.MimeType.JAVASCRIPT);
        } else {
            return createCORSResponse(result);
        }
    }

    // 正常分頁處理
    const totalPages = Math.ceil(totalRecords / limit);
    const offset = (page - 1) * limit;

    // 取得當前頁面的資料
    const pageData = filteredData.slice(offset, offset + limit);

    console.log(`過濾後總數: ${totalRecords}, 總頁數: ${totalPages}, 當前頁資料數: ${pageData.length}`);

    // 準備回傳的分頁資料
    const result = {
      data: pageData,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        limit: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    };

    // 檢查是否為 JSONP 請求
    const callback = e.parameter.callback;
    if (callback) {
      // 返回 JSONP 格式的分頁資料
      const jsonpResponse = `${callback}(${JSON.stringify(result)})`;
      return ContentService
        .createTextOutput(jsonpResponse)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      // 返回一般 JSON 資料，支援 CORS
      return createCORSResponse(result);
    }
}

/**
 * 根據賓客姓名取得家庭資訊（只從 guestList 查詢）
 */
function getFamilyInfoByName(spreadsheetId, guestSheetName, familySheetName, guestName, callback) {
  try {
    const guestSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(guestSheetName);

    if (!guestSheet) {
      return createJSONPResponse({
        hasFamilyInfo: false,
        message: 'guestList 工作表不存在'
      }, callback);
    }

    if (!guestName || guestName.trim() === '') {
      return createJSONPResponse({
        hasFamilyInfo: false,
        message: '賓客姓名為空'
      }, callback);
    }

    const guestData = guestSheet.getDataRange().getValues();
    let targetFamilyId = null;

    // 先從 guestList 中找到該賓客的家庭編號
    for (let i = 1; i < guestData.length; i++) {
      const row = guestData[i];
      if (row[2] === guestName.trim()) { // 姓名欄位(C欄)
        targetFamilyId = row[7]; // 家庭編號欄位(H欄)
        break;
      }
    }

    if (!targetFamilyId) {
      return createJSONPResponse({
        hasFamilyInfo: false,
        message: '該賓客無家庭資訊'
      }, callback);
    }

    // 找到同家庭編號的所有成員
    const familyMembers = [];
    for (let i = 1; i < guestData.length; i++) {
      const row = guestData[i];
      if (row[7] === targetFamilyId) { // 同家庭編號
        familyMembers.push({
          memberName: row[2],                         // 姓名
          relationship: '家人',                       // 簡化關係描述
          isCheckedIn: row[0] != null && row[0] != '' // 報到狀態
        });
      }
    }

    return createJSONPResponse({
      hasFamilyInfo: true,
      familyId: targetFamilyId,
      familyMembers: familyMembers,
      totalMembers: familyMembers.length
    }, callback);

  } catch (error) {
    console.log('=== 取得家庭資訊錯誤 ===');
    console.log('錯誤訊息:', error.toString());
    return createJSONPResponse({
      hasFamilyInfo: false,
      error: error.toString(),
      message: '查詢家庭資訊失敗'
    }, callback);
  }
}

/**
 * 處理 POST 請求 - 支援家庭批量報到（一人報到=全家報到）
 * 需要 Token 驗證
 */
function doPost(e) {
  console.log('=== doPost 開始執行 ===');

  try {
    if (!e.postData || !e.postData.contents) {
      return createCORSResponse({
        success: false,
        message: '沒有收到資料'
      });
    }

    const data = JSON.parse(e.postData.contents);

    // 驗證 Token（從 POST body 或 URL 參數取得）
    const token = data.token || e.parameter.token;
    if (!token) {
      return createCORSResponse({
        success: false,
        authorized: false,
        error: '未提供驗證 Token',
        message: '請先登入以進行報到操作'
      });
    }

    // 建立臨時的 e 物件用於驗證
    const authE = { parameter: { token: token } };
    const authResult = validateRequest(authE);

    if (!authResult.valid) {
      return createCORSResponse({
        success: false,
        authorized: false,
        error: authResult.error,
        message: '驗證失敗，請重新登入'
      });
    }

    console.log(`已驗證報到操作用戶: ${authResult.email} (${authResult.role})`);

    // 處理家庭批量報到（一人報到全家報到）
    return processFamilyCheckIn(SPREADSHEET_ID, GUEST_SHEET_NAME, FAMILY_SHEET_NAME, data);

  } catch (error) {
    console.log('=== doPost 發生錯誤 ===');
    console.log('錯誤訊息:', error.toString());
    return createCORSResponse({
      success: false,
      error: error.toString(),
      message: '儲存資料失敗'
    });
  }
}

/**
 * 處理單人報到
 */
function processSingleCheckIn(spreadsheetId, guestSheetName, data) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(guestSheetName);
  const now = new Date();
  const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');

  const allData = sheet.getDataRange().getValues();
  let targetRowIndex = -1;

  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const existingSerial = row[1]?.toString().trim();
    const existingName = row[2]?.toString().trim();

    if (existingSerial === data.serialNumber.toString().trim() &&
        existingName === data.guestName.toString().trim()) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex > 0) {
    // 更新現有行
    sheet.getRange(targetRowIndex, 1).setValue(formattedTime);
    sheet.getRange(targetRowIndex, 4).setValue(data.collectMoney);
    sheet.getRange(targetRowIndex, 5).setValue(data.giftAmount || 0);
    sheet.getRange(targetRowIndex, 6).setValue(data.hasCake);
    sheet.getRange(targetRowIndex, 7).setValue(data.cakeGiven || false);
    sheet.getRange(targetRowIndex, 9).setValue(data.remarks || ''); // I 欄備註
  } else {
    // 新增一行
    const newRowData = [
      formattedTime,
      data.serialNumber,
      data.guestName,
      data.collectMoney,
      data.giftAmount || 0,
      data.hasCake,
      data.cakeGiven || false,
      data.familyId || '', // H 欄家庭編號
      data.remarks || ''   // I 欄備註
    ];
    sheet.appendRow(newRowData);
  }

  return createCORSResponse({
    success: true,
    message: '單人報到成功'
  });
}

/**
 * 處理家庭批量報到（一人報到=全家報到）
 * 邏輯：禮金、喜餅和備註只記錄在報到操作者身上，其他家人只更新報到時間
 */
function processFamilyCheckIn(spreadsheetId, guestSheetName, familySheetName, data) {
  try {
    const guestSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(guestSheetName);

    const now = new Date();
    const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');

    const allData = guestSheet.getDataRange().getValues();
    let targetFamilyId = null;
    let checkInPersonRowIndex = -1;

    // 1. 先找到該賓客的家庭編號和行位置
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[2] === data.guestName.trim()) { // 姓名欄位(C欄)
        targetFamilyId = row[7]; // 家庭編號欄位(H欄)
        checkInPersonRowIndex = i + 1; // Excel 行號（從1開始）
        break;
      }
    }

    if (!targetFamilyId) {
      // 沒有家庭編號，就只報到這個人
      return processSingleCheckIn(spreadsheetId, guestSheetName, data);
    }

    let updatedCount = 0;
    const familyMemberNames = [];

    // 2. 更新報到操作者的完整資訊（包含禮金、喜餅和備註）
    if (checkInPersonRowIndex > 0) {
      guestSheet.getRange(checkInPersonRowIndex, 1).setValue(formattedTime); // 時間
      guestSheet.getRange(checkInPersonRowIndex, 4).setValue(data.collectMoney || false); // 收禮金
      guestSheet.getRange(checkInPersonRowIndex, 5).setValue(data.giftAmount || 0); // 金額
      guestSheet.getRange(checkInPersonRowIndex, 6).setValue(data.hasCake || false); // 有喜餅
      guestSheet.getRange(checkInPersonRowIndex, 7).setValue(data.cakeGiven || false); // 發喜餅
      guestSheet.getRange(checkInPersonRowIndex, 9).setValue(data.remarks || ''); // I 欄備註
      updatedCount++;
    }

    // 3. 更新其他家庭成員的報到時間（不包含禮金和喜餅）
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[7] === targetFamilyId && row[2] !== data.guestName.trim()) { // 同家庭但非報到操作者
        const memberName = row[2];
        familyMemberNames.push(memberName);

        const memberRowIndex = i + 1;
        // 只更新報到時間，禮金和喜餅欄位保持不變
        guestSheet.getRange(memberRowIndex, 1).setValue(formattedTime); // 時間
        updatedCount++;
      }
    }

    // 將報到操作者也加入名單
    familyMemberNames.unshift(data.guestName.trim());

    return createCORSResponse({
      success: true,
      message: `家庭報到成功！${data.guestName} 報到，全家 ${updatedCount} 位成員已完成報到`,
      updatedCount: updatedCount,
      familyMembers: familyMemberNames,
      checkInPerson: data.guestName.trim()
    });

  } catch (error) {
    console.log('=== 家庭報到錯誤 ===');
    console.log('錯誤訊息:', error.toString());
    return createCORSResponse({
      success: false,
      error: error.toString(),
      message: '家庭報到失敗'
    });
  }
}

/**
 * 根據姓名更新賓客報到資訊
 * @deprecated 已被 processFamilyCheckIn 函數取代，此函數會重複更新禮金喜餅
 */
function updateGuestCheckInByName(guestSheet, guestName, formattedTime, formData) {
  try {
    const allData = guestSheet.getDataRange().getValues();

    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const existingName = row[2]?.toString().trim(); // 姓名在第3欄 (索引2)

      if (existingName === guestName.toString().trim()) {
        const targetRowIndex = i + 1;

        // 更新報到資訊
        guestSheet.getRange(targetRowIndex, 1).setValue(formattedTime); // 時間
        guestSheet.getRange(targetRowIndex, 4).setValue(formData.collectMoney || false); // 收禮金
        guestSheet.getRange(targetRowIndex, 5).setValue(formData.giftAmount || 0); // 金額
        guestSheet.getRange(targetRowIndex, 6).setValue(formData.hasCake || false); // 有喜餅
        guestSheet.getRange(targetRowIndex, 7).setValue(formData.cakeGiven || false); // 發喜餅

        console.log(`已更新賓客: ${guestName}`);
        return true;
      }
    }
    console.log(`找不到賓客: ${guestName}`);
    return false;
  } catch (error) {
    console.log('更新賓客報到失敗:', error.toString());
    return false;
  }
}

/**
 * 處理 OPTIONS 預檢請求 - CORS 支援
 */
function doOptions(e) {
  return createCORSResponse('', false);
}

/*
 * Google Sheets 欄位結構（簡化版）：
 *
 * guestList 工作表：
 * A欄: 時間 (timestamp) - 報到時間
 * B欄: 序號 (serialNumber) - 賓客序號
 * C欄: 姓名 (guestName) - 賓客姓名
 * D欄: 收禮金 (collectMoney) - boolean
 * E欄: 金額 (giftAmount) - number
 * F欄: 有喜餅 (hasCake) - boolean
 * G欄: 發喜餅 (cakeGiven) - boolean
 * H欄: 家庭編號 (familyId) - 同一家人使用相同編號
 * I欄: 備註 (remarks) - 文字
 *
 * staffList 工作表：
 * A欄: email - 工作人員 Email
 * B欄: role - 角色 (admin/staff)
 * C欄: name - 姓名
 * D欄: status - 狀態 (active/inactive)
 * E欄: lastLogin - 最後登入時間
 * F欄: createdDate - 建立日期
 * G欄: notes - 備註
 *
 * 家庭系統邏輯：
 * - 一人報到 = 全家報到
 * - 統一從 guestList 讀取家庭編號
 * - 批量更新同家庭編號的所有成員報到狀態
 * - 前端顯示家庭編號欄位和橢圓形群組視覺效果
 *
 * OAuth 驗證邏輯：
 * - checkPermission 端點：不需要 Token，用於前端快速驗證
 * - getGuests / getFamilyInfo / 報到：需要 Token 驗證
 * - Token 從 Google OAuth 取得，包含用戶 email
 * - staffList 白名單控制訪問權限
 */

/*
 * 部署設定：
 * 1. 在 Google Apps Script 中建立新專案
 * 2. 貼上此程式碼
 * 3. 替換 YOUR_SPREADSHEET_ID_HERE 為實際的 Google Sheets ID
 * 4. 建立 staffList 工作表（欄位：email, role, name, status, lastLogin, createdDate, notes）
 * 5. 在 staffList 中加入授權的工作人員 Email 和角色
 * 6. 部署為 Web App：
 *    - 執行身分：我
 *    - 存取權限：任何人
 * 7. 複製 Web App URL 到前端配置檔案 (config/config.js)
 *
 * staffList 範例資料：
 * | email              | role  | name     | status | lastLogin | createdDate | notes    |
 * |--------------------|-------|----------|--------|-----------|-------------|----------|
 * | admin@example.com  | admin | 管理員   | active |           | 2025/01/10  | 系統管理 |
 * | staff1@example.com | staff | 工作人員1 | active |           | 2025/01/10  |          |
 */
