## 对应 Spec / Issue

<!-- 例如：P1-02 新建一条学习记录，closes #12 -->

Closes #

## 这个 PR 做了什么

<!-- 一两句话描述用户能看到、能操作的功能，而不是内部实现细节。 -->

## 改动文件

<!-- 列出实际改动的文件。如果改到了 Spec 文件列表之外的公共文件（Page、共享 domain、Repository 契约等），
     必须在这里说明：缺了什么契约、为什么必须改、影响范围是什么，交给 Reviewer 判断是当前 Spec 的必要工作
     还是应该先修 Starter。 -->

-

## 测试

- [ ] `npm run check`（typecheck + test:typecheck + vitest）全部通过
- [ ] 新增/修改的 Vitest 是围绕业务规则的（边界值、状态切换、错误路径……），不是 WXML 文本、固定颜色、Fixture 数量或微信框架内部行为的断言

<!-- 简单描述测试覆盖了哪些业务意图 -->

## 手工验收

<!-- 用了哪个 Fixture / 编译场景？走了一遍什么样的 Given / When / Then？ -->

- 编译场景：
- 验收步骤：
  1.
  2.
  3.
- 预期结果：

## 并行边界自查

- [ ] 没有导入/依赖同一 Phase 内另一个尚未合并的 Spec 的独占目录
- [ ] 没有修改其他 Spec 独占的 Page / Component / Feature 文件
- [ ] 复用了已有的领域常量、Clock、导航函数，没有重新定义一套数值或路由拼接方式
- [ ] 事件命名、property 命名与 Starter Kit Contract 保持一致，没有另外发一个同义但不同名的事件

## 其他说明

<!-- 有没有需要 Reviewer 额外注意的取舍、已知限制，或者需要老师确认的契约缺口？ -->
