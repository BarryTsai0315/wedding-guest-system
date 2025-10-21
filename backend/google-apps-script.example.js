/**
 * wedding-guest-system - Google Apps Script (整理版)
 *  - 保留單一 doGet / doPost / doOptions
 *  - 修復 validateRequest、CORS、JSONP 支援與報到邏輯
 * 注意：部署前請確認 SPREADSHEET_ID 是否為正確值
 */

// ===== 配置常數 =====
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';
const STAFF_SHEET_NAME = 'staffList';
const GUEST_SHEET_NAME = 'guestList';
const FAMILY_SHEET_NAME = 'familyGroups';

// ===== 工具函數 =====
function verifyGoogleToken(idToken) {
  if (!idToken) return null;
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const jsonString = Utilities.newBlob(Utilities.base64Decode(base64)).getDataAsString();
    const tokenData = JSON.parse(jsonString);
    const now = Math.floor(Date.now() / 1000);
    if (tokenData.exp && tokenData.exp < now) return null;
    return tokenData.email || null;
  } catch (e) {
    console.log('verifyGoogleToken error:', e.toString());
    return null;
  }
}

function checkUserPermission(email) {
  try {
    const staffSheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(STAFF_SHEET_NAME);
    if (!staffSheet) return { authorized: false, role: 'guest', email };
    const staffData = staffSheet.getDataRange().getValues();
    for (let i = 1; i < staffData.length; i++) {
      const row = staffData[i];
      const rowEmail = (row[0] || '').toString().trim().toLowerCase();
      const rowRole = (row[1] || '').toString().trim().toLowerCase();
      const rowStatus = (row[3] || '').toString().trim().toLowerCase();
      if (rowEmail === (email || '').toLowerCase() && rowStatus === 'active') {
        const now = new Date();
        const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
        staffSheet.getRange(i + 1, 5).setValue(formattedTime);
        return { authorized: true, role: rowRole === 'admin' ? 'admin' : 'staff', email };
      }
    }
    return { authorized: false, role: 'guest', email };
  } catch (e) {
    console.log('checkUserPermission error:', e.toString());
    return { authorized: false, role: 'guest', email };
  }
}

function validateRequest(e) {
  let token = null;
  try {
    if (e.postData && e.postData.contents) {
      const body = JSON.parse(e.postData.contents || '{}');
      token = body.token || body.idToken || null;
    }
  } catch (err) {
    // ignore
  }
  token = token || e.parameter.token || e.parameter.idToken || null;
  if (!token) return { valid: false, email: null, role: 'guest', error: '未提供驗證 Token' };
  const email = verifyGoogleToken(token);
  if (!email) return { valid: false, email: null, role: 'guest', error: 'Token 驗證失敗' };
  const permission = checkUserPermission(email);
  if (!permission || !permission.authorized) return { valid: false, email, role: 'guest', error: '您沒有訪問權限' };
  return { valid: true, email, role: permission.role };
}

function createCORSResponse(data, isJSON = true) {
  const output = isJSON
    ? ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON)
    : ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.TEXT);
  output.addHeader('Access-Control-Allow-Origin', '*');
  output.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  output.addHeader('Access-Control-Max-Age', '3600');
  return output;
}

function createJSONPResponse(data, callback) {
  if (callback) {
    const jsonp = `${callback}(${JSON.stringify(data)})`;
    return ContentService.createTextOutput(jsonp).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return createCORSResponse(data);
}

// ===== 讀取相關函數 =====
function getGuestList(spreadsheetId, sheetName, params) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);
  const page = parseInt((params && params.page) || 1, 10) || 1;
  const limit = parseInt((params && params.limit) || 20, 10) || 20;
  const searchTerm = (params && params.search) || '';
  const allData = sheet.getDataRange().getValues();
  let filteredData = [];
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const guestData = {
      timestamp: row[0],
      serialNumber: row[1],
      guestName: row[2],
      collectMoney: row[3],
      giftAmount: row[4],
      hasCake: row[5],
      cakeGiven: row[6],
      familyId: row[7] || null,
      checkedIn: row[0] != null && row[0] != ''
    };
    if (searchTerm) {
      const s = searchTerm.toString().toLowerCase();
      const matches = (guestData.serialNumber || '').toString().toLowerCase().includes(s) || (guestData.guestName || '').toString().toLowerCase().includes(s);
      if (matches) filteredData.push(guestData);
    } else {
      filteredData.push(guestData);
    }
  }
  const totalRecords = filteredData.length;
  if (limit >= 99999) {
    return { data: filteredData, pagination: { currentPage: 1, totalPages: 1, totalRecords, limit: totalRecords, hasNextPage: false, hasPrevPage: false } };
  }
  const totalPages = Math.ceil(totalRecords / limit);
  const offset = (page - 1) * limit;
  const pageData = filteredData.slice(offset, offset + limit);
  return { data: pageData, pagination: { currentPage: page, totalPages, totalRecords, limit, hasNextPage: page < totalPages, hasPrevPage: page > 1 } };
}

