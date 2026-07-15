---
title: P2-06 最近 7 天投入趋势
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, stats]
---

# Introduction

本 Spec 交付学习统计页的"最近 7 天投入趋势"图表：包含今天在内的滚动 7 个本地日期，每天显示当天累计学习分钟数；没有记录的日期明确显示 0 而不是被省略。这是学习统计页四个互不依赖区块之一（另外三个是 P1-06 的总览、P2-05 的本月日历、P2-07 的学习主题 Top 3），Phase 1 已经把 `buildSevenDayTrend` 的调用与 `overview.hasRecords` 门控接好，本 Spec 只需要把安全默认实现替换成真实业务逻辑与真实图表渲染。

## 1. Purpose & Scope

**目的**：让用户在学习统计页读出"最近 7 天每天投入了多少分钟"，帮助用户感知学习节奏是否连续、是否有明显的高峰或空档；柱状图必须同时提供数字或文字，不能只靠柱子高度传达信息。

**范围**：
- `miniprogram/features/stats-seven-day-trend/index.ts` — 纯函数 `buildSevenDayTrend`
- `miniprogram/components/stats-seven-day-trend/` — 渲染柱状图表的 Component
- 对应 Vitest 测试（`tests/features/stats-seven-day-trend/index.test.ts`）

**不在范围内**：
- `pages/stats/index.*` — 学习统计页面编排、`overview.hasRecords` 门控逻辑和加载状态属于 P1-06（Phase 1 主要集成人）的范围；P0 已经把 `buildSevenDayTrend(records, clock)` 的调用和 `<stats-seven-day-trend items="{{trend}}" />` 的接线准备好，本 Spec 不需要也不应该修改该文件。
- 本月学习日历（属于 P2-05，见 [P2-05 Spec](./p2-05-stats-calendar.md)）与学习主题 Top 3（属于 P2-07，见 [P2-07 Spec](./p2-07-stats-tag-rank.md)）——两者是学习统计页的另外两个 Phase 2 区块，本 Spec 不得修改它们的 Component / Feature 目录。
- 切换月份、年度热力图、导出数据等本 Spec 之外的可视化能力。

