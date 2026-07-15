---
title: P2-01 Today 近 7 天活动与今日记录
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, today]
---

# Introduction

本 Spec 交付 Today 页的第二个功能区：包含今天在内最近 7 天的活动标记条，以及按创建时间倒序排列的「今日记录」列表，点击任意一条记录可以进入学习详情。这是 Today 页三个功能区之二（另一个是 P1-01 的概览与主行动，Phase 1 已实现），是老用户回看自己最近学习节奏、快速找到今天已经记过的内容的入口。

## 1. Purpose & Scope

**目的**：让用户一眼看出最近 7 天（含今天）哪些日子有过学习，并在今天已经有记录时直接看到这些记录的摘要，点击即可跳转到完整详情，而不需要先去学习日志里翻找。

**范围**：
- `miniprogram/features/today-activity/index.ts` — 纯函数 `buildTodayActivity`
- `miniprogram/components/today-activity/` — 展示 7 天活动条与今日记录列表的 Component
- 对应 Vitest 测试 `tests/features/today-activity.test.ts`

**不在范围内**：Today 页概览与主行动（属于 P1-01，见 [P1-01 Spec](../phase-1/p1-01-today-summary.md)）；`currentStreak`/`todayMinutes`/`todayRecordCount` 的计算口径（P1-01 已实现，本 Spec 不得改变）；`pages/today/index.ts` 的编排逻辑（P0 已按 Starter Kit Contract §8.2 把 `buildTodayActivity(records, clock)` 接好，本 Spec 不需要、也没有修改这个文件）；日志筛选或跳转到日志页（属于 P2-03/P2-04，本 Spec 的活动条只展示反馈，不承担筛选职责）。

