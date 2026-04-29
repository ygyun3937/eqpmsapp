import React, { useState, useMemo, memo } from 'react';
import { LifeBuoy, Filter, User, Calendar, Building, Wrench, AlertTriangle, CheckCircle, Clock, Download, Search, ExternalLink } from 'lucide-react';
import StatCard from '../common/StatCard';
import { exportToExcel } from '../../utils/export';

const AS_TYPES = ['전체', '정기점검', '긴급출동', '부품교체', '불량수리', '보증수리'];
const AS_STATUS = ['전체', '접수', '출동', '완료'];

const ASManagementView = memo(function ASManagementView({ projects, onProjectClick, onUpdateAS, currentUser, t }) {
  const [filterType, setFilterType] = useState('전체');
  const [filterStatus, setFilterStatus] = useState('전체');
  const [filterProject, setFilterProject] = useState('all');
  const [search, setSearch] = useState('');

  // 모든 프로젝트의 AS 레코드를 평탄화
  const allRecords = useMemo(() => {
    const recs = [];
    (projects || []).forEach(p => {
      (p.asRecords || []).forEach(r => {
        recs.push({
          ...r,
          projectId: p.id,
          projectName: p.name,
          customer: p.customer,
          site: p.site,
          domain: p.domain
        });
      });
    });
    // 최신순
    recs.sort((a, b) => new Date(b.date) - new Date(a.date));
    return recs;
  }, [projects]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return allRecords.filter(r => {
      if (filterType !== '전체' && r.type !== filterType) return false;
      if (filterStatus !== '전체' && r.status !== filterStatus) return false;
      if (filterProject !== 'all' && r.projectId !== filterProject) return false;
      if (kw && ![r.projectName, r.customer, r.engineer, r.description, r.resolution].some(v => v && String(v).toLowerCase().includes(kw))) return false;
      return true;
    });
  }, [allRecords, filterType, filterStatus, filterProject, search]);

  const stats = useMemo(() => ({
    total: allRecords.length,
    received: allRecords.filter(r => r.status === '접수').length,
    dispatched: allRecords.filter(r => r.status === '출동').length,
    completed: allRecords.filter(r => r.status === '완료').length,
    emergency: allRecords.filter(r => r.type === '긴급출동' && r.status !== '완료').length,
  }), [allRecords]);

  // 프로젝트 목록 (AS 레코드가 있는 프로젝트만)
  const projectOptions = useMemo(() => {
    const ids = new Set(allRecords.map(r => r.projectId));
    return (projects || []).filter(p => ids.has(p.id));
  }, [allRecords, projects]);

  const handleExport = () => {
    exportToExcel('AS_통합내역', [{
      name: 'AS 내역',
      rows: filtered.map(r => ({
        date: r.date, projectName: r.projectName, customer: r.customer, site: r.site,
        type: r.type, status: r.status, engineer: r.engineer,
        description: r.description, resolution: r.resolution || '-'
      })),
      columns: [
        { header: '일자', key: 'date' }, { header: '프로젝트', key: 'projectName' }, { header: '고객사', key: 'customer' },
        { header: '사이트', key: 'site' }, { header: 'AS 유형', key: 'type' }, { header: '상태', key: 'status' },
        { header: '담당 엔지니어', key: 'engineer' }, { header: '증상/요청', key: 'description' }, { header: '조치 내용', key: 'resolution' }
      ]
    }]);
  };

  const typeColor = (type) => {
    switch (type) {
      case '긴급출동': return 'bg-red-100 text-red-700 border-red-200';
      case '정기점검': return 'bg-blue-100 text-blue-700 border-blue-200';
      case '부품교체': return 'bg-amber-100 text-amber-700 border-amber-200';
      case '보증수리': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case '불량수리': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };
  const statusColor = (status) => {
    switch (status) {
      case '완료': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case '출동': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center"><LifeBuoy className="mr-2 text-purple-500" size={24} /> {t('AS 통합 관리', 'AS Management')}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t('전체 프로젝트의 AS(애프터서비스) 내역을 한 곳에서 관리합니다.', 'Manage after-sales service records across all projects.')}</p>
        </div>
        <button onClick={handleExport} className="flex items-center bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm">
          <Download size={16} className="mr-2" /> {t('AS 내역 Excel', 'AS Excel')}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title={t('전체 AS', 'Total')} value={stats.total} icon={<LifeBuoy size={22} className="text-purple-500" />} />
        <StatCard title={t('접수', 'Received')} value={stats.received} icon={<Clock size={22} className="text-amber-500" />} color={stats.received > 0 ? 'border-amber-200 bg-amber-50' : ''} />
        <StatCard title={t('출동', 'Dispatched')} value={stats.dispatched} icon={<Wrench size={22} className="text-blue-500" />} color={stats.dispatched > 0 ? 'border-blue-200 bg-blue-50' : ''} />
        <StatCard title={t('완료', 'Completed')} value={stats.completed} icon={<CheckCircle size={22} className="text-emerald-500" />} />
        <StatCard title={t('미완료 긴급', 'Open Urgent')} value={stats.emergency} icon={<AlertTriangle size={22} className="text-red-500" />} color={stats.emergency > 0 ? 'border-red-200 bg-red-50' : ''} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-50 px-3 py-1.5 rounded-lg flex-1 min-w-[200px]">
            <Search size={16} className="text-slate-400 mr-2" />
            <input className="bg-transparent outline-none text-sm w-full" placeholder={t('프로젝트/고객사/엔지니어/증상 검색', 'Search project / customer / engineer / symptom')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
            <Filter size={14} className="text-slate-400 mr-1" />
            <select className="text-sm bg-transparent outline-none" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
              <option value="all">{t('전체 프로젝트', 'All Projects')}</option>
              {projectOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
            <select className="text-sm bg-transparent outline-none" value={filterType} onChange={e => setFilterType(e.target.value)}>
              {AS_TYPES.map(t => <option key={t} value={t}>{t === '전체' ? '전체 유형' : t}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
            <select className="text-sm bg-transparent outline-none" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              {AS_STATUS.map(t => <option key={t} value={t}>{t === '전체' ? '전체 상태' : t}</option>)}
            </select>
          </div>
        </div>

        {/* 리스트 */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">
            <LifeBuoy size={32} className="mx-auto mb-3 text-slate-300" />
            {allRecords.length === 0 ? t('등록된 AS 내역이 없습니다.', 'No AS records.') : t('필터 조건에 해당하는 AS가 없습니다.', 'No AS matching the filter.')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(r => (
              <div key={`${r.projectId}-${r.id}`} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center flex-wrap gap-1.5 mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor(r.type)}`}>{r.type}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor(r.status)}`}>{r.status}</span>
                      <span className="text-[10px] text-slate-400 ml-1 flex items-center"><Calendar size={10} className="mr-1" />{r.date}</span>
                    </div>
                    <button onClick={() => onProjectClick && onProjectClick(r.projectId)} className="text-base font-bold text-slate-800 hover:text-purple-600 transition-colors flex items-center group">
                      {r.projectName} <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100" />
                    </button>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                      <span className="flex items-center"><Building size={11} className="mr-1" />{r.customer}</span>
                      {r.site && <span>· {r.site}</span>}
                      <span className="flex items-center"><User size={11} className="mr-1" />{r.engineer}</span>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                        <div className="text-[10px] font-bold text-slate-500 mb-1">{t('증상 / 요청', 'Symptoms / Request')}</div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap line-clamp-3">{r.description}</p>
                      </div>
                      <div className={`rounded-lg p-2.5 border ${r.resolution ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`text-[10px] font-bold mb-1 ${r.resolution ? 'text-emerald-600' : 'text-slate-500'}`}>{t('조치 내용', 'Resolution')}</div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap line-clamp-3">{r.resolution || t('(미작성)', '(Not filled)')}</p>
                      </div>
                    </div>
                  </div>

                  {currentUser.role !== 'CUSTOMER' && (
                    <div className="flex flex-col gap-1 shrink-0">
                      {['접수', '출동', '완료'].map(s => (
                        <button key={s} onClick={() => onUpdateAS(r.projectId, r.id, { status: s })} className={`text-[10px] px-3 py-1 rounded font-bold border transition-colors ${r.status === s ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s}</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default ASManagementView;
