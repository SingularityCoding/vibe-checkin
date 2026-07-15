---
title: P2-04 日志关键词检索与结果反馈
version: 1.0
date_created: 2026-07-15
owner: Vibe Coding 课程组
tags: [phase-2, miniprogram, feature, log, filter]
---

# Introduction

本 Spec 交付学习日志页的关键词检索：用户可以输入关键词，实时在学习内容和今日收获中查找匹配记录，并看到结果条数与累计分钟数；无匹配时可以一键清除全部筛选条件（日期、主题、关键词）。日志页的过滤管道固定为「结构化筛选（P2-03）先执行，关键词筛选（本 Spec）后执行」，本 Spec 只消费已经被结构化筛选窄化过的记录子集，不导入、不等待、也不重新应用 P2-03 的日期/主题筛选。

## 1. Purpose & Scope

**目的**：让用户能够在学习日志里快速定位一条具体记录（例如记得内容里提到过某个关键词但不记得日期），并在筛选后清楚看到"筛选出了多少条、共多少分钟"，找不到时能一键回到未筛选状态。

**范围**：
- `miniprogram/features/log-keyword-filter/index.ts` — 纯函数 `applyKeywordFilter`、`buildFilterResultSummary`
- `miniprogram/components/log-keyword-search/index.*` — 关键词输入框、清空按钮、结果反馈与"清除全部筛选"按钮
- 对应 Vitest 测试 `tests/features/log-keyword-filter.test.ts`

**不在范围内**：
- 日期与主题的结构化筛选本身（`features/log-structured-filter/`、`components/log-structured-filters/`）——属于 P2-03，本 Spec 不导入其实现。
- 学习日志页 `pages/log/index.*` 的主要集成——P0 已经把三个组件（结构化筛选、关键词搜索、时间线）接好，并固定了「结构化筛选 → 关键词筛选 → 时间线」的调用顺序；本 Spec 只使用已经接好的组件入口，不需要成为该 Page 的主要修改范围。
- 时间线本身如何渲染分组、空状态或首次使用引导——属于 P1-05（`features/log-timeline/`、`components/log-timeline/`）；本 Spec 只提供关键词自己的"无匹配"反馈，不修改 log-timeline 的文件。

**读者假设**：实现者已经完成 `phase-1-complete` 基线，`npm run check` 全部通过，能够在微信开发者工具中打开学习日志页并看到全部记录的时间线。P2-03（日期/主题筛选）可能尚未合并；本 Spec 的独立验收使用一组预先筛选过的记录数组作为输入，不依赖 P2-03 真正产出这个子集。

## 2. Definitions

