---
title: P1-06 学习统计总览
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, statistics]
---

# Introduction

本 Spec 交付学习统计页的核心总览：当前连续学习天数、最长连续学习天数、累计打卡日和累计学习分钟；没有任何记录时只显示引导用户新建第一条记录的空状态。这是学习统计页四个互不依赖的功能区之一（另外三个是 P2-05 本月学习日历、P2-06 最近 7 天投入趋势、P2-07 学习主题 Top 3，均在 Phase 2 才实现），本 Spec 同时负责统计页零记录时的整体门控——没有记录时，日历、趋势和排行三个区块都不能渲染。

## 1. Purpose & Scope

**目的**：让用户打开学习统计页就能立刻看到自己的坚持程度（当前连续了多少天、历史最长连续多少天）和投入规模（累计打卡了多少天、累计学习了多少分钟），并在完全没有记录时给出清晰的引导行动，而不是展示一堆空图表或虚构数据。

**范围**：
- `miniprogram/features/statistics-overview/index.ts` — 纯函数 `buildStatisticsOverview`
- `miniprogram/components/stats-overview/` — 展示总览卡片、空状态与加载/错误态的 Component
- `miniprogram/pages/stats/index.ts`/`.wxml` — 仅涉及调用 `buildStatisticsOverview`、把结果传给 `<stats-overview>`，以及依据 `overview.hasRecords` 决定是否渲染日历/趋势/排行三个区块这部分逻辑
- 对应 Vitest 测试

**不在范围内**：本月学习日历的内容与交互（属于 P2-05，见 [P2-05 Spec](../phase-2/p2-05-stats-calendar.md)）、最近 7 天投入趋势的内容与交互（属于 P2-06，见 [P2-06 Spec](../phase-2/p2-06-stats-seven-day-trend.md)）、学习主题 Top 3 的内容与交互（属于 P2-07，见 [P2-07 Spec](../phase-2/p2-07-stats-tag-rank.md)）。本 Spec 不实现这三个区块的任何内容，但负责确保它们在零记录时不出现——即负责 `overview.hasRecords` 这个门控标志的正确性与页面对它的使用方式。

**读者假设**：实现者已经 clone 了 `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中正常打开学习统计页并看到空状态。实现者不需要修改 Starter Kit 已经提供的 `domain/`、`shared/date/`、`repositories/`、`fixtures/` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `Clock` | 提供 `now()`/`today()` 的时间抽象；生产环境用 `SystemClock`，测试用 `FixedClock` |
| `本地日期` | `Clock.today()` 返回的 `YYYY-MM-DD` 格式字符串，按设备本地时区计算，不是 UTC 日期 |
| `打卡日` (Check-in Day) | 至少包含一条学习记录的本地日历日期；同一天多条记录只算一个打卡日 |
| `当前连续` (Current Streak) | 由 `shared/date/streak.ts` 的 `calculateStreakSummary` 计算得出的 `{ current, longest }`；本 Spec 取其 `current` 字段，规则为：今天有记录则从今天开始向前连续计算；今天没有记录而昨天有记录则从昨天开始；今天和昨天都没有记录则为 0 |
| `最长连续` (Longest Streak) | `calculateStreakSummary` 返回的 `longest` 字段，全部历史打卡日中最长的一段连续日期天数 |
| `hasRecords` | `StatisticsOverviewViewModel` 上的门控字段，`records.length === 0` 时为 `false`；`pages/stats/index.wxml` 用它决定是否渲染日历、趋势和主题排行三个区块 |
| `LoadState` | `'loading' \| 'ready' \| 'error'`，页面数据加载状态，定义见 [Starter Kit Contract §8.1](../../starter-kit-contract.md#81-统一加载状态) |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildStatisticsOverview(records, clock)` 当 `records.length === 0` 时，必须返回固定的空总览：`{ hasRecords: false, currentStreak: 0, longestStreak: 0, checkInDays: 0, totalMinutes: 0 }`。
- **REQ-002**: 当 `records.length > 0` 时，返回值的 `hasRecords` 必须为 `true`。
- **REQ-003**: `currentStreak` 与 `longestStreak` 必须通过调用 `shared/date/streak.ts` 导出的 `calculateStreakSummary(records, clock)` 取其 `current`/`longest` 字段得到，不得重新实现连续天数算法。
- **REQ-004**: `checkInDays` 必须是全部记录去重后的 `date` 数量（`new Set(records.map(r => r.date)).size`），同一天多条记录只计一次。
- **REQ-005**: `totalMinutes` 必须是全部记录 `duration` 字段的总和，不做去重——同一天多条记录的时长要分别累加。
- **REQ-006**: 点击空状态的行动按钮必须通过 `shared/navigation/routes.ts` 的 `buildCreateRecordRoute('stats')` 生成的路由导航到新建记录页，不得手工拼接 URL 字符串。
- **REQ-007**: `pages/stats/index.wxml` 必须依据 `overview.hasRecords` 门控日历（P2-05）、7 天趋势（P2-06）、主题排行（P2-07）三个组件的渲染：`hasRecords` 为 `false` 时这三个组件都不得出现在页面上（不只是隐藏，而是不渲染），避免出现"零记录但展示空图表"的体验。
- **CON-001**: 不得实现或修改本月学习日历、7 天投入趋势、学习主题 Top 3 的内容——这三者分别是 P2-05、P2-06、P2-07 的范围。`features/stats-calendar/`、`components/stats-calendar/`、`features/stats-seven-day-trend/`、`components/stats-seven-day-trend/`、`features/stats-tag-rank/`、`components/stats-tag-rank/` 目录下的任何文件都不得修改。
- **CON-002**: `stats-overview` Component 只能通过 `properties.loadState`/`properties.model` 接收数据、通过 `retry`/`create-record` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例。
- **CON-003**: 所有打卡日、连续和累计分钟的判断必须基于 `LearningRecord.date`（本地日期字符串），不得从 `createdAt`（UTC 毫秒时间戳）重新推导。
- **GUD-001**: 复用 Starter 已提供的 `Clock` 抽象与 `shared/date/streak.ts` 的 `calculateStreakSummary`，不重新实现日期解析/比较/连续计算逻辑；这套算法与 P1-01 Today 概览共用同一实现，避免两处对"今天缺席算不算断档"产生不一致的结果。
- **PAT-001**: 页面遵循 Starter 统一的 `LoadState` 模式：`loading` 阶段不能提前展示"零记录"的总览；`error` 阶段展示明确的失败说明和重试按钮，不能把失败伪装成空状态。

