---
title: P1-02 新建一条学习记录
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, record-edit, form]
---

# Introduction

本 Spec 交付记录编辑页的新建流程：用户填写学习内容、学习时长和可选的今日收获，在提交前看到贴合字段的校验反馈，在离开有未保存修改的表单时收到确认提示，并在保存成功后回到来源页。这是记录编辑页（`pages/record-edit/index`）在 Phase 1 承担的核心用户旅程——该页面同时承担新建和编辑，但编辑与删除属于 Phase 2 的 P2-02。

## 1. Purpose & Scope

**目的**：让用户能够为当天新建一条完整、合法的学习记录，在输入不合法时得到清晰的、逐字段的错误提示而不是笼统报错，在保存中避免重复提交，在有未保存修改时离开页面前得到确认，保存失败时不丢失已经填写的内容。

**范围**：
- `miniprogram/features/record-create/index.ts` — 纯函数 `createInitialDraft`、`validateRecordDraft`
- `miniprogram/components/record-editor/index.*` — 承载表单交互的 Component（受控草稿状态、逐字段错误展示、`dirty-change`/`submit` 事件、提交防重）
- `miniprogram/pages/record-edit/index.ts` — 仅涉及新建模式（`mode=create`）的编排：读取默认偏好生成初始草稿、调用 `recordRepository.create`、保存中的页面级防重、根据 `dirty-change` 开关"未保存返回提醒"
- 对应 Vitest 测试 `tests/features/record-create.test.ts`

**不在范围内**：
- `<tag-picker>` 组件内部实现（选择、新建、移除主题）——属于 P1-03，本 Spec 只保留 Starter 已经接好的 `selected-tags`/`suggested-tags` properties 和 `change` 事件插槽，视其为外部依赖。
- 编辑模式（`mode=edit`）下的字段回填差异判断、`delete-record` 二次确认删除、`record-editor` WXML 末尾的删除危险区——属于 Phase 2 的 P2-02（见 [P2-02 Spec](../phase-2/p2-02-record-edit-delete.md)）。P1-02 完成时，`pages/record-edit/index.ts` 已经包含 P0 预先搭好的 `mode=edit` 解析和 `deleteRecord` 骨架，但没有任何真实入口能触发它们，也不是本 Spec 的验收对象。
- 学习记录详情页、学习日志时间线——分别属于 P1-04、P1-05。

