// Supabase 客户端初始化
// 在所有页面中第一个加载
const SUPABASE_URL = 'https://zbptycrqfvzogvfgmgbk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6Xaj7jgivWYOn-5Up5v0yg_Rhn9AfEk';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