## 4. Interfaces & Data Contracts

### Feature：`features/statistics-overview/index.ts`

```ts
export type StatisticsOverviewViewModel = {
  hasRecords: boolean
  currentStreak: number
  longestStreak: number
  checkInDays: number
  totalMinutes: number
}

export const buildStatisticsOverview = (
  records: readonly LearningRecord[],
  clock: Clock,
): StatisticsOverviewViewModel
```

`hasRecords` 字段是本 Spec 在 Starter 已固定的公开端口（`buildStatisticsOverview` 签名、`model` property、`retry`/`create-record` event，见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)）基础上新增的返回值字段，用于让 `pages/stats/index.wxml` 和其他三个 Phase 2 功能区共同判断是否应该渲染，而不必反向解析总览中的数值是否全为零。

### Component：`components/stats-overview/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `loadState` | `LoadState` | `'loading'` |
| `model` | `StatisticsOverviewViewModel` | `{ hasRecords: false, currentStreak: 0, longestStreak: 0, checkInDays: 0, totalMinutes: 0 }` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `retry` | 无 | `loadState` 为 `'error'` 时用户点击「重新加载」 |
| `create-record` | 无 | `model.hasRecords` 为 `false` 时用户点击空状态的「记录第一次学习」 |

Component 内部按 `loadState`/`model.hasRecords` 三态渲染：
- `loadState === 'loading'`：显示加载指示，不展示任何统计数字。
- `loadState === 'error'`：显示失败说明和「重新加载」按钮，触发 `retry`。
- `loadState === 'ready'` 且 `!model.hasRecords`：显示空状态卡片（标题「从一次学习开始」），触发 `create-record`。
- `loadState === 'ready'` 且 `model.hasRecords`：显示连续学习卡（当前连续、最长连续）与累计卡（累计打卡日、累计投入分钟）。

### Page 编排：`pages/stats/index.ts`

学习统计页依次调用四个互不依赖的 Feature（P0 已经这样编排，本 Spec 只需要保证 `buildStatisticsOverview` 这一份是真实实现，并让 WXML 依据它的 `hasRecords` 门控其余三个组件）：

