---
title: P2-03 日志日期与标签筛选
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, log]
---

# Introduction

本 Spec 交付学习日志页的结构化筛选：用户可以在最近 7 天的日期条中选择或取消一个日期，在历史主题列表中选择一个标签或回到"全部"，两个条件同时存在时按 AND 语义过滤记录；日期条即使没有任何记录也始终完整展示 7 天，标签列表按最近使用排序去重。本 Spec 还负责恢复从外部路由（例如统计月历的日期跳转）带入日志页的 `date`/`tag` 参数。这是学习日志页 Phase 2 的主要集成人（另一半是 P1-05 的时间线，Phase 1 已实现），本 Spec 不实现关键词检索——那是 P2-04 的范围，且不与之互相依赖。

## 1. Purpose & Scope

**目的**：让用户能够从"全部记录"快速缩小到"某一天"或"某个主题"或两者的交集，并且当用户从统计页的日历点击某个学习日跳转过来时，日志页能自动应用对应的日期筛选；离开这个入口后用户在页面内的筛选点击不应该重新触发整页刷新或路由跳转。

**范围**：
- `miniprogram/features/log-structured-filter/index.ts` — 纯函数 `buildStructuredFilterOptions`、`applyStructuredFilters`
- `miniprogram/components/log-structured-filters/` — 展示日期条、标签条与"清除筛选"入口的 Component
- `miniprogram/pages/log/index.ts` — 结构化筛选相关的编排：`onLoad` 解析外部 `date`/`tag` 参数、`rebuildView` 中把 `applyStructuredFilters` 放在 `applyKeywordFilter` 之前调用、`onStructuredFilterChange`/`clearStructuredFilter` 事件处理
- 对应 Vitest 测试 `tests/features/log-structured-filter/index.test.ts`

**不在范围内**：关键词匹配与结果条数/分钟摘要（属于 P2-04，见 [P2-04 Spec](./p2-04-log-keyword-filter.md)）、日志时间线的分组与空状态展示（属于 P1-05）、统计页月历本身如何生成日期跳转链接（属于 P2-05，本 Spec 只负责日志页这一端如何消费 `date` 参数）。

