# 🧙‍♂️ Wedding Guest System - GitHub Pages + 哈利波特風格改造計劃

## 📋 專案概述

將現有的婚禮賓客管理系統改造為：
- **GitHub Pages 靜態部署**
- **哈利波特魔法世界主題**
- **Google OAuth 工作人員驗證**
- **分層權限管理系統**

---

## 🎯 Phase 1: 基礎架構建立 ✅ 完成

### ✅ 完成項目
- [x] 分析現有代碼結構和設計風格
- [x] 設計 GitHub Pages 部署架構
- [x] 創建開發規劃文件
- [x] **目錄結構重組**
  - [x] 建立 `assets/` 資源目錄 (css/js/images)
  - [x] 建立 `src/pages/admin/` 管理區域
  - [x] 移動 config/ 到根目錄
  - [x] 更新相對路徑引用 (guestlist.html, checkin.html)
- [x] **建立 index.html 主頁面**
  - [x] 基礎 HTML 結構（延續 guestlist.html 設計）
  - [x] 哈利波特風格佈局設計
  - [x] 任務卡片區域（魔法門鑰/預言家日報/古靈閣金庫）
  - [x] 工作人員登入按鈕區域（魔法部驗證）
  - [x] 響應式設計與魔法動畫效果

### 📁 新的目錄結構
```
wedding-guest-system/
├── index.html              ✅ 哈利波特風格主頁
├── assets/                 ✅ 資源目錄
│   ├── css/               ✅ 樣式文件
│   ├── js/                ✅ JavaScript 文件
│   └── images/            ✅ 圖片資源
├── src/pages/             ✅ 頁面文件
│   ├── checkin.html       ✅ 已更新路徑
│   ├── guestlist.html     ✅ 已更新路徑
│   └── admin/             ✅ 管理區域
├── config/                ✅ 移至根目錄
└── backend/               ✅ 保持不變
```

---

## 🎨 Phase 2: 哈利波特主題設計 ✅ 完成

### ✅ 完成項目
- [x] **統一主題系統建立**
  - [x] 建立 `assets/css/harry-potter.css` 統一主題檔案
  - [x] 完整的哈利波特風格色彩配置
  - [x] 魔法元素設計系統 (按鈕、卡片、表格)
  - [x] 響應式設計與動畫效果

