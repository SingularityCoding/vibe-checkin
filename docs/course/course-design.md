# Vibe学习记 Specs-driven 协作开发课程设计

本文让 8 位同学在每个 Phase 中各领一个完整、可演示、可验收的用户功能；同一 Phase 内不需要等待其他同学的代码才能开始开发。

本文不修改最终产品范围。提醒、目标、导出等暂不进入这 16 个 Spec；它们保留在下一轮产品 Backlog，之后可以用来替换或扩展某些 Spec，而不是现在勉强塞进很小的任务中。

## 1. 总体交付节奏

```text
P0：Teacher Starter Kit
      ↓
P1：先跑通“记录—浏览—看见投入—云端保存”的最小闭环（8 个并行 Spec）
      ↓  集成、Review、合并为一个可用版本
P2：补足“回看、筛选、完整编辑、数据管理”的产品体验（8 个并行 Spec）
      ↓  集成、Review、合并为课程完成版本
```

P0 不是学生领取的第一个需求，而是老师课前提供的稳定起点。每个 Phase 内所有人从同一个 `main` 基线分支建分支；只允许依赖 P0 或前一 Phase 已合并的代码，不能把同 Phase 另一位同学的未合并 PR 当作前置条件。

### 课堂时间约束

- 开场介绍、微信开发者工具与项目结构讲解使用 15–30 分钟。
- 每个 Phase 约 60 分钟，其中实际独立开发时间按 45–50 分钟设计，剩余时间用于运行验收、提交 PR 和集成。
- 每个 Spec 必须让学生在自己的分支上独立启动、预览和验证，不把等待另一位同学的 PR 计入开发时间。
- 云环境、安全规则、共享接口、页面槽位和 Fixture 基础由老师课前准备，不能把基础设施搭建伪装成学生的用户功能。

## 2. P0：Teacher Starter Kit

P0 的完整分层、目录、Repository、页面编排、Fixture 与文件所有权以 [Starter Kit Contract](../starter-kit-contract.md) 为准。本节保留课程层面的完成定义和任务边界。

### 2.1 P0 的完成定义

学生 clone 后无需写代码即可在微信开发者工具中打开；能看到一个外观正常的、零记录状态下的 Vibe学习记。

- 三个 Tab 已存在：Today、学习日志、学习统计。
- Today 显示首次使用的正常空状态；学习日志和学习统计也显示各自正常空状态，而不是报错或演示假数据。
- 设置、记录编辑、记录详情三个路由已注册，供之后的功能进入；它们可以只是产品化的页面壳，不能占用学生要实现的具体交互。
- 全局字体、颜色、间距、按钮、空状态、加载和错误样式已统一。视觉规范属于 Starter Kit，不作为学生的零碎任务。
- 所有页面都能安全处理“零条记录”；切换 Tab、返回页面不报错。
- `project.config.json` 已配置课程小程序的 AppID，学生被老师加入开发成员后可以直接打开项目。
- CloudBase 环境 ID 由 P0 的项目配置统一提供。AppID 和环境 ID 是项目标识，不作为密钥管理；仓库仍不得包含 SecretId、SecretKey、访问令牌、个人 OpenID、真实学习记录或 `project.private.config.json`。

这样，P0 本身是一份“看起来像正常产品的空壳”，而不是一份充满 TODO、学生一运行就报错的工程。

### 2.2 P0 必须冻结的技术契约

下面的内容由老师实现并在 Phase 开始前冻结。它们是并行开发的护栏，不是要让学生分别领取的 helper task。

#### 数据契约

`LearningRecord`、`LearningPreference` 的字段和约束，以 [Vibe学习记 Product Design](../product-design.md) 为准。Starter Kit 额外给出稳定的异步仓储接口：