```ts
buildStatisticsOverview(records, clock)  // 本 Spec
buildMonthCalendar(records, clock)       // P2-05，本 Spec 不实现，保持 Starter 安全默认
buildSevenDayTrend(records, clock)       // P2-06，本 Spec 不实现，保持 Starter 安全默认
buildTagRank(records)                    // P2-07，本 Spec 不实现，保持 Starter 安全默认
```

`onShow` 时先校验 Fixture 是否就绪（`isFixtureReady()`），再调用 `recordRepository.list()` 并重建四个视图模型；`create-record` 事件绑定到 `wx.navigateTo({ url: buildCreateRecordRoute('stats') })`；`retry` 事件绑定到重新执行 `loadRecords()`。

WXML 门控写法：

```html
<stats-overview
  load-state="{{loadState}}"
  model="{{overview}}"
  bind:retry="retryLoad"
  bind:create-record="openRecordEditor"
/>
<block wx:if="{{overview.hasRecords}}">
  <stats-calendar model="{{calendar}}" bind:select-date="openLogByDate" />
  <stats-seven-day-trend items="{{trend}}" />
  <stats-tag-rank items="{{tagRank}}" bind:select-tag="openLogByTag" />
</block>
```

## 5. Acceptance Criteria

- **AC-001**: Given 一个空的记录数组, When 调用 `buildStatisticsOverview([], clock)`, Then 返回 `{ hasRecords: false, currentStreak: 0, longestStreak: 0, checkInDays: 0, totalMinutes: 0 }`。
- **AC-002**: Given 当天存在 2 条记录（30、20 分钟）与 1 条昨天的记录（25 分钟）, When 调用 `buildStatisticsOverview`, Then `hasRecords` 为 `true`、`checkInDays` 为 2（同日两条只算一个打卡日）、`totalMinutes` 为 75（三条时长全部累加）、`currentStreak` 为 2、`longestStreak` 为 2。
- **AC-003**: Given 今天没有记录、昨天有一条（40 分钟）、前天有一条（35 分钟）、5 天前还有一条（15 分钟）, When 调用 `buildStatisticsOverview`, Then `currentStreak` 为 2（从昨天开始向前连续计算，今天缺席不影响）、`longestStreak` 为 2、`checkInDays` 为 3、`totalMinutes` 为 90。
- **AC-004**: Given 记录为 2026-06-29（30 分钟）、2026-06-30（30 分钟）、2026-07-01（30 分钟）连续三天，之后 2026-07-05（20 分钟）单独一条（`clock.today()` 为 2026-07-15）, When 调用 `buildStatisticsOverview`, Then `longestStreak` 为 3（正确跨月计算连续段），`currentStreak` 为 0（今天和昨天都没有记录，当前连续已断档）、`checkInDays` 为 4、`totalMinutes` 为 110。
- **AC-005**: Given 微信开发者工具选择编译场景「测试场景 · 空数据」, When 打开学习统计页, Then 总览显示空状态「从一次学习开始」，日历、7 天趋势和主题排行三个区块均不渲染，点击「记录第一次学习」进入新建记录页。
- **AC-006**: Given 编译场景「测试场景 · 历史记录」, When 打开学习统计页, Then 总览显示的当前连续、最长连续、累计打卡日和累计分钟与该 Fixture 场景的记录日期分布和时长一致；离开小程序重新进入后（`onShow` 重新读取），数值保持稳定不跳变。
- **AC-007**: Given 编译场景「测试场景 · 读取失败」, When 打开学习统计页, Then 总览显示失败说明和「重新加载」按钮，不展示零记录的空状态，点击「重新加载」后（若数据源恢复）能重新进入 `ready` 状态。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildStatisticsOverview` 的纯函数逻辑，覆盖 AC-001 至 AC-004。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-005 至 AC-007，使用 Starter 已配置好的编译场景，不需要额外搭建环境。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：使用 `FixedClock` 固定测试时间，避免测试结果随实际运行日期漂移；手工验收使用 Starter 提供的 `empty`/`history`/`read-error` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（数值、`hasRecords` 门控），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯 UI 与本地计算，无性能测试要求）。

## 7. Rationale & Context

`hasRecords` 被设计成 `StatisticsOverviewViewModel` 上的显式字段而不是让页面反查四个数字是否全为零，是因为空状态判断只应该有一处权威来源；如果日历、趋势、排行三个 Phase 2 Spec 各自判断"是否应该渲染"，容易在某个 Feature 已经产生非零数据但总览仍视为空记录时出现不一致的界面（例如某条记录只带标签没有产生打卡日，理论上不会发生，但把判断集中到一处可以从设计上排除这种风险）。产品设计明确要求"没有任何记录时只显示空状态和'去记录第一次学习'，不显示空图表、虚构数据或奖励元素"（见 [产品设计 §7.5](../../product-design.md)），因此这个门控不是可选的视觉优化，而是本 Spec 的硬性职责。

`currentStreak`/`longestStreak` 复用 `shared/date/streak.ts` 而不是在本 Feature 内重新实现，是因为同一套连续天数算法在 P1-01（Today 概览）中也要用到；如果两处各写一套，容易在"今天缺席算不算断档"这类边界情况上产生不一致的用户体验。

`checkInDays` 与 `totalMinutes` 采用不同的聚合方式（前者去重、后者不去重）直接对应产品设计 §8 的统计口径表：同一天多条记录只贡献一个打卡日，但每条记录的时长都要计入累计投入，这是"打卡"和"投入量"两种不同心智模型的自然结果。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `shared/date/clock.ts` 提供的 `Clock` 抽象（`SystemClock`/`FixedClock`）——Starter 已提供，本 Spec 直接使用。
- **INF-002**: `shared/date/streak.ts` 提供的 `calculateStreakSummary`——Starter 已提供，本 Spec 直接复用，不重新实现。
- **INF-003**: `repositories/record.ts` 的 `recordRepository.list()`——数据读取的唯一入口，本 Spec 不直接访问 Storage 或 CloudBase。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `empty`/`history`/`read-error` 场景——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 同一天多条记录：打卡日只算一次，但分钟数要分别累加
const records = [
  recordOn('2026-07-15', 30),
  recordOn('2026-07-15', 20),
  recordOn('2026-07-14', 25),
]

buildStatisticsOverview(records, clock)
// => { hasRecords: true, checkInDays: 2, totalMinutes: 75, currentStreak: 2, longestStreak: 2 }
```

