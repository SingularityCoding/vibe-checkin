---
title: P1-07 学习偏好与关于
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, preference]
---

# Introduction

本 Spec 交付设置页的"学习偏好"与"关于"两个区块：用户可以读取并修改默认学习时长，在保存过程中看到"保存中"反馈，在保存失败时看到错误提示并保留原值；"关于"区块展示产品版本号并提供隐私说明入口。设置页共有四个区块（学习偏好、云端同步、数据与隐私、关于），本 Spec 只负责第一和第四个区块；云端同步属于 P1-08，数据与隐私（删除全部记录）属于 Phase 2 的 P2-08。

## 1. Purpose & Scope

**目的**：让用户能够查看并调整"默认学习时长"这一个人偏好，使之后新建的学习记录默认使用该时长；同时让用户能在设置页确认当前产品版本，并在需要时查看隐私说明，而不需要跳转到其他页面或外部链接。

**范围**：
- `miniprogram/features/preference/index.ts` — 纯函数 `validateDefaultDuration`
- `miniprogram/components/settings-preference/` — 展示与编辑默认学习时长的 Component
- `miniprogram/components/settings-about/` — 展示版本号与隐私说明入口的 Component
- `miniprogram/pages/settings/index.ts` — 仅涉及加载 `LearningPreference`、调用 `validateDefaultDuration`、编排 `settings-preference` 与 `settings-about` 两个 Component 这部分逻辑
- 对应 Vitest 测试

**不在范围内**：
- 云端同步区块（`components/settings-sync/`、`features/sync/index.ts`）——属于 P1-08，同一 Phase 但不同 Spec，本 Spec 不得修改这些文件。
- 数据与隐私 / 危险区（`components/settings-danger-zone/`、`features/remove-all-records/index.ts`、`recordRepository.removeAllMine()`）——属于 Phase 2 的 P2-08，本 Spec 不得修改这些文件；`pages/settings/index.ts` 中与危险区相关的 `dangerState`、`removeAllRecords` 逻辑保持 Starter 已提供的安全默认，本 Spec 不改动。
- `LocalPreferenceRepository`（`repositories/local-preference/`）及组合入口 `repositories/preference.ts`——由 P0 提供并维护，本 Spec 只作为消费方通过 `preferenceRepository` 单例调用 `get()`/`save()`，不重新实现或修改持久化逻辑。
- 记录编辑表单如何使用 `preference.defaultDuration` 作为新建记录的初始时长——该逻辑（`createInitialDraft(preference)`）属于 P1-02，本 Spec 只保证偏好被正确保存，不修改 `features/record-create/`。