**读者假设**：实现者已经 clone 了 `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中用「测试场景 · 学习日志」打开日志页并看到 `history` Fixture 的记录列表。实现者不需要修改 Starter Kit 已经提供的 `domain/`、`shared/date/`、`shared/navigation/routes.ts`、`repositories/`、`fixtures/`、`features/log-keyword-filter/`、`components/log-keyword-search/` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `Clock` | 提供 `now()`/`today()` 的时间抽象；生产环境用 `SystemClock`，测试用 `FixedClock` |
| `本地日期` | `Clock.today()` 返回的 `YYYY-MM-DD` 格式字符串，按设备本地时区计算 |
| `滚动 7 天窗口` | 以 `clock.today()` 为终点、向前追溯 6 天，共 7 个本地日期，按从旧到新排序；不依赖传入的记录，始终返回 7 项 |
| `StructuredFilterValue` | `{ date?: string; tag?: string }`，页面当前生效的结构化筛选条件，Starter 已在 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口) 固定的公开类型 |
| `历史主题列表` | 从记录的 `tags` 字段去重后按"最近使用优先"排序得到的字符串数组，排序依据是拥有该标签的最近一条记录的 `createdAt` |
| `AND 语义` | 当 `date` 与 `tag` 同时存在时，一条记录必须同时满足两个条件才会被保留；任意一个条件缺省则不参与过滤 |
| `外部路由参数` | 从其他页面（如统计月历）跳转到日志页时携带的 URL 查询参数 `date`/`tag`，只在 `onLoad` 读取一次 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildStructuredFilterOptions(records, clock)` 的 `dates` 字段必须返回恰好 7 个日期选项，覆盖以 `clock.today()` 为终点的滚动 7 天窗口，按从旧到新排序，且不受传入 `records` 内容或数量影响（即使 `records` 为空也返回完整 7 项）。
- **REQ-002**: 每个日期选项的 `label` 必须是对应星期几的单字（`日一二三四五六`，取自 `date.getDay()`），当日期等于 `clock.today()` 时 `label` 固定为 `'今'`。
- **REQ-003**: `buildStructuredFilterOptions` 的 `tags` 字段必须对所有记录的 `tags` 做去重，去除首尾空白后为空字符串的标签必须丢弃，排序依据是"该标签出现的最近一条记录"的 `createdAt` 降序（即最近使用的主题排在最前）。
- **REQ-004**: `applyStructuredFilters(records, value)` 必须实现 AND 语义：`value.date` 存在时只保留 `record.date === value.date` 的记录；`value.tag` 存在时只保留 `record.tags.includes(value.tag)` 的记录；两者都存在时同时应用；两者都不存在（含空对象、值为 `undefined`）时原样返回全部记录。
- **REQ-005**: `applyStructuredFilters` 的日期比较必须是对 `record.date` 的直接字符串相等判断，允许 `value.date` 取值落在滚动 7 天窗口之外（例如来自统计月历或外部路由的更早日期），依然要正确过滤，不得限制或校验 `value.date` 必须属于当前 `dateOptions`。
- **REQ-006**: 日志页 `onLoad(options)` 必须解析外部 `date`/`tag` 查询参数写入初始 `structuredFilter`：`date` 必须先经过 `shared/date/local-date.ts` 的 `isLocalDate` 校验，非法或缺省时丢弃；`tag` 必须 `trim()` 后为空则丢弃。
- **REQ-007**: 日志页只允许在 `onLoad` 这一次生命周期读取外部 `date`/`tag` 参数；页面内点击结构化筛选组件产生的 `change`/`clear` 事件只更新本地 `data.structuredFilter` 并重新调用 `rebuildView`，不得触发 `wx.navigateTo`/`wx.redirectTo`/重新解析路由参数。
- **REQ-008**: 日志页 `rebuildView` 必须先对全量 `records` 调用 `applyStructuredFilters`，再把结果传给 `applyKeywordFilter`（[Starter Kit Contract §8.4](../../starter-kit-contract.md#84-学习日志) 固定的处理顺序），不得颠倒顺序或跳过结构化筛选这一步。
- **REQ-009**: `log-structured-filters` Component 点击某个日期 chip 时：若该日期已被选中则取消（`value.date` 变为 `undefined`），否则替换为新选中的日期；`tag` 部分保持不变，通过 `change` 事件的 `detail.value` 汇报完整的新 `StructuredFilterValue`。
- **REQ-010**: `log-structured-filters` Component 点击某个标签 chip（含"全部"，其内部 `tag` 为空字符串）时：点击"全部"或再次点击当前已选中的标签都会把 `value.tag` 清空为 `undefined`；点击其他标签则替换为该标签；`date` 部分保持不变。
- **REQ-011**: 当 `value.date` 不在传入的 `dateOptions` 7 天窗口内时（外部路由带入更早日期的场景），Component 必须额外渲染一个"选中态"的日期 chip（`label` 直接使用该日期字符串本身），使其可见且可以点击取消；不得让这类日期静默消失。
- **REQ-012**: Component 必须在 `dateOptions`/`tagOptions`/`value` 三者任一变化时通过 `observers` 重新计算 `dateChips`/`tagChips`/`hasActiveFilter`，`hasActiveFilter` 为 `Boolean(value.date || value.tag)`，只有为真时才展示"清除筛选"入口，点击后触发无 detail 的 `clear` 事件。
- **CON-001**: 不得实现或依赖任何关键词匹配逻辑——这是 P2-04 的范围。不得导入 `features/log-keyword-filter/`、`components/log-keyword-search/` 目录下的任何文件，也不得等待或假设 P2-04 已经完成。
- **CON-002**: `log-structured-filters` Component 只能通过 `properties`（`dateOptions`、`tagOptions`、`value`）接收数据、通过 `change`/`clear` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例。
- **CON-003**: `applyStructuredFilters` 不得修改传入的 `records` 数组或数组内的记录对象（返回新数组）。
- **CON-004**: 不得修改 `features/log-timeline/`、`components/log-timeline/`（P1-05 独占）与 `features/log-keyword-filter/`、`components/log-keyword-search/`（P2-04 独占）目录下的任何文件。
- **GUD-001**: 日期加减、解析与校验统一复用 `shared/date/local-date.ts` 的 `addLocalDays`/`parseLocalDate`/`isLocalDate`，不重新实现日期运算。
- **GUD-002**: 标签排序复用"按最近一条记录的 `createdAt` 降序遍历、首次出现即记录"的策略，与标签选择组件（P1-03）的建议标签排序思路保持一致，避免两处标签排序规则出现不一致的用户体验。
- **PAT-001**: 页面遵循 Starter 统一的 `LoadState` 模式：本 Spec 不改变 `loading`/`ready`/`error` 状态机本身，只在 `ready` 之后基于当前 `structuredFilter` 重新计算展示内容。
- **PAT-002**: Component 内部的选中态计算（`buildDateChips`/`buildTagChips`）都是纯函数，接收 `options`/`selected` 返回带 `selected` 标记的 chip 数组，不在 `observers` 之外散落状态判断逻辑。

## 4. Interfaces & Data Contracts

### Feature：`features/log-structured-filter/index.ts`

```ts
export type StructuredFilterValue = {
  date?: string
  tag?: string
}

export type StructuredFilterDateOption = {
  value: string
  label: string
}

export type StructuredFilterOptions = {
  dates: StructuredFilterDateOption[]
  tags: string[]
}

export const buildStructuredFilterOptions = (
  records: readonly LearningRecord[],
  clock: Clock,
): StructuredFilterOptions

export const applyStructuredFilters = (
  records: readonly LearningRecord[],
  value: StructuredFilterValue,
): LearningRecord[]
```

`buildStructuredFilterOptions`/`applyStructuredFilters` 的签名与 `StructuredFilterValue` 类型是 Starter 已固定的公开端口（见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)）；`StructuredFilterDateOption`/`StructuredFilterOptions` 是本 Spec 在此基础上新增的内部返回类型，供 Component 和 Page 共用。

