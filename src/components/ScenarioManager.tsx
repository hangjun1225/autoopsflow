import { useEffect, useMemo, useState } from 'react';
import {
  MOCK_TEMPLATES,
  MOCK_SCENARIOS,
  PRESET_SCENARIOS,
  sortScenariosForDisplay,
} from '../constants';
import { DeploymentScenario, DeploymentTemplate, PresetScenario } from '../types';
import { 
  Box, 
  Cpu, 
  Layers, 
  Layout, 
  Globe, 
  Server,
  Plus,
  Trash2,
  Edit3,
  Check,
  LayoutGrid,
  List,
  Star,
  ArrowRight,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

/** 场景管理子页：与左侧导航一致 */
export type ScenarioManagerTab = 'scenarios' | 'templates' | 'presets';

type ScenarioManagerProps = {
  /** 当前子页（由 App 左侧「场景管理」目录控制） */
  activeTab: ScenarioManagerTab;
};

/** 列表每页条数（部署模板 / 场景 / 标准库共用） */
const LIST_PAGE_SIZE = 10;

/** 关键字是否命中（不区分大小写） */
function matchesQuery(text: string, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  if (!k) return true;
  return text.toLowerCase().includes(k);
}

/** 按名称、ID、类型、描述过滤模板 */
function filterTemplates(list: DeploymentTemplate[], q: string): DeploymentTemplate[] {
  const k = q.trim();
  if (!k) return list;
  return list.filter(
    (t) =>
      matchesQuery(t.id, k) ||
      matchesQuery(t.name, k) ||
      matchesQuery(t.description, k) ||
      matchesQuery(t.type, k)
  );
}

/** 按名称、ID、绑定模板过滤场景 */
function filterScenarios(
  list: DeploymentScenario[],
  q: string,
  resolveTplName: (id: string) => string | undefined
): DeploymentScenario[] {
  const k = q.trim();
  if (!k) return list;
  return list.filter(
    (s) =>
      matchesQuery(s.id, k) ||
      matchesQuery(s.name, k) ||
      s.templateIds.some((tid) => matchesQuery(tid, k) || matchesQuery(resolveTplName(tid) ?? '', k))
  );
}

/** 按名称、ID、描述、步骤名过滤标准场景库 */
function filterPresets(list: PresetScenario[], q: string): PresetScenario[] {
  const k = q.trim();
  if (!k) return list;
  return list.filter(
    (p) =>
      matchesQuery(p.id, k) ||
      matchesQuery(p.name, k) ||
      matchesQuery(p.description, k) ||
      matchesQuery(p.scenarioId, k) ||
      p.steps.some((st) => matchesQuery(st.name, k) || matchesQuery(st.type, k))
  );
}

/** 按展示名称稳定排序（中文环境），避免仅依赖常量/编辑顺序导致列表观感杂乱 */
function sortByDisplayName<T extends { name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
}

type PaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
};

