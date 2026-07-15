# Vibe学习记 Starter Kit Contract

## 1. 文档目的

Starter Kit 是两轮并行开发共同依赖的工程基线。它负责把产品骨架、公共规则和功能插槽准备好，使 8 位同学可以从同一个 `main` 分支开始开发，并在同一 Phase 内不依赖另一位同学尚未合并的代码。

Starter Kit 必须同时满足两件事：

- 学生 clone 后无需修改配置即可打开项目，看到三个 Tab 和三个子页面的正常空状态。
- 每个 Spec 已经拥有固定的目录、输入、输出和接入位置，学生实现的是完整的用户功能，不需要先设计共享架构。

最终产品规则以 [Product Design](./product-design.md) 为准，视觉规则以 [UI Design](./ui-foundation-design.md) 为准。本文只定义课程工程的公共技术契约。

## 2. 三个可运行基线

课程使用三个可运行基线，不让 16 个需求同时堆在一个未集成分支上。

| 基线 | 包含内容 | 学生从哪里开始 |
| --- | --- | --- |
| `starter` | P0 工程、公共契约、空状态、功能插槽、本地 Repository 和 Fixtures | Phase 1 的 8 位同学都从这里建分支 |
| `phase-1-complete` | P0 + Phase 1 的 8 个功能，完成云端最小闭环 | Phase 2 的 8 位同学都从这里建新分支 |
| `phase-2-complete` | 最终 v1 功能 | 课程演示、验收和发布候选版本 |

这三个名称表示老师保存的 reference checkpoint。课堂协作仍以 `main` 为共同基线：Phase 1 集成通过后，`main` 才成为 Phase 2 的起点。

## 3. 分层与依赖方向

```text
pages（页面生命周期与功能编排）
  ↓
components（可见界面与用户事件）
  ↓
features（视图模型、校验、筛选、统计等纯业务逻辑）
  ↓
domain（领域类型与不变量）

pages / features
  ↓
repositories（数据访问接口）
  ↓
local / cloud adapters（本地开发实现与 CloudBase 实现）
```

依赖规则：

- Component 通过 properties 接收数据，通过 events 报告用户操作，不直接读写 Storage、CloudBase 或全局页面实例。
- Feature 可以依赖 `domain/` 和 `shared/`，不能依赖 Page 或其他 Spec 独占的 Component。
- Page 只负责生命周期、加载状态、调用 Repository、组合 Feature 结果和导航。
- Repository 是唯一的数据读写入口。Page、Component 和 Feature 都不能直接调用 `wx.getStorageSync` 或 `wx.cloud.database()`。
- 同一 Phase 的 Spec 不得导入另一项 Spec 的独占目录。

## 4. Starter Kit 目标目录

```text
miniprogram/
├─ app.ts
├─ app.json
├─ config/
│  └─ cloud.ts
├─ domain/
│  ├─ learning-record.ts
│  ├─ learning-preference.ts
│  └─ sync-info.ts
├─ shared/
│  ├─ date/
│  │  ├─ clock.ts
│  │  ├─ local-date.ts
│  │  └─ streak.ts
│  └─ navigation/
│     └─ routes.ts
├─ repositories/
│  ├─ record-repository.ts
│  ├─ preference-repository.ts
│  ├─ composition.ts
│  ├─ record.ts
│  ├─ preference.ts
│  ├─ local-record/
│  ├─ local-preference/
│  ├─ in-memory-record/
│  └─ cloud-record/
├─ fixtures/
│  ├─ scenarios.ts
│  └─ seed.ts
├─ features/
│  ├─ today-summary/
│  ├─ today-activity/
│  ├─ record-create/
│  ├─ tag-picker/
│  ├─ record-detail/
│  ├─ log-timeline/
│  ├─ log-structured-filter/
│  ├─ log-keyword-filter/
│  ├─ statistics-overview/
│  ├─ stats-calendar/
│  ├─ stats-seven-day-trend/
│  ├─ stats-tag-rank/
│  ├─ preference/
│  ├─ sync/
│  ├─ record-edit-delete/
│  └─ remove-all-records/
├─ components/
│  └─ 与每个 feature 对应的可见组件
└─ pages/
   ├─ today/
   ├─ log/
   ├─ stats/
   ├─ record-edit/
   ├─ record-detail/
   └─ settings/
```