**读者假设**：实现者已经 clone 了 `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中使用「测试场景 · 设置」编译模式打开设置页并看到 Starter 提供的四个区块骨架（学习偏好为安全默认，其余三个区块已由 P0/其他 Spec 提供或保持安全默认）。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningPreference` | 领域类型 `{ defaultDuration: number }`，定义见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `PreferenceValidation` | `validateDefaultDuration` 的返回类型，包含 `isValid`、`value`、可选 `error` |
| `PreferenceRepository` | `get(): Promise<LearningPreference>` / `save(input): Promise<LearningPreference>` 的数据访问接口，Starter 已提供 `LocalPreferenceRepository` 实现 |
| `默认学习时长` (defaultDuration) | 5–600 分钟、以 5 分钟为步长的整数，新建记录表单据此设置初始时长；不影响已保存记录 |
| `t-stepper` | TDesign 小程序组件库提供的数字步进器，`settings-preference` 用它承载时长编辑交互 |
| `savingPreference` / `preferenceError` | `pages/settings/index.ts` 中承载保存中状态与保存失败文案的页面级 data 字段 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `validateDefaultDuration(value)` 必须在 `value` 为整数、`5 <= value <= 600` 且 `value % 5 === 0` 时返回 `{ isValid: true, value }`；否则返回 `{ isValid: false, value, error }`，其中 `error` 为固定中文提示（引用 `RECORD_DURATION_MIN`/`MAX`/`STEP` 拼出的字符串，不是静态硬编码文案）。
- **REQ-002**: `settings-preference` Component 必须把 `preference.defaultDuration` 传给 `t-stepper` 的 `value`，并把 `min`/`max`/`step` 分别绑定到 `RECORD_DURATION_MIN`/`RECORD_DURATION_MAX`/`RECORD_DURATION_STEP`（从 `domain/constraints.ts` 引入），不得在 Component 内重新硬编码 `5`/`600`/`30` 等数值。
- **REQ-003**: `t-stepper` 的 `change` 事件必须触发 `settings-preference` 发出 `save-preference` 事件，`detail` 为 `{ defaultDuration: number }`，`defaultDuration` 等于用户操作后的新值；Component 本身不得调用 `preferenceRepository` 或直接持久化。
- **REQ-004**: `pages/settings/index.ts` 的 `savePreference` 处理函数必须先用 `validateDefaultDuration(event.detail.defaultDuration)` 校验；当 `isValid` 为 `false` 时，把 `validation.error` 写入 `preferenceError` 并直接返回，不得调用 `preferenceRepository.save`。
- **REQ-005**: 校验通过后，`savePreference` 必须先把 `savingPreference` 置为 `true`、`preferenceError` 清空，再 `await preferenceRepository.save({ defaultDuration: validation.value })`；成功后用返回值更新 `preference` 并把 `savingPreference` 置回 `false`。
- **REQ-006**: 当 `preferenceRepository.save` 的 Promise reject 时，`savePreference` 必须把 `savingPreference` 置回 `false`、把 `preferenceError` 设置为固定中文失败文案（"默认时长保存失败，请重试。"），且保留 `preference` 中此前的旧值不被清空或替换为无效数据。
- **REQ-007**: `settings-about` Component 必须展示 `version` property（默认值 `'0.1.0'`），并在用户点击"隐私说明" Cell 时发出无 `detail` 负载的 `open-privacy` 事件。
- **REQ-008**: `pages/settings/index.ts` 的 `openPrivacy` 处理函数必须调用 `wx.showModal`，标题固定为「隐私说明」，正文说明"学习记录按当前微信身份隔离"且"不会要求用户提交密钥、OpenID 或其他私密凭据"，`showCancel: false`，`confirmText: '知道了'`。
- **REQ-009**: 修改默认学习时长偏好后，已经创建的 `LearningRecord.duration` 字段不得被追溯修改；偏好只影响之后通过 `createInitialDraft(preference)` 新建的记录初始值（该消费点属于 P1-02，本 Spec 只保证偏好本身被正确保存且不触碰既有记录）。
- **CON-001**: 不得实现或修改云端同步区块——这是 P1-08 的范围。`features/sync/`、`components/settings-sync/` 目录下的任何文件都不得修改。
- **CON-002**: 不得实现或启用危险区（删除全部记录）——这是 P2-08 的范围。`features/remove-all-records/`、`components/settings-danger-zone/` 目录下的任何文件都不得修改；`pages/settings/index.ts` 中已有的 `dangerState`/`removeAllRecords` 安全默认逻辑保持不变。
- **CON-003**: `settings-preference` 与 `settings-about` 只能通过 properties 接收数据、通过约定事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例；持久化只能经由 `pages/settings/index.ts` 调用 `preferenceRepository`。
- **CON-004**: 时长边界数值（5、600、步长 5）只能引用 `domain/constraints.ts` 导出的 `RECORD_DURATION_MIN`/`RECORD_DURATION_MAX`/`RECORD_DURATION_STEP`，不得在 Feature 或 Component 中重新声明字面量常量。
- **GUD-001**: 复用 Starter 已提供的 `preferenceRepository` 组合单例（`repositories/preference.ts`）读写偏好，不在页面或 Component 中直接 `new LocalPreferenceRepository(...)`。
- **PAT-001**: 保存中状态显示为中性提示（`vc-status-note` 的 `state="neutral"`，文案"保存中…"），保存失败显示为错误提示（`state="error"`），二者互斥展示（`saving` 优先于 `saveError`）；`t-stepper` 在 `saving` 为 `true` 时禁用交互（`disabled="{{saving}}"`），防止保存过程中重复触发。

