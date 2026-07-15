---
title: P2-07 学习主题 Top 3
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, stats]
---

# Introduction

本 Spec 交付学习统计页的第四个区块：学习主题 Top 3。它按「包含该主题的记录数量」对用户使用过的学习主题（标签）排序，只展示前三名，并支持点击某个主题直接跳转到带该主题筛选条件的学习日志。这是学习统计页 P0 已经组合好的四个互不依赖 Feature 之一（另外三个是 P1-06 统计总览、P2-05 本月学习日历、P2-06 最近 7 天投入趋势），零记录时由 P1-06 的 `overview.hasRecords` 统一控制整个统计页除总览卡外的区块都不渲染。

## 1. Purpose & Scope

**目的**：让用户在学习统计页看到自己最常学习的三个主题及其出现次数，帮助用户识别自己的学习重心；点击某个主题能直接进入只包含该主题记录的学习日志，形成"统计 → 日志"的探索路径。

**范围**：
- `miniprogram/features/stats-tag-rank/index.ts` — 纯函数 `buildTagRank`
- `miniprogram/components/stats-tag-rank/` — 展示 Top 3 排行列表的 Component
- `miniprogram/pages/stats/index.ts` — 仅涉及调用 `buildTagRank` 并处理 `select-tag` 事件跳转这部分逻辑（页面其余部分已由 Starter 和 P1-06 接好）
- 对应 Vitest 测试 `tests/features/stats-tag-rank/index.test.ts`

**不在范围内**：本月学习日历（属于 P2-05，见 [P2-05 Spec](./p2-05-stats-calendar.md)）、最近 7 天投入趋势（属于 P2-06，见 [P2-06 Spec](./p2-06-stats-seven-day-trend.md)）、统计总览卡片与 `overview.hasRecords` 的零记录整体收起逻辑（属于 P1-06）、学习日志页收到 `tag` 参数后的实际筛选行为（属于 P2-03）。

**读者假设**：实现者已经从 `main`（Phase 1 集成完成后的基线）建分支，`npm run check` 全部通过，能够在微信开发者工具中使用「测试场景 · 学习统计」编译场景打开学习统计页并看到 P1-06 的空状态或真实数据。实现者不需要修改 `domain/`、`shared/date/`、`shared/navigation/`、`repositories/`、`fixtures/` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `tag` / 学习主题 | `LearningRecord.tags` 数组中的一个字符串元素；一条记录可以有 0 到 3 个主题 |
| `TagRankItem` | 单个主题在排行中的一项：`{ tag, count }` |
| `count` | 包含该主题的**不重复记录数**，不是该主题在所有记录中出现的总次数，也不是该主题对应记录的总学习分钟数 |
| `最近使用` | 用于并列排序打破平局，取该主题所在所有记录中 `createdAt` 的最大值 |
| `Top 3` | 排行结果最多返回 3 项；不足 3 个不同主题时如实返回较少的数量，不补空位 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildTagRank(records)` 对每条记录内部的标签先去重（同一条记录内即使标签数组含重复值也只计一次），再统计每个主题被多少条**不同记录**包含，得到 `count`。
- **REQ-002**: 一条记录带多个主题时，必须为它包含的每一个主题各贡献一次计数，不能只算第一个主题，也不能把这条记录的时长按主题拆分。
- **REQ-003**: 排序必须按 `count` 降序；`count` 相同时按"最近使用"降序（该主题所在所有记录里最大的 `createdAt`），不得按主题字符串本身排序，也不得按总学习分钟数排序。
- **REQ-004**: 结果最多返回前 3 项（`Array.slice(0, 3)`），即使存在 3 个以上不同主题。
- **REQ-005**: `records` 中 `tags` 为空数组的记录不产生任何排行条目；如果所有记录都没有主题，`buildTagRank` 必须返回空数组 `[]`。
- **REQ-006**: 点击排行中的某一项时，Component 必须通过 `select-tag` 事件汇报，`detail` 为 `{ tag: string }`；只有 `data-tag` 确实取到非空字符串时才触发事件。
- **REQ-007**: Page 收到 `select-tag` 事件后必须通过 `shared/navigation/routes.ts` 的 `buildLogFilterRoute({ tag })` 生成路由并用 `wx.reLaunch` 跳转到学习日志，不得手工拼接 URL 字符串或使用 `wx.navigateTo`。
- **CON-001**: 不得实现或修改本月学习日历与最近 7 天投入趋势——这是 P2-05、P2-06 的范围。`features/stats-calendar/`、`components/stats-calendar/`、`features/stats-seven-day-trend/`、`components/stats-seven-day-trend/` 目录下的任何文件都不得修改。
- **CON-002**: `stats-tag-rank` Component 只能通过 `properties.items` 接收数据、通过 `select-tag` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例。
- **CON-003**: `buildTagRank` 不接收 `Clock` 参数，也不对记录做任何按日期的时间窗口过滤——排行统计的是全部历史记录，不是"最近 N 天"，这与 P1-01/P1-06 的连续天数、P2-06 的 7 天趋势在设计上刻意不同。
- **CON-004**: Component 收到空 `items` 时不得渲染任何占位卡片、空状态文案或奖杯图标；整块区域连同标题一起不渲染（`wx:if="{{items.length}}"`）。
- **GUD-001**: 复用 `LearningRecord.tags` 和 `LearningRecord.createdAt` 字段，不引入新的领域字段或重新定义"最近使用"的时间来源（不得使用 `updatedAt`）。
- **PAT-001**: Page 把 `recordRepository.list()` 读到的完整记录数组分别传给 `buildStatisticsOverview`、`buildMonthCalendar`、`buildSevenDayTrend`、`buildTagRank` 四个互不依赖的函数，不做任何跨函数的中间结果共享或裁剪（Starter Kit Contract §8.5）。

## 4. Interfaces & Data Contracts

### Feature：`features/stats-tag-rank/index.ts`

```ts
export type TagRankItem = {
  tag: string
  count: number
}

