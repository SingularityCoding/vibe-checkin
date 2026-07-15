---
title: P1-05 学习日志时间线
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, log]
---

# Introduction

本 Spec 交付学习日志页的核心浏览体验：把全部学习记录按本地日期分组、组内按创建时间排序，并给出全局摘要（打卡日、记录数量、累计分钟）。这是学习日志页四个功能区之一——另外两个是结构化筛选（P2-03）和关键词搜索（P2-04），都在 Phase 2 才实现；Phase 1 阶段用户在日志页看到的是全部历史记录的完整时间线，没有任何筛选生效。

## 1. Purpose & Scope

**目的**：让用户能够回看全部学习记录的历史轨迹——总共打卡多少天、记了多少条、累计学了多久，并按日期从近到远、同日按记录时间从新到旧浏览每一条记录，点击进入详情。

**范围**：
- `miniprogram/features/log-timeline/index.ts` — 纯函数 `buildLogTimeline`
- `miniprogram/components/log-timeline/` — 展示摘要、分组时间线、空状态和错误状态的 Component
- `miniprogram/pages/log/index.ts` — 作为 Phase 1 该页面的主要集成人，负责 `onShow` 读取 Repository、`LoadState` 编排、把 `buildLogTimeline` 的结果和 `hasActiveFilters` 传给 Component、绑定 `retry`/`create-record`/`open-record` 事件
- 对应 Vitest 测试 `tests/features/log-timeline.test.ts`

**不在范围内**：
- 结构化的日期／标签筛选（`features/log-structured-filter/`、`components/log-structured-filters/`）——属于 [P2-03](../phase-2/p2-03-log-structured-filter.md)，Phase 1 阶段 `applyStructuredFilters` 保持 P0 提供的原样返回实现。
- 关键词搜索（`features/log-keyword-filter/`、`components/log-keyword-search/`）——属于 [P2-04](../phase-2/p2-04-log-keyword-search.md)，Phase 1 阶段 `applyKeywordFilter` 保持 P0 提供的原样返回实现。
- 记录详情页本身（属于 P1-04）、新建记录表单本身（属于 P1-02）。

`buildLogTimeline(records)` 只接收一份已经确定好的记录数组，对调用方是否做过筛选一无所知，也不需要知道——本 Spec 交付的是"给定一组记录，如何分组、排序、汇总"，不是"如何决定这组记录是什么"。

