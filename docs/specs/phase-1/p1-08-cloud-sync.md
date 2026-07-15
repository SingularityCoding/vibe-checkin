---
title: P1-08 云端记录与同步状态
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, cloud, sync, repository]
---

# Introduction

本 Spec 把 `RecordRepository` 的 Cloud 实现接到真实的微信云开发（CloudBase）上，让学习记录按当前微信身份持久化，并让设置页的"云端同步"区块显示真实的同步状态与主动重新同步入口。这是 Phase 1 唯一直接对接外部基础设施（CloudBase 数据库与安全规则）的 Spec：其余 P1 任务都只操作 Local / In-memory Repository。P1-08 完成后，老师在集成 PR 中调用 `useCloudRepositories()` 把公共组合入口切到 Cloud，8 个 Phase 1 任务才共同构成"最小可用闭环"（详见 [Spec 分配矩阵 §4](../README.md)）。

## 1. Purpose & Scope

**目的**：实现 `repositories/cloud-record/index.ts` 中的 `CloudRecordRepository`，使其满足 `RecordRepository` 契约中除 `removeAllMine` 之外的全部方法（`list`、`get`、`create`、`update`、`remove`、`reloadFromCloud`、`getSyncInfo`），并在设置页展示同步状态、提供主动重新同步的操作入口。

**范围**：
- `miniprogram/repositories/cloud-record/index.ts` — `CloudRecordRepository` 类的完整实现（本 Spec 的主要交付物）
- `miniprogram/repositories/cloud-record/document.ts` — P0 已提供的 Cloud Document 双向映射（`mapCloudDocumentToLearningRecord`、`mapLearningRecordToCloudData`），本 Spec 直接复用，不重新实现
- `miniprogram/features/sync/index.ts` — `formatSyncInfo(info)`，P0 已提供完整实现（纯函数，不依赖 CloudBase），本 Spec 消费并补充测试验证
- `miniprogram/components/settings-sync/index.*` — P0 已提供完整的可见组件（`syncInfo` property、`reload` event），本 Spec 负责验证其在真实 Cloud 数据下的表现
- `tests/repositories/cloud-record.test.ts`、`tests/features/sync/index.test.ts`、`tests/repositories/composition.test.ts`（更新 Cloud 组合切换后的失败文案断言）

**不在范围内**：
- `removeAllMine()` 的 CloudBase 分批删除——由 [P2-08](../phase-2/p2-08-remove-all-records.md) 实现；本 Spec 中该方法必须保持显式的"不支持"拒绝，且不能被任何可见入口调用。
- `components/settings-danger-zone/`、`features/remove-all-records/`——P2-08 独占目录，本 Spec 不修改。
- CloudBase 环境创建、collection 创建、安全规则在控制台的部署——由老师完成，见 [CloudBase P0 配置](../../cloudbase-setup.md)。
- `pages/settings/index.ts` 的整体页面编排——P0 已经接好 `preferenceRepository.get()`、`recordRepository.getSyncInfo()`、`recordRepository.reloadFromCloud()` 与 `formatSyncInfo()` 的调用链，P1-08 不需要把该 Page 作为主要修改范围。
- `repositories/composition.ts` 的组合入口（`useCloudRepositories()`/`getCloudRepositories()`）与 `app.ts` 中 `测试场景 · 云端数据源`（`dataSource=cloud`）编译场景的接线——均已由 Starter 提供。

