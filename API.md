# 变更单管理 API 接口说明

本文档依据当前 **OpsFlow 前端原型**（`src/types.ts`、`ChangeOrderManager`、`ApprovalGateView`、`ChangeOrderDeploymentView`、`DeploymentHistoryView`）梳理，供后端系统服务实现与联调使用。

---

## 1. 约定

### 1.1 基础信息

| 项 | 说明 |
|----|------|
| 建议前缀 | `/api/v1`（下文路径均省略此前缀，由网关统一拼接） |
| 协议 | HTTPS |
| 格式 | `Content-Type: application/json` |
| 字符编码 | UTF-8 |
| 时间字段 | 建议使用 **ISO 8601**（如 `2024-04-19T09:00:00Z`）；前端部分造数使用可读字符串，后端可统一为 ISO |

### 1.2 认证（需后端实现）

| 项 | 说明 |
|----|------|
| 方式 | 建议 `Authorization: Bearer <access_token>` |
| 创建人 | 新建变更单时 `creator` 应由服务端从当前登录用户解析，**不信任**客户端随意传入 |

### 1.3 统一错误响应（建议）

```json
{
  "code": "CHANGE_ORDER_NOT_FOUND",
  "message": "变更单不存在",
  "details": null
}
```

HTTP 状态码：`400` 参数错误、`401` 未认证、`403` 无权限、`404` 资源不存在、`409` 状态冲突、`422` 业务规则不满足、`500` 服务器错误。

### 1.4 分页（列表接口）

查询参数建议：

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | int | 页码，从 **1** 开始 |
| `pageSize` | int | 每页条数，默认如 `10` 或 `20`，上限如 `100` |