**读者假设**：实现者已经 clone `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中通过「测试场景 · 新建记录」编译场景直接打开处于 `mode=create` 的记录编辑页。实现者不需要修改 `domain/constraints.ts`、`repositories/`、`shared/navigation/routes.ts`。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `RecordDraft` | 等同于 `RecordInput`，表单编辑过程中的可变草稿：`{ content, duration, tags, takeaway }` |
| `RecordDraftErrors` | `Partial<Record<keyof RecordDraft, string>>`，逐字段的中文错误文案，只有校验失败的字段才有 key |
| `RecordDraftValidation` | `{ isValid, value, errors }`，`validateRecordDraft` 的返回值；`value` 是清理（trim/归一化）后的草稿 |
| `dirty` | 当前草稿相对 `initialDraft` 是否发生了实质变化；由 Component 内部比较得出，通过 `dirty-change` 事件通知 Page |
| `attemptedSubmit` | Component 内部状态：用户是否已经点击过一次"保存记录"；决定错误文案何时开始展示 |
| `LearningPreference` | `{ defaultDuration: number }`，用于给新建草稿提供默认学习时长，定义见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `createInitialDraft(preference)` 必须返回 `{ content: '', duration: preference.defaultDuration, tags: [], takeaway: '' }`，不得对 `defaultDuration` 做二次校验或裁剪。
- **REQ-002**: `validateRecordDraft(draft)` 必须对 `content` 做 `trim()` 后校验长度落在 1–300（`RECORD_CONTENT_MAX_LENGTH`）之间；空字符串或全空白字符串必须判定为无效，错误文案为「请填写学习内容」，超长错误文案为「学习内容最多 300 字」。
- **REQ-003**: `validateRecordDraft(draft)` 必须校验 `duration` 是有限数字，且落在 `RECORD_DURATION_MIN`（5）到 `RECORD_DURATION_MAX`（600）之间，并且是 `RECORD_DURATION_STEP`（5）的整数倍；不满足任一条件都判定为无效并返回同一条中文错误文案。
- **REQ-004**: `validateRecordDraft(draft)` 必须对 `takeaway` 做 `trim()` 后校验：超过 `RECORD_TAKEAWAY_MAX_LENGTH`（140）判定为无效；trim 后为空字符串时不计入错误（收获选填），且返回的 `value.takeaway` 必须是 `undefined`（不持久化空字符串）。
- **REQ-005**: `validateRecordDraft(draft)` 必须一次性收集全部字段的错误（`content`/`duration`/`takeaway`），不能在遇到第一个错误后就短路返回，`isValid` 等于 `Object.keys(errors).length === 0`。
- **REQ-006**: `validateRecordDraft(draft)` 必须原样透传 `tags`（数组浅拷贝或原数组），不在本 Feature 内做标签去重、长度或数量校验——那是 P1-03 `tag-picker` Feature 的职责。
- **REQ-007**: `record-editor` Component 在 `initialDraft` property 变化时（`observers.initialDraft`）必须用其克隆值重置内部 `draft`、清空 `errors` 与 `attemptedSubmit`，并重新计算 `dirty`（此时应为 `false`）。
- **REQ-008**: 用户编辑任意字段（内容、时长、收获、标签）时，Component 必须调用 `validateRecordDraft` 得到最新校验结果；只有在 `attemptedSubmit === true` 时才把 `errors` 写入 `data.errors` 并在 WXML 中显示，第一次进入表单或从未点击过保存时不提前显示错误。
- **REQ-009**: 每次草稿变化后，Component 必须重新计算 `dirty`（当前草稿与 `initialDraft` 是否不同：内容、时长、收获经 `??  ''` 归一化后比较、标签逐项比较）；只有当 `dirty` 的值真正发生翻转时才 `triggerEvent('dirty-change', { dirty })`，避免重复触发同值事件。
- **REQ-010**: 点击"保存记录"（`onSubmit`）时，如果本地 `submitting` 为 `true` 或外部 `saving` property 为 `true`，必须直接返回，不重复触发 `submit` 事件（提交防重）。
- **REQ-011**: `onSubmit` 必须先调用 `validateRecordDraft(this.data.draft)`；校验失败时把 `attemptedSubmit` 置为 `true` 并写入 `errors`，不触发 `submit` 事件；校验成功时把本地 `submitting` 置为 `true`，清空 `errors`，并 `triggerEvent('submit', { draft: validation.value })` 发出清理后的草稿（而不是原始未清理草稿）。
- **REQ-012**: Component 必须监听 `saving` property 的变化（`observers.saving`）；当 `saving` 从 `true` 变回 `false`（保存结束，无论成功失败）时，必须把本地 `submitting` 重置为 `false`，否则保存失败后用户将无法再次点击保存。
- **REQ-013**: `pages/record-edit/index.ts` 在 `mode === 'create'` 时，必须在 `onLoad` 完成 Fixture 就绪检查后调用 `preferenceRepository.get()` 取得偏好，再用 `createInitialDraft(preference)` 生成 `initialDraft` 传给 `record-editor`。
- **REQ-014**: `pages/record-edit/index.ts` 的 `submitRecord(event)` 必须在页面级再次检查 `this.data.saving`，为真时直接返回（防止事件重复触发导致的双重提交，作为 Component 内 REQ-010 之外的纵深防御）；随后再次调用 `validateRecordDraft(event.detail.draft)` 兜底校验，仅在 `isValid` 时调用 `recordRepository.create(validation.value)`。
- **REQ-015**: 新建保存成功后，页面必须 `wx.disableAlertBeforeUnload()` 并 `wx.navigateBack()`；若 `navigateBack` 因没有上一页而失败（例如从分享或场景直接进入），必须回退为 `wx.switchTab({ url: getMainTabRoute(this.data.source) })`，`source` 取自入口 `from` 参数（`today`/`log`/`stats`，默认 `today`）。
- **REQ-016**: 保存失败（`recordRepository.create` reject）时，页面必须把 `saving` 置回 `false`、设置 `saveError` 为「保存失败，已填写的内容仍然保留。」，并且不清空 `record-editor` 内部已经填写的草稿——用户可以直接重试。
- **REQ-017**: 页面必须监听 Component 发出的 `dirty-change` 事件：`dirty: true` 时调用 `wx.enableAlertBeforeUnload({ message: '还有未保存的修改，确定要离开吗？' })`；`dirty: false` 时调用 `wx.disableAlertBeforeUnload()`。
- **CON-001**: 不得实现或修改 `tag-picker` 的内部选择/新建/移除逻辑——那是 P1-03 的范围；`record-editor` 只透传 `selected-tags`/`suggested-tags` properties 和处理 `tag-picker` 发出的 `change` 事件（`onTagsChange`）。
- **CON-002**: 不得实现编辑模式下的字段回填差异判断（`hasRecordDraftChanged`）、`delete-record` 二次确认删除流程，或在 WXML 中激活删除危险区——这些是 P2-02 的范围；本 Spec 完成后 `mode=edit` 分支和 `deleteRecord` 页面方法保持 P0 提供的骨架状态，不接受任何真实触发路径的验收。
- **CON-003**: Component 只能通过 `properties`（`mode`/`initialDraft`/`suggestedTags`/`saving`/`saveError`）接收数据、通过 `submit`/`dirty-change` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或 `recordRepository`。
- **CON-004**: 新建记录不支持补记过去日期；`dateLabel` 恒为当天日期，且不是可交互控件（只读文案）。
- **CON-005**: 保存记录的实际写入必须唯一经过 `recordRepository.create(input)`；Component 和 Feature 都不得自行拼接 `id`/`date`/`createdAt`/`updatedAt`。
- **GUD-001**: 错误文案统一使用中文全称句式（如「学习内容最多 300 字」），不使用英文错误码或占位符拼接不完整的句子。
- **GUD-002**: 校验规则的数值常量（300/5/600/5/140）全部从 `domain/constraints.ts` 导入，不在 Feature 或 Component 内重复硬编码。
- **PAT-001**: 表单遵循"先允许自由输入，只在用户尝试提交后才显示校验错误"的交互模式（`attemptedSubmit` 门控），避免用户刚打开空表单就看到一片红色错误。
- **PAT-002**: 提交防重使用"本地 `submitting` 标志 + 外部 `saving` property"双重信号，因为 `submit` 事件到 Page 完成 Repository 写入之间存在网络/IO 延迟，仅靠本地标志不足以覆盖 Page 侧的异步窗口。

## 4. Interfaces & Data Contracts

### Feature：`features/record-create/index.ts`

```ts
import type { LearningPreference } from '../../domain/learning-preference'
import type { RecordInput } from '../../domain/learning-record'

