---
title: P1-04 学习记录详情
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-1, miniprogram, feature, record-detail]
---

# Introduction

本 Spec 交付学习记录的详情页：用户从 Today 的今日记录或学习日志点进一条记录后，完整回看这条记录的日期、星期、创建时间、时长、学习主题、正文内容和今日收获，并提供唯一的下一步动作——编辑。详情页本身不提供删除、评论、分享、收藏、AI 总结或上一条／下一条导航（见 [产品设计 §7.4](../../product-design.md)）。这是一条记录生命周期中"只读查看"这一环，与"创建"（P1-02）和"编辑/删除"（P2-02）分别属于不同的 Spec。

## 1. Purpose & Scope

**目的**：让用户点击任意一条记录后，能在一个页面里看到该记录的全部字段而不丢失格式（尤其是换行），并能清楚区分"这条记录本来就不存在/已被删除"和"这次读取失败，可以重试"这两种完全不同的处境，各自给出恰当的行动。

**范围**：
- `miniprogram/features/record-detail/index.ts` — 纯函数 `buildRecordDetail`
- `miniprogram/components/record-detail/` — 展示详情、空状态（记录不存在）与错误态（读取失败）的 Component
- `miniprogram/pages/record-detail/index.ts` — 解析路由参数、调用 `recordRepository.get`、驱动 `LoadState`、编排编辑与返回学习日志的导航
- `tests/features/record-detail.test.ts` — 对应 Vitest 测试

**不在范围内**：记录的编辑与删除本身（属于 P1-02 新建流程和 P2-02 编辑删除，见 [P2-02 Spec](./p2-02-record-edit-delete.md)）、如何从学习日志或 Today 点击进入详情（属于各自入口页面的职责，本 Spec 只消费路由已解析好的 `id` 和 `from`）、时间线本身的排序与分组（属于 P1-05）。

