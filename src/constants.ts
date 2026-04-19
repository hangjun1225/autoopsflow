import { DeploymentTemplate, DeploymentScenario, ChangeOrder } from './types';

/** 部署环境选项（与环境管理页数据一致，供变更单与演示列表使用） */
export type DeploymentEnvironmentOption = {
  id: string;
  name: string;
  code: string;
  remark: string;
};

/** 可选部署环境列表 */
export const DEPLOYMENT_ENVIRONMENTS: DeploymentEnvironmentOption[] = [
  { id: 'env-1', name: '生产集群', code: 'prod', remark: '对外正式流量' },
  { id: 'env-2', name: '预发验证', code: 'staging', remark: '发布前联调' },
  { id: 'env-3', name: '开发测试', code: 'dev', remark: '日常开发与自动化' },
];

export const MOCK_TEMPLATES: DeploymentTemplate[] = [
  {
    id: 'tpl-ds',
    name: '应用配置中心-数据源配置',
    description: '应用配置中心：数据库连接、连接池及数据源信息',
    type: 'config',
    config: {},
  },
  {
    id: 'tpl-app',
    name: '应用配置中心-应用配置',
    description: '应用配置中心：运行时环境变量、JVM 参数及属性',
    type: 'config',
    config: {},
  },
  {
    id: 'tpl-j2c',
    name: '应用配置中心-J2C配置',
    description: '应用配置中心：resource adapter 及 J2C 资源',
    type: 'config',
    config: {},
  },
  {
    id: 'tpl-k8s',
    name: 'ADS-docker容器部署',
    description: 'ADS 场景下 Docker 镜像构建与容器发布',
    type: 'k8s',
    config: {},
  },
  {
    id: 'tpl-vm',
    name: '实施配置--集成配置',
    description: '实施侧系统集成、联调与对接类配置',
    type: 'vm',
    config: {},
  },
  {
    id: 'tpl-impl-supplement',
    name: '实施配置-补录配置',
    description: '补录数据、事后修正与补充录入类配置',
    type: 'config',
    config: {},
  },
  {
    id: 'tpl-impl-model',
    name: '实施配置-计算模型配置',
    description: '计算模型、规则与批处理任务相关配置',
    type: 'config',
    config: {},
  },
  {
    id: 'tpl-impl-report',
    name: '实施配置-报表配置',
    description: '报表定义、数据源映射与调度发布相关配置',
    type: 'config',
    config: {},
  },
];

export const MOCK_SCENARIOS: DeploymentScenario[] = [
  {
    id: 'scen-container',
    name: 'EDM部署',
    templateIds: ['tpl-k8s', 'tpl-app'],
  },
  {
    id: 'scen-appcenter',
    name: '应用中心部署',
    templateIds: ['tpl-ds', 'tpl-app', 'tpl-j2c'],
  },
  {
    id: 'scen-ads',
    name: 'ADS部署',
    templateIds: ['tpl-ds', 'tpl-app'],
  },
  {
    id: 'scen-public',
    name: '公服部署',
    templateIds: ['tpl-vm', 'tpl-app'],
  },
  {
    id: 'scen-api',
    name: 'API部署',
    templateIds: ['tpl-k8s', 'tpl-app', 'tpl-j2c'],
  },
  {
    id: 'scen-roma3c',
    name: 'ROMA3C部署',
    templateIds: ['tpl-vm', 'tpl-app', 'tpl-ds'],
  },
  {
    id: 'scen-mqs',
    name: 'MQS部署',
    templateIds: ['tpl-app', 'tpl-ds', 'tpl-impl-model'],
  },
  {
    id: 'scen-lts',
    name: 'LTS部署',
    templateIds: ['tpl-k8s', 'tpl-app', 'tpl-impl-report'],
  },
  {
    id: 'scen-impl',
    name: '实施场景部署',
    templateIds: ['tpl-vm', 'tpl-ds', 'tpl-impl-supplement', 'tpl-impl-model', 'tpl-impl-report'],
  },
];