```ts
type RecordInput = Pick<LearningRecord, 'content' | 'duration' | 'tags' | 'takeaway'>

interface RecordRepository {
  list(): Promise<LearningRecord[]>
  get(id: string): Promise<LearningRecord | null>
  create(input: RecordInput): Promise<LearningRecord>
  update(id: string, input: RecordInput): Promise<LearningRecord>
  remove(id: string): Promise<void>
  removeAllMine(): Promise<void>
  reloadFromCloud(): Promise<LearningRecord[]>
  getSyncInfo(): Promise<SyncInfo>
}

interface PreferenceRepository {
  get(): Promise<LearningPreference>
  save(input: LearningPreference): Promise<LearningPreference>
}
```

- P0 提供一个仅用于本地开发的实现，使页面可以在没有云环境的情况下启动。
- 从第一天起接口必须是 `Promise`；页面不得直接调用 `wx.getStorageSync`、`wx.cloud.database()` 或读写 collection。
- P1-08 只替换 `RecordRepository` 的实际实现为 CloudBase 实现，页面和其他 Spec 不改调用方式。
- 本课程版本的 `defaultDuration` 可以保存在本机偏好中；最终产品承诺跨设备同步的是学习记录，而不是偏好设置。若后续要同步偏好，应新增一个独立 Spec。

#### 日期与统计契约

P0 提供可注入的本地时间接口，以及所有功能共同使用的日期键和连续学习基础函数：

```ts
interface Clock {
  now(): Date
  today(): string
}

type StreakSummary = {
  current: number
  longest: number
}
```

- 正式运行使用设备本地时间；单元测试和 Fixture 可以固定 `Clock`。
- P0 负责 `YYYY-MM-DD` 本地日期键、日期加减与连续学习的基础实现，防止 P1-01 和 P1-06 在同一 Phase 互相等待或各写一套口径。
- 学生仍需为自己的用户功能编写派生逻辑与测试，例如今日汇总、日志分组、累计指标和图表数据。

#### 页面与导航契约

P0 预先注册全部路由，并提供可以安全启动的页面骨架。学生是否需要修改 Page，由对应 Spec 的用户旅程和文件列表决定，不对 `pages/` 设置全局禁令。

```text
/pages/today/index
/pages/log/index
/pages/stats/index
/pages/record-edit/index?mode=create&from=today|log
/pages/record-edit/index?mode=edit&id=<recordId>&from=detail&returnTo=today|log
/pages/record-detail/index?id=<recordId>&from=today|log
/pages/settings/index
/pages/log/index
```

每个路由都遵循以下规则：

- 成功创建、编辑或删除后，返回来源页面并重新读取数据；不能依赖某个页面碰巧还留在内存里的旧列表。
- 记录详情页区分“记录不存在”和“读取失败”。
- `wx.switchTab` 的目标路径不能携带参数。统计页需要传 `date` 或 `tag` 时，统一使用 `wx.reLaunch({ url: '/pages/log/index?...' })`；普通 Tab 切换仍使用 `wx.switchTab`。
- 日志页在 `onLoad` 解析外部 `date` / `tag` 参数并建立初始筛选状态。用户随后在日志页修改筛选时只更新页面状态，不为每次点击重新启动页面。
- 不使用跨页面全局变量、Storage 临时键或事件总线传筛选条件。
- 同一个页面控制器在同一 Phase 只安排一位主要集成人；其他功能通过预先声明的组件事件接入。具体分配见 [Spec 分配矩阵](../specs/README.md)。

#### 组件槽位与文件边界

P0 预先把页面拼装为下列槽位。表中每个目录在一个 Phase 内只有一位负责人；其他同学只能使用其公开 properties/events，不能改里面的实现。

