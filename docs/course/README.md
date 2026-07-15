# 微信小程序 Specs-driven 协作开发课程

这里是“Vibe学习记”课程文档的入口地图。项目代码、产品设计、工程契约、课程设计和学生 Spec 统一保存在 `vibe-checkin` 仓库中。

## 文档地图

| 文档 | 用途 | 主要读者 |
| --- | --- | --- |
| [课程设计](./course-design.md) | 课程目标、三小时节奏、P0、两个 Phase、并行边界与集成方式 | 老师、助教 |
| [学生课前准备](./prerequisite.md) | 课前安装、账号准备、微信开发者工具登录与信息提交 | 学生 |
| [产品设计](../product-design.md) | 最终产品范围、页面、功能、状态和业务规则 | 老师、学生、Reviewer |
| [UI 设计](../ui-foundation-design.md) | 颜色、排版、组件和明暗主题规范 | 老师、学生、Reviewer |
| [Spec 分配矩阵](../specs/README.md) | 两个 Phase 的 16 个功能、Page 分配、独立验收入口和测试意图 | 老师、助教 |
| [Starter Kit Contract](../starter-kit-contract.md) | P0 架构、公共接口、组件插槽、文件边界和测试契约 | 老师、学生、AI Agent |
| [CloudBase P0 配置](../cloudbase-setup.md) | 环境、collection、安全规则与连接验证 | 老师 |

正式 Spec 后续在分配矩阵的基础上统一放在：

```text
docs/specs/
├─ phase-1/
└─ phase-2/
```

## 使用顺序

学生在课前先完成[学生课前准备](./prerequisite.md)。课堂领取 GitHub Issue 后，再阅读自己负责的 Spec、相关产品设计和 Starter Kit 契约。

老师和助教先维护[课程设计](./course-design.md)与[Spec 分配矩阵](../specs/README.md)，通过 Reference Implementation 验证工作量与接口后，再生成两个 Phase 的正式文件和对应 GitHub Issues。