export const buildTagRank = (records: readonly LearningRecord[]): TagRankItem[]
```

内部实现使用一个按 `tag` 聚合的 `Map<string, { tag, count, lastUsedAt }>`：遍历每条记录时先用 `new Set(record.tags)` 去重，再对集合里的每个主题递增 `count` 并用 `Math.max` 更新 `lastUsedAt`；最终按 `count` 降序、`lastUsedAt` 降序排序后 `slice(0, 3)`，只输出 `{ tag, count }`（`lastUsedAt` 是内部排序用的字段，不出现在返回值里）。

### Component：`components/stats-tag-rank/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `items` | `TagRankItem[]` | `[]` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `select-tag` | `{ tag: string }`（见 Starter Kit Contract §7 的 `TagSelectEventDetail`） | 用户点击排行中的一项，且该项的 `tag` 非空 |

```wxml
<vc-card wx:if="{{items.length}}" vc-class="card">
  <view class="header">
    <text class="header__title">学习主题</text>
    <text class="header__badge">Top 3 排名</text>
  </view>
  <view
    wx:for="{{items}}"
    wx:key="tag"
    class="rank"
    data-tag="{{item.tag}}"
    bind:tap="onSelectTag"
  >
    <view class="rank__index">{{index + 1}}</view>
    <view class="rank__tag">{{item.tag}}</view>
    <view class="rank__count">{{item.count}} 次</view>
  </view>
</vc-card>
```

`onSelectTag` 从 `event.currentTarget.dataset` 读取 `tag`，非空才 `triggerEvent('select-tag', { tag })`——避免异常渲染状态下发出一个空 `tag` 的事件把页面导航到无效路由。

### Page 编排：`pages/stats/index.ts`

学习统计页依次调用四个互不依赖的 Feature（P0 已经这样编排，本 Spec 只需要保证 `buildTagRank` 这一部分是真实实现）：

```ts
buildStatisticsOverview(records, clock) // P1-06
buildMonthCalendar(records, clock)      // P2-05
buildSevenDayTrend(records, clock)      // P2-06
buildTagRank(records)                   // 本 Spec
```

`onShow` 时（在 `isFixtureReady()` 通过之后）重新调用 `recordRepository.list()` 并重建四个视图模型，写入 `data.tagRank`。`select-tag` 事件绑定到：

```ts
openLogByTag(event: WechatMiniprogram.CustomEvent<{ tag: string }>) {
  wx.reLaunch({ url: buildLogFilterRoute({ tag: event.detail.tag }) })
}
```

`pages/stats/index.wxml` 把 `<stats-calendar>`、`<stats-seven-day-trend>`、`<stats-tag-rank>` 三个 Phase 2 区块整体包在 `<block wx:if="{{overview.hasRecords}}">` 内（P1-06 拥有 `hasRecords` 字段和这层整体收起逻辑，本 Spec 不需要、也不允许自己重复实现零记录判断）：

```wxml
<block wx:if="{{overview.hasRecords}}">
  <stats-calendar model="{{calendar}}" bind:select-date="openLogByDate" />
  <stats-seven-day-trend items="{{trend}}" />
  <stats-tag-rank items="{{tagRank}}" bind:select-tag="openLogByTag" />
</block>
```

