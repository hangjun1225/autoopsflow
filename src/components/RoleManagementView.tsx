import { useState } from 'react';
import { UserCog, Search, Plus, MoreVertical } from 'lucide-react';

/** 演示用角色行 */
type MockRole = {
  id: string;
  name: string;
  code: string;
  description: string;
  userCount: number;
};

const MOCK_ROLES: MockRole[] = [
  {
    id: 'r1',
    name: '系统管理员',
    code: 'SYS_ADMIN',
    description: '全部菜单与配置权限，含用户与角色管理',
    userCount: 2,
  },
  {
    id: 'r2',
    name: '发布负责人',
    code: 'RELEASE_OWNER',
    description: '变更单审批、部署执行与回滚',
    userCount: 5,
  },
  {
    id: 'r3',
    name: '只读访客',
    code: 'VIEWER',
    description: '仅查看仪表盘、变更与历史，无写操作',
    userCount: 12,
  },
];

/**
 * 系统配置：角色管理（演示数据与本地筛选）
 */
export function RoleManagementView() {
  const [query, setQuery] = useState('');
  const filtered = MOCK_ROLES.filter(
    (r) =>
      r.name.includes(query) ||
      r.code.toLowerCase().includes(query.toLowerCase()) ||
      r.description.includes(query)
  );

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
            <UserCog className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">角色管理</h1>
            <p className="mt-0.5 text-sm text-slate-500">定义角色、权限范围与关联用户数</p>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          新建角色
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索角色名称、编码或说明..."
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-4">角色名称</th>
                <th className="px-6 py-4">编码</th>
                <th className="px-6 py-4">说明</th>
                <th className="px-6 py-4">关联用户</th>
                <th className="w-24 px-6 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => (
                <tr key={row.id} className="transition hover:bg-slate-50/80">
                  <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-600">{row.code}</td>
                  <td className="max-w-md px-6 py-4 text-slate-600">{row.description}</td>
                  <td className="px-6 py-4 tabular-nums text-slate-700">{row.userCount}</td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="py-12 text-center text-sm text-slate-400">无匹配角色</p>}
      </div>

      <p className="text-xs text-slate-400">演示环境：数据为静态示例，权限矩阵与新建角色需对接后端后实现。</p>
    </div>
  );
}
