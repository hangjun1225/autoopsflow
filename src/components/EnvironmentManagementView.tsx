import { Fragment, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Server,
  ChevronLeft,
  Box,
  Shield,
  Database,
  Check,
  SlidersHorizontal,
  Plus,
  Trash2,
  Webhook,
  Cloud,
  Rocket,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { DEPLOYMENT_ENVIRONMENTS, type DeploymentEnvironmentOption } from '../constants';

/** 演示用环境条目（与变更单所选环境同源） */
export type MockEnvRow = DeploymentEnvironmentOption;

/** 列表「应用」列演示值（各行相同） */
const DEMO_APPLICATION = '研发加计';

/** 平台配置页签 id */
type PlatformTabId =
  | 'global-params'
  | 'container'
  | 'xac'
  | 'database'
  | 'api'
  | 'public-service'
  | 'deploy-system';

/** 全局参数单行：键值对与备注说明 */
type GlobalParamEntry = { id: string; key: string; value: string; remark: string };

/** 生成列表项唯一 id（演示用） */
function newParamId(): string {
  return `gp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 根据环境生成默认全局参数键值（演示，含备注） */
function defaultGlobalParamEntries(envCode: string): GlobalParamEntry[] {
  return [
    {
      id: newParamId(),
      key: 'GATEWAY_BASE_URL',
      value: `https://gw.${envCode}.example.com`,
      remark: '统一网关对外访问根地址，供各服务拼装路由',
    },
    {
      id: newParamId(),
      key: 'LOG_LEVEL',
      value: envCode === 'prod' ? 'warn' : 'info',
      remark: '应用与边车日志级别，生产建议 warn 以上',
    },
    {
      id: newParamId(),
      key: 'REQUEST_TIMEOUT_MS',
      value: '15000',
      remark: '跨服务 HTTP 调用默认超时（毫秒）',
    },
    {
      id: newParamId(),
      key: 'FEATURE_PROFILE',
      value: `profile-${envCode}`,
      remark: '功能开关与灰度策略绑定的配置档标识',
    },
  ];
}

/** 容器相关表单（演示） */
type ContainerForm = {
  namespace: string;
  imageRegistry: string;
  defaultReplicas: string;
  cpuLimit: string;
  memoryLimit: string;
};

/** XAC 相关表单（演示） */
type XacForm = {
  endpoint: string;
  policyBundle: string;
  tenantId: string;
  timeoutSeconds: string;
};

/** 数据库相关表单（演示） */
type DbForm = {
  host: string;
  port: string;
  databaseName: string;
  schema: string;
  username: string;
  poolMax: string;
};

/** API 相关表单（演示：对内对外接口基线） */
type ApiForm = {
  baseUrl: string;
  openapiUrl: string;
  authMode: string;
  defaultApiVersion: string;
};

/** 公服相关表单（演示：DNS/NTP/对象存储等公共服务） */
type PublicServiceForm = {
  internalDnsSuffix: string;
  ntpServers: string;
  smtpRelay: string;
  objectStorageEndpoint: string;
};

/** 部署系统相关表单（演示：CI/CD 与制品、回调） */
type DeploySystemForm = {
  cicdBaseUrl: string;
  artifactRegistry: string;
  deployCallbackUrl: string;
  pipelineNamespace: string;
};

/**
 * 环境平台详情：全局参数、容器、XAC、数据库、API、公服、部署系统等（演示交互）
 */
