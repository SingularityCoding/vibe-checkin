---
title: P2-05 本月学习日历
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, stats-calendar]
---

# Introduction

本 Spec 交付学习统计页的「本月学习日历」区块：以用户设备本地日期计算出的当前月份完整日历网格，标记出哪些日期存在学习记录，并支持点击某天跳转到按该日期筛选的学习日志。这是学习统计页四个互不依赖的功能区之一（另外三个是 P1-06 的总览卡、P2-06 的近 7 天趋势、P2-07 的主题 Top 3），页面已经把四者按固定顺序组合好，零记录时整体隐藏在 P1-06 负责的 `overview.hasRecords` 门控之后。

## 1. Purpose & Scope

**目的**：让用户在统计页用日历视角回看"这个月哪几天学习过"，并能直接点击某一天进入只显示当天记录的学习日志，而不需要先去日志页手动筛选日期。

**范围**：
- `miniprogram/features/stats-calendar/index.ts` — 纯函数 `buildMonthCalendar`
- `miniprogram/components/stats-calendar/` — 渲染月历网格、周历表头与格子点击事件的 Component
- 对应 Vitest 测试 `tests/features/stats-calendar/index.test.ts`

**不在范围内**：
- 月份切换（上一月/下一月）与跨年热力图——本 Spec 只显示 `clock.today()` 所在的当前本地月，见 [Spec 分配矩阵 P2-05](../README.md)。
- 近 7 天投入趋势（属于 P2-06，见 `features/stats-seven-day-trend/`）与学习主题 Top 3（属于 P2-07，见 `features/stats-tag-rank/`）；本 Spec 不导入、不修改这两者的 Feature 或 Component 目录。
- `pages/stats/index.ts` 与 `pages/stats/index.wxml`——Starter (P0) 已经在页面里装配好 `calendar: buildMonthCalendar(records, clock)` 这份 data、`<stats-calendar model="{{calendar}}" bind:select-date="openLogByDate" />` 的接线，以及 `openLogByDate` 用 `wx.reLaunch(buildLogFilterRoute({ date }))` 处理跳转；`overview.hasRecords` 门控（零记录时隐藏日历/趋势/排行三个区块）由 P1-06 负责添加到该 wxml。本 Spec 不需要、也不应该修改这两个 Page 文件。

