import { useState } from 'react';
import { ClipboardCheck, Shield, Check, X, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useOrders } from '../context/OrdersContext';

/** 页签：待审批 / 质量门禁 */
type TabId = 'approval' | 'gates';

/** 质量门禁规则（演示，本地开关） */
type GateRule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

const DEFAULT_GATE_RULES: GateRule[] = [
  {
    id: 'g1',
    name: '镜像安全扫描',
    description: '高危漏洞未清零时阻断进入部署阶段',
    enabled: true,
  },
  {
    id: 'g2',
    name: '单元测试与覆盖率',
    description: '流水线测试阶段失败或覆盖率低于阈值则禁止合并发布',
    enabled: true,
  },
  {
    id: 'g3',
    name: '变更窗口期',
    description: '生产环境仅在允许的发布窗口内允许执行部署（需对接日历）',
    enabled: false,
  },
  {
    id: 'g4',
    name: '双人复核',
    description: '生产变更需至少两名不同角色审批通过',
    enabled: true,
  },
];

/**
 * 审批与门禁：待审批列表（通过/驳回）与质量门禁策略配置（演示）
 */
export function ApprovalGateView() {
  const { orders, updateOrder } = useOrders();
  const [tab, setTab] = useState<TabId>('approval');
  const [gateRules, setGateRules] = useState<GateRule[]>(DEFAULT_GATE_RULES);
  const [gateSaved, setGateSaved] = useState(false);
  const [actionHint, setActionHint] = useState<string | null>(null);

  const pendingList = orders.filter((o) => o.status === 'approving');

  const handleApprove = (id: string, title: string) => {
    updateOrder(id, { status: 'deploying' });
    setActionHint(`已通过：${title}`);
    window.setTimeout(() => setActionHint(null), 3200);
  };

  const handleReject = (id: string, title: string) => {
    updateOrder(id, { status: 'pending' });
    setActionHint(`已驳回并退回待提交：${title}`);
    window.setTimeout(() => setActionHint(null), 3200);
  };

  const toggleGate = (id: string) => {
    setGateRules((prev) => prev.map((g) => (g.id === id ? { ...g, enabled: !g.enabled } : g)));
  };

  const saveGates = () => {
    setGateSaved(true);
    window.setTimeout(() => setGateSaved(false), 2000);
  };

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">审批与门禁</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            处理待审批变更单，并配置发布前质量门禁策略（演示交互）
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setTab('approval')}
          className={cn(
            'rounded-t-xl px-4 py-2.5 text-sm font-semibold transition',
            tab === 'approval'
              ? 'border-b-2 border-indigo-600 bg-indigo-50/80 text-indigo-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          )}
        >
          待审批
          {pendingList.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {pendingList.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab('gates')}
          className={cn(
            'flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition',
            tab === 'gates'
              ? 'border-b-2 border-indigo-600 bg-indigo-50/80 text-indigo-700'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
          )}
        >
          <Shield className="h-4 w-4" />
          质量门禁
        </button>
      </div>

      {actionHint && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {actionHint}
        </div>
      )}

      {tab === 'approval' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {pendingList.length === 0 ? (
            <p className="py-16 text-center text-sm text-slate-400">当前没有待审批的变更单</p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">变更单号</th>
                  <th className="px-6 py-4">标题</th>
                  <th className="px-6 py-4">版本</th>
                  <th className="px-6 py-4">申请人</th>
                  <th className="px-6 py-4">创建时间</th>
                  <th className="px-6 py-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingList.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="px-6 py-4 font-mono text-xs font-semibold text-indigo-600">{row.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{row.title}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{row.version}</td>
                    <td className="px-6 py-4 text-slate-700">{row.creator}</td>
                    <td className="px-6 py-4 text-xs text-slate-500">{row.createdAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleReject(row.id, row.title)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"
                        >
                          <X className="h-3.5 w-3.5" />
                          驳回
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApprove(row.id, row.title)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700"
                        >
                          <Check className="h-3.5 w-3.5" />
                          通过
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'gates' && (
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            以下规则用于在发布流水线中执行门禁检查；开启后需对接流水线与策略引擎（演示开关）。
          </p>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {gateRules.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900">{rule.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{rule.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.enabled}
                  onClick={() => toggleGate(rule.id)}
                  className={cn(
                    'relative h-8 w-14 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300',
                    rule.enabled ? 'bg-indigo-600' : 'bg-slate-200'
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
                      rule.enabled ? 'translate-x-6' : 'translate-x-0'
                    )}
                  />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={saveGates}
              className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              保存门禁策略
            </button>
            {gateSaved && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                已保存（演示）
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
