---
title: P2-08 删除我的全部学习记录
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, settings, cloud]
---

# Introduction

本 Spec 交付设置页的「数据与隐私」危险区：让用户经过明确的二次确认后，删除当前微信身份（`_openid`）下保存的全部学习记录。这是 P1-08 有意留白的收尾工作——P1-08 完成了 `CloudRecordRepository` 的 `list`/`get`/`create`/`update`/`remove` 和同步状态，但 `removeAllMine()` 在 Starter Kit 中被明确保留为拒绝（reject），因为 CloudBase 没有「按查询条件批量删除」的原生接口，需要一个查询-删除循环，而这类不可逆的破坏性操作被单独拆成 Phase 2 的独立 Spec，配上自己的二次确认交互，而不是随 P1-08 顺手实现。

## 1. Purpose & Scope

**目的**：让用户在设置页看到明确说明删除范围的危险区入口，点击后必须经过第二次确认才会真正发起删除；删除请求进行中禁止重复提交；任意一批删除失败都必须让用户看到失败并保留原数据，不能出现「界面显示成功、数据其实还在」的假成功。

**范围**：
- `miniprogram/features/remove-all-records/index.ts` —— 二次确认状态机（`RemoveAllConfirmState`）与页面级请求状态（`RemoveAllRecordsRequestState`）两组纯函数/纯类型
- `miniprogram/components/settings-danger-zone/` —— 展示危险区说明、二次确认面板与删除按钮的 Component
- `miniprogram/pages/settings/index.ts` —— 仅涉及 `removeAllRecords()` 方法与 `dangerState` 这部分编排逻辑
- `miniprogram/repositories/cloud-record/index.ts` —— `CloudRecordRepository.removeAllMine()` 的分批删除实现
- 对应 Vitest 测试：`tests/features/remove-all-records/index.test.ts`、`tests/repositories/cloud-record.test.ts` 中 `removeAllMine` 相关用例

**不在范围内**：删除或注销微信身份本身、账号注销流程、清除默认学习时长偏好（`LearningPreference`，属于 P1-07 的 `settings-preference`）、`settings-sync`（P1-08）的同步状态展示。Local 与 In-memory Repository 的 `removeAllMine()`（分别是 `writeRecords([])` 和 `this.records = []`）已经正确且完整，本 Spec 不修改它们，只完成 Cloud 实现。

