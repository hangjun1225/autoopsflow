import { useState } from 'react';
import { Search, Table2, Languages, Check } from 'lucide-react';

/**
 * 系统配置：Lookup 配置（编码与展示值映射，演示）
 */
export function LookupConfigView() {
  const [savedHint, setSavedHint] = useState(false);
  const handleSave = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Search className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lookup 配置</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            维护系统内下拉、枚举等展示用码表与数据源（演示数据）
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">常用 Lookup</h2>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3">类型</th>
              <th className="px-6 py-3">编码</th>
              <th className="px-6 py-3">显示名</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { type: 'deploy_status', code: 'pending', name: '待提交' },
              { type: 'deploy_status', code: 'success', name: '已完成' },
              { type: 'env_type', code: 'prod', name: '生产' },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/80">
                <td className="px-6 py-3 font-mono text-xs text-slate-600">{row.type}</td>
                <td className="px-6 py-3 font-mono text-xs text-indigo-600">{row.code}</td>
                <td className="px-6 py-3 text-slate-800">{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          保存配置
        </button>
        {savedHint && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            已保存（演示）
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 系统配置：数据字典配置（业务字段元数据，演示）
 */
export function DataDictionaryConfigView() {
  const [savedHint, setSavedHint] = useState(false);
  const handleSave = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Table2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">数据字典配置</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            定义实体字段、类型、约束与说明，供表单与接口校验引用（演示）
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">变更单 · 字段示例</h2>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3">字段</th>
              <th className="px-6 py-3">类型</th>
              <th className="px-6 py-3">必填</th>
              <th className="px-6 py-3">说明</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { field: 'title', type: 'string', required: '是', desc: '变更单标题' },
              { field: 'version', type: 'semVer', required: '是', desc: '发布版本号' },
              { field: 'scenarioIds', type: 'string[]', required: '是', desc: '关联场景 ID 列表' },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/80">
                <td className="px-6 py-3 font-mono text-xs text-indigo-600">{row.field}</td>
                <td className="px-6 py-3 font-mono text-xs text-slate-600">{row.type}</td>
                <td className="px-6 py-3 text-slate-700">{row.required}</td>
                <td className="px-6 py-3 text-slate-600">{row.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          保存配置
        </button>
        {savedHint && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            已保存（演示）
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * 系统配置：国际化配置（多语言资源，演示）
 */
export function I18nConfigView() {
  const [savedHint, setSavedHint] = useState(false);
  const handleSave = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
          <Languages className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">国际化配置</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            维护界面文案、多语言包与默认语言（演示）
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-4 block text-sm font-semibold text-slate-700">默认语言</label>
        <select className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
          <option value="zh-CN">简体中文（zh-CN）</option>
          <option value="en-US">English（en-US）</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">文案键值示例</h2>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-3">Key</th>
              <th className="px-6 py-3">zh-CN</th>
              <th className="px-6 py-3">en-US</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { k: 'nav.change_order', zh: '变更单管理', en: 'Change Orders' },
              { k: 'btn.submit', zh: '提交', en: 'Submit' },
              { k: 'msg.save_ok', zh: '保存成功', en: 'Saved' },
            ].map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/80">
                <td className="px-6 py-3 font-mono text-xs text-indigo-600">{row.k}</td>
                <td className="px-6 py-3 text-slate-800">{row.zh}</td>
                <td className="px-6 py-3 text-slate-600">{row.en}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
        >
          保存配置
        </button>
        {savedHint && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" />
            已保存（演示）
          </span>
        )}
      </div>
    </div>
  );
}
