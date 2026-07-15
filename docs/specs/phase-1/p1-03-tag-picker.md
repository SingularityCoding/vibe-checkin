---
title: P1-03 学习主题选择与新建标签
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, tag-picker]
---

# Introduction

本 Spec 交付记录编辑表单里的「学习主题」区域：用户可以从自己的历史主题中选择、输入并新建主题、移除已选主题，并始终看到当前完整的选择结果。这是记录编辑页四个必填/可选字段区域之一（内容、时长由 P1-02 负责，主题由本 Spec 负责），以独立的 `tag-picker` Feature + Component 形式交付，通过 Starter 已经接好的 `<tag-picker>` 插槽嵌入 `record-editor`。

## 1. Purpose & Scope

**目的**：让用户在记录一次学习时，能快速复用自己以前用过的主题（不必每次重新打字），也能随时新建一个从未用过的主题；同时防止标签数据本身脏掉（空白、超长、重复、超过数量上限）。

**范围**：
- `miniprogram/features/tag-picker/index.ts` — 两个纯函数 `collectSuggestedTags`、`normalizeSelectedTags`
- `miniprogram/components/tag-picker/` — 展示已选标签、候选标签、新建输入框的 Component
- 对应 Vitest 测试 `tests/features/tag-picker/index.test.ts`

**不在范围内**：记录编辑表单本身（内容、时长、收获字段、提交、未保存提醒）——这是 P1-02 的范围，见 [P1-02 Spec]（尚未生成，见 [Spec 分配矩阵](../README.md)）；`record-editor` 如何把 `collectSuggestedTags` 的结果传给 `<tag-picker>`、如何接收 `change` 事件写回 `draft.tags` ——这属于 P0 已经打通的插槽接线（`record-editor` 的 WXML 已包含 `<tag-picker>` 且事件已绑定），P1-03 不实现也不描述 P1-02 或 `record-editor` 内部逻辑；编辑模式下标签的复用（P2-02）。

