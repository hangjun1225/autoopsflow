import { useState } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';

/**
 * 系统配置：全局系统配置（站点信息、环境标识、通用开关等）
 */
export function GlobalSystemConfigView() {
  const [siteName, setSiteName] = useState('OpsFlow 运维发布平台');
  const [envTag, setEnvTag] = useState<'prod' | 'staging' | 'dev'>('prod');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [savedHint, setSavedHint] = useState(false);

  const handleSave = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">全局系统配置</h1>
          <p className="text-slate-500 text-sm mt-0.5">站点展示名称、运行环境标识与跨模块通用开关</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        <div className="p-6 space-y-4">
          <label className="text-sm font-semibold text-slate-700">站点 / 产品名称</label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
          />
          <p className="text-xs text-slate-400">用于页眉、通知与对外展示</p>
        </div>

        <div className="p-6 space-y-4">
          <label className="text-sm font-semibold text-slate-700">运行环境标识</label>
          <select
            value={envTag}
            onChange={(e) => setEnvTag(e.target.value as 'prod' | 'staging' | 'dev')}
            className="w-full max-w-xs px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
          >
            <option value="prod">生产（prod）</option>
            <option value="staging">预发（staging）</option>
            <option value="dev">开发（dev）</option>
          </select>
          <p className="text-xs text-slate-400">用于水印、告警路由与审计区分</p>
        </div>

        <div className="p-6 flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-900">维护模式</p>
            <p className="text-xs text-slate-500 mt-1">开启后仅管理员可登录，普通用户看到维护页</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={maintenanceMode}
            onClick={() => setMaintenanceMode((v) => !v)}
            className={`relative shrink-0 w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
              maintenanceMode ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                maintenanceMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
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
        {savedHint && <span className="text-sm text-emerald-600 font-medium">已保存（演示环境，仅前端状态）</span>}
      </div>
    </div>
  );
}