/** 底部分页条 */
function PaginationBar({ page, pageSize, total, onPageChange }: PaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, total);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-3 py-1.5 text-sm text-slate-600">
      <span className="text-xs text-slate-500">
        显示 {start}-{end}，共 {total} 条
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          上一页
        </button>
        <span className="px-2 text-xs tabular-nums text-slate-500">
          {current} / {totalPages}
        </span>
        <button
          type="button"
          disabled={current >= totalPages}
          onClick={() => onPageChange(current + 1)}
          className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ScenarioManager({ activeTab }: ScenarioManagerProps) {
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  /** 管理页 / 部署场景表单 / 部署模板表单 */
  const [uiState, setUiState] = useState<'management' | 'scenarioEditor' | 'templateEditor'>('management');
  const [scenarios, setScenarios] = useState<DeploymentScenario[]>(MOCK_SCENARIOS);
  /** 可增删改的模板列表（与常量初始数据一致） */
  const [templates, setTemplates] = useState<DeploymentTemplate[]>(() => [...MOCK_TEMPLATES]);
  const [presets, setPresets] = useState<PresetScenario[]>([...PRESET_SCENARIOS] as any);
  const [editingScenario, setEditingScenario] = useState<DeploymentScenario | PresetScenario | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<DeploymentTemplate | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<DeploymentScenario>>({});
  /** 新建/编辑模板表单字段 */
  const [templateForm, setTemplateForm] = useState<Partial<DeploymentTemplate>>({});
  /** 模板配置 JSON 文本（与 config 对象双向对应） */
  const [templateConfigJson, setTemplateConfigJson] = useState('{}');

  /** 各子页列表查询关键字 */
  const [templateListQuery, setTemplateListQuery] = useState('');
  const [scenarioListQuery, setScenarioListQuery] = useState('');
  const [presetListQuery, setPresetListQuery] = useState('');
  /** 各子页当前页码（从 1 起） */
  const [templatePage, setTemplatePage] = useState(1);
  const [scenarioPage, setScenarioPage] = useState(1);
  const [presetPage, setPresetPage] = useState(1);

  /** 模板 ID → 名称，供场景过滤绑定模板 */
  const templateNameById = useMemo(() => {
    const m = new Map<string, string>();
    templates.forEach((t) => m.set(t.id, t.name));
    return (id: string) => m.get(id);
  }, [templates]);

  const filteredTemplates = useMemo(
    () => sortByDisplayName(filterTemplates(templates, templateListQuery)),
    [templates, templateListQuery]
  );
  const pagedTemplates = useMemo(() => {
    const start = (templatePage - 1) * LIST_PAGE_SIZE;
    return filteredTemplates.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredTemplates, templatePage]);

  const filteredScenarios = useMemo(
    () =>
      sortScenariosForDisplay(
        filterScenarios(scenarios, scenarioListQuery, (id) => templateNameById(id))
      ),
    [scenarios, scenarioListQuery, templateNameById]
  );
  const pagedScenarios = useMemo(() => {
    const start = (scenarioPage - 1) * LIST_PAGE_SIZE;
    return filteredScenarios.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredScenarios, scenarioPage]);

  const filteredPresets = useMemo(
    () => sortByDisplayName(filterPresets(presets, presetListQuery)),
    [presets, presetListQuery]
  );
  const pagedPresets = useMemo(() => {
    const start = (presetPage - 1) * LIST_PAGE_SIZE;
    return filteredPresets.slice(start, start + LIST_PAGE_SIZE);
  }, [filteredPresets, presetPage]);

  /** 切换子页签时回到第 1 页 */
  useEffect(() => {
    setTemplatePage(1);
    setScenarioPage(1);
    setPresetPage(1);
  }, [activeTab]);

  /** 过滤后总页数变少时收回当前页码 */
  useEffect(() => {
    setTemplatePage((p) => {
      const max = Math.max(1, Math.ceil(filteredTemplates.length / LIST_PAGE_SIZE));
      return p > max ? max : p;
    });
  }, [filteredTemplates.length]);
  useEffect(() => {
    setScenarioPage((p) => {
      const max = Math.max(1, Math.ceil(filteredScenarios.length / LIST_PAGE_SIZE));
      return p > max ? max : p;
    });
  }, [filteredScenarios.length]);
  useEffect(() => {
    setPresetPage((p) => {
      const max = Math.max(1, Math.ceil(filteredPresets.length / LIST_PAGE_SIZE));
      return p > max ? max : p;
    });
  }, [filteredPresets.length]);

  const handleOpenAdd = () => {
    setEditingScenario(null);
    setFormData({ templateIds: [] });
    setUiState('scenarioEditor');
  };

  const handleOpenEdit = (scen: DeploymentScenario) => {
    setEditingScenario(scen);
    setFormData({ ...scen, templateIds: scen.templateIds ? [...scen.templateIds] : [] });
    setUiState('scenarioEditor');
  };

  /** 打开新建模板配置页 */
  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm({ name: '', description: '', type: 'config', config: {} });
    setTemplateConfigJson('{}');
    setUiState('templateEditor');
  };

  /** 打开编辑已有模板 */
  const handleOpenEditTemplate = (tpl: DeploymentTemplate) => {
    setEditingTemplate(tpl);
    setTemplateForm({ ...tpl, config: tpl.config ? { ...tpl.config } : {} });
    try {
      setTemplateConfigJson(JSON.stringify(tpl.config ?? {}, null, 2));
    } catch {
      setTemplateConfigJson('{}');
    }
    setUiState('templateEditor');
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该规则吗？')) {
      if (activeTab === 'scenarios') {
        setScenarios(scenarios.filter(s => s.id !== id));
      } else if (activeTab === 'presets') {
        setPresets(presets.filter(p => p.id !== id));
      } else if (activeTab === 'templates') {
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      }
    }
  };

  const handleSave = () => {
    if (!formData.name) return;

    if (editingScenario) {
      setScenarios(scenarios.map(s => s.id === (editingScenario as DeploymentScenario).id ? { ...s, ...formData } as DeploymentScenario : s));
    } else {
      const newScen: DeploymentScenario = {
        id: `scen-${Date.now()}`,
        name: formData.name!,
        templateIds: formData.templateIds || [],
      };
      setScenarios([...scenarios, newScen]);
    }
    setUiState('management');
  };

  /** 校验并保存模板（含 JSON 配置解析） */
  const handleSaveTemplate = () => {
    const name = templateForm.name?.trim();
    if (!name) {
      alert('请填写模板名称');
      return;
    }
    let parsedConfig: Record<string, unknown> = {};
    const raw = templateConfigJson.trim();
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
          parsedConfig = parsed as Record<string, unknown>;
        } else {
          alert('配置须为 JSON 对象，例如 {}');
          return;
        }
      } catch {
        alert('配置内容不是合法 JSON，请检查');
        return;
      }
    }
    const type = (templateForm.type || 'config') as DeploymentTemplate['type'];
    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? { ...t, name, description: templateForm.description?.trim() || '', type, config: parsedConfig }
            : t
        )
      );
    } else {
      const newTpl: DeploymentTemplate = {
        id: `tpl-${Date.now()}`,
        name,
        description: templateForm.description?.trim() || '',
        type,
        config: parsedConfig,
      };
      setTemplates((prev) => [...prev, newTpl]);
    }
    setUiState('management');
    setEditingTemplate(null);
    setTemplateForm({});
    setTemplateConfigJson('{}');
  };

  if (uiState === 'scenarioEditor') {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => setUiState('management')}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{editingScenario ? '编辑场景配置' : '新建配置'}</h1>
            <p className="text-slate-500 text-sm">定义应用部署的运行时依赖、环境要求及授权模板</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 space-y-10">
            {/* Basic Info Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest">
                <Layout className="w-4 h-4" />
                基本信息
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">名称</label>
                  <input 
                    type="text" 
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入场景描述性名称"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition text-sm bg-slate-50/30"
                  />
                </div>
              </div>
            </section>

            {/* Template Assignment Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest">
                <Box className="w-4 h-4" />
                部署模板授权
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {templates.map(tpl => {
                    const isSelected = formData.templateIds?.includes(tpl.id);
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => {
                          const current = formData.templateIds || [];
                          const updated = isSelected 
                            ? current.filter(id => id !== tpl.id)
                            : [...current, tpl.id];
                          setFormData({ ...formData, templateIds: updated });
                        }}
                        className={cn(
                          "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-200",
                          isSelected 
                            ? "bg-white border-indigo-600 shadow-md shadow-indigo-100 scale-[1.02]" 
                            : "bg-white/50 border-slate-100 hover:border-slate-300 opacity-60 hover:opacity-100"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center transition",
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          {isSelected ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        </div>
                        <span className={cn(
                          "text-xs font-bold text-center",
                          isSelected ? "text-indigo-900" : "text-slate-500"
                        )}>
                          {tpl.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button 
              type="button"
              onClick={() => setUiState('management')}
              className="text-slate-500 font-bold text-sm hover:text-slate-700 transition"
            >
              放弃
            </button>
            <button 
              type="button"
              onClick={handleSave}
              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              保存配置
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (uiState === 'templateEditor') {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="max-w-4xl mx-auto space-y-8"
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setUiState('management');
              setEditingTemplate(null);
              setTemplateForm({});
              setTemplateConfigJson('{}');
            }}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{editingTemplate ? '编辑模板配置' : '新建模板配置'}</h1>
            <p className="text-slate-500 text-sm">定义部署模板的名称、类型、说明及扩展配置（JSON）</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-8 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest">
                <Box className="w-4 h-4" />
                基本信息
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">模板名称 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={templateForm.name ?? ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    placeholder="例如：应用配置中心-数据源配置"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition text-sm bg-slate-50/30"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">模板说明</label>
                  <textarea
                    value={templateForm.description ?? ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                    placeholder="简要描述该模板的用途与适用范围"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition text-sm bg-slate-50/30 resize-y min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">模板类型</label>
                  <select
                    value={templateForm.type ?? 'config'}
                    onChange={(e) =>
                      setTemplateForm({ ...templateForm, type: e.target.value as DeploymentTemplate['type'] })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition text-sm bg-white"
                  >
                    <option value="config">配置类 (config)</option>
                    <option value="k8s">ADS-docker / 容器 (k8s)</option>
                    <option value="vm">实施配置 / 集成 (vm)</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest">
                <Cpu className="w-4 h-4" />
                扩展配置 (JSON)
              </div>
              <p className="text-xs text-slate-500">填写 JSON 对象，用于存放引擎所需的额外参数；可为空对象 {"{}"}。</p>
              <textarea
                value={templateConfigJson}
                onChange={(e) => setTemplateConfigJson(e.target.value)}
                spellCheck={false}
                rows={12}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-mono text-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50/50 outline-none transition bg-slate-50/50"
                placeholder={'{\n  "key": "value"\n}'}
              />
            </section>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setUiState('management');
                setEditingTemplate(null);
                setTemplateForm({});
                setTemplateConfigJson('{}');
              }}
              className="text-slate-500 font-bold text-sm hover:text-slate-700 transition"
            >
              放弃
            </button>
            <button
              type="button"
              onClick={handleSaveTemplate}
              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition shadow-xl shadow-indigo-100 flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              保存模板
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {activeTab === 'presets' ? '发布预制的标准方案' : '发布方案与配置'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {activeTab === 'presets'
              ? '预置可复用的标准发布流程，选用或按需调整步骤'
              : '管理应用发布模版、标准变更步骤及基础方案'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* 部署模板配置 / 部署场景管理 / 标准部署场景库：共用列表与卡片切换 */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl" role="group" aria-label="视图切换">
            <button type="button" title="卡片视图" onClick={() => setViewMode('card')} className={cn("p-2 rounded-lg transition", viewMode === 'card' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}><LayoutGrid className="w-4 h-4" /></button>
            <button type="button" title="列表视图" onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition", viewMode === 'list' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}><List className="w-4 h-4" /></button>
          </div>
          <button
            type="button"
            onClick={
              activeTab === 'scenarios'
                ? handleOpenAdd
                : activeTab === 'templates'
                  ? handleOpenAddTemplate
                  : undefined
            }
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            新建{activeTab === 'scenarios' ? '场景' : activeTab === 'templates' ? '模板配置' : '标准场景'}
          </button>
        </div>
      </div>

      {/* 关键字查询 + 条数（部署模板 / 部署场景 / 标准库） */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-xl flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={
              activeTab === 'templates'
                ? templateListQuery
                : activeTab === 'scenarios'
                  ? scenarioListQuery
                  : presetListQuery
            }
            onChange={(e) => {
              const v = e.target.value;
              if (activeTab === 'templates') {
                setTemplateListQuery(v);
                setTemplatePage(1);
              } else if (activeTab === 'scenarios') {
                setScenarioListQuery(v);
                setScenarioPage(1);
              } else {
                setPresetListQuery(v);
                setPresetPage(1);
              }
            }}
            placeholder={
              activeTab === 'templates'
                ? '搜索模板名称、ID、类型、描述…'
                : activeTab === 'scenarios'
                  ? '搜索场景名称、ID、绑定模板…'
                  : '搜索标准方案名称、ID、描述、步骤…'
            }
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <span className="shrink-0 text-xs text-slate-400">
          共{' '}
          {activeTab === 'templates'
            ? filteredTemplates.length
            : activeTab === 'scenarios'
              ? filteredScenarios.length
              : filteredPresets.length}{' '}
          条
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <AnimatePresence mode="wait">
          {activeTab === 'presets' && viewMode === 'card' && (
            <motion.div 
              key="presets-card"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {pagedPresets.length === 0 ? (
                  <div className="col-span-full py-14 text-center text-sm text-slate-400">
                    {presetListQuery.trim() ? '无匹配数据' : '暂无数据'}
                  </div>
                ) : (
                  <>
                    {pagedPresets.map((preset) => (
                      <div key={preset.id} className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:shadow-amber-500/5 transition group flex flex-col relative">
                        <div className="absolute top-4 right-4 flex items-center gap-1">
                          <button type="button" className="p-2 text-slate-300 hover:text-indigo-600 transition">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(preset.id)} className="p-2 text-slate-300 hover:text-rose-600 transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 border border-amber-100">
                            <Star className="w-6 h-6 fill-amber-500" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">{preset.name}</h4>
                            <p className="text-[10px] text-slate-400 font-mono italic">{preset.id}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 line-clamp-2">{preset.description}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-auto pt-4 border-t border-slate-50">
                          {preset.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1.5">
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-medium">{step.name}</span>
                              {idx < preset.steps.length - 1 && <ArrowRight className="w-3 h-3 text-slate-300" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 p-8 transition hover:border-indigo-300 hover:bg-slate-50 group">
                      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-white shadow-sm transition group-hover:scale-110">
                        <Plus className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-400">预制新发布场景</p>
                    </div>
                  </>
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <PaginationBar page={presetPage} pageSize={LIST_PAGE_SIZE} total={filteredPresets.length} onPageChange={setPresetPage} />
              </div>
            </motion.div>
          )}

          {activeTab === 'presets' && viewMode === 'list' && (
            <motion.div
              key="presets-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="divide-y divide-slate-100">
                {pagedPresets.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">{presetListQuery.trim() ? '无匹配数据' : '暂无数据'}</div>
                ) : (
                  pagedPresets.map((preset) => (
                    <div
                      key={preset.id}
                      className="flex flex-col gap-1.5 py-2 pl-2 pr-3 transition group hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-100 bg-amber-50 text-amber-500">
                          <Star className="h-4 w-4 fill-amber-500" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold leading-tight text-slate-900">{preset.name}</h4>
                          <p className="font-mono text-[9px] text-slate-400">{preset.id}</p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500">{preset.description}</p>
                          <div className="mt-1 flex max-h-[1.4rem] flex-wrap gap-1 overflow-hidden">
                            {preset.steps.map((step, idx) => (
                              <span key={idx} className="rounded bg-slate-100 px-1.5 py-px text-[9px] font-medium text-slate-600">
                                {step.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                        <button type="button" className="p-1 text-slate-400 hover:text-indigo-600">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(preset.id)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-2 border-t border-dashed border-slate-200 p-4 text-sm font-bold text-slate-400 transition hover:bg-slate-50 hover:text-indigo-600"
                >
                  <Plus className="h-4 w-4" />
                  预制新发布场景
                </button>
              </div>
              <PaginationBar page={presetPage} pageSize={LIST_PAGE_SIZE} total={filteredPresets.length} onPageChange={setPresetPage} />
            </motion.div>
          )}

          {activeTab === 'scenarios' && viewMode === 'card' && (
            <motion.div key="scen-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {pagedScenarios.length === 0 ? (
                  <div className="col-span-full py-14 text-center text-sm text-slate-400">
                    {scenarioListQuery.trim() ? '无匹配数据' : '暂无数据'}
                  </div>
                ) : (
                  pagedScenarios.map((scen) => (
                    <div key={scen.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-300">
                      <div className="mb-4 flex justify-between">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Globe className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button type="button" onClick={() => handleOpenEdit(scen)} className="p-1.5 text-slate-400 hover:text-indigo-600">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(scen.id)} className="p-1.5 text-slate-400 hover:text-rose-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <h4 className="mb-1 font-bold text-slate-900">{scen.name}</h4>
                      <p className="mb-4 text-xs text-slate-400">{scen.id}</p>
                      <div className="mb-6 flex flex-wrap gap-1.5">
                        {scen.templateIds.map((tid) => (
                          <span key={tid} className="rounded border border-slate-100 bg-slate-50 px-2 py-0.5 text-[9px] text-slate-500">
                            {templates.find((t) => t.id === tid)?.name || tid}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <PaginationBar page={scenarioPage} pageSize={LIST_PAGE_SIZE} total={filteredScenarios.length} onPageChange={setScenarioPage} />
              </div>
            </motion.div>
          )}

          {activeTab === 'scenarios' && viewMode === 'list' && (
            <motion.div
              key="scen-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="divide-y divide-slate-100">
                {pagedScenarios.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">{scenarioListQuery.trim() ? '无匹配数据' : '暂无数据'}</div>
                ) : (
                  pagedScenarios.map((scen) => (
                    <div key={scen.id} className="group flex items-center justify-between py-2 pl-2 pr-3 transition hover:bg-slate-50">
                      <div className="flex min-w-0 items-center gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-bold leading-tight text-slate-900">{scen.name}</h4>
                          <p className="truncate font-mono text-[9px] text-slate-400">{scen.id}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button type="button" onClick={() => handleOpenEdit(scen)} className="p-1 text-slate-400 hover:text-indigo-600">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(scen.id)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <PaginationBar page={scenarioPage} pageSize={LIST_PAGE_SIZE} total={filteredScenarios.length} onPageChange={setScenarioPage} />
            </motion.div>
          )}

          {activeTab === 'templates' && viewMode === 'card' && (
            <motion.div
              key="templates-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-5">
                {pagedTemplates.length === 0 ? (
                  <div className="col-span-full py-14 text-center text-sm text-slate-400">
                    {templateListQuery.trim() ? '无匹配数据' : '暂无数据'}
                  </div>
                ) : (
                  pagedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group relative flex min-h-[10.5rem] flex-col rounded-xl border border-slate-100 bg-slate-50/40 p-4 transition hover:border-indigo-200 hover:bg-white"
                    >
                      <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
                        <button type="button" onClick={() => handleOpenEditTemplate(tpl)} className="p-1.5 text-slate-400 hover:text-indigo-600">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(tpl.id)} className="p-1.5 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mb-2 flex items-start gap-3 pr-7">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
                          {tpl.type === 'k8s' ? <Layers className="h-4 w-4" /> : tpl.type === 'vm' ? <Server className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
                        </div>
                        <h4 className="min-w-0 text-sm font-bold leading-snug text-slate-900">{tpl.name}</h4>
                      </div>
                      <p className="mb-3 line-clamp-3 min-h-[2.75rem] flex-1 text-[11px] leading-relaxed text-slate-500">{tpl.description}</p>
                      <div className="mt-auto flex gap-2 border-t border-slate-100/80 pt-3">
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase text-indigo-600">{tpl.type}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <PaginationBar page={templatePage} pageSize={LIST_PAGE_SIZE} total={filteredTemplates.length} onPageChange={setTemplatePage} />
            </motion.div>
          )}

          {activeTab === 'templates' && viewMode === 'list' && (
            <motion.div
              key="templates-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="divide-y divide-slate-100">
                {pagedTemplates.length === 0 ? (
                  <div className="p-12 text-center text-sm text-slate-400">{templateListQuery.trim() ? '无匹配数据' : '暂无数据'}</div>
                ) : (
                  pagedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="group flex flex-col gap-1.5 py-2 pl-2 pr-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                          {tpl.type === 'k8s' ? <Layers className="h-4 w-4" /> : tpl.type === 'vm' ? <Server className="h-4 w-4" /> : <Cpu className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-sm font-bold leading-tight text-slate-900">{tpl.name}</h4>
                            <span className="rounded bg-indigo-50 px-1.5 py-px text-[8px] font-bold uppercase text-indigo-600">{tpl.type}</span>
                          </div>
                          <p className="mt-0.5 font-mono text-[9px] text-slate-400">{tpl.id}</p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-slate-500">{tpl.description}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                        <button type="button" onClick={() => handleOpenEditTemplate(tpl)} className="p-1 text-slate-400 hover:text-indigo-600">
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => handleDelete(tpl.id)} className="p-1 text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <PaginationBar page={templatePage} pageSize={LIST_PAGE_SIZE} total={filteredTemplates.length} onPageChange={setTemplatePage} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
