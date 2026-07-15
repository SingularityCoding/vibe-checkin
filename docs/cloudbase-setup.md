# Vibe学习记 CloudBase P0 配置

## 1. 目的与边界

这一层只完成 Starter Kit 的 CloudBase 基础接入：固定环境、初始化 SDK、定义 collection、保存安全规则来源、冻结云端 DTO，并提供只读连接检查。

当前默认 `RecordRepository` 仍然是 Local。本文不会实现 P1-08 的 Cloud CRUD，也不会把 Fixture 写入 CloudBase。

## 2. 仓库中的公共配置

公共配置集中在 `miniprogram/config/cloud.ts`：

- 环境 ID：老师已经创建并关联的小程序云环境。
- collection：`learning_records`。
- 当前用户查询占位符：`{openid}`。
- 云端记录 schema version：`1`。

环境 ID 和 collection 名称用于路由到公共开发资源，不是密码或访问密钥，可以随 Starter Kit 分发。仓库中不能出现 OpenID、真实学习记录、云 API 密钥或控制台登录凭据。

## 3. 创建 collection

在微信开发者工具中打开“云开发”，或进入 CloudBase 网页控制台：

1. 确认当前环境与 `miniprogram/config/cloud.ts` 一致。
2. 打开“文档型数据库 / 集合管理”。
3. 创建 collection：`learning_records`。
4. 不要添加真实学生数据，也不要手动填写 `_openid`。

> [截图待补：CloudBase 环境名称与环境 ID]

> [截图待补：创建 `learning_records` collection]

## 4. 配置安全规则

打开 `learning_records` 的“权限管理”，切换到“安全规则”，粘贴 `cloudbase/rules/learning_records.json`：

```json
{
  "read": "doc._openid == auth.openid",
  "write": "doc._openid == auth.openid"
}
```

该规则让小程序客户端只能读写自己创建的记录。使用安全规则后，查询必须显式包含：

```ts
where({ _openid: '{openid}' })
```

不带这一条件的 collection 查询会被权限系统拒绝。`{openid}` 由 CloudBase 在请求时替换，代码不需要也不允许读取、硬编码或提交真实 OpenID。

`cloudbase/rules/learning_records.json` 是可 review 的规则来源，目前不会自动部署；控制台规则修改完成后需要人工核对它与仓库文件一致。

> [截图待补：`learning_records` 安全规则编辑器与保存成功状态]

## 5. 运行只读连接检查

重新编译开发版小程序，在开发者工具 Console 执行：

```js
await getApp().cloudDiagnostics.check()
```

成功结果应包含：

```js
{
  ok: true,
  collection: 'learning_records'
}
```

检查只会执行当前用户条件下的 `limit(1)` 读取，不会创建、修改、返回或打印学习记录。失败时只返回安全的错误码与固定提示，重点检查：

- 环境是否一致。
- collection 名称是否为 `learning_records`。
- 是否已经保存安全规则。
- 当前微信号是否已被添加为小程序开发者。

## 6. 安全边界

- 数据库安全规则保护的是小程序客户端请求；控制台和服务端管理能力具有更高权限。
- 课程开发期间不保存敏感或真实隐私数据。
- `_openid` 只存在于 CloudBase 文档层，映射到 `LearningRecord` 时必须删除。
- 学生不能把 OpenID、控制台截图中的个人数据或错误日志中的凭据提交到 GitHub 或发送给 AI。
- 课程结束后，老师应复查开发者成员和环境权限，移除不再需要的账号。

## 7. P1-08 接入点

P1-08 只在 `repositories/cloud-record/` 内实现 Cloud Repository，并复用：

- `CLOUD_ENV_ID` 与 `CLOUD_COLLECTIONS`。
- `_openid: '{openid}'` 查询条件。
- `mapCloudDocumentToLearningRecord()`。
- `mapLearningRecordToCloudData()`。

集成验证通过前，`repositories/composition.ts` 继续默认使用 Local。Fixture 编译模式始终切换到 Local 或 In-memory，不写共享 CloudBase。