| 槽位 / 目录 | P0 负责的契约 | 后续负责人 |
| --- | --- | --- |
| `components/today-summary/` | 输入 Today 汇总视图模型；输出“新建记录”事件 | P1-01 |
| `components/today-activity/` | 输入全部记录；输出“查看详情”事件 | P2-01 |
| `components/record-editor/` | 输入模式、记录、默认时长；输出保存 / 放弃事件 | P1-02，P2-02 在后续阶段扩展 |
| `components/tag-picker/` | 输入已选标签与建议标签；输出完整标签数组 | P1-03 |
| `components/record-detail/` | 输入读取状态和记录；输出编辑事件 | P1-04 |
| `components/log-timeline/` | 输入已过滤记录；输出查看详情事件 | P1-05 |
| `components/log-structured-filters/` | 输入日期、标签、候选项；输出日期 / 标签筛选事件 | P2-03 |
| `components/log-keyword-search/` | 输入关键词与结果摘要；输出关键词 / 清除事件 | P2-04 |
| `components/stats-overview/` | 输入统计总览视图模型；输出首次记录事件 | P1-06 |
| `components/stats-calendar/` | 输入全部记录；输出选择日期事件 | P2-05 |
| `components/stats-seven-day-trend/` | 输入全部记录 | P2-06 |
| `components/stats-tag-rank/` | 输入全部记录；输出选择标签事件 | P2-07 |
| `components/settings-preference/` | 输入 / 输出默认学习时长 | P1-07 |
| `components/settings-about/` | 输入产品版本与隐私说明入口 | P1-07 |
| `components/settings-sync/` | 输入同步状态；输出重新同步事件 | P1-08 |
| `components/settings-danger-zone/` | 输出删除全部记录事件 | P2-08 |

这一点是并行的关键：学生交付的是一个用户看得见、能操作的完整功能，而不是一段辅助函数。需要修改 Page 的任务可以修改 Page，但同一 Phase 不会把同一个 Page 文件分配给两位同学。

同一 Phase 的 Spec 不得直接导入另一项 Spec 独占目录里的实现。需要共享的类型、日期函数、Repository 和页面事件必须在 P0 中先确定；共享页面中的组合工作由该 Phase 对应的页面主要集成人或 Starter 接线完成。

### 2.3 云环境与测试的课前准备

- 老师预先创建唯一的开发 CloudBase 环境、学习记录 collection 和“用户只可读写自己记录”的安全规则，并把环境与课程小程序关联。
- P0 统一配置 AppID 与 CloudBase 环境 ID，学生不需要手工复制环境配置。真正的凭据和个人标识继续由忽略文件或云端控制台管理。
- 学生不需要创建自己的小程序或云环境。P1-08 的学生负责代码和验证步骤；云环境配置、权限和最终部署由老师在合并时执行。
- P0 提供可切换的本地 Fixture Repository，至少能复现零记录、今天已有记录、跨日期记录和读取失败。具体 Fixture 数据与 Seed 入口在 Starter Kit 阶段单独设计，不把它塞成某位同学的“杂项任务”。
- P0 预留 `fixtures/`、单元测试和小程序自动化测试目录，并写明统一运行入口。
- 每个正式 Spec 都必须带自己的可复现验收场景和最少一组自动化或纯逻辑测试；测试责任归该 Spec 的作者，而不是最后留给一个人补。

## 3. Phase 1：最小可用闭环（8 个并行 Spec）

Phase 1 完成后，用户应该可以在同一微信账号下新建带标签的学习记录、在三个主入口看到基本结果、打开详情，并且数据已安全保存到云端。

下面列出功能切片；Page 主要集成人、独立验收入口和预计文件范围见 [Spec 分配矩阵](../specs/README.md)。

