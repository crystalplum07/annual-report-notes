// 后台管理页面逻辑 — Supabase 版
// 依赖：supabase-client.js, api.js, config.js, auth.js
(function() {
  
    // 公司颜色映射
    const companyColors = {
        'xx集团': '#4A90D9',
        'XX公司': '#50E878',
        '内部': '#FF6B6B',
        '太平': '#4ECDC4',
        '太保集团': '#FFD166',
        '友邦人寿': '#EF476F',
        '长生': '#118AB2',
        'Cigna': '#073B4C',
        '安联': '#7209B7',
        '阳光': '#F77F00'
    };

    // 缓存记录和配置，避免频繁请求
    let _cachedRecords = null;
    let _cachedAllRecords = null;
    let _cachedConfig = null;

    // 获取配置（异步，带缓存）
    async function getConfig() {
        if (_cachedConfig) return _cachedConfig;
        _cachedConfig = await apiGetConfig();
        return _cachedConfig;
    }

    // 刷新配置缓存
    function refreshConfigCache() {
        _cachedConfig = null;
    }

    // 获取当前用户可见的记录（异步）
    async function getVisibleRecords() {
        if (_cachedRecords) return _cachedRecords;
        const records = await apiGetRecords({});
        _cachedRecords = records;
        return records;
    }

    // 获取所有记录（不受权限限制，用于统计）
    async function getAllRecords() {
        if (_cachedAllRecords) return _cachedAllRecords;
        const records = await apiGetAllRecords();
        _cachedAllRecords = records;
        return records;
    }

    // 清除记录缓存
    function refreshRecordCache() {
        _cachedRecords = null;
        _cachedAllRecords = null;
    }

    // 填充筛选下拉框（异步）
    async function populateFilters() {
        const config = await getConfig();

        const companyFilter = document.getElementById('filterCompany');
        if (companyFilter) {
            const current = companyFilter.value;
            let html = '<option value="all">全部公司</option>';
            (config.companies || []).forEach(c => {
                html += `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`;
            });
            companyFilter.innerHTML = html;
            companyFilter.value = current;
        }

        const materialFilter = document.getElementById('filterMaterial');
        if (materialFilter) {
            const current = materialFilter.value;
            let html = '<option value="all">全部材料</option>';
            (config.materials || []).forEach(m => {
                html += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
            });
            materialFilter.innerHTML = html;
            materialFilter.value = current;
        }
    }

    // 更新统计数据（异步）
    async function updateStats() {
        const config = await getConfig();
        const records = await getVisibleRecords();

        // 总计客户数 = 配置中的公司总数
        const totalCompanies = (config.companies || []).length;

        // 已分享客户 = 有记录的公司（去重）
        const sharedCompanies = new Set();
        // 管理员使用全部记录统计，普通用户使用自己的
        const session = typeof getSession === 'function' ? await getSession() : null;
        if (session && session.role === 'admin') {
            const allRecords = await getAllRecords();
            allRecords.forEach(r => {
                if (r.company) sharedCompanies.add(r.company);
            });
        } else {
            records.forEach(r => {
                if (r.company) sharedCompanies.add(r.company);
            });
        }

        // 待跟进中
        let pendingCount = 0;
        records.forEach(r => {
            if (r.followUpList) {
                r.followUpList.forEach(f => {
                    if (f.status === '进行中') pendingCount++;
                });
            }
        });

        const sharedCount = sharedCompanies.size;
        const ratio = totalCompanies > 0 ? Math.round(sharedCount / totalCompanies * 100) : 0;

        document.getElementById('totalCompanyCount').textContent = totalCompanies;
        document.getElementById('sharedCompanyCount').textContent = sharedCount;
        document.getElementById('sharedCompanyRatio').textContent = ratio + '%';
        document.getElementById('pendingCount').textContent = pendingCount;
    }

    // 显示已分享客户明细（异步）
    window.showSharedCompanyDetail = async function() {
        const records = await getVisibleRecords();
        const sharedCompanies = new Set();
        records.forEach(r => {
            if (r.company) sharedCompanies.add(r.company);
        });

        const content = document.getElementById('companyDetailContent');
        if (sharedCompanies.size === 0) {
            content.innerHTML = '<p style="color:#999;">暂无已分享客户</p>';
        } else {
            content.innerHTML = `
                <div class="detail-item">
                    <label>已分享客户列表</label>
                    <div class="value">
                        ${Array.from(sharedCompanies).map(c =>
                            `<span class="cell-category" style="background:${companyColors[c]||'#999'}20;color:${companyColors[c]||'#999'};margin:2px;display:inline-block;">${c}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }
        document.getElementById('companyDetailModal').classList.add('show');
    };

    window.closeCompanyDetailModal = function() {
        document.getElementById('companyDetailModal').classList.remove('show');
    };

    // 判断当前用户是否为管理员（同步，基于缓存）
    function isCurrentUserAdmin() {
        return typeof isAdmin === 'function' && isAdmin();
    }

    // 渲染记录列表（异步）
    async function renderRecords() {
        let records = await getVisibleRecords();
        const filterCompany = document.getElementById('filterCompany').value;
        const filterMaterial = document.getElementById('filterMaterial').value;
        const filterPage = document.getElementById('filterPage').value.trim().toLowerCase();
        const searchKeyword = document.getElementById('searchInput').value.trim().toLowerCase();
        const canEdit = isCurrentUserAdmin();

        // 客户端筛选（已经从 API 获取了权限过滤后的数据）
        if (filterCompany !== 'all') {
            records = records.filter(r => r.company === filterCompany);
        }
        if (filterMaterial !== 'all') {
            records = records.filter(r => r.shareMaterial === filterMaterial);
        }
        if (filterPage) {
            records = records.filter(r =>
                (r.qaList && r.qaList.some(q => q.page && q.page.toLowerCase().includes(filterPage))) ||
                (r.followUpList && r.followUpList.some(f => f.page && f.page.toLowerCase().includes(filterPage)))
            );
        }
        if (searchKeyword) {
            records = records.filter(r =>
                r.company.toLowerCase().includes(searchKeyword) ||
                (r.shareMaterial && r.shareMaterial.toLowerCase().includes(searchKeyword)) ||
                r.shareTarget.toLowerCase().includes(searchKeyword) ||
                (r.kpLeader && r.kpLeader.toLowerCase().includes(searchKeyword)) ||
                (r.qaList && r.qaList.some(q =>
                    (q.kpQuestion && q.kpQuestion.toLowerCase().includes(searchKeyword)) ||
                    (q.clientQuestion && q.clientQuestion.toLowerCase().includes(searchKeyword)) ||
                    (q.clientReply && q.clientReply.toLowerCase().includes(searchKeyword)) ||
                    (q.kpReply && q.kpReply.toLowerCase().includes(searchKeyword))
                )) ||
                (r.followUpList && r.followUpList.some(f =>
                    f.content && f.content.toLowerCase().includes(searchKeyword)
                ))
            );
        }

        const container = document.getElementById('feedbackRows');
        const emptyState = document.getElementById('emptyState');

        if (records.length === 0) {
            container.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        container.innerHTML = records.map(r => {
            const qaCount = r.qaList ? r.qaList.length : 0;
            const pendingFu = r.followUpList ? r.followUpList.filter(f => f.status === '进行中').length : 0;
            const followUpBadge = pendingFu > 0
                ? `<span class="cell-priority pri-urgent">${pendingFu} 进行中</span>`
                : (r.followUpList && r.followUpList.length > 0 ? '<span class="cell-priority pri-low">全部完成</span>' : '-');

            return `
                <div class="feedback-row" data-id="${r.id}">
                    <div class="td">${r.shareDate}</div>
                    <div class="td"><span class="cell-category" style="background:${companyColors[r.company]||'#999'}20;color:${companyColors[r.company]||'#999'};">${r.company}</span></div>
                    <div class="td">${escapeHtml(r.shareMaterial || '-')}</div>
                    <div class="td">${escapeHtml(r.shareTarget)}</div>
                    <div class="td">${escapeHtml(r.createdBy || '-')}</div>
                    <div class="td">${qaCount} 条</div>
                    <div class="td">${followUpBadge}</div>
                    <div class="td cell-actions">
                        <button class="btn-view" onclick="viewDetail('${r.id}')">查看</button>
                        ${canEdit ? `<button class="btn-status" onclick="editRecord('${r.id}')">编辑</button>
                        <button class="btn-status" onclick="deleteRecord('${r.id}')">删除</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // 渲染待跟进事项汇总（异步）
    async function renderFollowUpSummary() {
        const records = await getVisibleRecords();
        const container = document.getElementById('followUpRows');
        let index = 0;
        let rowsHtml = '';

        records.forEach(r => {
            if (r.followUpList) {
                r.followUpList.forEach(fu => {
                    index++;
                    rowsHtml += `
                        <div class="feedback-row">
                            <div class="td">${index}</div>
                            <div class="td">${escapeHtml(r.shareMaterial || '-')}</div>
                            <div class="td">${escapeHtml(fu.page || '-')}</div>
                            <div class="td">${escapeHtml(r.company)}</div>
                            <div class="td">${escapeHtml(r.kpLeader || '-')}</div>
                            <div class="td">${escapeHtml(fu.content || '')}</div>
                            <div class="td">-</div>
                            <div class="td"><span class="cell-status ${fu.status === '进行中' ? 'status-pending' : 'status-resolved'}">${fu.status}</span></div>
                        </div>
                    `;
                });
            }
        });

        container.innerHTML = rowsHtml || '<div class="empty-state" style="padding:30px;"><p>暂无待跟进事项</p></div>';
    }

    // 渲染客户信息汇总（异步）
    async function renderClientInfoSummary() {
        const records = await getVisibleRecords();
        const container = document.getElementById('clientInfoRows');
        let index = 0;
        let rowsHtml = '';

        records.forEach(r => {
            if (r.qaList) {
                r.qaList.forEach(qa => {
                    index++;
                    rowsHtml += `
                        <div class="feedback-row">
                            <div class="td">${index}</div>
                            <div class="td">${escapeHtml(r.shareMaterial || '-')}</div>
                            <div class="td">${escapeHtml(qa.page || '-')}</div>
                            <div class="td">${escapeHtml(r.company)}</div>
                            <div class="td">${escapeHtml(r.kpLeader || '-')}</div>
                            <div class="td">${escapeHtml(qa.kpQuestion || '-')}</div>
                            <div class="td">${escapeHtml(qa.clientReply || '-')}</div>
                            <div class="td">${escapeHtml(qa.clientQuestion || '-')}</div>
                            <div class="td">${escapeHtml(qa.kpReply || '-')}</div>
                        </div>
                    `;
                });
            }
        });

        container.innerHTML = rowsHtml || '<div class="empty-state" style="padding:30px;"><p>暂无客户问答数据</p></div>';
    }

    // 导出待跟进事项Excel（异步）
    window.exportFollowUpExcel = async function() {
        const records = await getVisibleRecords();
        const data = [['序号', '材料名称', '材料页码', '提问公司', 'KP负责人', '待跟进事项', '目前进度', '跟进状态']];
        let index = 0;
        records.forEach(r => {
            if (r.followUpList) {
                r.followUpList.forEach(fu => {
                    index++;
                    data.push([
                        index, r.shareMaterial || '', fu.page || '', r.company,
                        r.kpLeader || '', fu.content || '', '', fu.status || ''
                    ]);
                });
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '待跟进事项汇总');
        XLSX.writeFile(wb, '待跟进事项汇总.xlsx');
    };

    // 导出客户信息Excel（异步）
    window.exportClientInfoExcel = async function() {
        const records = await getVisibleRecords();
        const data = [['序号', '材料名称', '材料页码', '提问公司', 'KP负责人', 'KP问题', '客户回复', '客户问题', 'KP回复']];
        let index = 0;
        records.forEach(r => {
            if (r.qaList) {
                r.qaList.forEach(qa => {
                    index++;
                    data.push([
                        index, r.shareMaterial || '', qa.page || '', r.company,
                        r.kpLeader || '', qa.kpQuestion || '', qa.clientReply || '',
                        qa.clientQuestion || '', qa.kpReply || ''
                    ]);
                });
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '客户信息汇总');
        XLSX.writeFile(wb, '客户信息汇总.xlsx');
    };

    // HTML 转义
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 查看详情（异步）
    window.viewDetail = async function(id) {
        const record = await apiGetRecordById(id);
        if (!record) {
            alert('记录不存在或无权查看');
            return;
        }

        let qaHtml = '';
        if (record.qaList && record.qaList.length > 0) {
            qaHtml = `
                <div class="detail-section">
                    <h4>客户问答</h4>
                    ${record.qaList.map((qa, i) => `
                        <div class="detail-qa-item">
                            <div class="detail-qa-meta">
                                <span class="detail-qa-num">#${i + 1}</span>
                                ${qa.page ? `<span class="detail-qa-page">${escapeHtml(qa.page)}</span>` : ''}
                            </div>
                            ${qa.kpQuestion ? `<div class="detail-qa-line"><strong>KP 问题：</strong>${escapeHtml(qa.kpQuestion).replace(/\n/g, '<br>')}</div>` : ''}
                            ${qa.clientReply ? `<div class="detail-qa-line"><strong>客户回复：</strong>${escapeHtml(qa.clientReply).replace(/\n/g, '<br>')}</div>` : ''}
                            ${qa.clientQuestion ? `<div class="detail-qa-line"><strong>客户问题：</strong>${escapeHtml(qa.clientQuestion).replace(/\n/g, '<br>')}</div>` : ''}
                            ${qa.kpReply ? `<div class="detail-qa-line"><strong>KP 回复：</strong>${escapeHtml(qa.kpReply).replace(/\n/g, '<br>')}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        let followUpHtml = '';
        if (record.followUpList && record.followUpList.length > 0) {
            followUpHtml = `
                <div class="detail-section">
                    <h4>KP 待跟进事项</h4>
                    ${record.followUpList.map((fu, i) => `
                        <div class="detail-followup-item">
                            <div class="detail-followup-header">
                                <span class="detail-followup-num">#${i + 1}</span>
                                <span class="cell-status ${fu.status === '进行中' ? 'status-pending' : 'status-resolved'}">${fu.status}</span>
                            </div>
                            ${fu.page ? `<div class="detail-followup-progress"><strong>页码：</strong>${escapeHtml(fu.page)}</div>` : ''}
                            <div class="detail-followup-content">${escapeHtml(fu.content || '').replace(/\n/g, '<br>')}</div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <div class="detail-item">
                <label>公司</label>
                <div class="value"><span class="cell-category" style="background:${companyColors[record.company]||'#999'}20;color:${companyColors[record.company]||'#999'};">${record.company}</span></div>
            </div>
            <div class="detail-item">
                <label>分享日期</label>
                <div class="value">${record.shareDate}</div>
            </div>
            <div class="detail-item">
                <label>分享材料</label>
                <div class="value">${escapeHtml(record.shareMaterial || '-')}</div>
            </div>
            <div class="detail-item">
                <label>分享对象</label>
                <div class="value">${escapeHtml(record.shareTarget)}</div>
            </div>
            <div class="detail-item">
                <label>KP 负责人</label>
                <div class="value">${escapeHtml(record.kpLeader || '-')}</div>
            </div>
            <div class="detail-item">
                <label>录入人</label>
                <div class="value">${escapeHtml(record.createdBy || '-')}</div>
            </div>
            ${qaHtml}
            ${followUpHtml}
        `;

        document.getElementById('detailModal').classList.add('show');
    };

    window.closeDetailModal = function() {
        document.getElementById('detailModal').classList.remove('show');
    };

    // 编辑记录（异步）
    window.editRecord = async function(id) {
        const record = await apiGetRecordById(id);
        if (!record) {
            alert('记录不存在或无权编辑');
            return;
        }

        const config = await getConfig();
        const companyOptions = (config.companies || []).map(c =>
            `<option value="${escapeHtml(c)}" ${c === record.company ? 'selected' : ''}>${escapeHtml(c)}</option>`
        ).join('');
        const materialOptions = (config.materials || []).map(m =>
            `<option value="${escapeHtml(m)}" ${m === record.shareMaterial ? 'selected' : ''}>${escapeHtml(m)}</option>`
        ).join('');

        // 生成问答编辑块
        let qaEditHtml = '';
        if (record.qaList && record.qaList.length > 0) {
            qaEditHtml = record.qaList.map((qa, i) => `
                <div class="edit-qa-block" data-index="${i}">
                    <h5>问答 ${i + 1}</h5>
                    <div class="form-group">
                        <label>材料页码</label>
                        <input type="text" class="edit-qa-page" value="${escapeHtml(qa.page || '')}">
                    </div>
                    <div class="form-group">
                        <label>KP 问题</label>
                        <textarea class="edit-kp-question" rows="2">${escapeHtml(qa.kpQuestion || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>客户回复</label>
                        <textarea class="edit-client-reply" rows="2">${escapeHtml(qa.clientReply || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>客户问题</label>
                        <textarea class="edit-client-question" rows="2">${escapeHtml(qa.clientQuestion || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>KP 回复</label>
                        <textarea class="edit-kp-reply" rows="2">${escapeHtml(qa.kpReply || '')}</textarea>
                    </div>
                </div>
            `).join('');
        }

        // 生成待跟进编辑块
        let fuEditHtml = '';
        if (record.followUpList && record.followUpList.length > 0) {
            fuEditHtml = record.followUpList.map((fu, i) => `
                <div class="edit-followup-block" data-index="${i}">
                    <h5>待跟进 ${i + 1}</h5>
                    <div class="form-group">
                        <label>材料页码</label>
                        <input type="text" class="edit-fu-page" value="${escapeHtml(fu.page || '')}">
                    </div>
                    <div class="form-group">
                        <label>待跟进事项</label>
                        <textarea class="edit-fu-content" rows="2">${escapeHtml(fu.content || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label>跟进状态</label>
                        <select class="edit-fu-status">
                            ${(config.statuses || ['进行中', '已完成']).map(s =>
                                `<option value="${s}" ${s === fu.status ? 'selected' : ''}>${s}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            `).join('');
        }

        const content = document.getElementById('editContent');
        content.innerHTML = `
            <div class="edit-form">
                <div class="form-group">
                    <label>公司名称</label>
                    <select id="editCompany">${companyOptions}</select>
                </div>
                <div class="form-group">
                    <label>分享日期</label>
                    <input type="date" id="editShareDate" value="${record.shareDate}">
                </div>
                <div class="form-group">
                    <label>分享材料</label>
                    <select id="editShareMaterial">${materialOptions}</select>
                </div>
                <div class="form-group">
                    <label>分享对象</label>
                    <input type="text" id="editShareTarget" value="${escapeHtml(record.shareTarget)}">
                </div>
                <div class="form-group">
                    <label>KP 负责人</label>
                    <input type="text" id="editKpLeader" value="${escapeHtml(record.kpLeader || '')}">
                </div>
                <h4 style="margin:20px 0 10px;">客户问答</h4>
                ${qaEditHtml}
                <h4 style="margin:20px 0 10px;">待跟进事项</h4>
                ${fuEditHtml}
                <div class="form-actions" style="margin-top:20px;">
                    <button class="btn-submit" onclick="saveEdit('${id}')">保存修改</button>
                    <button class="btn-reset" onclick="closeEditModal()">取消</button>
                </div>
            </div>
        `;

        document.getElementById('editModal').classList.add('show');
    };

    // 保存编辑（异步）
    window.saveEdit = async function(id) {
        // 收集编辑表单数据
        const updates = {
            company: document.getElementById('editCompany').value,
            shareDate: document.getElementById('editShareDate').value,
            shareMaterial: document.getElementById('editShareMaterial').value,
            shareTarget: document.getElementById('editShareTarget').value.trim(),
            kpLeader: document.getElementById('editKpLeader').value.trim()
        };

        // 更新问答
        const qaBlocks = document.querySelectorAll('.edit-qa-block');
        updates.qaList = [];
        qaBlocks.forEach(block => {
            updates.qaList.push({
                page: block.querySelector('.edit-qa-page').value.trim(),
                kpQuestion: block.querySelector('.edit-kp-question').value.trim(),
                clientReply: block.querySelector('.edit-client-reply').value.trim(),
                clientQuestion: block.querySelector('.edit-client-question').value.trim(),
                kpReply: block.querySelector('.edit-kp-reply').value.trim()
            });
        });

        // 更新待跟进
        const fuBlocks = document.querySelectorAll('.edit-followup-block');
        updates.followUpList = [];
        fuBlocks.forEach(block => {
            updates.followUpList.push({
                page: block.querySelector('.edit-fu-page').value.trim(),
                content: block.querySelector('.edit-fu-content').value.trim(),
                status: block.querySelector('.edit-fu-status').value
            });
        });

        const result = await apiUpdateRecord(id, updates);
        if (!result.success) {
            alert('保存失败: ' + (result.message || '未知错误'));
            return;
        }

        closeEditModal();
        refreshRecordCache();
        await refreshAll();
    };

    window.closeEditModal = function() {
        document.getElementById('editModal').classList.remove('show');
    };

    // 删除记录（异步）
    window.deleteRecord = async function(id) {
        if (!confirm('确定要删除这条记录吗？此操作不可撤销。')) return;

        const result = await apiDeleteRecord(id);
        if (!result.success) {
            alert('删除失败: ' + (result.message || '未知错误'));
            return;
        }

        refreshRecordCache();
        await refreshAll();
    };

    // 刷新所有内容（异步）
    async function refreshAll() {
        refreshRecordCache();
        await Promise.all([
            updateStats(),
            renderRecords(),
            renderFollowUpSummary(),
            renderClientInfoSummary()
        ]);
    }

    // 事件监听（异步）
    document.getElementById('filterCompany').addEventListener('change', renderRecords);
    document.getElementById('filterMaterial').addEventListener('change', renderRecords);
    document.getElementById('filterPage').addEventListener('input', renderRecords);
    document.getElementById('searchBtn').addEventListener('click', renderRecords);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') renderRecords();
    });

    // 点击模态框外部关闭
    ['detailModal', 'companyDetailModal', 'editModal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('show');
                }
            });
        }
    });

    // 初始化（异步，等待 authReady 确保用户状态已恢复）
    async function init() {
        if (typeof authReady !== 'undefined') await authReady;
        await protectLoggedInPage();
        await populateFilters();
        await refreshAll();
    }

    init();

    // 定期刷新（每10秒，减少对 Supabase 的请求压力）
    setInterval(function() {
        refreshRecordCache();
        refreshConfigCache();
        refreshAll();
    }, 10000);

})();
