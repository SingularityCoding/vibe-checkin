---
title: P2-02 编辑与删除单条记录
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, record-edit-delete]
---

# Introduction

本 Spec 在 P1-02 已经交付的新建表单（`record-editor`）之上，补齐"编辑一条已有的学习记录"和"删除这条记录"两个用户旅程。用户从学习记录详情页点击"编辑"进入同一个记录编辑页，此时表单预填该记录的原始内容、时长、标签和收获，学习日期保持只读并显示记录自身的日期而不是今天；未保存离开时复用 P1-02 已经打通的脏值提醒；页面新增一个危险区，删除前必须经过组件内部的二次确认，删除成功后不能停留在已经失效的详情页，而要通过 `returnTo` 参数用 `wx.switchTab` 回到用户原本所在的 Tab（Today 或学习日志）。

## 1. Purpose & Scope

**目的**：让用户可以修正或删除一条已经保存的学习记录，同时保证编辑与删除都不能绕过表单校验、二次确认和失败回退这三条安全线——保存失败不能丢内容，删除失败不能产生假成功，删除成功也不能让用户停在一个已经不存在的详情页上。

**范围**：
- `miniprogram/features/record-edit-delete/index.ts` — 纯函数 `hasRecordDraftChanged`
- `miniprogram/components/record-editor/index.*` — 在 P1-02 已交付的表单骨架上，新增 `mode === 'edit'` 时才渲染的危险区（删除按钮 + 二次确认），并把组件内部原本私有的 `draftsEqual` 替换为对 `hasRecordDraftChanged` 的调用，让创建模式和编辑模式共用同一套脏值判断
- `miniprogram/pages/record-edit/index.ts` — 编辑模式下的初始草稿加载（使用记录自身的 `date` 生成只读日期文案）、`update`/`remove` 调用、删除操作的 `saving`/`mode` 二次点击防护
- `tests/features/record-edit-delete.test.ts`

**不在范围内**：新建记录本身的表单渲染和字段校验（P1-02，本 Spec 直接复用其导出的 `validateRecordDraft`）；学习主题选择组件的内部交互（P1-03，本 Spec 直接复用 `<tag-picker>`）；详情页本身的展示与"编辑"入口按钮（P1-04 已经提供，本 Spec 不修改详情页 Component，也**不在详情页新增直接删除按钮**——删除入口只能存在于编辑页的危险区）。