| ID | 用户可感知的功能 | 主要拥有目录 | 难度 | 验收重点 |
| --- | --- | --- | --- |
| P1-01 | Today 概览与主行动 | `components/today-summary/`、`features/today-summary/` | 中 | 首次使用 / 有历史但今天空 / 今天已有记录三种状态；显示当前连续、今日分钟、今日记录数；CTA 能进入新建记录。 |
| P1-02 | 新建一条学习记录 | `components/record-editor/`、`features/record-create/` | 中高 | 内容、时长、收获的输入与校验；新建日期只能是今天；未保存返回提醒；保存防重复点击，成功后回来源页刷新。 |
| P1-03 | 学习主题选择与新建标签 | `components/tag-picker/`、`features/tag-picker/` | 中 | 可选已有标签或输入新标签；最多 3 个、去重、去空格、单个 1–12 字；保存时把完整标签数组交给编辑器。 |
| P1-04 | 学习记录详情 | `components/record-detail/`、`features/record-detail/` | 低中 | 完整日期、时间、时长、内容、标签、收获和创建时间；保留换行；编辑入口；“不存在”和“读取失败”两个不同状态。 |
| P1-05 | 学习日志时间线 | `components/log-timeline/`、`features/log-timeline/` | 中高 | 按日期倒序分组、组内按创建时间倒序；每组显示条数 / 总分钟；顶部显示全部历史摘要；卡片可进入详情；无记录空状态。 |
| P1-06 | 学习统计总览 | `components/stats-overview/`、`features/statistics-overview/` | 高 | 当前连续、最长连续、累计打卡日、累计分钟；日期和同日多条记录的统计口径正确；零记录时只显示空状态与 CTA。 |
| P1-07 | 学习偏好与关于 | `components/settings-preference/`、`components/settings-about/`、`features/preference/` | 低中 | 默认时长可读、改、保存；只影响以后新建记录；限制 5–600 且步长 5；展示版本和隐私说明入口。 |
| P1-08 | 云端记录同步与同步状态 | `repositories/cloud-record/`、`components/settings-sync/`、`features/sync/` | 高 | CloudBase CRUD 均通过当前微信身份隔离；新建 / 重开仍可读取；展示同步中 / 已同步 / 失败；“重新同步”只从云端重读，不用本地覆盖云端。 |

### P1 Spec 的额外边界

#### P1-01：Today 概览与主行动

- 只负责顶部概览和主行动卡，不负责近 7 天日期条与今日记录列表；后两者留给 P2-01。
- 当前连续使用 P0 已冻结的连续学习函数；该 Spec 负责今日分钟、今日记录数和三种行动状态的视图模型。
- 组件不自行读取或持久化数据。

#### P1-02：新建学习记录

- 负责内容（1–300 字）、时长（5–600、步长 5）和可选收获（最多 140 字）的新建体验。
- 标签 UI 只能通过 `tag-picker` 契约取得，不修改 P1-03 的目录。
- 新建失败必须保留输入并提供重试；不实现编辑和删除，那是 P2-02。
- 表单从初始值发生变化时按 P0 契约报告 dirty 状态，由页面统一显示未保存返回提醒。

#### P1-03：学习主题选择与新建标签

- “已有标签”来自当前用户已有记录中出现过的标签；不建立独立的标签管理表。
- 新建标签仅加入当前编辑表单；只有学习记录保存成功后，它才真正成为未来可选的已有标签。
- 不加入 AI 标签推荐、标签合并或重命名。

#### P1-04：学习记录详情

- 无标签、无收获时不渲染空区域。
- “编辑”只发出标准导航事件；编辑本身属于 P2-02。
- 详情页不出现直接删除按钮。

#### P1-05：学习日志时间线

- Phase 1 的列表展示全部历史记录；P2-03 和 P2-04 分别添加筛选 UI。
- 日期组使用 `LearningRecord.date`，不把 UTC 日期转换结果当分组依据。
- 卡片只呈现摘要，详情页才呈现不截断内容。

#### P1-06：学习统计总览

- 这一项使用 P0 已冻结的连续学习函数，负责累计打卡日、累计分钟和统计总览视图模型及其单元测试；P1-01 不导入这一项的实现。
- “累计打卡日”按不同日期数，不按记录数量；标签、月历和趋势不在这里实现。
- 这份纯逻辑测试应覆盖：同日多条、今天断档但昨天有记录、跨月连续、空数据。

#### P1-07：学习偏好与关于

- 初始值为 30 分钟；以后若用户改变默认时长，不回写任何已存在记录。
- 页面不增加头像、昵称、主题或标签管理。