**读者假设**：实现者已经从 `phase-1-complete` 建分支，`npm run check` 全部通过，`CloudRecordRepository` 的其余方法（`list`/`get`/`create`/`update`/`remove`/`reloadFromCloud`/`getSyncInfo`）已由 P1-08 完成并保持不变。实现者不需要修改 `config/cloud.ts` 中的 `CLOUD_ENV_ID`、`CLOUD_COLLECTIONS`、`CLOUD_CURRENT_USER_QUERY`。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `_openid` | CloudBase 为当前微信身份自动附加的存储层字段；不进入 `LearningRecord`，不可显示、打印或提交到仓库（见 [Starter Kit Contract §5.3](../../starter-kit-contract.md#53-p0p1-与测试使用的实现)） |
| `{openid}` / `CLOUD_CURRENT_USER_QUERY` | `config/cloud.ts` 导出的 CloudBase 运行时占位符常量，`where` 查询用它代表「当前登录身份」，由 CloudBase 安全规则在服务端解析，不是真实 OpenID 字符串 |
| 二次确认状态机 | `RemoveAllConfirmState`/`RemoveAllConfirmStep`：Component 内部状态，只跟踪用户是否已经确认过危险操作，取值 `'idle' \| 'confirming'` |
| 页面级请求状态 | `RemoveAllRecordsRequestState`：`{ removing, removeError }`，跟踪 `recordRepository.removeAllMine()` 这次真实调用是否在途/是否刚失败，与二次确认状态机彼此独立 |
| 分批删除循环 | `removeAllMine()` 内部「查询当前用户一页记录 → 逐条删除 → 再查询直到查到空页」的循环；CloudBase 单次查询和删除都有平台上限，没有「按条件批量删除」的原生调用 |
| `REMOVE_ALL_MAX_BATCHES` | 分批循环的安全上限（`1000`），防止某种异常情况下集合始终不为空导致无限循环 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: 用户第一次点击危险区主按钮（`onRequestConfirm`）必须只调用 `requestRemoveAllConfirmation(state)` 把 `step` 从 `'idle'` 切换到 `'confirming'`，展示二次确认面板，不能在这一步直接发起删除。
- **REQ-002**: 用户在二次确认面板点击「取消」（`onCancelConfirm`）必须调用 `cancelRemoveAllConfirmation(state)` 把 `step` 切回 `'idle'`，不触发 `remove-all` 事件，不调用 Repository。
- **REQ-003**: 用户在二次确认面板点击最终确认按钮（`onConfirmRemoveAll`）必须调用 `confirmRemoveAll(state)`；只有当调用前 `step === 'confirming'` 时才返回 `confirmed: true` 并把状态重置为 `'idle'`，否则返回 `confirmed: false` 且状态原样不变——这保证一次意外或重复触发的确认调用不会在状态机未处于确认步骤时被当作真实确认。
- **REQ-004**: Component 只有在 `confirmRemoveAll` 返回 `confirmed: true` 时才可以 `triggerEvent('remove-all')`；不允许另发一个语义相同但名字不同的事件（沿用 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口) 固定的事件名）。
- **REQ-005**: 设置页 `removeAllRecords()` 收到 `remove-all` 事件后，必须先把 `dangerState` 置为 `{ ...dangerState, removing: true, removeError: '' }` 再调用 `recordRepository.removeAllMine()`；成功后必须把 `dangerState` 重置为 `createRemoveAllRecordsState()`（即 `removing: false`、`removeError: ''`）。
- **REQ-006**: `removeAllMine()` 失败时，`removeAllRecords()` 必须把 `dangerState` 更新为 `removing: false`、`removeError: '删除失败，原有学习记录没有改变。'`，不得清空或修改用户已有数据的展示。
- **REQ-007**: `CloudRecordRepository.removeAllMine()` 必须循环执行「用 `where({ _openid: CLOUD_CURRENT_USER_QUERY }).limit(removeAllBatchSize).get()` 查询一页当前用户的记录 → 对返回的每一条记录调用 `collection.doc(id).remove()`」，直到某一次查询返回的 `data` 为空数组时才可以 resolve；不允许一次性用不限量查询后本地分片，也不允许只处理第一页就返回成功。
- **REQ-008**: 分批循环中任意一条记录的删除失败（Promise reject，或 resolve 但 `stats.removed === 0`）都必须让整个 `removeAllMine()` 调用 reject，不得继续处理下一批或把该批标记为部分成功；调用方重试时会重新查询，天然从上次真正剩下的数据继续，不依赖 `removeAllMine()` 自己记账进度。
- **REQ-009**: `removeAllMine()` 抛出的错误必须经过与 `list`/`get`/`create`/`update`/`remove` 相同的 `toCloudFailure()` 处理，只暴露固定文案加可选 `errCode`，不得把原始 CloudBase 错误对象（可能携带 `_openid` 或文档内容）透传给调用方。
- **REQ-010**: 分批循环必须受 `REMOVE_ALL_MAX_BATCHES`（`1000`）限制；超过上限时必须 reject 并给出清晰错误，不能无限循环。
- **REQ-011**: `settings-danger-zone` 的 `removing` 属性变为 `true` 时，Component 必须通过 observer 把内部 `step` 重置为 `'idle'`，防止二次确认面板残留在一个正在进行中的删除请求之下；确认/取消按钮在 `removing` 为 `true` 期间必须禁用，防止重复提交。
- **CON-001**: 不得删除、清空或修改微信身份（`_openid`）本身，不得实现账号注销流程。
- **CON-002**: 不得清除或修改 `LearningPreference`（默认学习时长）；`preferenceRepository` 不在本 Spec 调用范围内。
- **CON-003**: 不得修改 `settings-preference`（P1-07）、`settings-sync`（P1-08）的 Component / Feature 文件；同 Phase 没有其他任务修改设置页或 Cloud Repository，本 Spec 是设置页与 `CloudRecordRepository` 在 Phase 2 唯一的修改方。
- **CON-004**: 不得修改 Local / In-memory Repository 的 `removeAllMine()` 实现（已经正确）；本 Spec 的 Repository 改动只落在 `repositories/cloud-record/index.ts`。
- **CON-005**: 查询当前用户记录必须始终显式带上 `_openid: CLOUD_CURRENT_USER_QUERY` 条件，不得先取回全部文档再在客户端按 `_openid` 过滤。
- **GUD-001**: 错误消息构造复用 P1-08 已建立的 `toCloudFailure`/`extractErrorCode` 模式，不重新发明一套错误包装。
- **GUD-002**: `removeAllBatchSize` 通过 `CloudRecordRepositoryOptions` 构造参数暴露，方便测试用较小的批次（如 2）在不用种入成百上千条记录的情况下覆盖多批次循环。
- **PAT-001**: 二次确认状态机沿用与 P2-02 单条记录删除相同的「先确认、再真正删除」交互模型，让用户无论删除一条还是全部记录都有一致的心智预期。