**读者假设**：实现者已经 clone 了 `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中打开学习日志页并看到 P0 预置的结构化筛选、关键词搜索和时间线三个组件（筛选组件此时不产生任何效果）。实现者不需要修改 Starter Kit 已经提供的 `domain/`、`shared/date/`、`repositories/`、`fixtures/` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `打卡日` (check-in day) | 至少包含一条学习记录的本地日历日期；同日多条记录只算一个打卡日，定义见 [产品设计 §「打卡日」](../../product-design.md) |
| `分组` (timeline group) | 时间线里同一个本地日期下的所有记录聚合成的一项，包含该日期的分钟合计与记录列表 |
| `LoadState` | `'loading' \| 'ready' \| 'error'`，页面数据加载状态，定义见 [Starter Kit Contract §8.1](../../starter-kit-contract.md#81-统一加载状态) |
| `hasActiveFilters` | Component 的展示态开关，由 Page 计算并传入，指示当前是否有日期／标签／关键词条件正在生效；`buildLogTimeline` 本身不接收也不产生这个值，见 §7 Rationale |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildLogTimeline(records)` 必须按 `record.date`（本地日期字符串）对记录分组，不得使用 `createdAt` 重新推导所属日期；同一日期即使 `createdAt` 落在跨零点的深夜也必须归入 `date` 字段声明的那一天。
- **REQ-002**: 分组必须按日期倒序排列（最近日期在前），使用 `shared/date/local-date.ts` 的 `compareLocalDates` 比较，不得自行实现日期比较。
- **REQ-003**: 同一分组内的记录必须按 `createdAt` 倒序排列（最新创建的在前）。
- **REQ-004**: 每个分组的 `totalMinutes` 必须只累加该分组自身记录的 `duration`，不得包含其他日期的记录。
- **REQ-005**: 返回的 `summary.recordCount` 必须等于传入记录总数；`summary.totalMinutes` 必须是全部记录 `duration` 之和；`summary.checkInDays` 必须是去重后的日期数量（等于分组数）。
- **REQ-006**: 每条时间线记录（`LogTimelineRecord`）必须携带 `id`、`time`（由 `createdAt` 格式化出的本地 `HH:mm`）、`duration`、`content`、`tags`（原样复制，不做过滤或排序）。
- **REQ-007**: 分组的 `dateLabel` 必须格式化为 `M 月 D 日 · 周X`（如 `7 月 15 日 · 周三`），星期使用本地 `getDay()` 结果映射到「日一二三四五六」。
- **REQ-008**: 记录数组为空时必须返回 `{ summary: { checkInDays: 0, recordCount: 0, totalMinutes: 0 }, groups: [] }`，不得抛错或返回 `undefined` 字段。
- **REQ-009**: Component 在 `groups` 为空且 `hasActiveFilters` 为 `false` 时展示"还没有学习记录"的首次使用引导（标题、说明文案、「记录第一次学习」按钮）；点击按钮触发 `create-record` 事件。
- **REQ-010**: Component 在 `groups` 为空但 `hasActiveFilters` 为 `true` 时不得渲染首次使用引导——渲染空白区域即可，避免和关键词搜索组件自身的"没有找到匹配的学习记录 / 清除全部筛选"反馈同时出现、相互矛盾。
- **REQ-011**: Component 摘要行文案需要随 `hasActiveFilters` 变化：为 `false` 时显示"全部记录 · N 个打卡日 · M 分钟"，为 `true` 时显示"筛选结果 · N 个打卡日 · M 分钟"。
- **REQ-012**: 点击记录卡片必须触发 `open-record` 事件，`detail` 为 `{ id: string }`；只有 `dataset.id` 存在时才触发，不发出不完整的事件。
- **REQ-013**: `loadState === 'error'` 时展示固定错误说明与「重新加载」按钮，点击触发 `retry` 事件；Page 收到后重新调用 `recordRepository.list()`。
- **CON-001**: 不得实现或修改结构化筛选与关键词搜索——这是 P2-03、P2-04 的范围。`features/log-structured-filter/`、`components/log-structured-filters/`、`features/log-keyword-filter/`、`components/log-keyword-search/` 目录下的任何文件都不得修改。
- **CON-002**: `buildLogTimeline` 必须是不依赖 `Clock`、不产生副作用的纯函数；不得读取当前时间来决定分组或排序（与 P1-01/P1-06 不同，时间线的"今天在最上面"是日期倒序排序的自然结果，不是显式的"今天"判断）。
- **CON-003**: `log-timeline` Component 只能通过 `properties`（`loadState`、`summary`、`groups`、`hasActiveFilters`）接收数据、通过 `retry`/`create-record`/`open-record` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读取其他组件的状态。
- **CON-004**: Page 侧的处理顺序必须遵循 Starter 固定的管线（[Starter Kit Contract §8.4](../../starter-kit-contract.md#84-学习日志)）：先 `applyStructuredFilters`，再 `applyKeywordFilter`，最后把结果交给 `buildLogTimeline`；Phase 1 阶段前两步是 P0 提供的原样返回实现，本 Spec 不得绕过这个顺序直接把 `recordRepository.list()` 的结果传给 `buildLogTimeline`。
- **GUD-001**: 复用 `shared/date/local-date.ts` 的 `compareLocalDates`/`parseLocalDate`，不重新实现日期解析或比较逻辑。
- **PAT-001**: 页面遵循 Starter 统一的 `LoadState` 模式：`loading` 阶段不能提前展示"零记录"的空状态；`error` 阶段保留上一次已知的可信内容并提供重试，不能把失败伪装成空状态。

## 4. Interfaces & Data Contracts

### Feature：`features/log-timeline/index.ts`

```ts
export type LogTimelineSummary = {
  checkInDays: number
  recordCount: number
  totalMinutes: number
}

export type LogTimelineRecord = {
  id: string
  time: string
  duration: number
  content: string
  tags: string[]
}

export type LogTimelineGroup = {
  date: string
  dateLabel: string
  totalMinutes: number
  records: LogTimelineRecord[]
}

export type LogTimelineViewModel = {
  summary: LogTimelineSummary
  groups: LogTimelineGroup[]
}

export const buildLogTimeline = (
  records: readonly LearningRecord[],
): LogTimelineViewModel
```

这是 Starter 已固定的公开端口（见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)）；本 Spec 不新增导出函数，只把 P0 的安全默认实现替换为真实分组/排序/汇总逻辑。

