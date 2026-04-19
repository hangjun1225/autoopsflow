import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import {
  DEPLOYMENT_ENVIRONMENTS,
  MOCK_SCENARIOS,
  MOCK_SCENARIOS_UI_ORDER,
  MOCK_TEMPLATES,
  PRESET_SCENARIOS,
} from '../constants';
import { useOrders } from '../context/OrdersContext';
import type {
  ChangeOrderRollbackConfig,
  ChangeOrderValidationConfig,
  ChangeOrderValidationItem,
  ChangeOrderValidationItemKind,
  ReleaseStrategyConfig,
} from '../types';
import { ChangeOrder, DeploymentStatus, ChangeOrderStep } from '../types';
import {
  defaultReleaseStrategy,
  formatReleaseStrategyShort,
  releaseStrategyDetailLines,
  releaseStrategyKindLabel,
  releaseStrategySummary,
} from '../lib/releaseStrategy';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock,
  CheckCircle2,
  XCircle,
  PlayCircle,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Info,
  Layers,
  Zap,
  ShieldCheck,
  Box,
  Trash2,
  ArrowUp,
  ArrowDown,
  ListTodo,
  Bookmark,
  Star,
  Check,
  Eye,
  Rocket,
  ClipboardCheck,
  RotateCcw,
  Upload,
  Server,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { ChangeOrderDeploymentView } from './ChangeOrderDeploymentView';

/** 变更单列表每页条数 */
const ORDER_LIST_PAGE_SIZE = 10;

/** 标准验证库：对当前已选部署场景批量追加验证节点 */
const PRESET_VALIDATION_PACKS: {
  id: string;
  name: string;
  description: string;
  items: { name: string; kind: ChangeOrderValidationItemKind }[];
}[] = [
  {
    id: 'pack-basic',
    name: '基础门禁包',
    description: '冒烟、探活与关键指标观察',
    items: [
      { name: '部署后冒烟', kind: 'smoke' },
      { name: '核心接口探活', kind: 'probe' },
      { name: '错误率与延迟指标', kind: 'metrics' },
    ],
  },
  {
    id: 'pack-with-gate',
    name: '含人工确认包',
    description: '在基础门禁上增加业务验收签字',
    items: [
      { name: '部署后冒烟', kind: 'smoke' },
      { name: '核心接口探活', kind: 'probe' },
      { name: '业务人工门禁', kind: 'manual_gate' },
    ],
  },
];

/** 验证节点类型的界面短标签 */
function validationKindLabel(k: ChangeOrderValidationItemKind) {
  const map: Record<ChangeOrderValidationItemKind, string> = {
    smoke: '冒烟',
    probe: '探活',
    metrics: '指标',
    manual_gate: '人工门禁',
    custom: '自定义',
  };
  return map[k];
}

type OrderPaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
};

/** 变更单表格底部分页条（上一页 / 下一页与区间文案） */
function OrderPaginationBar({ page, pageSize, total, onPageChange }: OrderPaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-600">
      <span className="text-xs text-slate-500">
        显示 {start}-{end}，共 {total} 条
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          上一页
        </button>
        <span className="px-2 text-xs tabular-nums text-slate-500">
          {current} / {totalPages}
        </span>
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1)}
          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ChangeOrderManager() {
  const { orders, setOrders } = useOrders();
  const [uiState, setUiState] = useState<'management' | 'creator' | 'deployment'>('management');
  /** 部署页当前变更单 id（与全局 orders 联动） */
  const [deploymentOrderId, setDeploymentOrderId] = useState<string | null>(null);
  /** 由 id 解析当前部署视图数据 */
  const deploymentOrder = useMemo(
    () => (deploymentOrderId ? orders.find((o) => o.id === deploymentOrderId) ?? null : null),
    [orders, deploymentOrderId]
  );
  /** 待确认删除的变更单（非空时显示删除确认弹窗） */
  const [deleteTarget, setDeleteTarget] = useState<ChangeOrder | null>(null);
  /** 变更单列表当前页码（从 1 开始） */
  const [orderPage, setOrderPage] = useState(1);

  /** 当前页展示的变更单子集 */
  const pagedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDER_LIST_PAGE_SIZE;
    return orders.slice(start, start + ORDER_LIST_PAGE_SIZE);
  }, [orders, orderPage]);

  /** 删除或数据变少时，若当前页超出总页数则回退到最后一页 */
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(orders.length / ORDER_LIST_PAGE_SIZE));
    if (orderPage > totalPages) setOrderPage(totalPages);
  }, [orders.length, orderPage]);

  /** 审批等操作删除当前单时，退出部署页 */
  useEffect(() => {
    if (uiState !== 'deployment' || !deploymentOrderId) return;
    if (!orders.some((o) => o.id === deploymentOrderId)) {
      setDeploymentOrderId(null);
      setUiState('management');
    }
  }, [orders, deploymentOrderId, uiState]);

  const handleOpenCreator = () => {
    setUiState('creator');
  };

  const openDeployment = (order: ChangeOrder) => {
    setDeploymentOrderId(order.id);
    setUiState('deployment');
  };

  const closeDeployment = () => {
    setDeploymentOrderId(null);
    setUiState('management');
  };

  /** 从列表中移除指定变更单并关闭确认弹窗 */
  const confirmDeleteOrder = () => {
    if (!deleteTarget) return;
    if (deploymentOrderId === deleteTarget.id) {
      setDeploymentOrderId(null);
      setUiState('management');
    }
    setOrders((prev) => prev.filter((o) => o.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  if (uiState === 'deployment' && deploymentOrder) {
    return <ChangeOrderDeploymentView order={deploymentOrder} onBack={closeDeployment} />;
  }

  if (uiState === 'creator') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setUiState('management')}
            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition border border-transparent hover:border-slate-200 shadow-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">新建部署变更单</h1>
            <p className="text-sm text-slate-500">完善变更详细信息与执行编排</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[700px] flex flex-col">
          <ChangeOrderEditor 
            onClose={() => setUiState('management')} 
            onComplete={(newOrder) => {
              setOrders((prev) => [newOrder, ...prev]);
              setUiState('management');
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">变更单管理</h1>
          <p className="mt-0.5 text-xs text-slate-500">创建、审批与执行应用部署变更</p>
        </div>
        <button 
          onClick={handleOpenCreator}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          新建变更单
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" placeholder="按标题或 ID 搜索..." className="bg-transparent border-none outline-none text-sm w-full" />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 text-sm text-slate-600 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition">
            <Filter className="w-4 h-4" />
            筛选
          </button>
          <button className="flex items-center gap-2 text-sm text-slate-600 px-3 py-1.5 hover:bg-slate-50 rounded-lg transition">
            <Calendar className="w-4 h-4" />
            时间范围
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full table-fixed text-left border-collapse text-[11px] leading-tight">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="w-[7.5rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">变更单号</th>
              <th className="min-w-0 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">标题</th>
              <th className="w-[4rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">应用</th>
              <th className="w-[5.5rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">部署环境</th>
              <th className="w-[7rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">部署包</th>
              <th className="min-w-0 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">配置场景</th>
              <th className="w-[4.5rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">版本</th>
              <th className="w-[6.5rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">发布策略</th>
              <th className="w-[6.5rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">创建人/时间</th>
              <th className="w-[4.5rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">状态</th>
              <th className="w-[4rem] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pagedOrders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition group cursor-pointer align-top">
                <td className="px-2 py-1">
                  <span className="font-mono text-[10px] font-semibold leading-tight text-indigo-600 tabular-nums">{order.id}</span>
                </td>
                <td className="min-w-0 px-2 py-1">
                  <span className="line-clamp-2 font-semibold leading-snug text-slate-800">{order.title}</span>
                </td>
                <td className="px-2 py-1">
                  <span className="font-mono text-[10px] text-slate-700">{order.application}</span>
                </td>
                <td className="px-2 py-1">
                  <span className="block truncate text-[10px] text-slate-700">
                    {order.environmentName ??
                      DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === order.environmentId)?.name ??
                      '—'}
                  </span>
                  <span className="block truncate font-mono text-[9px] text-slate-400">
                    {order.environmentCode ??
                      DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === order.environmentId)?.code ??
                      ''}
                  </span>
                </td>
                <td className="max-w-0 px-2 py-1">
                  <span className="block truncate font-mono text-[10px] text-slate-600" title={order.deploymentPackage || undefined}>
                    {order.deploymentPackage ?? '—'}
                  </span>
                </td>
                <td className="min-w-0 px-2 py-1">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex min-w-0 items-center gap-1 truncate text-[10px] text-slate-600">
                      <Layers className="h-2.5 w-2.5 shrink-0 text-indigo-400" />
                      <span className="truncate">
                        {order.scenarioIds?.length > 1
                          ? `${order.scenarioIds.length} 个配置场景`
                          : MOCK_SCENARIOS.find((s) => s.id === (order as any).scenarioId || order.scenarioIds?.[0])?.name || '-'}
                      </span>
                    </div>
                    <div className="flex max-h-[1.35rem] flex-wrap gap-0.5 overflow-hidden">
                      {order.steps.slice(0, 2).map((step, idx) => {
                        const isAction = step.type === 'pipeline_action';
                        return (
                          <span
                            key={idx}
                            className={cn(
                              'inline-flex max-w-[5.5rem] items-center gap-0.5 truncate rounded border px-1 py-px text-[9px]',
                              isAction ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-indigo-100 bg-indigo-50 text-indigo-700'
                            )}
                            title={step.name}
                          >
                            {isAction ? <Zap className="h-2 w-2 shrink-0" /> : <Box className="h-2 w-2 shrink-0" />}
                            <span className="truncate">{step.name}</span>
                          </span>
                        );
                      })}
                      {order.steps.length > 2 && (
                        <span className="self-center text-[9px] text-slate-400">+{order.steps.length - 2}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-2 py-1 font-mono text-[10px] text-slate-500">{order.version}</td>
                <td className="max-w-0 px-2 py-1">
                  <span className="line-clamp-2 text-[10px] leading-snug text-slate-600" title={releaseStrategySummary(order)}>
                    {releaseStrategySummary(order)}
                  </span>
                </td>
                <td className="px-2 py-1">
                  <div className="flex flex-col gap-0 text-[10px] leading-tight">
                    <span className="truncate font-medium text-slate-700">{order.creator}</span>
                    <span className="truncate text-[9px] text-slate-400">{order.createdAt}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-2 py-1">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-2 py-1">
                  <div className="flex items-center gap-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeployment(order);
                      }}
                      className="rounded p-1 text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-600"
                      title="进入部署"
                    >
                      <PlayCircle className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(order);
                      }}
                      className="rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title="删除变更单"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <OrderPaginationBar
          page={orderPage}
          pageSize={ORDER_LIST_PAGE_SIZE}
          total={orders.length}
          onPageChange={setOrderPage}
        />
      </div>

      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl"
            >
              <h3 className="text-lg font-bold text-slate-900">确认删除变更单？</h3>
              <p className="mt-2 text-sm text-slate-600">
                将永久从列表中移除「{deleteTarget.title}」（{deleteTarget.id}），此操作不可恢复。
              </p>
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteOrder}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700"
                >
                  确认删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ status }: { status: DeploymentStatus }) {
  const configs: Record<DeploymentStatus, { label: string, icon: any, class: string }> = {
    pending: { label: '待提交', icon: Clock, class: 'bg-slate-100 text-slate-600' },
    approving: { label: '审批中', icon: ShieldCheck, class: 'bg-amber-100 text-amber-600' },
    deploying: { label: '部署中', icon: PlayCircle, class: 'bg-blue-100 text-blue-600 animate-pulse' },
    success: { label: '已完成', icon: CheckCircle2, class: 'bg-emerald-100 text-emerald-600' },
    failed: { label: '已失败', icon: XCircle, class: 'bg-rose-100 text-rose-600' },
    rollback: { label: '已回滚', icon: Info, class: 'bg-indigo-100 text-indigo-600' },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold leading-none',
        config.class
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
    </span>
  );
}

