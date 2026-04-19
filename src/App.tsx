import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { 
  LayoutDashboard, 
  Settings2, 
  ClipboardList, 
  History, 
  Bell,
  Search,
  User,
  Power,
  Layout,
  Star,
  Box,
  ChevronDown,
  ChevronRight,
  Cog,
  Workflow,
  Users,
  Shield,
  SlidersHorizontal,
  Server,
  Table2,
  Languages,
  ListTree,
  UserCog,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from './lib/utils';
import { Dashboard } from './components/Dashboard';
import { ScenarioManager, type ScenarioManagerTab } from './components/ScenarioManager';
import { ChangeOrderManager } from './components/ChangeOrderManager';
import { DeploymentHistoryView } from './components/DeploymentHistoryView';
import { GlobalFlowComponentsView } from './components/GlobalFlowComponentsView';
import { UserManagementView } from './components/UserManagementView';
import { RoleManagementView } from './components/RoleManagementView';
import { SecurityPrivacyView } from './components/SecurityPrivacyView';
import { GlobalSystemConfigView } from './components/GlobalSystemConfigView';
import { EnvironmentManagementView } from './components/EnvironmentManagementView';
import {
  LookupConfigView,
  DataDictionaryConfigView,
  I18nConfigView,
} from './components/SystemConfigMetaViews';
import { motion, AnimatePresence } from 'motion/react';
import { OrdersProvider } from './context/OrdersContext';
import { ApprovalGateView } from './components/ApprovalGateView';

/** 主导航 id（侧栏顺序：仪表盘 → 环境管理 → … → 审批与门禁） */
type MainNavId = 'dashboard' | 'change-orders' | 'approval-gate' | 'history' | 'env-system';

/** 系统配置子页（侧栏顺序：用户管理 → 角色管理 → …） */
export type SystemConfigTab =
  | 'user-management'
  | 'role-management'
  | 'global-system-config'
  | 'global-flow'
  | 'lookup-config'
  | 'data-dictionary'
  | 'i18n-config'
  | 'security-privacy';

export default function App() {
  /** 当前主页面 */
  const [mainNav, setMainNav] = useState<MainNavId | 'scenarios' | 'system-config'>('dashboard');
  /** 场景管理下三个子页签（默认第一项：部署模板配置） */
  const [scenarioTab, setScenarioTab] = useState<ScenarioManagerTab>('templates');
  /** 左侧「场景管理」分组是否展开 */
  const [scenarioGroupOpen, setScenarioGroupOpen] = useState(true);
  /** 系统配置子页（默认第一项：用户管理） */
  const [systemTab, setSystemTab] = useState<SystemConfigTab>('user-management');
  /** 左侧「系统配置」分组是否展开 */
  const [systemGroupOpen, setSystemGroupOpen] = useState(true);

  /** 场景子导航配置：与 ScenarioManager 内 tab id 一致 */
  const scenarioSubNav: { id: ScenarioManagerTab; label: string; icon: typeof Layout }[] = [
    { id: 'templates', label: '部署模板配置', icon: Box },
    { id: 'scenarios', label: '部署场景管理', icon: Layout },
    { id: 'presets', label: '标准部署场景库', icon: Star },
  ];

  /** 进入场景某一子页 */
  const goScenario = (tab: ScenarioManagerTab) => {
    setMainNav('scenarios');
    setScenarioTab(tab);
  };

  /** 系统配置子导航（展示顺序固定） */
  const systemSubNav: { id: SystemConfigTab; label: string; icon: LucideIcon }[] = [
    { id: 'user-management', label: '用户管理', icon: Users },
    { id: 'role-management', label: '角色管理', icon: UserCog },
    { id: 'global-system-config', label: '全局系统配置', icon: SlidersHorizontal },
    { id: 'global-flow', label: '全局流程组件', icon: Workflow },
    { id: 'lookup-config', label: 'Lookup配置', icon: ListTree },
    { id: 'data-dictionary', label: '数据字典配置', icon: Table2 },
    { id: 'i18n-config', label: '国际化配置', icon: Languages },
    { id: 'security-privacy', label: '安全和隐私', icon: Shield },
  ];

  /** 进入系统配置某一子页 */
  const goSystem = (tab: SystemConfigTab) => {
    setMainNav('system-config');
    setSystemTab(tab);
  };

  return (
    <OrdersProvider>
    <div className="flex h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Power className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">OpsFlow</span>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {/* 仪表盘 */}
          <button
            type="button"
            onClick={() => setMainNav('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
              mainNav === 'dashboard'
                ? "bg-indigo-50 text-indigo-600 font-medium"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <LayoutDashboard className={cn(
              "w-5 h-5 transition-colors",
              mainNav === 'dashboard' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
            )} />
            仪表盘
          </button>

          {/* 环境管理 */}
          <button
            type="button"
            onClick={() => setMainNav('env-system')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm',
              mainNav === 'env-system'
                ? 'bg-indigo-50 text-indigo-600 font-medium'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <Server
              className={cn(
                'w-5 h-5 transition-colors',
                mainNav === 'env-system' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
              )}
            />
            环境管理
          </button>

          {/* 场景管理：可折叠分组 + 四个子项 */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setScenarioGroupOpen((o) => !o);
                if (mainNav !== 'scenarios') goScenario(scenarioTab);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
                mainNav === 'scenarios'
                  ? "bg-indigo-50 text-indigo-600 font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Settings2 className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                mainNav === 'scenarios' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span className="flex-1 text-left">场景管理</span>
              {scenarioGroupOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {scenarioGroupOpen && (
              <div className="mt-1 ml-2 pl-3 border-l border-slate-200 space-y-0.5">
                {scenarioSubNav.map((sub) => {
                  const isActive = mainNav === 'scenarios' && scenarioTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => goScenario(sub.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      )}
                    >
                      <sub.icon className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-indigo-600" : "text-slate-400"
                      )} />
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 变更单管理 */}
          <button
            type="button"
            onClick={() => setMainNav('change-orders')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
              mainNav === 'change-orders'
                ? "bg-indigo-50 text-indigo-600 font-medium"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <ClipboardList className={cn(
              "w-5 h-5 transition-colors",
              mainNav === 'change-orders' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
            )} />
            变更单管理
          </button>

          {/* 审批与门禁 */}
          <button
            type="button"
            onClick={() => setMainNav('approval-gate')}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm',
              mainNav === 'approval-gate'
                ? 'bg-indigo-50 text-indigo-600 font-medium'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <ClipboardCheck
              className={cn(
                'w-5 h-5 transition-colors',
                mainNav === 'approval-gate' ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
              )}
            />
            审批与门禁
          </button>

          {/* 部署历史 */}
          <button
            type="button"
            onClick={() => setMainNav('history')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
              mainNav === 'history'
                ? "bg-indigo-50 text-indigo-600 font-medium"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <History className={cn(
              "w-5 h-5 transition-colors",
              mainNav === 'history' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
            )} />
            部署历史
          </button>

          {/* 系统配置：可折叠分组 + 子菜单 */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setSystemGroupOpen((o) => !o);
                if (mainNav !== 'system-config') goSystem(systemTab);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group text-sm",
                mainNav === 'system-config'
                  ? "bg-indigo-50 text-indigo-600 font-medium"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Cog className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                mainNav === 'system-config' ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
              )} />
              <span className="flex-1 text-left">系统配置</span>
              {systemGroupOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {systemGroupOpen && (
              <div className="mt-1 ml-2 pl-3 border-l border-slate-200 space-y-0.5">
                {systemSubNav.map((sub) => {
                  const isActive = mainNav === 'system-config' && systemTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => goSystem(sub.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-medium"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      )}
                    >
                      <sub.icon className={cn(
                        "w-4 h-4 shrink-0",
                        isActive ? "text-indigo-600" : "text-slate-400"
                      )} />
                      {sub.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100 italic font-mono text-[10px] text-slate-400">
          SYSTEM_VER: v2.4.1-STABLE
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-200 w-96">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="搜索变更单, 场景或服务..." 
              className="bg-transparent border-none outline-none text-sm w-full placeholder:text-slate-400 focus:ring-0"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative text-slate-500 hover:text-slate-800 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">管理员</p>
                <p className="text-xs text-slate-500">运维中心</p>
              </div>
              <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-slate-300">
                <User className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic View */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={
                mainNav === 'scenarios'
                  ? `scenarios-${scenarioTab}`
                  : mainNav === 'system-config'
                    ? `system-${systemTab}`
                    : mainNav
              }
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="p-8 pb-12"
            >
              {mainNav === 'dashboard' && <Dashboard />}
              {mainNav === 'scenarios' && <ScenarioManager activeTab={scenarioTab} />}
              {mainNav === 'change-orders' && <ChangeOrderManager />}
              {mainNav === 'approval-gate' && <ApprovalGateView />}
              {mainNav === 'history' && <DeploymentHistoryView />}
              {mainNav === 'env-system' && <EnvironmentManagementView />}
              {mainNav === 'system-config' && (
                <>
                  {systemTab === 'user-management' && <UserManagementView />}
                  {systemTab === 'role-management' && <RoleManagementView />}
                  {systemTab === 'global-system-config' && <GlobalSystemConfigView />}
                  {systemTab === 'global-flow' && <GlobalFlowComponentsView />}
                  {systemTab === 'lookup-config' && <LookupConfigView />}
                  {systemTab === 'data-dictionary' && <DataDictionaryConfigView />}
                  {systemTab === 'i18n-config' && <I18nConfigView />}
                  {systemTab === 'security-privacy' && <SecurityPrivacyView />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
    </OrdersProvider>
  );
}