**读者假设**：实现者已经从 `phase-1-complete` 基线建立分支，`npm run check` 全部通过，能够在微信开发者工具中使用「测试场景 · 学习统计」看到 P1-06 已完成的总览卡片和三个 Phase 2 区块的安全默认（空数组、不渲染）。实现者不需要修改 `domain/`、`shared/date/`、`repositories/`、`fixtures/`、`pages/stats/index.*` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `Clock` | 提供 `now()`/`today()` 的时间抽象；生产环境用 `SystemClock`，测试用 `FixedClock` |
| `本地日期` | `Clock.today()` 返回的 `YYYY-MM-DD` 格式字符串，按设备本地时区计算，不是 UTC 日期 |
| `滚动 7 天窗口` | 以 `clock.today()` 为终点（含today）、向前共 7 个连续本地日期组成的窗口；窗口边界通过 `shared/date/local-date.ts` 的 `addLocalDays` 计算，不做时区转换 |
| `SevenDayTrendItem` | `buildSevenDayTrend` 返回数组中每一项的视图模型，字段见第 4 节 |
| `TrendChartItem` | Component 内部在 `SevenDayTrendItem` 基础上派生出的渲染态数据（`barHeightPercent`、`isPeak`），不跨目录暴露 |
| `overview.hasRecords` | P1-06 `buildStatisticsOverview` 返回的字段，`false` 时学习统计页不渲染日历、趋势和排行三个区块；本 Spec 的图表只在该字段为 `true` 时才会被渲染，门控逻辑由 P1-06 拥有，本 Spec 不实现也不修改它 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildSevenDayTrend(records, clock)` 必须始终返回长度恰好为 7 的数组，无论 `records` 是空数组还是包含任意条记录。
- **REQ-002**: 返回数组必须按本地日期升序排列，最后一项（索引 6）的 `date` 必须等于 `clock.today()`，第一项（索引 0）的 `date` 必须等于 `clock.today()` 向前推 6 天（即 `addLocalDays(today, -6)`）。
- **REQ-003**: 每一项的 `minutes` 字段必须是该本地日期下所有 `LearningRecord.duration` 的求和；同一天存在多条记录时必须全部累加，不能只取其中一条或取最大值。
- **REQ-004**: 窗口内某个本地日期没有任何记录时，对应项必须存在且 `minutes` 为 `0`，不能从数组中省略该日期（图表必须始终展示固定 7 项）。
- **REQ-005**: `label` 字段规则：当 `date === clock.today()` 时固定为 `'今天'`；其余 6 项按 `parseLocalDate(date).getDay()` 从 `WEEKDAY_LABELS`（`['周日','周一','周二','周三','周四','周五','周六']`）取对应中文星期简称。
- **REQ-006**: `isToday` 字段必须只在该项 `date === clock.today()` 时为 `true`，窗口内其余 6 项必须为 `false`。
- **REQ-007**: 窗口边界与跨月、跨年计算必须使用 `shared/date/local-date.ts` 的 `addLocalDays`，不得使用 `Date` 毫秒运算、`setDate` 之外的时区相关 API 或字符串拼接重新实现本地日期加减。
- **REQ-008**: Component 必须把 `properties.items` 通过 `observers` 派生成内部 `chartItems`（`SevenDayTrendItem & { barHeightPercent: number; isPeak: boolean }`）：`barHeightPercent = maxMinutes > 0 ? Math.round((item.minutes / maxMinutes) * 100) : 0`；`isPeak = maxMinutes > 0 && item.minutes === maxMinutes`，其中 `maxMinutes` 是 `items` 中 `minutes` 的最大值。
- **REQ-009**: 图表必须为每一根柱子同时渲染数字（分钟数）与文字标签（日期/"今天"/星期），不能只用柱子高度传达信息——这是无障碍约束，来自 [产品设计 §7.5](../../product-design.md) 与 [UI 设计](../../ui-foundation-design.md)（"每个趋势值都有日期和分钟数文字"）。
- **REQ-010**: Component 只能通过 `properties.items` 接收数据，不发出任何事件（Starter Kit Contract §7 中 P2-06 一行的 Component events 为"无"），这是一个只读图表。
- **CON-001**: 不得修改 `features/stats-calendar/`、`components/stats-calendar/`（P2-05）或 `features/stats-tag-rank/`、`components/stats-tag-rank/`（P2-07）目录下的任何文件。
- **CON-002**: 不得修改 `pages/stats/index.*`；`buildSevenDayTrend(records, clock)` 的调用、`data.trend` 的赋值与 `wx:if="{{overview.hasRecords}}"` 门控均已由 P0 / P1-06 接好。
- **CON-003**: `stats-seven-day-trend` Component 不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例，只能通过 `items` property 接收数据。
- **CON-004**: 所有"最近 7 天"相关判断必须基于 `LearningRecord.date`（本地日期字符串），不得从 `createdAt`（UTC 毫秒时间戳）重新推导。
- **GUD-001**: 复用 `shared/date/local-date.ts` 已提供的 `addLocalDays`/`parseLocalDate`，不重新实现本地日期加减、星期换算或跨月跨年逻辑。
- **PAT-001**: 页面遵循 Starter 统一的 `LoadState` 模式，`loading`/`error` 状态由 P1-06 负责；本 Spec 只需保证记录加载完成、`records` 就绪后 `buildSevenDayTrend` 被正确调用并渲染，不需要自己处理加载或错误 UI。

## 4. Interfaces & Data Contracts

### Feature：`features/stats-seven-day-trend/index.ts`

```ts
export type SevenDayTrendItem = {
  date: string
  label: string
  minutes: number
  isToday: boolean
}

export const buildSevenDayTrend = (
  records: readonly LearningRecord[],
  clock: Clock,
): SevenDayTrendItem[]
```

`isToday` 字段是本 Spec 在 Starter 已固定的公开端口（`buildSevenDayTrend` 签名、`items` property，见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)）基础上新增的返回值字段，让 Component 能直接判断"今天"这一列而不必反向比较 `label` 文本。

### Component：`components/stats-seven-day-trend/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `items` | `SevenDayTrendItem[]` | `[]` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| 无 | — | 本 Component 是只读图表，不发出事件 |

Component 内部派生态（不跨目录暴露，仅供 WXML 渲染使用）：

```ts
type TrendChartItem = SevenDayTrendItem & {
  barHeightPercent: number
  isPeak: boolean
}
```

`items.length === 0` 时（即 P1-06 的 `overview.hasRecords` 为 `false`，Starter 传入空数组）Component 通过 `vc-card wx:if="{{chartItems.length}}"` 整体不渲染，不出现空柱状图。

### Page 编排：`pages/stats/index.ts`（P1-06 拥有，本 Spec 不修改）

```ts
buildStatisticsOverview(records, clock) // P1-06
buildMonthCalendar(records, clock)       // P2-05
buildSevenDayTrend(records, clock)       // 本 Spec
buildTagRank(records)                    // P2-07
```

对应 WXML 片段（P0 已接好）：

```html
<block wx:if="{{overview.hasRecords}}">
  <stats-calendar model="{{calendar}}" bind:select-date="openLogByDate" />
  <stats-seven-day-trend items="{{trend}}" />
  <stats-tag-rank items="{{tagRank}}" bind:select-tag="openLogByTag" />
</block>
```