#### P1-08：云端记录同步与同步状态

- 所有页面仍只依赖 `RecordRepository`；禁止把 `wx.cloud` 调用散落到页面或组件。
- P0 已完成 `wx.cloud.init`、环境关联、collection、安全规则和 Repository 绑定骨架；该 Spec 不负责创建或付费开通云环境。
- 该 Spec 实现学习记录的 CloudBase Repository 与同步状态 UI，不增加云函数、离线写入队列、冲突合并或数据迁移。
- 该 Spec 实现单条记录的 `list`、`get`、`create`、`update`、`remove` 和主动重读；CloudBase 分批删除全部记录留给 P2-08。
- 需要写明老师如何验证 collection 安全规则。环境 ID 由 P0 统一配置；学生 PR 不修改环境绑定，也不提交个人 OpenID、密钥或测试记录。
- “同步失败”是实际错误状态，不得偷偷显示旧数据后标记为已同步。

## 4. Phase 1 集成闸门

合并 P1 前，老师应在一台真实设备或开发者工具完成以下黑盒旅程：

1. 首次打开为零记录状态。
2. 用默认时长创建两条今天的不同标签记录。
3. 重开小程序后，Today、日志、统计和详情都读到同一批云端数据。
4. 修改默认时长后，新建一条记录，确认历史记录时长不变。
5. 断开网络或制造云端错误后，能看到失败状态，不会假装同步成功。

只有 P1 主干稳定后，所有人再从新的 `main` 开始 P2；不要在 P1 尚未合并时提前做 P2。

## 5. Phase 2：回看与数据管理体验（8 个并行 Spec）

Phase 2 完成后，产品补齐完整编辑、日志检索、统计洞察和数据删除能力，达到 [Vibe学习记 Product Design](../product-design.md) 描述的 v1 形态。

下面列出功能切片；Page 主要集成人、独立验收入口和预计文件范围见 [Spec 分配矩阵](../specs/README.md)。

| ID | 用户可感知的功能 | 主要拥有目录 | 难度 | 验收重点 |
| --- | --- | --- | --- |
| P2-01 | Today 的近 7 天活动与今日记录 | `components/today-activity/`、`features/today-activity/` | 中 | 近 7 天有记录日期有标记但不切换首页；今日列表按创建时间倒序，卡片显示时间 / 时长 / 内容摘要 / 标签，点击进入详情。 |
| P2-02 | 编辑与删除单条学习记录 | `components/record-editor/`、`features/record-edit-delete/` | 高 | 编辑预填、日期不可改、更新 `updatedAt`；未保存返回提醒；删除二次确认，成功后返回来源页并刷新。 |
| P2-03 | 日志日期与标签筛选 | `components/log-structured-filters/`、`features/log-structured-filter/` | 中高 | 近 7 天可选 / 再点取消；标签含“全部”；日期与标签为 AND；页面控制器传入的初始 `date` / `tag` 能正确还原。 |
| P2-04 | 日志关键词检索与结果反馈 | `components/log-keyword-search/`、`features/log-keyword-filter/` | 中 | 搜索内容和收获；与日期 / 标签条件继续 AND；结果条数和分钟数同步更新；无结果可一键清除全部筛选。 |
| P2-05 | 本月学习日历 | `components/stats-calendar/`、`features/stats-calendar/` | 中高 | 本月正确排布，存在学习记录的日期有标记；点击日期跳转到带日期筛选的学习日志；空数据不展示伪造标记。 |
| P2-06 | 最近 7 天投入趋势 | `components/stats-seven-day-trend/`、`features/stats-seven-day-trend/` | 中高 | 按包含今天、向前共 7 个本地日期显示每日总分钟；没有记录显示 0；跨月、跨年时日期与分钟对应正确。 |
| P2-07 | 学习主题 Top 3 | `components/stats-tag-rank/`、`features/stats-tag-rank/` | 中 | 按“带该标签的记录数”而非时长排序；只显示前三；点击标签进入带标签条件的学习日志。 |
| P2-08 | 删除我的全部学习记录 | `components/settings-danger-zone/`、`features/remove-all-records/` | 中高 | 明确说明只删当前微信身份的数据；二次确认；成功后全部 Tab 刷新为空状态；失败保留原数据并允许重试。 |

