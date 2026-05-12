// 权限与用户管理 — Supabase 版
// 依赖：supabase-client.js, api.js
(function() {
    // 缓存当前用户信息
    let _currentUser = null;

    // 获取当前用户信息（异步，带缓存）
    async function fetchCurrentUser() {
        if (_currentUser) return _currentUser;
        _currentUser = await apiGetCurrentUser();
        return _currentUser;
    }

    // 清除缓存
    function clearUserCache() {
        _currentUser = null;
    }

    // 获取当前会话（兼容旧代码，返回 Promise）
    window.getSession = async function() {
        const user = await fetchCurrentUser();
        if (!user) return null;
        return {
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            id: user.id
        };
    };

    // 检查是否已登录（同步版本，基于 session 缓存）
    window.isLoggedIn = function() {
        return !!_currentUser;
    };

    // 检查是否是管理员（同步版本）
    window.isAdmin = function() {
        return _currentUser && _currentUser.role === 'admin';
    };

    // 获取当前用户名（同步版本）
    window.getCurrentUser = function() {
        return _currentUser ? _currentUser.username : null;
    };

    // 获取当前用户 ID
    window.getCurrentUserId = function() {
        return _currentUser ? _currentUser.id : null;
    };

    // 用户注册
    window.doRegister = async function() {
        const usernameInput = document.getElementById('regUsername');
        const passwordInput = document.getElementById('regPassword');
        const confirmInput = document.getElementById('regConfirm');
        const errorDiv = document.getElementById('registerError');

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        const confirm = confirmInput ? confirmInput.value : '';

        if (!username) {
            if (errorDiv) errorDiv.textContent = '请输入用户名';
            return;
        }
        if (!password) {
            if (errorDiv) errorDiv.textContent = '请输入密码';
            return;
        }
        if (password !== confirm) {
            if (errorDiv) errorDiv.textContent = '两次输入的密码不一致';
            return;
        }
        if (password.length < 6) {
            if (errorDiv) errorDiv.textContent = '密码长度至少6位';
            return;
        }

        const result = await apiRegister(username, password);
        if (result.success) {
            if (errorDiv) errorDiv.textContent = '';
            closeRegisterModal();
            // 注册后自动登录
            const loginResult = await apiLogin(username, password);
            if (loginResult.success) {
                clearUserCache();
                await fetchCurrentUser();
            }
            updateNavForAuth();
            window.location.reload();
        } else {
            if (errorDiv) errorDiv.textContent = result.message;
        }
    };

    // 用户登录
    window.doLogin = async function() {
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        const errorDiv = document.getElementById('loginError');

        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';

        if (!username || !password) {
            if (errorDiv) errorDiv.textContent = '请输入用户名和密码';
            return;
        }

        const result = await apiLogin(username, password);
        if (result.success) {
            clearUserCache();
            await fetchCurrentUser();
            if (errorDiv) errorDiv.textContent = '';
            closeLoginModal();
            updateNavForAuth();
            window.location.reload();
        } else {
            if (errorDiv) errorDiv.textContent = result.message;
            if (passwordInput) passwordInput.value = '';
        }
    };

    // 登出
    window.logout = async function() {
        await apiLogout();
        clearUserCache();
        updateNavForAuth();
        window.location.href = 'index.html';
    };

    // 显示登录框
    window.showLoginModal = function() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('show');
            setTimeout(() => {
                const input = document.getElementById('loginUsername');
                if (input) input.focus();
            }, 100);
        }
    };

    // 关闭登录框
    window.closeLoginModal = function() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('show');
            const errorDiv = document.getElementById('loginError');
            if (errorDiv) errorDiv.textContent = '';
        }
    };

    // 显示注册框
    window.showRegisterModal = function() {
        closeLoginModal();
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.classList.add('show');
            setTimeout(() => {
                const input = document.getElementById('regUsername');
                if (input) input.focus();
            }, 100);
        }
    };

    // 关闭注册框
    window.closeRegisterModal = function() {
        const modal = document.getElementById('registerModal');
        if (modal) {
            modal.classList.remove('show');
            const errorDiv = document.getElementById('registerError');
            if (errorDiv) errorDiv.textContent = '';
        }
    };

    // 更新导航栏显示
    window.updateNavForAuth = function() {
        const user = _currentUser;
        const navAdmin = document.getElementById('navAdmin');
        const navConfig = document.getElementById('navConfig');
        const navLogin = document.getElementById('navLogin');
        const navLogout = document.getElementById('navLogout');
        const navUserLabel = document.getElementById('navUserLabel');
        const loginHint = document.getElementById('loginHint');

        if (user) {
            if (navAdmin) navAdmin.style.display = 'inline-block';
            if (navConfig) navConfig.style.display = user.role === 'admin' ? 'inline-block' : 'none';
            if (navLogin) navLogin.style.display = 'none';
            if (navLogout) navLogout.style.display = 'inline-block';
            if (navUserLabel) {
                navUserLabel.style.display = 'inline-block';
                navUserLabel.textContent = user.displayName || user.username;
            }
            if (loginHint) loginHint.style.display = 'none';
        } else {
            if (navAdmin) navAdmin.style.display = 'none';
            if (navConfig) navConfig.style.display = 'none';
            if (navLogin) navLogin.style.display = 'inline-block';
            if (navLogout) navLogout.style.display = 'none';
            if (navUserLabel) navUserLabel.style.display = 'none';
            if (loginHint) loginHint.style.display = 'block';
        }
    };

    // 保护管理员页面（改为异步）
    window.protectAdminPage = async function() {
        if (!isLoggedIn()) {
            alert('请先登录');
            window.location.href = 'index.html';
            return false;
        }
        if (!isAdmin()) {
            alert('需要管理员权限');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    };

    // ==================== 用户管理 API（管理员）====================

    // 获取用户列表（同步 wrapper，使用缓存）
    let _cachedUserList = null;
    let _cachedUserListTime = 0;

    window.getUserList = async function() {
        const users = await apiGetUserList();
        _cachedUserList = users;
        _cachedUserListTime = Date.now();
        return users.map(u => ({
            username: u.username,
            role: u.role,
            createdAt: u.createdAt
        }));
    };

    // 修改用户角色
    window.changeUserRole = async function(username, newRole) {
        const users = _cachedUserList || [];
        const user = users.find(u => u.username === username);
        if (!user) return { success: false, message: '用户不存在' };

        const currentUser = _currentUser;
        if (currentUser && currentUser.username === username) {
            return { success: false, message: '不能修改自己的角色' };
        }
        if (newRole !== 'admin' && newRole !== 'user') {
            return { success: false, message: '无效的角色' };
        }

        const result = await apiChangeUserRole(user.id, newRole);
        if (result.success) {
            _cachedUserList = null; // 清除缓存
        }
        return result;
    };

    // 重置用户密码
    window.resetUserPassword = function(username, newPassword) {
        if (!newPassword || newPassword.length < 6) {
            return { success: false, message: '密码长度至少6位' };
        }
        // Supabase 前端无法重置其他用户密码
        return { success: false, message: '前端无法重置密码，请前往 Supabase Dashboard 操作' };
    };

    // 删除用户
    window.deleteUser = async function(username) {
        const currentUser = _currentUser;
        if (currentUser && currentUser.username === username) {
            return { success: false, message: '不能删除自己' };
        }
        const users = _cachedUserList || [];
        const user = users.find(u => u.username === username);
        if (!user) return { success: false, message: '用户不存在' };

        const result = await apiDeleteUser(user.id);
        if (result.success) {
            _cachedUserList = null;
        }
        return result;
    };

    // 获取用户数量统计
    window.getUserStats = async function() {
        const stats = await apiGetUserStats();
        return stats;
    };

    // 保护已登录页面
    window.protectLoggedInPage = async function() {
        if (!isLoggedIn()) {
            alert('请先登录');
            window.location.href = 'index.html';
            return false;
        }
        return true;
    };

    // 导出初始化 Promise，其他页面可以 await authReady 后再执行自己的初始化
    // 立即开始初始化（不等待 DOMContentLoaded），因为 session 恢复不依赖 DOM
    window.authReady = (async function() {
        try {
            await fetchCurrentUser();
        } catch (e) {
            console.error('初始化用户状态失败:', e);
            clearUserCache();
        }
        // 等待 DOM 就绪后再更新 UI 和绑定事件
        await new Promise(function(resolve) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
        updateNavForAuth();

        // 登录框点击外部关闭
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            loginModal.addEventListener('click', function(e) {
                if (e.target === loginModal) closeLoginModal();
            });
        }

        // 注册框点击外部关闭
        const registerModal = document.getElementById('registerModal');
        if (registerModal) {
            registerModal.addEventListener('click', function(e) {
                if (e.target === registerModal) closeRegisterModal();
            });
        }
    })();

})();
