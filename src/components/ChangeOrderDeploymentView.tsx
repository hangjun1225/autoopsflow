import { useState, type ReactNode } from 'react';
import { DEPLOYMENT_ENVIRONMENTS, MOCK_SCENARIOS } from '../constants';
import type {
  ChangeOrderRollbackGate,
  ChangeOrderRollbackStrategy,
  ChangeOrderValidationItemKind,
} from '../types';
import { ChangeOrder, ChangeOrderStep, ChangeOrderSubStep } from '../types';
import {
  getReleaseStrategy,
  releaseStrategyDetailLines,
  releaseStrategyKindLabel,
} from '../lib/releaseStrategy';
import {
  ChevronLeft,
  PlayCircle,
  CheckCircle2,
  Clock,
  Rocket,
  CornerDownRight,
  RotateCcw,
  Play,
  CircleStop,
  ClipboardCheck,
  Layers,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { cn } from '../lib/utils';

type ChangeOrderDeploymentViewProps = {
  /** 当前要执行部署的变更单 */
  order: ChangeOrder;
  /** 返回变更单列表 */
  onBack: () => void;
};

/** 无后端子步骤数据时，按主步骤类型生成演示子步骤 */
function resolveSubSteps(step: ChangeOrderStep): ChangeOrderSubStep[] {
  if (step.subSteps && step.subSteps.length > 0) return step.subSteps;
  const st = step.status;
  /** 演示生成的子步骤继承主步骤时间；执行中不填结束时间 */
  const subTime = {
    executeStartedAt: step.executeStartedAt,
    executeEndedAt: st === 'running' ? undefined : step.executeEndedAt,
  };
  if (step.type === 'pipeline_action') {
    return [
      { id: `${step.id}-gen-a`, name: '任务调度与排队', status: st, ...subTime },
      { id: `${step.id}-gen-b`, name: '执行与日志采集', status: st, ...subTime },
    ];
  }
  return [
    { id: `${step.id}-gen-a`, name: '前置检查', status: st, ...subTime },
    { id: `${step.id}-gen-b`, name: '配置/资源下发', status: st, ...subTime },
    { id: `${step.id}-gen-c`, name: '健康检查与收尾', status: st, ...subTime },
  ];
}

/** 子步骤执行方式展示文案（未配置时默认串行，与新建向导一致） */
function subStepExecutionLabel(step: ChangeOrderStep): { text: string; parallel: boolean } {
  const parallel = step.subStepExecutionMode === 'parallel';
  return { text: parallel ? '并行' : '串行', parallel };
}

/** 某验证场景下验证节点是否并行（未配置则串行） */
function validationScenarioParallel(
  scenarioId: string,
  cfg: ChangeOrder['validationConfig']
): boolean {
  return cfg?.scenarioSubStepExecutionMode?.[scenarioId] === 'parallel';
}

/** 回滚配置子项是否并行展示（未配置则串行） */
function rollbackSubStepsParallel(cfg: ChangeOrder['rollbackConfig']): boolean {
  return cfg?.subStepExecutionMode === 'parallel';
}

/** 每条子步骤行前：与主步骤约定的串行/并行（同一主步骤下各子步骤一致） */
function SubStepExecModeBadge({ parallel }: { parallel: boolean }) {
  return (
    // 外层：垂直居中，与子步骤行栅格首列对齐
    <div className="flex items-center justify-center self-center px-0.5">
      {/* 单行小卡片：并行紫 / 串行灰，文案为「并行」或「串行」 */}
      <span
        className={cn(
          'inline-flex min-w-[2.5rem] max-w-[4.25rem] items-center justify-center rounded-md border px-1.5 py-1 text-center text-[11px] font-bold leading-none shadow-sm',
          parallel ? 'border-violet-200 bg-violet-50 text-violet-800' : 'border-slate-200 bg-slate-100 text-slate-800'
        )}
      >
        {parallel ? '并行' : '串行'}
      </span>
    </div>
  );
}

const subStatusLabel = (s: ChangeOrderSubStep['status']) => {
  if (s === 'success') return '已完成';
  if (s === 'pending') return '待执行';
  if (s === 'running') return '执行中';
  if (s === 'failed') return '失败';
  return s;
};

/** 将可选时间格式化为界面展示（缺省为 -，与固定宽列对齐） */
function formatExecuteTimeLabel(raw?: string): string {
  if (raw == null || String(raw).trim() === '') return '-';
  const t = Date.parse(raw);
  if (Number.isNaN(t)) return String(raw);
  return new Date(t).toLocaleString('zh-CN', { hour12: false });
}

/** 主步骤：结束时间展示；执行中固定为 - */
function formatMainStepEndDisplay(status: ChangeOrderStep['status'], endedAt?: string): string {
  if (status === 'running') return '-';
  return formatExecuteTimeLabel(endedAt);
}

/** 子步骤：结束时间展示；执行中固定为 - */
function formatSubStepEndDisplay(status: ChangeOrderSubStep['status'], endedAt?: string): string {
  if (status === 'running') return '-';
  return formatExecuteTimeLabel(endedAt);
}

/** 部署包列宽固定；主步骤不展示部署包但保留空列，与子步骤开始/结束时间列对齐 */
const STEP_DEPLOY_PACKAGE_COL = 'w-[10rem] shrink-0 min-w-0';

/** 主/子步骤共用：时刻槽固定宽，「-」与完整时间左对齐且列位置一致 */
const STEP_TIME_VALUE_SLOT =
  'inline-block w-[22ch] min-w-[22ch] shrink-0 truncate text-left font-mono tabular-nums text-slate-700';

/** 验证节点类型短标签（与变更单向导一致） */
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

/** 回滚方式文案 */
function rollbackStrategyLabel(s: ChangeOrderRollbackStrategy) {
  return s === 'manual' ? '人工回滚' : '自动回滚至上一版本';
}

/** 回滚门控文案（与新建向导一致） */
function rollbackGateLabel(g: ChangeOrderRollbackGate) {
  const map: Record<ChangeOrderRollbackGate, string> = {
    standard: '按策略执行（允许按配置自动触发）',
    approval_first: '须人工确认后方可回滚（禁止自动触发）',
    on_demand: '按需评估（由负责人现场决定是否回滚）',
  };
  return map[g];
}

/**
 * 主/子步骤行右侧：部署包（仅子步骤）| 开始时间块与结束时间块之间竖线 + 约 1ch 间距
 */
function StepRowTimeMeta({
  order,
  showDeployPackage,
  executeStartedAt,
  endDisplay,
}: {
  order: ChangeOrder;
  showDeployPackage: boolean;
  executeStartedAt?: string;
  endDisplay: string;
}) {
  const startVal = formatExecuteTimeLabel(executeStartedAt);
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 text-[10px] text-slate-500">
      <div className={cn(STEP_DEPLOY_PACKAGE_COL, 'flex items-center gap-0.5')}>
        {showDeployPackage ? (
          <>
            <span className="shrink-0 text-slate-600">部署包</span>
            <span className="min-w-0 truncate font-mono text-slate-700" title={order.deploymentPackage || undefined}>
              {order.deploymentPackage ?? '—'}
            </span>
          </>
        ) : null}
      </div>
      <span className="shrink-0 px-0.5 text-slate-300" aria-hidden>
        |
      </span>
      {/* 开始/结束两组之间竖线，gap-[1ch] 使线两侧留白对称 */}
      <div className="flex min-w-0 flex-wrap items-center gap-[1ch]">
        <div className="flex min-w-0 items-center gap-0.5">
          <span className="shrink-0 text-slate-600">开始时间</span>
          <span className={STEP_TIME_VALUE_SLOT} title={startVal}>
            {startVal}
          </span>
        </div>
        <div className="h-3.5 w-px shrink-0 self-center bg-slate-200" aria-hidden role="separator" />
        <div className="flex min-w-0 items-center gap-0.5">
          <span className="shrink-0 text-slate-600">结束时间</span>
          <span className={STEP_TIME_VALUE_SLOT} title={endDisplay}>
            {endDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}

/** 状态块与竖线、竖线与按钮之间统一间距（Tailwind gap-3 = 0.75rem） */
const STEP_ACTIONS_INNER_GAP = '0.75rem';
/** 与 StepActionsRow 实际总宽一致：四块 4.25rem、三条 1px 竖线、六段等距间隙 */
const STEP_ACTIONS_COL = `calc(4 * 4.25rem + 3 * 1px + 6 * ${STEP_ACTIONS_INNER_GAP})`;

/** 子步骤行：执行方式 | 与主步骤序号列对齐占位 | 状态图标 | 名称与时间 | 操作区 */
const SUB_STEP_ROW_GRID = `4.25rem 2rem 1.25rem minmax(0, 1fr) ${STEP_ACTIONS_COL}`;

/**
 * 单行步骤操作区：状态 | 竖线 | 执行 | 竖线 | 中断 | 竖线 | 重试
 * @param interruptDisabled 非执行中时为 true，中断按钮置灰
 */
function StepActionsRow({
  statusSlot,
  executeDisabled,
  interruptDisabled,
  retryDisabled = false,
  onExecute,
  onInterrupt,
  onRetry,
  executeTitle,
  interruptTitle,
  retryTitle,
  size = 'md',
}: {
  statusSlot: ReactNode;
  executeDisabled: boolean;
  interruptDisabled: boolean;
  /** 为 true 时重试按钮置灰（用于仅展示约定的配置行） */
  retryDisabled?: boolean;
  onExecute: () => void;
  onInterrupt: () => void;
  onRetry: () => void;
  executeTitle: string;
  interruptTitle: string;
  retryTitle: string;
  size?: 'md' | 'sm';
}) {
  const sm = size === 'sm'; // 是否子步骤小号样式
  return (
    <div
      className="flex w-full min-w-0 shrink-0 items-center gap-3" // gap-3：状态↔竖线、竖线↔执行、执行↔竖线、竖线↔重试 等距
      role="group" // 分组便于无障碍
      aria-label="步骤操作" // 读屏标签
    >
      {/* 状态区：与按钮同宽，与两侧竖线距离由 gap-3 统一 */}
      <div className="flex w-[4.25rem] flex-none items-center justify-center">{statusSlot}</div>
      {/* 竖线 1：已完成/状态 与 执行 之间 */}
      <div className="h-4 w-px shrink-0 self-center bg-slate-200" aria-hidden />
      {/* 执行按钮 */}
      <button
        type="button" // 语义按钮
        disabled={executeDisabled} // 已完成则禁用
        onClick={onExecute} // 触发执行
        className={cn(
          'inline-flex h-8 w-[4.25rem] shrink-0 items-center justify-center gap-1 font-bold border transition shadow-sm', // 与状态区同宽 4.25rem
          sm && 'h-7 w-[4.25rem] text-[10px]', // 子步骤略矮略小字
          !sm && 'text-xs', // 主步骤常规字号
          sm ? 'rounded-md px-1.5' : 'rounded-lg px-2', // 圆角按档
          executeDisabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-80' // 禁用态
            : 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700' // 可执行主色
        )}
        title={executeTitle} // 悬停说明
      >
        <Play className={cn('shrink-0 fill-current', sm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        执行
      </button>
      {/* 竖线：执行 与 中断 之间 */}
      <div className="h-4 w-px shrink-0 self-center bg-slate-200" aria-hidden />
      {/* 中断：仅执行中可点，其余置灰 */}
      <button
        type="button"
        disabled={interruptDisabled}
        onClick={onInterrupt}
        className={cn(
          'inline-flex h-8 w-[4.25rem] shrink-0 items-center justify-center gap-0.5 font-bold border transition',
          sm && 'h-7 w-[4.25rem] text-[10px]',
          !sm && 'text-xs',
          sm ? 'rounded-md px-1' : 'rounded-lg px-1.5',
          interruptDisabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-80'
            : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
        )}
        title={interruptTitle}
      >
        <CircleStop className={cn('shrink-0', sm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        中断
      </button>
      {/* 竖线：中断 与 重试 之间 */}
      <div className="h-4 w-px shrink-0 self-center bg-slate-200" aria-hidden />
      {/* 重试按钮 */}
      <button
        type="button"
        disabled={retryDisabled}
        onClick={onRetry}
        className={cn(
          'inline-flex h-8 w-[4.25rem] shrink-0 items-center justify-center gap-1 font-bold border transition',
          sm && 'h-7 w-[4.25rem] text-[10px]',
          !sm && 'text-xs',
          sm ? 'rounded-md px-1.5' : 'rounded-lg px-2',
          retryDisabled
            ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-80'
            : 'border-indigo-100 bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
        )}
        title={retryTitle}
      >
        <RotateCcw className={cn('shrink-0', sm ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
        重试
      </button>
    </div>
  );
}

/**
 * 变更单部署执行页：展示摘要与步骤进度（演示交互）
 */
export function ChangeOrderDeploymentView({ order, onBack }: ChangeOrderDeploymentViewProps) {
  const steps = order.steps;
  /** 解析后的发布策略（含兼容旧 canaryConfig） */
  const releaseStrategy = getReleaseStrategy(order);
  /** 变更单已完成：验证步骤展示为已完成，回滚约定展示为无需执行（与造数演示一致） */
  const orderCompleted = order.status === 'success';
  /** 回滚块子行共用的执行方式（与 rollbackConfig.subStepExecutionMode 一致；未填为串行） */
  const rollbackExecParallel = order.rollbackConfig
    ? rollbackSubStepsParallel(order.rollbackConfig)
    : false;
  /** 部署环境展示名（优先快照，否则按 ID 反查演示列表） */
  const envDisplay =
    order.environmentName ??
    DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === order.environmentId)?.name ??
    '—';
  /** 部署环境编码 */
  const envCode =
    order.environmentCode ??
    DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === order.environmentId)?.code ??
    '';
  /** 回滚配置行右侧状态徽标（已完成单：无需执行；否则：约定） */
  const rollbackRowStatusMd = orderCompleted ? (
    <span className="inline-flex h-8 w-[4.25rem] flex-none shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 px-0.5 text-center text-[10px] font-bold leading-tight text-slate-500">
      无需执行
    </span>
  ) : (
    <span className="inline-flex h-8 w-[4.25rem] flex-none shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold leading-none text-slate-600">
      约定
    </span>
  );
  /** 执行 / 重试 操作提示（演示） */
  const [actionHint, setActionHint] = useState<string | null>(null);

  const handleExecute = (label: string) => {
    setActionHint(`已触发执行：${label}`);
    window.setTimeout(() => setActionHint(null), 2800);
  };

  const handleRetry = (label: string) => {
    setActionHint(`已触发重试：${label}`);
    window.setTimeout(() => setActionHint(null), 2800);
  };

  const handleInterrupt = (label: string) => {
    setActionHint(`已触发中断：${label}`);
    window.setTimeout(() => setActionHint(null), 2800);
  };

  const stepStatusIcon = (s: ChangeOrderStep) => {
    if (s.status === 'success') return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
    if (s.status === 'running' || s.status === 'pending') return <Clock className="w-5 h-5 text-amber-500 shrink-0" />;
    return <Clock className="w-5 h-5 text-slate-300 shrink-0" />;
  };

  const subStatusIcon = (st: ChangeOrderSubStep['status']) => {
    if (st === 'success') return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    if (st === 'running' || st === 'pending') return <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    return <Clock className="w-3.5 h-3.5 text-slate-300 shrink-0" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-start gap-4">
        <button
          type="button"
          onClick={onBack}
          className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition border border-transparent hover:border-slate-200 shadow-sm shrink-0"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 font-semibold mb-1">{order.id}</div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">部署执行</h1>
          <p className="text-slate-500 text-sm mt-1 truncate">{order.title}</p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 shrink-0"
        >
          <Rocket className="w-4 h-4" />
          执行部署
        </button>
      </div>

      {order.status === 'approving' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <strong>待审批：</strong>
          该变更单处于审批流程，请在左侧菜单「审批与门禁」中通过或驳回后再继续执行部署步骤。
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">发布版本</p>
          <p className="text-lg font-mono font-bold text-slate-800">{order.version}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">部署环境</p>
          <p className="text-lg font-bold leading-tight text-slate-800">{envDisplay}</p>
          {envCode ? <p className="mt-1 font-mono text-xs text-slate-500">{envCode}</p> : null}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">创建人</p>
          <p className="text-lg font-bold text-slate-800">{order.creator}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">场景数</p>
          <p className="text-lg font-bold text-slate-800">{order.scenarioIds?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">发布策略</p>
          <p className="text-sm font-bold leading-tight text-indigo-700">{releaseStrategyKindLabel(releaseStrategy.kind)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 px-5 py-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">策略说明</p>
        <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-slate-700">
          {releaseStrategyDetailLines(releaseStrategy).map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-indigo-400">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
          <PlayCircle className="w-4 h-4 text-indigo-600" />
          <h2 className="text-sm font-bold text-slate-800">部署步骤</h2>
          <span className="text-xs text-slate-400 ml-1">（含子步骤明细）</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {steps.map((step, idx) => {
            const isPipe = step.type === 'pipeline_action';
            const children = resolveSubSteps(step);
            const subExecMode = subStepExecutionLabel(step);
            return (
              <li key={step.id} className="bg-white">
                <div
                  className="grid items-start gap-x-4 px-6 py-4 transition hover:bg-slate-50/60"
                  style={{ gridTemplateColumns: `2rem 1.25rem minmax(0, 1fr) ${STEP_ACTIONS_COL}` }}
                >
                  {/* 第1列：序号 */}
                  <span className="shrink-0 pt-0.5 text-xs font-mono text-slate-400">{String(idx + 1).padStart(2, '0')}</span>
                  {/* 第2列：主步骤状态图标 */}
                  <div className="flex items-center justify-center pt-0.5">{stepStatusIcon(step)}</div>
                  {/* 第3列：标题与执行起止时间同一行 */}
                  <div className="min-w-0 pr-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-bold text-slate-900">{step.name}</p>
                      <StepRowTimeMeta
                        order={order}
                        showDeployPackage={false}
                        executeStartedAt={step.executeStartedAt}
                        endDisplay={formatMainStepEndDisplay(step.status, step.executeEndedAt)}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                      {isPipe ? `流程组件 · ${step.actionType || '—'}` : '部署任务'}
                    </p>
                  </div>
                  {/* 第4列：状态/执行/重试（列宽与 STEP_ACTIONS_COL 一致） */}
                  <div className="pt-0.5">
                  <StepActionsRow
                    size="md"
                    executeDisabled={step.status === 'success'}
                    interruptDisabled={step.status !== 'running'}
                    executeTitle={step.status === 'success' ? '已完成，不可执行' : '执行该主步骤'}
                    interruptTitle={
                      step.status === 'running' ? '中断该主步骤执行' : '仅「执行中」时可中断'
                    }
                    retryTitle="重试该主步骤"
                    onExecute={() => handleExecute(`主步骤「${step.name}」`)}
                    onInterrupt={() => handleInterrupt(`主步骤「${step.name}」`)}
                    onRetry={() => handleRetry(`主步骤「${step.name}」`)}
                    statusSlot={
                      <span
                        className={cn(
                          // 与主步骤「执行」同尺寸；已完成为纯状态展示，无边框
                          'inline-flex h-8 w-[4.25rem] flex-none shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold leading-none',
                          step.status === 'success' && 'bg-emerald-100 text-emerald-800', // 主步骤已完成：背景比子步骤略深
                          step.status === 'pending' && 'border border-amber-200 bg-amber-50 text-amber-700',
                          step.status === 'running' && 'border border-blue-200 bg-blue-50 text-blue-700',
                          step.status === 'failed' && 'border border-rose-200 bg-rose-50 text-rose-700'
                        )}
                      >
                        {step.status === 'success'
                          ? '已完成'
                          : step.status === 'pending'
                            ? '待执行'
                            : step.status === 'running'
                              ? '执行中'
                              : step.status === 'failed'
                                ? '失败'
                                : step.status}
                      </span>
                    }
                  />
                  </div>
                </div>

                <div className="px-6 pb-4 pl-[4.5rem]">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/90 overflow-hidden">
                    {/* 表头：列与子步骤行对齐（首列为「执行方式」） */}
                    <div
                      className="grid items-center gap-x-4 border-b border-slate-100/80 bg-slate-100/40 py-2 pl-3 pr-0 text-[10px] font-bold text-slate-500"
                      style={{ gridTemplateColumns: SUB_STEP_ROW_GRID }}
                    >
                      <span className="text-center text-[9px] font-bold leading-tight text-slate-500">执行方式</span>
                      <span className="block select-none" aria-hidden />
                      <span className="text-center text-[9px] uppercase tracking-wide">状态</span>
                      <div className="flex min-w-0 items-center gap-1.5 uppercase tracking-wider">
                        <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                        子步骤明细
                      </div>
                      <span className="sr-only">操作</span>
                    </div>
                    <ul className="divide-y divide-slate-100/80">
                      {children.map((sub) => (
                        <li
                          key={sub.id}
                          className="grid items-center gap-x-4 py-2.5 pl-3 pr-0 transition hover:bg-white/60"
                          style={{ gridTemplateColumns: SUB_STEP_ROW_GRID }}
                        >
                          {/* 与主步骤约定的串行/并行，逐条子步骤前重复展示以便对照 */}
                          <SubStepExecModeBadge parallel={subExecMode.parallel} />
                          {/* 占位：与主步骤序号列同宽对齐 */}
                          <span className="block select-none" aria-hidden />
                          {/* 第3列：子步骤状态图标 */}
                          <div className="flex items-center justify-center">{subStatusIcon(sub.status)}</div>
                          {/* 第4列：子步骤名称与执行起止时间同一行 */}
                          <div className="min-w-0 pr-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{sub.name}</p>
                              <StepRowTimeMeta
                                order={order}
                                showDeployPackage={true}
                                executeStartedAt={sub.executeStartedAt}
                                endDisplay={formatSubStepEndDisplay(sub.status, sub.executeEndedAt)}
                              />
                            </div>
                          </div>
                          {/* 第5列：与主步骤同一套操作列宽 */}
                          <StepActionsRow
                            size="sm"
                            executeDisabled={sub.status === 'success'}
                            interruptDisabled={sub.status !== 'running'}
                            executeTitle={sub.status === 'success' ? '已完成，不可执行' : '执行该子步骤'}
                            interruptTitle={
                              sub.status === 'running' ? '中断该子步骤执行' : '仅「执行中」时可中断'
                            }
                            retryTitle="重试该子步骤"
                            onExecute={() => handleExecute(`子步骤「${sub.name}」`)}
                            onInterrupt={() => handleInterrupt(`子步骤「${sub.name}」`)}
                            onRetry={() => handleRetry(`子步骤「${sub.name}」`)}
                            statusSlot={
                              <span
                                className={cn(
                                  // 与子步骤「执行」同尺寸；已完成为纯状态展示，无边框
                                  'inline-flex h-7 w-[4.25rem] flex-none shrink-0 items-center justify-center rounded-md px-1.5 text-[10px] font-bold leading-none',
                                  sub.status === 'success' && 'bg-emerald-50 text-emerald-700', // 子步骤已完成：浅一档，与主步骤区分
                                  sub.status === 'pending' && 'border border-amber-200/80 bg-amber-100/80 text-amber-800',
                                  sub.status === 'running' && 'border border-blue-200/80 bg-blue-100/80 text-blue-800',
                                  sub.status === 'failed' && 'border border-rose-200/80 bg-rose-100/80 text-rose-800'
                                )}
                              >
                                {subStatusLabel(sub.status)}
                              </span>
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 验证 / 回滚：与「部署步骤」相同的卡片头、分隔线与栅格列（含子块） */}
      <div className="space-y-8">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <ClipboardCheck className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">验证步骤</h2>
            <span className="ml-1 text-xs text-slate-400">（按场景编排 · 含验证节点明细）</span>
          </div>
          {order.validationConfig ? (
            <>
              <div className="border-b border-slate-100 bg-slate-50/40 px-6 py-3 text-xs leading-relaxed text-slate-600">
                观察窗口 {order.validationConfig.monitorWindowMinutes} 分钟
                {order.validationConfig.notes.trim()
                  ? ` · ${order.validationConfig.notes.trim()}`
                  : ''}
              </div>
              <ul className="divide-y divide-slate-100">
                {order.scenarioIds.length === 0 ? (
                  <li className="bg-white px-6 py-10 text-center text-sm text-slate-400">暂无部署场景，无验证编排。</li>
                ) : (
                  order.scenarioIds.map((scenId, sIdx) => {
                    const scenario = MOCK_SCENARIOS.find((s) => s.id === scenId);
                    const itemsInScene = order.validationConfig!.items.filter((i) => i.scenarioId === scenId);
                    /** 当前场景验证节点执行方式（与向导、部署子步骤一致） */
                    const valExecParallel = validationScenarioParallel(scenId, order.validationConfig);
                    return (
                      <li key={scenId} className="bg-white">
                        <div
                          className="grid items-center gap-x-4 px-6 py-4 transition hover:bg-slate-50/60"
                          style={{ gridTemplateColumns: `2rem 1.25rem minmax(0, 1fr) ${STEP_ACTIONS_COL}` }}
                        >
                          <span className="shrink-0 font-mono text-xs text-slate-400">
                            {String(sIdx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex items-center justify-center">
                            {orderCompleted ? (
                              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                            ) : (
                              <Layers className="h-5 w-5 shrink-0 text-indigo-500" />
                            )}
                          </div>
                          <div className="min-w-0 pr-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <p className="min-w-0 flex-1 truncate font-bold text-slate-900">
                                {scenario?.name ?? scenId}
                              </p>
                              <StepRowTimeMeta
                                order={order}
                                showDeployPackage={false}
                                executeStartedAt={undefined}
                                endDisplay="-"
                              />
                            </div>
                            <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                              验证场景 · {scenId}
                              {itemsInScene.length === 0 ? ' · 该场景下暂无验证节点' : ''}
                            </p>
                          </div>
                          <StepActionsRow
                            size="md"
                            executeDisabled={orderCompleted}
                            interruptDisabled
                            retryDisabled={orderCompleted}
                            executeTitle={
                              orderCompleted ? '验证已完成' : '执行该验证场景（演示）'
                            }
                            interruptTitle="验证场景无中断（演示）"
                            retryTitle={orderCompleted ? '验证已完成' : '重试该验证场景（演示）'}
                            onExecute={() => handleExecute(`验证场景「${scenario?.name ?? scenId}」`)}
                            onInterrupt={() => handleInterrupt(`验证场景「${scenario?.name ?? scenId}」`)}
                            onRetry={() => handleRetry(`验证场景「${scenario?.name ?? scenId}」`)}
                            statusSlot={
                              orderCompleted ? (
                                <span className="inline-flex h-8 w-[4.25rem] flex-none shrink-0 items-center justify-center rounded-lg px-2 text-xs font-bold leading-none bg-emerald-100 text-emerald-800">
                                  已完成
                                </span>
                              ) : (
                                <span className="inline-flex h-8 w-[4.25rem] flex-none shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2 text-xs font-bold leading-none text-amber-700">
                                  待执行
                                </span>
                              )
                            }
                          />
                        </div>

                        {itemsInScene.length > 0 && (
                          <div className="px-6 pb-4 pl-[4.5rem]">
                            <div className="overflow-hidden rounded-xl border border-slate-100 bg-slate-50/90">
                              {/* 表头：与部署子步骤表一致，首列为执行方式 */}
                              <div
                                className="grid items-center gap-x-4 border-b border-slate-100/80 bg-slate-100/40 py-2 pl-3 pr-0 text-[10px] font-bold text-slate-500"
                                style={{ gridTemplateColumns: SUB_STEP_ROW_GRID }}
                              >
                                <span className="text-center text-[9px] font-bold leading-tight text-slate-500">
                                  执行方式
                                </span>
                                <span className="block select-none" aria-hidden />
                                <span className="text-center text-[9px] uppercase tracking-wide">状态</span>
                                <div className="flex min-w-0 items-center gap-1.5 uppercase tracking-wider">
                                  <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                                  验证节点
                                </div>
                                <span className="sr-only">操作</span>
                              </div>
                              <ul className="divide-y divide-slate-100/80">
                                {itemsInScene.map((sub) => (
                                  <li
                                    key={sub.id}
                                    className="grid items-center gap-x-4 py-2.5 pl-3 pr-0 transition hover:bg-white/60"
                                    style={{ gridTemplateColumns: SUB_STEP_ROW_GRID }}
                                  >
                                    {/* 与场景约定的串行/并行 */}
                                    <SubStepExecModeBadge parallel={valExecParallel} />
                                    <span className="block select-none" aria-hidden />
                                    {/* 验证节点状态图标 */}
                                    <div className="flex items-center justify-center">
                                      {orderCompleted ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                      ) : (
                                        <Clock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                      )}
                                    </div>
                                    {/* 第4列：验证节点名称与类型 */}
                                    <div className="min-w-0 pr-2">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{sub.name}</p>
                                        <StepRowTimeMeta
                                          order={order}
                                          showDeployPackage={false}
                                          executeStartedAt={undefined}
                                          endDisplay="-"
                                        />
                                      </div>
                                      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                                        VAL · {validationKindLabel(sub.kind)}
                                      </p>
                                    </div>
                                    {/* 第5列：与部署子步骤同宽操作区 */}
                                    <StepActionsRow
                                      size="sm"
                                      executeDisabled={orderCompleted}
                                      interruptDisabled
                                      retryDisabled={orderCompleted}
                                      executeTitle={orderCompleted ? '验证已完成' : '执行该验证节点（演示）'}
                                      interruptTitle="验证节点无中断（演示）"
                                      retryTitle={orderCompleted ? '验证已完成' : '重试该验证节点（演示）'}
                                      onExecute={() => handleExecute(`验证节点「${sub.name}」`)}
                                      onInterrupt={() => handleInterrupt(`验证节点「${sub.name}」`)}
                                      onRetry={() => handleRetry(`验证节点「${sub.name}」`)}
                                      statusSlot={
                                        orderCompleted ? (
                                          <span className="inline-flex h-7 w-[4.25rem] flex-none shrink-0 items-center justify-center rounded-md px-1.5 text-[10px] font-bold leading-none bg-emerald-50 text-emerald-700">
                                            已完成
                                          </span>
                                        ) : (
                                          <span className="inline-flex h-7 w-[4.25rem] flex-none shrink-0 items-center rounded-md border border-amber-200/80 bg-amber-100/80 px-1.5 text-[10px] font-bold leading-none text-amber-800">
                                            待执行
                                          </span>
                                        )
                                      }
                                    />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </>
          ) : (
            <p className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-400">
              该变更单未记录验证步骤编排（历史数据或未填写）。
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-6 py-4">
            <RotateCcw className="h-4 w-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">回滚步骤</h2>
            <span className="ml-1 text-xs text-slate-400">（变更单约定 · 配置项明细）</span>
          </div>
          {order.rollbackConfig ? (
            <ul className="divide-y divide-slate-100">
              <li className="bg-white">
                <div
                  className="grid items-center gap-x-4 px-6 py-4 transition hover:bg-slate-50/60"
                  style={{ gridTemplateColumns: SUB_STEP_ROW_GRID }}
                >
                  {/* 与变更单约定的回滚子项执行方式（三行一致） */}
                  <SubStepExecModeBadge parallel={rollbackExecParallel} />
                  <span className="shrink-0 font-mono text-xs text-slate-400">01</span>
                  <div className="flex items-center justify-center">
                    <RotateCcw className="h-5 w-5 shrink-0 text-slate-500" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="min-w-0 flex-1 truncate font-bold text-slate-900">
                        {rollbackStrategyLabel(order.rollbackConfig.strategy)}
                      </p>
                      <StepRowTimeMeta
                        order={order}
                        showDeployPackage={false}
                        executeStartedAt={undefined}
                        endDisplay="-"
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">配置 · 回滚方式</p>
                  </div>
                  <StepActionsRow
                    size="md"
                    executeDisabled
                    interruptDisabled
                    retryDisabled
                    executeTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可执行'}
                    interruptTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可中断'}
                    retryTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可重试'}
                    onExecute={() => {}}
                    onInterrupt={() => {}}
                    onRetry={() => {}}
                    statusSlot={rollbackRowStatusMd}
                  />
                </div>
              </li>
              <li className="bg-white">
                <div
                  className="grid items-center gap-x-4 px-6 py-4 transition hover:bg-slate-50/60"
                  style={{ gridTemplateColumns: SUB_STEP_ROW_GRID }}
                >
                  <SubStepExecModeBadge parallel={rollbackExecParallel} />
                  <span className="shrink-0 font-mono text-xs text-slate-400">02</span>
                  <div className="flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-slate-500" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="line-clamp-2 min-w-0 flex-1 font-bold text-slate-900">
                        {rollbackGateLabel(order.rollbackConfig.gate)}
                      </p>
                      <StepRowTimeMeta
                        order={order}
                        showDeployPackage={false}
                        executeStartedAt={undefined}
                        endDisplay="-"
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">配置 · 回滚门控</p>
                  </div>
                  <StepActionsRow
                    size="md"
                    executeDisabled
                    interruptDisabled
                    retryDisabled
                    executeTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可执行'}
                    interruptTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可中断'}
                    retryTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可重试'}
                    onExecute={() => {}}
                    onInterrupt={() => {}}
                    onRetry={() => {}}
                    statusSlot={rollbackRowStatusMd}
                  />
                </div>
              </li>
              <li className="bg-white">
                <div
                  className="grid items-start gap-x-4 px-6 py-4 transition hover:bg-slate-50/60"
                  style={{ gridTemplateColumns: SUB_STEP_ROW_GRID }}
                >
                  <div className="self-start pt-0.5">
                    <SubStepExecModeBadge parallel={rollbackExecParallel} />
                  </div>
                  <span className="shrink-0 self-start pt-0.5 font-mono text-xs text-slate-400">03</span>
                  <div className="flex justify-center self-start pt-0.5">
                    <Info className="h-5 w-5 shrink-0 text-slate-500" />
                  </div>
                  <div className="min-w-0 pr-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm font-bold leading-snug text-slate-900">
                        {order.rollbackConfig.notes.trim() || '—'}
                      </p>
                      <StepRowTimeMeta
                        order={order}
                        showDeployPackage={false}
                        executeStartedAt={undefined}
                        endDisplay="-"
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400">配置 · 预案说明</p>
                  </div>
                  <div className="self-start pt-0.5">
                    <StepActionsRow
                      size="md"
                      executeDisabled
                      interruptDisabled
                      retryDisabled
                      executeTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可执行'}
                      interruptTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可中断'}
                      retryTitle={orderCompleted ? '变更已完成，回滚约定无需执行' : '约定项不可重试'}
                      onExecute={() => {}}
                      onInterrupt={() => {}}
                      onRetry={() => {}}
                      statusSlot={rollbackRowStatusMd}
                    />
                  </div>
                </div>
              </li>
            </ul>
          ) : (
            <p className="border-t border-slate-100 px-6 py-10 text-center text-sm text-slate-400">
              该变更单未记录回滚预案（历史数据或未填写）。
            </p>
          )}
        </div>
      </div>

      {actionHint && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-xl animate-in fade-in slide-in-from-bottom-2">
          {actionHint}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">演示环境：执行部署为前端展示，未调用真实流水线。</p>
    </div>
  );
}
