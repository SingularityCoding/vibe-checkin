---
name: Spec 任务
about: 领取一份正式 Spec（Phase 1 或 Phase 2 的某个用户功能）
title: "[P?-??] "
labels: spec
assignees: ''
---

## Spec ID

<!-- 例如 P1-02，对应 docs/specs/phase-1/ 或 docs/specs/phase-2/ 下的正式 Spec 文档 -->

## 用户成果

<!-- 完成后用户能看见、操作、验收的具体功能是什么？照抄或提炼自正式 Spec 的“用户成果”一节。 -->

## 主要文件

<!-- 完成该功能预计需要修改的 Page / Component / Feature / Repository / 测试文件清单，来自正式 Spec 的“主要文件”一节。
     这份清单划的是并行边界，不是不能修的禁区——如果实现中发现必须改清单之外的公共文件，在 PR 里说明理由。 -->

-

## 独立验收入口

<!-- 用哪个编译场景 / Fixture 能独立打开、操作、验收这个功能，不依赖同 Phase 其他 Spec 先合并？ -->

## 测试意图

<!-- 这个 Spec 的 Vitest 至少要覆盖哪些业务规则？边界值、状态切换、错误路径…… -->

-

## 并行边界

<!-- 明确写出：这个 Spec 不实现什么、不能碰哪些其他 Spec 独占的目录、依赖哪些已经在 Starter 里接好的安全默认实现。 -->

-

## 参考文档

- Spec 分配矩阵：`docs/specs/README.md`
- Starter Kit Contract：`docs/starter-kit-contract.md`
- 产品设计：`docs/product-design.md`
- UI 设计：`docs/ui-foundation-design.md`