**读者假设**：实现者已经在 `phase-1-complete` 基线上工作，`npm run check` 全部通过。`features/stats-calendar/index.ts` 与 `components/stats-calendar/` 当前是 Starter 提供的安全默认实现（`buildMonthCalendar` 恒定返回 `{ visible: false, monthLabel: '', days: [] }`，Component 只有一个空的 `wx:if="{{model.visible}}"` 占位 `<view class="slot">`），实现者的任务是把它们替换成真实实现，不需要新建或触碰 Page。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `Clock` | 提供 `now()`/`today()` 的时间抽象；生产环境用 `SystemClock`，测试用 `FixedClock` |
| `本地月份` | 由 `parseLocalDate(clock.today())` 得到的 `Date` 的 `getFullYear()`/`getMonth()`，按设备本地时区计算，不是 UTC |
| `CalendarDay` | 日历网格中的一个格子：`{ date, dayOfMonth, hasRecord, isCurrentMonth }` |
| `filler day` | 为了让网格首尾对齐星期几、凑满 7 的倍数而补充的相邻月（上月末尾/下月开头）日期格 |
| `MonthCalendarViewModel` | `buildMonthCalendar` 的返回类型：`{ visible, monthLabel, days }` |
| `打卡日标记` | `CalendarDay.hasRecord === true` 时在格子下方渲染的圆点（`calendar__day-mark`） |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: 当 `records.length === 0` 时，`buildMonthCalendar` 必须返回固定的空视图模型 `{ visible: false, monthLabel: '', days: [] }`，不得返回任何格子。
- **REQ-002**: 当存在记录时，日历所在的年/月必须来自 `parseLocalDate(clock.today())`，不得使用 `new Date()` 或其他脱离 `Clock` 抽象的方式取得"当前"月份。
- **REQ-003**: `days` 必须包含当月每一天（`new Date(year, month + 1, 0).getDate()` 天，`isCurrentMonth: true`），并在网格前后补齐相邻月的 filler 天，使 `days.length` 恰好是 7 的倍数：前置补齐数量为当月 1 日的星期偏移（`firstOfMonth.getDay()`），后置补齐数量为 `(7 - (days.length % 7)) % 7`。
- **REQ-004**: `hasRecord` 必须通过把全部记录的 `LearningRecord.date` 收集为字符串 `Set`，再用每个格子自身的 `formatLocalDate(date)` 精确字符串匹配得出，不得用 `dayOfMonth` 数字或其他弱匹配方式判断，以避免跨月同日（例如 6 月 15 日、7 月 15 日、8 月 15 日）被互相误标。
- **REQ-005**: `monthLabel` 固定格式为 `` `${year}年${month + 1}月` ``（例如 `2026年7月`）。
- **REQ-006**: filler 天的 `date`、`hasRecord` 必须使用它们自己真实所在月份计算得出，不得套用当前月的日期或直接标为无记录；只有 `isCurrentMonth` 为 `false`。
- **REQ-007**: 用户点击任意格子（含 filler 天）必须触发 `select-date` 事件，`detail` 为 `{ date: CalendarDay.date }`；若格子上取不到 `date`（防御性判断）则不触发事件。
- **CON-001**: 不实现月份前进/后退切换；日历只反映 `clock.today()` 当前所在的月。
- **CON-002**: 不实现跨年或多月的热力图视图。
- **CON-003**: 不得修改 `features/stats-seven-day-trend/`、`components/stats-seven-day-trend/`（P2-06）与 `features/stats-tag-rank/`、`components/stats-tag-rank/`（P2-07）目录下的任何文件。
- **CON-004**: 不得修改 `pages/stats/index.ts` 与 `pages/stats/index.wxml`；页面的数据装配、`<stats-calendar>` 接线、`openLogByDate` 跳转逻辑与 `overview.hasRecords` 门控均已由 Starter (P0) 与 P1-06 提供。
- **CON-005**: `stats-calendar` Component 只能通过 `properties.model` 接收数据、通过 `select-date` 事件上报，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例。
- **GUD-001**: 复用 `shared/date/local-date.ts` 已提供的 `formatLocalDate`/`parseLocalDate`，不重新实现本地日期字符串的解析或格式化。
- **PAT-001**: 复用 Starter 的"安全默认空视图模型"模式——无记录时返回完全不可见（`visible: false`）的对象，而不是渲染一个空网格或占位骨架屏。

## 4. Interfaces & Data Contracts

### Feature：`features/stats-calendar/index.ts`

```ts
export type CalendarDay = {
  date: string
  dayOfMonth: number
  hasRecord: boolean
  isCurrentMonth: boolean
}

export type MonthCalendarViewModel = {
  visible: boolean
  monthLabel: string
  days: CalendarDay[]
}

export const buildMonthCalendar = (
  records: readonly LearningRecord[],
  clock: Clock,
): MonthCalendarViewModel
```

`buildMonthCalendar` 是 Starter 已固定的公开端口（见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)），本 Spec 交付其真实实现；类型定义（`CalendarDay`、`MonthCalendarViewModel`）本身也是本 Spec 的一部分，供 Component 与测试共用。

### Component：`components/stats-calendar/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `model` | `MonthCalendarViewModel` | `{ visible: false, monthLabel: '', days: [] }` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `select-date` | `{ date: string }` | 用户点击某个日期格子（含当月天与 filler 天） |

组件内部另有一份固定的 `weekdays` 展示数据 `['日', '一', '二', '三', '四', '五', '六']`，用于渲染星期表头，不属于跨目录公开端口。

### Page 编排：`pages/stats/index.ts`（Starter 已完成，本 Spec 不修改）

```ts
buildStatisticsOverview(records, clock) // P1-06
buildMonthCalendar(records, clock)      // 本 Spec
buildSevenDayTrend(records, clock)      // P2-06
buildTagRank(records)                   // P2-07
```

```ts
openLogByDate(event: WechatMiniprogram.CustomEvent<{ date: string }>) {
  wx.reLaunch({ url: buildLogFilterRoute({ date: event.detail.date }) })
}
```

`pages/stats/index.wxml` 把 `<stats-calendar>` 与 `<stats-seven-day-trend>`、`<stats-tag-rank>` 一起包在 `<block wx:if="{{overview.hasRecords}}">` 内（P1-06 负责添加），零记录时三者整体不渲染，只显示 P1-06 的空状态。