**读者假设**：实现者已经 clone `starter` 基线，`npm run check` 全部通过，并且能够在微信开发者工具中使用「测试场景 · 云端数据源」编译场景打开设置页。实现者需要一个已经在 CloudBase 控制台创建好 `learning_records` collection 并配置好安全规则的开发环境（见 §8 Dependencies）。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `CloudRecordRepository` | 实现 `RecordRepository` 接口、以 `wx.cloud.database()` 为数据源的 Repository，本 Spec 的核心交付物 |
| `CloudRecordClientPort` | 本 Repository 依赖的 `wx.cloud` 数据库 API 的最小结构化子集类型，真实 `wx.cloud` 结构性满足它，测试可以注入轻量 fake 而不引入小程序 SDK |
| `{openid}` (`CLOUD_CURRENT_USER_QUERY`) | CloudBase 安全规则查询占位符，运行时由 CloudBase 替换为当前请求者的真实 OpenID；代码中不出现、不读取、不打印真实 OpenID |
| `SyncInfo` / `SyncState` | 领域类型 `{ state: 'idle' \| 'syncing' \| 'synced' \| 'failed', lastSyncedAt?: number, message?: string }`，定义于 `domain/sync-info.ts` |
| `SyncInfoViewModel` | `formatSyncInfo` 的返回类型 `{ state: 'neutral' \| 'success' \| 'error', text: string }`，供 `settings-sync` 组件直接渲染 |
| Cloud Document | CloudBase collection 中的原始 JSON 文档，包含存储层专属字段 `_id`、`_openid`、`schemaVersion`，通过 `document.ts` 映射为不含这些字段的 `LearningRecord` |
| 静态错误重建 (static error rebuilding) | 本 Spec 的错误处理模式：任何 CloudBase SDK 抛出的原始错误都不会被直接向上抛出，而是重建为只包含方法名与可选 `errCode` 的新 `Error`，防止 `_openid` 或文档内容通过错误对象泄露 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `list()` 必须通过 `collection.where({ _openid: CLOUD_CURRENT_USER_QUERY }).get()` 读取当前用户的全部记录，并用 `sortRecordsNewestFirst` 排序后返回；不得省略 `_openid` 条件。
- **REQ-002**: `get(id)` 必须通过 `collection.where({ _id: id, _openid: CLOUD_CURRENT_USER_QUERY }).limit(1).get()` 查询，不得使用 `collection.doc(id).get()`（后者不会带上 `_openid` 条件，无法把"不存在"和"属于其他身份"归一为同一个安全结果）。
- **REQ-003**: `get(id)` 在查询结果为空时必须返回 `null`；记录存在但 `_openid` 不匹配当前身份时，安全规则会让该文档不出现在查询结果里，因此同样返回 `null`——调用方不能从返回值或异常区分这两种情况。
- **REQ-004**: `create(input)` 必须复用 `repositories/record-data.ts` 的 `createLearningRecord` 生成本地字段（`date`/`createdAt`/`updatedAt`/校验），再通过 `mapLearningRecordToCloudData` 转换后调用 `collection.add({ data })`；最终记录的 `id` 必须使用 CloudBase 返回的 `_id`（`String(result._id)`），不得使用本地占位符 ID。
- **REQ-005**: `update(id, input)` 必须先调用 `get(id)` 确认记录存在且属于当前身份；不存在时抛出包含 `"not found"` 字样的错误，不得静默创建新文档或更新其他身份的记录。写入后必须检查 `result.stats.updated === 0` 并在为 0 时同样抛出"not found"，防止把并发场景下的空写入误报为成功。
- **REQ-006**: `remove(id)` 遵循与 REQ-005 相同的先 `get` 后写模式：不存在时抛"not found"；`result.stats.removed === 0` 时同样视为失败。
- **REQ-007**: 除 `removeAllMine` 外，所有从 CloudBase SDK 捕获的错误必须经过统一的错误重建（等价于当前实现中的 `toCloudFailure(method, error)`）后再向上抛出：新错误只包含方法名与可选 `errCode`，不得包含原始 `error` 对象、`_openid` 或文档内容。
- **REQ-008**: `reloadFromCloud()` 必须调用内部的 `list()` 逻辑重新读取云端记录；成功时把内部 `syncInfo` 更新为 `{ state: 'synced', lastSyncedAt: clock.now().getTime(), message: '已从云端同步' }` 并返回记录数组；失败时把 `syncInfo` 更新为 `{ state: 'failed', lastSyncedAt: <上一次成功同步时间，若从未成功过则为 undefined>, message: '云端同步失败，请检查网络后重试' }`，并把原始错误继续向上抛出（不吞掉失败）。
- **REQ-009**: `getSyncInfo()` 必须返回当前内部 `syncInfo` 的浅拷贝，初始状态为 `{ state: 'idle', message: '尚未从云端同步' }`。
- **REQ-010**: `removeAllMine()` 在本 Spec 中必须保持显式拒绝——`Promise.reject`，错误信息包含 `"not supported"` 字样并说明该能力是 P2-08 的交付物；不得实现批量删除逻辑，也不得让该方法悄悄返回成功。
- **REQ-011**: `formatSyncInfo(info)` 必须把 `state: 'failed'` 映射为 `'error'`，`state: 'synced'` 映射为 `'success'`，`state: 'idle'` 与 `'syncing'` 都映射为 `'neutral'`；`text` 使用 `info.message`，`message` 为 `undefined` 时回退为固定文案 `'当前未进行同步'`。
- **REQ-012**: `wx.cloud` 在当前设备不可用时（`typeof wx === 'undefined' || typeof wx.cloud === 'undefined'`，Vitest 环境下恒真），所有需要访问 collection 的方法必须抛出包含 `"unavailable"` 字样的静态错误，不得抛出 `TypeError` 等非预期错误或返回假数据。
- **CON-001**: 不得在任何读路径上使用 `collection.doc(id).get()` 代替 `where({_id, _openid}).get()`——这是 [Starter Kit Contract §5.2](../../starter-kit-contract.md#52-数据访问接口) 明确要求的隐私不变量：查询本身必须显式限定当前身份，不能先取到别人的记录再判断权限。
- **CON-002**: `_openid` 是存储层字段，绝不能出现在返回给调用方的 `LearningRecord` 上，也不能出现在任何被抛出的错误对象的可枚举属性、`message` 字符串或序列化结果中。
- **CON-003**: 不得实现 `removeAllMine` 的批量删除、不得修改 `components/settings-danger-zone/` 或 `features/remove-all-records/`——这是 P2-08 的独占范围。
- **CON-004**: 不得修改 `repositories/composition.ts` 的组合切换函数、`app.ts` 中 `dataSource=cloud` 编译场景的接线，也不得修改 `pages/settings/index.ts` 已经写好的 Repository 调用顺序——这些都由 Starter 提供并冻结。
- **GUD-001**: 复用 `repositories/record-data.ts` 的 `createLearningRecord`、`updateLearningRecord`、`cloneRecord`、`sortRecordsNewestFirst`，不重新实现输入校验或排序规则。
- **GUD-002**: 复用 `repositories/cloud-record/document.ts` 的 `mapCloudDocumentToLearningRecord`/`mapLearningRecordToCloudData`，不重新实现 Cloud Document 与 `LearningRecord` 之间的字段映射。
- **PAT-001**: 每个访问 CloudBase 的方法内部使用统一的 `try { ... } catch (error) { throw toCloudFailure(method, error) }` 模式，避免每个方法各写一套错误处理导致泄露路径不一致。
- **PAT-002**: `update`/`remove` 遵循"先读后写"模式（先 `get` 确认归属，再执行写操作，并检查写操作的 `stats` 返回值），而不是直接尝试写入再解读错误——这让"记录不存在"和"记录存在但写入失败"始终是两条可区分、可测试的路径。

## 4. Interfaces & Data Contracts

### Repository：`repositories/cloud-record/index.ts`

```ts
// 结构化端口：真实 wx.cloud 结构性满足它，测试注入轻量 fake
export type CloudRecordDocumentRef = {
  update(options: { data: Record<string, unknown> }): Promise<{ stats: { updated: number } }>
  remove(): Promise<{ stats: { removed: number } }>
}

export type CloudRecordQuery = {
  where(condition: Record<string, unknown>): CloudRecordQuery
  limit(max: number): CloudRecordQuery
  get(): Promise<{ data: unknown[] }>
}

export type CloudRecordCollection = CloudRecordQuery & {
  doc(id: string): CloudRecordDocumentRef
  add(options: { data: Record<string, unknown> }): Promise<{ _id: string | number }>
}

export type CloudRecordDatabase = { collection(name: string): CloudRecordCollection }
export type CloudRecordClientPort = { database(config: { env: string }): CloudRecordDatabase }

export type CloudRecordRepositoryOptions = {
  cloud?: CloudRecordClientPort | null
  clock?: Clock
}

export class CloudRecordRepository implements RecordRepository {
  constructor(options?: CloudRecordRepositoryOptions)
  list(): Promise<LearningRecord[]>
  get(id: string): Promise<LearningRecord | null>
  create(input: RecordInput): Promise<LearningRecord>
  update(id: string, input: RecordInput): Promise<LearningRecord>
  remove(id: string): Promise<void>
  removeAllMine(): Promise<void>  // 本 Spec：显式 "not supported yet" 拒绝
  reloadFromCloud(): Promise<LearningRecord[]>
  getSyncInfo(): Promise<SyncInfo>
}
```

`cloud` 未传入时默认解析 `wx.cloud`（`resolveCloudClient`）；`cloud: null` 或设备未初始化云开发时，需要访问 collection 的方法均按 REQ-012 拒绝。

### Document 映射：`repositories/cloud-record/document.ts`（P0 提供，本 Spec 复用）

```ts
export type CloudLearningRecordDocument = {
  _id: string
  _openid: string
  schemaVersion: typeof CLOUD_RECORD_SCHEMA_VERSION
  date: string
  createdAt: number
  updatedAt: number
  content: string
  duration: number
  tags: string[]
  takeaway: string
}

export const mapCloudDocumentToLearningRecord: (value: unknown) => LearningRecord
export const mapLearningRecordToCloudData: (
  record: LearningRecord,
) => Omit<CloudLearningRecordDocument, '_id' | '_openid'>
```

### Feature：`features/sync/index.ts`（P0 已提供完整实现，本 Spec 消费）

```ts
export type SyncInfoViewModel = {
  state: 'neutral' | 'success' | 'error'
  text: string
}

export const formatSyncInfo = (info: SyncInfo): SyncInfoViewModel
```

### Component：`components/settings-sync/`（P0 已提供完整实现，本 Spec 负责真实数据下的验证）

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `syncInfo` | `SyncInfoViewModel` | `{ state: 'neutral', text: '' }` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `reload` | 无 | 用户点击"云端同步" cell |

### 公共配置：`config/cloud.ts`（P0 提供，只读）

```ts
export const CLOUD_ENV_ID: string
export const CLOUD_COLLECTIONS: { learningRecords: 'learning_records' }
export const CLOUD_CURRENT_USER_QUERY: '{openid}'
export const CLOUD_RECORD_SCHEMA_VERSION: 1
```

### 组合入口：`repositories/composition.ts`（P0 提供，本 Spec 不修改）

```ts
export const useCloudRepositories: () => RepositoryComposition
export const getCloudRepositories: () => { record: CloudRecordRepository; preference: PreferenceRepository }
```

开发版下访问设置页并携带 `dataSource=cloud`（即「测试场景 · 云端数据源」编译场景）会在 `app.ts` 的 `onLaunch` 中调用 `useCloudRepositories()`，把页面级 `recordRepository` 切到本 Spec 实现的 `CloudRecordRepository`；这段接线已由 Starter 提供，本 Spec 不需要也不应修改它。

## 5. Acceptance Criteria

- **AC-001**: Given 一个已初始化的 `CloudRecordRepository`, When 依次调用 `list()` 与 `get('any-id')`, Then 底层 `collection.where` 分别被以 `{ _openid: '{openid}' }` 和 `{ _id: 'any-id', _openid: '{openid}' }` 调用，`get` 额外调用 `limit(1)`。
- **AC-002**: Given 一条新记录, When 依次执行 `create` → `get` → `update`（换一个更晚的 `Clock`）→ `remove` → `get`, Then `create` 返回的记录不含 `_id`/`_openid` 属性且 `id`、`date`、`createdAt`、`updatedAt` 均由 CloudBase/`Clock` 正确生成；`update` 保留原 `id`/`date`/`createdAt`，只有 `content`、`updatedAt` 按新值变化；最终 `remove` 后再次 `get` 解析为 `null`。
- **AC-003**: Given 一个不存在的 `id`, When 调用 `update` 或 `remove`, Then 两者均以包含 `"not found"` 字样的错误 reject。
- **AC-004**: Given 一条属于身份 `someone-else` 的记录, When 当前身份为 `me` 并调用 `get`/`update`/`remove` 该记录 `id`, Then `get` 解析为 `null`，`update`/`remove` 均以"not found"拒绝——与 AC-003（记录真的不存在）在返回值和错误信息上不可区分。
- **AC-005**: Given 一个正常可用的 stub 与一个每次查询都抛错的 stub, When 分别对不存在的 `id` 调用 `get`（解析为 `null`，不 reject）与对故障 stub 调用 `get`/`list`（reject）, Then 二者行为清晰区分：读取失败必须 reject，记录真的不存在必须 resolve 为 `null`。
- **AC-006**: Given 一个抛出携带 `_openid: 'private-openid-value'` 与文档内容的错误的 stub, When 调用 `list()` 并捕获异常, Then 序列化后的错误既不包含该 OpenID 字符串也不包含文档内容，且错误对象本身没有 `_openid` 属性。
- **AC-007**: Given `cloud: null`（模拟设备未初始化微信云开发，即 Vitest 环境的真实状态）, When 调用 `list()` 或 `create()`, Then 均以包含 `"unavailable"` 字样的错误 reject。
- **AC-008**: Given 一个初始 `CloudRecordRepository`, When 依次调用 `getSyncInfo()`（初始 `idle`）→ `reloadFromCloud()`（成功）→ `getSyncInfo()`, Then 状态变为 `synced` 且 `lastSyncedAt` 等于 `clock.now().getTime()`；另起一个读取必失败的 Repository 调用 `reloadFromCloud()`, Then 该调用 reject 且随后 `getSyncInfo()` 返回 `state: 'failed'`。
- **AC-009**: Given 一个正常可用的 `CloudRecordRepository`, When 调用 `removeAllMine()`, Then 以包含 `"not supported"` 字样的错误 reject。
- **AC-010**: Given `formatSyncInfo` 分别接收 `idle`/`syncing`/`synced`/`failed` 四种 `SyncInfo`, Then 分别映射为 `neutral`/`neutral`/`success`/`error`；`message` 缺省时 `text` 回退为 `'当前未进行同步'`。
- **AC-011（手工）**: Given 微信开发者工具选择编译场景「测试场景 · 云端数据源」（`dataSource=cloud`）, When 打开设置页, Then "云端同步"区块显示的状态与真实 CloudBase 中当前微信身份下的记录状态一致（首次为 `尚未从云端同步` 或此前的真实同步结果），控制台 `cloudDiagnostics.check()` 返回 `{ ok: true, collection: 'learning_records' }`（参见 [CloudBase P0 配置 §5](../../cloudbase-setup.md)）。
- **AC-012（手工）**: Given 已在 Cloud 数据源模式下通过新建记录页写入至少一条学习记录, When 点击"云端同步" cell, Then 状态短暂显示"正在重新同步"随后变为"已从云端同步"，Today/日志页在下一次 `onShow` 读取到该记录。
- **AC-013（手工）**: Given 设备网络不可用或 CloudBase 环境暂时不可达, When 点击"云端同步", Then 状态变为"云端同步失败，请检查网络后重试"，页面上此前已显示的记录不会被清空或替换为空状态。
- **AC-014（手工）**: Given 打开开发者工具 Network/Console 面板并触发一次读取失败（例如临时修改安全规则或断网）, When 观察请求与抛出的错误, Then 错误提示和 Console 输出均不包含真实 OpenID 或其他用户的文档内容，与 AC-006 的自动化断言在真实环境下保持一致。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`CloudRecordRepository` 针对注入的 `wx.cloud` fake 的全部方法，覆盖 AC-001 至 AC-010；`formatSyncInfo` 的纯函数映射，覆盖 AC-010。
  - 手工用户旅程（微信开发者工具 + 真实 CloudBase 环境）：覆盖 AC-011 至 AC-014，使用「测试场景 · 云端数据源」编译场景连接老师配置好的开发环境。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：Vitest 用例通过 `createCloudRecordStub()`（`tests/repositories/cloud-record.test.ts` 内部辅助函数）构造一个最小的内存 `wx.cloud` fake，其 `where`/`get`/`doc().update()`/`doc().remove()` 行为刻意模拟真实安全规则（`{openid}` 解析为固定的 fixture OpenID，跨身份文档不出现在查询结果里）；`FixedClock` 固定测试时间。手工验收使用真实 CloudBase 环境和真实微信身份，不使用 Local Fixture（Fixture 编译模式始终切换到 Local/In-memory，不写共享 CloudBase，见 [CloudBase P0 配置 §7](../../cloudbase-setup.md)）。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并；CI 无法运行手工 DevTools 验收，因此手工验收结果需要在 PR 描述中单独记录。
- **Coverage Requirements**：每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖；隐私相关的 REQ（REQ-002、REQ-003、REQ-007）必须同时有 Vitest 断言（AC-004、AC-006）和手工确认（AC-014）。
- **Performance Testing**：不适用；`removeAllMine` 的批量删除性能属于 P2-08 范围。

## 7. Rationale & Context

`get`/`update`/`remove` 统一使用 `where({_id, _openid}).get()` 而不是 `collection.doc(id).get()`，是本 Spec 最核心的设计选择。CloudBase 的 `.doc(id)` 直接按 `_id` 定位文档，不会自动附加安全规则以外的应用层过滤；虽然安全规则会在真正的读写请求上生效，但让"记录不存在"与"记录存在但不属于我"在代码路径上就无法区分，才能保证——无论安全规则的具体实现细节如何——应用层永远不会把"文档存在" 和 "文档属于当前用户" 这两个不同的事实暴露给调用方。这是 [Starter Kit Contract §5.2](../../starter-kit-contract.md#52-数据访问接口) 里"记录不存在"与"记录存在但属于其他微信身份"必须归一为同一个 `null` 结果这一隐私不变量的直接落地。

统一的错误重建（`toCloudFailure`）而不是直接转发 CloudBase SDK 抛出的原始错误，是因为 CloudBase 的错误对象在实践中可能携带请求上下文（查询条件、有时是回显的 payload），如果直接 `throw error`，`_openid` 或记录内容可能通过一条日志、一次 `JSON.stringify` 或一次未处理的异常展示泄露给不该看到它的人。重建后的错误只保留方法名和 `errCode`，足够定位问题，又不会意外携带隐私数据。

`removeAllMine` 在本 Spec 阶段保持显式拒绝而不是留一个"待办"注释或悄悄返回成功，延续的是 P0 骨架的设计原则（见 `cloud-record/index.ts` 中 P0 遗留的注释）：错误地激活一个尚未完成的能力应该诚实失败，而不是报告假成功或返回空数据。P2-08 会在同一个类里补上分批查询-删除循环，但那之前，任何误触发 `removeAllMine` 的路径都能立刻被测试或人工发现。

`reloadFromCloud` 失败时保留 `previousSyncedAt` 而不是把它清空，是为了让"上一次成功同步的时间"在网络抖动、重试等场景下依然对用户可见——同步失败不等于"从来没同步成功过"。

## 8. Dependencies & External Integrations

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库的 `wx.cloud.database()` API——本 Spec 唯一直接调用的宿主 API。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——实现语言与测试框架。

### Infrastructure Dependencies
- **INF-001**: `config/cloud.ts` 提供的 `CLOUD_ENV_ID`、`CLOUD_COLLECTIONS.learningRecords`、`CLOUD_CURRENT_USER_QUERY`、`CLOUD_RECORD_SCHEMA_VERSION`——Starter 已提供，本 Spec 直接复用，不重新定义。
- **INF-002**: `repositories/record-data.ts` 的 `createLearningRecord`/`updateLearningRecord`/`cloneRecord`/`sortRecordsNewestFirst`——Starter 已提供，本 Spec 复用而不重新实现校验或排序。
- **INF-003**: `repositories/cloud-record/document.ts` 的双向映射函数——Starter 已提供安全骨架，本 Spec 直接复用。
- **INF-004**: `repositories/composition.ts` 的 `useCloudRepositories()`/`getCloudRepositories()` 与 `app.ts` 中 `dataSource=cloud` 编译场景接线——Starter 已提供，本 Spec 依赖但不修改。

### External Integrations
- **EXT-001**: 微信云开发（CloudBase）环境，环境 ID 见 `config/cloud.ts` 的 `CLOUD_ENV_ID`——由老师创建、维护开发者权限；本 Spec 不创建云环境，不管理控制台权限。
- **EXT-002**: `learning_records` collection 与其安全规则（`cloudbase/rules/learning_records.json`，`doc._openid == auth.openid`）——由老师在控制台创建并配置，规则来源见 [CloudBase P0 配置 §3-4](../../cloudbase-setup.md)；本 Spec 的查询条件（REQ-001、REQ-002）必须与该规则匹配才能通过真实环境验收。

### Data Dependencies
- **DAT-001**: 「测试场景 · 云端数据源」编译场景（`dataSource=cloud`）——手工验收唯一入口，由 Starter 在 `project.config.json` 与 `app.ts` 中提供。
- **DAT-002**: 手工验收不使用课程 Fixture（`fixtures/scenarios.ts`）；Fixture 编译模式始终切换到 Local/In-memory，绝不写入共享 CloudBase。

## 9. Examples & Edge Cases

```ts
// 隐私不变量：记录存在但属于其他身份 —— 与"记录不存在"返回完全相同的结果
const repository = new CloudRecordRepository({ cloud, clock })
await repository.get('someone-elses-record-id')      // => null，不抛错、不泄露归属信息
await repository.update('someone-elses-record-id', input) // => reject('Learning record not found: ...')
await repository.remove('someone-elses-record-id')   // => reject('Learning record not found: ...')
```

```ts
// 错误重建：即便底层 SDK 的错误对象携带了敏感字段，向上抛出的错误也不能包含它们
const stub = createCloudRecordStub({
  readError: {
    errCode: 'PERMISSION_DENIED',
    _openid: 'private-openid-value',
    data: [{ content: 'private learning record content' }],
  },
})
const repository = new CloudRecordRepository({ cloud: stub.cloud, clock })

try {
  await repository.list()
} catch (error) {
  // error.message 只包含 "CloudRecordRepository.list failed to reach CloudBase (errCode: PERMISSION_DENIED)"
  // 不包含 'private-openid-value' 或 'private learning record content'
}
```

```ts
// 同步状态：失败不清空上一次成功同步的时间
await repository.reloadFromCloud() // 成功：state 'synced', lastSyncedAt = T1
// ...网络故障...
await repository.reloadFromCloud().catch(() => {}) // 失败：state 'failed', lastSyncedAt 仍为 T1（不是 undefined）
```

```ts
// 边界情况：设备尚未初始化微信云开发（Vitest 环境下恒为此状态）
const repository = new CloudRecordRepository({ cloud: null })
await repository.list()   // => reject('... is unavailable because 微信云开发 is not initialized ...')
await repository.create(input) // 同样 reject，不返回假数据
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且 `tests/repositories/cloud-record.test.ts`、`tests/features/sync/index.test.ts`、`tests/repositories/composition.test.ts` 覆盖 AC-001 至 AC-010。
- **本 Spec 要求 Vitest 通过与真机验收同时满足，缺一不可**：Vitest 中的 `wx.cloud` 始终是手工构造的 fake（mocked），无法验证真实安全规则是否真的拒绝跨身份查询、真实网络往返的失败模式、或 CloudBase 控制台配置是否正确。必须在微信开发者工具中使用「测试场景 · 云端数据源」连接老师配置好的真实 CloudBase 环境，完成 AC-011 至 AC-014 的手工验收，才能视为本 Spec 完成。
- Code Review 确认：`get`/`update`/`remove` 均通过 `where({_id, _openid})` 而非 `.doc(id).get()` 判断归属（CON-001）；没有任何 `console.log`/序列化路径会打印 `_openid` 或原始文档内容（CON-002）；`removeAllMine` 仍是显式拒绝且未被 `settings-sync` 组件或设置页调用（CON-003、REQ-010）；未修改 `repositories/composition.ts`、`app.ts` 的 Cloud 切换接线或 `pages/settings/index.ts` 的既有调用顺序（CON-004）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) §5.2（Repository 语义与隐私不变量）、§5.3（P0/P1/测试实现分工、`_openid` 边界）、§6（Clock 与统计契约）、§7（P1-08 公开端口行）
- [CloudBase P0 配置](../../cloudbase-setup.md) — collection、安全规则、只读连接检查、P1-08 接入点
- [Spec 分配矩阵](../README.md) — P1-08 的用户成果、主要文件、测试意图与并行边界
- P1-07 学习偏好与关于 — 同一设置页的主要集成人，本 Spec 只提供 `settings-sync` 区块的数据，不修改设置页整体编排
- P2-08 删除我的全部学习记录 — 在本 Spec 交付的 `CloudRecordRepository` 之上实现 `removeAllMine` 的批量删除，是本 Spec 唯一预留但不实现的方法
