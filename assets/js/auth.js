/**
 * 🔐 霍格華茲婚禮系統 - Google OAuth 驗證模組
 *
 * 功能：
 * - Google OAuth 2.0 驗證
 * - 權限檢查 (admin/staff)
 * - localStorage 狀態管理
 * - 自動登入檢查
 */

class WeddingAuth {
    constructor() {
        this.isInitialized = false;
        this.currentUser = null;
        this.userRole = null;

        // OAuth 配置 (從 config.js 讀取)
        this.clientId = window.CONFIG?.GOOGLE_CLIENT_ID || '';
        this.staffCheckUrl = window.CONFIG?.GOOGLE_SCRIPT_URL || '';

        // localStorage 鍵值
        this.STORAGE_KEYS = {
            USER_TOKEN: 'wedding_auth_token',
            USER_INFO: 'wedding_user_info',
            USER_ROLE: 'wedding_user_role',
            LAST_CHECK: 'wedding_last_auth_check'
        };

        // 權限等級
        this.ROLES = {
            GUEST: 'guest',
            STAFF: 'staff',
            ADMIN: 'admin'
        };

        // Token 有效期 (24小時)
        this.TOKEN_EXPIRY = 24 * 60 * 60 * 1000;

        this.init();
    }

    /**
     * 初始化 OAuth 系統
     */
    async init() {
        try {
            // 檢查必要配置
            if (!this.clientId) {
                console.warn('⚠️ Google Client ID 未設定，OAuth 功能將無法使用');
                return;
            }

            // 載入 Google OAuth SDK
            await this.loadGoogleSDK();

            // 初始化 OAuth
            await this.initializeOAuth();

            // 檢查現有登入狀態
            await this.checkExistingAuth();

            this.isInitialized = true;

            console.log('✅ OAuth 驗證系統已初始化');

        } catch (error) {
            console.error('❌ OAuth 初始化失敗:', error);
        }
    }

    /**
     * 載入 Google OAuth SDK
     */
    loadGoogleSDK() {
        return new Promise((resolve, reject) => {
            // 檢查是否已載入
            if (window.google && window.google.accounts) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;

            script.onload = () => {
                console.log('📦 Google OAuth SDK 已載入');
                resolve();
            };

            script.onerror = () => {
                reject(new Error('Google OAuth SDK 載入失敗'));
            };

            document.head.appendChild(script);
        });
    }

    /**
     * 初始化 OAuth 配置
     */
    async initializeOAuth() {
        if (!window.google?.accounts) {
            throw new Error('Google OAuth SDK 未正確載入');
        }

        // 初始化 OAuth 客戶端
        window.google.accounts.id.initialize({
            client_id: this.clientId,
            callback: this.handleCredentialResponse.bind(this),
            auto_select: false,
            cancel_on_tap_outside: true
        });

        console.log('🔧 Google OAuth 已配置');
    }

    /**
     * 檢查現有驗證狀態
     */
    async checkExistingAuth() {
        const storedToken = localStorage.getItem(this.STORAGE_KEYS.USER_TOKEN);
        const storedInfo = localStorage.getItem(this.STORAGE_KEYS.USER_INFO);
        const lastCheck = localStorage.getItem(this.STORAGE_KEYS.LAST_CHECK);

        if (storedToken && storedInfo && lastCheck) {
            const tokenAge = Date.now() - parseInt(lastCheck);

            if (tokenAge < this.TOKEN_EXPIRY) {
                // Token 仍有效，恢復登入狀態
                try {
                    const userInfo = JSON.parse(storedInfo);
                    const userRole = localStorage.getItem(this.STORAGE_KEYS.USER_ROLE);

                    this.currentUser = userInfo;
                    this.userRole = userRole || this.ROLES.GUEST;

                    this.updateUI();

                    console.log('🔄 已恢復登入狀態:', userInfo.name);

                } catch (error) {
                    console.error('恢復登入狀態失敗:', error);
                    this.clearAuthData();
                }
            } else {
                // Token 已過期
                console.log('⏰ 登入 Token 已過期');
                this.clearAuthData();
            }
        }
    }

    /**
     * 處理 Google OAuth 回應
     */
    async handleCredentialResponse(response) {
        try {
            // 解析 JWT Token
            const userInfo = this.parseJWT(response.credential);

            console.log('👤 用戶登入:', userInfo);

            // 檢查用戶權限
            const userRole = await this.checkUserPermission(userInfo.email);

            if (userRole === this.ROLES.GUEST) {
                alert('❌ 您沒有系統使用權限，請聯繫管理員');
                return;
            }

            // 保存登入狀態
            this.currentUser = userInfo;
            this.userRole = userRole;

            this.saveAuthData(response.credential, userInfo, userRole);
            this.updateUI();

            alert(`✅ 歡迎回來，${userInfo.name}！\n權限等級：${userRole === this.ROLES.ADMIN ? '管理員' : '一般工作人員'}`);

        } catch (error) {
            console.error('登入處理失敗:', error);
            alert('❌ 登入失敗，請重試');
        }
    }