**读者假设**：实现者已经在 `phase-1-complete` 基线上开始，`record-editor` 的创建模式表单、校验和脏值提醒（`dirty-change`）已经可用，详情页的"编辑"按钮已经能够导航到 `mode=edit` 的记录编辑页。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `RecordDraft` | 等价于 `RecordInput`（`content`/`duration`/`tags`/`takeaway`），表单中可编辑字段的草稿类型，定义在 `features/record-create/index.ts` |
| `initialDraft` | 编辑页打开时加载的草稿基准值；编辑模式下来自被编辑记录的可编辑字段快照 |
| `currentDraft` | 用户当前正在编辑的草稿值 |
| `dirty` | `hasRecordDraftChanged(initialDraft, currentDraft)` 的结果，驱动未保存离开提醒 |
| `mode` | `'create' \| 'edit'`，由 P0 路由解析并传给 `record-editor`；本 Spec 只在 `mode === 'edit'` 时启用删除相关行为 |
| `returnTo` | `'today' \| 'log'`，来自路由参数 `returnTo`，删除成功后 `wx.switchTab` 的目标 Tab |
| 二次确认 | `record-editor` 内部通过 `wx.showModal` 完成的确认交互；只有用户在弹窗中确认后组件才会发出 `delete-record` 事件 |
| 危险区 (danger zone) | 编辑模式下渲染在保存按钮下方的删除区块，包含提示文案和删除按钮 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `hasRecordDraftChanged(initialDraft, currentDraft)` 必须依次比较 `content`、`duration`、`takeaway`（空字符串与 `undefined` 视为相等）、`tags`（长度不同即视为变化，长度相同则按下标逐一比较，顺序不同也视为变化），任一不同立即返回 `true`；全部相同返回 `false`。
- **REQ-002**: `record-editor` 必须用 `hasRecordDraftChanged(this.properties.initialDraft, draft)` 驱动 `updateDirty`，不得保留组件内部单独实现的等值比较函数；创建模式和编辑模式必须共用同一套判断逻辑。
- **REQ-003**: `record-editor` 只在 `properties.mode === 'edit'` 时渲染危险区（提示文案「删除后这条学习记录将无法恢复。」+ 「删除这条记录」按钮）；`mode === 'create'` 时危险区不出现在 WXML 中。
- **REQ-004**: 点击删除按钮（`onDeleteTap`）必须先判断 `mode !== 'edit' || submitting || saving` 为真时直接返回、不弹窗、不发事件；否则调用 `wx.showModal` 弹出二次确认（标题「删除这条学习记录？」，内容「删除后将无法恢复，请确认是否继续。」），只有 `result.confirm` 为真时才 `triggerEvent('delete-record')`。
- **REQ-005**: `pages/record-edit/index.ts` 在 `mode === 'edit'` 时通过 `recordRepository.get(id)` 加载记录，把 `dateLabel` 设为该记录自身 `date` 格式化后的文案（不是 `clock.today()`），并把 `initialDraft` 设为该记录的 `{ content, duration, tags: [...record.tags], takeaway: record.takeaway ?? '' }`。
- **REQ-006**: 若编辑模式下按 `id` 找不到记录（`record` 为 `null`），页面必须设置 `saveError: '这条学习记录已不存在或已被删除。'`，不得展示假的空白表单让用户继续编辑一个不存在的记录。
- **REQ-007**: `submitRecord` 在 `mode === 'edit'` 时必须调用 `recordRepository.update(this.data.id, validation.value)`；保存成功后 `wx.disableAlertBeforeUnload()` 并 `wx.navigateBack`（失败时回退到 `wx.switchTab(getMainTabRoute(source))`）。
- **REQ-008**: `deleteRecord()` 必须先检查 `mode !== 'edit' || !id || saving` 为真时直接返回（防止创建模式误触发、防止重复点击造成二次删除）；否则设置 `saving: true, saveError: ''`，调用 `recordRepository.remove(id)`；成功后 `wx.disableAlertBeforeUnload()` 并 `wx.switchTab({ url: getMainTabRoute(returnTo) })`；失败后设置 `saving: false, saveError: '删除失败，原记录没有改变。'`。
- **REQ-009**: 删除成功后的导航必须使用 `wx.switchTab` 前往 `returnTo` 指定的 Tab，不得 `navigateBack` 回到已经指向被删除记录的详情页。
- **CON-001**: 不得在学习详情页（`pages/record-detail/`、`components/record-detail/`）新增任何直接删除按钮或删除相关事件；删除只能通过编辑页的危险区完成。
- **CON-002**: 不得重新实现或复制字段校验规则；必须复用 `features/record-create/index.ts` 导出的 `validateRecordDraft`。
- **CON-003**: 不得修改 `components/tag-picker/` 或 `features/tag-picker/index.ts`（P1-03 独占目录），编辑模式的标签编辑完全通过既有的 `<tag-picker>` 插槽完成。
- **CON-004**: `delete-record` 事件只能在组件完成二次确认后发出；Page 收到事件后只负责调用 Repository 并反馈结果，不得在 Page 侧再加一层确认弹窗（Starter Kit Contract §7）。
- **GUD-001**: 复用 P0/P1-02 已经打通的 `dirty-change` → `wx.enableAlertBeforeUnload`/`wx.disableAlertBeforeUnload` 通路；编辑模式不需要新增单独的未保存提醒逻辑。
- **PAT-001**: 遵循 Starter Kit Contract §5.2 的 Repository 语义：`update` 只更新可编辑字段和 `updatedAt`，必须保留原有 `id`、`date`、`createdAt`；`remove` 只有在操作真正完成后才 resolve，失败必须 reject 而不是产生静默成功。

## 4. Interfaces & Data Contracts

### Feature：`features/record-edit-delete/index.ts`

```ts
import type { RecordDraft } from '../record-create/index'

export const hasRecordDraftChanged = (
  initialDraft: RecordDraft,
  currentDraft: RecordDraft,
): boolean
```

这是 Starter Kit Contract §7 为 P2-02 固定的公开端口，`record-editor` 用它同时驱动创建模式和编辑模式的 `dirty-change` 事件，替换掉组件内部原有的私有 `draftsEqual` 实现。

### Component：`components/record-editor/`（在 P1-02 基础上的编辑/删除扩展）

沿用 P1-02 已固定的 properties（`mode`、`initialDraft`、`suggestedTags`、`saving`、`saveError`），本 Spec 不新增 property，只新增一个 event：

| Event | detail | 触发时机 |
| --- | --- | --- |
| `delete-record` | 无 | `mode === 'edit'` 且用户在二次确认弹窗中点击「删除」之后 |