**读者假设**：实现者已经 clone 了 `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中用「测试场景 · 新建记录」编译场景打开记录编辑页并看到已经接好的空 `<tag-picker>` 插槽（当前只渲染安全默认的空组件，因为 `collectSuggestedTags`/`normalizeSelectedTags` 还是安全默认的空实现）。实现者不需要修改 `domain/constraints.ts`、`domain/learning-record.ts`。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| 主题 / Tag | 附在学习记录上的可复用主题字符串（如「微信小程序」「Agent」），一条记录可以没有主题也可以有多个，字段为 `LearningRecord.tags: string[]` |
| 候选主题 (suggested tags) | 从用户历史记录中去重收集出的、可供快速选择的主题列表，由 `collectSuggestedTags` 产出 |
| 已选主题 (selected tags) | 当前草稿正在使用的主题，由 `record-editor` 通过 `selected-tags` property 传入 |
| `RECORD_TAG_MAX_COUNT` | 单条记录最多的主题个数，值为 `3`，定义在 `domain/constraints.ts` |
| `RECORD_TAG_MAX_LENGTH` | 单个主题去除首尾空白后允许的最大字符数，值为 `12`，定义在 `domain/constraints.ts` |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `collectSuggestedTags(records)` 必须遍历传入的全部历史记录，按 `record.createdAt` 降序（最近创建的记录优先）收集其 `tags`，对每个标签先 `trim()`，只保留 `trim()` 后长度在 `1..RECORD_TAG_MAX_LENGTH` 之间的标签，并按「首次出现」去重，返回结果保持"最近使用的主题排在前面"的顺序。
- **REQ-002**: `collectSuggestedTags([])` 必须返回空数组，不抛错。
- **REQ-003**: `normalizeSelectedTags(tags)` 必须对传入的每个标签 `trim()`，丢弃 `trim()` 后为空字符串或长度超过 `RECORD_TAG_MAX_LENGTH`（12）的标签，按「首次有效出现」去重，并在结果达到 `RECORD_TAG_MAX_COUNT`（3）个后停止（即最多返回 3 个），保留输入顺序中第一次出现的位置。
- **REQ-004**: `tag-picker` Component 必须通过 `selected-tags`（当前完整已选标签数组）与 `suggested-tags`（候选主题数组）两个 property 接收数据；两者变化时都要重新计算「候选标签是否已被选中」的展示状态（`observers: 'selectedTags, suggestedTags'`）。
- **REQ-005**: 点击一个未选中的候选标签，必须把该标签加入已选集合并触发 `change` 事件，`detail.tags` 为归一化后的完整标签数组（不只是新增的那一个）；若已选数量已达上限，必须提示「最多选择 3 个学习主题」且不触发 `change`。
- **REQ-006**: 点击一个已选中的候选标签（再次点击），必须把该标签从已选集合中移除并触发 `change` 事件，等价于取消选择。
- **REQ-007**: 点击已选标签上的移除按钮（`closable` 关闭图标），必须把该标签从已选集合中移除并触发 `change` 事件。
- **REQ-008**: 用户在输入框中输入新主题后点击「添加」按钮或在输入框回车确认：
  - 若输入内容 `trim()` 后为空，必须提示「请输入学习主题」且不触发 `change`；
  - 若 `trim()` 后长度超过 12 字，必须提示「学习主题最多 12 个字符」且不触发 `change`；
  - 若该主题已在已选集合中，必须清空输入框并提示「这个主题已经选择过了」且不触发 `change`；
  - 若已选数量已达 3 个，必须提示「最多选择 3 个学习主题」且不触发 `change`；
  - 否则清空输入框、清除错误提示，把新主题加入已选集合并触发 `change`，`detail.tags` 为归一化后的完整标签数组。
- **REQ-009**: 每次 `change` 事件的 `detail.tags` 必须经过 `normalizeSelectedTags` 处理（组件内部调用 `emitChange`），保证即使调用方传入的历史 `selectedTags` 里混入了脏数据，事件汇报出去的仍是合法值。
- **CON-001**: `tag-picker` Component 只能通过 `properties.selectedTags`/`properties.suggestedTags` 接收数据、通过 `change` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()`，也不能读写全局页面实例或调用 Repository。
- **CON-002**: 不得修改 `record-editor`（`components/record-editor/index.*`）或 `pages/record-edit/index.*` ——`<tag-picker>` 的插槽接线（`selected-tags`/`suggested-tags`/`bind:change`）以及 `collectSuggestedTags` 在页面侧的调用属于 P0/P1-02 已完成的部分，本 Spec 不导入也不依赖 P1-02 的实现细节，只依赖 Starter Kit Contract 已冻结的公开端口。
- **CON-003**: 主题数量与长度限制必须直接引用 `domain/constraints.ts` 导出的 `RECORD_TAG_MAX_COUNT`、`RECORD_TAG_MAX_LENGTH`，不得在 Feature 或 Component 内部重新写死 `3`、`12` 这两个数字作为独立常量。
- **GUD-001**: `collectSuggestedTags` 与 `normalizeSelectedTags` 共享同一条「trim + 长度校验 + 去重」规则；实现时应提取共用的校验逻辑（如内部 `isValidTag` 辅助函数），避免两处校验条件出现细节偏差。
- **GUD-002**: 组件展示候选标签的选中态时用视觉样式区分（如 `theme`/`variant` 切换），不要求维护额外的选中索引状态，直接从 `selectedTags.indexOf(tag) > -1` 派生。
- **PAT-001**: 所有用户可见的校验错误必须显示在 `tag-picker` 组件自身的错误提示区域（复用 Starter 的 `vc-status-note` 错误态），不使用 `wx.showToast` 弹出，不把错误状态提升到 `record-editor` 或页面层。

## 4. Interfaces & Data Contracts

### Feature：`features/tag-picker/index.ts`

```ts
import type { LearningRecord } from '../../domain/learning-record'

export const collectSuggestedTags = (
  records: readonly LearningRecord[],
): string[]

export const normalizeSelectedTags = (
  tags: readonly string[],
): string[]
```