## 5. Acceptance Criteria

- **AC-001**: Given 一个空的记录数组, When 调用 `buildTagRank([])`, Then 返回 `[]`。
- **AC-002**: Given 一条记录同时带有三个主题 `['TypeScript', '小程序', 'Code Review']`, When 调用 `buildTagRank`, Then 返回三项，每项 `count` 均为 `1`（一条记录为每个主题各贡献一次，而不是只算一次或按主题数拆分）。
- **AC-003**: Given `热门` 主题出现在 3 条各 5 分钟的记录中、`冷门` 主题只出现在 1 条 500 分钟的记录中, When 调用 `buildTagRank`, Then 排行第一是 `{ tag: '热门', count: 3 }`，第二是 `{ tag: '冷门', count: 1 }`（按记录数排序，不是按总分钟数）。
- **AC-004**: Given `旧主题`（`createdAt` 为 10、20）与`新主题`（`createdAt` 为 15、50）计数同为 2, When 调用 `buildTagRank`, Then 顺序为 `['新主题', '旧主题']`（`新主题` 的最近一次 `createdAt`=50 晚于`旧主题`的 20）。
- **AC-005**: Given 只存在 2 个不同主题, When 调用 `buildTagRank`, Then 结果长度为 2，不补齐到 3 项。
- **AC-006**: Given 所有记录的 `tags` 均为空数组, When 调用 `buildTagRank`, Then 返回 `[]`（无主题记录不进入排行）。
- **AC-007**: Given 存在 `A`/`A2`/`B` 三个主题各出现 2 次且并列、`C`/`D` 各出现 1 次（共 4 个以上不同主题）, When 调用 `buildTagRank`, Then 只返回 3 项，且并列的三项按最近使用排序为 `['B', 'A', 'A2']`（`B` 的最后一次 `createdAt` 晚于 `A`/`A2`）。
- **AC-008**: Given 微信开发者工具选择编译场景「测试场景 · 学习统计」（`history` Fixture）, When 打开学习统计页, Then 学习主题区块最多显示 3 个主题、按记录数降序排列，且数字与该 Fixture 场景下每个标签实际覆盖的记录数一致。
- **AC-009**: Given 同一「测试场景 · 学习统计」页面已显示 Top 3 排行, When 点击排行中的任意一个主题, Then 页面通过 `wx.reLaunch` 跳转到学习日志页并带有该主题的 URL 编码 `tag` 查询参数，日志页据此显示按该主题筛选的记录。
- **AC-010**: Given 编译场景「测试场景 · 空数据」（零记录）, When 打开学习统计页, Then `overview.hasRecords` 为 `false`，学习主题区块与日历、趋势一起完全不渲染，不出现空排行卡片或占位文案。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildTagRank` 的纯函数逻辑，覆盖 AC-001 至 AC-007。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-008 至 AC-010，使用 Starter 已配置好的编译场景，不需要额外搭建环境。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：测试使用递增的 `createdAt`/`sequence` 构造记录（见 `tests/features/stats-tag-rank/index.test.ts` 的 `recordWith` 辅助函数），不依赖 `Clock`（`buildTagRank` 本身不接收 `Clock` 参数）；手工验收使用 Starter 提供的 `history`/`empty` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（排序、计数、并列打破），不断言 WXML 文本或颜色。
- **Performance Testing**：不适用（本 Spec 是纯本地聚合计算，无性能测试要求）。

## 7. Rationale & Context

排行指标选择"包含该主题的不重复记录数"而不是"总学习分钟数"或"标签出现总次数"，直接对应 [产品设计 §7.5](../../product-design.md) 的"按包含该主题的记录数量排序"：这样一条罕见的超长学习记录（例如 500 分钟）不会靠时长压过多次高频但较短的记录，排行反映的是"经常学"而不是"曾经学很久"。

"一条记录带多个主题时每个主题各计一次"同样来自产品设计原文——"一条带有多个主题的记录会分别为每个主题贡献一次计数"——如果按记录数除以主题数拆分计数，会让多主题记录在排行中被稀释，与用户对"这条记录确实涉及这几个主题"的直觉不符。

并列时按"最近使用"排序（取该主题所在记录里最大的 `createdAt`，不是 `updatedAt`）是为了让排行反映用户当前活跃的学习方向，而不是历史上曾经密集但已经很久没再出现的主题；使用 `createdAt` 而不是 `updatedAt` 是因为编辑操作（P2-02）改的是记录内容，不代表用户"最近在学这个主题"。

`buildTagRank` 刻意不接收 `Clock` 参数，是因为它统计的是全部历史记录，不像 P1-01/P1-06 的连续天数或 P2-06 的 7 天趋势那样需要一个"今天"的时间基准做窗口过滤；引入 `Clock` 只会让签名显得需要时间依赖，但实际上不需要。

Component 在 `items` 为空时整体不渲染（而不是显示"暂无主题"之类的空状态），是因为它已经被 Page 用 `overview.hasRecords` 整体收起在零记录场景之外；如果 `hasRecords` 为真但恰好没有任何记录带主题（理论上可能，比如某个 Fixture 全部记录都不选主题），组件仍然选择安静地不显示，而不是额外发明一种"有记录但没有主题排行"的专属空状态，避免和 P1-06 统一的零记录空状态语义冲突。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `domain/learning-record.ts` 的 `LearningRecord` 类型（`tags`、`createdAt` 字段）——Starter 已提供，本 Spec 直接使用，不新增字段。
- **INF-002**: `shared/navigation/routes.ts` 的 `buildLogFilterRoute({ tag })`——Starter 已提供，本 Spec 直接复用，不手工拼接 URL。
- **INF-003**: `repositories/record.ts` 的 `recordRepository.list()`——数据读取的唯一入口，本 Spec 不直接访问 Storage 或 CloudBase；本 Spec 不单独调用它，而是使用 Page 已经统一读取好的记录数组。
- **INF-004**: `features/statistics-overview/index.ts` 的 `hasRecords` 字段（P1-06 所有）——决定包括本 Spec 在内的三个 Phase 2 统计区块是否整体渲染，本 Spec 不重新实现零记录判断。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `history`/`empty` 场景——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 一条记录多个主题：每个主题各计一次，不是只计一次也不是按主题数拆分
const records = [recordWith(['TypeScript', '小程序', 'Code Review'], { createdAt: 100 })]

buildTagRank(records)
// => [
//   { tag: 'TypeScript', count: 1 },
//   { tag: '小程序', count: 1 },
//   { tag: 'Code Review', count: 1 },
// ]
```