### Component：`components/log-structured-filters/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `dateOptions` | `StructuredFilterDateOption[]` | `[]` |
| `tagOptions` | `string[]` | `[]` |
| `value` | `StructuredFilterValue` | `{}` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `change` | `{ value: StructuredFilterValue }` | 用户点击某个日期 chip 或标签 chip 之后 |
| `clear` | 无 | 用户点击"清除筛选"入口 |

Component 内部派生状态（不对外暴露为 property，仅用于渲染）：

```ts
type DateChip = StructuredFilterDateOption & { selected: boolean }
type TagChip = { tag: string; label: string; selected: boolean }
```

### Page 编排：`pages/log/index.ts`

```ts
const parseInitialFilter = (
  options: Record<string, string | undefined>,
): StructuredFilterValue => {
  const date = options.date && isLocalDate(options.date) ? options.date : undefined
  const tag = options.tag?.trim() || undefined
  return { date, tag }
}

// onLoad：只在这里解析外部参数
onLoad(options) {
  this.setData({ structuredFilter: parseInitialFilter(options) })
}

// rebuildView：固定顺序——结构化筛选先于关键词筛选（Starter Kit Contract §8.4）
rebuildView(records, structuredFilter, keyword) {
  const structuredRecords = applyStructuredFilters(records, structuredFilter)
  const filteredRecords = applyKeywordFilter(structuredRecords, keyword) // P2-04

  this.setData({
    structuredFilter,
    keyword,
    filterOptions: buildStructuredFilterOptions(records, clock),
    resultSummary: buildFilterResultSummary(filteredRecords),
    timeline: buildLogTimeline(filteredRecords),
    hasActiveFilters: Boolean(structuredFilter.date || structuredFilter.tag || keyword.trim()),
  })
}

// 事件处理：只更新本地状态，不导航
onStructuredFilterChange(event) {
  this.rebuildView(this.data.records, event.detail.value, this.data.keyword)
}
clearStructuredFilter() {
  this.rebuildView(this.data.records, {}, this.data.keyword)
}
```

WXML 绑定（`pages/log/index.wxml`，Starter 已提前放置）：