function ChangeOrderEditor({ onClose, onComplete }: { onClose: () => void, onComplete: (order: ChangeOrder) => void }) {
  const [activeTab, setActiveTab] = useState(1);
  const [showScenarioModal, setShowScenarioModal] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showValidationPresetModal, setShowValidationPresetModal] = useState(false);
  const [showValidationNodeModal, setShowValidationNodeModal] = useState(false);
  const [activeScenarioContextId, setActiveScenarioContextId] = useState<string | null>(null);
  const [activeValidationScenarioId, setActiveValidationScenarioId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    version: string;
    /** 选中的部署环境 ID（与环境管理中的环境对应） */
    environmentId: string;
    scenarioIds: string[];
    orchestratedSteps: Partial<ChangeOrderStep>[];
    releaseStrategy: ReleaseStrategyConfig;
    validationConfig: ChangeOrderValidationConfig;
    rollbackConfig: ChangeOrderRollbackConfig;
  }>({
    title: '',
    description: '',
    version: '',
    environmentId: 'env-1',
    scenarioIds: [],
    orchestratedSteps: [],
    releaseStrategy: defaultReleaseStrategy(),
    validationConfig: {
      monitorWindowMinutes: 30,
      notes: '',
      items: [],
    },
    rollbackConfig: {
      strategy: 'manual',
      gate: 'standard',
      notes: '',
    },
  });

  /** 变更步骤：每个任务上传部署包所用的隐藏 file 控件引用 */
  const stepPackageFileInputRef = useRef<HTMLInputElement>(null);
  /** 当前触发文件选择对应的步骤 id（选完后写回该步骤的 deploymentPackage） */
  const stepPackageUploadTargetRef = useRef<string | null>(null);

  const isStep1Valid =
    formData.title && formData.description && formData.version && formData.environmentId;
  const isStep2Valid = formData.scenarioIds.length > 0 && formData.orchestratedSteps.length > 0;

  /** 回滚策略在界面上的中文展示 */
  const rollbackStrategyLabel = (s: ChangeOrderRollbackConfig['strategy']) =>
    s === 'manual' ? '人工回滚' : '自动回滚至上一版本';

  /** 回滚门控在界面上的中文展示 */
  const rollbackGateLabel = (g: ChangeOrderRollbackConfig['gate']) => {
    const map: Record<ChangeOrderRollbackConfig['gate'], string> = {
      standard: '按策略执行（允许按配置自动触发）',
      approval_first: '须人工确认后方可回滚（禁止自动触发）',
      on_demand: '按需评估（由负责人现场决定是否回滚）',
    };
    return map[g];
  };

  const handleSubmit = () => {
    const envMeta = DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === formData.environmentId);
    const newOrder: ChangeOrder = {
      id: `CR-${Date.now().toString().slice(-8)}`,
      title: formData.title,
      application: 'rdsd',
      environmentId: formData.environmentId,
      environmentName: envMeta?.name,
      environmentCode: envMeta?.code,
      description: formData.description,
      creator: '管理员',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      status: 'approving',
      scenarioIds: formData.scenarioIds,
      version: formData.version,
      steps: formData.orchestratedSteps.map((s, idx) => ({
        ...s,
        order: idx + 1
      })) as ChangeOrderStep[],
      releaseStrategy: formData.releaseStrategy,
      validationConfig: formData.validationConfig,
      rollbackConfig: formData.rollbackConfig,
    };
    onComplete(newOrder);
  };

  /** 打开文件选择器，将上传目标绑定到指定步骤 id */
  const openStepPackagePicker = (stepId: string) => {
    stepPackageUploadTargetRef.current = stepId;
    stepPackageFileInputRef.current?.click();
  };

  /** 选择本地文件后把文件名写入对应步骤（演示环境不上传服务端） */
  const handleStepPackageFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetId = stepPackageUploadTargetRef.current;
    e.currentTarget.value = '';
    stepPackageUploadTargetRef.current = null;
    if (!file || !targetId) return;
    setFormData((prev) => ({
      ...prev,
      orchestratedSteps: prev.orchestratedSteps.map((st) =>
        st.id === targetId ? { ...st, deploymentPackage: file.name } : st
      ),
    }));
  };

  /** 清除某步骤已选的部署包文件名 */
  const clearStepDeploymentPackage = (stepId: string) => {
    setFormData((prev) => ({
      ...prev,
      orchestratedSteps: prev.orchestratedSteps.map((st) =>
        st.id === stepId ? { ...st, deploymentPackage: undefined } : st
      ),
    }));
  };

  /** 设置某主步骤下子步骤的串行/并行执行约定 */
  const setStepSubStepExecutionMode = (stepId: string, mode: 'serial' | 'parallel') => {
    setFormData((prev) => ({
      ...prev,
      orchestratedSteps: prev.orchestratedSteps.map((st) =>
        st.id === stepId ? { ...st, subStepExecutionMode: mode } : st
      ),
    }));
  };

  const addDeploymentStep = (templateId: string, scenId: string) => {
    const tpl = MOCK_TEMPLATES.find(t => t.id === templateId);
    const newStep: Partial<ChangeOrderStep> = {
      id: `step-${Date.now()}`,
      type: 'deployment',
      templateId,
      scenarioId: scenId,
      name: tpl?.name || '未知任务',
      status: 'pending',
      subStepExecutionMode: 'serial',
    };
    setFormData(prev => ({ ...prev, orchestratedSteps: [...prev.orchestratedSteps, newStep] }));
    setShowTemplateModal(false);
    setActiveScenarioContextId(null);
  };

  const removeStep = (id: string) => {
    setFormData(prev => ({ ...prev, orchestratedSteps: prev.orchestratedSteps.filter(s => s.id !== id) }));
  };

  const moveStep = (idx: number, direction: 'up' | 'down') => {
    const newSteps = [...formData.orchestratedSteps];
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;
    [newSteps[idx], newSteps[targetIdx]] = [newSteps[targetIdx], newSteps[idx]];
    setFormData(prev => ({ ...prev, orchestratedSteps: newSteps }));
  };

  const removeScenario = (scenId: string) => {
    setFormData((prev) => {
      const nextModes = { ...prev.validationConfig.scenarioSubStepExecutionMode };
      delete nextModes[scenId];
      return {
        ...prev,
        scenarioIds: prev.scenarioIds.filter((id) => id !== scenId),
        orchestratedSteps: prev.orchestratedSteps.filter((s) => s.scenarioId !== scenId),
        validationConfig: {
          ...prev.validationConfig,
          items: prev.validationConfig.items.filter((i) => i.scenarioId !== scenId),
          scenarioSubStepExecutionMode: nextModes,
        },
      };
    });
  };

  /** 应用标准验证库：为每个已选部署场景追加一套验证节点 */
  const applyValidationPreset = (presetId: string) => {
    const pack = PRESET_VALIDATION_PACKS.find((p) => p.id === presetId);
    if (!pack) return;
    setFormData((prev) => {
      if (prev.scenarioIds.length === 0) return prev;
      const newItems: ChangeOrderValidationItem[] = [];
      let seed = Date.now();
      for (const scenId of prev.scenarioIds) {
        for (const it of pack.items) {
          seed += 1;
          newItems.push({
            id: `val-${seed}-${Math.random().toString(36).slice(2, 7)}`,
            scenarioId: scenId,
            name: it.name,
            kind: it.kind,
          });
        }
      }
      return {
        ...prev,
        validationConfig: {
          ...prev.validationConfig,
          items: [...prev.validationConfig.items, ...newItems],
        },
      };
    });
    setShowValidationPresetModal(false);
  };

  /** 向指定场景追加一条验证节点 */
  const addValidationItem = (
    scenarioId: string,
    item: Omit<ChangeOrderValidationItem, 'id' | 'scenarioId'>
  ) => {
    setFormData((prev) => ({
      ...prev,
      validationConfig: {
        ...prev.validationConfig,
        items: [
          ...prev.validationConfig.items,
          {
            ...item,
            id: `val-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            scenarioId,
          },
        ],
      },
    }));
    setShowValidationNodeModal(false);
    setActiveValidationScenarioId(null);
  };

  /** 删除验证节点 */
  const removeValidationItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      validationConfig: {
        ...prev.validationConfig,
        items: prev.validationConfig.items.filter((i) => i.id !== id),
      },
    }));
  };

  /** 在同一张列表内调整验证节点顺序（与变更步骤全局顺序一致） */
  const moveValidationItem = (idx: number, direction: 'up' | 'down') => {
    setFormData((prev) => {
      const items = [...prev.validationConfig.items];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= items.length) return prev;
      [items[idx], items[targetIdx]] = [items[targetIdx], items[idx]];
      return { ...prev, validationConfig: { ...prev.validationConfig, items } };
    });
  };

  const applyPresetScenario = (presetId: string) => {
    const preset = PRESET_SCENARIOS.find(p => p.id === presetId);
    if (!preset) return;

    // We add the scenario if it doesn't exist
    const newScenarioIds = [...formData.scenarioIds];
    if (!newScenarioIds.includes(preset.scenarioId)) {
      newScenarioIds.push(preset.scenarioId);
    }

    // Prepare steps with unique IDs
    const newSteps: Partial<ChangeOrderStep>[] = preset.steps.map((s) => ({
      ...s,
      id: `${s.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      scenarioId: preset.scenarioId,
      status: 'pending',
      subStepExecutionMode: 'serial',
    }));

    setFormData(prev => ({
      ...prev,
      scenarioIds: newScenarioIds,
      orchestratedSteps: [...prev.orchestratedSteps, ...newSteps]
    }));
    setShowPresetModal(false);
  };

  return (
    <>
      {/* Tab Header */}
      <div className="flex border-b border-slate-100 bg-slate-50/50 p-2">
        {[
          { id: 1, label: '1. 基本信息', icon: Info },
          { id: 2, label: '2. 变更步骤', icon: Layers },
          { id: 3, label: '3. 验证步骤', icon: ClipboardCheck },
          { id: 4, label: '4. 回滚步骤', icon: RotateCcw },
          { id: 5, label: '5. 变更预览', icon: Eye },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 text-sm font-bold transition relative",
              activeTab === tab.id ? "text-indigo-600" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600" : "text-slate-300")} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 p-8 overflow-y-auto min-h-[500px] bg-slate-50/10 relative">
        <AnimatePresence mode="wait">
          {activeTab === 1 && (
            <motion.div 
              key="tab1" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 max-w-2xl mx-auto"
            >
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">变更单标题 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="例如：2024年4月常规功能更新" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">发布版本 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formData.version}
                  onChange={e => setFormData({ ...formData, version: e.target.value })}
                  placeholder="v1.x.x" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm font-mono"
                />
              </div>

              {/* 部署环境：与平台环境管理中的条目对应，必选 */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-800">
                    部署环境 <span className="text-red-500">*</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  选择本次变更发布的目标环境，将影响流水线目标集群与配置作用域。
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {DEPLOYMENT_ENVIRONMENTS.map((env) => (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, environmentId: env.id }))}
                      className={cn(
                        'rounded-xl border px-4 py-3 text-left text-sm transition',
                        formData.environmentId === env.id
                          ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-100'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                      )}
                    >
                      <span className="font-bold text-slate-900">{env.name}</span>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-400">{env.code}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{env.remark}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700">变更说明 <span className="text-red-500">*</span></label>
                <textarea 
                  rows={4}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="详细描述本次变更的内容、风险及回滚策略..." 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm"
                ></textarea>
              </div>

              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-800">发布策略</span>
                </div>
                <p className="text-xs text-slate-500">
                  仅两种模式：金丝雀固定将 <strong className="text-slate-700">50%</strong> 流量切至新版本；全量则一次性切换全部流量。
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, releaseStrategy: { kind: 'canary' } }))
                    }
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left text-sm transition',
                      formData.releaseStrategy.kind === 'canary'
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-100'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    )}
                  >
                    <span className="font-bold text-slate-900">金丝雀（50% 灰度）</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      一半流量到新版本，指标正常后再全量（比例由平台固定为 50%）
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, releaseStrategy: { kind: 'full' } }))
                    }
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left text-sm transition',
                      formData.releaseStrategy.kind === 'full'
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-100'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    )}
                  >
                    <span className="font-bold text-slate-900">全量发布</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      一次性将生产流量全部指向新版本，请确认窗口期与回滚预案
                    </p>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 2 && (
            <motion.div 
              key="tab2" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 max-w-3xl mx-auto pb-12"
            >
              <div className="space-y-6">
                <input
                  ref={stepPackageFileInputRef}
                  type="file"
                  className="hidden"
                  accept=".zip,.tgz,.tar.gz,.tar,.gz,.jar,.war,.rar,.7z"
                  aria-hidden
                  onChange={handleStepPackageFileChange}
                />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      变更步骤与方案编排
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Multi-Scenario Lifecycle Engineering</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowPresetModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 group"
                    >
                      <Plus className="w-4 h-4 group-hover:rotate-90 transition duration-300" /> 
                      添加标准部署场景库
                    </button>
                    <button 
                      onClick={() => setShowScenarioModal(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 group"
                    >
                      <Plus className="w-4 h-4 group-hover:rotate-90 transition duration-300" /> 
                      添加部署步骤
                    </button>
                  </div>
                </div>

                {formData.scenarioIds.length > 0 ? (
                  <div className="space-y-12">
                    {formData.scenarioIds.map((scenId) => {
                      const scenario = MOCK_SCENARIOS.find(s => s.id === scenId);
                      
                      return (
                        <div key={scenId} className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                          {/* Scenario header card */}
                          <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600" />
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                                <Layers className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{scenario?.name}</p>
                                <p className="text-xs text-slate-400 mt-0.5 font-mono">SCENARIO_ID: {scenId}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => removeScenario(scenId)}
                                className="text-xs font-bold text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition border border-transparent hover:border-rose-100"
                              >
                                移除场景
                              </button>
                            </div>
                          </div>

                          {/* Step list for this scenario */}
                          <div className="relative pl-12 space-y-4">
                            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200 border-l border-dashed border-slate-300" />
                            
                            {formData.orchestratedSteps
                              .map((s, globalIndex) => ({ s, globalIndex }))
                              .filter(({ s }) => s.scenarioId === scenId)
                              .map(({ s, globalIndex }, sceneInnerIndex) => (
                                <motion.div 
                                  layout
                                  key={s.id}
                                  className={cn(
                                    "relative flex items-center gap-4 p-4 rounded-2xl border transition group",
                                    s.type === 'pipeline_action' ? "bg-amber-50/30 border-amber-100" : "bg-white border-slate-200 hover:border-slate-300 shadow-sm hover:shadow"
                                  )}
                                >
                                  <div className={cn(
                                    "absolute -left-10 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center",
                                    s.type === 'pipeline_action' ? "border-amber-400" : "border-indigo-400"
                                  )}>
                                    <div className={cn("w-1.5 h-1.5 rounded-full", s.type === 'pipeline_action' ? "bg-amber-400" : "bg-indigo-400")} />
                                  </div>

                                  <div className={cn(
                                    "w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
                                    s.type === 'pipeline_action' ? "bg-amber-100 text-amber-600" : "bg-indigo-50 text-indigo-500"
                                  )}>
                                    {sceneInnerIndex + 1}
                                  </div>

                                  {/* 执行方式：下拉选择串行 / 并行 */}
                                  <div className="flex shrink-0 flex-col gap-1 border-r border-slate-100 pr-3">
                                    <label
                                      htmlFor={`sub-step-exec-${s.id}`}
                                      className="whitespace-nowrap text-[9px] font-semibold text-slate-400"
                                    >
                                      执行方式
                                    </label>
                                    <select
                                      id={`sub-step-exec-${s.id}`}
                                      value={s.subStepExecutionMode ?? 'serial'}
                                      onChange={(e) =>
                                        setStepSubStepExecutionMode(
                                          s.id!,
                                          e.target.value as 'serial' | 'parallel'
                                        )
                                      }
                                      className="min-w-[6.5rem] cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-2 text-[11px] font-semibold text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                    >
                                      <option value="serial">串行</option>
                                      <option value="parallel">并行</option>
                                    </select>
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
                                      {s.type === 'pipeline_action' ? `PIPE: ${s.actionType}` : 'DEPL: 部署任务'}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => openStepPackagePicker(s.id!)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/90 px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-sm transition hover:bg-indigo-100"
                                      >
                                        <Upload className="h-3.5 w-3.5 shrink-0" />
                                        上传部署包
                                      </button>
                                      {s.deploymentPackage ? (
                                        <>
                                          <span
                                            className="max-w-[12rem] truncate font-mono text-[11px] text-slate-600 sm:max-w-[18rem]"
                                            title={s.deploymentPackage}
                                          >
                                            {s.deploymentPackage}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => clearStepDeploymentPackage(s.id!)}
                                            className="text-[11px] font-bold text-rose-500 transition hover:underline"
                                          >
                                            清除
                                          </button>
                                        </>
                                      ) : (
                                        <span className="text-[11px] text-slate-400">未选择部署包</span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition duration-200">
                                    <button onClick={() => moveStep(globalIndex, 'up')} disabled={globalIndex === 0} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                                    <button onClick={() => moveStep(globalIndex, 'down')} disabled={globalIndex === formData.orchestratedSteps.length - 1} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                    <button onClick={() => removeStep(s.id!)} className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 transition"><Trash2 className="w-4 h-4" /></button>
                                  </div>
                                </motion.div>
                              ))}

                            <button 
                              onClick={() => {
                                setActiveScenarioContextId(scenId);
                                setShowTemplateModal(true);
                              }}
                              className="relative flex items-center gap-3 w-full p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition duration-300"
                            >
                              <div className="absolute -left-10 w-4 h-4 rounded-full border-2 border-slate-200 bg-white" />
                              <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200">
                                <Plus className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-bold">为 {scenario?.name} 添加任务或控制节点</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div 
                    onClick={() => setShowScenarioModal(true)}
                    className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition cursor-pointer group"
                  >
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition duration-500 mb-6 border border-slate-100">
                      <Layers className="w-10 h-10 text-slate-300 group-hover:text-indigo-600" />
                    </div>
                    <p className="text-lg font-bold text-slate-400 group-hover:text-indigo-900 transition">点击此处添加部署步骤</p>
                    <p className="text-sm text-slate-300 mt-2">支持添加多个场景，并在每个场景下编排具体的生命周期任务</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 向导第 3 步：与变更步骤相同的多场景编排（验证节点） */}
          {activeTab === 3 && (
            <motion.div
              key="tab3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-3xl space-y-8 pb-12"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-slate-800">
                      <ClipboardCheck className="h-4 w-4 text-indigo-500" />
                      验证步骤与门禁编排
                    </h4>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-slate-400">
                      Multi-Scenario Validation Gatekeeping
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowValidationPresetModal(true)}
                      className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-indigo-100 transition hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 transition duration-300 group-hover:rotate-90" />
                      应用标准验证库
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScenarioModal(true)}
                      className="group flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xl shadow-indigo-100 transition hover:bg-indigo-700"
                    >
                      <Plus className="h-4 w-4 transition duration-300 group-hover:rotate-90" />
                      添加部署步骤
                    </button>
                  </div>
                </div>

                {formData.scenarioIds.length > 0 ? (
                  <div className="space-y-12">
                    {formData.scenarioIds.map((scenId) => {
                      const scenario = MOCK_SCENARIOS.find((s) => s.id === scenId);
                      return (
                        <div key={scenId} className="animate-in slide-in-from-bottom-4 space-y-6 duration-500">
                          <div className="relative flex items-center justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="absolute bottom-0 left-0 top-0 w-1.5 bg-indigo-600" />
                            <div className="flex items-center gap-4">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Layers className="h-6 w-6" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{scenario?.name}</p>
                                <p className="mt-0.5 font-mono text-xs text-slate-400">SCENARIO_ID: {scenId}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
                              {/* 该场景下验证节点的执行方式（与部署执行页「执行方式」列一致） */}
                              <div className="flex shrink-0 flex-col gap-1 border-r border-slate-100 pr-3">
                                <label
                                  htmlFor={`val-scen-exec-${scenId}`}
                                  className="whitespace-nowrap text-[9px] font-semibold text-slate-400"
                                >
                                  执行方式
                                </label>
                                <select
                                  id={`val-scen-exec-${scenId}`}
                                  value={formData.validationConfig.scenarioSubStepExecutionMode?.[scenId] ?? 'serial'}
                                  onChange={(e) =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      validationConfig: {
                                        ...prev.validationConfig,
                                        scenarioSubStepExecutionMode: {
                                          ...prev.validationConfig.scenarioSubStepExecutionMode,
                                          [scenId]: e.target.value as 'serial' | 'parallel',
                                        },
                                      },
                                    }))
                                  }
                                  className="min-w-[5.5rem] cursor-pointer rounded-lg border border-slate-200 bg-white py-1.5 pl-2 pr-2 text-[11px] font-semibold text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                >
                                  <option value="serial">串行</option>
                                  <option value="parallel">并行</option>
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeScenario(scenId)}
                                className="rounded-xl border border-transparent px-3 py-1.5 text-xs font-bold text-rose-500 transition hover:border-rose-100 hover:bg-rose-50"
                              >
                                移除场景
                              </button>
                            </div>
                          </div>

                          <div className="relative space-y-4 pl-12">
                            <div className="absolute bottom-0 left-6 top-0 w-0.5 border-l border-dashed border-slate-300 bg-slate-200" />

                            {formData.validationConfig.items
                              .map((s, globalIndex) => ({ s, globalIndex }))
                              .filter(({ s }) => s.scenarioId === scenId)
                              .map(({ s, globalIndex }, sceneInnerIndex) => (
                                <motion.div
                                  layout
                                  key={s.id}
                                  className={cn(
                                    'group relative flex items-center gap-4 rounded-2xl border p-4 transition',
                                    s.kind === 'manual_gate'
                                      ? 'border-amber-100 bg-amber-50/30'
                                      : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow'
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'absolute -left-10 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white',
                                      s.kind === 'manual_gate' ? 'border-amber-400' : 'border-indigo-400'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'h-1.5 w-1.5 rounded-full',
                                        s.kind === 'manual_gate' ? 'bg-amber-400' : 'bg-indigo-400'
                                      )}
                                    />
                                  </div>

                                  <div
                                    className={cn(
                                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                                      s.kind === 'manual_gate'
                                        ? 'bg-amber-100 text-amber-600'
                                        : 'bg-indigo-50 text-indigo-500'
                                    )}
                                  >
                                    {sceneInnerIndex + 1}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-bold text-slate-800">{s.name}</p>
                                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                                      VAL: {validationKindLabel(s.kind)}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-100 transition duration-200 sm:opacity-0 sm:group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() => moveValidationItem(globalIndex, 'up')}
                                      disabled={globalIndex === 0}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-20"
                                    >
                                      <ArrowUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveValidationItem(globalIndex, 'down')}
                                      disabled={globalIndex === formData.validationConfig.items.length - 1}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 disabled:opacity-20"
                                    >
                                      <ArrowDown className="h-4 w-4" />
                                    </button>
                                    <div className="mx-1 h-4 w-[1px] bg-slate-200" />
                                    <button
                                      type="button"
                                      onClick={() => removeValidationItem(s.id)}
                                      className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              ))}

                            <button
                              type="button"
                              onClick={() => {
                                setActiveValidationScenarioId(scenId);
                                setShowValidationNodeModal(true);
                              }}
                              className="relative flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 p-4 text-slate-400 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
                            >
                              <div className="absolute -left-10 h-4 w-4 rounded-full border-2 border-slate-200 bg-white" />
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                                <Plus className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-bold">
                                为 {scenario?.name} 添加验证或门禁节点
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveTab(2)}
                    className="group flex w-full cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-20 transition hover:border-indigo-400 hover:bg-indigo-50/50"
                  >
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-500 group-hover:scale-110">
                      <Layers className="h-10 w-10 text-slate-300 transition group-hover:text-indigo-600" />
                    </div>
                    <p className="text-lg font-bold text-slate-400 transition group-hover:text-indigo-900">
                      请先在「变更步骤」中添加部署步骤
                    </p>
                    <p className="mt-2 text-sm text-slate-300">点击前往第 2 步编排部署场景</p>
                  </button>
                )}

                {formData.scenarioIds.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
                      <ListTodo className="h-4 w-4" />
                      全局观察设置
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-1">
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">监控观察窗口（分钟）</label>
                        <input
                          type="number"
                          min={1}
                          max={1440}
                          value={formData.validationConfig.monitorWindowMinutes}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              validationConfig: {
                                ...prev.validationConfig,
                                monitorWindowMinutes: Math.max(1, Number(e.target.value) || 1),
                              },
                            }))
                          }
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-700">补充验证说明</label>
                        <textarea
                          rows={3}
                          value={formData.validationConfig.notes}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              validationConfig: { ...prev.validationConfig, notes: e.target.value },
                            }))
                          }
                          placeholder="例如：阈值、联系人、异常升级路径…"
                          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 向导第 4 步：填写回滚方式与预案说明 */}
          {activeTab === 4 && (
            <motion.div
              key="tab4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-3xl space-y-8 pb-8"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
                  <RotateCcw className="h-4 w-4" />
                  回滚步骤
                </h3>
                <p className="mb-6 text-xs text-slate-500">
                  定义异常时的回滚方式与操作预案，便于执行与审计。
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        rollbackConfig: { ...prev.rollbackConfig, strategy: 'manual' },
                      }))
                    }
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left text-sm transition',
                      formData.rollbackConfig.strategy === 'manual'
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-100'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    )}
                  >
                    <span className="font-bold text-slate-900">人工回滚</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      由运维按预案执行回切或版本还原
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        rollbackConfig: { ...prev.rollbackConfig, strategy: 'auto_previous_version' },
                      }))
                    }
                    className={cn(
                      'rounded-xl border px-4 py-3 text-left text-sm transition',
                      formData.rollbackConfig.strategy === 'auto_previous_version'
                        ? 'border-indigo-600 bg-indigo-50 shadow-sm ring-1 ring-indigo-100'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    )}
                  >
                    <span className="font-bold text-slate-900">自动回滚至上一版本</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                      满足熔断条件时由平台自动切回上一稳定版本
                    </p>
                  </button>
                </div>

                <div className="mt-8 space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-800">回滚决策门控（按需配置）</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                        部分变更在数据、依赖或合规上存在不确定性，需要人在故障时判断是否允许回滚；请按需选择门控策略。
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          rollbackConfig: { ...prev.rollbackConfig, gate: 'standard' },
                        }))
                      }
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left text-sm transition',
                        formData.rollbackConfig.gate === 'standard'
                          ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-100'
                          : 'border-slate-200 bg-white/80 hover:border-slate-300'
                      )}
                    >
                      <span className="font-bold text-slate-900">按策略执行</span>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                        与上方回滚方式一致；选自动回滚时，满足条件可由平台自动触发
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          rollbackConfig: { ...prev.rollbackConfig, gate: 'approval_first' },
                        }))
                      }
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left text-sm transition',
                        formData.rollbackConfig.gate === 'approval_first'
                          ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-100'
                          : 'border-slate-200 bg-white/80 hover:border-slate-300'
                      )}
                    >
                      <span className="font-bold text-slate-900">须人工确认</span>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                        未经人工确认不得回滚；自动回滚也不会执行，直至审批通过
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          rollbackConfig: { ...prev.rollbackConfig, gate: 'on_demand' },
                        }))
                      }
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left text-sm transition',
                        formData.rollbackConfig.gate === 'on_demand'
                          ? 'border-indigo-600 bg-white shadow-sm ring-1 ring-indigo-100'
                          : 'border-slate-200 bg-white/80 hover:border-slate-300'
                      )}
                    >
                      <span className="font-bold text-slate-900">按需现场决策</span>
                      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                        是否回滚由负责人在事件中评估决定，平台不自动代劳
                      </p>
                    </button>
                  </div>
                  {formData.rollbackConfig.gate === 'approval_first' &&
                    formData.rollbackConfig.strategy === 'auto_previous_version' && (
                      <p className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2 text-[11px] text-amber-900">
                        提示：当前为自动回滚策略，但门控为「须人工确认」——平台将不会在未经确认时自动回滚。
                      </p>
                    )}
                  {formData.rollbackConfig.gate === 'on_demand' && (
                    <p className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-[11px] text-slate-600">
                      建议在下方「预案说明」中写明决策人、升级路径与不宜回滚的情形（如已写入数据不可逆等）。
                    </p>
                  )}
                </div>

                {/* 回滚配置子项（策略/门控/说明）在引擎侧串行或并行推进 */}
                <div className="mt-6 flex flex-col gap-1.5 sm:flex-row sm:items-end sm:gap-4">
                  <label
                    htmlFor="rollback-sub-exec-mode"
                    className="text-sm font-bold text-slate-700"
                  >
                    执行方式
                  </label>
                  <select
                    id="rollback-sub-exec-mode"
                    value={formData.rollbackConfig.subStepExecutionMode ?? 'serial'}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rollbackConfig: {
                          ...prev.rollbackConfig,
                          subStepExecutionMode: e.target.value as 'serial' | 'parallel',
                        },
                      }))
                    }
                    className="max-w-xs cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  >
                    <option value="serial">串行</option>
                    <option value="parallel">并行</option>
                  </select>
                </div>

                <div className="mt-6 space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">回滚预案与操作说明</label>
                  <textarea
                    rows={5}
                    value={formData.rollbackConfig.notes}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        rollbackConfig: { ...prev.rollbackConfig, notes: e.target.value },
                      }))
                    }
                    placeholder="例如：回滚顺序、依赖检查、数据补偿、联系人…"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* 向导第 5 步：汇总展示后提交变更申请 */}
          {activeTab === 5 && (
            <motion.div
              key="tab5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-auto max-w-3xl space-y-8 pb-8"
            >
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
                  <Info className="h-4 w-4" />
                  基本信息
                </h3>
                <dl className="grid gap-3 text-sm">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">变更单标题</dt>
                    <dd className="font-semibold text-slate-900">{formData.title || '—'}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">发布版本</dt>
                    <dd className="font-mono font-semibold text-slate-900">{formData.version || '—'}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">部署环境</dt>
                    <dd className="font-semibold text-slate-900">
                      {DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === formData.environmentId)?.name ?? '—'}
                      <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                        {DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === formData.environmentId)?.code ?? ''}
                      </span>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">变更说明</dt>
                    <dd className="whitespace-pre-wrap text-slate-800">{formData.description || '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
                  <Rocket className="h-4 w-4" />
                  发布策略
                </h3>
                <p className="text-sm font-bold text-slate-900">{releaseStrategyKindLabel(formData.releaseStrategy.kind)}</p>
                <p className="mt-1 text-xs text-slate-500">{formatReleaseStrategyShort(formData.releaseStrategy)}</p>
                <ul className="mt-3 list-inside list-disc space-y-1 text-xs text-slate-600">
                  {releaseStrategyDetailLines(formData.releaseStrategy).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
                  <Layers className="h-4 w-4" />
                  变更步骤
                </h3>
                {formData.scenarioIds.length === 0 || formData.orchestratedSteps.length === 0 ? (
                  <p className="text-sm text-slate-400">暂无编排步骤，请返回上一步添加。</p>
                ) : (
                  <div className="space-y-8">
                    {formData.scenarioIds.map((scenId) => {
                      const scenario = MOCK_SCENARIOS.find((s) => s.id === scenId);
                      const stepsInScene = formData.orchestratedSteps.filter((s) => s.scenarioId === scenId);
                      return (
                        <div key={scenId} className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
                          <p className="mb-3 font-bold text-slate-900">{scenario?.name ?? scenId}</p>
                          <p className="mb-4 font-mono text-[10px] text-slate-400">{scenId}</p>
                          <ol className="space-y-2">
                            {stepsInScene.map((s, idx) => (
                              <li
                                key={s.id}
                                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm"
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 ring-1 ring-slate-200">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-800">{s.name}</p>
                                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                                    {s.type === 'pipeline_action'
                                      ? `流水线 · ${s.actionType ?? '—'}`
                                      : '部署任务'}
                                  </p>
                                  <p className="mt-1 text-[10px] text-slate-500">
                                    子步骤：
                                    {s.subStepExecutionMode === 'parallel' ? '并行' : '串行'}
                                  </p>
                                  {s.deploymentPackage ? (
                                    <p className="mt-1 truncate font-mono text-[10px] text-slate-500" title={s.deploymentPackage}>
                                      部署包：{s.deploymentPackage}
                                    </p>
                                  ) : null}
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
                  <ClipboardCheck className="h-4 w-4" />
                  验证步骤
                </h3>
                <p className="mb-2 text-xs text-slate-500">
                  观察窗口 {formData.validationConfig.monitorWindowMinutes} 分钟
                  {formData.validationConfig.notes.trim()
                    ? ` · ${formData.validationConfig.notes.trim()}`
                    : ''}
                </p>
                {formData.scenarioIds.length === 0 || formData.validationConfig.items.length === 0 ? (
                  <p className="text-sm text-slate-400">暂无验证编排，请返回验证步骤添加。</p>
                ) : (
                  <div className="mt-4 space-y-8">
                    {formData.scenarioIds.map((scenId) => {
                      const scenario = MOCK_SCENARIOS.find((s) => s.id === scenId);
                      const itemsInScene = formData.validationConfig.items.filter((i) => i.scenarioId === scenId);
                      return (
                        <div key={scenId} className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
                          <p className="mb-3 font-bold text-slate-900">{scenario?.name ?? scenId}</p>
                          <p className="mb-1 font-mono text-[10px] text-slate-400">{scenId}</p>
                          <p className="mb-4 text-[10px] text-slate-500">
                            执行方式：
                            {formData.validationConfig.scenarioSubStepExecutionMode?.[scenId] === 'parallel'
                              ? '并行'
                              : '串行'}
                          </p>
                          {itemsInScene.length === 0 ? (
                            <p className="text-sm text-slate-400">该场景下暂无验证节点。</p>
                          ) : (
                          <ol className="space-y-2">
                            {itemsInScene.map((s, idx) => (
                              <li
                                key={s.id}
                                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm"
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600 ring-1 ring-slate-200">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-slate-800">{s.name}</p>
                                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                                    VAL · {validationKindLabel(s.kind)}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ol>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-indigo-600">
                  <RotateCcw className="h-4 w-4" />
                  回滚步骤
                </h3>
                <dl className="grid gap-3 text-sm">
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">回滚方式</dt>
                    <dd className="font-semibold text-slate-900">
                      {rollbackStrategyLabel(formData.rollbackConfig.strategy)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">回滚门控</dt>
                    <dd className="font-semibold text-slate-900">
                      {rollbackGateLabel(formData.rollbackConfig.gate)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">执行方式</dt>
                    <dd className="font-semibold text-slate-900">
                      {formData.rollbackConfig.subStepExecutionMode === 'parallel' ? '并行' : '串行'}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                    <dt className="shrink-0 text-slate-500">预案说明</dt>
                    <dd className="whitespace-pre-wrap text-slate-800">
                      {formData.rollbackConfig.notes.trim() || '—'}
                    </dd>
                  </div>
                </dl>
              </div>

              <p className="text-center text-xs text-slate-400">请核对以上信息，确认无误后提交变更申请。</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Selection Modals --- */}
        <AnimatePresence>
          {/* Preset Standard Scenarios Modal */}
          {showPresetModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl flex flex-col max-h-[85vh] border border-slate-200"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                      <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                      标准部署场景库
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">选择预定义的发布流水线方案，点击即刻应用</p>
                  </div>
                  <button 
                    onClick={() => setShowPresetModal(false)}
                    className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition"
                  >
                    <XCircle className="w-7 h-7" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                  {PRESET_SCENARIOS.map(preset => (
                    <button 
                      key={preset.id}
                      onClick={() => applyPresetScenario(preset.id)}
                      className="w-full flex items-start gap-6 p-6 rounded-3xl border border-slate-100 bg-slate-50/30 hover:bg-white hover:border-amber-300 hover:shadow-xl hover:shadow-amber-500/5 text-left transition duration-300 group"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:bg-amber-50 transition duration-500 shadow-sm">
                        <Bookmark className="w-7 h-7 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-slate-900 text-lg">{preset.name}</p>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-100 rounded-lg">PRESET</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{preset.description}</p>
                        
                        <div className="mt-5 flex items-center flex-wrap gap-2">
                          {preset.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center">
                              <span className="text-[10px] font-bold text-slate-600 bg-white border border-slate-100 px-2 py-1 rounded-md">
                                {step.name}
                              </span>
                              {idx < preset.steps.length - 1 && <ArrowRight className="w-3 h-3 mx-1.5 text-slate-300" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-3 text-amber-600">
                  <Info className="w-4 h-4" />
                  <p className="text-xs font-medium">应用标准场景后，您仍可以手动调整、增加或删除其中的特定步骤</p>
                </div>
              </motion.div>
            </div>
          )}

          {showScenarioModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-xl rounded-[2rem] p-8 shadow-2xl flex flex-col max-h-[85vh] border border-slate-200"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">添加部署步骤</h3>
                    <p className="text-sm text-slate-500 mt-1">您可以同时添加多个场景以支持更复杂的编排需求</p>
                  </div>
                  <button 
                    onClick={() => setShowScenarioModal(false)}
                    className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                  {MOCK_SCENARIOS_UI_ORDER.map((scen) => (
                    <button 
                      key={scen.id}
                      onClick={() => {
                        if (!formData.scenarioIds.includes(scen.id)) {
                          setFormData({ ...formData, scenarioIds: [...formData.scenarioIds, scen.id] });
                        }
                        setShowScenarioModal(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-5 p-5 rounded-2xl border-2 transition text-left group",
                        formData.scenarioIds.includes(scen.id) ? "bg-indigo-50 border-indigo-600 shadow-sm" : "bg-white border-slate-100 hover:border-slate-300"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition",
                        formData.scenarioIds.includes(scen.id) ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                      )}>
                        <Layers className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <p className={cn("font-bold text-base", formData.scenarioIds.includes(scen.id) ? "text-indigo-900" : "text-slate-800")}>{scen.name}</p>
                        <p className="text-xs text-slate-400 mt-1 font-mono tracking-tight">{scen.id}</p>
                      </div>
                      {formData.scenarioIds.includes(scen.id) && <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100"><CheckCircle2 className="w-4 h-4" /></div>}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}

          {showTemplateModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white w-full max-w-3xl rounded-[2.5rem] p-10 shadow-2xl flex flex-col h-[85vh] border border-slate-200"
              >
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">添加变更节点</h3>
                    <p className="text-sm text-slate-500 mt-1">从当前场景的可用模板中选择任务</p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowTemplateModal(false);
                      setActiveScenarioContextId(null);
                    }}
                    className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 transition border border-slate-100"
                  >
                    <XCircle className="w-7 h-7" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-12">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">适用于 {MOCK_SCENARIOS.find(s => s.id === activeScenarioContextId)?.name} 的模板</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {MOCK_SCENARIOS.find(s => s.id === activeScenarioContextId)?.templateIds.map(tid => {
                        const tpl = MOCK_TEMPLATES.find(t => t.id === tid);
                        return (
                          <button 
                            key={tid}
                            onClick={() => addDeploymentStep(tid, activeScenarioContextId!)}
                            className="p-6 rounded-3xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/10 text-left transition duration-300 group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4 border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition group-hover:scale-110">
                              <Box className="w-5 h-5" />
                            </div>
                            <p className="font-black text-slate-800 text-sm">{tpl?.name || tid}</p>
                            <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">{tpl?.description}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">流水线控制组件</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { type: 'build', name: '构建任务', desc: '触发 CI 引擎执行应用构建与制品产出', icon: Zap },
                        { type: 'test', name: '全量测试', desc: '执行回归测试用例以验证功能的稳定性', icon: ShieldCheck },
                        { type: 'approval', name: '多级审批', desc: '需要相关负责人对本次变更进行合规性核对', icon: User },
                      ].map(action => (
                        <button 
                          key={action.type}
                          onClick={() => {
                            const tplName = { build: '构建任务', test: '测试检查', approval: '流程审批' }[action.type as 'build' | 'test' | 'approval'];
                            const newStep: Partial<ChangeOrderStep> = {
                              id: `action-${Date.now()}`,
                              type: 'pipeline_action',
                              actionType: action.type as any,
                              scenarioId: activeScenarioContextId!,
                              name: tplName,
                              status: 'pending',
                              subStepExecutionMode: 'serial',
                            };
                            setFormData(prev => ({ ...prev, orchestratedSteps: [...prev.orchestratedSteps, newStep] }));
                            setShowTemplateModal(false);
                            setActiveScenarioContextId(null);
                          }}
                          className="p-6 rounded-3xl border border-amber-100/30 bg-amber-50/20 hover:bg-white hover:border-amber-400 hover:shadow-xl hover:shadow-amber-500/10 text-left transition duration-300 group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-4 border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition group-hover:scale-110">
                            <action.icon className="w-5 h-5" />
                          </div>
                          <p className="font-black text-amber-900 text-sm">{action.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {showValidationPresetModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="flex items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
                      <Star className="h-6 w-6 fill-amber-500 text-amber-500" />
                      标准验证库
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">为每个已选部署场景批量追加一套验证节点</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowValidationPresetModal(false)}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition hover:bg-slate-200"
                  >
                    <XCircle className="h-7 w-7" />
                  </button>
                </div>
                <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
                  {PRESET_VALIDATION_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      type="button"
                      onClick={() => applyValidationPreset(pack.id)}
                      className="group flex w-full items-start gap-6 rounded-3xl border border-slate-100 bg-slate-50/30 p-6 text-left transition duration-300 hover:border-amber-300 hover:bg-white hover:shadow-xl hover:shadow-amber-500/5"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm transition duration-500 group-hover:scale-110 group-hover:bg-amber-50">
                        <Bookmark className="h-7 w-7 text-amber-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-black text-slate-900">{pack.name}</p>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">{pack.description}</p>
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                          {pack.items.map((step, idx) => (
                            <div key={`${pack.id}-${idx}`} className="flex items-center">
                              <span className="rounded-md border border-slate-100 bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                                {step.name}
                              </span>
                              {idx < pack.items.length - 1 && <ArrowRight className="mx-1.5 h-3 w-3 text-slate-300" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="mt-8 flex items-center gap-3 border-t border-slate-50 pt-6 text-amber-600">
                  <Info className="h-4 w-4" />
                  <p className="text-xs font-medium">应用后可在各场景下继续增删或调整验证节点顺序</p>
                </div>
              </motion.div>
            </div>
          )}

          {showValidationNodeModal && activeValidationScenarioId && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-2xl"
              >
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-black tracking-tight text-slate-900">添加验证节点</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      场景：{MOCK_SCENARIOS.find((s) => s.id === activeValidationScenarioId)?.name ?? activeValidationScenarioId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowValidationNodeModal(false);
                      setActiveValidationScenarioId(null);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-100 bg-slate-100 text-slate-400 transition hover:bg-slate-200"
                  >
                    <XCircle className="h-7 w-7" />
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    { name: '部署后冒烟', kind: 'smoke' as const, desc: '核心链路自动化用例', icon: Zap },
                    { name: '接口探活', kind: 'probe' as const, desc: 'HTTP/TCP 健康检查', icon: ShieldCheck },
                    { name: '指标观察', kind: 'metrics' as const, desc: '错误率、延迟、饱和度', icon: ListTodo },
                    { name: '人工门禁', kind: 'manual_gate' as const, desc: '业务签字确认', icon: User },
                    { name: '自定义检查', kind: 'custom' as const, desc: '自由命名检查项', icon: Check },
                  ].map((opt) => (
                    <button
                      key={opt.kind}
                      type="button"
                      onClick={() =>
                        addValidationItem(activeValidationScenarioId, {
                          name: opt.name,
                          kind: opt.kind,
                        })
                      }
                      className="group rounded-3xl border border-slate-100 bg-slate-50/50 p-6 text-left transition duration-300 hover:border-indigo-300 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/10"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white transition group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white">
                        <opt.icon className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-black text-slate-800">{opt.name}</p>
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-white p-8">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-3 text-sm font-bold text-slate-400 transition hover:text-slate-600"
        >
          取消
        </button>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {activeTab >= 2 && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab - 1)}
              className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
              上一步
            </button>
          )}
          {activeTab === 1 && (
            <button
              type="button"
              onClick={() => setActiveTab(2)}
              disabled={!isStep1Valid}
              className={cn(
                'flex items-center gap-2 rounded-2xl px-12 py-3 text-sm font-bold text-white transition',
                !isStep1Valid
                  ? 'cursor-not-allowed bg-slate-200 shadow-none'
                  : 'bg-indigo-600 shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700'
              )}
            >
              下一步：编排变更步骤
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {activeTab === 2 && (
            <button
              type="button"
              onClick={() => setActiveTab(3)}
              disabled={!isStep2Valid}
              className={cn(
                'flex items-center gap-2 rounded-2xl px-12 py-3 text-sm font-bold text-white transition',
                !isStep2Valid
                  ? 'cursor-not-allowed bg-slate-200 shadow-none'
                  : 'bg-indigo-600 shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700'
              )}
            >
              下一步：验证步骤
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {activeTab === 3 && (
            <button
              type="button"
              onClick={() => setActiveTab(4)}
              disabled={!isStep1Valid || !isStep2Valid}
              className={cn(
                'flex items-center gap-2 rounded-2xl px-12 py-3 text-sm font-bold text-white transition',
                !isStep1Valid || !isStep2Valid
                  ? 'cursor-not-allowed bg-slate-200 shadow-none'
                  : 'bg-indigo-600 shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700'
              )}
            >
              下一步：回滚步骤
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {activeTab === 4 && (
            <button
              type="button"
              onClick={() => setActiveTab(5)}
              disabled={!isStep1Valid || !isStep2Valid}
              className={cn(
                'flex items-center gap-2 rounded-2xl px-12 py-3 text-sm font-bold text-white transition',
                !isStep1Valid || !isStep2Valid
                  ? 'cursor-not-allowed bg-slate-200 shadow-none'
                  : 'bg-indigo-600 shadow-2xl shadow-indigo-500/20 hover:bg-indigo-700'
              )}
            >
              下一步：变更预览
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {activeTab === 5 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isStep1Valid || !isStep2Valid}
              className={cn(
                'rounded-2xl px-12 py-3 text-sm font-bold text-white shadow-2xl transition',
                !isStep1Valid || !isStep2Valid
                  ? 'cursor-not-allowed bg-slate-200'
                  : 'bg-indigo-600 shadow-indigo-500/30 hover:bg-slate-900'
              )}
            >
              确认提交变更申请
            </button>
          )}
        </div>
      </div>
    </>
  );
}