两个函数均为纯函数，签名与 [Starter Kit Contract §7 公开端口表](../../starter-kit-contract.md#7-功能插槽的公开端口)（P1-03 一行）完全一致，是本 Spec 交付的全部对外契约。

### Component：`components/tag-picker/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `selectedTags` | `string[]` | `[]` |
| `suggestedTags` | `string[]` | `[]` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `change` | `{ tags: string[] }`（完整标签数组，已经过 `normalizeSelectedTags` 归一化） | 用户切换候选标签、移除已选标签或确认新建标签，且操作本身没有被字段级校验拦截 |

组件内部状态（不属于公开契约，仅供实现参考）：`inputValue`（输入框当前值）、`errorMessage`（当前错误提示文案）、`suggestionItems`（由 `selectedTags`/`suggestedTags` 派生出的 `{ tag, selected }[]`）、`maxTagCount`/`maxTagLength`（直接取自 `RECORD_TAG_MAX_COUNT`/`RECORD_TAG_MAX_LENGTH`，用于展示 `已选数/上限` 提示和输入框 `maxlength`）。

### 与 P1-02 / `record-editor` 的关系（消费方，不属于本 Spec 实现范围）

Starter 已经把 `<tag-picker>` 接入 `record-editor` 的 WXML：

```html
<tag-picker
  selected-tags="{{draft.tags}}"
  suggested-tags="{{suggestedTags}}"
  bind:change="onTagsChange"
/>
```

`record-editor` 收到 `change` 事件后把 `event.detail.tags` 写回草稿的 `tags` 字段；`suggestedTags` 由 `pages/record-edit/index.ts` 调用 `collectSuggestedTags(records)` 得到并传入。这部分接线、`record-editor` 的其余表单逻辑均属于 P1-02 的范围，P1-03 只需保证自己导出的两个函数和 Component 契约正确，不需要、也不应该修改这些消费方文件。

## 5. Acceptance Criteria

- **AC-001**: Given 两条历史记录，`r1`（`createdAt: 1000`，`tags: ['TypeScript', 'Git']`）与 `r2`（`createdAt: 2000`，`tags: ['TypeScript', '小程序']`）, When 调用 `collectSuggestedTags([r1, r2])`, Then 返回 `['TypeScript', '小程序', 'Git']`（`TypeScript` 因在 `r2` 中最近出现而排在前面，且只出现一次）。
- **AC-002**: Given 三条记录的 `createdAt` 分别为 `1000`、`3000`、`2000`，标签分别为 `['Git']`、`['小程序']`、`['TypeScript']`, When 调用 `collectSuggestedTags`, Then 返回 `['小程序', 'TypeScript', 'Git']`（严格按创建时间降序）。
- **AC-003**: Given 一条记录标签为 `['  Git  ', 'TypeScript']`（含首尾空白）, When 调用 `collectSuggestedTags`, Then 返回 `['Git', 'TypeScript']`（空白已去除）。
- **AC-004**: Given 一条记录标签为 `['   ', 'a'.repeat(13), 'Git']`（空白主题、超长主题、合法主题混在一起）, When 调用 `collectSuggestedTags`, Then 返回 `['Git']`（空白和超长主题被丢弃）。
- **AC-005**: Given 空记录数组, When 调用 `collectSuggestedTags([])`, Then 返回 `[]`。
- **AC-006**: Given 输入 `['  Git  ', ' TypeScript']`, When 调用 `normalizeSelectedTags`, Then 返回 `['Git', 'TypeScript']`。
- **AC-007**: Given 输入 `['Git', '   ', '']`, When 调用 `normalizeSelectedTags`, Then 返回 `['Git']`（空白项被拒绝）。
- **AC-008**: Given 输入 `['Git', 'a'.repeat(13)]`, When 调用 `normalizeSelectedTags`, Then 返回 `['Git']`（超过 12 字的主题被拒绝）。
- **AC-009**: Given 输入恰好 12 字的主题 `'a'.repeat(12)`, When 调用 `normalizeSelectedTags`, Then 该主题被保留（12 字是合法边界，不是超限）。
- **AC-010**: Given 输入 `['Git', 'Git', ' Git ']`（同一主题的重复与空白变体）, When 调用 `normalizeSelectedTags`, Then 返回 `['Git']`（只保留一次）。
- **AC-011**: Given 输入 4 个各不相同的合法主题 `['Git', 'TypeScript', '小程序', 'Agent']`, When 调用 `normalizeSelectedTags`, Then 返回前 3 个 `['Git', 'TypeScript', '小程序']`（超过上限的部分被截断）。
- **AC-012**: Given 空数组, When 调用 `normalizeSelectedTags([])`, Then 返回 `[]`。
- **AC-013**: Given 微信开发者工具编译模式选择「测试场景 · 新建记录」（携带 `history` Fixture）, When 打开记录编辑页, Then 「学习主题」区域显示历史记录中去重后的候选主题标签，且新建记录默认没有已选主题（显示「选择或新建主题」占位文案）。
- **AC-014**: Given 已打开的记录编辑页, When 点击一个候选主题标签, Then 该标签立即出现在已选区域并高亮显示为已选中状态，「已选数/上限」提示（如 `1/3 个主题`）同步更新。
- **AC-015**: Given 已选 3 个主题, When 再次点击一个未选中的候选主题标签, Then 出现错误提示「最多选择 3 个学习主题」，已选集合不变。
- **AC-016**: Given 已选中某个主题, When 再次点击同一个候选标签或点击该已选标签上的关闭图标, Then 该主题从已选区域移除。
- **AC-017**: Given 已打开的记录编辑页, When 在输入框中留空直接点击「添加」, Then 出现错误提示「请输入学习主题」，不产生新的已选标签。
- **AC-018**: Given 已打开的记录编辑页, When 在输入框输入 13 个字符后点击「添加」, Then 出现错误提示「学习主题最多 12 个字符」，不产生新的已选标签。
- **AC-019**: Given 已选中主题「Agent」, When 在输入框中再次输入「Agent」并确认, Then 输入框被清空且提示「这个主题已经选择过了」，已选集合不变（不出现重复）。
- **AC-020**: Given 已打开的记录编辑页, When 在输入框输入一个从未出现过的合法新主题（如「Rust」）并回车确认, Then 输入框清空、该主题出现在已选区域，且后续再次打开候选列表时该新主题不会自动出现在候选区（候选区只来自历史记录，不含本次会话新建但未保存的主题）。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`collectSuggestedTags` 与 `normalizeSelectedTags` 的纯函数逻辑，覆盖 AC-001 至 AC-012。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-013 至 AC-020，使用「测试场景 · 新建记录」编译场景（携带 `history` Fixture），独立于 P1-02 是否已经把表单其余部分做完。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：Vitest 测试使用局部构造的 `LearningRecord` 工厂函数（固定 `date`/`content`/`duration`，只变化 `id`/`createdAt`/`tags`），不依赖 `fixtures/scenarios.ts`；手工验收使用 Starter 提供的 `history` Fixture 场景。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（去重结果、排序、数量上限、字符边界），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯本地计算与小规模列表渲染，无性能测试要求）。

## 7. Rationale & Context

`collectSuggestedTags` 按 `createdAt` 降序而不是按字母顺序或使用频率排序候选主题，是为了让用户"刚用过的主题"优先出现——这更贴近连续学习同一主题的真实使用场景（例如连续几天都在记录「Agent」相关的学习）。

`collectSuggestedTags` 与 `normalizeSelectedTags` 各自独立校验（而不是让前者复用后者的结果）是因为两者的输入语义不同：前者从历史记录里"挖掘"候选值，本身需要防御历史数据里可能存在的脏值；后者从用户当前操作构造出的候选集合里"过滤+归一化"出最终要保存的值。两者共享同一套字符规则（1–12 字），但服务于不同的调用时机。

`change` 事件的 `detail.tags` 始终是归一化后的完整数组而不是"这次新增/移除了哪一个"，是遵循 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口) 已经冻结的 `TagChangeEventDetail = { tags: string[] }` 约定——调用方（`record-editor`）不需要自己维护增量合并逻辑，直接用事件里的数组整体替换草稿的 `tags` 字段即可，减少两侧状态不一致的可能。

