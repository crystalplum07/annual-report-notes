// 配置管理 — Supabase 版
// 依赖：supabase-client.js, api.js
(function() {
    // 默认配置
    const defaultConfig = {
            companies: ['xx集团','XX公司','内部'],
            materials: ['年报对标分析'],
            speakers: ['客户问题','客户答复'],
            statuses: ['进行中', '已完成'],
        defaults: {
            shareDateOffset: 0,
            kpLeader: '',
            followUpStatus: '进行中'
        }
    };

    // 配置缓存
    let _configCache = null;

    // 获取配置（异步，带缓存）
    window.getConfig = async function() {
        if (_configCache) return _configCache;
        try {
            const config = await apiGetConfig();
            _configCache = config;
            return config;
        } catch (e) {
            console.error('读取配置失败:', e);
            return JSON.parse(JSON.stringify(defaultConfig));
        }
    };

    // 清除配置缓存
    function clearConfigCache() {
        _configCache = null;
    }

    // 保存配置（异步）
    window.saveConfigData = async function(config) {
        try {
            const result = await apiSaveConfig(config);
            if (result.success) {
                clearConfigCache();
                _configCache = config;
            }
            return result.success;
        } catch (e) {
            console.error('保存配置失败:', e);
            return false;
        }
    };

    // 加载配置到页面（异步）
    window.loadConfigToPage = async function() {
        const config = await getConfig();

        const companyTextarea = document.getElementById('companyConfig');
        const materialTextarea = document.getElementById('materialConfig');
        const speakerTextarea = document.getElementById('speakerConfig');
        const statusTextarea = document.getElementById('statusConfig');

        if (companyTextarea) companyTextarea.value = (config.companies || []).join('\n');
        if (materialTextarea) materialTextarea.value = (config.materials || []).join('\n');
        if (speakerTextarea) speakerTextarea.value = (config.speakers || []).join('\n');
        if (statusTextarea) statusTextarea.value = (config.statuses || []).join('\n');

        // 加载默认值配置
        const defaults = config.defaults || defaultConfig.defaults;
        const shareDateOffsetInput = document.getElementById('shareDateOffsetConfig');
        const kpLeaderDefaultInput = document.getElementById('kpLeaderDefaultConfig');
        const followUpStatusDefaultSelect = document.getElementById('followUpStatusDefaultConfig');

        if (shareDateOffsetInput) shareDateOffsetInput.value = defaults.shareDateOffset || 0;
        if (kpLeaderDefaultInput) kpLeaderDefaultInput.value = defaults.kpLeader || '';
        if (followUpStatusDefaultSelect) {
            followUpStatusDefaultSelect.innerHTML = (config.statuses || defaultConfig.statuses).map(s =>
                `<option value="${escapeHtml(s)}" ${s === (defaults.followUpStatus || '进行中') ? 'selected' : ''}>${escapeHtml(s)}</option>`
            ).join('');
        }
    };

    // 保存页面上的配置（异步）
    window.saveConfig = async function() {
        const companyTextarea = document.getElementById('companyConfig');
        const materialTextarea = document.getElementById('materialConfig');
        const speakerTextarea = document.getElementById('speakerConfig');
        const statusTextarea = document.getElementById('statusConfig');
        const shareDateOffsetInput = document.getElementById('shareDateOffsetConfig');
        const kpLeaderDefaultInput = document.getElementById('kpLeaderDefaultConfig');
        const followUpStatusDefaultSelect = document.getElementById('followUpStatusDefaultConfig');

        const config = {
            companies: (companyTextarea ? companyTextarea.value : '').split('\n').map(s => s.trim()).filter(s => s),
            materials: (materialTextarea ? materialTextarea.value : '').split('\n').map(s => s.trim()).filter(s => s),
            speakers: (speakerTextarea ? speakerTextarea.value : '').split('\n').map(s => s.trim()).filter(s => s),
            statuses: (statusTextarea ? statusTextarea.value : '').split('\n').map(s => s.trim()).filter(s => s),
            defaults: {
                shareDateOffset: parseInt(shareDateOffsetInput ? shareDateOffsetInput.value : 0, 10) || 0,
                kpLeader: kpLeaderDefaultInput ? kpLeaderDefaultInput.value.trim() : '',
                followUpStatus: followUpStatusDefaultSelect ? followUpStatusDefaultSelect.value : '进行中'
            }
        };

        if (await saveConfigData(config)) {
            const modal = document.getElementById('configModal');
            if (modal) modal.classList.add('show');
        } else {
            alert('保存失败');
        }
    };

    // 恢复默认（异步）
    window.resetConfig = async function() {
        if (!confirm('确定要恢复默认配置吗？当前配置将被覆盖。')) return;
        await saveConfigData(JSON.parse(JSON.stringify(defaultConfig)));
        await loadConfigToPage();
        const modal = document.getElementById('configModal');
        if (modal) {
            modal.querySelector('h2').textContent = '已恢复默认';
            modal.querySelector('p').textContent = '配置已恢复为默认设置。';
            modal.classList.add('show');
        }
    };

    // 关闭配置成功提示
    window.closeConfigModal = function() {
        const modal = document.getElementById('configModal');
        if (modal) modal.classList.remove('show');
    };

    // 填充下拉框（用于 index.html，异步）
    window.populateSelects = async function() {
        const config = await getConfig();

        // 公司名称
        const companySelect = document.getElementById('company');
        if (companySelect) {
            const currentValue = companySelect.value;
            companySelect.innerHTML = '<option value="">请选择公司</option>' +
                (config.companies || []).map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
            companySelect.value = currentValue;
        }

        // 分享材料
        const materialSelect = document.getElementById('shareMaterial');
        if (materialSelect) {
            const currentValue = materialSelect.value;
            materialSelect.innerHTML = '<option value="">请选择材料</option>' +
                (config.materials || []).map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
            materialSelect.value = currentValue;
        }

        // 跟进状态（所有 .status-select）
        const statusSelects = document.querySelectorAll('.status-select');
        statusSelects.forEach(select => {
            const currentValue = select.value;
            select.innerHTML = (config.statuses || []).map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
            if (currentValue && (config.statuses || []).includes(currentValue)) {
                select.value = currentValue;
            }
        });
    };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 页面加载初始化由 config.html 内联脚本负责（需等待 authReady）
    // 这里不注册 DOMContentLoaded，避免竞态

})();
