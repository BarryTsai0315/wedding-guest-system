/**
 * 🔐 API 輔助函數 - 自動附加 Token
 *
 * 功能：
 * - 統一管理所有 API 呼叫
 * - 自動從 localStorage 取得 Token
 * - 自動附加 Token 到請求中
 * - 處理未授權錯誤
 */

class APIHelper {
    constructor() {
        this.scriptUrl = window.CONFIG?.GOOGLE_SCRIPT_URL || '';
        this.tokenKey = 'wedding_auth_token';
    }

    /**
     * 取得儲存的 Token
     */
    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    /**
     * 檢查是否已登入
     */
    isAuthenticated() {
        return !!this.getToken();
    }

    /**
     * 建立帶 Token 的 URL
     */
    buildURL(baseUrl, params = {}) {
        const token = this.getToken();
        if (token) {
            params.token = token;
        }

        const url = new URL(baseUrl);
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                url.searchParams.append(key, params[key]);
            }
        });

        return url.toString();
    }

    /**
     * JSONP 請求（帶 Token）
     */
    jsonpRequest(params = {}) {
        return new Promise((resolve, reject) => {
            const token = this.getToken();
            if (token) {
                params.token = token;
            }

            const callbackName = 'apiCallback_' + Date.now();
            window[callbackName] = function(response) {
                // 檢查是否為未授權錯誤
                if (response.error || response.authorized === false) {
                    reject(new Error(response.error || response.message || '請先登入'));
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
     * Fetch 請求（帶 Token）- 用於 POST
     */
    async fetchRequest(method, data = {}) {
        const token = this.getToken();
        if (token) {
            data.token = token;
        }

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

            // 檢查是否為未授權錯誤
            if (result.error || result.authorized === false) {
                throw new Error(result.error || result.message || '請先登入');
            }

            return result;

        } catch (error) {
            console.error('API 請求失敗:', error);
            throw error;
        }
    }

    /**
     * 取得賓客清單（帶 Token）
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
     * 取得家庭資訊（帶 Token）
     */
    async getFamilyInfo(guestName) {
        return this.jsonpRequest({
            action: 'getFamilyInfo',
            guestName: guestName
        });
    }

    /**
     * 報到（帶 Token）
     */
    async checkIn(guestData) {
        return this.fetchRequest('POST', guestData);
    }

    /**
     * 處理未授權錯誤
     */
    handleUnauthorized() {
        alert('⚠️ 您的登入已過期，請重新登入');
        localStorage.removeItem(this.tokenKey);
        window.location.href = '/index.html';
    }
}

// 全域實例
window.apiHelper = new APIHelper();

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIHelper;
}
