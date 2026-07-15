---
title: P1-01 Today 概览与主行动
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, today]
---

# Introduction

本 Spec 交付 Today 页的核心概览：当前连续学习天数、今日学习分钟数、今日记录条数，以及根据用户当前状态变化的主行动按钮。这是 Today 页三个功能区之一（另一个是 P2-01 的近 7 天活动条与今日记录列表，Phase 2 才实现），是新用户和老用户打开小程序后看到的第一屏内容。

## 1. Purpose & Scope

**目的**：让用户一进入 Today 页就能看到自己的学习状态（连续了多少天、今天学了多久、今天记了几条），并根据"从未使用 / 有历史但今天没记 / 今天已经记过"三种状态给出对应的行动号召，引导用户新建学习记录。

**范围**：
- `miniprogram/features/today-summary/index.ts` — 纯函数 `buildTodaySummary`
- `miniprogram/components/today-summary/` — 展示概览与主行动按钮的 Component
- `miniprogram/pages/today/index.ts` — 仅涉及调用 `buildTodaySummary` 并把结果传给 Component 这部分逻辑
- 对应 Vitest 测试

**不在范围内**：近 7 天活动条、今日记录列表（属于 P2-01，见 [P2-01 Spec](../phase-2/p2-01-today-activity.md)）、记录的新建流程本身（属于 P1-02）。

**读者假设**：实现者已经 clone 了 `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中正常打开 Today 页并看到空状态。实现者不需要修改 Starter Kit 已经提供的 `domain/`、`shared/date/`、`repositories/`、`fixtures/` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `Clock` | 提供 `now()`/`today()` 的时间抽象；生产环境用 `SystemClock`，测试用 `FixedClock` |
| `本地日期` | `Clock.today()` 返回的 `YYYY-MM-DD` 格式字符串，按设备本地时区计算，不是 UTC 日期 |
| `连续学习天数` (streak) | 由 `shared/date/streak.ts` 的 `calculateStreakSummary` 计算得出的 `{ current, longest }`；本 Spec 只使用 `current` |
| `主行动` (primary action) | Today 页最显著的操作入口，点击后进入新建记录页 |
| `LoadState` | `'loading' \| 'ready' \| 'error'`，页面数据加载状态，定义见 [Starter Kit Contract §8.1](../../starter-kit-contract.md#81-统一加载状态) |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildTodaySummary(records, clock)` 必须只统计 `record.date === clock.today()` 的记录得到 `todayRecordCount`（条数）与 `todayMinutes`（`duration` 求和）。
- **REQ-002**: `currentStreak` 必须通过调用 `shared/date/streak.ts` 导出的 `calculateStreakSummary(records, clock)` 取其 `current` 字段得到，不得重新实现连续天数算法。
- **REQ-003**: 当 `records.length === 0` 时，返回 `actionState: 'first-time'`，标题固定为「今天还没有开始学习」，按钮文案固定为「记录第一次学习」。
- **REQ-004**: 当存在历史记录但 `todayRecordCount === 0` 时，返回 `actionState: 'resume'`，按钮文案固定为「记录一次学习」。
- **REQ-005**: 当 `todayRecordCount > 0` 时，返回 `actionState: 'recorded-today'`，标题固定为「今天已经开始学习了」，`actionDescription` 必须包含当天的记录条数，按钮文案固定为「再记录一次学习」。
- **REQ-006**: 点击主行动按钮必须通过 `shared/navigation/routes.ts` 的 `buildCreateRecordRoute('today')` 生成的路由导航到新建记录页，不得手工拼接 URL 字符串。
- **CON-001**: 不得实现或修改近 7 天活动条与今日记录列表——这是 P2-01 的范围。`features/today-activity/`、`components/today-activity/` 目录下的任何文件都不得修改。
- **CON-002**: `today-summary` Component 只能通过 `properties.model` 接收数据、通过 `create-record` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例。
- **CON-003**: 所有"今日"相关的判断必须基于 `LearningRecord.date`（本地日期字符串），不得从 `createdAt`（UTC 毫秒时间戳）重新推导当天范围。
- **GUD-001**: 复用 Starter 已提供的 `Clock` 抽象与 `shared/date/` 下的日期工具，不重新实现日期解析/比较逻辑。
- **PAT-001**: 页面遵循 Starter 统一的 `LoadState` 模式：`loading` 阶段不能提前展示"零记录"的概览；`error` 阶段保留上一次已知的可信内容并提供重试，不能把失败伪装成空状态。

## 4. Interfaces & Data Contracts

### Feature：`features/today-summary/index.ts`

```ts
export type TodayActionState = 'first-time' | 'resume' | 'recorded-today'

export type TodaySummaryViewModel = {
  currentStreak: number
  todayMinutes: number
  todayRecordCount: number
  actionState: TodayActionState
  actionTitle: string
  actionDescription: string
  actionText: string
}

export function buildTodaySummary(
  records: readonly LearningRecord[],
  clock: Clock,
): TodaySummaryViewModel
```

`actionState` 字段是本 Spec 在 Starter 已固定的公开端口（`buildTodaySummary` 签名、`model` property、`create-record` event，见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)）基础上新增的返回值字段，用于让 UI 层和测试都能直接判断当前处于哪种行动状态，而不必反向解析中文文案。

### Component：`components/today-summary/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `model` | `TodaySummaryViewModel` | 全零、`actionState: 'first-time'`、文案为空字符串的安全默认对象 |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `create-record` | 无 | 用户点击主行动按钮 |

### Page 编排：`pages/today/index.ts`

Today 页依次调用两个互不依赖的 Feature（P0 已经这样编排，本 Spec 只需要保证 `buildTodaySummary` 这一半是真实实现）：