```wxml
<log-structured-filters
  date-options="{{filterOptions.dates}}"
  tag-options="{{filterOptions.tags}}"
  value="{{structuredFilter}}"
  bind:change="onStructuredFilterChange"
  bind:clear="clearStructuredFilter"
/>
```

## 5. Acceptance Criteria

- **AC-001**: Given 空记录数组与固定为 2026-07-15（周三）的 Clock, When 调用 `buildStructuredFilterOptions([], clock)`, Then `dates` 返回 7 项，`value` 依次为 `['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14', '2026-07-15']`，`label` 依次为 `['四', '五', '六', '日', '一', '二', '今']`。
- **AC-002**: Given 三条记录分别在 2026-07-10（`Git`、`TypeScript`，`createdAt` 最早）、2026-07-12（`小程序`，`createdAt` 最晚）、2026-07-11（`TypeScript`，`createdAt` 居中）, When 调用 `buildStructuredFilterOptions`, Then `tags` 返回 `['小程序', 'TypeScript', 'Git']`（按最近使用排序，`TypeScript` 因在两条记录出现但以较新一次的位置去重）。
- **AC-003**: Given 一条记录的 `tags` 为 `['  Git  ', '   ']`, When 调用 `buildStructuredFilterOptions`, Then `tags` 返回 `['Git']`（去除首尾空白且丢弃空标签）。
- **AC-004**: Given 4 条记录（今天两条分别带 `TypeScript`/`小程序` 与 `Code Review`、昨天一条带 `Git`、上月一条带 `TypeScript`）, When 调用 `applyStructuredFilters(records, { date: '2026-07-15' })`, Then 只返回今天的两条记录。
- **AC-005**: Given 同一组记录, When 调用 `applyStructuredFilters(records, { tag: 'TypeScript' })`, Then 返回今天带 `TypeScript` 的记录与上月带 `TypeScript` 的记录，忽略日期。
- **AC-006**: Given 同一组记录, When 调用 `applyStructuredFilters(records, { date: '2026-07-15', tag: 'TypeScript' })`, Then 只返回同时满足两个条件的一条记录（AND 语义）。
- **AC-007**: Given 同一组记录, When 调用 `applyStructuredFilters(records, { date: '2026-07-14', tag: 'TypeScript' })`, Then 返回空数组（AND 组合无匹配时不回退成 OR）。
- **AC-008**: Given 同一组记录, When 调用 `applyStructuredFilters(records, { date: '2026-06-01' })`（该日期不在滚动 7 天窗口内）, Then 依然正确返回 2026-06-01 的记录，不因超出窗口而失效。
- **AC-009**: Given 同一组记录, When 调用 `applyStructuredFilters(records, {})` 或 `applyStructuredFilters(records, { date: undefined, tag: undefined })`, Then 原样返回全部记录。
- **AC-010**: Given 微信开发者工具选择编译场景「测试场景 · 学习日志」（`history` Fixture）, When 打开日志页并点击日期条中的"今"chip, Then 时间线只显示当天的记录，日期 chip 呈选中态，标签条保持"全部"；再次点击"今"chip 后日期筛选被取消、时间线恢复展示全部记录。
- **AC-011**: Given 同一「测试场景 · 学习日志」, When 依次点击某个历史主题 chip（如 `TypeScript`）再点击某个日期 chip, Then 时间线只展示同时满足日期与主题的记录（AND），点击"清除筛选"后日期与主题同时清空、时间线恢复展示全部记录。
- **AC-012**: Given 直接通过外部路由打开日志页并携带 `?date=2026-07-01&tag=TypeScript`（该日期落在滚动 7 天窗口之外）, When 页面 `onLoad`/`onShow` 完成加载, Then 结构化筛选组件的日期条中出现一个额外的、以该日期字符串为文案且处于选中态的 chip，标签条中 `TypeScript` 处于选中态，时间线只展示同时满足两个条件的记录；点击该额外 chip 可以取消日期筛选。
- **AC-013**: Given 已经通过点击日期/标签 chip 建立本地筛选状态, When 用户在页面内继续点击其他 chip, Then 页面地址栏/路由参数不发生变化（不触发 `wx.navigateTo`/`wx.redirectTo`），只有 `data.structuredFilter` 与时间线内容更新。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildStructuredFilterOptions` 与 `applyStructuredFilters` 的纯函数逻辑，覆盖 AC-001 至 AC-009。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-010 至 AC-013，使用「测试场景 · 学习日志」（`history` Fixture）以及手动拼接的外部 `date`/`tag` 路由参数。
- **Frameworks**：Vitest（`vitest run`，测试文件 `tests/features/log-structured-filter/index.test.ts`）、TypeScript（`tsc --noEmit` 检查小程序代码，`tsc --noEmit --project tsconfig.test.json` 检查测试代码）。
- **Test Data Management**：使用 `FixedClock`（固定为 2026-07-15 周三 09:00）避免测试结果随实际运行日期漂移；测试记录通过局部 `record(id, date, createdAt, tags)` 工厂函数构造，不依赖 Fixture 场景；手工验收使用 Starter 提供的 `history` Fixture 场景与 `shared/navigation/routes.ts` 的 `buildLogFilterRoute` 生成的外部参数组合，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（`typecheck` + `test:typecheck` + `test`），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且断言业务规则本身（日期集合、标签顺序、过滤结果 id 列表），不断言 WXML 文本或 chip 的具体样式类名。
- **Performance Testing**：不适用（本 Spec 是纯本地数组过滤与本地日期计算，记录量级为课程演示规模，无性能测试要求）。

## 7. Rationale & Context

日期条固定返回滚动 7 天窗口而不是"只显示有记录的日期"，是因为这是一个稳定的快速筛选入口：如果窗口内容随记录数量变化，用户每次打开日志页看到的 chip 位置都可能不同，反而增加认知负担；这与 P2-01 Today 页 7 天活动条"始终展示 7 天、有记录的天数只是标记"的设计思路一致。

标签列表按"最近使用"而不是按字母或出现频率排序，是因为学习日志场景下用户更可能想筛选自己最近在学的主题，而不是历史上出现次数最多但已经很久没碰的主题；这个排序思路直接复用了 P1-03 标签选择组件的"最近使用优先"策略，避免同一产品里出现两套不一致的标签排序规则。

`applyStructuredFilters` 允许 `value.date` 落在 7 天窗口之外，是为了支撑 P2-05 统计月历的日期跳转场景——用户点击几周前的某个学习日应该能看到当天记录，而不是被"只能筛选最近 7 天"这个 UI 限制卡住；日期条对这类"窗口外但已选中"的日期用一个额外 chip 展示，而不是让筛选状态和可见 UI 出现不一致。

日志页只在 `onLoad` 解析一次外部路由参数，而不是每次筛选变化都重新读取/写入路由，是因为页面内点击筛选属于"当前会话内的临时状态"，不需要也不应该产生新的导航历史；这也是 [Starter Kit Contract §8.4](../../starter-kit-contract.md#84-学习日志) 明确固定的行为边界。

结构化筛选在 `applyKeywordFilter` 之前执行（而不是反过来或并行）是 P0 固定的管道顺序：结构化条件先把候选集合收窄到"某天/某主题"，关键词检索再在这个更小的集合里做文本匹配，两个功能因此可以被完全不同的两位开发者独立实现和测试，互不依赖对方的输出形状。

## 8. Dependencies & External Integrations

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page，`scroll-view` 横向滚动承载日期条与标签条。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `shared/date/clock.ts` 提供的 `Clock` 抽象（`SystemClock`/`FixedClock`）——Starter 已提供，本 Spec 直接使用。
- **INF-002**: `shared/date/local-date.ts` 提供的 `addLocalDays`/`parseLocalDate`/`isLocalDate`——Starter 已提供，本 Spec 用于计算滚动窗口与校验外部日期参数，不重新实现日期解析。
- **INF-003**: `shared/navigation/routes.ts` 提供的 `buildLogFilterRoute`——由其他 Spec（如 P2-05 统计月历）用来生成带 `date`/`tag` 的跳转链接；本 Spec 是这类链接落地后的消费端，本身不调用该函数，但 `onLoad` 的参数解析必须与其产出的查询字符串格式（`date=YYYY-MM-DD`、`tag=<原样字符串>`）保持一致。
- **INF-004**: `repositories/record.ts` 的 `recordRepository.list()`——数据读取的唯一入口，本 Spec 不直接访问 Storage 或 CloudBase；`records` 由日志页 `loadRecords` 统一获取后传给 `buildStructuredFilterOptions`/`applyStructuredFilters`。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `history` 场景——手工验收使用，覆盖跨日期、跨月、同日多条标签的记录分布，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 滚动 7 天窗口：不受传入记录影响，永远是 7 项、从旧到新排列
const options = buildStructuredFilterOptions([], clock) // clock.today() === '2026-07-15'
options.dates.map((d) => d.value)
// => ['2026-07-09', ..., '2026-07-14', '2026-07-15']
options.dates.map((d) => d.label)
// => ['四', '五', '六', '日', '一', '二', '今']
```