数量与长度上限（3 个、12 字）统一从 `domain/constraints.ts` 引入而不是本地写死，是因为同一套规则在 Repository 层的防御性校验（`repositories/record-data.ts`）中也要用到；如果两处各写一套数字，容易在未来调整规则时产生遗漏。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。
- **PLT-003**: TDesign 小程序组件库（`t-tag`、`t-input`、`t-button`）——Component 视觉呈现使用的现成 UI 组件，本 Spec 不自行实现基础控件。

### Infrastructure Dependencies
- **INF-001**: `domain/constraints.ts` 提供的 `RECORD_TAG_MAX_COUNT`、`RECORD_TAG_MAX_LENGTH`——Starter 已提供，本 Spec 直接引用，不重新定义数值。
- **INF-002**: `components/vc-status-note/` 提供的错误态展示组件——Starter 已提供，本 Spec 复用其 `state="error"` 展示校验错误文案。

### Data Dependencies
- **DAT-001**: `domain/learning-record.ts` 的 `LearningRecord` 类型——`collectSuggestedTags` 的输入类型，本 Spec 不修改该类型定义。
- **DAT-002**: `fixtures/scenarios.ts` 提供的 `history` 场景——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 去重 + 按最近使用排序：同一个主题在多条记录中出现，只保留一次，
// 且位置取决于它最近一次出现的记录，而不是它第一次出现的记录
const records = [
  record('r1', /* createdAt */ 1_000, ['TypeScript', 'Git']),
  record('r2', /* createdAt */ 2_000, ['TypeScript', '小程序']),
]