export type RecordDraft = RecordInput

export type RecordDraftErrors = Partial<Record<keyof RecordDraft, string>>

export type RecordDraftValidation = {
  isValid: boolean
  value: RecordInput
  errors: RecordDraftErrors
}

export const createInitialDraft = (preference: LearningPreference): RecordDraft

export const validateRecordDraft = (draft: RecordDraft): RecordDraftValidation
```

行为细节：
- `content`：`trim()` 后长度必须在 `[1, 300]`；`value.content` 是清理后的值（保留正文内部换行，只去除首尾空白）。
- `duration`：必须是有限数字、`5 <= duration <= 600`、且 `duration % 5 === 0`；`value.duration` 原样透传（不做四舍五入或裁剪）。
- `takeaway`：`trim()` 后长度必须 `<= 140`；trim 后非空时 `value.takeaway` 为清理后的字符串，trim 后为空时 `value.takeaway` 为 `undefined`（不会以空字符串形式出现在返回值里）。
- `tags`：不校验，原样返回（数组或空数组）。
- `errors` 对象只包含真正失败的字段，`isValid` 为 `false` 时 `value` 依然是尽力清理后的草稿（供表单继续编辑，不代表可以提交）。

### Component：`components/record-editor/`

| Property | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mode` | `'create' \| 'edit'` | `'create'` | P1-02 只交付 `'create'` 分支的行为 |
| `initialDraft` | `RecordDraft` | `{ content: '', duration: 30, tags: [], takeaway: '' }` | 变化时触发 `resetDraft`，重新计算 `dirty` |
| `suggestedTags` | `string[]` | `[]` | 透传给 `<tag-picker>`，不在本 Component 内处理 |
| `saving` | `boolean` | `false` | Page 层保存状态；驱动按钮 `loading`/`disabled` 与本地 `submitting` 复位 |
| `saveError` | `string` | `''` | 非空时通过 `<vc-status-note state="error">` 展示 |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `submit` | `{ draft: RecordInput }` | 校验通过后点击"保存记录"；`draft` 是清理后的值，不是原始未清理输入 |
| `dirty-change` | `{ dirty: boolean }` | 草稿相对 `initialDraft` 的"是否已修改"状态发生翻转时 |