**读者假设**：实现者已经从 `phase-1-complete` 基线开始，`npm run check` 全部通过，能够在微信开发者工具中用「测试场景 · 今日记录」「测试场景 · 历史记录」打开 Today 页并看到 P1-01 已实现的概览区。实现者不需要修改 Starter Kit 已经提供的 `domain/`、`shared/date/`、`repositories/`、`fixtures/` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `Clock` | 提供 `now()`/`today()` 的时间抽象；生产环境用 `SystemClock`，测试用 `FixedClock` |
| `本地日期` | `Clock.today()` 返回的 `YYYY-MM-DD` 格式字符串，按设备本地时区计算，不是 UTC 日期 |
| `近 7 天窗口` | 以 `clock.today()` 为终点、连续 7 个本地日期组成的固定窗口，通过 `shared/date/local-date.ts` 的 `addLocalDays(today, -offset)`（`offset` 从 6 到 0）生成 |
| `活动标记` (`hasRecord`) | 某个本地日期在传入的 `records` 中是否至少存在一条 `record.date` 与之相等的记录 |
| `今日记录` (`todayRecords`) | `record.date === clock.today()` 的记录，按 `createdAt` 降序（最新创建的在最前）排列后的展示列表 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildTodayActivity(records, clock)` 必须返回 `week` 数组，长度固定为 7，日期通过 `addLocalDays(clock.today(), -offset)`（`offset` 依次为 6、5、4、3、2、1、0）生成，最后一项（`offset === 0`）即为今天，`isToday` 为 `true`。
- **REQ-002**: `week` 中每一项的 `weekday` 必须是该日期对应的中文星期简称（「日」「一」「二」「三」「四」「五」「六」，取自 `Date.getDay()`），`dayOfMonth` 必须是该日期的日序数（`Date.getDate()`）。
- **REQ-003**: `week` 中每一项的 `hasRecord` 必须反映 `records` 中是否存在 `record.date` 等于该项 `date` 的记录，不区分该日期有 1 条还是多条记录，均标记为 `true`；`records` 为空时全部为 `false`。
- **REQ-004**: `todayRecords` 必须只包含 `record.date === clock.today()` 的记录，不得包含窗口内其他 6 天或窗口外任何日期（包括跨月、跨年）的记录。
- **REQ-005**: `todayRecords` 必须按 `createdAt` 降序排列（同一天内后创建的记录排在前面）。
- **REQ-006**: `todayRecords` 每一项的 `time` 字段必须是从 `createdAt` 时间戳派生的 `HH:mm` 本地时间（两位数补零，例如 `08:05`、`20:40`），不得直接展示原始时间戳或 UTC 时间。
- **REQ-007**: `todayRecords` 每一项的 `duration`、`content`、`tags` 必须与源记录对应字段一致映射，`tags` 必须是浅拷贝的新数组，不得直接引用源记录的 `tags` 数组。
- **REQ-008**: 点击「今日记录」列表中的任意一条卡片，Component 必须触发 `open-record` 事件，`detail` 为 `{ id: string }`，`id` 取自该记录的 `id` 字段，不得触发页面级别的直接导航。
- **CON-001**: 不得实现或修改 Today 页概览与主行动——这是 P1-01 的范围。`features/today-summary/`、`components/today-summary/` 目录下的任何文件都不得修改。
- **CON-002**: 不得改变 `currentStreak`、`todayMinutes`、`todayRecordCount` 的计算口径；本 Spec 不依赖也不重新实现 `shared/date/streak.ts`。
- **CON-003**: 不得修改 `pages/today/index.ts` 或 `pages/today/index.wxml`；Starter 已按 Starter Kit Contract §8.2 把 `<today-activity>` 接好并绑定 `open-record` 到 `buildRecordDetailRoute`，本 Spec 只交付 Feature 与 Component 内部实现。
- **CON-004**: `today-activity` Component 只能通过 `properties.week`、`properties.todayRecords` 接收数据、通过 `open-record` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例。
- **CON-005**: 活动条（`week`）只提供视觉反馈，不承担日志筛选或跳转职责；点击某一天的活动标记不得触发任何导航或筛选事件——这是 P2-03/P2-04 的范围。
- **CON-006**: 所有"今日"和"近 7 天"相关的判断必须基于 `LearningRecord.date`（本地日期字符串），不得从 `createdAt`（UTC 毫秒时间戳）重新推导日期范围；`time` 字段的 `HH:mm` 展示是唯一允许直接使用 `createdAt` 的场景。
- **GUD-001**: 复用 Starter 已提供的 `Clock` 抽象与 `shared/date/local-date.ts` 下的 `addLocalDays`/`parseLocalDate`，不重新实现日期加减或解析逻辑。
- **PAT-001**: 组件遵循 Starter 统一的空数据展示约定：`week.length === 0` 或 `todayRecords.length === 0` 时对应区块不渲染（WXML 用 `wx:if` 判空），不显示空列表容器或占位文案。

## 4. Interfaces & Data Contracts

### Feature：`features/today-activity/index.ts`

```ts
export type WeekActivityItem = {
  date: string
  weekday: string
  dayOfMonth: number
  isToday: boolean
  hasRecord: boolean
}

export type TodayRecordItem = {
  id: string
  time: string
  duration: number
  content: string
  tags: string[]
}

export type TodayActivityViewModel = {
  week: WeekActivityItem[]
  todayRecords: TodayRecordItem[]
}

export const buildTodayActivity = (
  records: readonly LearningRecord[],
  clock: Clock,
): TodayActivityViewModel
```

`buildTodayActivity` 是 Starter 已固定的公开端口（见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口) P2-01 行）。Starter 中的安全默认实现始终返回 `{ week: [], todayRecords: [] }`，不抛错、不显示假数据；本 Spec 交付真实计算逻辑。

内部实现要点（从 Reference Implementation 提取）：

```ts
const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const buildWeek = (recordDates: ReadonlySet<string>, today: string): WeekActivityItem[] => {
  const week: WeekActivityItem[] = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = addLocalDays(today, -offset)
    const parsed = parseLocalDate(date)
    week.push({
      date,
      weekday: WEEKDAY_LABELS[parsed.getDay()],
      dayOfMonth: parsed.getDate(),
      isToday: date === today,
      hasRecord: recordDates.has(date),
    })
  }
  return week
}
```

### Component：`components/today-activity/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `week` | `WeekActivityItem[]` | `[]` |
| `todayRecords` | `TodayRecordItem[]` | `[]` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `open-record` | `{ id: string }` | 用户点击「今日记录」列表中的某一条卡片 |