### P2 Spec 的额外边界

#### P2-01：Today 的近 7 天活动与今日记录

- 近 7 天日期条是视觉反馈，不负责筛选或跳转；日志筛选只由 P2-03 负责。
- 列表只显示当天记录，不把历史记录塞进首页。

#### P2-02：编辑与删除单条学习记录

- 编辑复用 P1-02 已完成的表单契约，不能另造第二套字段和校验规则。
- `date` 只读显示；编辑不能补记、改日或复制一条记录。
- 编辑模式沿用 P1 的 dirty 状态与未保存返回提醒；删除操作由编辑组件先完成二次确认，再请求页面调用 Repository。
- 编辑成功回详情；删除成功根据 P0 传入的 `returnTo` 回原始 Today／日志 Tab，不能回到已失效的详情页。详情页仍然没有直接删除按钮。

#### P2-03：日志日期与标签筛选

- 实现结构化筛选的 UI 与 `date/tag` 过滤逻辑；不实现关键词输入。
- P0 页面控制器负责从启动参数解析初始筛选；该 Spec 接收初始状态并允许用户修改或清除，不在每次点击后重新启动页面。

#### P2-04：日志关键词检索与结果反馈

- 关键词匹配学习内容和今日收获；大小写与空格处理规则在正式 Spec 中固定。
- 它只负责把关键词条件应用到传入的记录并输出结果摘要。页面控制器按约定顺序组合结构化筛选与关键词筛选；P2-04 不直接导入或等待 P2-03 的实现。

#### P2-05：本月学习日历

- 仅展示当前本地月份；没有“上一月 / 下一月”按钮，也不扩展年度热力图。
- 日期点击事件使用本地 `YYYY-MM-DD`，不从 UTC 时间戳反推日期。
- 点击日期通过 `wx.reLaunch` 打开日志 Tab 并携带 `date`；不能使用带查询参数的 `wx.switchTab`。

#### P2-06：最近 7 天投入趋势

- 这里的“最近 7 天”是包含今天、向前共 7 个本地日期的滚动窗口；正式 Spec 会给出跨月和跨年的固定测试日期。
- 图表应有可读文字 / 数字，不把信息只放在颜色或柱形高度里。

#### P2-07：学习主题 Top 3

- 一条有两个标签的记录会分别为两个标签各贡献 1 次；同一条记录中不可能有重复标签。
- 无标签记录不进入排行；若标签不足三项，只显示实际存在项。
- 点击主题通过 `wx.reLaunch` 打开日志 Tab 并携带编码后的 `tag`；不能使用带查询参数的 `wx.switchTab`。

#### P2-08：删除我的全部学习记录

- 操作仅删除学习记录，不删除微信身份、不承诺注销账号，也不删除本地偏好。
- 该 Spec 同时完成 `repositories/cloud-record/` 中预留的 `removeAllMine()`；需要考虑云端分批删除的限制，页面不能自行遍历 collection。

## 6. 同 Phase 可并行的具体保证

| 风险 | 约束方式 |
| --- | --- |
| 两人修改同一个页面文件 | 每个 Page 在同一 Phase 只分配一位主要集成人；其他任务使用已接好的独立组件入口。 |
| 同学需要等别人写完数据库 | P0 的异步 `RecordRepository` 提供本地开发实现；P1-08 合并后无缝改为云端实现。 |
| Today 概览需要等统计代码 | P0 冻结本地日期与连续学习基础函数；P1-01 和 P1-06 分别拥有自己的视图模型，不互相导入。 |
| 日志三个筛选功能互相踩代码 | P2-03 只拥有日期 / 标签，P2-04 只拥有关键词；P0 控制器按固定顺序组合两者。 |
| 统计点击后不知道如何把条件交给日志 | P0 冻结 `wx.reLaunch` 与 `date` / `tag` 参数契约，不使用无法带参数的 `wx.switchTab` 或跨页面单例状态。 |
| PR 合并后页面仍是旧数据 | 每次写操作后统一回到来源页，来源页在 `onShow` 重新调用 `list()`；设置中的“重新同步”才调用 `reloadFromCloud()`。 |