## 4. Interfaces & Data Contracts

### Feature：`features/preference/index.ts`

```ts
export type PreferenceValidation = {
  isValid: boolean
  value: number
  error?: string
}

export const validateDefaultDuration = (value: number): PreferenceValidation
```

`validateDefaultDuration` 是 Starter Kit Contract §7 中为 P1-07 固定的公开端口。它同时被 `pages/settings/index.ts`（保存前校验）和 `tests/features/preference/index.test.ts`（边界测试）复用，避免校验规则在页面和测试中各写一份。

### Component：`components/settings-preference/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `preference` | `LearningPreference` | `{ defaultDuration: 30 }` |
| `saving` | `Boolean` | `false` |
| `saveError` | `String` | `''` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `save-preference` | `{ defaultDuration: number }` | 用户通过 `t-stepper` 修改默认学习时长 |

### Component：`components/settings-about/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `version` | `String` | `'0.1.0'` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `open-privacy` | 无 | 用户点击"隐私说明" Cell |

### Page 编排：`pages/settings/index.ts`

```ts
async savePreference(
  event: WechatMiniprogram.CustomEvent<{ defaultDuration: number }>,
): Promise<void>

openPrivacy(): void
```

`onShow` 时调用 `preferenceRepository.get()`（与 `recordRepository.getSyncInfo()` 并行 `Promise.all`）填充 `data.preference`；WXML 把 `preference`/`savingPreference`/`preferenceError` 传给 `<settings-preference>`，把固定的 `version: '0.1.0'` 传给 `<settings-about>`：

```xml
<settings-preference
  preference="{{preference}}"
  saving="{{savingPreference}}"
  save-error="{{preferenceError}}"
  bind:save-preference="savePreference"
/>
...
<settings-about version="{{version}}" bind:open-privacy="openPrivacy" />
```

## 5. Acceptance Criteria