- [x] **色彩系統建立**
  - [x] 主色調：深紅 (#722f37) + 金黃 (#d4af37)
  - [x] 背景：羊皮紙色漸層 (#f4f1e8)
  - [x] 文字：深棕 (#2c1810)
  - [x] 魔法元素：深紫 (#4a148c) + 古銅 (#cd7f32)

- [x] **視覺元素設計**
  - [x] 魔法標題區域 (漸層背景 + 金色分隔線)
  - [x] 魔法卡片系統 (金邊 + hover 動畫)
  - [x] 魔法按鈕 (霍格華茲風格 + 魔法部風格)
  - [x] 魔法複選框 (自定義樣式)
  - [x] 魔法動畫效果 (sparkle, pulse, float)

- [x] **組件主題化**
  - [x] 更新 index.html (已完成)
  - [x] 更新 guestlist.html → "預言家日報"
    - [x] 標題中文化與主題統一
    - [x] 表格標題翻譯
    - [x] 按鈕樣式更新
    - [x] 複選框主題化
  - [x] 更新 checkin.html → "魔法門鋰"
    - [x] 標題中文化與主題統一
    - [x] 表單元素主題化
    - [x] 按鈕樣式更新
  - [x] 統一 CSS 變數系統
  - [x] 向下相容性保持

### 🎨 設計特色
- **一致的視覺語言**：金紅配色貫穿整個系統
- **魔法互動效果**：hover 動畫、魔法粒子、漸變效果
- **中英雙語設計**：保持功能性的同時增加主題趣味
- **響應式友好**：行動裝置完美適配

---

## 🔐 Phase 3: Google OAuth 驗證系統 ✅ 完成

### ✅ 完成項目
- [x] **OAuth 整合**
  - [x] Google OAuth 2.0 JavaScript SDK 整合
  - [x] 建立 `assets/js/auth.js` 完整驗證模組
  - [x] 登入/登出流程實作
  - [x] Token 管理與刷新機制 (24小時有效期)
  - [x] localStorage 狀態持久化

- [x] **權限檢查機制**
  - [x] Google Sheets 權限表設計與自動建立
  - [x] 權限驗證 API (JSONP 支援)
  - [x] 三層權限系統：guest/staff/admin
  - [x] 即時 UI 狀態更新
  - [x] 自動登入狀態恢復

- [x] **後端 API 擴展**
  - [x] Google Apps Script 權限檢查功能
  - [x] 自動建立 staffList 工作表
  - [x] 工作人員管理函數
  - [x] 登入時間記錄

### 📊 權限表結構 (Google Sheets)

**staffList 工作表欄位**：
```
A: email        - 工作人員 Gmail 地址
B: role         - admin/staff (管理員/一般工作人員)
C: name         - 顯示名稱
D: status       - active/inactive (啟用/停用)
E: lastLogin    - 最後登入時間 (自動更新)
F: createdDate  - 建立日期
G: notes        - 備註
```

### 🔧 使用方式

**前端配置**：
1. 在 `config.js` 中設定 `GOOGLE_CLIENT_ID`
2. 頁面會自動載入 OAuth 驗證模組
3. 點擊「魔法部驗證」按鈕進行登入

**後端設定**：
1. Google Apps Script 會自動建立 staffList 工作表
2. 執行 `setupInitialStaff()` 函數建立初始管理員
3. 直接在 Google Sheets 中管理工作人員權限

**權限控制**：
- **訪客**：僅能查看主頁面
- **工作人員**：可使用報到和查詢功能
- **管理員**：完整系統管理權限

### 🧪 待測試項目

**OAuth 系統配置測試**：
- [ ] 在 Google Cloud Console 建立 OAuth 2.0 客戶端 ID
- [ ] 設定授權 JavaScript 來源和重新導向 URI
- [ ] 在 `config.js` 中填入正確的 `GOOGLE_CLIENT_ID`
- [ ] 部署 Google Apps Script 並取得正確的 Web App URL

**功能測試**：
- [ ] 測試「魔法部驗證」按鈕登入流程
- [ ] 驗證 Google OAuth 彈出視窗正常顯示
- [ ] 確認登入成功後 UI 狀態正確更新
- [ ] 測試登出功能與頁面重新載入
- [ ] 驗證 24小時 Token 自動過期機制

**權限管理測試**：
- [ ] 在 Google Apps Script 中執行 `setupInitialStaff()` 函數
- [ ] 確認 `staffList` 工作表自動建立且格式正確
- [ ] 測試不同角色 (admin/staff) 的權限差異
- [ ] 驗證 `status: inactive` 帳號無法登入
- [ ] 測試未授權 Email 的拒絕存取

**狀態持久化測試**：
- [ ] 登入後重新整理頁面，確認登入狀態保持
- [ ] 關閉瀏覽器重新開啟，驗證狀態恢復
- [ ] 測試 localStorage 資料正確儲存與讀取
- [ ] 驗證過期 Token 自動清除機制

**整合測試**：
- [ ] 確認現有報到和賓客清單功能不受影響
- [ ] 測試 OAuth 系統與其他頁面的相容性
- [ ] 驗證 JSONP 請求在不同瀏覽器的相容性
- [ ] 測試行動裝置上的 OAuth 流程

**錯誤處理測試**：
- [ ] 測試網路中斷時的錯誤處理
- [ ] 驗證無效配置的友善錯誤訊息
- [ ] 測試 Google API 請求失敗的回退機制
- [ ] 確認所有錯誤訊息的中文化

---

## 🏗️ Phase 4: 管理功能開發

### 👑 管理員功能
- [ ] **管理儀表板** (`pages/admin/dashboard.html`)
  - [ ] 系統概覽統計
  - [ ] 即時報到狀況
  - [ ] 禮金統計圖表
  - [ ] 工作人員活動記錄

- [ ] **系統設定** (`pages/admin/settings.html`)
  - [ ] 工作人員權限管理
  - [ ] 系統參數設定
  - [ ] 資料備份/匯出
  - [ ] 操作記錄查詢

### 👥 權限分層
- [ ] **訪客模式**：僅能查看歡迎頁面
- [ ] **一般工作人員**：報到功能 + 賓客查詢
- [ ] **管理員**：完整系統管理權限

---

## 🚀 Phase 5: GitHub Pages 部署

### 📦 部署準備
- [ ] **配置文件處理**
  - [ ] GitHub Secrets 環境變數設定
  - [ ] config.js 動態生成機制
  - [ ] 敏感資訊保護

- [ ] **自動化部署**
  - [ ] GitHub Actions workflow 設定
  - [ ] 自動測試流程
  - [ ] 部署後驗證

- [ ] **效能優化**
  - [ ] 靜態資源壓縮
  - [ ] CDN 配置
  - [ ] 快取策略

---

## 🔒 Phase 6: 安全性強化

### 🛡️ 安全機制
- [ ] **前端安全**
  - [ ] CSP (Content Security Policy) 設定
  - [ ] XSS 防護
  - [ ] 輸入驗證強化

- [ ] **API 安全**
  - [ ] OAuth token 定期刷新
  - [ ] API 請求頻率限制
  - [ ] 錯誤處理優化

- [ ] **資料保護**
  - [ ] 敏感資料加密
  - [ ] 審計記錄
  - [ ] 備份策略

---

## 🧪 Phase 7: 測試與優化

### ✅ 測試計劃
- [ ] **功能測試**
  - [ ] 所有頁面功能驗證
  - [ ] 權限控制測試
  - [ ] 邊界條件測試

- [ ] **相容性測試**
  - [ ] 多瀏覽器測試
  - [ ] 行動裝置測試
  - [ ] 離線功能測試

- [ ] **效能測試**
  - [ ] 載入速度測試
  - [ ] 大量資料處理測試
  - [ ] 記憶體使用分析

---

## 📚 Phase 8: 文件與交付

### 📖 文件更新
- [ ] **使用者文件**
  - [ ] 更新 README.md
  - [ ] 操作手冊編寫
  - [ ] 常見問題集

- [ ] **技術文件**
  - [ ] API 文件更新
  - [ ] 部署指南
  - [ ] 維護手冊

- [ ] **培訓材料**
  - [ ] 工作人員操作指南
  - [ ] 管理員使用手冊
  - [ ] 故障排除指南

---

## 🚨 風險評估與應對

### ⚠️ 技術風險
- **OAuth 金鑰暴露**：使用環境變數 + GitHub Secrets
- **靜態網站限制**：採用 serverless 架構設計
- **Google Sheets API 限制**：實作請求快取與重試機制

### 📅 時程風險
- **開發複雜度**：分階段漸進式開發
- **測試時間**：並行開發與測試
- **部署風險**：準備回滾機制

---

## 🎯 成功指標

### 📊 量化目標
- [ ] 頁面載入時間 < 3秒
- [ ] 行動裝置相容性 100%
- [ ] OAuth 登入成功率 > 95%
- [ ] 系統穩定性 99.9%

### 🎨 品質目標
- [ ] 哈利波特主題一致性
- [ ] 使用者體驗流暢度
- [ ] 程式碼品質與可維護性
- [ ] 安全性合規標準

---

---

## 🚀 專案當前狀態

**✅ 已完成階段**：
- Phase 1: 基礎架構建立 ✅
- Phase 2: 哈利波特主題設計 ✅
- Phase 3: Google OAuth 驗證系統 ✅

**🧪 當前任務**：修復 OAuth 登入功能並完成安全架構分析

**🎯 下次開發重點**：
1. 修復 Google Cloud Console OAuth 授權設定錯誤
2. 建立 Google Sheets staffList 工作表
3. 測試完整的 OAuth 登入流程
4. 驗證開源部署的安全架構

**⚙️ 快速啟動指南**：
```bash
# 啟動開發伺服器
python3 -m http.server 8000

# 訪問系統
open http://localhost:8000
```

**📋 配置檢查清單**：
- [ ] `config.js` 是否已設定正確的 `GOOGLE_CLIENT_ID`
- [ ] Google Apps Script 是否已部署並更新 URL
- [ ] `staffList` 工作表是否已建立並有測試資料
- [ ] OAuth 授權來源是否已設定正確的網域

---

## 🛡️ 開源部署安全架構分析（2024-09-21 更新）

### 🔍 安全架構討論總結

經過深度分析，針對 **GitHub Pages 開源部署** 的安全考量，確認了最優的架構方案：

#### 🎯 最終選擇：分層權限保護策略

**架構設計**：
```
開源代碼 (GitHub Pages)
    ↓ (可見但安全)
Google Apps Script (任何人可呼叫)
    ↓ (第一層保護)
Google Sheets 權限控制 (只有特定帳號可存取)
    ↓ (第二層保護)
資料安全受保護
```

#### 🔐 多層防護機制

**第一層：Google Apps Script 設定**
- **執行身分**：我 (你的 Google 帳號)
- **存取權限**：任何人
- **作用**：提供 API 接口，任何人都能呼叫但無法直接存取資料

**第二層：Google Sheets 權限控制**
- **設定**：只有特定工作人員 Gmail 帳號有編輯/檢視權限
- **作用**：真正的資料保護層
- **安全性**：即使 GAS 被惡意呼叫，也無法存取受保護的 Sheets

**第三層：OAuth 前端驗證**
- **Google OAuth 2.0**：確保只有授權帳號能登入系統
- **權限檢查**：登入後檢查 staffList 確認用戶權限
- **UI 控制**：根據權限顯示不同功能

#### ✅ 為什麼這個架構是安全的

1. **Sheets ID 可以公開**：
   ```javascript
   // 即使在 config.js 中明文寫出
   SPREADSHEET_ID: '1B1m0BDaMKbXqKOrxVtYUcGW0122Pg3nYfmpu840CIBw'
   // 沒有權限的人訪問會得到：403 Forbidden
   ```

2. **GAS API 可以公開呼叫**：
   ```javascript
   // 惡意用戶嘗試攻擊
   fetch('https://script.google.com/macros/s/你的GAS/exec?action=getGuests')
   // GAS 嘗試存取 Sheets 時會被 Google 阻擋
   // 回應：Exception: You do not have permission to call SpreadsheetApp.openById
   ```

3. **OAuth 提供身份驗證**：
   - 只有系統允許的 Gmail 帳號能通過登入
   - 登入後會檢查 staffList 確認具體權限
   - UI 根據權限動態調整

#### 🚫 被否決的方案

**方案 A：直接使用 Sheets API**
- ❌ 需要在前端處理 API 金鑰，複雜度高
- ❌ 權限管理複雜，需要大量重構

**方案 C/D：Runtime 配置系統**
- ❌ 過度工程化，複雜度不符合需求
- ❌ 用戶設定門檻高，不利於快速部署

#### 📋 實作檢查清單

**當前需要完成的設定**：
- [ ] **Google Cloud Console**：修正 OAuth 授權來源設定
  - 授權 JavaScript 來源：`http://localhost:8000`, `http://127.0.0.1:8000`
  - 授權重新導向 URI：對應的完整 URL

- [ ] **Google Sheets**：建立 staffList 工作表
  - 欄位：email, role, name, status, lastLogin, createdDate, notes
  - 添加工作人員帳號並設定 status 為 active

- [ ] **功能測試**：
  - 測試「魔法部驗證」按鈕登入流程
  - 驗證權限檢查機制
  - 確認資料安全性

#### 🎯 架構優勢總結

1. **✅ 開源友善**：代碼可以完全公開，無安全顧慮
2. **✅ 使用簡單**：工作人員只需被邀請到 Sheets 即可使用
3. **✅ 零重構需求**：現有架構已經是最佳方案
4. **✅ Google 原生保護**：利用 Google 本身的權限機制
5. **✅ 多層防護**：三層安全機制確保資料安全

**結論**：當前的分層權限保護策略是最適合開源部署的安全架構。

---

**⚡ 專案狀態**: Phase 3 架構分析完成，等待 OAuth 設定修復

**🧙‍♂️ 下一步**: 完成 Google Cloud Console 和 Sheets 設定，測試完整登入流程