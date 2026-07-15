<p align="center">
  <img src="./assets/brand.png" width="112" height="112" alt="Vibe学习记品牌图标">
</p>

<h1 align="center">Vibe学习记</h1>

<p align="center">
  记录每一段学习投入。
</p>

<p align="center">
  一个面向 Vibe Coding 课程的微信小程序协作实战项目。
</p>

## 这是什么

Vibe学习记是一款轻量学习记录工具。用户可以在完成一段学习后，用一两分钟记下学习内容、投入时长、学习主题和当日收获，之后通过日志与统计回看自己持续学习的轨迹。

它也是 Vibe Coding 课程的 Specs-driven 协作实战：8 位同学围绕明确的 Spec、共享工程契约、独立分支和 Pull Request，共同完成同一个可以真正使用的微信小程序。

## 我们要共同完成什么

- **快速记录**：记录学习内容、时长、主题与收获。
- **学习日志**：按日期、主题和关键词回找学习记录。
- **学习统计**：看见连续学习、投入时长和主题积累。
- **云端同步**：同一微信身份可以在不同设备上读取自己的记录。

Vibe学习记不是待办清单、番茄钟、课程管理器或社交打卡平台。它不用排行榜和强游戏化制造学习压力。

## 课程如何进行

```text
Teacher Starter Kit
        ↓
Phase 1：跑通“记录—浏览—统计—云端保存”的最小闭环
        ↓
集成、Review，形成新的共同基线
        ↓
Phase 2：补齐筛选、编辑、日历、趋势和数据管理
        ↓
最终集成与产品验收
```

每位同学在每个 Phase 中领取一个完整、可演示、可验收的用户功能，而不是一个孤立的 helper 或练习 Demo。

同一 Phase 内，所有同学从同一个 `main` 基线创建功能分支；不把另一位同学尚未合并的代码当作前置条件。

> [!IMPORTANT]
> 开始编码前，请先确认老师当堂公布的基线、你领取的 GitHub Issue 和对应 Spec。课程仓库的 `main` 分支受保护，不要直接向 `main` 推送代码。

## 从这里开始

### 如果你是学员

1. 课前先完成[**学生课前准备**](./docs/course/prerequisite.md)。
2. 课堂上接受老师分配的 GitHub Issue。
3. 阅读对应 Spec，确认用户故事、文件边界与验收场景。
4. 从当前 `main` 创建自己的功能分支。
5. 完成实现、测试和微信开发者工具中的用户旅程验证。
6. 推送分支并创建 Pull Request，等待 Review 与集成。

### 如果你是老师或助教

- 从[**课程设计**](./docs/course/course-design.md)了解课程节奏、Phase 边界和集成闸门。
- 通过[**Spec 分配矩阵**](./docs/specs/README.md)分配功能和确认独立验收入口。
- 按[**CloudBase P0 配置**](./docs/cloudbase-setup.md)准备课程云环境和安全规则。
- 在每个 Phase 合并后执行共同用户旅程，确认主干仍是一个可用产品。

## 快速开始

### 环境要求

- Git
- Node.js 20、22、24 或更高版本
- npm
- GitHub CLI
- 微信开发者工具稳定版
- 课程小程序的开发成员权限

完整账号与安装清单见[**学生课前准备**](./docs/course/prerequisite.md)。

### 获取并检查项目

```bash
git clone https://github.com/SingularityCoding/vibe-checkin.git
cd vibe-checkin
npm ci
npm run check
```

`npm run check` 会依次执行应用 TypeScript 检查、测试 TypeScript 检查和 Vitest。

### 在微信开发者工具中打开

1. 打开微信开发者工具并使用自己的微信登录。
2. 选择“导入项目”。
3. 选择刚刚 Clone 的 `vibe-checkin` 根目录。
4. 打开项目，确认 Today、学习日志和学习统计三个 Tab 可以正常切换。

Starter Kit 内置了空数据、今日记录、历史记录、读取失败等 Fixture 场景，可以从微信开发者工具的编译模式中直接选择。

> [!NOTE]
> 项目 AppID 和 CloudBase 环境由老师统一准备。学员不需要自己注册小程序、申请 AppID 或创建云环境。

## 文档地图

| 你想知道什么 | 阅读文档 |
| --- | --- |
| 课前安装、账号和权限要求 | [学生课前准备](./docs/course/prerequisite.md) |
| 最终产品的范围、页面、状态和业务规则 | [产品设计](./docs/product-design.md) |
| 颜色、排版、组件和明暗主题规范 | [UI 设计](./docs/ui-foundation-design.md) |
| 课程节奏、两个 Phase 与集成方式 | [课程设计](./docs/course/course-design.md) |
| 16 个功能的分工、边界与验收入口 | [Spec 分配矩阵](./docs/specs/README.md) |
| 公共接口、目录所有权和测试契约 | [Starter Kit Contract](./docs/starter-kit-contract.md) |
| 云环境、collection 和安全规则 | [CloudBase P0 配置](./docs/cloudbase-setup.md) |

> [!TIP]
> 学员不需要在开始前把所有文档从头到尾读完。先读自己的 Spec，再按 Spec 指向查阅相关产品规则和工程契约。

## 项目结构

```text
vibe-checkin/
├─ miniprogram/         # 小程序页面、组件、业务逻辑和数据访问
├─ cloudbase/          # CloudBase 安全规则
├─ tests/              # Vitest 单元测试与 Repository 契约测试
├─ docs/               # 产品、UI、课程、Spec 和工程文档
├─ assets/             # 品牌素材与文档图片
├─ project.config.json # 微信开发者工具项目配置
└─ package.json        # Node.js 依赖与质量检查命令
```

小程序代码按下列方向分层：

```text
pages → components → features → domain
   └→ repositories → local / cloud adapters
```

Component 通过 properties 接收数据，通过 events 报告用户操作；Repository 是业务数据的唯一读写入口。完整依赖规则见 [Starter Kit Contract](./docs/starter-kit-contract.md)。

## 开发与验收

```bash
npm run typecheck       # 检查小程序 TypeScript
npm run test:typecheck  # 检查测试 TypeScript
npm test                # 运行 Vitest
npm run check           # 执行上述全部检查
```

每个 Spec 至少需要交付：

- 一个可在微信开发者工具中看见、操作和验收的用户功能；
- 一组有业务意图的 Vitest；
- 一条可复现的手工用户旅程；
- 一个通过质量检查、边界清楚的 Pull Request。

## 协作边界

- 页面、组件和 Feature 不直接读写 Storage 或 CloudBase，业务数据统一通过 Repository 访问。
- 同一 Phase 内不导入另一 Spec 的独占目录。
- 如果必须修改 Spec 文件列表之外的公共文件，需在 PR 中说明原因和影响。
- 新建、编辑或删除成功后，页面应从 Repository 重新读取数据，不依赖其他页面的旧内存状态。

## 数据与安全

- 仓库可以包含课程统一使用的 AppID 和 CloudBase 环境 ID，但不能包含任何密钥或个人数据。
- 不要提交 SecretId、SecretKey、访问令牌、真实 OpenID、真实学习记录或 `project.private.config.json`。
- 不要把密码、Token、验证码、临时登录二维码或其他认证信息粘贴给 AI 或发送到课程群。
- 每位用户只能读写自己的学习记录；CloudBase 安全规则由老师在集成前验证。