## 5. Acceptance Criteria

- **AC-001**: Given 空记录数组, When 调用 `buildMonthCalendar([], clock)`, Then 返回 `{ visible: false, monthLabel: '', days: [] }`。
- **AC-002**: Given `clock.today()` 为 `2026-07-15`（2026-07-01 是星期三，`getDay() === 3`）, When 调用 `buildMonthCalendar`, Then 当月 1 日之前恰好补齐 3 个 `isCurrentMonth: false` 的 filler 天。
- **AC-003**: Given `clock.today()` 为 `2026-07-15`（7 月有 31 天）, When 调用 `buildMonthCalendar`, Then `isCurrentMonth: true` 的格子恰好 31 个，第一个 `dayOfMonth` 为 1，最后一个为 31。
- **AC-004**: Given `clock.today()` 为闰年 `2024-02-10`, When 调用 `buildMonthCalendar`, Then `isCurrentMonth: true` 的格子恰好 29 个。
- **AC-005**: Given `clock.today()` 为平年 `2023-02-10`, When 调用 `buildMonthCalendar`, Then `isCurrentMonth: true` 的格子恰好 28 个。
- **AC-006**: Given 当月 7 月 2 日有两条记录、7 月 20 日有一条记录, When 调用 `buildMonthCalendar`, Then 当月格子里 `hasRecord: true` 的 `dayOfMonth` 排序后恰好为 `[2, 20]`，7 月 15 日格子 `hasRecord` 为 `false`。
- **AC-007**: Given 6 月 15 日与 8 月 15 日各有一条记录（当前月为 7 月）, When 调用 `buildMonthCalendar`, Then 当月 7 月 15 日格子 `hasRecord` 为 `false`，且所有 `isCurrentMonth: true` 的格子 `date` 均以 `2026-07` 开头（不会把跨月同号记录误标到本月）。
- **AC-008**: Given 6 月最后一天（filler 天）有一条记录, When 调用 `buildMonthCalendar`, Then 对应的 filler 格子 `isCurrentMonth` 为 `false` 且 `hasRecord` 为 `true`（filler 天用自己的真实日期匹配，不因为不属于当月就被忽略）。
- **AC-009**: Given `clock.today()` 为 `2026-07-15`, When 调用 `buildMonthCalendar`, Then `visible` 为 `true`、`monthLabel` 为 `'2026年7月'`、`days.length % 7 === 0`。
- **AC-010**: Given 微信开发者工具选择编译场景「测试场景 · 学习统计」（`history` Fixture）, When 打开学习统计页, Then 日历显示当前本地月的完整月历，`history` Fixture 中落在本月的记录日期显示圆点标记，`history` Fixture 中约 32 天前（上一个月）的记录不会让本月同号日期出现误标。
- **AC-011**: Given 学习统计页日历上某个有标记的日期, When 点击该日期格子, Then 触发 `wx.reLaunch` 跳转到学习日志页并带上该日期作为筛选条件，日志列表只显示该日期的记录。
- **AC-012**: Given 微信开发者工具选择编译场景「测试场景 · 空数据」, When 打开学习统计页, Then 因为 P1-06 的 `overview.hasRecords` 门控为 `false`，日历、趋势、排行三个区块整体不渲染，不出现空网格或假日历。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildMonthCalendar` 的纯函数逻辑，覆盖 AC-001 至 AC-009。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-010 至 AC-012，使用 Starter 已配置好的编译场景，不需要额外搭建环境。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：使用 `FixedClock` 固定测试时间（例如 `new Date(2026, 6, 15, 9, 0)`），避免网格天数、月首偏移随实际运行日期漂移；手工验收使用 Starter 提供的 `history`/`empty` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（格子数量、`hasRecord`、`monthLabel`），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯本地日期计算与展示，无性能测试要求）。

## 7. Rationale & Context

`hasRecord` 被设计成基于完整日期字符串（`YYYY-MM-DD`）的 `Set` 精确匹配，而不是比较 `dayOfMonth` 数字，是因为后者会把不同月份里"号数相同"的日期互相误标——例如 6 月 15 日和 8 月 15 日都会被当月 7 月 15 日的格子当作"有记录"，这是日历类功能里最容易引入的一类隐藏 bug；`LearningRecord.date` 已经是本地日期字符串（[Starter Kit Contract §6](../../starter-kit-contract.md#6-时间与统计契约)），直接精确匹配即可，不需要额外的日期区间计算。

filler 天使用自己真实的日期（而不是当月日期或占位符）来判断 `hasRecord`，是为了让"上月末尾几天有没有记录"这一细节保持真实——即使这几个格子视觉上是"灰掉"的相邻月天，它们仍然显示真实存在的圆点，而不是被默认清空。

不实现月份切换与跨年热力图（CON-001、CON-002）是本 Spec 明确的范围收敛：产品设计（[产品设计 §7.5](../../product-design.md)）只要求"当前本地月份的学习日历"，多月回看不是本次课程验收范围。

本 Spec 不修改 `pages/stats/index.ts`/`.wxml`，是因为 Starter (P0) 已经把四个统计子功能的页面装配、事件绑定和路由跳转都接好了（[Starter Kit Contract §8.5](../../starter-kit-contract.md#85-学习统计)），日历只是四个互不依赖 Feature 之一；`overview.hasRecords` 门控是 P1-06 的总览卡在零记录时决定要不要渲染下面三个区块，写日历本身不需要、也不应该重复触碰这个门控逻辑。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与月历网格。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `shared/date/clock.ts` 提供的 `Clock` 抽象（`SystemClock`/`FixedClock`）——Starter 已提供，本 Spec 直接使用。
- **INF-002**: `shared/date/local-date.ts` 提供的 `formatLocalDate`/`parseLocalDate`——Starter 已提供，本 Spec 直接复用，不重新实现本地日期解析。
- **INF-003**: `shared/navigation/routes.ts` 的 `buildLogFilterRoute`——由 Page（Starter 已装配）消费 `select-date` 事件后调用，本 Spec 的 Feature/Component 不直接依赖它，只负责发出正确的 `{ date }` detail。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `history`/`empty` 场景——手工验收使用，`history` 场景包含跨月记录（约 32 天前），可直接验证跨月不误标；本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 跨月同号不误标：6 月 15 日与 8 月 15 日都不应该让 7 月 15 日显示标记
const records = [recordOn('2026-06-15'), recordOn('2026-08-15')]
const calendar = buildMonthCalendar(records, clock) // clock.today() === '2026-07-15'

const day15 = calendar.days.find((day) => day.isCurrentMonth && day.dayOfMonth === 15)
day15?.hasRecord // => false
```

