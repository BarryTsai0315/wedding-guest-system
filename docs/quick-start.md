# 婚禮系統快速啟動說明

## 啟動步驟

### 1. 開啟終端機
在項目根目錄 `WeddingSystem` 下執行以下命令

### 2. 啟動 HTTP 服務器
```bash
# 方法 1: Python 3 (推薦)
python3 -m http.server 8000

# 方法 2: Python 2 (備用)
python -m SimpleHTTPServer 8000
```

### 3. 訪問網站
伺服器啟動後，在瀏覽器中打開以下地址：

- **報到畫面**: http://localhost:8000/src/pages/checkin.html
- **報到清單**: http://localhost:8000/src/pages/guestlist.html

### 4. 停止服務器

#### 方法 1: 快捷鍵（推薦）
在啟動 server 的終端機視窗中按：
```
Ctrl + C
```

#### 方法 2: 關閉終端機
直接關閉執行伺服器的終端機視窗

#### 方法 3: 強制終止進程
如果上述方法無效：
```bash
# 1. 查找佔用端口的進程
lsof -ti:8000

# 2. 強制終止進程（將 PID 替換為查到的數字）
kill -9 <PID>
```

#### 確認停止成功
- 瀏覽器訪問 `http://localhost:8000` 應顯示「無法連接」
- 終端顯示 `KeyboardInterrupt` 並回到命令提示符

## 注意事項

1. 確保在 `WeddingSystem` 項目根目錄執行命令
2. 預設端口是 8000，如需更改可指定其他端口：
   ```bash
   python3 -m http.server 3000
   ```
3. 服務器啟動後，終端機會顯示 `Serving HTTP on 0.0.0.0 port 8000...`
4. 如果端口被占用，會顯示錯誤訊息，請嘗試其他端口

## 替代方案

如果 Python 不可用，也可使用其他工具：

- **Node.js**: `npx http-server`
- **PHP**: `php -S localhost:8000`
- **VS Code**: Live Server 擴展功能

## 故障排除

- **Python 找不到**: 嘗試使用 `python` 而非 `python3`
- **端口占用**: 更換其他端口號（如 3000, 5000）
- **無法訪問**: 檢查防火牆設置