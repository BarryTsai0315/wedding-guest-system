/**
 * 🔒 WeddingAuth 停用版本
 *
 * 本專案已移除 Google OAuth 驗證，保留此模組僅為了提供 UI 及其他程式碼的安全介面。
 * 若未來需要恢復登入，請參考 Git 歷史中的完整實作。
 */

const disabledAuth = {
  isInitialized: false,
  isAuthenticated() {
    return false;
  },
  isAdmin() {
    return false;
  },
  isStaff() {
    return false;
  },
  getUserInfo() {
    return null;
  },
  getUserRole() {
    return 'guest';
  },
  signIn() {
    alert('登入功能已停用，無需驗證即可使用系統。');
  },
  signOut() {
    alert('登入功能已停用。');
  },
  updateUI() {
    const authStatus = document.getElementById('auth-status');
    if (authStatus) {
      authStatus.textContent = '訪客模式';
    }

    const loginButton = document.getElementById('ministry-login');
    if (loginButton) {
      loginButton.innerHTML = `
        <span class="material-symbols-outlined">visibility_off</span>
        <span>登入已停用</span>
      `;
    }

    const adminSection = document.getElementById('admin-section');
    if (adminSection) {
      adminSection.classList.add('hidden');
    }
  }
};

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    if (typeof window !== 'undefined') {
      window.weddingAuth = disabledAuth;
    }
    disabledAuth.updateUI();
    console.info('OAuth 模組已停用，系統以訪客模式運行。');
  });
}

// 匯出給其他模組使用（保留 CommonJS 相容性）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = disabledAuth;
}
