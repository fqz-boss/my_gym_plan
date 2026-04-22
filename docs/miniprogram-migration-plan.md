# 微信小程序迁移计划

与 H5（`web/index.html`）功能对齐，分阶段落地。

## 功能清单（与 H5 一致）

| 模块 | 能力 |
|------|------|
| 训练 | 推/拉/腿/休息切换；按日动作卡片；组数重量与完成勾选；添加组；要点展开；保存草稿；完成并 POST `/api/logs` |
| 记录 | GET `/api/logs` 列表；展开详情；删除 `DELETE`；跳转编辑页 `PUT` |
| 计划 | 三日动作增删改（本地 `wx.setStorage`）；静态说明区折叠（`rich-text`） |
| 数据 | 默认 `PLANS`、用户计划、草稿与 H5 同 key：`gym_plan`、`gym_draft` |

## 技术对应

- `localStorage` → `wx.getStorageSync` / `setStorageSync`
- `fetch` → `wx.request`（`config.js` 中配置 `apiBase`，需为 HTTPS 合法域名）
- 弹窗 → 各页内 `view` 遮罩 + 表单，记录编辑独立页 `pages/log-edit/log-edit`

## 阶段

1. **工具层**：`config.js`、`utils/defaults.js`（`PLANS` + `PLAN_SECTIONS`）、`storage.js`、`api.js`
2. **Tab 三页**：`train` / `history` / `plan`
3. **记录编辑子页**：`log-edit`
4. **联调**：开发者工具中配置 request 合法域名、填 `apiBase`；真机前配置 AppID 与服务器域名

## 实施状态（已完成代码侧迁移）

- 工具层与四页已接入仓库；占位首页 `pages/index` 已移除。
- 请在本机微信开发者工具中打开 `miniprogram/` 目录，编辑 `config.js` 的 `apiBase`，并在公众平台配置 **request 合法域名** 后联调。

## 配置说明

- 修改 `miniprogram/config.js` 内 `apiBase` 为你的 Cloudflare Pages 地址（无尾斜杠）。
- 微信公众平台 → 开发 → 开发管理 → 服务器域名 → `request` 与上述域名一致。