```ts
onDeleteTap() {
  if (this.properties.mode !== 'edit' || this.data.submitting || this.properties.saving) {
    return
  }

  wx.showModal({
    title: '删除这条学习记录？',
    content: '删除后将无法恢复，请确认是否继续。',
    confirmText: '删除',
    confirmColor: '#E34D59',
    cancelText: '取消',
    success: (result) => {
      if (result.confirm) {
        this.triggerEvent('delete-record')
      }
    },
  })
}
```

### Page 编排：`pages/record-edit/index.ts`

```ts
async loadInitialDraft() {
  const records = await recordRepository.list()
  const suggestedTags = collectSuggestedTags(records)

  if (this.data.mode === 'edit') {
    const record = this.data.id ? await recordRepository.get(this.data.id) : null

    if (!record) {
      this.setData({ suggestedTags, saveError: '这条学习记录已不存在或已被删除。' })
      return
    }

    this.setData({
      suggestedTags,
      dateLabel: formatDateLabel(parseLocalDate(record.date)), // 记录自身日期，只读
      initialDraft: {
        content: record.content,
        duration: record.duration,
        tags: [...record.tags],
        takeaway: record.takeaway ?? '',
      },
    })
    return
  }
  // ...create 分支属于 P1-02
},

async deleteRecord() {
  if (this.data.mode !== 'edit' || !this.data.id || this.data.saving) {
    return
  }

  this.setData({ saving: true, saveError: '' })

  try {
    await recordRepository.remove(this.data.id)
    wx.disableAlertBeforeUnload()
    wx.switchTab({ url: getMainTabRoute(this.data.returnTo) })
  } catch {
    this.setData({ saving: false, saveError: '删除失败，原记录没有改变。' })
  }
}
```

`record-edit` 页面 WXML 把 `delete-record` 事件绑定到 `deleteRecord`，与 `submit`/`dirty-change` 并列：

```xml
<record-editor
  mode="{{mode}}"
  initial-draft="{{initialDraft}}"
  suggested-tags="{{suggestedTags}}"
  saving="{{saving}}"
  save-error="{{saveError}}"
  bind:submit="submitRecord"
  bind:dirty-change="onDirtyChange"
  bind:delete-record="deleteRecord"
/>
```

## 5. Acceptance Criteria