```ts
// 标签按最近使用排序去重：r2（createdAt 最晚）的“小程序”排最前，
// TypeScript 在 r1、r3 都出现，但只在第一次遇到（r2 之后遍历到的 r3）时记录一次
const records = [
  record('r1', '2026-07-10', 1_000, ['Git', 'TypeScript']),
  record('r2', '2026-07-12', 3_000, ['小程序']),
  record('r3', '2026-07-11', 2_000, ['TypeScript']),
]
buildStructuredFilterOptions(records, clock).tags
// => ['小程序', 'TypeScript', 'Git']
```

```ts
// AND 语义与"窗口外日期依然生效”两个边界情况一起验证
const records = [
  record('today-typescript', '2026-07-15', 1_000, ['TypeScript', '小程序']),
  record('today-review', '2026-07-15', 2_000, ['Code Review']),
  record('yesterday-git', '2026-07-14', 3_000, ['Git']),
  record('older-typescript', '2026-06-01', 4_000, ['TypeScript']), // 超出 7 天窗口
]

applyStructuredFilters(records, { date: '2026-07-15', tag: 'TypeScript' })
// => 只有 'today-typescript'

applyStructuredFilters(records, { date: '2026-06-01' })
// => 只有 'older-typescript'，窗口外日期依然能正确过滤

applyStructuredFilters(records, { date: undefined, tag: undefined })
// => 原样返回全部 4 条，等同于“全部”
```