## 4. Interfaces & Data Contracts

### Feature：`features/remove-all-records/index.ts`

```ts
// 页面级请求状态：跟踪 removeAllMine() 这次调用是否在途 / 是否刚失败
export type RemoveAllRecordsRequestState = {
  removing: boolean
  removeError: string
}

export const createRemoveAllRecordsState = (): RemoveAllRecordsRequestState => ({
  removing: false,
  removeError: '',
})

// Component 级二次确认状态机：只跟踪用户是否已经点过一次确认
export type RemoveAllConfirmStep = 'idle' | 'confirming'

export type RemoveAllConfirmState = {
  step: RemoveAllConfirmStep
}

export const createRemoveAllConfirmState = (): RemoveAllConfirmState => ({
  step: 'idle',
})

export const requestRemoveAllConfirmation = (
  state: RemoveAllConfirmState,
) => RemoveAllConfirmState // idle -> confirming

export const cancelRemoveAllConfirmation = (
  state: RemoveAllConfirmState,
) => RemoveAllConfirmState // * -> idle

export const confirmRemoveAll = (
  state: RemoveAllConfirmState,
) => { state: RemoveAllConfirmState; confirmed: boolean }
```

### Component：`components/settings-danger-zone/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `removing` | `Boolean` | `false` |
| `removeError` | `String` | `''` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `remove-all` | 无 | `confirmRemoveAll` 返回 `confirmed: true` 之后 |

Component 内部 `data.step: RemoveAllConfirmStep` 驱动 WXML 在「主按钮」与「二次确认面板」之间切换；这是 Component 私有状态，不通过 property 从外部传入（见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)：只固定 `removing`/`removeError` 两个 property 和 `remove-all` 一个 event）。

### Repository：`repositories/cloud-record/index.ts`

```ts
export type CloudRecordRepositoryOptions = {
  cloud?: CloudRecordClientPort | null
  clock?: Clock
  removeAllBatchSize?: number // 默认 20，测试可调小以覆盖多批循环
}

export class CloudRecordRepository implements RecordRepository {
  async removeAllMine(): Promise<void>
}
```

`removeAllMine()` 内部关键片段（分批查询-删除循环，任意一条删除失败即整体失败）：

```ts
async removeAllMine(): Promise<void> {
  const collection = this.collection()

  for (let batch = 0; batch < REMOVE_ALL_MAX_BATCHES; batch += 1) {
    const page = await collection
      .where({ _openid: CLOUD_CURRENT_USER_QUERY })
      .limit(this.removeAllBatchSize)
      .get()

    if (page.data.length === 0) {
      return // 当前用户的集合已经清空
    }

    await Promise.all(
      page.data.map((doc) => this.removeOneMineDocument(collection, doc)),
    )
  }

  throw toCloudFailure('removeAllMine', new Error('Exceeded the maximum number of delete batches'))
}
```