```ts
buildTodaySummary(records, clock)   // 本 Spec
buildTodayActivity(records, clock)  // P2-01，本 Spec 不实现，保持 Starter 安全默认
```

`onShow` 时重新调用 `recordRepository.list()` 并重建两个视图模型；`create-record` 事件绑定到 `wx.navigateTo({ url: buildCreateRecordRoute('today') })`。

## 5. Acceptance Criteria

- **AC-001**: Given 一个空的记录数组, When 调用 `buildTodaySummary([], clock)`, Then 返回 `currentStreak: 0`、`todayMinutes: 0`、`todayRecordCount: 0`、`actionState: 'first-time'`、`actionText: '记录第一次学习'`、`actionTitle: '今天还没有开始学习'`。
- **AC-002**: Given 当天存在 3 条记录（时长分别为 35、25、10 分钟）与 1 条昨天的记录, When 调用 `buildTodaySummary`, Then `todayRecordCount` 为 3、`todayMinutes` 为 70（不包含昨天那条）。
- **AC-003**: Given 只有昨天和前天有记录、今天没有, When 调用 `buildTodaySummary`, Then `todayMinutes` 与 `todayRecordCount` 均为 0、`currentStreak` 为 2、`actionState` 为 `'resume'`、`actionText` 为 `'记录一次学习'`。
- **AC-004**: Given 最近一条记录是 5 天前（今天和昨天都没有记录，形成断档）, When 调用 `buildTodaySummary`, Then `currentStreak` 为 0，`actionState` 仍为 `'resume'`（不是 `'first-time'`，因为历史记录存在）。
- **AC-005**: Given 当天有 2 条记录（45、15 分钟）与 1 条昨天的记录, When 调用 `buildTodaySummary`, Then `todayRecordCount` 为 2、`todayMinutes` 为 60、`currentStreak` 为 2（今天计入连续）、`actionState` 为 `'recorded-today'`、`actionDescription` 包含数字 `2`、`actionText` 为 `'再记录一次学习'`。
- **AC-006**: Given 微信开发者工具选择编译场景「测试场景 · 空数据」, When 打开 Today 页, Then 概览显示连续 0 天、今日 0 分钟、主行动文案为「记录第一次学习」，点击按钮进入新建记录页。
- **AC-007**: Given 编译场景「测试场景 · 今日记录」, When 打开 Today 页, Then 概览显示的今日分钟数与条数和该 Fixture 场景写入的记录一致，主行动状态为 `'recorded-today'`。
- **AC-008**: Given 编译场景「测试场景 · 历史记录」, When 打开 Today 页, Then 概览显示的连续天数与该 Fixture 场景的记录日期分布一致；离开小程序重新进入后（`onShow` 重新读取），数值保持稳定不跳变。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildTodaySummary` 的纯函数逻辑，覆盖 AC-001 至 AC-005。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-006 至 AC-008，使用 Starter 已配置好的编译场景，不需要额外搭建环境。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：使用 `FixedClock` 固定测试时间，避免测试结果随实际运行日期漂移；手工验收使用 Starter 提供的 `empty`/`today`/`history` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（数值、状态），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯 UI 与本地计算，无性能测试要求）。

## 7. Rationale & Context

三种主行动状态（`first-time` / `resume` / `recorded-today`）对应产品设计中"首次使用""有历史但今天未记录""今天已有记录"三种用户心智状态（见 [产品设计 §7.1](../../product-design.md)），目的是让文案始终贴合用户当下的真实处境，而不是用一句通用文案应付所有情况。

`currentStreak` 复用 `shared/date/streak.ts` 而不是在本 Feature 内重新实现，是因为同一套连续天数算法在 P1-06（学习统计总览）中也要用到；如果两处各写一套，容易在"今天缺席算不算断档"这类边界情况上产生不一致的用户体验。

`actionState` 被设计成一个显式的枚举字段而不是让调用方去反向解析 `actionTitle` 字符串，是因为 UI 文案属于产品可调整的内容，不应该成为测试和其他逻辑判断状态的依据。

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
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `empty`/`today`/`history` 场景——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 同一天多条记录：条数和分钟数都要正确聚合，且不包含其他日期的记录
const records = [
  recordOn('2026-07-15', 35),
  recordOn('2026-07-15', 25),
  recordOn('2026-07-15', 10),
  recordOn('2026-07-14', 45), // 昨天的记录，不计入 todayMinutes / todayRecordCount
]

buildTodaySummary(records, clock)
// => { todayRecordCount: 3, todayMinutes: 70, ... }
```

```ts
// 边界情况：有历史记录但今天和昨天都没有记录，形成断档
const records = [recordOn('2026-07-10', 20), recordOn('2026-07-09', 20)]

buildTodaySummary(records, clock)
// => currentStreak: 0（不是负数或抛错），actionState 仍为 'resume'（不是 'first-time'）
```

```ts
// 边界情况：completely empty history 与"有历史但今天没记"要返回不同的 actionState，
// 不能都用同一种"空状态"文案糊弄过去
buildTodaySummary([], clock).actionState        // 'first-time'
buildTodaySummary([昨天的记录], clock).actionState // 'resume'
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增的 Vitest 用例覆盖 AC-001 至 AC-005。
- 在微信开发者工具中依次使用「测试场景 · 空数据」「测试场景 · 今日记录」「测试场景 · 历史记录」三个编译场景验证 AC-006 至 AC-008。
- Code Review 确认：未修改 `features/today-activity/`、`components/today-activity/` 目录下任何文件（CON-001、CON-002）；`today-summary` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-003）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.1 — Today 页的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — Today 页视觉规范
- P2-01 Today 近 7 天活动与今日记录 — 同一页面的 Phase 2 延伸功能，与本 Spec 互不依赖但共享 `pages/today/index.ts`
