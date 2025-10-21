/**
 * 🔓 API 輔助函數（無驗證版本）
 *
 * Google OAuth 已停用，所有請求都以公開模式呼叫 Apps Script。
 * 保留既有介面以減少前端其他模組的變動。
 */

class APIHelper {
  constructor() {
    this.scriptUrl = window.CONFIG?.GOOGLE_SCRIPT_URL || '';
  }

  /**
   * 取得儲存的 Token（登入停用後恆為 null）
   */
  getToken() {
    return null;
  }

  /**
   * 檢查是否已登入（登入停用後恆為 true）
   */
  isAuthenticated() {
    return true;
  }

  /**
   * 建立請求 URL
   */
  buildURL(baseUrl, params = {}) {
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.append(key, params[key]);
      }
    });
    return url.toString();
  }

  /**
   * JSONP 請求
   */
  jsonpRequest(params = {}) {
    return new Promise((resolve, reject) => {
      const callbackName = 'apiCallback_' + Date.now();
      window[callbackName] = function(response) {
        if (response && response.error) {
          reject(new Error(response.error || response.message || '系統錯誤'));
        } else {
          resolve(response);
        }
        delete window[callbackName];
      };

      params.callback = callbackName;

      const script = document.createElement('script');
      const url = new URL(this.scriptUrl);
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });

      script.src = url.toString();
      script.onerror = () => {
        reject(new Error('API 呼叫失敗'));
        delete window[callbackName];
      };

      document.head.appendChild(script);

      // 30秒超時
      setTimeout(() => {
        if (window[callbackName]) {
          reject(new Error('API 請求超時'));
          delete window[callbackName];
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        }
      }, 30000);
    });
  }

  /**
   * Fetch 請求 - 用於 POST
   */
  async fetchRequest(method, data = {}) {
    try {
      const response = await fetch(this.scriptUrl, {
        method: method,
        mode: 'cors',
        cache: 'no-cache',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error || result.message || '系統錯誤');
      }

      return result;

    } catch (error) {
      console.error('API 請求失敗:', error);
      throw error;
    }
  }

  /**
   * 取得賓客清單
   */
  async getGuestList(page = 1, limit = 20, search = '') {
    return this.jsonpRequest({
      action: 'getGuests',
      page: page,
      limit: limit,
      search: search
    });
  }

  /**
   * 取得家庭資訊
   */
  async getFamilyInfo(guestName) {
    return this.jsonpRequest({
      action: 'getFamilyInfo',
      guestName: guestName
    });
  }

  /**
   * 報到
   */
  async checkIn(guestData) {
    const payload = Object.assign({}, guestData);
    if (!payload.action) {
      payload.action = 'checkIn';
    }
    return this.fetchRequest('POST', payload);
  }

  /**
   * 處理未授權錯誤（登入停用後改為提示）
   */
  handleUnauthorized() {
    alert('登入功能已停用，所有操作均以訪客模式執行。');
  }
}

// 全域實例
if (typeof window !== 'undefined') {
  window.apiHelper = new APIHelper();
}

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIHelper;
}
