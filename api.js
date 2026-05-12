// 统一数据访问层 — 所有 Supabase 数据操作封装在此文件
// 依赖：supabase-client.js（必须在之前加载）
(function() {
    'use strict';

    // ===== 认证相关 =====

    // 注册（username 作为 email 的一部分）
    // 邮箱格式: username@mail.kpmg-share.app
    // 注意：需要在 Supabase Dashboard 关闭 "Confirm email" 选项
    window.apiRegister = async function(username, password) {
        const email = username + '@mail.kpmg-share.app';
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    username: username,
                    display_name: username
                }
            }
        });
        if (error) {
            if (error.message.includes('already registered') || error.message.includes('already exists') || error.code === 'user_already_exists') {
                return { success: false, message: '用户名已存在' };
            }
            return { success: false, message: error.message };
        }
        return { success: true, data: data };
    };

    // 登录
    window.apiLogin = async function(username, password) {
        const email = username + '@mail.kpmg-share.app';
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        if (error) {
            if (error.message.includes('Invalid login') || error.message.includes('invalid credentials') || error.status === 401) {
                return { success: false, message: '用户名或密码错误' };
            }
            return { success: false, message: error.message };
        }
        return { success: true, data: data };
    };

    // 登出
    window.apiLogout = async function() {
        const { error } = await supabase.auth.signOut();
        return { success: !error, message: error ? error.message : '' };
    };

    // 获取当前用户信息（包含 profile 中的 role）
    window.apiGetCurrentUser = async function() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return null;

        // 获取 profile 信息（含 role）
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        // 从 email 中提取用户名（格式: username@mail.kpmg-share.app）
        const baseUsername = user.email ? user.email.split('@')[0] : 'unknown';
        // profile.username 可能是完整邮箱（触发器默认值），需要提取用户名部分
        const profileUsername = profile ? (profile.username || '').split('@')[0] : baseUsername;
        const profileDisplayName = profile ? (profile.display_name || profileUsername).split('@')[0] : baseUsername;

        return {
            id: user.id,
            email: user.email,
            username: profileUsername,
            displayName: profileDisplayName,
            role: profile ? profile.role : 'user',
            createdAt: user.created_at
        };
    };

    // 获取当前 session
    window.apiGetSession = async function() {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    };

    // ===== 纪要相关 =====

    // 获取纪要列表（支持筛选）
    window.apiGetRecords = async function(filters) {
        filters = filters || {};
        let query = supabase
            .from('records')
            .select('*');

        if (filters.company) query = query.eq('company', filters.company);
        if (filters.material) query = query.eq('share_material', filters.material);
        if (filters.dateFrom) query = query.gte('share_date', filters.dateFrom);
        if (filters.dateTo) query = query.lte('share_date', filters.dateTo);
        if (filters.search) {
            query = query.or(`company.ilike.%${filters.search}%,share_target.ilike.%${filters.search}%,kp_leader.ilike.%${filters.search}%`);
        }

        // 如果是普通用户，只查自己的
        const currentUser = await apiGetCurrentUser();
        if (currentUser && currentUser.role !== 'admin') {
            query = query.eq('created_by', currentUser.id);
        }

        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (error) {
            console.error('获取纪要失败:', error);
            return [];
        }

        // 获取所有关联用户名（批量查询）
        const dataArr = data || [];
        const userIds = [...new Set(dataArr.map(r => r.created_by).filter(Boolean))];
        let userMap = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username')
                .in('id', userIds);
            if (profiles) {
                profiles.forEach(p => {
                    userMap[p.id] = (p.username || '').split('@')[0];
                });
            }
        }

        // 转换字段名，兼容前端现有代码
        return dataArr.map(r => ({
            id: r.id,
            company: r.company,
            shareDate: r.share_date,
            shareMaterial: r.share_material,
            shareTarget: r.share_target,
            kpLeader: r.kp_leader,
            createdBy: r.created_by ? (userMap[r.created_by] || '') : '',
            qaList: r.qa_list || [],
            followUpList: r.follow_up_list || [],
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    };

    // 获取所有纪要（不受权限限制，用于统计）
    window.apiGetAllRecords = async function() {
        const { data, error } = await supabase
            .from('records')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) return [];

        const dataArr = data || [];
        const userIds = [...new Set(dataArr.map(r => r.created_by).filter(Boolean))];
        let userMap = {};
        if (userIds.length > 0) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, username')
                .in('id', userIds);
            if (profiles) {
                profiles.forEach(p => {
                    userMap[p.id] = (p.username || '').split('@')[0];
                });
            }
        }

        return dataArr.map(r => ({
            id: r.id,
            company: r.company,
            shareDate: r.share_date,
            shareMaterial: r.share_material,
            shareTarget: r.share_target,
            kpLeader: r.kp_leader,
            createdBy: r.created_by ? (userMap[r.created_by] || '') : '',
            qaList: r.qa_list || [],
            followUpList: r.follow_up_list || [],
            createdAt: r.created_at,
            updatedAt: r.updated_at
        }));
    };

    // 获取单条纪要
    window.apiGetRecordById = async function(id) {
        const { data, error } = await supabase
            .from('records')
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) return null;

        // 获取创建者用户名
        let createdBy = '';
        if (data.created_by) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', data.created_by)
                .single();
            createdBy = profile ? (profile.username || '').split('@')[0] : '';
        }

        return {
            id: data.id,
            company: data.company,
            shareDate: data.share_date,
            shareMaterial: data.share_material,
            shareTarget: data.share_target,
            kpLeader: data.kp_leader,
            createdBy: createdBy,
            qaList: data.qa_list || [],
            followUpList: data.follow_up_list || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    };

    // 创建纪要
    window.apiCreateRecord = async function(record) {
        // 获取当前用户 ID 作为 created_by
        const { data: { user } } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('records')
            .insert([{
                company: record.company,
                share_date: record.shareDate,
                share_material: record.shareMaterial,
                share_target: record.shareTarget,
                kp_leader: record.kpLeader,
                qa_list: record.qaList || [],
                follow_up_list: record.followUpList || [],
                created_by: user ? user.id : null
            }])
            .select();
        if (error) {
            console.error('创建纪要失败:', error);
            return { success: false, message: error.message };
        }
        return { success: true, data: data };
    };

    // 更新纪要
    window.apiUpdateRecord = async function(id, updates) {
        const dbUpdates = {};
        if (updates.company !== undefined) dbUpdates.company = updates.company;
        if (updates.shareDate !== undefined) dbUpdates.share_date = updates.shareDate;
        if (updates.shareMaterial !== undefined) dbUpdates.share_material = updates.shareMaterial;
        if (updates.shareTarget !== undefined) dbUpdates.share_target = updates.shareTarget;
        if (updates.kpLeader !== undefined) dbUpdates.kp_leader = updates.kpLeader;
        if (updates.qaList !== undefined) dbUpdates.qa_list = updates.qaList;
        if (updates.followUpList !== undefined) dbUpdates.follow_up_list = updates.followUpList;
        dbUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('records')
            .update(dbUpdates)
            .eq('id', id)
            .select();
        if (error) {
            console.error('更新纪要失败:', error);
            return { success: false, message: error.message };
        }
        return { success: true, data: data };
    };

    // 删除纪要
    window.apiDeleteRecord = async function(id) {
        const { error } = await supabase
            .from('records')
            .delete()
            .eq('id', id);
        if (error) {
            console.error('删除纪要失败:', error);
            return { success: false, message: error.message };
        }
        return { success: true };
    };

    // ===== 配置相关 =====

    // 获取配置
    window.apiGetConfig = async function() {
        const { data, error } = await supabase
            .from('config')
            .select('*');
        if (error || !data) {
            return getDefaultConfig();
        }
        const configMap = {};
        data.forEach(item => {
            configMap[item.key] = item.value;
        });
        const defaults = getDefaultConfig();
        return {
            companies: (configMap.companies || []).length > 0 ? configMap.companies : defaults.companies,
            materials: (configMap.materials || []).length > 0 ? configMap.materials : defaults.materials,
            speakers: (configMap.speakers || []).length > 0 ? configMap.speakers : defaults.speakers,
            statuses: (configMap.statuses || []).length > 0 ? configMap.statuses : defaults.statuses,
            defaults: configMap.defaults || defaults.defaults
        };
    };

    // 保存配置
    window.apiSaveConfig = async function(config) {
        const configEntries = [
            { key: 'companies', value: config.companies || [] },
            { key: 'materials', value: config.materials || [] },
            { key: 'speakers', value: config.speakers || [] },
            { key: 'statuses', value: config.statuses || [] },
            { key: 'defaults', value: config.defaults || {} }
        ];

        // 使用 upsert 逐个保存
        for (const entry of configEntries) {
            const { error } = await supabase
                .from('config')
                .upsert({
                    key: entry.key,
                    value: entry.value,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'key' });
            if (error) {
                console.error('保存配置失败:', entry.key, error);
                return { success: false, message: '保存配置项 ' + entry.key + ' 失败: ' + error.message };
            }
        }
        return { success: true };
    };

    // 默认配置
    function getDefaultConfig() {
        return {
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
    }

    // ===== 用户管理相关（管理员） =====

    // 获取用户列表
    window.apiGetUserList = async function() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('获取用户列表失败:', error);
            return [];
        }
        return (data || []).map(p => ({
            id: p.id,
            username: (p.username || p.display_name || '').split('@')[0],
            displayName: (p.display_name || p.username || '').split('@')[0],
            role: p.role || 'user',
            createdAt: p.created_at
        }));
    };

    // 获取用户统计
    window.apiGetUserStats = async function() {
        const users = await apiGetUserList();
        return {
            total: users.length,
            admin: users.filter(u => u.role === 'admin').length,
            user: users.filter(u => u.role === 'user').length
        };
    };

    // 修改用户角色
    window.apiChangeUserRole = async function(userId, newRole) {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);
        if (error) {
            return { success: false, message: error.message };
        }
        return { success: true };
    };

    // 删除用户（通过 Supabase Admin API 需要服务端密钥，前端只能通过 profiles 表操作）
    // 前端实现：管理员标记删除，实际删除需在 Supabase Dashboard 操作
    window.apiDeleteUser = async function(userId) {
        // 先删除该用户的所有记录
        await supabase.from('records').delete().eq('created_by', userId);
        // 再删除 profile
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        if (error) {
            return { success: false, message: error.message };
        }
        return { success: true };
    };

    // 重置密码（Supabase 不允许前端直接重置其他用户密码）
    // 方案：管理员使用 Supabase Admin API 发送密码重置邮件
    // 但由于前端没有 service_role key，这里改为提示管理员去 Dashboard 操作
    // 或者我们可以通过让用户自行重置来实现
    window.apiResetPassword = async function(userId) {
        // 获取用户的 email
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .single();
        if (!profile) return { success: false, message: '用户不存在' };

        // Supabase 前端无法重置其他用户密码
        return { success: false, message: '请前往 Supabase Dashboard → Authentication → Users 手动重置密码' };
    };

})();