- **AC-001**: Given `initialDraft` 和内容完全相同、但 `tags` 是新数组引用的 `currentDraft`, When 调用 `hasRecordDraftChanged`, Then 返回 `false`（不被引用差异误判为变化）。
- **AC-002**: Given 仅 `content` 不同, When 调用 `hasRecordDraftChanged`, Then 返回 `true`。
- **AC-003**: Given 仅 `duration` 不同, When 调用 `hasRecordDraftChanged`, Then 返回 `true`。
- **AC-004**: Given `initialDraft.takeaway` 为 `undefined`、`currentDraft.takeaway` 为 `''`, When 调用 `hasRecordDraftChanged`, Then 返回 `false`（空字符串与 `undefined` 视为等价，因为 `validateRecordDraft` 会把空收获归一化为 `undefined`）。
- **AC-005**: Given `takeaway` 从有值变为不同的另一个值, When 调用 `hasRecordDraftChanged`, Then 返回 `true`。
- **AC-006**: Given `tags` 新增或删除了一个标签, When 调用 `hasRecordDraftChanged`, Then 返回 `true`。
- **AC-007**: Given `tags` 数量不变但顺序不同（如 `['TypeScript', '小程序']` 变为 `['小程序', 'TypeScript']`）, When 调用 `hasRecordDraftChanged`, Then 返回 `true`。
- **AC-008**: Given 一条已存在记录, When 调用 `repository.update(id, newInput)`, Then 返回的记录 `id`/`date`/`createdAt` 与原记录相同、`updatedAt` 更新为 `clock.now().getTime()` 且不等于原 `updatedAt`，`content`/`duration`/`tags`/`takeaway` 均替换为新值。
- **AC-009**: Given 一个不存在的 `id`, When 调用 `repository.update(missingId, input)`, Then Promise reject，且随后 `repository.list()` 返回的数据与调用前完全一致（不会静默创建一条新记录）。
- **AC-010**: Given 一个不存在的 `id`, When 调用 `repository.remove(missingId)`, Then Promise reject，且 `repository.list()` 中原记录仍然存在（删除失败不能产生假成功）。
- **AC-011**: Given 一个存在的 `id`, When 调用 `repository.remove(id)`, Then Promise resolve 为 `undefined`，随后 `repository.get(id)` resolve 为 `null`。
- **AC-012**: Given 微信开发者工具选择编译场景「测试场景 · 历史编辑」（`fixture=history&mode=edit&id=fixture-history-yesterday&from=detail&returnTo=log`）, When 打开记录编辑页, Then 表单预填该记录原有的内容「完成学习日志页面的组件拆分」、时长 50 分钟、标签 `['小程序', 'UI']`、收获文案，日期文案显示该记录自身的日期（不是今天），页面标题为「编辑记录」。
- **AC-013**: Given 上述编辑页已打开, When 修改学习内容或时长后尝试离开页面, Then 触发未保存修改提醒；若未做任何修改就直接离开，则不触发提醒。
- **AC-014**: Given 已修改字段并点击「保存记录」, When 保存成功, Then `navigateBack` 回详情页，详情页 `onShow` 重新读取后显示更新后的内容与新的 `updatedAt` 对应的展示。
- **AC-015**: Given 点击「删除这条记录」触发二次确认弹窗, When 用户点击「取消」, Then 不发生任何删除、记录仍然存在、页面保持在编辑页可继续操作。
- **AC-016**: Given 点击「删除这条记录」并在二次确认弹窗中点击「删除」, When 删除成功, Then 页面通过 `wx.switchTab` 返回 `returnTo` 指定的 Tab（该场景下为学习日志），学习日志不再显示这条记录。
- **AC-017**: Given 删除请求会失败（例如通过修改 Repository 注入错误场景验证）, When 触发删除确认, Then 页面显示「删除失败，原记录没有改变。」，`saving` 恢复为 `false`，记录未被移除，可以重试。
- **AC-018**: Given 通过「测试场景 · 新建记录」以 `mode=create` 打开记录编辑页, When 查看页面, Then 不出现危险区或删除按钮。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`hasRecordDraftChanged` 的纯函数逻辑，覆盖 AC-001 至 AC-007；`InMemoryRecordRepository` 的 `update`/`remove` 生命周期行为，覆盖 AC-008 至 AC-011。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-012 至 AC-018，使用 Starter 已配置好的「测试场景 · 历史编辑」和「测试场景 · 新建记录」编译场景。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：使用 `FixedClock` 固定 `updatedAt` 断言时间；`InMemoryRecordRepository` 以预置的单条 `existingRecord` 作为 update/remove 的测试夹具，不依赖真实 CloudBase；手工验收使用 Starter 提供的 `history` Fixture 场景中的 `fixture-history-yesterday` 记录。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（草稿比较结果、Repository 字段保持/更新、删除后数据状态），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用。

## 7. Rationale & Context

`hasRecordDraftChanged` 被设计成一个独立的 Feature 纯函数、并由 `record-editor` 替换掉原本组件私有的 `draftsEqual`，是因为创建模式和编辑模式的"是否有未保存修改"判断必须是同一套规则——如果两处各写一份，很容易在"空收获 vs `undefined`"这类边界情况上出现不一致的提醒行为，用户会在编辑模式看到创建模式不会出现的假提醒或漏提醒。

删除必须在组件内部完成二次确认（`wx.showModal`）而不是由 Page 再加一层确认，是遵循 Starter Kit Contract §7 "`delete-record` 和 `remove-all` 只能在对应组件完成二次确认后发出，Page 收到事件后只负责调用 Repository 和反馈结果"的既定分工——避免同一个删除动作被两层弹窗重复确认，也避免 Page 绕过组件直接删除。

删除成功后使用 `wx.switchTab` 返回 `returnTo` 指定的 Tab 而不是 `navigateBack`，是因为用户是从详情页进入编辑页的，删除后原详情页对应的记录已经不存在；如果 `navigateBack`，用户会短暂停留在一个即将因为记录消失而报错或显示空状态的详情页上。直接 `switchTab` 回到用户熟悉的 Tab（Today 或学习日志）能避免这个"返回到已失效页面"的中间状态。

不在详情页新增直接删除按钮，是为了保持"删除是一个需要先看到完整可编辑字段的谨慎操作"这一产品设计意图——用户必须先进入编辑页看到记录全貌，才能触达删除入口，而不是在只读的详情页就能一键删除。

## 8. Dependencies & External Integrations

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库——`wx.showModal` 完成二次确认，`wx.switchTab`/`wx.navigateBack`/`wx.enableAlertBeforeUnload`/`wx.disableAlertBeforeUnload` 完成导航与未保存提醒。
- **PLT-002**: TDesign MiniProgram 的 `t-button`（`theme="danger" variant="outline"`）渲染危险区删除按钮。
- **PLT-003**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架。

