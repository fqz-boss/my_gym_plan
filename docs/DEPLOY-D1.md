# D1 持久化部署步骤

按以下顺序操作即可让训练记录存入 Cloudflare D1。

## 1. 创建 D1 数据库

**方式 A：在 Cloudflare 控制台**

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧选 **Workers & Pages** → **D1**
3. 点击 **Create database**
4. 名称填：`my-gym-plan-db`，区域选默认
5. 创建完成后进入该数据库，在 **Settings** 里复制 **Database ID**（一串 UUID）

**方式 B：命令行**（需本地 wrangler 正常）

```bash
npx wrangler d1 create my-gym-plan-db
```

终端会输出 `database_id`，复制备用。

---

## 2. 填写 database_id 到项目

打开项目根目录的 `wrangler.toml`，将：

```toml
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

替换为你在上一步得到的 **Database ID**（UUID）。

---

## 3. 执行建表 SQL

**方式 A：在控制台执行**

1. 进入该 D1 数据库 → **Console** 标签
2. 复制并执行 `schema.sql` 里的全部 SQL：

```sql
CREATE TABLE IF NOT EXISTS gym_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  exercises TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_gym_logs_timestamp ON gym_logs(timestamp DESC);
```

**方式 B：命令行**（需 wrangler 正常）

```bash
npx wrangler d1 execute my-gym-plan-db --remote --file=./schema.sql
```

---

## 4. 绑定 D1 到 Pages 项目

1. 在 Cloudflare 控制台进入 **Workers & Pages** → **Pages**
2. 打开你的 **my-gym-plan** 项目
3. **Settings** → **Functions** → **D1 database bindings**
4. 点击 **Add binding**：
   - **Variable name**：`DB`
   - **D1 database**：选择刚创建的 `my-gym-plan-db`
5. 保存

若已正确配置 `wrangler.toml` 并写入 `database_id`，部署时也会按该配置绑定。

---

## 5. 部署

在项目根目录执行：

```bash
npx wrangler pages deploy . --project-name my-gym-plan
```

部署完成后访问 **https://my-gym-plan.pages.dev**，完成一次训练并保存，再打开「训练记录」应能看到数据；换设备或清缓存后仍可看到（说明已写入 D1）。

---

## 故障排查

- **保存/加载失败**：检查 D1 是否已建表、Pages 的 Functions 里是否绑定了 `DB` 且变量名为 `DB`。
- **本地无法测 API**：需用 `npx wrangler pages dev .` 在本地起带 Functions 的环境，直接打开 `index.html` 无法请求到 `/api/logs`。