Component 内部通过 `wx:for` 渲染 `week`（7 个格子，`isToday` 项高亮，`hasRecord` 项显示圆点标记）与 `todayRecords`（每条卡片显示 `time · duration 分钟`、标签、正文），卡片绑定 `data-id="{{item.id}}"` 与 `bindtap="onOpenRecord"`，在方法内读取 `event.currentTarget.dataset.id` 后 `triggerEvent('open-record', { id })`。

### Page 编排：`pages/today/index.ts`（P0 已实现，本 Spec 不修改）

```ts
buildTodaySummary(records, clock)   // P1-01
buildTodayActivity(records, clock)  // 本 Spec
```

`onShow` 时重新调用 `recordRepository.list()` 并重建两个视图模型；`today-activity` 的 `open-record` 事件已绑定到：

```ts
openRecordDetail(event: WechatMiniprogram.CustomEvent<{ id: string }>) {
  wx.navigateTo({ url: buildRecordDetailRoute(event.detail.id, 'today') })
},
```

## 5. Acceptance Criteria

- **AC-001**: Given 一个空的记录数组和 `FixedClock(2026-07-15)`, When 调用 `buildTodayActivity([], clock)`, Then `week` 长度为 7，日期依次为 `2026-07-09` 至 `2026-07-15`，且只有最后一项（`2026-07-15`）的 `isToday` 为 `true`。
- **AC-002**: Given 记录分别落在 `2026-07-11` 和 `2026-07-15`, When 调用 `buildTodayActivity`, Then `week` 中 `hasRecord` 为 `true` 的日期恰好是 `['2026-07-11', '2026-07-15']`，其余 5 天的 `hasRecord` 均为 `false`。
- **AC-003**: Given `FixedClock(2026-03-02)`（跨月边界）, When 调用 `buildTodayActivity([], clock)`, Then `week` 日期依次为 `2026-02-24`、`2026-02-25`、`2026-02-26`、`2026-02-27`、`2026-02-28`、`2026-03-01`、`2026-03-02`。
- **AC-004**: Given 记录分别落在昨天（`id: 'yesterday'`）、今天（`id: 'today-1'`）和上个月同一天数（`id: 'last-month'`）, When 调用 `buildTodayActivity`, Then `todayRecords` 只包含 `id` 为 `'today-1'` 的记录，不包含另外两条。
- **AC-005**: Given 今天有两条记录，创建时间分别为 `08:00`（`id: 'earlier'`）和 `20:40`（`id: 'later'`）, When 调用 `buildTodayActivity`, Then `todayRecords` 顺序为 `['later', 'earlier']`，且 `todayRecords[0]` 的 `time` 为 `'20:40'`、`duration`/`content`/`tags` 与源记录一致。
- **AC-006**: Given 记录数组为空, When 调用 `buildTodayActivity([], clock)`, Then `week` 每一项 `hasRecord` 均为 `false`，`todayRecords` 为空数组。
- **AC-007**: Given 微信开发者工具选择编译场景「测试场景 · 今日记录」, When 打开 Today 页, Then 「今日记录」区块显示该 Fixture 场景写入的两条今日记录，按创建时间倒序排列；点击任意一条进入对应的学习详情页。
- **AC-008**: Given 编译场景「测试场景 · 历史记录」, When 打开 Today 页, Then 「最近 7 天」活动条正确标记有记录的日期，「今日记录」区块不包含历史（非今天）的记录；若该场景当天没有记录，「今日记录」区块不渲染。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildTodayActivity` 的纯函数逻辑，覆盖 AC-001 至 AC-006。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-007 至 AC-008，使用 Starter 已配置好的编译场景，不需要额外搭建环境。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：使用 `FixedClock` 固定测试时间，避免测试结果随实际运行日期漂移；手工验收使用 Starter 提供的 `today`/`history` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（日期窗口、过滤、排序），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯 UI 与本地计算，无性能测试要求）。

## 7. Rationale & Context

7 天窗口固定以 `offset` 从 6 到 0 生成而不是从记录中动态推导起点，是因为产品要求「无论用户今天有没有记录，活动条都必须完整显示近 7 天」，如果窗口依赖记录数据本身，空记录用户或断档用户会看到不完整甚至缺失的活动条。

`todayRecords` 复用 `record.date === clock.today()` 而不是 `createdAt` 落在今天 0 点到 24 点的时间戳区间判断，是为了与 P1-01 的 `todayRecordCount`/`todayMinutes` 保持同一套"今天"定义（见 [Starter Kit Contract §6](../../starter-kit-contract.md#6-时间与统计契约)），避免两个区块在极端时区或跨天场景下显示不一致的"今天"。

`open-record` 事件把导航职责交还给 Page 而不是 Component 自己调用 `wx.navigateTo`，是遵循 Starter Kit Contract §3 的分层规则：Component 只通过 events 报告用户操作，不直接导航或读写全局状态。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。
- **PLT-003**: `tdesign-miniprogram` 的 `t-tag` 组件——渲染今日记录卡片中的标签；`vc-card` 是 Starter 提供的通用卡片容器组件。

### Infrastructure Dependencies
- **INF-001**: `shared/date/clock.ts` 提供的 `Clock` 抽象（`SystemClock`/`FixedClock`）——Starter 已提供，本 Spec 直接使用。
- **INF-002**: `shared/date/local-date.ts` 提供的 `addLocalDays`/`parseLocalDate`——Starter 已提供，本 Spec 直接复用，不重新实现日期计算。
- **INF-003**: `shared/navigation/routes.ts` 的 `buildRecordDetailRoute`——由 P0 在 `pages/today/index.ts` 中已经绑定到 `open-record` 事件，本 Spec 不直接调用。
- **INF-004**: `repositories/record.ts` 的 `recordRepository.list()`——数据读取的唯一入口，由 `pages/today/index.ts` 调用后传入 `buildTodayActivity`，本 Spec 不直接访问 Storage 或 CloudBase。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `today`/`history` 场景——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 空记录时活动条依然完整显示 7 天，只是全部未标记
const model = buildTodayActivity([], clock) // clock.today() === '2026-07-15'
model.week.map((item) => item.date)
// => ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15']
model.week.every((item) => item.hasRecord === false) // true
```