响应体建议：

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "pageSize": 10
}
```

### 1.5 与主数据的关系

变更单中引用：

- `scenarioIds[]` → **部署场景**（`DeploymentScenario.id`）
- 步骤中 `templateId` → **部署模板**（`DeploymentTemplate.id`）
- `scenarioId`（步骤级）→ 与上一致
- `environmentId` → **部署环境**（与环境管理服务中的环境条目 ID 对应）

创建/更新时应校验 ID 存在且未被停用；具体场景/模板 API 可在「场景与模板服务」中定义，本文仅标注**依赖关系**。

---

## 2. 数据模型摘要

与前端 `types.ts` 对齐；字段名建议保持一致，便于联调。

### 2.1 `DeploymentStatus`（变更单总状态）

枚举：`pending` | `approving` | `deploying` | `success` | `failed` | `rollback`

前端语义参考：

| 值 | 界面含义 |
|----|----------|
| `pending` | 待提交（如审批驳回后） |
| `approving` | 审批中 |
| `deploying` | 部署中 |
| `success` | 已完成 |
| `failed` | 已失败 |
| `rollback` | 已回滚 |

### 2.2 `ChangeOrder`（变更单）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 变更单号，如 `CR-20240419-001`，建议服务端生成 |
| `title` | string | 是 | 标题 |
| `application` | string | 是 | 应用标识 |
| `environmentId` | string | 是 | 目标部署环境 ID |
| `environmentName` | string | 否 | 提交时快照名称，便于展示 |
| `environmentCode` | string | 否 | 环境编码，如 prod、staging |
| `deploymentPackage` | string | 否 | 制品/包名（订单级；步骤上也可有） |
| `description` | string | 是 | 描述 |
| `creator` | string | 是 | 创建人（服务端填充） |
| `createdAt` | string | 是 | 创建时间 |
| `updatedAt` | string | 否 | 最后更新时间（建议补充，便于列表排序） |
| `status` | DeploymentStatus | 是 | 总状态 |
| `scenarioIds` | string[] | 是 | 涉及部署场景 ID 列表 |
| `version` | string | 是 | 发布版本号 |
| `steps` | ChangeOrderStep[] | 是 | 编排步骤 |
| `releaseStrategy` | ReleaseStrategyConfig | 否 | `kind`: `canary` \| `full` |
| `validationConfig` | ChangeOrderValidationConfig | 否 | 验证编排 |
| `rollbackConfig` | ChangeOrderRollbackConfig | 否 | 回滚约定 |
| `canaryConfig` | object | 否 | **deprecated**，兼容旧数据 |

### 2.3 `ChangeOrderStep`（步骤）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 步骤 ID，建议服务端生成或保证唯一 |
| `order` | number | 顺序，从 1 递增 |
| `type` | `deployment` \| `pipeline_action` | 步骤类型 |
| `name` | string | 展示名称 |
| `status` | `pending` \| `running` \| `success` \| `failed` | 步骤状态 |
| `templateId` | string | `type=deployment` 时 |
| `actionType` | `build` \| `test` \| `approval` \| `scan` \| `gate` | `type=pipeline_action` 时 |
| `scenarioId` | string | 可选，关联场景 |
| `deploymentPackage` | string | 可选，步骤级制品 |
| `subSteps` | ChangeOrderSubStep[] | 可选 |
| `executeStartedAt` / `executeEndedAt` | string | 可选 |

### 2.4 `ChangeOrderSubStep`（子步骤）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 必填 |
| `name` | string | 必填 |
| `status` | `pending` \| `running` \| `success` \| `failed` | 与前端一致 |

### 2.5 `ChangeOrderValidationConfig` / `ChangeOrderValidationItem`

- `monitorWindowMinutes`: number  
- `notes`: string  
- `items[]`: `id`, `scenarioId`, `name`, `kind`（`smoke` \| `probe` \| `metrics` \| `manual_gate` \| `custom`）

### 2.6 `ChangeOrderRollbackConfig`

- `strategy`: `manual` \| `auto_previous_version`  
- `gate`: `standard` \| `approval_first` \| `on_demand`  
- `notes`: string  

---

## 3. 接口清单

### 3.1 变更单 — 列表

**`GET /change-orders`**

**查询参数（与前端「搜索 / 筛选 / 时间范围」预留能力对齐）**

| 参数 | 说明 |
|------|------|
| `page`, `pageSize` | 分页 |
| `keyword` | 可选，匹配标题、`id`、应用等 |
| `status` | 可选，单个或逗号分隔多状态 |
| `application` | 可选 |
| `createdFrom` / `createdTo` | 可选，创建时间范围 |
| `sort` | 可选，如 `createdAt:desc` |

**响应**：分页结构，`items` 为 `ChangeOrder[]`（列表页可返回**精简字段**以减负，但需包含表格与状态徽标所需字段）。

---

### 3.2 变更单 — 详情

**`GET /change-orders/{changeOrderId}`**

**响应**：完整 `ChangeOrder`。

**错误**：`404` 不存在。

---

### 3.3 变更单 — 创建

**`POST /change-orders`**

**请求体**：与前端新建向导提交内容对齐（服务端生成 `id`、`creator`、`createdAt`，并校验场景/模板）。

建议请求体（客户端可省略只读字段）：

```json
{
  "title": "string",
  "application": "string",
  "environmentId": "env-1",
  "description": "string",
  "version": "string",
  "deploymentPackage": "string",
  "scenarioIds": ["scen-container"],
  "steps": [],
  "releaseStrategy": { "kind": "canary" },
  "validationConfig": {},
  "rollbackConfig": {}
}
```

**业务规则（与当前前端一致）**

- 新建成功后前端当前逻辑将状态置为 **`approving`**（审批中）；若后端支持草稿，可增加 `status: pending` 与单独「提交审批」接口。
- `environmentId` 须为有效部署环境 ID；服务端可回写 `environmentName` / `environmentCode` 快照。

**响应**：`201`，Body 为完整 `ChangeOrder`。

**错误**：`422` 场景/模板无效、步骤数据不合法等。

---

### 3.4 变更单 — 更新（部分字段）

**`PATCH /change-orders/{changeOrderId}`**

用于元数据修正、非执行态下的编辑（是否允许由业务规则约束）。

**请求体**：`ChangeOrder` 的部分字段（如 `description`、`deploymentPackage`、仅在 `pending` 下可改 `steps` 等）。

**错误**：`409` 当前状态不允许修改。

---

### 3.5 变更单 — 删除

**`DELETE /change-orders/{changeOrderId}`**

**业务规则**：仅允许特定状态下删除（如 `pending` / `approving` / `failed`，由产品定义）。

**响应**：`204` 无内容，或 `200` 带删除结果。

---

### 3.6 审批 — 通过

**`POST /change-orders/{changeOrderId}/approval:approve`**

（路径也可用 `/approve`，与团队风格统一即可。）

**效果**：`approving` → `deploying`（或先进入「待执行」再由「开始部署」触发，需与产品一致；**当前前端**：通过后为 `deploying`）。

**请求体（可选）**

```json
{
  "comment": "审批意见"
}
```

**错误**：`409` 非 `approving` 状态。

---

### 3.7 审批 — 驳回

**`POST /change-orders/{changeOrderId}/approval:reject`**

**效果**：`approving` → `pending`（与当前 `ApprovalGateView` 一致）。

**请求体（可选）**

```json
{
  "reason": "驳回原因"
}
```

---

### 3.8 部署 — 启动整单执行（可选拆分）

**`POST /change-orders/{changeOrderId}/deployment:start`**

将变更单置为执行中（若尚未处于 `deploying`），并触发编排引擎/流水线。  
若「审批通过」已自动进入 `deploying` 并启动任务，本接口可简化为幂等或仅用于「从暂停恢复」等扩展。

**错误**：`409` 未审批通过、已完成等。

---

### 3.9 步骤级 — 执行 / 中断 / 重试

与部署页「主步骤 / 子步骤」按钮对应；实际应由**编排服务**驱动状态，API 为触发入口。

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/change-orders/{id}/steps/{stepId}/actions:execute` | 执行主步骤 |
| `POST` | `/change-orders/{id}/steps/{stepId}/actions:interrupt` | 中断（仅 running 有意义） |
| `POST` | `/change-orders/{id}/steps/{stepId}/actions:retry` | 重试 |
| `POST` | `/change-orders/{id}/steps/{stepId}/sub-steps/{subStepId}/actions:execute` | 执行子步骤 |
| `POST` | … | `interrupt` / `retry` 同理 |