```ts
// 边界情况：今天没有记录但昨天有，当前连续从昨天开始计算，不视为断档
const records = [
  recordOn('2026-07-14', 40),
  recordOn('2026-07-13', 35),
  recordOn('2026-07-10', 15),
]

buildStatisticsOverview(records, clock)
// => currentStreak: 2（今天缺席不影响，从昨天向前数）
```

```ts
// 边界情况：跨月连续段构成历史最长连续，但当前已经断档
const records = [
  recordOn('2026-06-29', 30),
  recordOn('2026-06-30', 30),
  recordOn('2026-07-01', 30),
  recordOn('2026-07-05', 20), // 与 07-01 之间断档，不参与当前连续
]

buildStatisticsOverview(records, clock)
// => longestStreak: 3（06-29 到 07-01 跨月连续三天），currentStreak: 0（今天和昨天都无记录）
```

```ts
// 边界情况：完全没有记录时必须返回固定空总览，不能返回 undefined 字段或抛错，
// 页面据此让日历、趋势和主题排行三个区块都不渲染
buildStatisticsOverview([], clock)
// => { hasRecords: false, currentStreak: 0, longestStreak: 0, checkInDays: 0, totalMinutes: 0 }
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增的 Vitest 用例覆盖 AC-001 至 AC-004。
- 在微信开发者工具中依次使用「测试场景 · 空数据」「测试场景 · 历史记录」「测试场景 · 读取失败」三个编译场景验证 AC-005 至 AC-007。
- Code Review 确认：未修改 `features/stats-calendar/`、`components/stats-calendar/`、`features/stats-seven-day-trend/`、`components/stats-seven-day-trend/`、`features/stats-tag-rank/`、`components/stats-tag-rank/` 目录下任何文件（CON-001）；`stats-overview` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-002）；零记录时页面上日历、趋势、排行三个组件标签均未渲染（REQ-007）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.5、§8 — 学习统计页的产品行为定义与统计口径
- [UI 设计](../../ui-foundation-design.md) — 学习统计页视觉规范
- P1-01 Today 概览与主行动 — 共用 `shared/date/streak.ts` 的 `calculateStreakSummary`，两者的连续天数口径必须一致
- P2-05 本月学习日历、P2-06 最近 7 天投入趋势、P2-07 学习主题 Top 3 — 同一页面的 Phase 2 延伸功能，依赖本 Spec 提供的 `overview.hasRecords` 门控，但与本 Spec 互不导入
