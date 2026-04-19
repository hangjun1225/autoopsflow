import { useState } from 'react';
import { Workflow, Plus, Check } from 'lucide-react';
import { cn } from '../lib/utils';

/** 全局流程组件类型（与变更单 pipeline_action 可对应） */
type GlobalFlowActionType = 'build' | 'test' | 'approval' | 'scan' | 'gate';

type GlobalFlowComponentItem = {
  id: string;
  actionType: GlobalFlowActionType;
  name: string;
  description: string;
  enabled: boolean;
};

const DEFAULT_COMPONENTS: GlobalFlowComponentItem[] = [
  { id: 'gf-1', actionType: 'approval', name: '人工审批', description: '多级或单级人工审批节点，用于合规与发布门禁', enabled: true },
  { id: 'gf-2', actionType: 'gate', name: '质量红线', description: '基于策略的质量门禁，不满足条件则阻断流程', enabled: true },
  { id: 'gf-3', actionType: 'test', name: '自动化测试', description: '触发自动化测试任务并汇总结果', enabled: true },
  { id: 'gf-4', actionType: 'build', name: '构建任务', description: '触发 CI 构建与制品产出', enabled: false },
  { id: 'gf-5', actionType: 'scan', name: '安全扫描', description: '镜像或代码安全扫描', enabled: false },
];

/**
 * 系统配置：全局流程组件（独立于部署场景，供变更编排引用）
 */
export function GlobalFlowComponentsView() {
  const [items, setItems] = useState<GlobalFlowComponentItem[]>(DEFAULT_COMPONENTS);
  const [savedHint, setSavedHint] = useState(false);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)));
  };

  const handleSave = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">全局流程组件</h1>
            <p className="text-slate-500 text-sm mt-0.5">配置可在变更单中引用的、与具体部署场景解耦的流程节点类型</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">组件清单</span>
          <span className="text-[10px] text-slate-400">启用后可在变更编排中选用对应节点</span>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((row) => (
            <li key={row.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 hover:bg-slate-50/60 transition">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-900">{row.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-100">{row.actionType}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{row.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={row.enabled}
                onClick={() => toggle(row.id)}
                className={cn(
                  'relative shrink-0 w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  row.enabled ? 'bg-indigo-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform',
                    row.enabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
        >
          <Check className="w-4 h-4" />
          保存配置
        </button>
        {savedHint && (
          <span className="text-sm text-emerald-600 font-medium animate-in fade-in">已保存（演示环境，仅前端状态）</span>
        )}
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-slate-400 text-sm">
        <Plus className="w-8 h-8 mx-auto mb-2 opacity-40" />
        后续可在此扩展自定义全局节点、与外部系统对接等能力
      </div>
    </div>
  );
}