这里的“可并行”不是指所有 PR 可以无顺序合并，而是指每个人可以从同一基线独立开发、独立预览、独立写测试。同一 Phase 的两个学生 PR 之间不得建立代码依赖；合并顺序只影响老师的集成操作，不影响学生开始或完成任务。

### 课堂集成与兜底

- 学生在开始开发后尽早创建 Draft PR，让 CI 和老师能持续看到改动，而不是最后 5 分钟才首次上传。
- 每个 PR 必须通过类型检查、相关测试和构建检查，并附一张截图或一段短录屏。
- 同学按预先分配的配对关系互相做一次范围检查；老师重点检查接口、越界修改和集成旅程。
- 老师课前准备 `phase-1-complete` 与 `phase-2-complete` 的 reference checkpoint。若某项课堂实现未及时通过，先保留学生 PR 继续课后修复，再使用 reference checkpoint 中对应实现解除下一阶段阻塞。
- 兜底实现只用于保持全班共同基线，不替代对学生 PR 的反馈、Review 和后续合并。

## 7. 16 个正式 Spec 应统一采用的模板

本文件只给出需求切片。之后每一个 GitHub Issue / `spec.md` 应按同一模板展开：

1. **用户故事**：谁在什么情境下完成什么目标。
2. **范围**：明确包含与明确不包含什么。
3. **已有契约**：可调用的 Repository、输入 / 输出、路由和组件 event 名。
4. **交互与异常**：加载、空态、失败、重复点击、返回等。
5. **验收场景**：可复现的 Given / When / Then，而不只是“页面好看”。
6. **测试要求**：本需求应新增或更新的 unit / fixture / 自动化测试。
7. **预计需要修改的文件**：明确正常完成路径；若实际需要跨出范围，在 PR 中说明公共契约缺口和理由。
8. **交付物**：截图或录屏、测试结果、PR 描述中的自测清单。

## 8. 课堂节奏

- 课前：老师完成 P0、CloudBase 环境、16 个 Issue、reference checkpoint、CI 和成员访问配置。
- 0:00–0:25：确认开发者工具能运行 P0；介绍小程序结构、分支、Spec、测试和验收方式。
- 0:25–1:15：P1 独立开发与持续推送；学生在完成后进行配对 Review。
- 1:15–1:30：老师完成 P1 集成闸门；学生休息并拉取新的共同基线。
- 1:30–2:20：P2 独立开发与持续推送；学生在完成后进行配对 Review。
- 2:20–2:40：老师完成 P2 集成与黑盒旅程验证。
- 2:40–3:00：发布候选版本演示，回顾每个 Spec 如何通过契约、测试和 Review 汇合为同一个产品。

如果实际合并耗时超过计划，优先使用 reference checkpoint 保证全班进入下一阶段；不能通过跳过测试和 Review 来追回时间。

## 9. 下一步

1. 按 [Starter Kit Contract](../starter-kit-contract.md) 和 [Spec 分配矩阵](../specs/README.md) 调整 P0，确认同 Phase 文件不冲突且每项功能都有独立验收入口。
2. 完成 Reference Implementation：先实现 Phase 1 并建立 `phase-1-complete` checkpoint，再实现 Phase 2 并建立 `phase-2-complete` checkpoint。
3. 用 Reference 的实际 diff、测试和课堂时间重新校准任务大小。
4. 按统一模板生成 16 份正式 Spec 和 GitHub Issue；Issue 发给学生后冻结对应 Phase 的公共契约。