### Component：`components/log-timeline/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `loadState` | `LoadState` | `'loading'` |
| `summary` | `LogTimelineSummary` | `{ checkInDays: 0, recordCount: 0, totalMinutes: 0 }` |
| `groups` | `LogTimelineGroup[]` | `[]` |
| `hasActiveFilters` | `boolean` | `false` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `retry` | 无 | `loadState === 'error'` 时点击「重新加载」 |
| `create-record` | 无 | 首次使用空状态下点击「记录第一次学习」 |
| `open-record` | `{ id: string }` | 点击某条记录卡片 |

`hasActiveFilters` 不属于 P0 最初的三端口（`loadState`/`summary`/`groups`），是本 Spec 的 Component 在与 Phase 2 集成时补充的第四个 property，专门用于 §7 描述的空状态去重需求；它不改变 `buildLogTimeline` 的签名或返回值。

### Page 编排：`pages/log/index.ts`

学习日志页固定处理顺序（[Starter Kit Contract §8.4](../../starter-kit-contract.md#84-学习日志)）：

```ts
const structuredRecords = applyStructuredFilters(records, structuredFilter) // P2-03，Phase 1 原样返回
const filteredRecords = applyKeywordFilter(structuredRecords, keyword)      // P2-04，Phase 1 原样返回
const timeline = buildLogTimeline(filteredRecords)                          // 本 Spec

this.setData({
  timeline,
  hasActiveFilters: Boolean(structuredFilter.date || structuredFilter.tag || keyword.trim()),
})
```

`onShow` 时重新调用 `recordRepository.list()` 并通过 `rebuildView` 重建管线；`open-record` 事件绑定到 `wx.navigateTo({ url: buildRecordDetailRoute(id, 'log') })`；`create-record` 事件绑定到 `wx.navigateTo({ url: buildCreateRecordRoute('log') })`；`retry` 事件绑定到重新执行 `loadRecords()`。`onLoad` 只解析外部 `date`/`tag` 参数写入初始 `structuredFilter`，不重新启动页面。

## 5. Acceptance Criteria

- **AC-001**: Given 一个空的记录数组, When 调用 `buildLogTimeline([])`, Then 返回 `{ summary: { checkInDays: 0, recordCount: 0, totalMinutes: 0 }, groups: [] }`。
- **AC-002**: Given 三条分别属于 `2026-07-10`、`2026-07-15`、`2026-07-12` 的记录, When 调用 `buildLogTimeline`, Then `groups` 按日期倒序返回 `['2026-07-15', '2026-07-12', '2026-07-10']`。
- **AC-003**: Given 同一天 `2026-07-15` 的两条记录，创建时间分别为 `08:40`（"早上学习"）和 `15:05`（"下午学习"）, When 调用 `buildLogTimeline`, Then 该分组的 `records` 顺序为 `['afternoon', 'morning']`，且第一条 `time` 为 `'15:05'`、第二条为 `'08:40'`。
- **AC-004**: Given `2026-07-15` 两条记录（40、20 分钟）与 `2026-07-14` 一条记录（50 分钟）, When 调用 `buildLogTimeline`, Then `2026-07-15` 分组 `totalMinutes` 为 60，`2026-07-14` 分组 `totalMinutes` 为 50（互不污染）。
- **AC-005**: Given 四条记录分布在三个不同日期（其中一个日期有两条）, When 调用 `buildLogTimeline`, Then `summary` 为 `{ checkInDays: 3, recordCount: 4, totalMinutes: 170 }`。
- **AC-006**: Given 一条 `date` 为 `2026-07-14` 但 `createdAt` 是 `2026-07-15 00:30`（跨零点的深夜记录）, When 调用 `buildLogTimeline`, Then 该记录归入 `2026-07-14` 分组，不归入 `2026-07-15`。
- **AC-007**: Given 一条记录 `content` 为 `'给学习助手补完了工具调用的边界'`、`tags` 为 `['Agent', 'MCP']`、`duration` 为 45, When 调用 `buildLogTimeline`, Then 对应的 `LogTimelineRecord` 精确等于 `{ id, time: '09:00', duration: 45, content, tags: ['Agent', 'MCP'] }`。
- **AC-008**: Given 一条 `date` 为 `2026-07-15`（星期三）的记录, When 调用 `buildLogTimeline`, Then 该分组 `dateLabel` 为 `'7 月 15 日 · 周三'`。
- **AC-009**: Given 微信开发者工具选择编译场景「测试场景 · 空数据」, When 打开学习日志页, Then 展示「还没有学习记录」空状态，点击「记录第一次学习」进入新建记录页。
- **AC-010**: Given 编译场景「测试场景 · 学习日志」（使用 `history` Fixture）, When 打开学习日志页, Then 摘要显示「全部记录 · 7 个打卡日 · ... 分钟」（该 Fixture 的 8 条记录分布在 7 个不同日期），时间线从今天的分组开始向历史日期倒序排列，今天分组内先展示下午创建的记录、再展示早上创建的记录；点击任意记录卡片进入学习详情。
- **AC-011**: Given 编译场景「测试场景 · 读取失败」, When 打开学习日志页, Then 展示错误说明与「重新加载」按钮；点击按钮后页面重新尝试读取。
- **AC-012**: Given 组件 `groups` 为空、`hasActiveFilters` 为 `true`（Phase 2 场景，此处通过检查 `components/log-timeline/index.wxml` 的渲染分支与手动在开发者工具调试面板中设置该 property 验证）, When 渲染, Then 不出现「还没有学习记录」引导文案，避免和关键词搜索组件自身的"没有找到匹配"反馈同时出现。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildLogTimeline` 的纯函数逻辑，覆盖 AC-001 至 AC-008，对应 `tests/features/log-timeline.test.ts` 的 8 个用例。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-009 至 AC-011，使用 Starter 已配置好的编译场景；AC-012 是 Component 渲染分支的代码走查 + 手动 property 验证，不是自动化用例（组件内部渲染逻辑不在 Vitest 测试边界内，见 [Starter Kit Contract §11](../../starter-kit-contract.md#11-测试边界)）。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：Vitest 用例用固定的 `timestamp(year, month, day, hour, minute)` 辅助函数构造 `LearningRecord`，不依赖真实系统时间；手工验收使用 Starter 提供的 `empty`/`history`/`read-error` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，测试断言分组/排序/汇总的业务规则本身，不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯本地计算与 UI 展示，无性能测试要求；记录数量在课程场景下不会大到需要虚拟列表或分页）。

## 7. Rationale & Context

`buildLogTimeline` 被设计成只接收 `records` 一个参数、不接收 `Clock`，是因为时间线的排序完全由记录自身的日期和创建时间决定，不需要知道"现在是什么时候"；这与 P1-01、P1-06 需要 `Clock` 来判断"今天"形成对比，也让这个函数在测试里更容易构造确定性用例。

`hasActiveFilters` 这个 property 不是 Phase 1 最初设计的一部分，而是在后续与结构化筛选、关键词搜索集成时补上的：当用户输入的关键词或选择的日期/标签让筛选结果归零时，关键词搜索组件（P2-04）会展示自己的"没有找到匹配的学习记录 · 清除全部筛选"反馈；如果这时时间线组件仍然按照"完全没有记录"的逻辑展示"还没有学习记录 · 记录第一次学习"，两段文案会同时出现且相互矛盾——对一个已经写过记录、只是这次筛选没有命中的用户来说，"记录第一次学习"是错误的引导。解法是让 Page 把它已经在算的 `hasActiveFilters`（是否有日期、标签或关键词条件在生效）透传给时间线组件，组件据此在"真正的零记录"和"筛选后的零结果"之间做区分。这个 property 本身只是一个展示态开关，`buildLogTimeline` 这个 Feature 完全不需要知道筛选是否存在——它永远只是"给什么记录，就分组汇总什么记录"，让 P2-03、P2-04 在不改动本 Spec 交付物的前提下就能正确复用时间线组件。

分组按日期倒序、组内按创建时间倒序，对应产品设计里"回看历史、组合筛选和回找学习上下文"的日志页定位（见 [产品设计 §7.3](../../product-design.md)）：用户最关心的是"我最近学了什么"，所以最新的日期和当天最新的记录始终排在最上面。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `shared/date/local-date.ts` 提供的 `compareLocalDates`/`parseLocalDate`——Starter 已提供，本 Spec 直接复用，不重新实现日期比较或解析。
- **INF-002**: `domain/load-state.ts` 的 `LoadState`——Starter 已提供的统一加载状态类型。
- **INF-003**: `repositories/record.ts` 的 `recordRepository.list()`——数据读取的唯一入口，本 Spec 不直接访问 Storage 或 CloudBase。
- **INF-004**: `shared/navigation/routes.ts` 的 `buildCreateRecordRoute`/`buildRecordDetailRoute`——所有导航必须通过这两个函数生成 URL，不手工拼接。
- **INF-005**: `fixtures/ready.ts` 的 `isFixtureReady()`——Page 在首次读取 Repository 前等待 Fixture 就绪，本 Spec 沿用 P0 已有的调用方式。
- **INF-006**: `features/log-structured-filter/index.ts` 的 `applyStructuredFilters`、`features/log-keyword-filter/index.ts` 的 `applyKeywordFilter`——Phase 1 阶段是 P0 提供的原样返回实现，本 Spec 按固定顺序调用它们产出 `buildLogTimeline` 的输入，但不修改它们的实现（CON-001、CON-004）。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `empty`/`history`/`read-error` 场景——手工验收使用，`history` 场景包含 8 条记录、分布在 7 个不同日期（含当天两条），由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 深夜记录必须按 date 字段分组，不能按 createdAt 的本地日历日重新推导
const records = [
  {
    id: 'late-night',
    date: '2026-07-14',
    createdAt: new Date(2026, 6, 15, 0, 30).getTime(), // 已经是 7 月 15 日凌晨
    updatedAt: new Date(2026, 6, 15, 0, 30).getTime(),
    content: '深夜复盘',
    duration: 25,
    tags: [],
  },
]

buildLogTimeline(records).groups[0].date // => '2026-07-14'，不是 '2026-07-15'
```

```ts
// 同日多条记录：分组内按创建时间倒序，分钟数只属于当天
const records = [
  recordOn('2026-07-15', 8, 0, 40),   // 早上
  recordOn('2026-07-15', 15, 0, 20),  // 下午
  recordOn('2026-07-14', 19, 0, 50),  // 昨天
]

buildLogTimeline(records)
// groups[0] => { date: '2026-07-15', totalMinutes: 60, records: [下午的记录, 早上的记录] }
// groups[1] => { date: '2026-07-14', totalMinutes: 50, records: [...] }
// summary => { checkInDays: 2, recordCount: 3, totalMinutes: 110 }
```

```ts
// 边界情况：完全没有记录时不抛错，返回全零的安全默认值
buildLogTimeline([])
// => { summary: { checkInDays: 0, recordCount: 0, totalMinutes: 0 }, groups: [] }
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且 `tests/features/log-timeline.test.ts` 的 8 个用例覆盖 AC-001 至 AC-008。
- 在微信开发者工具中依次使用「测试场景 · 空数据」「测试场景 · 学习日志」「测试场景 · 读取失败」三个编译场景验证 AC-009 至 AC-011。
- Code Review 确认：未修改 `features/log-structured-filter/`、`components/log-structured-filters/`、`features/log-keyword-filter/`、`components/log-keyword-search/` 目录下任何文件（CON-001）；`buildLogTimeline` 未接收或使用 `Clock` 参数（CON-002）；`log-timeline` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-003）；`components/log-timeline/index.wxml` 中 `!groups.length && !hasActiveFilters` 的空状态分支与 `!groups.length` 的空白分支符合 REQ-009、REQ-010（AC-012）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.3 — 学习日志页的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — 学习日志页视觉规范
- P2-03 日期与标签筛选 — 同一页面的 Phase 2 主要集成人，负责 `applyStructuredFilters` 与结构化筛选组件
- P2-04 关键词搜索 — 同一页面的 Phase 2 延伸功能，负责 `applyKeywordFilter` 与 `hasActiveFilters` 的另一半消费方
- P1-04 学习记录详情 — 时间线卡片 `open-record` 事件的导航目的地