内部 `data`（组件私有，不对外承诺稳定性）：`draft`、`errors`、`attemptedSubmit`、`submitting`、`dirty`，以及从 `domain/constraints.ts` 透传给 WXML 的 `contentMaxLength`/`durationMin`/`durationMax`/`durationStep`/`takeawayMaxLength`。

### Page 编排：`pages/record-edit/index.ts`（仅 `mode=create` 分支）

```ts
// onLoad: 解析 mode/id/from/returnTo → 等待 isFixtureReady() → loadInitialDraft()
// loadInitialDraft（create 分支）：
const suggestedTags = collectSuggestedTags(await recordRepository.list())
const preference = await preferenceRepository.get()
this.setData({ suggestedTags, initialDraft: createInitialDraft(preference) })

// submitRecord(event: { draft: RecordInput }):
if (this.data.saving) return
const validation = validateRecordDraft(event.detail.draft)
if (!validation.isValid) { this.setData({ saveError: '请检查学习内容和时长后再保存。' }); return }
this.setData({ saving: true, saveError: '' })
try {
  await recordRepository.create(validation.value)
  wx.disableAlertBeforeUnload()
  wx.navigateBack({ fail: () => wx.switchTab({ url: getMainTabRoute(this.data.source) }) })
} catch {
  this.setData({ saving: false, saveError: '保存失败，已填写的内容仍然保留。' })
}

// onDirtyChange(event: { dirty: boolean }):
event.detail.dirty
  ? wx.enableAlertBeforeUnload({ message: '还有未保存的修改，确定要离开吗？' })
  : wx.disableAlertBeforeUnload()
```

页面通过 `?mode=create&from=today|log|stats` 进入（路由由 `shared/navigation/routes.ts` 的 `buildCreateRecordRoute(from)` 生成，P1-02 不新增或修改该函数）。`dateLabel` 恒为 `` `今天 · ${年} 年 ${月} 月 ${日} 日` ``，来自 `SystemClock.now()`。

## 5. Acceptance Criteria