### Page 编排：`pages/settings/index.ts`

```ts
async removeAllRecords() {
  this.setData({
    dangerState: { ...this.data.dangerState, removing: true, removeError: '' },
  })

  try {
    await recordRepository.removeAllMine()
    this.setData({ dangerState: createRemoveAllRecordsState() })
  } catch {
    this.setData({
      dangerState: {
        ...this.data.dangerState,
        removing: false,
        removeError: '删除失败，原有学习记录没有改变。',
      },
    })
  }
}
```

`dangerState` 初值为 `createRemoveAllRecordsState()`，绑定到 `<settings-danger-zone removing="{{dangerState.removing}}" remove-error="{{dangerState.removeError}}" bind:remove-all="removeAllRecords" />`。

## 5. Acceptance Criteria

- **AC-001**: Given `createRemoveAllConfirmState()`, When 读取初始状态, Then `{ step: 'idle' }`。
- **AC-002**: Given `step: 'idle'`, When 调用 `requestRemoveAllConfirmation(state)`, Then 返回 `{ step: 'confirming' }`。
- **AC-003**: Given `step: 'confirming'`, When 调用 `cancelRemoveAllConfirmation(state)`, Then 返回 `{ step: 'idle' }`，且这一步不应触发任何删除。
- **AC-004**: Given `step: 'confirming'`, When 调用 `confirmRemoveAll(state)`, Then `confirmed` 为 `true`，返回的 `state` 为 `{ step: 'idle' }`。
- **AC-005**: Given `step: 'idle'`（用户还没点过第一次确认）, When 直接调用 `confirmRemoveAll(state)`, Then `confirmed` 为 `false`，`state` 原样不变——防止一次意外触发就删空数据。
- **AC-006**: Given 用户先确认再取消再重新确认（`idle → confirming → idle → confirming`）, When 最终调用 `confirmRemoveAll`, Then `confirmed` 为 `true` 且状态回到 `idle`，说明取消后可以重新发起。
- **AC-007**: Given 已有 5 条属于当前用户 `_openid` 的记录、`removeAllBatchSize: 2`, When 调用 `repository.removeAllMine()`, Then 调用 resolve、`repository.list()` 返回空数组，且每一次 `where` 调用的条件都带有 `_openid: CLOUD_CURRENT_USER_QUERY`。
- **AC-008**: Given 集合中同时存在属于 `'me'` 和属于 `'someone-else'` 的记录, When 以 `'me'` 身份调用 `removeAllMine()`, Then `'someone-else'` 的文档在删除后仍然存在（未被触碰）。
- **AC-009**: Given 待删除的一批记录中有一条 `doc(id).remove()` 会 reject, When 调用 `removeAllMine()`, Then 整个调用 reject，且该条记录在存储桩中依然存在（不是部分成功）。
- **AC-010**: Given 待删除的一批记录中有一条 `doc(id).remove()` resolve 但 `stats.removed === 0`, When 调用 `removeAllMine()`, Then 整个调用同样 reject，该条记录依然存在。
- **AC-011**: Given 底层查询抛出携带 `_openid` 和文档内容的错误对象, When 调用 `removeAllMine()` 并捕获异常, Then 序列化后的错误信息不包含真实 `_openid` 值或文档内容，且错误对象上没有 `_openid` 属性。
- **AC-012**: Given `cloud: null`（设备未初始化云开发）, When 调用 `removeAllMine()`, Then reject 且错误信息包含 `'unavailable'`。
- **AC-013**: Given 微信开发者工具编译模式选择 Local 数据源 + 「测试场景 · 历史记录」, When 打开设置页并点击「删除我的全部学习记录」, Then 出现二次确认面板并显示「再次确认：这会永久删除当前微信身份下的全部学习记录，且无法恢复。」；点击「取消」后面板收起，Today / 日志 / 统计仍显示原有记录。
- **AC-014**: Given 同一 Local 场景, When 点击确认按钮进入二次确认后再点击「确认删除，不可恢复」, Then 按钮显示删除中状态且被禁用，删除完成后危险区回到初始按钮态，Today / 日志 / 统计均变为空状态，`设置` 页的默认学习时长（学习偏好区块）保持不变。
- **AC-015**: Given 微信开发者工具切换为 Cloud 数据源，并使用老师本人真实微信身份登录、在真实 CloudBase 环境下已有若干条自己的学习记录, When 完成二次确认删除, Then 该身份名下所有记录从 Today / 日志 / 统计中消失，`removeAllMine()` 请求成功、危险区无残留错误提示，且由老师复核 CloudBase 控制台确认其他学生 `_openid` 的记录未被影响、默认学习时长偏好未被清除。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`features/remove-all-records/index.test.ts` 覆盖二次确认状态机的全部转移（AC-001 至 AC-006）；`tests/repositories/cloud-record.test.ts` 中 `describe('removeAllMine', ...)` 覆盖分批循环、跨用户隔离、单条失败即整体失败、错误信息脱敏、云未初始化（AC-007 至 AC-012）。
  - 手工用户旅程（微信开发者工具）：Local 数据源 + 「测试场景 · 历史记录」覆盖 AC-013、AC-014，可用「测试场景 · 重置数据」或 `getApp().devFixtures.reset()` 复原本地数据以便重复验收；Cloud 数据源覆盖 AC-015，必须使用验收者自己的真实微信身份，不能用他人数据验证。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：`FixedClock` 固定测试时间；`createCloudRecordStub` 提供内存版 `wx.cloud` 数据库桩，通过 `resolveCondition` 把 `CLOUD_CURRENT_USER_QUERY` 解析为桩内设定的 `openid`，并支持按文档 id 配置 `'reject'` 或 `'no-op'` 两种删除失败模式；测试用 `removeAllBatchSize: 2` 搭配 5 条记录制造跨批次场景，不依赖真实 CloudBase。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并；Cloud 手工验收（AC-015）不在 CI 范围内，是合并前的人工验收步骤。
