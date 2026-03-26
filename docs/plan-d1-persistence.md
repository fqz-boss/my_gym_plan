# 方案一：Cloudflare D1 + Pages Functions 持久化方案

## 一、目标

- 训练记录存入 **Cloudflare D1**（SQLite），不再依赖浏览器 localStorage。
- 换设备、清缓存后，历史数据仍可访问。
- 与现有 **Cloudflare Pages** 同生态，部署简单，免费额度内零成本。

---

## 二、当前数据形态（localStorage）

前端当前使用的单条记录结构：

```json
{
  "date": "2025/2/24",
  "timestamp": 1730000000000,
  "type": "push",
  "label": "推日",
  "exercises": [
    {
      "name": "平板杠铃卧推",
      "sets": [
        { "weight": "60", "reps": "6", "done": true }
      ]
    }
  ]
}
```

- **操作**：拉取全部列表、新增一条、按索引删除一条。
- **无登录**：单用户、单设备，仅 localStorage。

---

## 三、架构概览

```
┌─────────────────┐     GET /api/logs      ┌──────────────────┐
│  前端 (Pages)    │ ◄──────────────────►  │  Pages Functions  │
│  index.html     │     POST /api/logs     │  (Serverless)     │
│                 │     DELETE /api/logs/:id│                   │
└─────────────────┘                        └────────┬─────────┘
                                                     │
                                                     ▼
                                            ┌──────────────────┐
                                            │  Cloudflare D1   │
                                            │  (SQLite)        │
                                            │  gym_logs 表     │
                                            └──────────────────┘
```

- 静态资源仍由 **Cloudflare Pages** 托管（现有 `index.html`）。
- **Pages Functions** 提供 3 个 HTTP 接口，运行在 Cloudflare 边缘。
- **D1** 存所有训练记录，表结构见下。

---

## 四、数据库设计（D1）

单表即可，一条记录对应一次训练（exercises 存 JSON）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PRIMARY KEY | 自增主键，删除时用 |
| `date` | TEXT | 日期，如 `2025/2/24` |
| `timestamp` | INTEGER | 创建时间戳，用于排序 |
| `type` | TEXT | `push` / `pull` / `leg` |
| `label` | TEXT | `推日` / `拉日` / `腿日` |
| `exercises` | TEXT | JSON 字符串，即 `exercises` 数组 |
| `created_at` | TEXT | 可选，ISO 时间，便于排查 |

**建表 SQL：**

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

---

## 五、API 设计（Pages Functions）

所有接口放在 `functions/api/` 下，路径与约定如下。

### 5.1 获取列表 — `GET /api/logs`

- **响应**：JSON 数组，按 `timestamp` 倒序，与当前前端 `getLogs()` 结构一致。
- **示例**：`[{ id, date, timestamp, type, label, exercises }, ...]`

### 5.2 新增一条 — `POST /api/logs`

- **请求体**：与当前单条记录一致（无 `id`），即 `{ date, timestamp, type, label, exercises }`。
- **响应**：`{ id }` 或整条写入后的记录，便于前端如需展示 id。

### 5.3 删除一条 — `DELETE /api/logs/:id`

- **路径参数**：`id` 为 D1 表主键。
- **响应**：204 或 `{ ok: true }`。

---

## 六、前端改动要点

1. **不再使用 localStorage**  
   - 删除或替换 `getLogs()` / `saveLogs()` 的实现。
2. **拉取记录**  
   - 进入「训练记录」页或需要列表时：`fetch('/api/logs')`，用返回结果渲染。
3. **完成训练**  
   - 当前 `confirmFinish()` 里组装的 `record` 不变，改为 `fetch('/api/logs', { method: 'POST', body: JSON.stringify(record), headers: { 'Content-Type': 'application/json' } })`，成功后刷新列表或直接在前端列表前插入一条。
4. **删除记录**  
   - 当前按索引删，改为按服务端返回的 `id` 删：`fetch(\`/api/logs/${id}\`, { method: 'DELETE' })`，成功后从列表移除该项或重新拉取列表。
5. **错误与离线**  
   - 可选：请求失败时 toasts 提示；若需兼容离线，可保留 localStorage 作为缓存，与后端同步策略可后续再设计。

---

## 七、目录与部署结构

```
my_gym_plan/
├── index.html              # 现有页面，改调用 API
├── package.json            # 现有
├── wrangler.toml           # 新增：D1 与 Pages 绑定
├── functions/              # 新增：Pages Functions
│   └── api/
│       └── logs/
│           ├── [[id]].js   # GET 列表 / GET 单条、DELETE 单条（按 id）
│           └── index.js    # POST 新增
│   或 单一路由：
│   └── api/
│       └── logs.js         # 或 logs/[id].js，根据 wrangler 路由约定
└── docs/
    └── plan-d1-persistence.md  # 本文档
```

- **wrangler.toml**：声明 D1 database（`database_name`、`database_id`），以及 Pages 与 D1 的绑定（`[[d1_databases]]`）。
- **Pages 部署**：`wrangler pages deploy .` 时会把 `functions` 自动当作 Pages Functions 部署，并注入 D1 绑定。

---

## 八、D1 与 Pages 的绑定（wrangler 配置要点）

- 在 Cloudflare 控制台创建 D1 数据库，得到 `database_id`。
- 在 **Pages 项目** 的 Settings → Functions 里绑定该 D1（或通过 wrangler.toml 绑定）。
- 在 Function 内通过 `env.DB`（或你命名的 binding）执行 SQL。

**创建 D1 示例：**

```bash
wrangler d1 create my-gym-plan-db
# 输出中会有 database_id，填入 wrangler.toml
```

**执行建表：**

```bash
wrangler d1 execute my-gym-plan-db --remote --file=./schema.sql
```

---

## 九、成本与限制（免费额度）

| 项目 | 免费额度 | 本场景（个人单用户） |
|------|----------|----------------------|
| D1 存储 | 5 GB | 训练记录体量极小，可忽略 |
| D1 读 | 500 万次/天 | 仅自己用，远低于 |
| D1 写 | 10 万次/天 | 同上 |
| Pages Functions 请求 | 10 万次/天 | 同上 |

结论：**方案一在个人使用下可视为 0 成本。**

---

## 十、实施顺序建议

1. 在 Cloudflare 创建 D1 数据库，本地写好 `schema.sql` 并执行建表。
2. 在项目里添加 `wrangler.toml`，配置 Pages + D1 绑定。
3. 实现 `functions/api/logs` 三个接口（GET / POST / DELETE），本地用 `wrangler pages dev` 调试。
4. 前端改为调用 `/api/logs`，去掉对 localStorage 的读写，删除改为按 `id`。
5. 部署：`wrangler pages deploy .`，在控制台确认 D1 已绑定到 Pages 项目。
6. 可选：错误提示、加载态、以及是否需要「首次从 localStorage 迁移到 API」的 one-off 逻辑。

---

## 十一、可选扩展（后续）

- **简单鉴权**：若担心链接泄露被改数据，可加一层「访问码」或 PIN（例如 Query 参数或 Header），在 Functions 内校验后再执行读写。
- **多设备同步**：当前方案已支持多设备同源访问同一 D1，无需额外成本。
- **从 localStorage 迁移**：首次加载时若检测到本地有 `gym_logs` 且 API 返回空，可提示用户「是否导入本地记录」并 POST 到 `/api/logs` 批量写入，然后清空 localStorage。

以上即为方案一（Cloudflare D1 + Pages Functions）的完整梳理，可直接作为实现与评审依据。