`features/` 和对应 Component 在 P0 中已经存在，并导出满足契约的安全默认实现。默认实现可以暂时返回空视图模型或不渲染 Phase 2 区块，但不能抛错、显示假数据或要求另一项 Spec 先完成。

## 5. 领域与 Repository 契约

### 5.1 领域类型

```ts
export type LearningRecord = {
  id: string
  date: string
  createdAt: number
  updatedAt: number
  content: string
  duration: number
  tags: string[]
  takeaway?: string
}

export type RecordInput = {
  content: string
  duration: number
  tags: string[]
  takeaway?: string
}

export type LearningPreference = {
  defaultDuration: number
}

export type SyncInfo = {
  state: 'idle' | 'syncing' | 'synced' | 'failed'
  lastSyncedAt?: number
  message?: string
}
```

字段约束不在各个页面里各写一套。字符串清理、表单校验和错误文案由记录编辑 Feature 统一提供；Repository 仍需防御性校验，不能持久化明显无效的数据。

### 5.2 数据访问接口

```ts
export interface RecordRepository {
  list(): Promise<LearningRecord[]>
  get(id: string): Promise<LearningRecord | null>
  create(input: RecordInput): Promise<LearningRecord>
  update(id: string, input: RecordInput): Promise<LearningRecord>
  remove(id: string): Promise<void>
  removeAllMine(): Promise<void>
  reloadFromCloud(): Promise<LearningRecord[]>
  getSyncInfo(): Promise<SyncInfo>
}

export interface PreferenceRepository {
  get(): Promise<LearningPreference>
  save(input: LearningPreference): Promise<LearningPreference>
}
```

统一语义：

- `get(id)` 只有在成功读取且记录确实不存在时返回 `null`；读取失败必须 reject。
- `create` 负责生成 `id`、本地 `date`、`createdAt` 和 `updatedAt`。
- `update` 只能更新可编辑字段和 `updatedAt`，必须保留原有 `id`、`date` 和 `createdAt`。
- `remove` 和 `removeAllMine` 只有在云端操作实际完成后 resolve。
- `reloadFromCloud` 只重新读取云端内容，不把本地缓存写回云端。
- `getSyncInfo` 返回当前已知状态；同步状态变化后由页面重新读取并更新界面。

### 5.3 P0、P1 与测试使用的实现

| 实现 | 用途 | 负责人 |
| --- | --- | --- |
| Local Record Repository | Starter Kit 和 Phase 1 各分支独立开发；数据保存在专用本地 key | P0 |
| Cloud Record Repository | Phase 1 集成后成为正式运行实现 | P1-08 |
| In-memory Repository | Vitest 中注入固定数据与错误 | P0 |
| Local Preference Repository | 保存默认学习时长 | P0，P1-07 使用 |

P0 的 `repositories/record.ts` 是唯一组合入口。页面只从这里取得 `recordRepository`，不关心当前使用 Local 还是 Cloud 实现。P1-08 完成 Cloud 实现后，由老师在集成 PR 中把组合入口切换到 Cloud；其他学生不修改这个入口。

P1-08 完成 `list`、`get`、`create`、`update`、`remove`、`reloadFromCloud` 和同步状态。`removeAllMine` 的 CloudBase 分批删除由 P2-08 实现；在此之前该方法提供明确的“不支持”失败，不会被任何可见入口调用。

CloudBase collection 中的 `_id` 和 `_openid` 属于存储层字段，映射后再交给页面。`_openid` 不进入 `LearningRecord`，也不能显示、打印或提交到仓库。

## 6. 时间与统计契约

```ts
export interface Clock {
  now(): Date
  today(): string
}

export type StreakSummary = {
  current: number
  longest: number
}
```

P0 提供：

- `SystemClock`：使用设备本地时间。
- `FixedClock`：测试和 Fixture 使用固定时间。
- 本地 `YYYY-MM-DD` 的格式化、解析、比较和日期加减。
- 从记录日期计算 `StreakSummary` 的公共函数。

