/**
 * 婚禮系統配置文件範例
 *
 * 使用說明：
 * 1. 複製此文件為 config.js
 * 2. 填入實際的 Google Apps Script URL 和 Google Sheets ID
 * 3. config.js 不會被上傳到 GitHub (已加入 .gitignore)
 */

// Google Apps Script Web App 配置
window.CONFIG = {
    // Google Apps Script Web App URL
    // 取得方式：
    // 1. 在 Google Apps Script 中部署為 Web App
    // 2. 執行身分：我
    // 3. 存取權限：任何人
    // 4. 複製部署後的 Web App URL
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec',

    // Google Sheets 配置 (用於 Google Apps Script 後端)
    GOOGLE_SHEETS: {
        // Google Sheets ID (從 URL 中取得)
        // 例如：https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
        SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID_HERE',

        // 工作表名稱
        SHEET_NAME: 'guestList'
    },

    // 系統配置
    SYSTEM: {
        // 自動刷新間隔 (毫秒)
        AUTO_REFRESH_INTERVAL: 30000,  // 30秒

        // 分頁設定
        PAGINATION: {
            DEFAULT_PAGE_SIZE: 20,  // 每頁顯示筆數
        },

        // 系統名稱
        APP_NAME: 'Wedding Guest Management System',

        // 版本號
        VERSION: '1.0.0'
    }
};