/**
 * 部署场景列表展示顺序：除置底项外按名称排序；
 * 置底固定为「应用中心部署」→「实施场景部署」（倒数第二、倒数第一）。
 */
export function sortScenariosForDisplay(list: DeploymentScenario[]): DeploymentScenario[] {
  const bottomOrder = ['scen-appcenter', 'scen-impl'] as const;
  const bottomSet = new Set<string>(bottomOrder);
  const rest = list
    .filter((s) => !bottomSet.has(s.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  const bottom = bottomOrder
    .map((id) => list.find((s) => s.id === id))
    .filter((s): s is DeploymentScenario => s != null);
  return [...rest, ...bottom];
}

/** 与界面一致的默认场景顺序（供变更单等静态列表复用，避免重复排序） */
export const MOCK_SCENARIOS_UI_ORDER = sortScenariosForDisplay(MOCK_SCENARIOS);

export const PRESET_SCENARIOS = [
  {
    id: 'preset-standard-k8s',
    name: '标准ADS应用发布',
    description: '包含：构建 -> 安全扫描 -> 审批 -> ADS 容器部署',
    scenarioId: 'scen-container',
    steps: [
      { type: 'pipeline_action', actionType: 'build', name: '镜像编译构建' },
      { type: 'pipeline_action', actionType: 'test', name: '镜像安全扫描' },
      { type: 'pipeline_action', actionType: 'approval', name: '主管合规审批' },
      { type: 'deployment', templateId: 'tpl-k8s', name: '生产集群负载更新' },
    ]
  },
  {
    id: 'preset-db-config',
    name: '标准数据库配置部署',
    description: '包含：DBA 审批 -> 数据源配置部署 -> 测试验证',
    scenarioId: 'scen-appcenter',
    steps: [
      { type: 'pipeline_action', actionType: 'approval', name: 'DBA 审核' },
      { type: 'deployment', templateId: 'tpl-ds', name: '生产数据库连接变更' },
      { type: 'pipeline_action', actionType: 'test', name: '连通性自动化测试' },
    ]
  }
] as const;

export const INITIAL_CHANGE_ORDERS: ChangeOrder[] = [
  {
    id: 'CR-20240419-001',
    title: '研发加计-20260323版本',
    application: 'rdsd',
    environmentId: 'env-1',
    environmentName: '生产集群',
    environmentCode: 'prod',
    deploymentPackage: 'rdsd-portal-1.2.4-release.tgz',
    description: '修复生产环境 Session 过期导致的 Bug',
    creator: '张三',
    createdAt: '2024-04-18 10:00',
    status: 'success',
    scenarioIds: ['scen-container'],
    version: 'v1.2.4',
    steps: [
      {
        id: '1',
        order: 1,
        type: 'pipeline_action',
        actionType: 'build',
        name: '构建镜像',
        status: 'success',
        executeStartedAt: '2024-04-19T09:00:00',
        executeEndedAt: '2024-04-19T09:12:00',
        subSteps: [
          {
            id: '1-a',
            name: '检出代码与缓存依赖',
            status: 'success',
            executeStartedAt: '2024-04-19T09:00:00',
            executeEndedAt: '2024-04-19T09:03:00',
          },
          {
            id: '1-b',
            name: 'Docker 构建与打标签',
            status: 'success',
            executeStartedAt: '2024-04-19T09:03:00',
            executeEndedAt: '2024-04-19T09:08:00',
          },
          {
            id: '1-c',
            name: '推送镜像仓库',
            status: 'success',
            executeStartedAt: '2024-04-19T09:08:00',
            executeEndedAt: '2024-04-19T09:12:00',
          },
        ],
      },
      {
        id: '2',
        order: 2,
        type: 'pipeline_action',
        actionType: 'test',
        name: '安全扫描',
        status: 'success',
        subSteps: [
          { id: '2-a', name: '镜像漏洞扫描', status: 'success' },
          { id: '2-b', name: '依赖许可证检查', status: 'success' },
        ],
      },
      {
        id: '3',
        order: 3,
        type: 'deployment',
        templateId: 'tpl-app',
        name: '应用配置更新',
        status: 'success',
        subSteps: [
          { id: '3-a', name: '配置 diff 与校验', status: 'success' },
          { id: '3-b', name: '下发至配置中心', status: 'success' },
          { id: '3-c', name: '实例热加载确认', status: 'success' },
        ],
      },
      {
        id: '4',
        order: 4,
        type: 'pipeline_action',
        actionType: 'approval',
        name: '负责人审批',
        status: 'success',
        subSteps: [
          { id: '4-a', name: '自动合规校验', status: 'success' },
          { id: '4-b', name: '负责人电子签批', status: 'success' },
        ],
      },
      {
        id: '5',
        order: 5,
        type: 'deployment',
        templateId: 'tpl-k8s',
        name: 'K8s 副本集更新',
        status: 'success',
        subSteps: [
          { id: '5-a', name: '滚动更新策略校验', status: 'success' },
          { id: '5-b', name: '应用新镜像与探针', status: 'success' },
          { id: '5-c', name: '就绪与流量切换', status: 'success' },
        ],
      },
    ],
    releaseStrategy: { kind: 'canary' },
    validationConfig: {
      monitorWindowMinutes: 30,
      notes: '核心接口错误率与 P99 延迟在阈值内',
      scenarioSubStepExecutionMode: { 'scen-container': 'parallel' },
      items: [
        {
          id: 'val-demo-1',
          scenarioId: 'scen-container',
          name: '部署后冒烟',
          kind: 'smoke',
        },
        {
          id: 'val-demo-2',
          scenarioId: 'scen-container',
          name: '核心接口探活',
          kind: 'probe',
        },
      ],
    },
    rollbackConfig: {
      strategy: 'manual',
      gate: 'approval_first',
      notes: '回滚前联系 DBA 确认；存在数据迁移时需评估不可逆影响。',
      subStepExecutionMode: 'parallel',
    },
  },
  {
    id: 'CR-20240419-002',
    title: '研发加计-20260525版本',
    application: 'rdsd',
    environmentId: 'env-2',
    environmentName: '预发验证',
    environmentCode: 'staging',
    deploymentPackage: 'rdsd-appcenter-1.3.0.zip',
    description: '集成社交连接与生物信息展示',
    creator: '李四',
    createdAt: '2024-04-19 09:15',
    status: 'approving',
    scenarioIds: ['scen-appcenter'],
    version: 'v1.3.0',
    steps: [
      {
        id: 's1',
        order: 1,
        type: 'pipeline_action',
        actionType: 'test',
        name: '预检测试',
        status: 'success',
        subSteps: [
          { id: 's1-a', name: '环境连通性探测', status: 'success' },
          { id: 's1-b', name: '冒烟用例执行', status: 'success' },
        ],
      },
      {
        id: 's2',
        order: 2,
        type: 'deployment',
        templateId: 'tpl-ds',
        name: '数据源变更',
        status: 'success',
        subSteps: [
          { id: 's2-a', name: '连接串加密校验', status: 'success' },
          { id: 's2-b', name: '数据源配置发布', status: 'success' },
          { id: 's2-c', name: '连接池预热', status: 'success' },
        ],
      },
      {
        id: 's3',
        order: 3,
        type: 'pipeline_action',
        actionType: 'approval',
        name: '架构部审批',
        status: 'pending',
        subSteps: [
          { id: 's3-a', name: '架构规范检查', status: 'success' },
          { id: 's3-b', name: '架构负责人审批', status: 'pending' },
        ],
      },
      {
        id: 's4',
        order: 4,
        type: 'deployment',
        templateId: 'tpl-app',
        name: '应用中心配置',
        status: 'pending',
        subSteps: [
          { id: 's4-a', name: '配置合并与冲突检测', status: 'pending' },
          { id: 's4-b', name: '灰度实例发布', status: 'pending' },
          { id: 's4-c', name: '全量生效与监控', status: 'pending' },
        ],
      },
    ],
    releaseStrategy: { kind: 'canary' },
    validationConfig: {
      monitorWindowMinutes: 45,
      notes: '',
      items: [
        {
          id: 'val-ac-1',
          scenarioId: 'scen-appcenter',
          name: '部署后冒烟',
          kind: 'smoke',
        },
        {
          id: 'val-ac-2',
          scenarioId: 'scen-appcenter',
          name: '指标观察',
          kind: 'metrics',
        },
      ],
    },
    rollbackConfig: {
      strategy: 'auto_previous_version',
      gate: 'approval_first',
      notes: '自动回滚策略在门控为「须人工确认」时不会自动执行，需审批通过后由平台触发。',
    },
  },
  {
    id: 'CR-20240420-003',
    title: '研发加计-20260601版本',
    application: 'rdsd',
    environmentId: 'env-1',
    environmentName: '生产集群',
    environmentCode: 'prod',
    deploymentPackage: 'rdsd-public-2.0.0-bundle.tar.gz',
    description: '公服集群滚动发布与观测接入（部署中）',
    creator: '王五',
    createdAt: '2024-04-20 14:30',
    status: 'deploying',
    scenarioIds: ['scen-public'],
    version: 'v2.0.0',
    steps: [
      {
        id: 'd1',
        order: 1,
        type: 'pipeline_action',
        actionType: 'build',
        name: '构建与推送镜像',
        status: 'success',
        executeStartedAt: '2026-04-19T08:00:00',
        executeEndedAt: '2026-04-19T08:25:00',
        subSteps: [
          {
            id: 'd1-a',
            name: '编译打包',
            status: 'success',
            executeStartedAt: '2026-04-19T08:00:00',
            executeEndedAt: '2026-04-19T08:14:00',
          },
          {
            id: 'd1-b',
            name: '镜像推送',
            status: 'success',
            executeStartedAt: '2026-04-19T08:14:00',
            executeEndedAt: '2026-04-19T08:25:00',
          },
        ],
      },
      {
        id: 'd2',
        order: 2,
        type: 'deployment',
        templateId: 'tpl-vm',
        name: '主机滚动发布',
        status: 'running',
        executeStartedAt: '2026-04-19T10:30:00',
        subSteps: [
          {
            id: 'd2-a',
            name: '批次一 下线旧实例',
            status: 'success',
            executeStartedAt: '2026-04-19T10:30:00',
            executeEndedAt: '2026-04-19T10:42:00',
          },
          {
            id: 'd2-b',
            name: '批次二 部署中',
            status: 'running',
            executeStartedAt: '2026-04-19T10:42:00',
          },
          { id: 'd2-c', name: '批次三 待发布', status: 'pending' },
        ],
      },
      {
        id: 'd3',
        order: 3,
        type: 'pipeline_action',
        actionType: 'test',
        name: '线上回归验证',
        status: 'pending',
        subSteps: [
          { id: 'd3-a', name: '核心链路用例', status: 'pending' },
          { id: 'd3-b', name: '监控告警核对', status: 'pending' },
        ],
      },
    ],
    releaseStrategy: { kind: 'full' },
    validationConfig: {
      monitorWindowMinutes: 60,
      notes: '公服流量大，需拉长观察窗口；异常按值班升级。',
      items: [
        {
          id: 'val-pub-1',
          scenarioId: 'scen-public',
          name: '错误率与延迟指标',
          kind: 'metrics',
        },
        {
          id: 'val-pub-2',
          scenarioId: 'scen-public',
          name: '业务人工门禁',
          kind: 'manual_gate',
        },
      ],
    },
    rollbackConfig: {
      strategy: 'manual',
      gate: 'on_demand',
      notes: '是否回滚由现场值班评估；已写入不可逆数据时禁止直接版本回切。',
    },
  },
];