- **AC-001**: Given 偏好 `{ defaultDuration: 45 }`, When 调用 `createInitialDraft(preference)`, Then 返回 `{ content: '', duration: 45, tags: [], takeaway: '' }`。
- **AC-002**: Given 一个内容、时长、标签、收获均合法的草稿, When 调用 `validateRecordDraft(draft)`, Then `isValid` 为 `true`，`errors` 为空对象，`value` 等于原草稿。
- **AC-003**: Given `content` 为 `'  写学习笔记  '`（首尾有空白）, When 校验, Then `isValid` 为 `true` 且 `value.content` 为 `'写学习笔记'`（已 trim）。
- **AC-004**: Given `content` 为空字符串或全空白字符串, When 校验, Then `isValid` 为 `false` 且 `errors.content` 非空。
- **AC-005**: Given `content` 为 301 个字符, When 校验, Then `isValid` 为 `false` 且 `errors.content` 非空；`content` 恰为 1 或 300 个字符时 `isValid` 为 `true`。
- **AC-006**: Given `duration` 为 0、605 或 32（非 5 的倍数）, When 校验, Then `isValid` 为 `false` 且 `errors.duration` 非空；`duration` 恰为 5 或 600 时 `isValid` 为 `true`。
- **AC-007**: Given `takeaway` 为 `'  ' + 'a'.repeat(141) + '  '`, When 校验, Then `isValid` 为 `false` 且 `errors.takeaway` 非空；`takeaway` 恰为 140 个字符时 `isValid` 为 `true` 且 `value.takeaway` 为清理后的 140 字字符串。
- **AC-008**: Given `takeaway` 为空字符串或全空白字符串, When 校验, Then `isValid` 为 `true` 且 `value.takeaway` 为 `undefined`（不持久化空收获）。
- **AC-009**: Given 内容为空、时长为 7（非法步长）、收获为 141 字, When 一次性校验, Then `errors.content`、`errors.duration`、`errors.takeaway` 同时非空（不短路，一次性报告所有错误）。
- **AC-010**: Given `tags` 为 `['Agent']`, When 校验, Then `value.tags` 原样为 `['Agent']`（本 Feature 不做标签规则校验）。
- **AC-011**: Given 微信开发者工具选择编译场景「测试场景 · 新建记录」（`mode=create`，`history` Fixture）, When 打开记录编辑页, Then 标题为「记录学习」，日期提示为「今天 · <当前日期>」且不可点击，学习时长初始值为 Fixture 偏好的默认时长。
- **AC-012**: Given 处于新建页, When 不填写学习内容直接点击"保存记录", Then 页面不发起任何 Repository 调用，"学习内容"字段下方出现「请填写学习内容」提示，时长和收获字段此时若也不合法会同时显示各自错误。
- **AC-013**: Given 处于新建页且尚未点击过"保存记录", When 用户在学习内容中输入非法值（如超长文本）, Then 错误提示不立即出现；直到用户点击一次"保存记录"失败后，错误提示才开始随输入实时更新。
- **AC-014**: Given 已经填写合法的学习内容、时长和收获, When 点击"保存记录", Then 按钮进入"保存中"禁用态，短暂之后返回来源页（Today 或学习日志），重新进入学习日志或 Today 后能看到新记录。
- **AC-015**: Given 保存请求正在进行中（按钮已显示"保存中"）, When 用户快速再次点击保存按钮, Then 不会触发第二次 `submit` 事件或第二次 `recordRepository.create` 调用（无重复记录）。
- **AC-016**: Given 已经修改过学习内容（草稿与初始草稿不同）, When 用户点击返回（导航手势或返回按钮）, Then 弹出"还有未保存的修改，确定要离开吗？"确认提示；确认离开后不保存任何数据。
- **AC-017**: Given 表单内容与初始草稿完全一致（未做任何修改）, When 用户点击返回, Then 不弹出未保存提醒，直接离开。
- **AC-018**: Given 收获字段留空未填写, When 保存成功, Then 新记录在详情/日志中不显示"今日收获"区块（因为 `takeaway` 未被持久化为空字符串）。
- **AC-019**: Given 保存请求失败（例如手动制造 Repository reject）, When 保存, Then 页面显示「保存失败，已填写的内容仍然保留。」，表单内已填写的学习内容、时长、标签和收获全部保留，用户可以直接重试而不必重新输入。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`createInitialDraft`、`validateRecordDraft` 的纯函数校验/清理逻辑，覆盖 AC-001 至 AC-010（对应 `tests/features/record-create.test.ts`，共 19 个 `it` 用例）。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-011 至 AC-019，使用「测试场景 · 新建记录」编译场景（`mode=create`，`history` Fixture），或从 Today / 学习日志页面点击主行动进入。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：Feature 测试使用手写的固定 `RecordDraft` 字面量（无需 `Clock` 或 Fixture）；手工验收复用 Starter 提供的 `history` Fixture 场景与其默认偏好，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，测试断言业务规则本身（校验结果、清理后的值、事件是否触发），不断言 WXML 文本、颜色或 TDesign 组件内部渲染细节。
- **Performance Testing**：不适用（本 Spec 是表单校验与本地状态编排，无性能测试要求）。