- **Coverage Requirements**：不设固定覆盖率阈值；要求每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且断言批次行为、`_openid` 隔离和失败语义本身，不断言 WXML 文本或按钮颜色。
- **Performance Testing**：不适用；`REMOVE_ALL_MAX_BATCHES` 是防止死循环的安全上限，不是性能基准测试对象。

## 7. Rationale & Context

P1-08 把 `removeAllMine()` 留成明确的 reject 骨架，是因为 CloudBase 客户端 SDK 没有「按查询条件一次性删除」的调用，只有逐文档的 `doc(id).remove()`；要清空「当前用户全部记录」必须自己写一个查询-删除循环，而这类不可逆的批量破坏性操作理应有独立的用户确认交互和测试重点，所以被单独切成 P2-08，而不是和 P1-08 的其余 CRUD 一起交付。

危险区的二次确认状态机被设计成一个独立于「请求是否在途」的状态（`RemoveAllConfirmState` vs `RemoveAllRecordsRequestState`），是因为「用户是否已经确认过」和「这次删除请求本身成功还是失败」是两件不同的事：如果把它们合并成一个状态，重试一次失败的删除就需要用户重新走一遍确认，体验上没有必要；反之如果删除请求进行中允许再次打开确认面板，会让用户在同一时刻发起第二次删除。

任意一条记录删除失败就让整个 `removeAllMine()` reject（而不是「尽力删除、报告部分成功」），是因为对用户而言「删除全部记录」的承诺是全有或全无的：一次报告成功但其实还剩几条记录的删除，比什么都不做更糟——用户会以为自己的数据已经清空，从而对隐私状态产生错误判断。重试时依靠重新查询自然从真实剩余的数据继续，不需要 `removeAllMine()` 自己记账已经删了哪些。

## 8. Dependencies & External Integrations

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page，`wx.cloud.database()` 提供真实 CloudBase 访问。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架。