**请求体**：可选 `operator`、`comment`、扩展负载。

**说明**：前端当前为演示，未持久化；落地后应由异步任务更新 `steps`/`subSteps` 的 `status` 与时间戳。

---

### 3.10 验证编排 — 执行（按场景 / 按节点）

与部署页「验证」区域对应，可按资源拆分为：

**`POST /change-orders/{changeOrderId}/validation:executeScenario`**

```json
{ "scenarioId": "scen-container" }
```

**`POST /change-orders/{changeOrderId}/validation:executeItem`**

```json
{ "itemId": "val-demo-1" }
```

执行结果可写回扩展字段或由独立「验证记录」表存储。

---

### 3.11 回滚 — 触发

**`POST /change-orders/{changeOrderId}/rollback:execute`**

结合 `rollbackConfig.strategy` / `gate` 做权限与流程校验（如需二次审批，应先走审批子流程）。

**请求体（可选）**

```json
{
  "reason": "线上故障",
  "targetVersion": "v1.2.3"
}
```

**效果**：总状态更新为 `rollback` 或进入回滚中子状态（若后端细分）。

---

### 3.12 制品 / 附件上传（可选）

当前前端仅为**本地文件名**。若需真实制品：

**`POST /change-orders/{changeOrderId}/artifacts`**

- `multipart/form-data`：文件 + `stepId`（可选）

响应返回 `fileName`、`url` 或 `artifactId`，供步骤上的 `deploymentPackage` 引用。

---

### 3.13 实时进度 — 订阅（推荐）

执行态下前端需刷新步骤状态，建议二选一或并存：

- **`GET /change-orders/{changeOrderId}/events`（SSE）**：推送步骤/子步骤状态变更。  
- **或 `WebSocket`**：订阅 `changeOrderId` 频道。

---

### 3.14 部署历史（与「部署历史与运维」页对齐）

可选两种实现：

**A.** 复用列表接口：`GET /change-orders?status=success,failed,rollback&sort=updatedAt:desc`  

**B.** 独立执行历史：**`GET /deployment-records`**，字段包含 `changeOrderId`、`version`、`status`、`startTime`、`endTime`、`operator` 等，便于审计与大屏。

---

## 4. 状态机参考（后端实现约束）

以下为与当前前端展示兼容的**最小状态流转**建议：

```
创建 → approving
approving --approve--> deploying
approving --reject--> pending
deploying --全部成功--> success
deploying --失败--> failed
成功/失败后可由「回滚」→ rollback（或先进入 rolling_back 再 rollback）
```

细则（谁允许从 `failed` 重试、是否允许 `pending` 再次提交审批）由业务补充。

---

## 5. 非功能性需求（建议）

| 类别 | 说明 |
|------|------|
| 幂等 | `deployment:start`、步骤执行类接口对同一目标重复提交应安全或可返回同一任务 ID |
| 审计 | 审批、驳回、执行、回滚记录操作者、时间与请求 ID |
| 乐观锁 | `PATCH` 可带 `version` 或 `updatedAt` 防止覆盖并发编辑 |

---

## 6. 文档版本

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0 | 2026-04-19 | 初版，对齐当前 OpsFlow 前端原型与 `types.ts` |