function EnvironmentPlatformDetail({
  env,
  applicationLabel,
  onBack,
}: {
  env: MockEnvRow;
  applicationLabel: string;
  onBack: () => void;
}) {
  /** 当前选中的配置页签（默认首个：全局参数配置） */
  const [activeTab, setActiveTab] = useState<PlatformTabId>('global-params');
  /** 保存成功提示 */
  const [savedHint, setSavedHint] = useState(false);

  /** 全局参数键值列表 */
  const [globalParamEntries, setGlobalParamEntries] = useState<GlobalParamEntry[]>(() =>
    defaultGlobalParamEntries(env.code)
  );

  /** 容器配置表单状态 */
  const [container, setContainer] = useState<ContainerForm>({
    namespace: `${env.code}-app`,
    imageRegistry: 'registry.example.com/project',
    defaultReplicas: '2',
    cpuLimit: '500m',
    memoryLimit: '1Gi',
  });

  /** XAC 配置表单状态 */
  const [xac, setXac] = useState<XacForm>({
    endpoint: `https://xac.${env.code}.internal`,
    policyBundle: `/policies/${env.code}/bundle.yaml`,
    tenantId: `tenant-${env.code}`,
    timeoutSeconds: '30',
  });

  /** 数据库配置表单状态 */
  const [db, setDb] = useState<DbForm>({
    host: `db-${env.code}.internal`,
    port: '5432',
    databaseName: `opsflow_${env.code}`,
    schema: 'public',
    username: 'opsflow_app',
    poolMax: '16',
  });

  /** API 配置表单状态 */
  const [api, setApi] = useState<ApiForm>({
    baseUrl: `https://api.${env.code}.example.com`,
    openapiUrl: `https://api.${env.code}.example.com/openapi.json`,
    authMode: 'OAuth2 / Bearer',
    defaultApiVersion: 'v1',
  });

  /** 公服配置表单状态 */
  const [publicSvc, setPublicSvc] = useState<PublicServiceForm>({
    internalDnsSuffix: `${env.code}.svc.cluster.local`,
    ntpServers: 'ntp.aliyun.com, time.pool.aliyun.com',
    smtpRelay: `smtp-${env.code}.example.com:587`,
    objectStorageEndpoint: `https://oss-${env.code}.example.com`,
  });

  /** 部署系统配置表单状态 */
  const [deploySys, setDeploySys] = useState<DeploySystemForm>({
    cicdBaseUrl: `https://ci.${env.code}.example.com`,
    artifactRegistry: `registry.${env.code}.example.com/deploy`,
    deployCallbackUrl: `https://ops.${env.code}.example.com/hooks/deploy`,
    pipelineNamespace: `cicd-${env.code}`,
  });

  /** 页签元数据（全局参数配置置于第一位） */
  const tabs: { id: PlatformTabId; label: string; icon: LucideIcon }[] = [
    { id: 'global-params', label: '全局参数配置', icon: SlidersHorizontal },
    { id: 'container', label: '容器配置', icon: Box },
    { id: 'xac', label: 'XAC 配置', icon: Shield },
    { id: 'database', label: '数据库配置', icon: Database },
    { id: 'api', label: 'API配置', icon: Webhook },
    { id: 'public-service', label: '公服配置', icon: Cloud },
    { id: 'deploy-system', label: '部署系统配置', icon: Rocket },
  ];

  /** 模拟保存当前页签（演示） */
  const handleSave = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
          title="返回环境列表"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">平台信息维护</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{env.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            应用 <span className="font-medium text-slate-700">{applicationLabel}</span>
            {' · '}
            编码 <span className="font-mono text-indigo-600">{env.code}</span>
            {' · '}
            {env.remark}
          </p>
        </div>
      </div>

      <div className="-mx-1 flex min-w-0 flex-wrap gap-2 overflow-x-auto border-b border-slate-200 pb-1 px-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition',
                isActive
                  ? 'border-b-2 border-indigo-600 bg-indigo-50/80 text-indigo-700'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeTab === 'global-params' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              以 Key / Value 维护全局参数，备注列用于说明用途；可增删行（演示）。
            </p>
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="w-[22%] px-4 py-3">Key</th>
                    <th className="min-w-[28%] px-4 py-3">Value</th>
                    <th className="min-w-[32%] px-4 py-3">备注</th>
                    <th className="w-24 px-3 py-3 text-center">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {globalParamEntries.map((row) => (
                    <tr key={row.id} className="bg-white hover:bg-slate-50/80">
                      <td className="px-4 py-2 align-top">
                        <input
                          type="text"
                          value={row.key}
                          onChange={(e) => {
                            const v = e.target.value;
                            setGlobalParamEntries((list) =>
                              list.map((p) => (p.id === row.id ? { ...p, key: v } : p))
                            );
                          }}
                          placeholder="参数键"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </td>
                      <td className="min-w-0 px-4 py-2 align-top">
                        <input
                          type="text"
                          value={row.value}
                          onChange={(e) => {
                            const v = e.target.value;
                            setGlobalParamEntries((list) =>
                              list.map((p) => (p.id === row.id ? { ...p, value: v } : p))
                            );
                          }}
                          placeholder="参数值"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </td>
                      <td className="min-w-0 px-4 py-2 align-top">
                        <input
                          type="text"
                          value={row.remark}
                          onChange={(e) => {
                            const v = e.target.value;
                            setGlobalParamEntries((list) =>
                              list.map((p) => (p.id === row.id ? { ...p, remark: v } : p))
                            );
                          }}
                          placeholder="用途说明"
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </td>
                      <td className="px-2 py-2 align-top text-center">
                        <button
                          type="button"
                          onClick={() =>
                            setGlobalParamEntries((list) => list.filter((p) => p.id !== row.id))
                          }
                          className="inline-flex rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="删除此行"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() =>
                setGlobalParamEntries((list) => [
                  ...list,
                  { id: newParamId(), key: '', value: '', remark: '' },
                ])
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700"
            >
              <Plus className="h-4 w-4" />
              添加一行
            </button>
          </div>
        )}

        {activeTab === 'container' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">Kubernetes / 容器运行时的命名空间、镜像与默认资源限制。</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">命名空间</span>
                <input
                  type="text"
                  value={container.namespace}
                  onChange={(e) => setContainer((c) => ({ ...c, namespace: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">镜像仓库地址</span>
                <input
                  type="text"
                  value={container.imageRegistry}
                  onChange={(e) => setContainer((c) => ({ ...c, imageRegistry: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">默认副本数</span>
                <input
                  type="text"
                  value={container.defaultReplicas}
                  onChange={(e) => setContainer((c) => ({ ...c, defaultReplicas: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">CPU 上限</span>
                <input
                  type="text"
                  value={container.cpuLimit}
                  onChange={(e) => setContainer((c) => ({ ...c, cpuLimit: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">内存上限</span>
                <input
                  type="text"
                  value={container.memoryLimit}
                  onChange={(e) => setContainer((c) => ({ ...c, memoryLimit: e.target.value }))}
                  className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'xac' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">访问控制（XAC）服务端点、策略包与租户上下文。</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">XAC 服务地址</span>
                <input
                  type="text"
                  value={xac.endpoint}
                  onChange={(e) => setXac((x) => ({ ...x, endpoint: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">策略包路径 / Bundle</span>
                <input
                  type="text"
                  value={xac.policyBundle}
                  onChange={(e) => setXac((x) => ({ ...x, policyBundle: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">租户 ID</span>
                <input
                  type="text"
                  value={xac.tenantId}
                  onChange={(e) => setXac((x) => ({ ...x, tenantId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">请求超时（秒）</span>
                <input
                  type="text"
                  value={xac.timeoutSeconds}
                  onChange={(e) => setXac((x) => ({ ...x, timeoutSeconds: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">该环境下业务库连接与连接池（演示字段，生产环境请配合凭据托管）。</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">主机地址</span>
                <input
                  type="text"
                  value={db.host}
                  onChange={(e) => setDb((d) => ({ ...d, host: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">端口</span>
                <input
                  type="text"
                  value={db.port}
                  onChange={(e) => setDb((d) => ({ ...d, port: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">数据库名</span>
                <input
                  type="text"
                  value={db.databaseName}
                  onChange={(e) => setDb((d) => ({ ...d, databaseName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Schema</span>
                <input
                  type="text"
                  value={db.schema}
                  onChange={(e) => setDb((d) => ({ ...d, schema: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">用户名</span>
                <input
                  type="text"
                  value={db.username}
                  onChange={(e) => setDb((d) => ({ ...d, username: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">连接池最大连接数</span>
                <input
                  type="text"
                  value={db.poolMax}
                  onChange={(e) => setDb((d) => ({ ...d, poolMax: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">本环境对外/对内 API 网关基址、契约与鉴权方式（演示字段）。</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">API 根地址（Base URL）</span>
                <input
                  type="text"
                  value={api.baseUrl}
                  onChange={(e) => setApi((a) => ({ ...a, baseUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">OpenAPI / 契约地址</span>
                <input
                  type="text"
                  value={api.openapiUrl}
                  onChange={(e) => setApi((a) => ({ ...a, openapiUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">鉴权方式说明</span>
                <input
                  type="text"
                  value={api.authMode}
                  onChange={(e) => setApi((a) => ({ ...a, authMode: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">默认 API 版本</span>
                <input
                  type="text"
                  value={api.defaultApiVersion}
                  onChange={(e) => setApi((a) => ({ ...a, defaultApiVersion: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'public-service' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">集群内外公共依赖：解析后缀、时间同步、邮件中继与对象存储等（演示字段）。</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">集群内 DNS 搜索后缀</span>
                <input
                  type="text"
                  value={publicSvc.internalDnsSuffix}
                  onChange={(e) => setPublicSvc((p) => ({ ...p, internalDnsSuffix: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">NTP 服务器（逗号分隔）</span>
                <input
                  type="text"
                  value={publicSvc.ntpServers}
                  onChange={(e) => setPublicSvc((p) => ({ ...p, ntpServers: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">SMTP 中继</span>
                <input
                  type="text"
                  value={publicSvc.smtpRelay}
                  onChange={(e) => setPublicSvc((p) => ({ ...p, smtpRelay: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">对象存储 Endpoint</span>
                <input
                  type="text"
                  value={publicSvc.objectStorageEndpoint}
                  onChange={(e) => setPublicSvc((p) => ({ ...p, objectStorageEndpoint: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'deploy-system' && (
          <div className="space-y-5">
            <p className="text-sm text-slate-600">与 CI/CD、制品仓库及部署回调相关的系统级入口（演示字段）。</p>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">CI/CD 控制台基址</span>
                <input
                  type="text"
                  value={deploySys.cicdBaseUrl}
                  onChange={(e) => setDeploySys((d) => ({ ...d, cicdBaseUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">制品 / 镜像仓库路径</span>
                <input
                  type="text"
                  value={deploySys.artifactRegistry}
                  onChange={(e) => setDeploySys((d) => ({ ...d, artifactRegistry: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">部署完成回调 URL</span>
                <input
                  type="text"
                  value={deploySys.deployCallbackUrl}
                  onChange={(e) => setDeploySys((d) => ({ ...d, deployCallbackUrl: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
              <label className="block space-y-2 sm:col-span-2">
                <span className="text-sm font-semibold text-slate-700">流水线命名空间 / 项目空间</span>
                <input
                  type="text"
                  value={deploySys.pipelineNamespace}
                  onChange={(e) => setDeploySys((d) => ({ ...d, pipelineNamespace: e.target.value }))}
                  className="w-full max-w-xl rounded-xl border border-slate-200 px-4 py-2.5 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={handleSave}
            className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            保存当前页配置
          </button>
          {savedHint && (
            <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
              <Check className="h-4 w-4" />
              已保存（演示）
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 环境管理：列表与进入单环境平台信息维护
 */
export function EnvironmentManagementView() {
  /** 非空时表示正在查看某环境的平台配置页 */
  const [detailEnv, setDetailEnv] = useState<MockEnvRow | null>(null);

  if (detailEnv) {
    return (
      <Fragment key={detailEnv.id}>
        <EnvironmentPlatformDetail
          env={detailEnv}
          applicationLabel={DEMO_APPLICATION}
          onBack={() => setDetailEnv(null)}
        />
      </Fragment>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Server className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">环境管理</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            配置运行环境标识、关联资源与访问策略，供变更单与部署流程引用
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">环境列表</h2>
          <p className="mt-1 text-xs text-slate-500">点击环境名称进入平台信息维护；以下为演示数据</p>
        </div>
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3">应用</th>
              <th className="px-6 py-3">环境名称</th>
              <th className="px-6 py-3">编码</th>
              <th className="px-6 py-3">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {DEPLOYMENT_ENVIRONMENTS.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80">
                <td className="px-6 py-4 text-sm font-medium text-slate-800">{DEMO_APPLICATION}</td>
                <td className="px-6 py-4">
                  <button
                    type="button"
                    onClick={() => setDetailEnv(row)}
                    className="text-left text-sm font-semibold text-indigo-600 underline-offset-2 transition hover:text-indigo-800 hover:underline"
                  >
                    {row.name}
                  </button>
                </td>
                <td className="px-6 py-4 font-mono text-sm text-indigo-600">{row.code}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{row.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