## 7. Rationale & Context

`validateRecordDraft` 被设计为一次性收集所有字段错误而不是校验完第一个字段就返回（REQ-005/AC-009），是因为用户体验上应该一次性看到全部需要修改的地方，而不是"修完一个错误又跳出下一个"的挫败循环。

`attemptedSubmit` 门控（PAT-001）把"实时校验"和"何时展示错误"拆成两个独立关注点：草稿始终被实时校验（因为 `dirty` 判断、`onSubmit` 都需要最新校验结果），但错误 UI 只在用户主动尝试提交后才出现，避免刚打开的空白表单就布满红色提示。

提交防重同时依赖 Component 内部 `submitting` 标志和 Page 传入的 `saving` property（REQ-010/PAT-002），是因为 `submit` 事件触发到 `recordRepository.create` resolve 之间存在真实的网络延迟；只在 Component 内部拦是不够的——Page 需要把"正在写入 Repository"这个更长的窗口也反映回 Component，否则用户在 Repository 请求进行中仍可能借助其他触发路径重复提交。Page 侧 `submitRecord` 里再检查一次 `this.data.saving`（REQ-014）是这套防重设计里的第二道防线。

未保存返回提醒完全由 `dirty-change` 事件驱动而不是 Page 自行比较草稿（REQ-017），是因为"当前草稿是否偏离初始值"是表单内部状态，理应由拥有该状态的 Component 计算并上报，Page 只负责根据上报结果开关系统级的 `enableAlertBeforeUnload`。

空收获不持久化为空字符串（REQ-004/AC-008/AC-018）呼应产品设计"未填写今日收获时不显示该区块"的详情页规则（[产品设计 §7.2](../../product-design.md)）：如果保存时把空字符串当作合法值写入，详情页就需要额外判断"空字符串"和"未提供"两种等价情况，本 Spec 选择在源头把它们归一。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page，包括 `t-textarea`、`t-stepper`、`t-input`、`t-button`（TDesign MiniProgram）。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `domain/constraints.ts` 导出的 `RECORD_CONTENT_MAX_LENGTH`/`RECORD_DURATION_MIN`/`RECORD_DURATION_MAX`/`RECORD_DURATION_STEP`/`RECORD_TAKEAWAY_MAX_LENGTH`——Starter 已提供，本 Spec 直接复用，不重新定义数值。
- **INF-002**: `repositories/record.ts` 的 `recordRepository.create(input)` 与 `repositories/preference.ts` 的 `preferenceRepository.get()`——数据读写的唯一入口，本 Spec 不直接访问 Storage 或 CloudBase。
- **INF-003**: `shared/navigation/routes.ts` 的 `buildCreateRecordRoute(from)`/`getMainTabRoute(tab)`——导航路由的唯一生成方式，本 Spec 不手工拼接 URL。
- **INF-004**: `fixtures/ready.ts` 的 `isFixtureReady()`——Page 在读取 Repository 前的等待入口，Starter 已提供。
- **INF-005**: `components/vc-status-note/` — Starter 提供的通用错误提示 Component，用于展示 `saveError`。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 的 `history` 场景与「测试场景 · 新建记录」编译配置——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