| 术语 | 含义 |
| --- | --- |
| `LearningRecord` | 一条学习记录的领域类型，字段见 [Starter Kit Contract §5.1](../../starter-kit-contract.md#51-领域类型) |
| `keyword` | 用户在关键词输入框中输入的原始字符串，可能包含首尾空白 |
| `FilterResultSummary` | 关键词筛选后的结果摘要：`{ recordCount, totalMinutes }` |
| `hasActiveFilters` | 由日志页统一计算的布尔值：日期、主题或关键词（trim 后非空）任一存在即为 `true`；日志页把同一个计算结果同时传给关键词组件和时间线组件 |
| 过滤管道 | 日志页固定的调用顺序：`applyStructuredFilters` → `applyKeywordFilter` → `buildLogTimeline`，见 [Starter Kit Contract §8.4](../../starter-kit-contract.md#84-学习日志) |
| 清除全部筛选 | 用户点击"清除全部筛选"按钮后，日志页同时把日期、主题和关键词重置为空，不是只清空关键词 |

## 3. Requirements, Constraints & Guidelines

- **REQ-001**: `applyKeywordFilter(records, keyword)` 必须先对 `keyword` 做首尾空白裁剪（trim），裁剪后为空字符串时原样返回输入的 `records`（浅拷贝），不做任何匹配过滤。
- **REQ-002**: 裁剪后非空时，必须对每条记录的 `content` 和 `takeaway`（忽略大小写）做子串匹配，`content` 或 `takeaway` 任一命中即保留该记录；`takeaway` 为 `undefined` 时按空字符串处理，不得抛错。
- **REQ-003**: `applyKeywordFilter` 必须是纯函数，只对传入的 `records` 参数进行过滤，不得读取、假设或恢复"完整记录集"；对已经被结构化筛选窄化过的子集调用时，结果必须只在该子集范围内进一步收窄，不能重新纳入子集之外的记录。
- **REQ-004**: `buildFilterResultSummary(records)` 必须返回 `recordCount`（`records.length`）与 `totalMinutes`（`records.reduce` 累加每条记录的 `duration`）；空数组返回 `{ recordCount: 0, totalMinutes: 0 }`。
- **REQ-005**: `log-keyword-search` Component 必须通过 `keyword` property 展示当前关键词，通过 `resultSummary` property 展示 `recordCount`/`totalMinutes`，用户每次修改输入框内容都必须触发 `keyword-change` 事件，`detail` 为 `{ keyword: string }`（未裁剪的原始输入，裁剪逻辑属于 Feature 层，不在 Component 里裁剪后再上报）。
- **REQ-006**: 当 `hasActiveFilters` 为 `true` 且 `resultSummary.recordCount` 为 `0` 时，Component 必须展示"没有找到匹配的学习记录"的反馈与"清除全部筛选"按钮；点击该按钮必须触发 `clear-all` 事件（无 `detail`）。
- **REQ-007**: 当 `hasActiveFilters` 为 `true` 且 `resultSummary.recordCount` 大于 `0` 时，Component 必须展示"共找到 N 条记录 · M 分钟"的结果反馈；`hasActiveFilters` 为 `false` 时不展示任何结果反馈区块（既不占位也不误导用户"当前是全部记录的统计"）。
- **REQ-008**: 关键词输入框有内容时，Component 必须提供独立的"清空"按钮，点击后只清空关键词本身（触发 `keyword-change` 且 `detail.keyword` 为空字符串），不清除日期或主题筛选；这与 REQ-006 的"清除全部筛选"是两个不同粒度的操作。
- **CON-001**: 不得导入或依赖 `features/log-structured-filter/`、`components/log-structured-filters/` 的任何文件；`applyKeywordFilter` 的输入契约就是"调用方已经完成的任意记录子集"，不关心这个子集是否经过结构化筛选。
- **CON-002**: 不得修改 `pages/log/index.*`、`features/log-timeline/`、`components/log-timeline/` 目录下的任何文件——过滤管道顺序、`hasActiveFilters` 的计算和向各组件的传递都由 P0 在日志页固定完成。
- **CON-003**: `log-keyword-search` Component 只能通过 properties 接收数据、通过 `keyword-change`/`clear-all` 事件汇报用户操作，不能直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写全局页面实例。
- **CON-004**: `keyword-change` 事件必须复用 Starter 已固定的 `KeywordChangeEventDetail` 类型（`{ keyword: string }`），不得另发一个语义相同但名称不同的事件（见 [Starter Kit Contract §7](../../starter-kit-contract.md#7-功能插槽的公开端口)）。
- **GUD-001**: 匹配逻辑统一小写化后再 `includes`，不引入正则或分词，保持和 Starter 现有纯函数一致的简单子串匹配风格。
- **PAT-001**: "清空关键词"（REQ-008）与"清除全部筛选"（REQ-006）在 UI 上分别提供独立入口，不得用同一个按钮身兼两种语义不同的操作。

## 4. Interfaces & Data Contracts

### Feature：`features/log-keyword-filter/index.ts`

```ts
export type FilterResultSummary = {
  recordCount: number
  totalMinutes: number
}

export const applyKeywordFilter = (
  records: readonly LearningRecord[],
  keyword: string,
): LearningRecord[]

export const buildFilterResultSummary = (
  records: readonly LearningRecord[],
): FilterResultSummary
```

内部辅助（不导出，实现细节）：

```ts
const normalizeKeyword = (keyword: string): string => keyword.trim().toLowerCase()

const matchesKeyword = (record: LearningRecord, normalizedKeyword: string): boolean => {
  const content = record.content.toLowerCase()
  const takeaway = (record.takeaway ?? '').toLowerCase()
  return content.includes(normalizedKeyword) || takeaway.includes(normalizedKeyword)
}
```

### Component：`components/log-keyword-search/`

| Property | 类型 | 默认值 |
| --- | --- | --- |
| `keyword` | `string` | `''` |
| `resultSummary` | `FilterResultSummary` | `{ recordCount: 0, totalMinutes: 0 }` |
| `hasActiveFilters` | `boolean` | `false` |

| Event | detail | 触发时机 |
| --- | --- | --- |
| `keyword-change` | `{ keyword: string }` | 输入框内容变化，或用户点击"清空"按钮（此时 `keyword` 为空字符串） |
| `clear-all` | 无 | 用户在"无匹配"反馈区点击"清除全部筛选" |

### Page 编排：`pages/log/index.ts`（P0 已固定，本 Spec 不修改）

```ts
rebuildView(
  records: readonly LearningRecord[],
  structuredFilter: StructuredFilterValue,
  keyword: string,
) {
  const structuredRecords = applyStructuredFilters(records, structuredFilter) // P2-03
  const filteredRecords = applyKeywordFilter(structuredRecords, keyword)      // 本 Spec

  this.setData({
    structuredFilter,
    keyword,
    filterOptions: buildStructuredFilterOptions(records, clock),
    resultSummary: buildFilterResultSummary(filteredRecords),
    timeline: buildLogTimeline(filteredRecords),
    hasActiveFilters: Boolean(structuredFilter.date || structuredFilter.tag || keyword.trim()),
  })
}
```

`onKeywordChange` 把 `log-keyword-search` 的 `keyword-change` 事件转发到 `rebuildView`；`clearAllFilters` 把 `clear-all` 事件映射为 `rebuildView(records, {}, '')`——同时重置日期、主题和关键词，不是只清空关键词。`hasActiveFilters` 这一个页面计算结果被同时传给 `log-keyword-search` 和 `log-timeline`（P1-05 的集成修复，见 §7 Rationale）。

## 5. Acceptance Criteria

- **AC-001**: Given 关键词为空字符串, When 调用 `applyKeywordFilter(records, '')`, Then 原样返回 `records`（不过滤任何记录）。
- **AC-002**: Given 关键词为纯空白字符串 `'   '`, When 调用 `applyKeywordFilter`, Then 原样返回 `records`，等同于空关键词。
- **AC-003**: Given 关键词带首尾空白 `'  Agent  '`、记录内容包含 `'Agent'`, When 调用 `applyKeywordFilter`, Then 该记录被保留（裁剪后按 `'Agent'` 匹配）。
- **AC-004**: Given 两条记录，一条 `content` 包含关键词、一条不包含, When 调用 `applyKeywordFilter(records, 'MCP')`, Then 只返回 `content` 包含 `'MCP'` 的那条。
- **AC-005**: Given 两条记录，一条 `takeaway` 包含关键词、一条不包含, When 调用 `applyKeywordFilter(records, 'Prompt')`, Then 只返回 `takeaway` 包含 `'Prompt'` 的那条。
- **AC-006**: Given 一条记录 `takeaway` 为 `undefined`、一条记录 `takeaway` 包含关键词, When 按该关键词调用 `applyKeywordFilter`, Then 不抛错，且只返回 `takeaway` 命中的那条，`takeaway` 为 `undefined` 的记录被当作不匹配处理。
- **AC-007**: Given 记录集中没有任何记录包含关键词, When 调用 `applyKeywordFilter`, Then 返回空数组 `[]`。
- **AC-008**: Given 一个已经被结构化筛选窄化过的子集（例如只剩 2 条 `2026-07-10` 且带同一个主题的记录）, When 用其中都包含的关键词调用 `applyKeywordFilter`, Then 返回的记录 `id` 集合仍然只在该子集范围内，不引入子集之外的记录（验证 REQ-003：纯函数不假设持有完整数据集）。
- **AC-009**: Given 空记录数组, When 调用 `buildFilterResultSummary([])`, Then 返回 `{ recordCount: 0, totalMinutes: 0 }`。
- **AC-010**: Given 三条记录，时长分别为 40、25、15 分钟, When 调用 `buildFilterResultSummary(records)`, Then 返回 `{ recordCount: 3, totalMinutes: 80 }`。
- **AC-011**: Given 微信开发者工具选择编译场景「测试场景 · 历史记录」打开学习日志页, When 在关键词框输入一个只出现在某条记录学习内容里的词, Then 时间线只显示该条记录，关键词组件下方显示"共找到 1 条记录 · N 分钟"。
- **AC-012**: Given 同一编译场景, When 输入一个只出现在某条记录"今日收获"里的词, Then 该条记录同样被检索到并展示在时间线中。
- **AC-013**: Given 同一编译场景, When 输入一个完全不存在于任何记录内容或收获中的关键词, Then 关键词组件显示"没有找到匹配的学习记录"和"清除全部筛选"按钮，时间线不再重复展示"还没有学习记录"的首次使用引导（该文案只在完全没有筛选条件时出现，见 §7 Rationale）。
- **AC-014**: Given AC-013 的无匹配状态, When 点击"清除全部筛选", Then 关键词、日期和主题筛选同时被重置，时间线恢复展示该 Fixture 场景的全部记录。
- **AC-015**: Given 输入框中已有关键词, When 点击输入框旁的"清空"按钮, Then 只清空关键词本身（`keyword-change` 的 `detail.keyword` 为空字符串），此前设置的日期/主题筛选（如果有）保持不变。

## 6. Test Automation Strategy

- **Test Levels**：
  - Unit（Vitest）：`applyKeywordFilter` 与 `buildFilterResultSummary` 的纯函数逻辑，覆盖 AC-001 至 AC-010。
  - 手工用户旅程（微信开发者工具）：覆盖 AC-011 至 AC-015，使用「测试场景 · 历史记录」验证内容匹配、收获匹配、无匹配反馈、清除全部筛选和单独清空关键词。
- **Frameworks**：Vitest（`vitest run`，测试文件 `tests/features/log-keyword-filter.test.ts`）、TypeScript（`tsc --noEmit`，分别检查小程序代码与测试代码）。
- **Test Data Management**：Vitest 用例使用 `buildRecord` 工厂函数构造最小 `LearningRecord`，不依赖 `FixedClock`（本 Feature 不涉及时间计算）；AC-008 的"预先筛选过的子集"用例直接在测试里手工构造一个已经窄化过的数组，模拟 P2-03 输出，不依赖 `applyStructuredFilters` 的真实实现，从而验证本 Spec 不导入、不等待 P2-03。手工验收使用 Starter 提供的 `history` Fixture 场景。
- **CI/CD Integration**：`.github/workflows/quality.yml` 在每个 PR 上运行 `npm run check`（typecheck + test:typecheck + vitest），必须全部通过才能合并。
- **Coverage Requirements**：不设固定覆盖率阈值；要求是每条 REQ 至少有一条 Vitest 或手工验收步骤覆盖，且测试断言业务规则本身（匹配结果、条数、分钟数），不断言 WXML 文本、颜色或 Fixture 条数。
- **Performance Testing**：不适用（本 Spec 是纯字符串匹配与本地计算，记录量级不需要性能测试）。

## 7. Rationale & Context

关键词匹配同时覆盖 `content` 和 `takeaway` 两个字段，是因为产品设计里"今日收获"经常包含用户后续回看时最想搜到的关键信息（例如某个具体的技术名词或反思），只搜 `content` 会让这部分记录无法被找到。

`applyKeywordFilter` 被设计成对"任意传入的记录子集"生效、而不是自己去读取全部记录，是因为日志页的过滤管道是"结构化筛选（P2-03）→ 关键词筛选（本 Spec）→ 时间线渲染（P1-05）"的串联结构（见 [Starter Kit Contract §8.4](../../starter-kit-contract.md#84-学习日志)）。如果本 Feature 内部假设或恢复"完整数据集"，就会绕开 P2-03 已经做的日期/主题收窄，导致两个筛选条件之间出现 OR 而不是 AND 的错误语义。这也是本 Spec 明确"不导入、不等待 P2-03"的原因——契约是"接受任何输入子集"，不是"必须先看到 P2-03 的实现"。

`hasActiveFilters` 由日志页统一计算并同时传给 `log-keyword-search` 和 `log-timeline` 两个组件，是 Reference Implementation 阶段发现的一个跨 Spec 一致性问题：当筛选后结果为零条时，P1-05 的 `log-timeline` 原本会展示"还没有学习记录 / 记录第一次学习"这段首次使用引导，这段文案是为"完全没有记录"设计的，一旦叠加在关键词组件已经展示的"没有找到匹配的学习记录 / 清除全部筛选"上，会让用户误以为账号里真的一条记录都没有。修复方式是给 `log-timeline` 新增 `hasActiveFilters` property，筛选激活时零结果不再重复展示首次使用文案（commit `65e0f1d`，`fix: prevent log-timeline's first-time empty state from contradicting active-filter zero-result feedback`）。这次修复改的是 P1-05 的文件和 Starter Kit Contract 的 P1-05 端口行，不属于本 Spec 的实现范围；本 Spec 只需要知道自己的 `hasActiveFilters` property 和 `log-timeline` 共享同一个页面计算结果，两者的"零结果反馈"因此不会互相矛盾。

"清空关键词"（只清空关键词框）与"清除全部筛选"（同时重置日期、主题、关键词）被设计成两个独立的按钮和事件，是因为它们服务不同的用户意图：前者是"我打错了想重新搜"，后者是"筛选条件太窄，我想看全部记录"；合并成一个操作会让用户在只想重新搜索时意外丢失已经选好的日期或主题。

## 8. Dependencies & External Integrations

本 Spec 不引入任何新的外部依赖，全部依赖已经在 Starter Kit 与 Phase 1 完成的实现中就绪：

### Technology Platform Dependencies
- **PLT-001**: 微信小程序基础库（`project.config.json` 中 `libVersion: 3.17.0`）——渲染 Component。
- **PLT-002**: TypeScript 5.x + Vitest 4.x——本 Spec 的实现语言与测试框架，版本由项目根 `package.json` 统一管理。
- **PLT-003**: TDesign MiniProgram（`t-input`、`t-button`）——关键词输入框与清空/清除按钮的 UI 组件库。

### Infrastructure Dependencies
- **INF-001**: `domain/learning-record.ts` 的 `LearningRecord` 类型（`content`、`takeaway`、`duration` 字段）——Starter 已提供，本 Spec 直接使用。
- **INF-002**: `components/vc-status-note/` ——Starter 已提供的通用状态提示组件，本 Spec 用它渲染"没有找到匹配的学习记录"文案。
- **INF-003**: `pages/log/index.ts` 的过滤管道与 `hasActiveFilters` 计算——P0 已固定，本 Spec 消费其输出（`resultSummary`、`hasActiveFilters` properties），不需要自己重新计算。

### Data Dependencies
- **DAT-001**: `fixtures/scenarios.ts` 提供的 `history` 场景——手工验收使用，由 Starter 维护，本 Spec 不需要新增 Fixture。

## 9. Examples & Edge Cases

```ts
// 空关键词：原样返回，不过滤
applyKeywordFilter(records, '')      // => [...records]
applyKeywordFilter(records, '   ')   // => [...records]，纯空白等同于空关键词
```

```ts
// 内容匹配 vs 收获匹配：两个字段任一命中即保留
const matchingContent = buildRecord({ id: 'a', content: '复习了 MCP 协议细节' })
const matchingTakeaway = buildRecord({ id: 'b', content: '整理笔记', takeaway: '下次继续深入研究 Prompt 设计' })
const noMatch = buildRecord({ id: 'c', content: '整理了单元测试用例', takeaway: '保持节奏' })

applyKeywordFilter([matchingContent, matchingTakeaway, noMatch], 'MCP')    // => [matchingContent]
applyKeywordFilter([matchingContent, matchingTakeaway, noMatch], 'Prompt') // => [matchingTakeaway]
```

```ts
// 边界情况：takeaway 为 undefined 不应抛错，也不应被当成匹配任何关键词
const withoutTakeaway = buildRecord({ id: 'a', content: '学习内容摘要', takeaway: undefined })
const withMatchingTakeaway = buildRecord({ id: 'b', content: '另一段学习内容', takeaway: '记得复盘一下' })

applyKeywordFilter([withoutTakeaway, withMatchingTakeaway], '复盘')
// => [withMatchingTakeaway]，withoutTakeaway 被排除且不抛错
```

```ts
// 纯函数契约：对已经被结构化筛选窄化过的子集调用，不重新纳入子集之外的记录，
// 模拟日志页 rebuildView() 里 applyStructuredFilters -> applyKeywordFilter 的真实调用顺序
const preFilteredSubset = [
  buildRecord({ id: 'kept-1', date: '2026-07-10', content: '复习 TypeScript 泛型', tags: ['编程'] }),
  buildRecord({ id: 'kept-2', date: '2026-07-10', content: '练习 TypeScript 类型体操', tags: ['编程'] }),
]

applyKeywordFilter(preFilteredSubset, 'TypeScript').map((r) => r.id)
// => ['kept-1', 'kept-2']，不会凭空引入子集之外、同样匹配关键词但被结构化筛选排除的记录
```

```ts
// buildFilterResultSummary：条数与分钟数聚合
const records = [
  buildRecord({ id: 'a', duration: 40 }),
  buildRecord({ id: 'b', duration: 25 }),
  buildRecord({ id: 'c', duration: 15 }),
]

buildFilterResultSummary(records) // => { recordCount: 3, totalMinutes: 80 }
buildFilterResultSummary([])      // => { recordCount: 0, totalMinutes: 0 }
```

## 10. Validation Criteria

- `npm run check`（typecheck + test:typecheck + vitest）全部通过，且新增/复用的 Vitest 用例覆盖 AC-001 至 AC-010。
- 在微信开发者工具中使用「测试场景 · 历史记录」验证 AC-011 至 AC-015：内容匹配、收获匹配、无匹配反馈与清除全部筛选、单独清空关键词。
- Code Review 确认：未修改 `features/log-structured-filter/`、`components/log-structured-filters/`、`pages/log/index.*`、`features/log-timeline/`、`components/log-timeline/` 目录下任何文件（CON-001、CON-002）；`log-keyword-search` Component 没有直接调用 `wx.getStorageSync`/`wx.cloud.database()`（CON-003）；`keyword-change` 事件的 `detail` 形状与 Starter Kit Contract 一致（CON-004）。

## 11. Related Specifications / Further Reading

- [Starter Kit Contract](../../starter-kit-contract.md) — 公共接口、目录所有权、测试契约，§7 功能插槽公开端口、§8.4 学习日志过滤管道
- [Spec 分配矩阵](../README.md) — 16 个功能的整体分工与集成闸门，P2-04 章节
- [产品设计](../../product-design.md) — 学习日志页的产品行为定义
- [UI 设计](../../ui-foundation-design.md) — 学习日志页视觉规范
- P2-03 日志日期与标签筛选 — 同一过滤管道的上游阶段，本 Spec 只消费其输出子集，不导入其实现
- P1-05 学习日志时间线 — 消费本 Spec 与 P2-03 共同产出的最终记录子集渲染时间线；其 `hasActiveFilters` property（commit `65e0f1d`）与本 Spec 共享同一个页面计算结果，避免零结果时两个组件的空状态文案互相矛盾