```ts
// filler 天使用自己的真实日期判断 hasRecord，不因为属于上月就被清空
const juneTail = '2026-06-30' // 网格中 7 月 1 日之前的 filler 天之一
const calendar = buildMonthCalendar([recordOn(juneTail)], clock)

const fillerDay = calendar.days.find((day) => day.date === juneTail)
fillerDay?.isCurrentMonth // => false
fillerDay?.hasRecord      // => true
```

```ts
// 边界情况：闰年 2 月与平年 2 月的天数必须精确，不能硬编码 28/29
buildMonthCalendar([recordOn('2024-02-10')], clock2024).days.filter((d) => d.isCurrentMonth).length // => 29
buildMonthCalendar([recordOn('2023-02-10')], clock2023).days.filter((d) => d.isCurrentMonth).length // => 28
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增的 Vitest 用例覆盖 AC-001 至 AC-009。
- 在微信开发者工具中使用「测试场景 · 学习统计」（`history`）验证 AC-010、AC-011，使用「测试场景 · 空数据」验证 AC-012。
- Code Review 确认：未修改 `features/stats-seven-day-trend/`、`components/stats-seven-day-trend/`、`features/stats-tag-rank/`、`components/stats-tag-rank/`（CON-003）；未修改 `pages/stats/index.ts`、`pages/stats/index.wxml`（CON-004）；`stats-calendar` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-005）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门，P2-05 章节
- [产品设计](../../product-design.md) §7.5 — 学习统计页的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — 学习统计页视觉规范，含日历标记的视觉描述
- [P1-01 Today 概览与主行动](../phase-1/p1-01-today-summary.md) — 同项目 Spec 的格式参考样例
- P1-06 学习统计总览 — 同一页面的 `overview.hasRecords` 门控负责人，本 Spec 依赖其门控但不修改其文件
- P2-06 最近 7 天投入趋势、P2-07 学习主题 Top 3 — 同一页面的另外两个 Phase 2 延伸功能，与本 Spec 互不依赖但共享 `pages/stats/index.ts`