所有日期分组、最近 7 天、日历和连续学习都使用 `LearningRecord.date`。只有展示创建时刻时才使用 `createdAt`；不能从 UTC 时间戳重新推导记录日期。

## 7. 功能插槽的公开端口

下表只固定跨目录通信所需的最小端口。组件内部的 data、私有方法和样式类名归对应 Spec 自己设计。

| Spec | Feature 公开入口 | Component properties | Component events |
| --- | --- | --- | --- |
| P1-01 | `buildTodaySummary(records, clock)` | `model` | `create-record` |
| P1-02 | `createInitialDraft(preference)`、`validateRecordDraft(draft)` | `mode`、`initialDraft`、`saving`、`saveError` | `submit`、`dirty-change` |
| P1-03 | `collectSuggestedTags(records)`、`normalizeSelectedTags(tags)` | `selectedTags`、`suggestedTags` | `change`，detail 为完整标签数组 |
| P1-04 | `buildRecordDetail(record)` | `loadState`、`model`、`errorMessage` | `retry`、`edit-record`、`return-to-log` |
| P1-05 | `buildLogTimeline(records)` | `loadState`、`summary`、`groups` | `retry`、`open-record`、`create-record` |
| P1-06 | `buildStatisticsOverview(records, clock)` | `loadState`、`model` | `retry`、`create-record` |
| P1-07 | `validateDefaultDuration(value)` | `preference`、`saving`、`saveError`；About 接收 `version` | `save-preference`、`open-privacy` |
| P1-08 | Cloud Repository；`formatSyncInfo(info)` | `syncInfo` | `reload` |
| P2-01 | `buildTodayActivity(records, clock)` | `week`、`todayRecords` | `open-record` |
| P2-02 | 复用 P1-02 校验；`hasRecordDraftChanged(initial, current)` | 扩展 `record-editor` 的编辑状态 | `delete-record`，继续使用 `submit`、`dirty-change` |
| P2-03 | `buildStructuredFilterOptions(records, clock)`、`applyStructuredFilters(records, value)` | `dateOptions`、`tagOptions`、`value` | `change`、`clear` |
| P2-04 | `applyKeywordFilter(records, keyword)`、`buildFilterResultSummary(records)` | `keyword`、`resultSummary`、`hasActiveFilters` | `keyword-change`、`clear-all` |
| P2-05 | `buildMonthCalendar(records, clock)` | `model` | `select-date` |
| P2-06 | `buildSevenDayTrend(records, clock)` | `items` | 无 |
| P2-07 | `buildTagRank(records)` | `items` | `select-tag` |
| P2-08 | Cloud Repository 的 `removeAllMine()` | `removing`、`removeError` | `remove-all` |

公共 event detail：

```ts
type RecordIdEventDetail = { id: string }
type RecordSubmitEventDetail = { draft: RecordInput }
type DirtyChangeEventDetail = { dirty: boolean }
type TagChangeEventDetail = { tags: string[] }
type PreferenceSaveEventDetail = { defaultDuration: number }
type StructuredFilterValue = { date?: string; tag?: string }
type StructuredFilterEventDetail = { value: StructuredFilterValue }
type KeywordChangeEventDetail = { keyword: string }
type DateSelectEventDetail = { date: string }
type TagSelectEventDetail = { tag: string }
```

事件名使用 kebab-case，event detail 使用对象而不是裸字符串。Page 在 P0 中已经绑定这些事件；Spec 不得另发一个意义相同但名称不同的事件。`delete-record` 和 `remove-all` 只能在对应组件完成二次确认后发出，Page 收到事件后只负责调用 Repository 和反馈结果。

## 8. 页面编排契约

### 8.1 统一加载状态

读取数据的页面使用同一组状态：

```ts
export type LoadState = 'loading' | 'ready' | 'error'
```

- `loading`：不能提前显示零记录结论。
- `ready`：根据真实数据进入有数据或空状态。
- `error`：保留仍可信的旧内容，并显示重试；首次加载失败时不能伪装成空状态。

每个 Tab 页在 `onShow` 重新读取 Repository。子页面写入成功后只负责返回，来源页依靠 `onShow` 获得最新数据。

### 8.2 Today

P0 页面依次调用两个互不依赖的 Feature：