### Infrastructure Dependencies
- **INF-001**: `config/cloud.ts` 导出的 `CLOUD_ENV_ID`、`CLOUD_COLLECTIONS.learningRecords`、`CLOUD_CURRENT_USER_QUERY`——Starter 已提供并由 P1-08 使用，本 Spec 直接复用，不修改。
- **INF-002**: `repositories/record-repository.ts` 的 `RecordRepository` 接口——`removeAllMine(): Promise<void>` 签名由 Starter 固定，本 Spec 只补齐 Cloud 实现。
- **INF-003**: P1-08 已实现的 `toCloudFailure`/`extractErrorCode` 错误脱敏工具函数（`repositories/cloud-record/index.ts` 内部）——本 Spec 复用，不重新实现一套错误包装。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `history` 场景——Local 数据源手工验收使用；`reset` 场景用于验收后恢复本地数据。
- **DAT-002**: 真实 CloudBase `learning_records` collection——Cloud 手工验收（AC-015）必须使用验收者自己的真实微信身份 `_openid`，不得用于验证他人数据。

## 9. Examples & Edge Cases

```ts
// 跨批次删除：5 条记录、每批只取 2 条，必须循环 3 次查询才能把当前用户的
// 集合清空；其他身份的记录必须保持不动
const repository = new CloudRecordRepository({
  cloud: stub.cloud,
  clock,
  removeAllBatchSize: 2,
})

await repository.removeAllMine()
await expect(repository.list()).resolves.toEqual([]) // 当前用户已清空
expect(stub.docs.has(otherUsersRecordId)).toBe(true) // 别人的记录没被删
```

```ts
// 边界情况：批次中一条记录删除失败（无论是 reject 还是 resolve 但
// stats.removed === 0），必须让整体调用失败，不能把这一批标记为部分成功
const stub = createCloudRecordStub({
  openid: 'me',
  failRemoveIds: { [survivorId]: 'reject' },
})

await expect(repository.removeAllMine()).rejects.toThrow(
  'CloudRecordRepository.removeAllMine',
)
expect(stub.docs.has(survivorId)).toBe(true) // 没删掉的记录必须还在
```

```ts
// 边界情况：二次确认状态机在还没确认过（idle）时收到确认调用，
// 必须拒绝而不是当作真实确认——防止一次误触就清空全部数据
confirmRemoveAll(createRemoveAllConfirmState())
// => { state: { step: 'idle' }, confirmed: false }
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增/修改的 Vitest 用例覆盖 AC-001 至 AC-012。
- 与 P1-08 相同，本 Spec 涉及真实 CloudBase 的破坏性操作，`npm run check` 通过不代表验收完成：必须在微信开发者工具中使用 Cloud 数据源、以验收者本人真实微信身份登录，针对真实 CloudBase 完成一次完整的「创建/已有记录 → 二次确认 → 删除 → 确认清空」旅程（AC-015），并由老师复核控制台数据确认没有影响其他学生的 `_openid`。
- 在微信开发者工具中使用 Local 数据源 + 「测试场景 · 历史记录」验证 AC-013、AC-014，验收后使用「测试场景 · 重置数据」恢复。
- Code Review 确认：未修改 `settings-preference`、`settings-sync` 的 Component / Feature 文件（CON-003）；未修改 Local / In-memory Repository 的 `removeAllMine()`（CON-004）；`removeAllMine()` 内的每一次查询都显式带 `_openid: CLOUD_CURRENT_USER_QUERY` 条件（CON-005）；没有任何清除 `LearningPreference` 或注销微信身份的代码路径（CON-001、CON-002）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约、`RecordRepository.removeAllMine` 语义（§5.2）
- [Spec 分配矩阵](../README.md) — P2-08 的用户成果、主要文件、测试意图与并行边界
- [产品设计](../../product-design.md) — 设置页数据与隐私相关的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — 危险区视觉规范与二次确认交互
- P1-08 云端记录与同步状态 — 完成 `CloudRecordRepository` 其余方法与 `toCloudFailure` 错误脱敏模式，本 Spec 在其基础上补齐 `removeAllMine()`
- P2-02 编辑与删除单条记录 — 单条记录删除的二次确认交互，与本 Spec 共享同一套「先确认、再删除」心智模型