function getFamilyInfoByName(spreadsheetId, guestSheetName, familySheetName, guestName) {
  try {
    const guestSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(guestSheetName);
    if (!guestSheet) return { hasFamilyInfo: false, message: 'guestList 工作表不存在' };
    if (!guestName || guestName.trim() === '') return { hasFamilyInfo: false, message: '賓客姓名為空' };
    const guestData = guestSheet.getDataRange().getValues();
    let targetFamilyId = null;
    for (let i = 1; i < guestData.length; i++) {
      const row = guestData[i];
      if (row[2] === guestName.trim()) { targetFamilyId = row[7]; break; }
    }
    if (!targetFamilyId) return { hasFamilyInfo: false, message: '該賓客無家庭資訊' };
    const familyMembers = [];
    for (let i = 1; i < guestData.length; i++) {
      const row = guestData[i];
      if (row[7] === targetFamilyId) {
        familyMembers.push({ memberName: row[2], relationship: '家人', isCheckedIn: row[0] != null && row[0] != '' });
      }
    }
    return { hasFamilyInfo: true, familyId: targetFamilyId, familyMembers, totalMembers: familyMembers.length };
  } catch (e) {
    console.log('getFamilyInfoByName error:', e.toString());
    return { hasFamilyInfo: false, error: e.toString(), message: '查詢家庭資訊失敗' };
  }
}

// ===== 寫入 / 報到相關 =====
function processSingleCheckIn(spreadsheetId, guestSheetName, data) {
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(guestSheetName);
  const now = new Date();
  const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
  const allData = sheet.getDataRange().getValues();
  let targetRowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    const row = allData[i];
    const existingSerial = (row[1] || '').toString().trim();
    const existingName = (row[2] || '').toString().trim();
    if (existingSerial === (data.serialNumber || '').toString().trim() && existingName === (data.guestName || '').toString().trim()) { targetRowIndex = i + 1; break; }
  }
  if (targetRowIndex > 0) {
    sheet.getRange(targetRowIndex, 1).setValue(formattedTime);
    sheet.getRange(targetRowIndex, 4).setValue(data.collectMoney || false);
    sheet.getRange(targetRowIndex, 5).setValue(data.giftAmount || 0);
    sheet.getRange(targetRowIndex, 6).setValue(data.hasCake || false);
    sheet.getRange(targetRowIndex, 7).setValue(data.cakeGiven || false);
    sheet.getRange(targetRowIndex, 9).setValue(data.remarks || '');
  } else {
    const newRowData = [formattedTime, data.serialNumber, data.guestName, data.collectMoney || false, data.giftAmount || 0, data.hasCake || false, data.cakeGiven || false, data.familyId || '', data.remarks || ''];
    sheet.appendRow(newRowData);
  }
  return { success: true, message: '單人報到成功' };
}

function processFamilyCheckIn(spreadsheetId, guestSheetName, familySheetName, data) {
  try {
    const guestSheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(guestSheetName);
    const now = new Date();
    const formattedTime = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm:ss');
    const allData = guestSheet.getDataRange().getValues();
    let targetFamilyId = null;
    let checkInPersonRowIndex = -1;
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[2] === data.guestName.trim()) { targetFamilyId = row[7]; checkInPersonRowIndex = i + 1; break; }
    }
    if (!targetFamilyId) return processSingleCheckIn(spreadsheetId, guestSheetName, data);
    let updatedCount = 0;
    const familyMemberNames = [];
    if (checkInPersonRowIndex > 0) {
      guestSheet.getRange(checkInPersonRowIndex, 1).setValue(formattedTime);
      guestSheet.getRange(checkInPersonRowIndex, 4).setValue(data.collectMoney || false);
      guestSheet.getRange(checkInPersonRowIndex, 5).setValue(data.giftAmount || 0);
      guestSheet.getRange(checkInPersonRowIndex, 6).setValue(data.hasCake || false);
      guestSheet.getRange(checkInPersonRowIndex, 7).setValue(data.cakeGiven || false);
      guestSheet.getRange(checkInPersonRowIndex, 9).setValue(data.remarks || '');
      updatedCount++;
    }
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      if (row[7] === targetFamilyId && row[2] !== data.guestName.trim()) {
        familyMemberNames.push(row[2]);
        const memberRowIndex = i + 1;
        guestSheet.getRange(memberRowIndex, 1).setValue(formattedTime);
        updatedCount++;
      }
    }
    familyMemberNames.unshift(data.guestName.trim());
    return { success: true, message: `家庭報到成功！${data.guestName} 報到，全家 ${updatedCount} 位成員已完成報到`, updatedCount, familyMembers: familyMemberNames, checkInPerson: data.guestName.trim() };
  } catch (e) {
    console.log('processFamilyCheckIn error:', e.toString());
    return { success: false, error: e.toString(), message: '家庭報到失敗' };
  }
}

