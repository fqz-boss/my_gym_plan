/** 后端 API 根地址（HTTPS，与微信公众平台 request 合法域名一致，无尾斜杠） */
const apiBase = 'https://my-gym-plan.pages.dev';

/**
 * 为 true 时：若服务端未配置微信 AppSecret 或网络不可达，仍允许在本地标记「已登录」以便使用主流程（见 utils/auth.js）。
 * 生产环境建议改為 false 并配置 Pages 环境变量 WECHAT_MINI_APPID / WECHAT_MINI_SECRET。
 */
const allowLocalAuthIfServerUnavailable = true;

module.exports = { apiBase, allowLocalAuthIfServerUnavailable };