### Infrastructure Dependencies
- **INF-001**: `features/record-create/index.ts` 导出的 `RecordDraft` 类型与 `validateRecordDraft`——P1-02 已提供，本 Spec 直接复用，不重新实现校验规则。
- **INF-002**: `components/tag-picker/`——P1-03 已提供，编辑模式的标签修改完全通过既有插槽完成。
- **INF-003**: `repositories/record.ts` 的 `recordRepository.update`/`recordRepository.remove`——数据写入的唯一入口，语义见 Starter Kit Contract §5.2。
- **INF-004**: `shared/navigation/routes.ts` 的 `getMainTabRoute(returnTo)`——删除成功后 `wx.switchTab` 的目标路由，不手工拼接 URL。
- **INF-005**: `shared/date/local-date.ts` 的 `parseLocalDate`——把记录自身的 `date` 字符串解析为可格式化的日期，用于生成编辑模式下的只读日期文案。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 的 `history` 场景中的 `fixture-history-yesterday` 记录，以及 `project.config.json` 中的「测试场景 · 历史编辑」编译场景（`fixture=history&mode=edit&id=fixture-history-yesterday&from=detail&returnTo=log`）——手工验收使用，由 Starter 维护。

## 9. Examples & Edge Cases

```ts
// 引用差异不应被误判为内容变化
const baseDraft: RecordDraft = {
  content: '梳理 TypeScript 类型和小程序页面之间的数据流',
  duration: 30,
  tags: ['TypeScript', '小程序'],
  takeaway: '先把输入输出类型写清楚。',
}

hasRecordDraftChanged(baseDraft, { ...baseDraft, tags: baseDraft.tags.slice() }) // false

// 空收获与 undefined 收获视为等价
hasRecordDraftChanged(
  { ...baseDraft, takeaway: undefined },
  { ...baseDraft, takeaway: '' },
) // false

// 标签顺序变化也算作修改，不只是集合差异
hasRecordDraftChanged(baseDraft, { ...baseDraft, tags: ['小程序', 'TypeScript'] }) // true
```

```ts
// 编辑保存：id/date/createdAt 保持不变，updatedAt 前进
const clock = new FixedClock(new Date(2026, 6, 15, 13, 0))
const repository = new InMemoryRecordRepository([existingRecord], { clock })

const updated = await repository.update('existing', {
  content: '编辑后的学习记录正文',
  duration: 50,
  tags: ['TDD', 'Vitest'],
  takeaway: '编辑后的收获',
})
// updated.id === existingRecord.id
// updated.date === existingRecord.date
// updated.createdAt === existingRecord.createdAt
// updated.updatedAt === clock.now().getTime() 且 !== existingRecord.updatedAt

// 边界情况：删除一个不存在的记录必须 reject，不能悄悄"成功"
await expect(repository.remove('does-not-exist')).rejects.toThrow()
const remaining = await repository.list()
expect(remaining).toEqual([existingRecord]) // 原记录未受影响
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且 `tests/features/record-edit-delete.test.ts` 覆盖 AC-001 至 AC-011。
- 在微信开发者工具中使用「测试场景 · 历史编辑」验证 AC-012 至 AC-017，使用「测试场景 · 新建记录」验证 AC-018。
- Code Review 确认：`pages/record-detail/`、`components/record-detail/` 未新增任何删除相关按钮或事件（CON-001）；`record-editor` 没有重新实现字段校验规则，而是从 `features/record-create/index.ts` 导入 `validateRecordDraft`（CON-002）；未修改 `components/tag-picker/`、`features/tag-picker/index.ts`（CON-003）；`delete-record` 只在 `wx.showModal` 二次确认之后触发（CON-004）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约，尤其是 §7 功能插槽公开端口与 §8.3 记录编辑页面编排
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) — 编辑与删除的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — 记录编辑页与危险区的视觉规范
- P1-02 新建一条学习记录 — 本 Spec 复用其 `validateRecordDraft`、`RecordDraft` 类型与 `record-editor` 的创建模式表单骨架
- P1-03 学习主题选择与新建标签 — 本 Spec 复用其 `<tag-picker>` 组件，不修改其内部实现
- P1-04 学习记录详情 — 本 Spec 的编辑入口来自该页面已提供的"编辑"按钮，本 Spec 不修改该页面，也不在其中新增删除按钮