```ts
buildTodaySummary(records, clock)   // P1-01
buildTodayActivity(records, clock)  // P2-01
```

Today 的 WXML 已提前放置 `<today-summary>` 和 `<today-activity>`。P1-01 不修改 P2-01 的目录，P2-01 也不改 Today 页面文件。

### 8.3 记录编辑

P0 负责解析：

```text
?mode=create&from=today|log|stats
?mode=edit&id=<recordId>&from=detail&returnTo=today|log
```

`record-editor` 的 WXML 在 P0 中已经包含 `<tag-picker>` 插槽并注册其事件。P1-02 拥有表单及新建流程，P1-03 只实现标签组件；两人不修改同一个文件。

P0 根据 `dirty-change` 统一启用或关闭未保存返回提醒。P1-02 负责在新建表单内容变化时正确发出事件，P2-02 负责让编辑模式沿用相同规则。

Phase 2 中 P2-02 在 P1 表单上增加编辑、未保存返回提醒和单条删除。这是跨 Phase 的顺序扩展，不构成同 Phase 依赖。

- 编辑保存成功后 `navigateBack` 回详情，详情页在 `onShow` 重新读取该记录。
- 删除成功后不能回到已经失效的详情页；编辑页根据 `returnTo` 使用 `wx.switchTab` 回 Today 或学习日志。
- 外部参数不完整时使用学习日志作为安全返回位置。

### 8.4 学习日志

P0 固定处理顺序：

```ts
const structured = applyStructuredFilters(allRecords, structuredFilter)
const result = applyKeywordFilter(structured, keyword)
const timeline = buildLogTimeline(result)
```

三个函数在 P0 都已有可运行默认实现：

- `buildLogTimeline` 由 P1-05 完成。
- `applyStructuredFilters` 在 P0 默认原样返回记录，由 P2-03 完成。
- `applyKeywordFilter` 在 P0 默认原样返回记录，由 P2-04 完成。

日志页 WXML 已提前放置结构化筛选、关键词搜索和时间线三个组件。页面控制器拥有筛选状态和组合顺序，三个 Spec 都不修改 Page。关键词组件发出的“清除全部筛选”事件由 P0 页面控制器处理，同时重置日期、标签和关键词；P2-04 不直接操作 P2-03 的组件。

日志页只在 `onLoad` 解析外部 `date` / `tag` 参数。页面内点击筛选只更新本地状态，不重新启动页面。

### 8.5 学习统计

P0 预先组合四个互不依赖的 Feature：

```ts
buildStatisticsOverview(records, clock) // P1-06
buildMonthCalendar(records, clock)       // P2-05
buildSevenDayTrend(records, clock)       // P2-06
buildTagRank(records)                    // P2-07
```

零记录时页面只显示 P1-06 的空状态，不渲染日历、趋势和排行。四项功能各自根据传入的完整记录计算，互相不能导入。

### 8.6 设置

P0 已放置四个区块：

```text
学习偏好与关于      P1-07
云端同步            P1-08
删除全部记录        P2-08
```

设置页负责从两个 Repository 加载数据并把事件分发给对应 Feature。危险区在 Phase 2 前返回空视图，不提前展示不可用按钮。

## 9. 导航契约

公共路由函数集中在 `shared/navigation/routes.ts`，业务组件只发事件，不自行拼 URL。

| 行为 | 路由方式 |
| --- | --- |
| 打开新建记录 | `wx.navigateTo` 到记录编辑页，带 `mode=create` 和 `from` |
| 打开详情 | `wx.navigateTo` 到详情页，带编码后的 `id` 和 `from` |
| 从详情编辑 | `wx.navigateTo` 到记录编辑页，带 `mode=edit`、`id`、`from=detail` 和原始 `returnTo` Tab |
| 普通 Tab 切换 | `wx.switchTab` |
| 从统计带筛选进入日志 | `wx.reLaunch` 到日志页，带编码后的 `date` 或 `tag` |

`wx.switchTab` 不能携带 query。禁止使用 Storage 临时键、全局变量或事件总线绕过这个限制。

## 10. Fixture 与手动场景

P0 提供相对固定 `Clock` 生成的四个场景：