### External Feature Dependencies（跨 Spec，只读接入）
- **EXT-001**: P1-03 `tag-picker` — 通过 `selected-tags`/`suggested-tags` properties 和 `change` 事件与本 Spec 交互；本 Spec 不实现其内部逻辑，只保留 Starter 已接好的插槽。
- **EXT-002**: P2-02 `record-edit-delete` — Phase 2 复用本 Spec 的 `validateRecordDraft` 与 `record-editor` 表单骨架扩展出编辑与删除；本 Spec 完成时不需要为此做任何前瞻性改动。

## 9. Examples & Edge Cases

```ts
// 一次性报告多个字段错误，不短路
const result = validateRecordDraft({
  content: '',
  duration: 7,
  tags: [],
  takeaway: 'a'.repeat(141),
})
// => result.isValid === false
// => result.errors.content, result.errors.duration, result.errors.takeaway 均已定义
```

```ts
// 空收获不会被持久化为空字符串
validateRecordDraft({ content: '复习', duration: 30, tags: [], takeaway: '   ' }).value
// => { content: '复习', duration: 30, tags: [] }  （没有 takeaway 字段，而不是 takeaway: ''）
```

```ts
// 边界值：内容 1/300 字符、时长 5/600 分钟均视为合法
validateRecordDraft({ content: 'a', duration: 5, tags: [], takeaway: '' }).isValid        // true
validateRecordDraft({ content: 'a'.repeat(300), duration: 600, tags: [], takeaway: '' }).isValid // true
```

```ts
// 边界情况：时长在范围内但不是 5 的倍数——即便只偏离 2 分钟也判定无效
validateRecordDraft({ content: '复习', duration: 32, tags: [], takeaway: '' }).isValid // false
```

未在 Vitest 里覆盖、只能在开发者工具中验证的边界情况：
- 保存请求进行中，用户在按钮之外的路径（例如下拉刷新或再次触发 `submit` 事件）尝试重复提交——由 Page 侧 `if (this.data.saving) return` 兜底。
- `navigateBack` 因为没有上一页栈而失败（例如从场景值直接启动到新建页），此时必须回退为 `wx.switchTab` 而不是抛出未处理异常或停留在当前页却已丢失表单可见反馈。

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且 `tests/features/record-create.test.ts` 覆盖 AC-001 至 AC-010。
- 在微信开发者工具中使用「测试场景 · 新建记录」验证 AC-011 至 AC-019；分别验证成功保存、字段错误、未保存返回提醒、重复点击保存、保存失败后内容保留五条路径。
- Code Review 确认：未修改 `tag-picker` 内部逻辑（CON-001）；未在 `record-editor` WXML 中激活删除危险区或实现 `hasRecordDraftChanged`（CON-002）；`record-editor` 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`/`recordRepository`（CON-003）；`dateLabel` 不是可交互控件（CON-004）；写入全部经过 `recordRepository.create`（CON-005）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约，§7 公开端口表定义了本 Spec 的 Feature 入口、Component properties/events
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §4.1、§7.2 — 学习记录字段规则与记录编辑页的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — 记录编辑页视觉规范（表单布局、按钮固定位置、删除危险区留白）
- P1-03 学习主题选择与新建标签 — 本 Spec 保留的 `<tag-picker>` 插槽的实现方，与本 Spec 互不导入
- P2-02 编辑与删除单条记录 — 同一页面的 Phase 2 延伸功能，在本 Spec 的表单骨架上增加编辑回填、`hasRecordDraftChanged` 和删除