// ===== Web App 端點 =====
function doGet(e) {
  console.log('doGet params:', e && e.parameter ? e.parameter : {});
  try {
    const action = (e.parameter && e.parameter.action) || null;
    const callback = (e.parameter && e.parameter.callback) || null;
    if (!action) return createJSONPResponse({ success: false, error: '缺少 action 參數' }, callback);
    switch (action) {
      case 'checkPermission': {
        const email = e.parameter.email || null;
        if (!email) return createJSONPResponse({ success: false, error: '缺少 email 參數' }, callback);
        const perm = checkUserPermission(email);
        return createJSONPResponse({ success: true, permission: perm }, callback);
      }
      case 'getGuests': {
        const params = { page: e.parameter.page, limit: e.parameter.limit, search: e.parameter.search };
        const result = getGuestList(SPREADSHEET_ID, GUEST_SHEET_NAME, params);
        return createJSONPResponse(result, callback);
      }
      case 'getFamilyInfo': {
        const guestName = e.parameter.guestName || '';
        const result = getFamilyInfoByName(SPREADSHEET_ID, GUEST_SHEET_NAME, FAMILY_SHEET_NAME, guestName);
        return createJSONPResponse(result, callback);
      }
      default:
        return createJSONPResponse({ success: false, error: '不支援的 action' }, callback);
    }
  } catch (e) {
    console.log('doGet error:', e.toString());
    return createCORSResponse({ success: false, error: e.toString() });
  }
}

function doPost(e) {
  console.log('doPost body/params:', e && e.postData ? e.postData.contents : {}, e && e.parameter ? e.parameter : {});
  try {
    let body = {};
    try { body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {}; } catch (err) { body = {}; }
    const action = (body.action || (e.parameter && e.parameter.action) || null);
    const callback = (body.callback || (e.parameter && e.parameter.callback) || null);
    if (!action) return createJSONPResponse({ success: false, error: '缺少 action 參數' }, callback);
    if (action !== 'checkPermission') {
      const v = validateRequest(e);
      if (!v.valid) return createJSONPResponse({ success: false, error: v.error || '驗證失敗' }, callback);
    }
    switch (action) {
      case 'checkIn': {
        const data = body.data || body || e.parameter || {};
        data.collectMoney = data.collectMoney === true || data.collectMoney === 'true';
        data.giftAmount = parseInt(data.giftAmount) || 0;
        data.hasCake = data.hasCake === true || data.hasCake === 'true';
        data.cakeGiven = data.cakeGiven === true || data.cakeGiven === 'true';
        if (!data.serialNumber || !data.guestName) return createJSONPResponse({ success: false, error: '缺少必要欄位' }, callback);
        const result = processFamilyCheckIn(SPREADSHEET_ID, GUEST_SHEET_NAME, FAMILY_SHEET_NAME, data);
        return createJSONPResponse(result, callback);
      }
      case 'bulkCheckIn': {
        const items = body.items || [];
        const results = [];
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          it.collectMoney = it.collectMoney === true || it.collectMoney === 'true';
          it.giftAmount = parseInt(it.giftAmount) || 0;
          it.hasCake = it.hasCake === true || it.hasCake === 'true';
          it.cakeGiven = it.cakeGiven === true || it.cakeGiven === 'true';
          results.push(processFamilyCheckIn(SPREADSHEET_ID, GUEST_SHEET_NAME, FAMILY_SHEET_NAME, it));
        }
        return createJSONPResponse({ success: true, results }, callback);
      }
      case 'checkPermission': {
        const email = body.email || (e.parameter && e.parameter.email) || null;
        if (!email) return createJSONPResponse({ success: false, error: '缺少 email' }, callback);
        const perm = checkUserPermission(email);
        return createJSONPResponse({ success: true, permission: perm }, callback);
      }
      default:
        return createJSONPResponse({ success: false, error: '不支援的 action' }, callback);
    }
  } catch (err) {
    console.log('doPost error:', err.toString());
    return createCORSResponse({ success: false, error: err.toString() });
  }
}

function doOptions(e) {
  const output = ContentService.createTextOutput('');
  output.addHeader('Access-Control-Allow-Origin', '*');
  output.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.addHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  output.addHeader('Access-Control-Max-Age', '3600');
  output.setMimeType(ContentService.MimeType.TEXT);
  return output;
}

/* 檔案末尾: 保留說明註解（原始說明可參考 repository README） */