**读者假设**：实现者已经 clone 了 `starter` 基线，`npm run check` 全部通过，能够在微信开发者工具中使用「测试场景 · 学习详情」编译场景打开详情页并看到 `history` Fixture 中 `fixture-history-yesterday` 这条记录的完整内容。实现者不需要修改 Starter Kit 已经提供的 `domain/`、`shared/date/`、`shared/navigation/`、`repositories/`、`fixtures/` 目录。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `RecordDetailViewModel` | `buildRecordDetail` 的返回类型，详情 Component 渲染所需的全部展示字段 |
| `LoadState` | `'loading' \| 'ready' \| 'error'`，定义在 `domain/load-state.ts`，语义见 [Starter Kit Contract §8.1](../../starter-kit-contract.md#81-统一加载状态) |
| `weekdayLabel` | 记录所属本地日期对应的中文星期全称（如「星期三」），由 `record.date`（不是 `createdAt`）推导 |
| `RecordListTab` | `'today' \| 'log'`，表示详情页应该返回到哪个 Tab（由 `from` 查询参数决定） |
| `记录不存在` | `recordRepository.get(id)` **成功 resolve** 但结果为 `null` 的情况；对应 `loadState: 'ready'` 且 `model: null` |
| `读取失败` | `recordRepository.get(id)` **reject** 的情况；对应 `loadState: 'error'` 且携带 `errorMessage` |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `buildRecordDetail(record)` 的 `dateLabel` 必须用 `shared/date/local-date.ts` 的 `parseLocalDate(record.date)` 解析后格式化为 `"{年}年{月}月{日}日"`（如 `2026年7月15日`），不得从 `createdAt` 重新推导。
- **REQ-002**: `weekdayLabel` 必须由 `parseLocalDate(record.date).getDay()` 索引中文星期全称数组（`['星期日', '星期一', ..., '星期六']`）得到，与 `dateLabel` 使用同一个本地日期来源。
- **REQ-003**: `timeLabel` 必须从 `record.createdAt`（UTC 毫秒时间戳）格式化为两位补零的 `HH:mm`（如 `09:05`），且只用于展示创建时刻，不参与日期或星期的判断。
- **REQ-004**: `durationLabel` 必须为 `` `${record.duration} 分钟` ``。
- **REQ-005**: `content` 必须原样保留 `record.content` 的全部换行与空行，不裁剪、不合并、不做任何格式化。
- **REQ-006**: `tags` 必须是 `record.tags` 的防御性拷贝（新数组实例），调用方修改视图模型的 `tags` 不能影响原始 `record.tags`。
- **REQ-007**: 当 `record.takeaway` 去除首尾空白后为空字符串或 `record.takeaway` 本身为 `undefined` 时，返回的视图模型**不能包含 `takeaway` 这个属性**（而不是把它设为空字符串），使 Component 能用 `wx:if="{{model.takeaway}}"` 判断是否渲染该区块。
- **REQ-008**: 页面在 `onShow` 时必须重新调用 `recordRepository.get(this.data.id)` 并重建 `model`，不能复用 `onLoad` 时缓存的旧数据（与 Starter 统一的"每次 `onShow` 重新读取"规则一致）。
- **REQ-009**: 当 `recordRepository.get(id)` **resolve 为 `null`**（记录不存在或已被删除）时，页面必须设置 `loadState: 'ready'` 且 `model: null`，交由 Component 渲染"记录不存在"的空状态，**不能**进入 `error` 状态。
- **REQ-010**: 当 `recordRepository.get(id)` **reject** 时，页面必须设置 `loadState: 'error'` 并附带 `errorMessage`（固定文案「学习记录读取失败，请稍后重试。」），与 REQ-009 的"记录不存在"明确区分。
- **REQ-011**: 点击"编辑"必须通过 `shared/navigation/routes.ts` 的 `buildEditRecordRoute(id, returnTo)` 生成路由并 `wx.navigateTo`，不得手工拼接 URL 字符串；`returnTo` 必须是页面 `onLoad` 时从 `from` 参数解析出的 `RecordListTab`（非 `'today'` 一律归一为 `'log'`）。
- **REQ-012**: "记录不存在"空状态里的"返回学习日志"行动必须调用 `wx.switchTab({ url: getMainTabRoute('log') })`，不能使用 `navigateTo` 或手工拼路径。
- **REQ-013**: Component 发出的 `retry` 事件必须只重新调用页面的 `loadRecord()`（重新请求当前 `id`），不能重新执行整个 `onLoad`/`onShow` 生命周期或丢失已解析的 `id`/`returnTo`。
- **CON-001**: 详情页不得实现或暴露删除操作；右上角只能有"编辑"一个行动入口（[产品设计 §7.4](../../product-design.md)、[UI 设计"学习详情"](../../ui-foundation-design.md)）。
- **CON-002**: `record-detail` Component 只能通过 `properties.loadState`/`model`/`errorMessage` 接收数据，通过 `retry`/`edit-record`/`return-to-log` 事件汇报用户操作，不能直接调用 `recordRepository`、`wx.getStorageSync` 或 `wx.cloud.database()`。
- **CON-003**: 日期与星期的判断必须基于 `LearningRecord.date`（本地日期字符串），不得从 `createdAt` 重新推导当天范围（[Starter Kit Contract §6](../../starter-kit-contract.md#6-时间与统计契约)）。
- **CON-004**: 不得修改 P1-05（`features/log-timeline/`、`components/log-timeline/`）或 P2-02（编辑表单内的删除交互）独占的目录；详情页只提供跳转到编辑页的入口，编辑页本身的删除按钮不属于本 Spec。
- **GUD-001**: 复用 `shared/date/local-date.ts` 的 `parseLocalDate`，不重新实现日期字符串解析或校验。
- **GUD-002**: 复用 `domain/load-state.ts` 导出的 `LoadState` 类型，不在本 Feature 内重新定义等价的联合类型。
- **PAT-001**: 页面遵循 Starter 统一的 `LoadState` 模式，但仅有三态 `LoadState` 不足以表达"记录不存在"这个业务结果——本 Spec 用 `loadState: 'ready'` 叠加 `model === null` 这个已有的、无需扩展类型的组合来表达它，把它和 `loadState: 'error'`（读取本身失败）严格分开，不新增第四个状态枚举值。

## 4. Interfaces & Data Contracts

### Feature：`features/record-detail/index.ts`

```ts
import type { LearningRecord } from '../../domain/learning-record'

export type RecordDetailViewModel = {
  id: string
  dateLabel: string
  weekdayLabel: string
  timeLabel: string
  durationLabel: string
  content: string
  tags: string[]
  takeaway?: string
}

// `record.date` (not `createdAt`) drives the date and weekday shown here; `createdAt`
// is only used to render the creation time of day, per the starter kit's date contract.
export const buildRecordDetail = (record: LearningRecord): RecordDetailViewModel
```

`weekdayLabel` 是本 Spec 在 Starter 已固定的公开端口（`buildRecordDetail` 签名、`model` property，见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)）基础上新增的返回字段，用于让详情页的元信息行（日期 · 星期 · 时间 · 时长）不需要在 Component 或 WXML 里再次做日期计算。

### Component：`components/record-detail/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `loadState` | `LoadState`（字符串） | `'loading'` |
| `model` | `RecordDetailViewModel \| null` | `null` |
| `errorMessage` | `string` | `''` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `retry` | 无 | `loadState === 'error'` 时用户点击"重新加载" |
| `edit-record` | 无 | `model` 存在时用户点击"编辑" |
| `return-to-log` | 无 | `model === null`（记录不存在）时用户点击"返回学习日志" |

Component 内部的三态渲染（`loadState === 'loading'` → `'error'` → `!model` → 正常详情）对应 `miniprogram/components/record-detail/index.wxml` 里 `wx:if`/`wx:elif` 链条的真实顺序，不能颠倒 `error` 与"记录不存在"（`!model`）两个分支的优先级——`loadState` 决定先看哪个分支，`model` 只在 `loadState === 'ready'` 时才有意义。

### Page 编排：`pages/record-detail/index.ts`

```ts
type RecordListTab = 'today' | 'log'

const parseReturnTab = (value: string | undefined): RecordListTab =>
  value === 'today' ? 'today' : 'log'

Page({
  data: {
    id: '',
    returnTo: 'log' as RecordListTab,
    loadState: 'loading' as LoadState,
    model: null as RecordDetailViewModel | null,
    errorMessage: '',
  },
  onLoad(options) {
    this.setData({ id: options.id ?? '', returnTo: parseReturnTab(options.from) })
  },
  async onShow() {
    syncNavigationTheme()
    await this.loadRecord()
  },
  async loadRecord() {
    if (!this.data.id) {
      this.setData({ loadState: 'ready', model: null })
      return
    }
    this.setData({ loadState: 'loading', errorMessage: '' })
    try {
      const record = await recordRepository.get(this.data.id)
      this.setData({ loadState: 'ready', model: record ? buildRecordDetail(record) : null })
    } catch {
      this.setData({ loadState: 'error', errorMessage: '学习记录读取失败，请稍后重试。' })
    }
  },
  retryLoad() { void this.loadRecord() },
  openEditRecord() {
    if (!this.data.id) return
    wx.navigateTo({ url: buildEditRecordRoute(this.data.id, this.data.returnTo) })
  },
  returnToLog() { wx.switchTab({ url: getMainTabRoute('log') }) },
})
```

页面同时依赖 P0 已提供的跨切面基础设施——`isFixtureReady`（编译场景就绪检查）和 `syncNavigationTheme`（导航栏深浅色同步）——这两者不是本 Spec 的公开端口，只是所有子页面共用的既有基础设施，本 Spec 不修改它们的实现。

## 5. Acceptance Criteria

- **AC-001**: Given 一条 `date: '2026-07-15'`、`createdAt` 对应 `2026-07-15 09:05`、`duration: 45` 的记录, When 调用 `buildRecordDetail(record)`, Then `dateLabel` 为 `'2026年7月15日'`、`weekdayLabel` 为 `'星期三'`、`timeLabel` 为 `'09:05'`、`durationLabel` 为 `'45 分钟'`。
- **AC-002**: Given 一条 `date: '2026-07-16'` 但 `createdAt` 对应 `2026-07-15 23:50`（日期与创建时刻横跨两个自然日）的记录, When 调用 `buildRecordDetail`, Then `dateLabel` 为 `'2026年7月16日'`、`weekdayLabel` 为 `'星期四'`（均由 `record.date` 推导）、`timeLabel` 仍为 `'23:50'`（由 `createdAt` 推导，不受 `date` 影响）。
- **AC-003**: Given `content` 为 `'第一行内容\n\n第三行内容，中间有空行'`, When 调用 `buildRecordDetail`, Then 返回的 `content` 与输入逐字符相等，包含中间的空行。
- **AC-004**: Given `tags: ['TypeScript', '组件测试']`、`takeaway: '写测试前先想清楚输入输出。'`, When 调用 `buildRecordDetail`, Then `tags` 等于 `['TypeScript', '组件测试']`、`takeaway` 等于该字符串。
- **AC-005**: Given `tags: []`、`takeaway: undefined`, When 调用 `buildRecordDetail`, Then `tags` 为 `[]`、`takeaway` 为 `undefined`（该属性不存在，而非空字符串）。
- **AC-006**: Given `takeaway: '   '`（仅空白字符）, When 调用 `buildRecordDetail`, Then `takeaway` 为 `undefined`，与"完全没填"同等对待。
- **AC-007**: Given 调用 `buildRecordDetail(record)` 后对返回值的 `tags` 数组执行 `push`, When 检查原始 `record.tags`, Then 原始记录未被修改（返回的是防御性拷贝）。
- **AC-008**: Given 微信开发者工具选择编译场景「测试场景 · 学习详情」（`fixture=history&id=fixture-history-yesterday&from=log`）, When 打开详情页, Then 页面显示该记录（"完成学习日志页面的组件拆分"）的完整日期、星期、创建时间、时长、标签（`小程序`、`UI`）、正文和今日收获；点击"编辑"进入编辑页并携带 `mode=edit&id=fixture-history-yesterday&from=detail&returnTo=log`。
- **AC-009**: Given 在开发者工具的自定义编译条件中把「测试场景 · 学习详情」的 `id` 改成一个不存在的记录 ID（如 `id=does-not-exist`）, When 打开详情页, Then `recordRepository.get` resolve 为 `null`，页面显示"这条学习记录已不存在或已被删除"空状态和"返回学习日志"按钮，**不显示**错误提示或重试按钮；点击"返回学习日志"通过 `switchTab` 回到学习日志 Tab。
- **AC-010**: Given 在开发者工具的自定义编译条件中把路径改为 `pages/record-detail/index`、query 改为 `fixture=read-error&id=<任意id>&from=log`, When 打开详情页, Then `recordRepository.get` reject，页面显示"学习记录读取失败，请稍后重试。"和"重新加载"按钮，**不显示**"记录不存在"文案；点击"重新加载"重新调用 `loadRecord()` 并再次进入 `loading` 态。
- **AC-011**: Given 已经打开「测试场景 · 学习详情」并成功显示记录, When 离开小程序当前页面再返回（触发 `onShow`）, Then 页面重新调用 `recordRepository.get` 并重建 `model`，数值保持与 Fixture 一致、不出现闪烁的旧数据或空状态。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`buildRecordDetail` 的纯函数逻辑，覆盖 AC-001 至 AC-007，见 `tests/features/record-detail.test.ts`。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-008 至 AC-011，AC-008 使用已配置好的「测试场景 · 学习详情」编译场景，AC-009、AC-010 需要在开发者工具的自定义编译条件里临时修改 `query`（改 `id` 或 `fixture`）。
- **Frameworks**：Vitest（`vitest run`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：Vitest 用例直接构造 `LearningRecord` 字面量（见 `tests/features/record-detail.test.ts` 的 `baseRecord`），不依赖 Fixture 场景；手工验收使用 Starter 提供的 `history`/`read-error` Fixture 场景，不使用真实 CloudBase 数据。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（字段值、`LoadState` 与 `model` 的组合），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯 UI 与本地格式化计算，无性能测试要求）。

## 7. Rationale & Context

`recordRepository.get(id)` 的既有语义（[Starter Kit Contract §5.2](../../starter-kit-contract.md#52-数据访问接口)）已经规定"只有在成功读取且记录确实不存在时返回 `null`；读取失败必须 reject"。本 Spec 的核心设计决策，是页面**完全不引入新的状态类型**去区分这两种结果，而是复用已有的两个信号的组合：`loadState`（三态）叠加 `model`（是否为 `null`）。`resolve(null)` 落在 `loadState: 'ready'` 分支，用 `model === null` 表达"记录不存在"；`reject` 落在 `loadState: 'error'` 分支，用 `errorMessage` 表达"读取失败"。这样 Component 的三个渲染分支（loading / error / 空状态 / 正常详情）可以严格按 `loadState` 优先判断，再在 `ready` 分支内用 `model` 二次判断，不需要给 `LoadState` 新增第四个枚举值（例如 `'not-found'`），也避免了把"记录被删除"这种正常业务结果误判为需要用户重试的系统错误——对用户来说，"这条记录不存在"和"网络/存储暂时读不到"应该有完全不同的行动号召（前者是"返回日志"，后者是"重新加载"），混为一谈会让用户对着一条已经不存在的记录反复点重试。

`weekdayLabel` 和 `dateLabel` 都从 `record.date` 而不是 `record.createdAt` 推导，是 Starter Kit 在 §6 时间契约里定下的统一规则的延伸：`date` 是记录归属的"本地学习日"，`createdAt` 只是写入的精确时刻。AC-002 特意构造了 `date` 和 `createdAt` 落在不同自然日的用例（`date: '2026-07-16'` 但 `createdAt` 是 `2026-07-15 23:50`），确保实现不会走"从时间戳反推日期"的捷径。

`tags` 返回防御性拷贝（REQ-006 / AC-007）是因为 `RecordDetailViewModel` 会被直接绑定进 Component 的 `data`，微信小程序的 `setData` 不做深冻结；如果直接引用 `record.tags` 原数组，Component 内部或未来的交互代码理论上可以修改到 Repository 内存中的原始记录，破坏"Repository 是唯一数据写入入口"（Starter Kit Contract §3）这个假设。

详情页不提供删除入口（CON-001）是产品设计的明确决定（[产品设计 §7.4](../../product-design.md)、[UI 设计"学习详情"](../../ui-foundation-design.md)）：删除是一个更谨慎的操作，被安排在编辑页末尾并需要二次确认（P2-02 的范围），详情页只负责"读"和"去编辑"，保持单一职责。

## 8. Dependencies & External Integrations

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component 与 Page。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。

### Infrastructure Dependencies
- **INF-001**: `shared/date/local-date.ts` 提供的 `parseLocalDate`——Starter 已提供，本 Spec 直接复用，不重新实现日期解析。
- **INF-002**: `shared/navigation/routes.ts` 提供的 `buildEditRecordRoute`、`getMainTabRoute`——Starter 已提供，本 Spec 只调用，不手工拼接路由字符串。
- **INF-003**: `domain/load-state.ts` 的 `LoadState` 类型——Starter 已提供，本 Spec 直接使用，不新增状态枚举。
- **INF-004**: `repositories/record.ts` 的 `recordRepository.get(id)`——数据读取的唯一入口，本 Spec 不直接访问 Storage 或 CloudBase。
- **INF-005**: `utils/theme.ts` 的 `syncNavigationTheme`、`fixtures/ready.ts` 的 `isFixtureReady`——P0 已提供的跨页面基础设施，本 Spec 的页面按既有约定调用，不修改其实现。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `history`/`read-error` 场景——手工验收使用，由 Starter 维护；`history` 场景里的 `fixture-history-yesterday` 记录是「测试场景 · 学习详情」编译场景（`project.config.json` 的 `condition.miniprogram.list`）固定引用的记录，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 日期/星期与创建时刻横跨不同自然日：dateLabel 和 weekdayLabel 只看 record.date，
// timeLabel 只看 createdAt，两者不能互相污染
const record: LearningRecord = {
  ...baseRecord,
  date: '2026-07-16',
  createdAt: new Date(2026, 6, 15, 23, 50).getTime(),
}

buildRecordDetail(record)
// => { dateLabel: '2026年7月16日', weekdayLabel: '星期四', timeLabel: '23:50', ... }
```

```ts
// 仅空白字符的收获视为未填写，不出现空的"今日收获"区块
const record: LearningRecord = { ...baseRecord, takeaway: '   ' }

buildRecordDetail(record).takeaway // => undefined，而不是 '   ' 或 ''
```

```ts
// 防御性拷贝：修改视图模型的 tags 不能影响 Repository 中的原始记录
const view = buildRecordDetail(baseRecord)
view.tags.push('额外标签')

baseRecord.tags // 仍是 ['TypeScript', '组件测试']，未被修改
```

```ts
// 页面层的边界情况：resolve(null) 与 reject 落在不同的状态组合上，
// 不能都用同一种"出错了"文案糊弄过去
try {
  const record = await recordRepository.get(id)
  // record === null → { loadState: 'ready', model: null }（记录不存在，"返回学习日志"）
} catch {
  // → { loadState: 'error', errorMessage: '...' }（读取失败，"重新加载"）
}
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且 `tests/features/record-detail.test.ts` 覆盖 AC-001 至 AC-007。
- 在微信开发者工具中使用「测试场景 · 学习详情」验证 AC-008；临时修改该场景的 `id` 为不存在的记录验证 AC-009；临时把该场景的 `fixture` 改为 `read-error` 验证 AC-010；来回切出切入页面验证 AC-011（`onShow` 重新读取）。
- Code Review 确认：详情页与 Component 没有提供删除入口（CON-001）；`record-detail` Component 没有直接调用 `recordRepository`、`wx.getStorageSync` 或 `wx.cloud.database()`（CON-002）；日期/星期判断只使用 `record.date`，未从 `createdAt` 反推（CON-003）；未修改 `features/log-timeline/`、`components/log-timeline/` 或编辑表单内的删除交互（CON-004）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门
- [产品设计](../../product-design.md) §7.4 — 学习详情的产品行为定义
- [UI 设计](../../ui-foundation-design.md)「学习详情」— 详情页视觉规范
- P1-02 新建一条学习记录 — 记录的创建入口，本 Spec 只读取已创建的记录
- P2-02 编辑与删除单条学习记录 — 详情页"编辑"按钮跳转的目标页面，删除操作在编辑页而非详情页完成
- P1-05 学习日志时间线 — 常见的进入详情页的来源入口之一，与本 Spec 互不依赖但共享 `buildRecordDetailRoute`
