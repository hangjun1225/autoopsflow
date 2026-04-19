import { useState } from 'react';
import { Users, Search, Plus, MoreVertical } from 'lucide-react';
import { cn } from '../lib/utils';

type MockUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'disabled';
};

const MOCK_USERS: MockUser[] = [
  { id: 'u1', name: '管理员', email: 'admin@ops.example.com', role: '系统管理员', status: 'active' },
  { id: 'u2', name: '张三', email: 'zhangsan@ops.example.com', role: '发布负责人', status: 'active' },
  { id: 'u3', name: '李四', email: 'lisi@ops.example.com', role: '只读', status: 'disabled' },
];

/**
 * 系统配置：用户管理（演示数据与本地筛选）
 */
export function UserManagementView() {
  const [query, setQuery] = useState('');
  const filtered = MOCK_USERS.filter(
    (u) =>
      u.name.includes(query) ||
      u.email.includes(query) ||
      u.role.includes(query)
  );

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">用户管理</h1>
            <p className="text-slate-500 text-sm mt-0.5">管理系统账号、角色与启用状态</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100"
        >
          <Plus className="w-4 h-4" />
          新建用户
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索姓名、邮箱或角色..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">用户</th>
                <th className="px-6 py-4">邮箱</th>
                <th className="px-6 py-4">角色</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 text-slate-600 font-mono text-xs">{row.email}</td>
                  <td className="px-6 py-4 text-slate-700">{row.role}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        'text-xs font-bold px-2.5 py-1 rounded-lg',
                        row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {row.status === 'active' ? '启用' : '停用'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button type="button" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="py-12 text-center text-slate-400 text-sm">无匹配用户</p>
        )}
      </div>

      <p className="text-xs text-slate-400">演示环境：数据为静态示例，新建用户与更多操作需对接后端后实现。</p>
    </div>
  );
}