## 5. Acceptance Criteria

- **AC-001**: Given 空记录数组与 `clock.today()` 为 `2026-07-15`, When 调用 `buildSevenDayTrend([], clock)`, Then 返回长度为 7 的数组，且全部 7 项 `minutes` 为 `0`。
- **AC-002**: Given 同上 `clock`, When 调用 `buildSevenDayTrend`, Then 数组的 `date` 依次为 `2026-07-09`、`2026-07-10`、`2026-07-11`、`2026-07-12`、`2026-07-13`、`2026-07-14`、`2026-07-15`；最后一项 `isToday` 为 `true`，其余 6 项 `isToday` 为 `false`。
- **AC-003**: Given 当天存在 3 条记录（时长分别为 30、20、15 分钟）, When 调用 `buildSevenDayTrend`, Then 当天对应项的 `minutes` 为 `65`。
- **AC-004**: Given 当天有 1 条 40 分钟的记录、4 天前有 1 条 25 分钟的记录，窗口内其余 5 天没有记录, When 调用 `buildSevenDayTrend`, Then 有记录的两天分别为 `40` 和 `25`，其余 5 天的 `minutes` 均为 `0`（这 5 项仍然存在于数组中，不是被省略）。
- **AC-005**: Given 当天有 1 条 40 分钟的记录、14 天前（窗口外）有 1 条 999 分钟的记录, When 调用 `buildSevenDayTrend` 并对返回的 7 项 `minutes` 求和, Then 总和为 `40`（窗口外的记录被忽略，不计入任何一项）。
- **AC-006**: Given `clock.today()` 为 `2026-08-02`（跨月）, records 分别在 `2026-07-31`（12 分钟）与 `2026-08-02`（8 分钟）, When 调用 `buildSevenDayTrend`, Then 返回的 `date` 序列为 `2026-07-27` 至 `2026-08-02`，且 `2026-07-31` 对应项 `minutes` 为 `12`、`2026-08-02` 对应项 `minutes` 为 `8`。
- **AC-007**: Given `clock.today()` 为 `2026-01-02`（跨年）, records 分别在 `2025-12-31`（18 分钟）与 `2026-01-02`（22 分钟）, When 调用 `buildSevenDayTrend`, Then 返回的 `date` 序列为 `2025-12-27` 至 `2026-01-02`，且 `2025-12-31` 对应项 `minutes` 为 `18`、`2026-01-02` 对应项 `minutes` 为 `22`。
- **AC-008**: Given 微信开发者工具选择编译场景「测试场景 · 学习统计」（`history` Fixture）, When 打开学习统计页, Then 在总览卡片下方渲染"最近 7 天投入趋势"图表，7 根柱子按日期从左到右升序排列，最右侧一列对应今天且日期标签高亮显示为"今天"，每根柱子上方都显示对应的分钟数字，最高分钟数对应的柱子使用强调色区分。
- **AC-009**: Given 编译场景「测试场景 · 空数据」, When 打开学习统计页, Then 因为 `overview.hasRecords` 为 `false`，趋势图表整体不渲染，页面只显示 P1-06 提供的空状态引导，不出现空柱状图。
- **AC-010**: Given 任意含有记录的编译场景（如「测试场景 · 学习统计」）, When 查看趋势图表, Then 每一根柱子旁边都能通过数字文本直接读出具体分钟数，不需要比较柱子高度也能获得完整信息（无障碍验证，对应 REQ-009）。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildSevenDayTrend` 的纯函数逻辑，覆盖 AC-001 至 AC-007（固定 7 项长度、日期顺序与 `isToday`、同日累加、零值补齐、窗口外记录被忽略、跨月与跨年边界）。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-008 至 AC-010，使用 Starter 已配置好的「测试场景 · 学习统计」和「测试场景 · 空数据」编译场景，不需要额外搭建环境。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：使用 `FixedClock` 固定测试时间（例如 `new Date(2026, 6, 15, 9, 0)`），避免测试结果随实际运行日期漂移；跨月/跨年用例分别固定 `clock` 到月初（`2026-08-02`）和年初（`2026-01-02`）。手工验收使用 Starter 提供的 `history` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（日期序列、分钟数、`isToday`），不断言 WXML 文本、固定颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯本地计算与 UI 渲染，无性能测试要求）。

## 7. Rationale & Context

窗口内没有记录的日期返回 `minutes: 0` 而不是省略该项，是因为图表必须始终展示固定 7 根柱子（[产品设计 §7.5](../../product-design.md)、[统计口径表](../../product-design.md)"滚动 7 天投入"一行），让用户能一眼看出"这几天完全没学"而不是误以为数据缺失或加载中。

`label` 在"今天"这一天固定显示"今天"而不是"周三"之类的星期简称，是为了让用户不需要心算就能找到当前所在的位置；其余 6 天使用星期简称而不是具体日期数字，是为了在有限的图表宽度内保持可读性（见 [UI 设计](../../ui-foundation-design.md) 关于"最近 7 天投入趋势"的柱形区描述）。

`barHeightPercent` 与 `isPeak` 被设计成 Component 内部的派生状态而不是 Feature 层的返回字段，是因为"柱子相对高度"和"最高值强调"属于视觉呈现规则，不应该让 Feature 的纯函数依赖任何渲染细节；这与 Starter Kit Contract §3 "Feature 输出视图模型、Component 负责渲染"的分层规则一致。

每根柱子强制同时展示数字与文字标签（REQ-009），是产品对可访问性的显式要求——纯柱状图对色弱用户或小屏幕上视觉差异不明显的柱子不够可靠，数字标签保证信息不丢失。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 与 Phase 1 基线中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `shared/date/clock.ts` 提供的 `Clock` 抽象（`SystemClock`/`FixedClock`）——Starter 已提供，本 Spec 直接使用。
- **INF-002**: `shared/date/local-date.ts` 提供的 `addLocalDays`/`parseLocalDate`——Starter 已提供，本 Spec 直接复用计算窗口边界与星期，不重新实现。
- **INF-003**: `pages/stats/index.ts` 中已由 P1-06 接好的 `buildSevenDayTrend(records, clock)` 调用与 `overview.hasRecords` 门控——本 Spec 依赖但不修改。
- **INF-004**: `components/vc-card/` ——Starter 提供的通用卡片外壳，本 Component 的 WXML 直接复用它包裹图表内容。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `history`/`empty` 场景——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 零值补齐：窗口内没有记录的日期仍然存在于数组中，minutes 为 0
const clock = new FixedClock(new Date(2026, 6, 15, 9, 0)) // today = '2026-07-15'
const records = [recordOn('2026-07-15', 40), recordOn('2026-07-12', 25)]

const trend = buildSevenDayTrend(records, clock)
// trend.find(i => i.date === '2026-07-15')?.minutes === 40
// trend.find(i => i.date === '2026-07-12')?.minutes === 25
// 其余 5 天（07-09、07-10、07-11、07-13、07-14）minutes 均为 0
```