collectSuggestedTags(records)
// => ['TypeScript', '小程序', 'Git']
```

```ts
// 边界情况：历史记录里混入了脏数据（空白、超长），候选列表要把它们过滤掉，
// 而不是原样展示给用户选择
const records = [record('r1', 1_000, ['   ', 'a'.repeat(13), 'Git'])]

collectSuggestedTags(records)
// => ['Git']
```

```ts
// 边界情况：12 字是合法边界，13 字才被拒绝——不能用 >= 而要用 >
normalizeSelectedTags(['a'.repeat(12)])  // => ['a'.repeat(12)]，保留
normalizeSelectedTags(['a'.repeat(13)])  // => []，被拒绝
```

```ts
// 边界情况：数量超过上限时截断而不是报错，保留前 3 个有效标签的原始顺序
normalizeSelectedTags(['Git', 'TypeScript', '小程序', 'Agent'])
// => ['Git', 'TypeScript', '小程序']（'Agent' 被截断）
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增的 Vitest 用例覆盖 AC-001 至 AC-012。
- 在微信开发者工具中使用「测试场景 · 新建记录」编译场景验证 AC-013 至 AC-020。
- Code Review 确认：未修改 `components/record-editor/`、`pages/record-edit/` 目录下任何文件（CON-002）；`tag-picker` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-001）；`RECORD_TAG_MAX_COUNT`/`RECORD_TAG_MAX_LENGTH` 均来自 `domain/constraints.ts` 导入而非本地字面量（CON-003）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.2 — 记录编辑页的产品行为定义（含主题选择的位置与交互规则）
- [UI 设计](../../ui-foundation-design.md) — 记录编辑页视觉规范（含「学习主题」区域的线框示意）
- [P1-01 Spec](./p1-01-today-summary.md) — 同一目录下另一份已生成的正式 Spec，可作为格式参考
- P1-02 新建一条学习记录 — 记录编辑表单的主要实现方，通过 Starter 已接好的 `<tag-picker>` 插槽消费本 Spec 的输出，本 Spec 不依赖也不描述其实现细节