    /**
     * 解析 JWT Token
     */
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64).split('').map(c =>
                    '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
                ).join('')
            );

            return JSON.parse(jsonPayload);
        } catch (error) {
            throw new Error('JWT Token 解析失敗');
        }
    }

    /**
     * 檢查用戶權限
     */
    async checkUserPermission(email) {
        try {
            // 如果沒有設定權限檢查 URL，預設為 staff
            if (!this.staffCheckUrl) {
                console.warn('⚠️ 未設定權限檢查 URL，預設為 staff 權限');
                return this.ROLES.STAFF;
            }

            // 呼叫 Google Apps Script 檢查權限
            const response = await this.callPermissionAPI(email);

            if (response.error) {
                console.error('權限檢查錯誤:', response.error);
                return this.ROLES.GUEST;
            }

            return response.role || this.ROLES.GUEST;

        } catch (error) {
            console.error('權限檢查失敗:', error);
            return this.ROLES.GUEST;
        }
    }

    /**
     * 呼叫權限檢查 API
     */
    callPermissionAPI(email) {
        return new Promise((resolve, reject) => {
            // 清理之前的 JSONP script
            const oldScript = document.querySelector('script[data-jsonp="auth-check"]');
            if (oldScript) {
                oldScript.remove();
            }

            // 設定回調函數
            const callbackName = 'authCheckCallback';
            window[callbackName] = function(response) {
                resolve(response);
                delete window[callbackName];
            };

            // 建立 JSONP 請求
            const script = document.createElement('script');
            script.setAttribute('data-jsonp', 'auth-check');

            const params = new URLSearchParams({
                action: 'checkPermission',
                email: email,
                callback: callbackName,
                _t: Date.now()
            });

            script.src = `${this.staffCheckUrl}?${params.toString()}`;

            script.onerror = () => {
                reject(new Error('權限檢查 API 呼叫失敗'));
                delete window[callbackName];
            };

            document.head.appendChild(script);

            // 10秒超時
            setTimeout(() => {
                if (window[callbackName]) {
                    reject(new Error('權限檢查超時'));
                    delete window[callbackName];
                    if (script.parentNode) {
                        script.parentNode.removeChild(script);
                    }
                }
            }, 10000);
        });
    }

    /**
     * 保存驗證資料
     */
    saveAuthData(token, userInfo, userRole) {
        localStorage.setItem(this.STORAGE_KEYS.USER_TOKEN, token);
        localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
        localStorage.setItem(this.STORAGE_KEYS.USER_ROLE, userRole);
        localStorage.setItem(this.STORAGE_KEYS.LAST_CHECK, Date.now().toString());
    }

    /**
     * 清除驗證資料
     */
    clearAuthData() {
        Object.values(this.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });

        this.currentUser = null;
        this.userRole = null;
        this.updateUI();
    }

    /**
     * 登入
     */
    async signIn() {
        if (!this.isInitialized) {
            alert('❌ OAuth 系統尚未初始化，請稍後再試');
            return;
        }

        try {
            // 顯示 Google 登入提示
            window.google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // 如果無法顯示提示，使用彈出式視窗
                    this.showSignInPopup();
                }
            });

        } catch (error) {
            console.error('登入失敗:', error);
            alert('❌ 登入失敗，請重試');
        }
    }

    /**
     * 顯示登入彈出式視窗
     */
    showSignInPopup() {
        window.google.accounts.id.renderButton(
            document.getElementById('temp-signin-button') || this.createTempButton(),
            {
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular'
            }
        );
    }

    /**
     * 建立臨時登入按鈕
     */
    createTempButton() {
        const button = document.createElement('div');
        button.id = 'temp-signin-button';
        button.style.position = 'fixed';
        button.style.top = '50%';
        button.style.left = '50%';
        button.style.transform = 'translate(-50%, -50%)';
        button.style.zIndex = '10000';
        button.style.backgroundColor = 'white';
        button.style.padding = '20px';
        button.style.borderRadius = '8px';
        button.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';

        document.body.appendChild(button);

        // 5秒後自動移除
        setTimeout(() => {
            if (button.parentNode) {
                button.parentNode.removeChild(button);
            }
        }, 5000);

        return button;
    }

    /**
     * 登出
     */
    signOut() {
        this.clearAuthData();
        alert('✅ 已成功登出');

        // 重新載入頁面以重置狀態
        window.location.reload();
    }

    /**
     * 檢查是否已登入
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * 檢查是否為管理員
     */
    isAdmin() {
        return this.userRole === this.ROLES.ADMIN;
    }

    /**
     * 檢查是否為工作人員（包含管理員）
     */
    isStaff() {
        return this.userRole === this.ROLES.STAFF || this.userRole === this.ROLES.ADMIN;
    }

    /**
     * 取得用戶資訊
     */
    getUserInfo() {
        return this.currentUser;
    }

    /**
     * 取得用戶角色
     */
    getUserRole() {
        return this.userRole;
    }

    /**
     * 更新 UI 顯示
     */
    updateUI() {
        // 更新狀態指示器
        const authStatus = document.getElementById('auth-status');
        const loginButton = document.getElementById('ministry-login');
        const adminSection = document.getElementById('admin-section');

        if (this.isAuthenticated()) {
            // 已登入狀態
            if (authStatus) {
                authStatus.textContent = `${this.currentUser.name} (${this.isAdmin() ? '管理員' : '工作人員'})`;
            }

            if (loginButton) {
                loginButton.innerHTML = `
                    <span class="material-symbols-outlined">logout</span>
                    <span>登出</span>
                `;
                loginButton.onclick = () => this.signOut();
            }

            // 顯示管理員區域
            if (adminSection && this.isAdmin()) {
                adminSection.classList.remove('hidden');
            }

        } else {
            // 未登入狀態
            if (authStatus) {
                authStatus.textContent = '訪客模式';
            }

            if (loginButton) {
                loginButton.innerHTML = `
                    <span class="material-symbols-outlined">badge</span>
                    <span>魔法部驗證</span>
                `;
                loginButton.onclick = () => this.signIn();
            }

            // 隱藏管理員區域
            if (adminSection) {
                adminSection.classList.add('hidden');
            }
        }
    }
}

// 全域實例
window.weddingAuth = null;

// DOM 載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    window.weddingAuth = new WeddingAuth();
});

// 匯出給其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WeddingAuth;
}