| 场景 | 用途 |
| --- | --- |
| `empty` | 首次使用、所有数字为零、正常空状态 |
| `today` | 今天两条记录、多个标签、其中一条没有收获 |
| `history` | 跨日期、跨月、同日多条、连续与断档同时可验证 |
| `read-error` | Repository 读取失败，验证错误与重试 |

Fixture 只写入课程专用本地 Storage key，不写 CloudBase。学生可以从开发者工具 Console 调用 P0 暴露的 seed 入口切换场景；每个正式 Spec 会明确自己需要使用哪一个场景以及预期结果。

仅在开发版小程序中，Console 暴露以下入口。切换后会自动重新打开 Today 页面：

```js
await getApp().devFixtures.seed('empty')
await getApp().devFixtures.seed('today')
await getApp().devFixtures.seed('history')
await getApp().devFixtures.seed('read-error')
await getApp().devFixtures.reset()
```

也可以运行 `getApp().devFixtures.help()` 查看提示。`reset()` 会删除 Starter Kit 专用的记录和偏好 key，并恢复默认 Local Repository；它不会清理其他小程序 Storage，也不会调用 CloudBase。

## 11. 测试边界

本课程使用三层验证：

1. Vitest：测试 Feature、日期、校验、筛选和统计等纯 TypeScript 逻辑。
2. TypeScript：`npm run typecheck` 和 `npm run test:typecheck` 检查小程序代码与测试代码。
3. 微信开发者工具：验证 WXML、WXSS、TDesign 组件、导航、CloudBase 和真实交互。

正式 Spec 至少包含一组与其业务规则直接相关的 Vitest 测试，以及一份可以在开发者工具中复现的 Given / When / Then 验收记录。课堂不引入 Storybook，也不要求学生为 TDesign 本身或微信框架内部行为编写测试。

## 12. 文件所有权

### 学生可以修改

- Spec 明确分配的 `components/<name>/`。
- Spec 明确分配的 `features/<name>/`。
- 与该 Feature 一一对应的 `tests/features/<name>/`。
- P1-08 额外拥有 `repositories/cloud-record/`。
- P2-08 额外完成 `repositories/cloud-record/` 中预留的 `removeAllMine` 方法。

### 学生默认不能修改

- `app.ts`、`app.json`、`custom-tab-bar/`。
- `pages/` 下的控制器、WXML、JSON 和 WXSS。
- `domain/`、`shared/`、Repository interface 和组合入口。
- 其他 Spec 的 Component、Feature 与测试目录。
- `project.config.json`、环境 ID、collection 安全规则和 npm 配置。

如果实现过程中发现公共契约缺失，学生应在 PR 中说明阻塞点，由老师补充 P0 或单独创建 integration fix；不能自行改变公共接口后要求其他同学跟随。

## 13. P0 完成清单

只有全部满足后，才能开始 Reference Implementation；最终 16 份 Spec 在 Reference 验证后生成：

- 六个页面路由均可打开，三个 Tab 高亮与页面一致。
- 零记录时所有页面表现为正常产品状态，不出现假数据、报错或未实现 Toast。
- 本文列出的领域类型、Repository、Clock、导航函数和 Feature 函数均已存在并通过类型检查。
- 所有功能组件插槽已在 Page 中接好；学生实现独占目录后不需要修改 Page。
- Local、In-memory Repository 与四个 Fixture 场景可用。
- `npm run check` 通过，微信开发者工具构建成功。
- 每个 Phase 任务都能在自己的分支上通过 Fixture 独立演示。
- CloudBase 环境、collection 和权限规则由老师完成并验证；仓库中没有密钥、个人 OpenID、真实记录或私有配置。

## 14. 从阶段切片到正式 Spec

正式 Spec 不直接从产品文档的章节复制出来，而按以下顺序生成：

```text
产品与 UI 设计
      ↓
Starter Kit Contract
      ↓
P0 + Reference Implementation 验证接口与工作量
      ↓
16 份正式 Spec
      ↓
16 个 GitHub Issue
```

Reference Implementation 可以修正接口名称、插槽或任务大小；一旦正式 Spec 和 Issue 发给学生，这些公共契约在对应 Phase 内冻结。