- **AC-001**: Given `value = 5` 或 `value = 600`（合法区间边界）, When 调用 `validateDefaultDuration(value)`, Then 返回 `{ isValid: true, value }`。
- **AC-002**: Given `value = 45`（区间内且是 5 的倍数）, When 调用 `validateDefaultDuration(45)`, Then 返回 `{ isValid: true, value: 45 }`。
- **AC-003**: Given `value = 0`（低于最小值）, When 调用 `validateDefaultDuration(0)`, Then `isValid` 为 `false`、`value` 为 `0`、`error` 非空。
- **AC-004**: Given `value = 601`（超过最大值）, When 调用 `validateDefaultDuration(601)`, Then `isValid` 为 `false`、`error` 非空。
- **AC-005**: Given `value = 33`（不是 5 的倍数）, When 调用 `validateDefaultDuration(33)`, Then `isValid` 为 `false`、`error` 非空。
- **AC-006**: Given `value = 30.5`（非整数）, When 调用 `validateDefaultDuration(30.5)`, Then `isValid` 为 `false`、`error` 非空。
- **AC-007**: Given 已经用当时的默认时长（30 分钟）创建了一条记录, When 通过 `validateDefaultDuration(60)` 校验通过后调用 `preferenceRepository.save({ defaultDuration: 60 })`, Then 该已存在记录的 `duration` 通过 `recordRepository.get(id)` 读取仍为 `30`，同时 `preferenceRepository.get()` 返回 `{ defaultDuration: 60 }`（偏好变化不追溯改变历史记录）。
- **AC-008**: Given 微信开发者工具选择编译场景「测试场景 · 设置」（`history` Fixture，初始 `defaultDuration` 为 30）, When 打开设置页, Then 学习偏好区块的 Stepper 显示 30，且不显示"保存中"或错误状态。
- **AC-009**: Given 已进入设置页, When 通过 Stepper 把默认时长改为 60 并松开, Then 短暂显示"保存中…"状态后恢复为无状态提示、Stepper 显示 60；退出小程序重新以「测试场景 · 设置」编译进入后，Stepper 仍显示 60（验证 `LocalPreferenceRepository` 持久化到 Storage，且页面重新 `onShow` 后读到最新值）。
- **AC-010**: Given 已经把默认时长改为 60（沿用 AC-009 的状态）, When 通过编译场景「测试场景 · 新建记录」打开新建记录页, Then 时长输入的初始值为 60 而不是 Fixture 原始的 30（验证偏好被 P1-02 的 `createInitialDraft(preference)` 正确消费，但改动仅限观察，不修改新建记录页代码）。
- **AC-011**: Given 设置页已打开, When 点击"关于"区块中的"隐私说明" Cell, Then 弹出 `wx.showModal`，标题为「隐私说明」，正文包含"当前微信身份"与"不会要求你提交密钥、OpenID"等措辞，只有"知道了"一个按钮（无取消按钮）。
- **AC-012**: Given 设置页已打开, Then "关于"区块的版本号显示为 `v0.1.0`，与项目根 `package.json` 的 `version` 字段一致。
- **AC-013**（保存失败路径，手工验证）: Given 设置页已打开, When 在开发者工具 Console 中临时将 `wx.setStorageSync` 替换为一个会抛出异常的实现（例如 `wx.setStorageSync = () => { throw new Error('mock') }`）后再修改默认时长, Then Stepper 恢复为修改前的值或保持可交互、`preferenceError` 显示"默认时长保存失败，请重试。"、`saving` 状态消失；恢复原始 `wx.setStorageSync` 后重试可以正常保存成功。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`validateDefaultDuration` 的边界与非法输入逻辑，覆盖 AC-001 至 AC-006；偏好变化不追溯影响历史记录的集成场景（`LocalPreferenceRepository` + `LocalRecordRepository` 协同），覆盖 AC-007。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-008 至 AC-013，使用 Starter 已配置好的「测试场景 · 设置」与「测试场景 · 新建记录」编译模式；`pages/settings/index.ts` 的编排逻辑（`savePreference`/`openPrivacy`）目前没有专门的 Page 级 Vitest 测试，只能手工验收。
- **Frameworks**：Vitest（`vitest run`，测试文件 `tests/features/preference/index.test.ts`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：Vitest 用例使用 `TestStorage`（内存实现）与 `FixedClock`，避免依赖真实 `wx.setStorageSync` 或系统时间；手工验收使用 Starter 提供的 `history` Fixture 场景（内置 `defaultDuration: 30`），不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（校验结果、持久化后的字段值），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯校验函数与本地 Storage 读写，无性能测试要求）。

## 7. Rationale & Context

`validateDefaultDuration` 被设计成一个独立的纯函数，而不是内联在 `pages/settings/index.ts` 的 `savePreference` 里，是因为同一套 5–600、步长 5 的校验规则也需要在测试里独立验证边界值，并且 `LocalPreferenceRepository.save` 内部另有一份防御性校验（见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型)）——Feature 层的校验面向用户交互给出可读文案，Repository 层的校验是最后一道防线，两者不应该合并成一处，但也不应该各自重新定义数值边界，因此边界常量统一来自 `domain/constraints.ts`。

"修改默认时长不追溯已有记录"（REQ-009、AC-007）是本 Spec 中最容易被无意破坏的规则：如果实现者选择让 `defaultDuration` 变化时反向更新历史记录的 `duration`，会让用户此前记录的真实学习时长失真。测试专门构造"先创建记录、再改偏好、再读取该记录"的顺序来锁定这一行为，而不是仅测试 `validateDefaultDuration` 本身。

`settings-about` 的版本号通过 property 传入而不是在 Component 内部读取某个全局常量，是遵循 Starter Kit Contract §7 对 Component 只能通过 properties/events 通信的约束（CON-003），使得版本号的来源（当前固定为 `pages/settings/index.ts` 里的字面量，与 `package.json` 的 `version` 字段人工保持一致）可以在页面层面统一管理，不需要 Component 感知构建产物或环境变量。