```ts
// 边界情况：空标签与纯空白标签必须被丢弃，不能出现在 tags 里污染“全部”之外的选项
buildStructuredFilterOptions(
  [record('r1', '2026-07-10', 1_000, ['  Git  ', '   '])],
  clock,
).tags
// => ['Git']（不是 ['Git', '']，也不是 ['  Git  ', '']）
```

## 10. Validation Criteria

- `npm run check`（`typecheck` + `test:typecheck` + `test`）全部通过，且 `tests/features/log-structured-filter/index.test.ts` 覆盖 AC-001 至 AC-009。
- 在微信开发者工具中使用「测试场景 · 学习日志」验证 AC-010、AC-011；手动构造带 `?date=`/`?tag=` 查询参数的日志页链接验证 AC-012、AC-013。
- Code Review 确认：未修改 `features/log-keyword-filter/`、`components/log-keyword-search/`、`features/log-timeline/`、`components/log-timeline/` 目录下任何文件（CON-001、CON-004）；`log-structured-filters` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-002）；`rebuildView` 中 `applyStructuredFilters` 确实在 `applyKeywordFilter` 之前调用（REQ-008）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约，尤其是 §7 功能插槽公开端口与 §8.4 学习日志页面编排契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- P1-05 学习日志时间线 — 同一页面 Phase 1 已实现的时间线展示，本 Spec 只改变喂给它的记录集合，不修改其内部实现
- P2-04 日志关键词检索与结果反馈 — 同一页面的另一半 Phase 2 功能，两者互不导入、互不等待，只通过 Page 的固定处理顺序（结构化筛选 → 关键词筛选）间接协作
- P2-05 本月学习日历 — 通过 `buildLogFilterRoute` 生成带 `date` 参数跳转到本 Spec 消费的外部路由入口
