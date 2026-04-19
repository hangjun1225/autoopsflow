import { useState } from 'react';
import { Shield, Lock, Eye, FileText } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * 系统配置：安全和隐私
 */
export function SecurityPrivacyView() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessionHours, setSessionHours] = useState('8');
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [savedHint, setSavedHint] = useState(false);

  const handleSave = () => {
    setSavedHint(true);
    window.setTimeout(() => setSavedHint(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">安全和隐私</h1>
          <p className="text-slate-500 text-sm mt-0.5">登录策略、会话、审计与数据相关设置</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">身份与访问</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">强制多因素认证 (MFA)</p>
                <p className="text-xs text-slate-500 mt-1">开启后，所有用户登录需完成第二步验证</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={mfaRequired}
                onClick={() => setMfaRequired((v) => !v)}
                className={cn(
                  'relative shrink-0 w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  mfaRequired ? 'bg-indigo-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform',
                    mfaRequired ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">会话有效期（小时）</label>
              <input
                type="number"
                min={1}
                max={720}
                value={sessionHours}
                onChange={(e) => setSessionHours(e.target.value)}
                className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
              />
              <p className="text-xs text-slate-400">无操作超时将要求重新登录</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">审计与合规</h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">记录关键操作审计日志</p>
                <p className="text-xs text-slate-500 mt-1">变更单、部署、配置修改等写入审计轨迹</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={auditEnabled}
                onClick={() => setAuditEnabled((v) => !v)}
                className={cn(
                  'relative shrink-0 w-12 h-7 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-300',
                  auditEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform',
                    auditEnabled ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-800">数据与隐私</h2>
          </div>
          <div className="p-6 text-sm text-slate-600 leading-relaxed">
            <p>
              部署与变更相关元数据仅用于运维编排与审计；详细隐私政策与数据处理说明请在企业合规文档中查阅。对接生产环境时，请配置数据保留周期与脱敏策略。
            </p>
          </div>
        </section>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
        >
          保存设置
        </button>
        {savedHint && <span className="text-sm text-emerald-600 font-medium">已保存（演示环境，仅前端状态）</span>}
      </div>
    </div>
  );
}