```ts
// 跨月窗口：3 月 2 日往前推 6 天会跨到 2 月
const marchClock = new FixedClock(new Date(2026, 2, 2, 9, 0))
buildTodayActivity([], marchClock).week.map((item) => item.date)
// => ['2026-02-24', '2026-02-25', '2026-02-26', '2026-02-27', '2026-02-28', '2026-03-01', '2026-03-02']
```

```ts
// 今日记录必须严格过滤，历史记录和跨月记录都不能混入
const records = [
  recordOn('2026-07-14', { id: 'yesterday' }),
  recordOn('2026-07-15', { id: 'today-1' }),
  recordOn('2026-06-30', { id: 'last-month' }),
]
buildTodayActivity(records, clock).todayRecords.map((item) => item.id)
// => ['today-1']
```

```ts
// 同一天多条记录按创建时间倒序，且字段完整映射（tags 是新数组，不是引用）
const records = [
  recordOn('2026-07-15', { id: 'earlier', createdAt: Date.parse('2026-07-15T08:00:00'), duration: 20, tags: ['Agent'] }),
  recordOn('2026-07-15', { id: 'later', createdAt: Date.parse('2026-07-15T20:40:00'), duration: 45, tags: ['MCP', 'Agent'] }),
]
buildTodayActivity(records, clock).todayRecords.map((item) => item.id)
// => ['later', 'earlier']
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增的 Vitest 用例覆盖 AC-001 至 AC-006。
- 在微信开发者工具中依次使用「测试场景 · 今日记录」「测试场景 · 历史记录」两个编译场景验证 AC-007 至 AC-008。
- Code Review 确认：未修改 `features/today-summary/`、`components/today-summary/`、`pages/today/index.ts`、`pages/today/index.wxml` 任何文件（CON-001、CON-003）；`today-activity` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-004）；活动条没有绑定任何点击导航或筛选事件（CON-005）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.1 — Today 页的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — Today 页视觉规范
- P1-01 Today 概览与主行动 — 同一页面的 Phase 1 前置功能，与本 Spec 互不依赖但共享 `pages/today/index.ts`，见 [P1-01 Spec](../phase-1/p1-01-today-summary.md)
