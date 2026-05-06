import React, { useState, useMemo, memo } from 'react';
import { Plus, HardDrive, Monitor, Cpu, CalendarDays, User, FileText, Trash, Download, GitCommit, Filter, Search, Building, Kanban } from 'lucide-react';
import { exportToExcel } from '../../utils/export';

const categoryIcon = (cat) => {
  if (cat === 'HW') return HardDrive;
  if (cat === 'SW') return Monitor;
  return Cpu;
};
const categoryColor = (cat) => {
  if (cat === 'HW') return { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' };
  if (cat === 'SW') return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
  if (cat && cat.includes('충방전기')) return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
  if (cat && cat.includes('인터페이스')) return { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-700' };
  return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' };
};

const VersionHistoryView = memo(function VersionHistoryView({ projects, releases, onAddClick, onDeleteRelease, currentUser, t }) {
  const [filterCategory, setFilterCategory] = useState('전체');
  const [filterDomain, setFilterDomain] = useState('전체');
  const [filterProject, setFilterProject] = useState('all');
  const [search, setSearch] = useState('');

  // 모든 프로젝트의 versions를 평탄화
  const projectVersions = useMemo(() => {
    const list = [];
    (projects || []).forEach(p => {
      (p.versions || []).forEach(v => {
        list.push({
          source: 'project',
          id: `${p.id}-${v.id}`,
          rawId: v.id,
          projectId: p.id,
          projectName: p.name,
          domain: p.domain,
          customer: p.customer,
          category: v.category,
          version: v.version,
          releaseDate: v.releaseDate || '',
          author: v.author || '',
          note: v.note || ''
        });
      });
    });
    return list;
  }, [projects]);

  // 글로벌 releases 합치기 (호환)
  const globalReleases = useMemo(() => (releases || []).map(r => ({
    source: 'global',
    id: `R-${r.id}`,
    rawId: r.id,
    projectId: null,
    projectName: '(전사 릴리즈)',
    domain: '',
    customer: '',
    category: r.type || 'FW',
    version: r.version,
    releaseDate: r.date || '',
    author: r.author || '',
    note: r.description || ''
  })), [releases]);

  const allVersions = useMemo(() => {
    const merged = [...projectVersions, ...globalReleases];
    merged.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
    return merged;
  }, [projectVersions, globalReleases]);

  // 필터 옵션
  const categories = useMemo(() => Array.from(new Set(allVersions.map(v => v.category).filter(Boolean))), [allVersions]);
  const domains = useMemo(() => Array.from(new Set(allVersions.map(v => v.domain).filter(Boolean))), [allVersions]);
  const projectOptions = useMemo(() => {
    const seen = new Map();
    allVersions.forEach(v => { if (v.projectId && !seen.has(v.projectId)) seen.set(v.projectId, v.projectName); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [allVersions]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return allVersions.filter(v => {
      if (filterCategory !== '전체' && v.category !== filterCategory) return false;
      if (filterDomain !== '전체' && v.domain !== filterDomain) return false;
      if (filterProject !== 'all' && v.projectId !== filterProject) return false;
      if (kw && ![v.projectName, v.version, v.note, v.author, v.category].some(x => x && String(x).toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [allVersions, filterCategory, filterDomain, filterProject, search]);

  const handleExport = () => {
    exportToExcel('버전_통합이력', [{
      name: '버전 통합 이력',
      rows: filtered.map(v => ({
        releaseDate: v.releaseDate || '-', category: v.category, version: v.version,
        projectName: v.projectName, domain: v.domain || '-', customer: v.customer || '-',
        author: v.author || '-', note: v.note || '-'
      })),
      columns: [
        { header: '배포일', key: 'releaseDate' }, { header: '카테고리', key: 'category' }, { header: '버전', key: 'version' },
        { header: '프로젝트', key: 'projectName' }, { header: '도메인', key: 'domain' }, { header: '고객사', key: 'customer' },
        { header: '등록자', key: 'author' }, { header: '변경 내용', key: 'note' }
      ]
    }]);
  };

  // 카테고리별 통계
  const categoryStats = useMemo(() => {
    const stat = {};
    allVersions.forEach(v => {
      if (!stat[v.category]) stat[v.category] = 0;
      stat[v.category]++;
    });
    return stat;
  }, [allVersions]);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center"><GitCommit size={22} className="mr-2 text-indigo-500" /> {t('버전 통합 이력', 'Version History')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('전체 프로젝트의 버전 변경 이력을 통합해서 확인합니다.', 'All version changes across projects.')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={handleExport} className="flex items-center bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> Excel
          </button>
          {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
            <button onClick={onAddClick} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm" title={t('전사 릴리즈 직접 등록 (특정 프로젝트와 무관한 전사 공통 릴리즈)', 'Add global release')}><Plus size={16} className="mr-1" /> {t('전사 릴리즈 등록', 'Add Global')}</button>
          )}
        </div>
      </div>

      {/* 카테고리 통계 */}
      {Object.keys(categoryStats).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(categoryStats).map(([cat, cnt]) => {
            const c = categoryColor(cat);
            return (
              <button key={cat} onClick={() => setFilterCategory(cat === filterCategory ? '전체' : cat)} className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${cat === filterCategory ? `${c.bg} ${c.border} ${c.text} ring-2 ring-offset-1 ring-${c.text.split('-')[1]}-300` : `bg-white border-slate-200 text-slate-600 hover:bg-slate-50`}`}>
                <span>{cat}</span>
                <span className={`ml-1.5 px-1.5 py-0.5 rounded ${cat === filterCategory ? 'bg-white/30' : 'bg-slate-100'}`}>{cnt}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 필터 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg flex-1 min-w-[200px]">
          <Search size={16} className="text-slate-400 mr-2" />
          <input className="bg-transparent outline-none text-sm w-full" placeholder={t('프로젝트/버전/내용 검색', 'Search')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
          <Filter size={14} className="text-slate-400 mr-1" />
          <select className="text-sm bg-transparent outline-none" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="all">{t('전체 프로젝트', 'All Projects')}</option>
            {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
          <select className="text-sm bg-transparent outline-none" value={filterDomain} onChange={e => setFilterDomain(e.target.value)}>
            <option value="전체">{t('전체 도메인', 'All Domains')}</option>
            {domains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
          <select className="text-sm bg-transparent outline-none" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="전체">{t('전체 카테고리', 'All Categories')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* 타임라인 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">
        <div className="absolute left-10 top-6 bottom-6 w-0.5 bg-slate-200 z-0"></div>
        <div className="space-y-6 relative z-10">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <GitCommit size={32} className="mx-auto mb-2 text-slate-300" />
              {allVersions.length === 0 ? t('등록된 버전 이력이 없습니다.', 'No versions.') : t('필터 조건에 해당하는 이력이 없습니다.', 'No match.')}
            </div>
          ) : filtered.map(v => {
            const Icon = categoryIcon(v.category);
            const c = categoryColor(v.category);
            return (
              <div key={v.id} className="flex items-start group">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 bg-white ${c.border} ${c.text} ${c.bg}`}>
                  <Icon size={18} />
                </div>
                <div className="ml-6 flex-1 min-w-0">
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-black border ${c.bg} ${c.border} ${c.text}`}>{v.category}</span>
                        <h3 className="text-base font-black text-slate-800 font-mono">{v.version}</h3>
                        {v.source === 'global' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">전사</span>}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-500">
                        {v.releaseDate && <span className="flex items-center"><CalendarDays size={12} className="mr-1" />{v.releaseDate}</span>}
                        {v.author && <span className="flex items-center"><User size={12} className="mr-1" />{v.author}</span>}
                        {v.source === 'global' && currentUser.role === 'ADMIN' && (
                          <button onClick={() => onDeleteRelease({ id: v.rawId })} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                            <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-slate-600 mb-2 gap-3 flex-wrap">
                      <span className="flex items-center font-bold"><Kanban size={12} className="mr-1 text-indigo-500" />{v.projectName}</span>
                      {v.domain && <span className="text-slate-400">· {v.domain}</span>}
                      {v.customer && <span className="flex items-center text-slate-400"><Building size={11} className="mr-0.5" />{v.customer}</span>}
                    </div>
                    {v.note && (
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-1.5 flex items-center"><FileText size={12} className="mr-1" /> Update Notes</h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{v.note}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default VersionHistoryView;