```ts
// 按记录数而不是按总分钟数排序：热门 3 条短记录压过冷门 1 条超长记录
const records = [
  recordWith(['热门'], { createdAt: 10, duration: 5 }),
  recordWith(['热门'], { createdAt: 20, duration: 5 }),
  recordWith(['热门'], { createdAt: 30, duration: 5 }),
  recordWith(['冷门'], { createdAt: 40, duration: 500 }),
]

buildTagRank(records)
// => rank[0] is { tag: '热门', count: 3 }, rank[1] is { tag: '冷门', count: 1 }
```

```ts
// 并列打破平局：次数相同时最近使用的主题排在前面
const records = [
  recordWith(['旧主题'], { createdAt: 10 }),
  recordWith(['旧主题'], { createdAt: 20 }),
  recordWith(['新主题'], { createdAt: 15 }),
  recordWith(['新主题'], { createdAt: 50 }),
]

buildTagRank(records).map((item) => item.tag)
// => ['新主题', '旧主题']
```

```ts
// 边界情况：无主题记录完全不进入排行，不是显示一个空字符串标签
const records = [recordWith([], { createdAt: 10 }), recordWith([], { createdAt: 20 })]

buildTagRank(records)
// => []
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增的 Vitest 用例覆盖 AC-001 至 AC-007。
- 在微信开发者工具中依次使用「测试场景 · 学习统计」和「测试场景 · 空数据」两个编译场景验证 AC-008 至 AC-010。
- Code Review 确认：未修改 `features/stats-calendar/`、`components/stats-calendar/`、`features/stats-seven-day-trend/`、`components/stats-seven-day-trend/` 目录下任何文件（CON-001）；`stats-tag-rank` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-002）；`buildTagRank` 签名中没有引入 `Clock` 参数或任何日期窗口过滤（CON-003）；点击排行项使用 `buildLogFilterRoute` 而不是手工拼接 URL（REQ-007）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.5 — 学习统计页的产品行为定义，包括 Top 3 排序规则
- [UI 设计](../../ui-foundation-design.md) — 学习统计页视觉规范，Top 3 使用序号、标签和记录次数
- P1-06 学习统计总览 — 同一页面的 Phase 1 基础功能，拥有 `hasRecords` 与整体零记录收起逻辑
- P2-05 本月学习日历 — 同一页面的另一个 Phase 2 区块，与本 Spec 互不依赖但共享 `pages/stats/index.ts`
- P2-06 最近 7 天投入趋势 — 同一页面的另一个 Phase 2 区块，与本 Spec 互不依赖但共享 `pages/stats/index.ts`
