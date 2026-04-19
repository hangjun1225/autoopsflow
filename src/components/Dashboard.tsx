import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ArrowUpRight,
  Zap
} from 'lucide-react';

const DEPLOY_STATS = [
  { name: '04-12', count: 12, success: 11, fail: 1 },
  { name: '04-13', count: 8, success: 8, fail: 0 },
  { name: '04-14', count: 15, success: 14, fail: 1 },
  { name: '04-15', count: 11, success: 10, fail: 1 },
  { name: '04-16', count: 18, success: 18, fail: 0 },
  { name: '04-17', count: 20, success: 19, fail: 1 },
  { name: '04-18', count: 14, success: 14, fail: 0 },
];

const SUCCESS_RATE = [
  { name: 'Mon', rate: 92 },
  { name: 'Tue', rate: 95 },
  { name: 'Wed', rate: 98 },
  { name: 'Thu', rate: 94 },
  { name: 'Fri', rate: 99 },
  { name: 'Sat', rate: 100 },
  { name: 'Sun', rate: 98 },
];

export function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">仪表盘概览</h1>
        <p className="text-slate-500 mt-1">实时监控部署状态与系统健康度</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: '今日部署', value: '14', change: '+20%', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '部署成功率', value: '98.5%', change: '+0.5%', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '待审批变更', value: '5', change: '-2', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '异常告警', value: '1', change: '稳定', icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm transition-hover hover:border-indigo-200">
            <div className="flex justify-between items-start">
              <div className={cn("p-2 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1">
                {stat.change}
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
            <div className="mt-4">
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deployment Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-500" />
              部署频次趋势
            </h3>
            <select className="text-xs border-slate-200 rounded-md bg-white px-2 py-1 outline-none">
              <option>过去7天</option>
              <option>过去30天</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={DEPLOY_STATS}>
                <defs>
                  <linearGradient id="colorDeploy" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} fillOpacity={1} fill="url(#colorDeploy)" />
                <Area type="monotone" dataKey="success" stroke="#10B981" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Success Rate Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              发布成功率
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SUCCESS_RATE}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[80, 100]} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#F1F5F9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="rate" fill="#4F46E5" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for cn (actually I should import it)
import { cn } from '../lib/utils';