## 8. Dependencies & External Integrations

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。
- **PLT-003**: `tdesign-miniprogram` 的 `t-cell`、`t-cell-group`、`t-stepper` 组件——Starter 已引入并在 `settings-preference`/`settings-about` 的 `usingComponents` 中声明，本 Spec 直接复用，不引入新的 UI 组件库。

### Infrastructure Dependencies
- **INF-001**: `repositories/preference.ts` 导出的 `preferenceRepository` 组合单例——页面读写偏好的唯一入口，本 Spec 不直接访问 Storage。
- **INF-002**: `repositories/local-preference/index.ts` 的 `LocalPreferenceRepository`——由 P0 提供并维护，负责 Storage key `vibe-checkin.preference.v1` 的持久化与自身的防御性校验；本 Spec 只作为消费方，不修改该文件。
- **INF-003**: `domain/constraints.ts` 导出的 `RECORD_DURATION_MIN`/`RECORD_DURATION_MAX`/`RECORD_DURATION_STEP`——本 Spec 与 P1-02（记录编辑时长字段）共享的数值边界来源。
- **INF-004**: `components/vc-status-note/` ——Starter 已提供的通用状态提示 Component，`settings-preference` 用它展示"保存中"与错误文案，本 Spec 不修改该 Component 本身。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 中的 `DEFAULT_FIXTURE_PREFERENCE`（`{ defaultDuration: 30 }`）——四个编译场景（`empty`/`today`/`history`/`read-error`）与「测试场景 · 设置」共用同一个初始偏好值，手工验收依赖该默认值为 30。

## 9. Examples & Edge Cases

```ts
// 合法边界：5 和 600 都必须被接受，不是开区间
validateDefaultDuration(5)   // => { isValid: true, value: 5 }
validateDefaultDuration(600) // => { isValid: true, value: 600 }
```

```ts
// 非法输入：越界、非步长倍数、非整数分别返回同一形状但 isValid 为 false
validateDefaultDuration(0)    // => { isValid: false, value: 0, error: '...' }
validateDefaultDuration(601)  // => { isValid: false, value: 601, error: '...' }
validateDefaultDuration(33)   // => { isValid: false, value: 33, error: '...' }
validateDefaultDuration(30.5) // => { isValid: false, value: 30.5, error: '...' }
```

```ts
// 核心边界情况：偏好变化不追溯已有记录（AC-007 对应的真实测试写法）
const existing = await recordRepository.create({
  content: '按照当时的默认时长创建的记录',
  duration: 30,
  tags: [],
})

const validation = validateDefaultDuration(60)
await preferenceRepository.save({ defaultDuration: validation.value })

await recordRepository.get(existing.id)
// => duration 仍为 30，不会因为偏好改成 60 而被联动修改

await preferenceRepository.get()
// => { defaultDuration: 60 }，偏好本身确实已经更新
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，`tests/features/preference/index.test.ts` 中新增/既有用例覆盖 AC-001 至 AC-007。
- 在微信开发者工具中使用「测试场景 · 设置」「测试场景 · 新建记录」两个编译场景验证 AC-008 至 AC-012；使用 Console 临时替换 `wx.setStorageSync` 的方式验证 AC-013 的保存失败路径。
- Code Review 确认：未修改 `features/sync/`、`components/settings-sync/`（CON-001）以及 `features/remove-all-records/`、`components/settings-danger-zone/`（CON-002）目录下任何文件；`settings-preference`/`settings-about` 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-003）；时长边界数值均引用 `domain/constraints.ts` 常量而非字面量（CON-004）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §4.2、§7.6 — 学习偏好的产品规则与设置页信息架构
- [UI 设计](../../ui-foundation-design.md) — 设置页视觉规范（四个暖白 Cell Group）
- [P1-01 Today 概览与主行动](./p1-01-today-summary.md) — 同一 Phase 的参考格式样例
- P1-08 云端记录与同步状态 — 同一设置页的"云端同步"区块，与本 Spec 互不依赖但共享 `pages/settings/index.ts`
- P2-08 删除全部学习记录 — 同一设置页的"数据与隐私"区块，Phase 2 才实现，与本 Spec 互不依赖但共享 `pages/settings/index.ts`