```ts
// 边界情况：跨月窗口，today 恰好是月初
const clock = new FixedClock(new Date(2026, 7, 2, 9, 0)) // today = '2026-08-02'
const records = [recordOn('2026-07-31', 12), recordOn('2026-08-02', 8)]

buildSevenDayTrend(records, clock).map(i => i.date)
// => ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']
```

```ts
// 边界情况：跨年窗口，today 恰好是年初
const clock = new FixedClock(new Date(2026, 0, 2, 9, 0)) // today = '2026-01-02'
const records = [recordOn('2025-12-31', 18), recordOn('2026-01-02', 22)]

buildSevenDayTrend(records, clock).map(i => i.date)
// => ['2025-12-27', '2025-12-28', '2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']
```

```ts
// 边界情况：窗口外的记录必须被完全忽略，不能泄漏进任何一项
const records = [recordOn('2026-07-15', 40), recordOn('2026-07-01', 999)]

const trend = buildSevenDayTrend(records, clock)
const totalMinutes = trend.reduce((sum, item) => sum + item.minutes, 0)
// totalMinutes === 40，而不是 1039
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增/既有的 7 组 Vitest 用例覆盖 AC-001 至 AC-007。
- 在微信开发者工具中依次使用「测试场景 · 学习统计」「测试场景 · 空数据」两个编译场景验证 AC-008 至 AC-010。
- Code Review 确认：未修改 `features/stats-calendar/`、`components/stats-calendar/`、`features/stats-tag-rank/`、`components/stats-tag-rank/`、`pages/stats/index.*` 任何文件（CON-001、CON-002）；`stats-seven-day-trend` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-003）；图表在 WXML 中同时渲染了数字与文字标签（REQ-009）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.5、§8 — 学习统计页的产品行为与统计口径定义
- [UI 设计](../../ui-foundation-design.md) — 学习统计页视觉规范与"最近 7 天投入趋势"图表样式
- P1-06 学习统计总览 — 同一页面的 Phase 1 主要集成人，拥有 `overview.hasRecords` 门控与页面加载状态，本 Spec 依赖但不修改
- P2-05 本月学习日历 — 同一页面的另一 Phase 2 区块，与本 Spec 互不依赖
- P2-07 学习主题 Top 3 — 同一页面的另一 Phase 2 区块，与本 Spec 互不依赖
