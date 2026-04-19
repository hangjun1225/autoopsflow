import { useState } from 'react';
import { DEPLOYMENT_ENVIRONMENTS, MOCK_SCENARIOS, MOCK_TEMPLATES } from '../constants';
import { ChangeOrder } from '../types';
import { useOrders } from '../context/OrdersContext';
import {
  CANARY_TRAFFIC_PERCENT,
  getReleaseStrategy,
  releaseStrategyKindLabel,
} from '../lib/releaseStrategy';
import { 
  History as HistoryIcon, 
  RefreshCcw, 
  Play, 
  Pause,
  ArrowDownLeft,
  ChevronRight,
  MoreVertical,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function DeploymentHistoryView() {
  const { orders } = useOrders();
  const [selectedOrder, setSelectedOrder] = useState<ChangeOrder | null>(null);
  const [showCanaryModal, setShowCanaryModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">部署历史与运维</h1>
          <p className="text-slate-500 mt-1">查询历史发布记录，管理灰度比例及执行回滚操作</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600">
             <Activity className="w-3.5 h-3.5 text-emerald-500" />
             实时监控中
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* History List */}
        <div className="xl:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <HistoryIcon className="w-4 h-4 text-indigo-500" />
                最近发布记录
              </h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input type="text" placeholder="搜索版本或服务..." className="pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {orders.map((order) => (
                <div 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "p-5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer group",
                    selectedOrder?.id === order.id ? "bg-indigo-50/50" : ""
                  )}
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      order.status === 'success' ? "bg-emerald-50 text-emerald-600" : 
                      order.status === 'failed' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {order.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                       order.status === 'failed' ? <XCircle className="w-5 h-5" /> : <RefreshCcw className="w-5 h-5 animate-spin" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{order.title}</span>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">{order.version}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" /> 
                          {order.scenarioIds?.length > 1 
                            ? `${order.scenarioIds.length} 个配置场景` 
                            : (MOCK_SCENARIOS.find(s => s.id === (order as any).scenarioId || order.scenarioIds?.[0])?.name || '-')}
                        </span>
                        <span>•</span>
                        <span>{order.createdAt}</span>
                        <span>•</span>
                        <span className="font-medium text-slate-700">{order.creator}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 transition" />
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 text-center">
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">查看完整历史数据</button>
            </div>
          </div>
        </div>

        {/* Sidebar Operations */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {selectedOrder ? (
              <motion.div 
                key={selectedOrder.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl border border-indigo-200 shadow-xl shadow-indigo-100/20 p-6 space-y-6 sticky top-6"
              >
                <div>
                  <h3 className="font-bold text-slate-900 truncate">{selectedOrder.title}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-wider">{selectedOrder.id}</p>
                  <p className="mt-2 text-xs text-slate-600">
                    部署环境：
                    {selectedOrder.environmentName ??
                      DEPLOYMENT_ENVIRONMENTS.find((e) => e.id === selectedOrder.environmentId)?.name ??
                      '—'}
                  </p>
                </div>

                <div className="space-y-4">
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">部署状态</p>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        selectedOrder.status === 'success' ? "bg-emerald-500" : "bg-amber-500"
                      )}></div>
                      <span className="text-sm font-bold text-slate-800">
                        {selectedOrder.status === 'success' ? '发布成功' : '发布中/审批中'}
                      </span>
                    </div>
                  </div>

                  {selectedOrder.status === 'success' && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">发布策略</p>
                        <p className="text-sm font-bold text-slate-800">
                          {releaseStrategyKindLabel(getReleaseStrategy(selectedOrder).kind)}
                        </p>
                      </div>
                      {getReleaseStrategy(selectedOrder).kind === 'canary' && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-slate-600">生产环境流量比例</span>
                            <span className="text-indigo-600">{CANARY_TRAFFIC_PERCENT}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-600 h-full rounded-full"
                              style={{ width: `${CANARY_TRAFFIC_PERCENT}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <button 
                    onClick={() => setShowCanaryModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                  >
                    <BarChart3 className="w-4 h-4" />
                    调整流量比例
                  </button>
                  <button 
                    onClick={() => setShowRollbackModal(true)}
                    className="w-full flex items-center justify-center gap-2 bg-white border border-rose-200 text-rose-600 py-2.5 rounded-xl text-sm font-bold hover:bg-rose-50 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    版本回退 (Rollback)
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-center text-[10px] text-slate-400 uppercase font-bold tracking-tighter cursor-not-allowed opacity-50">
                  <ShieldAlert className="w-3 h-3" />
                  高危操作需要二级授权
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                   <Activity className="w-6 h-6" />
                </div>
                <p className="text-sm text-slate-400">选择侧边记录查看<br />详细运维操作</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Canary Modal */}
      <Modal isOpen={showCanaryModal} onClose={() => setShowCanaryModal(false)} title="流量比例调整 (Canary/Grey)">
        <CanaryControl order={selectedOrder} onConfirm={() => setShowCanaryModal(false)} />
      </Modal>

      {/* Rollback Modal */}
      <Modal isOpen={showRollbackModal} onClose={() => setShowRollbackModal(false)} title="警告：正在执行版本回滚">
        <RollbackControl order={selectedOrder} onConfirm={() => setShowRollbackModal(false)} />
      </Modal>
    </div>
  );
}

function Modal({ isOpen, onClose, title, children }: any) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </motion.div>
    </div>
  );
}

function CanaryControl({ order, onConfirm }: { order: ChangeOrder; onConfirm: () => void }) {
  const rs = getReleaseStrategy(order);
  const [weight, setWeight] = useState(rs.kind === 'canary' ? CANARY_TRAFFIC_PERCENT : 100);
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="text-6xl font-black text-indigo-600 font-mono tracking-tighter">
          {weight}%
        </div>
        <p className="text-xs text-slate-500 mt-2 font-bold uppercase tracking-widest leading-loose">
          当前拟上线流量比例
        </p>
      </div>

      <div className="space-y-4">
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="5" 
          value={weight} 
          onChange={(e) => setWeight(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] font-bold text-slate-400">
          <span>0% (内测)</span>
          <span>50% (灰度)</span>
          <span>100% (全量)</span>
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700 leading-relaxed">
          调整即刻生效。系统将根据配置的负载均衡算法动态分配流量。请持续观察监控图表中的 5xx 错误率。
        </p>
      </div>

      <button 
        onClick={onConfirm}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
      >
        应用配置更改
      </button>
    </div>
  );
}

function RollbackControl({ order, onConfirm }: any) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-rose-50 rounded-xl border border-rose-100 flex items-center gap-4">
        <ShieldAlert className="w-10 h-10 text-rose-500" />
        <div>
          <p className="text-sm font-bold text-rose-800">确认回滚到上一稳定版本？</p>
          <p className="text-xs text-rose-600 mt-1">当前版本 {order?.version} 将被标记为不可用，流量将切回 v1.2.3</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">执行理由</label>
        <textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100" placeholder="例如：监控发现后端服务内存泄漏..."></textarea>
      </div>

      <div className="flex gap-3">
        <button onClick={onConfirm} className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition">取消</button>
        <button onClick={onConfirm} className="flex-[2] px-4 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 shadow-xl shadow-rose-100 transition">立即执行回滚</button>
      </div>
    </div>
  );
}
