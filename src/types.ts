export type DeploymentStatus = 'pending' | 'approving' | 'deploying' | 'success' | 'failed' | 'rollback';

/** 发布策略类型（仅两种：金丝雀固定 50% 灰度、全量） */
export type ReleaseStrategyKind = 'canary' | 'full';

/** 发布策略（金丝雀流量比例由平台固定为 50%，无需额外字段） */
export interface ReleaseStrategyConfig {
  kind: ReleaseStrategyKind;
}

export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  type: 'config' | 'k8s' | 'vm';
  config: Record<string, any>;
}

export interface DeploymentScenario {
  id: string;
  name: string;
  templateIds: string[]; // List of templates allowed in this scenario
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  scenarioId: string;
  steps: {
    type: ChangeStepType;
    name: string;
    templateId?: string;
    actionType?: 'build' | 'test' | 'approval' | 'scan' | 'gate';
  }[];
}

export type ChangeStepType = 'deployment' | 'pipeline_action';

/** 变更单主步骤下的子步骤（部署页展示明细） */
export type ChangeOrderSubStepStatus = 'pending' | 'running' | 'success' | 'failed';

export interface ChangeOrderSubStep {
  id: string;
  name: string;
  status: ChangeOrderSubStepStatus;
  /** 执行开始时间（ISO8601 或可读字符串，无则界面显示 —） */
  executeStartedAt?: string;
  /** 执行结束时间；状态为执行中时界面显示为 - */
  executeEndedAt?: string;
}

/** 验证节点类型（与界面展示标签对应） */
export type ChangeOrderValidationItemKind = 'smoke' | 'probe' | 'metrics' | 'manual_gate' | 'custom';

/** 单条验证编排节点（挂在部署场景下，与变更步骤场景一致） */
export interface ChangeOrderValidationItem {
  id: string;
  scenarioId: string;
  name: string;
  kind: ChangeOrderValidationItemKind;
}

/** 变更单：验证步骤配置（多场景编排 + 全局观察参数） */
export interface ChangeOrderValidationConfig {
  /** 监控观察窗口（分钟） */
  monitorWindowMinutes: number;
  /** 全局补充说明 */
  notes: string;
  /** 按场景编排的验证节点列表（顺序即执行顺序） */
  items: ChangeOrderValidationItem[];
  /**
   * 各部署场景下验证节点的执行方式约定（未配置的场景视为串行）
   * key 为 scenarioId
   */
  scenarioSubStepExecutionMode?: Partial<Record<string, 'serial' | 'parallel'>>;
}

/** 回滚策略枚举 */
export type ChangeOrderRollbackStrategy = 'manual' | 'auto_previous_version';

/**
 * 回滚执行门控（按需配置）
 * - standard：按所选策略执行，自动回滚策略下允许平台在满足条件时自动触发
 * - approval_first：必须先经人工确认或审批，禁止未经确认的自动回滚
 * - on_demand：故障时由负责人现场评估后决定是否回滚，不预设自动触发
 */
export type ChangeOrderRollbackGate = 'standard' | 'approval_first' | 'on_demand';

/** 变更单：回滚步骤配置 */
export interface ChangeOrderRollbackConfig {
  /** 回滚方式 */
  strategy: ChangeOrderRollbackStrategy;
  /** 回滚执行门控（是否必须由人决策后才能回滚） */
  gate: ChangeOrderRollbackGate;
  /** 回滚预案与操作说明 */
  notes: string;
  /**
   * 回滚配置子项（策略/门控/说明等）在引擎侧是否并行推进（未填视为串行）
   * 界面与部署子步骤「执行方式」一致
   */
  subStepExecutionMode?: 'serial' | 'parallel';
}

export interface ChangeOrderStep {
  id: string;
  order: number;
  type: ChangeStepType;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  templateId?: string; // used if type is 'deployment'
  actionType?: 'build' | 'test' | 'approval' | 'scan' | 'gate'; // used if type is 'pipeline_action'
  scenarioId?: string; // Link to which scenario this step belongs to
  /** 该任务关联的部署包/制品（界面演示：存所选本地文件名） */
  deploymentPackage?: string;
  /** 子步骤（可选；无则部署页按类型生成演示子步骤） */
  subSteps?: ChangeOrderSubStep[];
  /**
   * 子步骤执行方式（编排约定，供引擎解析；未填视为串行）
   * - serial：子步骤按顺序依次执行
   * - parallel：子步骤可同时执行
   */
  subStepExecutionMode?: 'serial' | 'parallel';
  /** 执行开始时间（ISO8601 或可读字符串，无则界面显示 —） */
  executeStartedAt?: string;
  /** 执行结束时间；状态为执行中时界面显示为 - */
  executeEndedAt?: string;
}

export interface ChangeOrder {
  id: string;
  title: string;
  /** 应用标识（如实例名） */
  application: string;
  /** 目标部署环境 ID（与环境管理中的环境条目对应） */
  environmentId: string;
  /** 提交时快照名称，便于列表与详情展示 */
  environmentName?: string;
  /** 环境编码，如 prod、staging */
  environmentCode?: string;
  /** 部署包（制品名、包路径或构建号等） */
  deploymentPackage?: string;
  description: string;
  creator: string;
  createdAt: string;
  status: DeploymentStatus;
  scenarioIds: string[]; // List of scenarios involved
  version: string;
  steps: ChangeOrderStep[];
  /** 发布策略（推荐）；缺省时界面按滚动/灰度等默认推断 */
  releaseStrategy?: ReleaseStrategyConfig;
  /** 验证步骤（新建向导填写；旧数据可无） */
  validationConfig?: ChangeOrderValidationConfig;
  /** 回滚步骤（新建向导填写；旧数据可无） */
  rollbackConfig?: ChangeOrderRollbackConfig;
  /** @deprecated 兼容旧数据；请优先使用 releaseStrategy */
  canaryConfig?: {
    enabled: boolean;
    weight: number;
  };
}

export interface DeploymentHistory {
  id: string;
  changeOrderId: string;
  startTime: string;
  endTime?: string;
  status: DeploymentStatus;
  user: string;
  version: string;
}
