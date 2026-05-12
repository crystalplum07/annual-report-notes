// 客户分享纪要录入 — Supabase 版
// 依赖：supabase-client.js, api.js, config.js, auth.js
(function() {
    const form = document.getElementById('recordForm');
    const modal = document.getElementById('successModal');

    // 动态添加问答块
    window.addQaBlock = function() {
        const container = document.getElementById('qaContainer');
        const blocks = container.querySelectorAll('.qa-block');
        const index = blocks.length;

        const block = document.createElement('div');
        block.className = 'qa-block';
        block.dataset.index = index;
        block.innerHTML = `
            <div class="qa-header">
                <span class="qa-number">问答 ${index + 1}</span>
                <button type="button" class="btn-remove-qa" onclick="removeQaBlock(this)">删除</button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>材料页码</label>
                    <input type="text" name="qaPage[]" placeholder="如：P5">
                </div>
            </div>
            <div class="form-group full-width">
                <label>KP 问题</label>
                <textarea name="kpQuestion[]" rows="2" placeholder="请输入 KP 提出的问题..."></textarea>
            </div>
            <div class="form-group full-width">
                <label>客户回复</label>
                <textarea name="clientReply[]" rows="2" placeholder="请输入客户的回复..."></textarea>
            </div>
            <div class="form-group full-width">
                <label>客户问题</label>
                <textarea name="clientQuestion[]" rows="2" placeholder="请输入客户提出的问题..."></textarea>
            </div>
            <div class="form-group full-width">
                <label>KP 回复</label>
                <textarea name="kpReply[]" rows="2" placeholder="请输入 KP 的回复..."></textarea>
            </div>
        `;
        container.appendChild(block);
        updateRemoveButtons();
    };

    // 删除问答块
    window.removeQaBlock = function(btn) {
        const block = btn.closest('.qa-block');
        block.remove();
        renumberQaBlocks();
        updateRemoveButtons();
    };

    // 重新编号问答块
    function renumberQaBlocks() {
        const blocks = document.querySelectorAll('#qaContainer .qa-block');
        blocks.forEach((block, i) => {
            block.dataset.index = i;
            block.querySelector('.qa-number').textContent = `问答 ${i + 1}`;
        });
    }

    // 更新删除按钮显示
    function updateRemoveButtons() {
        const blocks = document.querySelectorAll('#qaContainer .qa-block');
        blocks.forEach(block => {
            const btn = block.querySelector('.btn-remove-qa');
            btn.style.display = blocks.length > 1 ? 'inline-block' : 'none';
        });
    }

    // 动态添加待跟进块（异步，需要配置数据）
    window.addFollowUpBlock = async function() {
        const config = typeof getConfig === 'function' ? await getConfig() : { statuses: ['进行中', '已完成'] };
        const defaultStatus = await getDefaultFollowUpStatus();
        const container = document.getElementById('followUpContainer');
        const blocks = container.querySelectorAll('.followup-block');
        const index = blocks.length;

        const block = document.createElement('div');
        block.className = 'followup-block';
        block.dataset.index = index;
        block.innerHTML = `
            <div class="followup-header">
                <span class="followup-number">待跟进 ${index + 1}</span>
                <button type="button" class="btn-remove-followup" onclick="removeFollowUpBlock(this)">删除</button>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>材料页码</label>
                    <input type="text" name="followUpPage[]" placeholder="如：P5">
                </div>
            </div>
            <div class="form-group full-width">
                <label>待跟进事项</label>
                <textarea name="followUpContent[]" rows="2" placeholder="请输入待跟进事项..."></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>跟进状态</label>
                    <select name="followUpStatus[]" class="status-select">
                        ${(config.statuses || ['进行中', '已完成']).map(s => `<option value="${s}" ${s === defaultStatus ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
            </div>
        `;
        container.appendChild(block);
        updateFollowUpRemoveButtons();
    };

    // 删除待跟进块
    window.removeFollowUpBlock = function(btn) {
        const block = btn.closest('.followup-block');
        block.remove();
        renumberFollowUpBlocks();
        updateFollowUpRemoveButtons();
    };

    // 重新编号待跟进块
    function renumberFollowUpBlocks() {
        const blocks = document.querySelectorAll('#followUpContainer .followup-block');
        blocks.forEach((block, i) => {
            block.dataset.index = i;
            block.querySelector('.followup-number').textContent = `待跟进 ${i + 1}`;
        });
    }

    // 更新待跟进删除按钮
    function updateFollowUpRemoveButtons() {
        const blocks = document.querySelectorAll('#followUpContainer .followup-block');
        blocks.forEach(block => {
            const btn = block.querySelector('.btn-remove-followup');
            btn.style.display = blocks.length > 1 ? 'inline-block' : 'none';
        });
    }

    // 收集表单数据（异步，需要 session）
    async function collectFormData() {
        const formData = new FormData(form);
        const session = typeof getSession === 'function' ? await getSession() : null;

        // 收集问答
        const qaBlocks = document.querySelectorAll('#qaContainer .qa-block');
        const qaList = [];
        qaBlocks.forEach(block => {
            const page = block.querySelector('input[name="qaPage[]"]')?.value.trim() || '';
            const kpQuestion = block.querySelector('textarea[name="kpQuestion[]"]')?.value.trim() || '';
            const clientReply = block.querySelector('textarea[name="clientReply[]"]')?.value.trim() || '';
            const clientQuestion = block.querySelector('textarea[name="clientQuestion[]"]')?.value.trim() || '';
            const kpReply = block.querySelector('textarea[name="kpReply[]"]')?.value.trim() || '';

            if (kpQuestion || clientReply || clientQuestion || kpReply) {
                qaList.push({ page, kpQuestion, clientReply, clientQuestion, kpReply });
            }
        });

        // 收集待跟进
        const followUpBlocks = document.querySelectorAll('#followUpContainer .followup-block');
        const followUpList = [];
        followUpBlocks.forEach(block => {
            const page = block.querySelector('input[name="followUpPage[]"]')?.value.trim() || '';
            const content = block.querySelector('textarea[name="followUpContent[]"]')?.value.trim() || '';
            const status = block.querySelector('select[name="followUpStatus[]"]')?.value || '进行中';
            if (content) {
                followUpList.push({ page, content, status });
            }
        });

        return {
            company: formData.get('company'),
            shareDate: formData.get('shareDate'),
            shareMaterial: formData.get('shareMaterial'),
            shareTarget: formData.get('shareTarget').trim(),
            kpLeader: formData.get('kpLeader').trim(),
            qaList,
            followUpList,
            createdBy: session ? session.username : 'anonymous'
        };
    }

    // 表单提交（异步）
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 防止重复提交
        const submitBtn = form.querySelector('.btn-submit');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = '保存中...';

        try {
            const record = await collectFormData();

            // 验证
            if (!record.company || !record.shareDate || !record.shareTarget || !record.shareMaterial) {
                alert('请填写必填项：公司名称、分享日期、分享材料、分享对象');
                return;
            }

            if (record.qaList.length === 0 && record.followUpList.length === 0) {
                alert('请至少填写一条客户问答或待跟进事项');
                return;
            }

            // 保存到 Supabase
            const result = await apiCreateRecord(record);
            if (!result.success) {
                alert('保存失败: ' + (result.message || '未知错误'));
                return;
            }

            showModal();
            form.reset();
            if (companySearchable) companySearchable.setValue('', '');
            if (materialSearchable) materialSearchable.setValue('', '');
            await resetBlocks();
            await applyDefaults();
        } catch (err) {
            console.error('保存失败:', err);
            alert('保存失败，请稍后重试');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    // 获取跟进状态默认值（异步）
    async function getDefaultFollowUpStatus() {
        const config = typeof getConfig === 'function' ? await getConfig() : null;
        if (config && config.defaults && config.defaults.followUpStatus) {
            return config.defaults.followUpStatus;
        }
        return '进行中';
    }

    // 重置所有动态块（异步，需要配置）
    async function resetBlocks() {
        const config = typeof getConfig === 'function' ? await getConfig() : { statuses: ['进行中', '已完成'] };
        const defaultStatus = await getDefaultFollowUpStatus();
        document.getElementById('qaContainer').innerHTML = `
            <div class="qa-block" data-index="0">
                <div class="qa-header">
                    <span class="qa-number">问答 1</span>
                    <button type="button" class="btn-remove-qa" onclick="removeQaBlock(this)" style="display:none;">删除</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>材料页码</label>
                        <input type="text" name="qaPage[]" placeholder="如：P5">
                    </div>
                </div>
                <div class="form-group full-width">
                    <label>KP 问题</label>
                    <textarea name="kpQuestion[]" rows="2" placeholder="请输入 KP 提出的问题..."></textarea>
                </div>
                <div class="form-group full-width">
                    <label>客户回复</label>
                    <textarea name="clientReply[]" rows="2" placeholder="请输入客户的回复..."></textarea>
                </div>
                <div class="form-group full-width">
                    <label>客户问题</label>
                    <textarea name="clientQuestion[]" rows="2" placeholder="请输入客户提出的问题..."></textarea>
                </div>
                <div class="form-group full-width">
                    <label>KP 回复</label>
                    <textarea name="kpReply[]" rows="2" placeholder="请输入 KP 的回复..."></textarea>
                </div>
            </div>
        `;
        document.getElementById('followUpContainer').innerHTML = `
            <div class="followup-block" data-index="0">
                <div class="followup-header">
                    <span class="followup-number">待跟进 1</span>
                    <button type="button" class="btn-remove-followup" onclick="removeFollowUpBlock(this)" style="display:none;">删除</button>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>材料页码</label>
                        <input type="text" name="followUpPage[]" placeholder="如：P5">
                    </div>
                </div>
                <div class="form-group full-width">
                    <label>待跟进事项</label>
                    <textarea name="followUpContent[]" rows="2" placeholder="请输入待跟进事项..."></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>跟进状态</label>
                        <select name="followUpStatus[]" class="status-select">
                            ${(config.statuses || ['进行中', '已完成']).map(s => `<option value="${s}" ${s === defaultStatus ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    // 显示成功模态框
    function showModal() {
        modal.classList.add('show');
    }

    // 关闭模态框
    window.closeModal = function() {
        modal.classList.remove('show');
    };

    // 点击模态框外部关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // 下载 Excel 模板
    window.downloadTemplate = function() {
        const wb = XLSX.utils.book_new();

        // 基本信息 Sheet
        const basicData = [
            ['公司名称', '分享日期', '分享材料', '分享对象', 'KP负责人'],
            ['', '', '', '', '']
        ];
        const basicWs = XLSX.utils.aoa_to_sheet(basicData);
        XLSX.utils.book_append_sheet(wb, basicWs, '基本信息');

        // 客户问答 Sheet
        const qaData = [
            ['材料页码', 'KP问题', '客户回复', '客户问题', 'KP回复'],
            ['', '', '', '', '']
        ];
        const qaWs = XLSX.utils.aoa_to_sheet(qaData);
        XLSX.utils.book_append_sheet(wb, qaWs, '客户问答');

        // 待跟进事项 Sheet
        const followUpData = [
            ['材料页码', '待跟进事项', '跟进状态'],
            ['', '', '']
        ];
        const followUpWs = XLSX.utils.aoa_to_sheet(followUpData);
        XLSX.utils.book_append_sheet(wb, followUpWs, '待跟进事项');

        XLSX.writeFile(wb, '年报分享录入纪要模板.xlsx');
    };

    // 处理 Excel 上传
    window.handleExcelUpload = async function(input) {
        const file = input.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 读取基本信息
                const basicSheet = workbook.Sheets['基本信息'];
                const basicData = XLSX.utils.sheet_to_json(basicSheet, { header: 1 });

                // 读取客户问答
                const qaSheet = workbook.Sheets['客户问答'];
                const qaData = XLSX.utils.sheet_to_json(qaSheet, { header: 1 });

                // 读取待跟进事项
                const followUpSheet = workbook.Sheets['待跟进事项'];
                const followUpData = XLSX.utils.sheet_to_json(followUpSheet, { header: 1 });

                // 解析基本信息（从第2行开始，第1行是表头）
                let company = '', shareDate = '', shareMaterial = '', shareTarget = '', kpLeader = '';
                if (basicData.length > 1) {
                    const row = basicData[1];
                    company = row[0] || '';
                    shareDate = row[1] || '';
                    shareMaterial = row[2] || '';
                    shareTarget = row[3] || '';
                    kpLeader = row[4] || '';
                }

                // 填充基本信息
                if (company && companySearchable) companySearchable.setValue(company, company);
                const parsedDate = parseExcelDate(shareDate);
                if (parsedDate) document.getElementById('shareDate').value = parsedDate;
                if (shareMaterial && materialSearchable) materialSearchable.setValue(shareMaterial, shareMaterial);
                if (shareTarget) document.getElementById('shareTarget').value = shareTarget;
                if (kpLeader) document.getElementById('kpLeader').value = kpLeader;

                // 解析客户问答（从第2行开始）
                const qaList = [];
                for (let i = 1; i < qaData.length; i++) {
                    const row = qaData[i];
                    if (!row || row.every(cell => !cell)) continue;
                    qaList.push({
                        page: row[0] || '',
                        kpQuestion: row[1] || '',
                        clientReply: row[2] || '',
                        clientQuestion: row[3] || '',
                        kpReply: row[4] || ''
                    });
                }

                // 解析待跟进事项（从第2行开始）
                const followUpList = [];
                for (let i = 1; i < followUpData.length; i++) {
                    const row = followUpData[i];
                    if (!row || row.every(cell => !cell)) continue;
                    followUpList.push({
                        page: row[0] || '',
                        content: row[1] || '',
                        status: row[2] || '进行中'
                    });
                }

                // 填充问答
                if (qaList.length > 0) {
                    document.getElementById('qaContainer').innerHTML = '';
                    qaList.forEach((qa, index) => {
                        const container = document.getElementById('qaContainer');
                        const block = document.createElement('div');
                        block.className = 'qa-block';
                        block.dataset.index = index;
                        block.innerHTML = `
                            <div class="qa-header">
                                <span class="qa-number">问答 ${index + 1}</span>
                                <button type="button" class="btn-remove-qa" onclick="removeQaBlock(this)" style="${index === 0 ? 'display:none;' : ''}">删除</button>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>材料页码</label>
                                    <input type="text" name="qaPage[]" value="${escapeHtml(qa.page)}" placeholder="如：P5">
                                </div>
                            </div>
                            <div class="form-group full-width">
                                <label>KP 问题</label>
                                <textarea name="kpQuestion[]" rows="2" placeholder="请输入 KP 提出的问题...">${escapeHtml(qa.kpQuestion)}</textarea>
                            </div>
                            <div class="form-group full-width">
                                <label>客户回复</label>
                                <textarea name="clientReply[]" rows="2" placeholder="请输入客户的回复...">${escapeHtml(qa.clientReply)}</textarea>
                            </div>
                            <div class="form-group full-width">
                                <label>客户问题</label>
                                <textarea name="clientQuestion[]" rows="2" placeholder="请输入客户提出的问题...">${escapeHtml(qa.clientQuestion)}</textarea>
                            </div>
                            <div class="form-group full-width">
                                <label>KP 回复</label>
                                <textarea name="kpReply[]" rows="2" placeholder="请输入 KP 的回复...">${escapeHtml(qa.kpReply)}</textarea>
                            </div>
                        `;
                        container.appendChild(block);
                    });
                    updateRemoveButtons();
                }

                // 填充待跟进
                if (followUpList.length > 0) {
                    const config = typeof getConfig === 'function' ? await getConfig() : { statuses: ['进行中', '已完成'] };
                    document.getElementById('followUpContainer').innerHTML = '';
                    followUpList.forEach((fu, index) => {
                        const container = document.getElementById('followUpContainer');
                        const block = document.createElement('div');
                        block.className = 'followup-block';
                        block.dataset.index = index;
                        block.innerHTML = `
                            <div class="followup-header">
                                <span class="followup-number">待跟进 ${index + 1}</span>
                                <button type="button" class="btn-remove-followup" onclick="removeFollowUpBlock(this)" style="${index === 0 ? 'display:none;' : ''}">删除</button>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>材料页码</label>
                                    <input type="text" name="followUpPage[]" value="${escapeHtml(fu.page)}" placeholder="如：P5">
                                </div>
                            </div>
                            <div class="form-group full-width">
                                <label>待跟进事项</label>
                                <textarea name="followUpContent[]" rows="2" placeholder="请输入待跟进事项...">${escapeHtml(fu.content)}</textarea>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>跟进状态</label>
                                    <select name="followUpStatus[]" class="status-select">
                                        ${(config.statuses || ['进行中', '已完成']).map(s => `<option value="${s}" ${s === fu.status ? 'selected' : ''}>${s}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        `;
                        container.appendChild(block);
                    });
                    updateFollowUpRemoveButtons();
                }

                alert('Excel 数据已导入，请检查并补充信息后保存');
            } catch (err) {
                console.error('解析 Excel 失败:', err);
                alert('Excel 解析失败，请确保使用正确的模板格式');
            }
        };
        reader.readAsArrayBuffer(file);
        input.value = '';
    };

    // 解析 Excel 日期为 YYYY-MM-DD 格式
    function parseExcelDate(value) {
        if (!value) return '';
        if (value instanceof Date) {
            if (isNaN(value.getTime())) return '';
            const y = value.getUTCFullYear();
            const m = String(value.getUTCMonth() + 1).padStart(2, '0');
            const d = String(value.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        if (typeof value === 'number') {
            const epoch = Date.UTC(1899, 11, 30);
            const date = new Date(epoch + value * 86400000);
            if (isNaN(date.getTime())) return '';
            const y = date.getUTCFullYear();
            const m = String(date.getUTCMonth() + 1).padStart(2, '0');
            const d = String(date.getUTCDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        if (typeof value === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
            if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(value.trim())) {
                const parts = value.trim().split('/');
                const y = parts[0];
                const m = parts[1].padStart(2, '0');
                const d = parts[2].padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
            if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value.trim())) {
                const parts = value.trim().split('/');
                const y = parts[2];
                const m = parts[1].padStart(2, '0');
                const d = parts[0].padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
            const cnMatch = value.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
            if (cnMatch) {
                return `${cnMatch[1]}-${cnMatch[2].padStart(2, '0')}-${cnMatch[3].padStart(2, '0')}`;
            }
            const parsed = new Date(value);
            if (!isNaN(parsed.getTime())) {
                const y = parsed.getUTCFullYear();
                const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
                const d = String(parsed.getUTCDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            }
        }
        return '';
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 可搜索下拉框实例
    let companySearchable = null;
    let materialSearchable = null;

    // 应用默认值到表单（异步）
    async function applyDefaults() {
        const config = typeof getConfig === 'function' ? await getConfig() : null;
        if (!config) return;
        const defaults = config.defaults || {};

        // 分享日期
        const shareDateInput = document.getElementById('shareDate');
        if (shareDateInput && !shareDateInput.value) {
            const offset = defaults.shareDateOffset || 0;
            const d = new Date();
            d.setDate(d.getDate() + offset);
            shareDateInput.value = d.toISOString().split('T')[0];
        }

        // KP 负责人
        const kpLeaderInput = document.getElementById('kpLeader');
        if (kpLeaderInput && defaults.kpLeader) {
            kpLeaderInput.value = defaults.kpLeader;
        }
    }

    // 初始化可搜索下拉框（异步）
    async function initSearchableSelects() {
        const config = typeof getConfig === 'function' ? await getConfig() : null;
        if (!config) return;
        const defaults = config.defaults || {};

        // 公司名称
        const companyOptions = (config.companies || []).map(c => ({ value: c, label: c }));
        companySearchable = new SearchableSelect({
            options: companyOptions,
            placeholder: '请选择或输入搜索公司...',
            value: '',
            onChange: function(value, label) {}
        }).render('companySelectWrapper');

        // 分享材料
        const materialOptions = (config.materials || []).map(m => ({ value: m, label: m }));
        materialSearchable = new SearchableSelect({
            options: materialOptions,
            placeholder: '请选择或输入搜索材料...',
            value: '',
            onChange: function(value, label) {}
        }).render('materialSelectWrapper');
    }

    // 页面加载时初始化（异步）
    document.addEventListener('DOMContentLoaded', async function() {
        await initSearchableSelects();
        await applyDefaults();
    });

})();
