import React, { memo } from 'react';
import { Plus, Edit, Trash, Cpu, Info, Download, Cable } from 'lucide-react';
import { exportToExcel } from '../../utils/export';

const SiteListView = memo(function SiteListView({ sites, onAddClick, onEditClick, onDeleteClick, currentUser, t }) {
  const handleExport = () => {
    const rows = sites.map(s => ({
      ...s,
      customSpecs: Array.isArray(s.customSpecs) && s.customSpecs.length > 0
        ? s.customSpecs.map(c => `${c.label}: ${c.value}${c.note ? ` (${c.note})` : ''}`).join(' / ')
        : '-'
    }));
    exportToExcel('사이트_리스트', [{
      name: '사이트 리스트',
      rows,
      columns: [
        { header: 'ID', key: 'id' }, { header: '고객사', key: 'customer' }, { header: 'Fab', key: 'fab' },
        { header: '라인', key: 'line' }, { header: 'Power', key: 'power' },
        { header: '추가 스펙', key: 'customSpecs' },
        { header: '특이사항', key: 'note' }, { header: '등록일', key: 'date' }
      ]
    }]);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('사이트/유틸리티 환경 정보 마스터', 'Site & Utility Master')}</h1>
          <p className="text-slate-500 mt-1">{t('고객사 팹(Fab)별 인프라 환경 스펙 및 반입 제약사항을 관리합니다.', 'Manage infrastructure specs and restrictions per Fab.')}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> Excel
          </button>
          {currentUser.role === 'ADMIN' && (
            <button onClick={onAddClick} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors"><Plus size={16} className="mr-1" /> {t('새 사이트 등록', 'New Site')}</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {sites.length === 0 ? (
          <div className="md:col-span-2 lg:col-span-3 text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400">{t('등록된 정보가 없습니다.', 'No data available.')}</div>
        ) : sites.map(site => (
          <div key={site.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-indigo-300 hover:shadow-md transition-all flex flex-col">
            {/* 헤더 — 컴팩트 */}
            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50 flex justify-between items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-1.5 py-0.5 rounded truncate max-w-[120px]" title={site.customer}>{site.customer || '-'}</span>
                  {Array.isArray(site.customSpecs) && site.customSpecs.length > 0 && (
                    <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[9px] font-bold px-1.5 py-0.5 rounded inline-flex items-center" title={`추가 스펙 ${site.customSpecs.length}건`}>
                      <Cable size={9} className="mr-0.5" />{site.customSpecs.length}
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-slate-800 truncate" title={site.fab}>{site.fab}</span>
                  {site.line && <span className="text-[11px] text-slate-500 shrink-0">{site.line}</span>}
                </div>
              </div>
              {currentUser.role === 'ADMIN' && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => onEditClick(site)} className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200" title={t('수정', 'Edit')}>
                    <Edit size={11} />
                  </button>
                  <button onClick={() => onDeleteClick(site)} className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200" title={t('삭제', 'Delete')}>
                    <Trash size={11} />
                  </button>
                </div>
              )}
            </div>

            {/* 본문 — Power 한 줄 */}
            <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2">
              <Cpu size={12} className="text-slate-400 shrink-0" />
              <span className="text-[10px] font-bold text-slate-500 shrink-0">Power</span>
              <span className="text-xs font-bold text-slate-800 truncate" title={site.power}>{site.power || '-'}</span>
            </div>

            {/* 추가 스펙 — 컴팩트 2-column 칩 그리드 */}
            {Array.isArray(site.customSpecs) && site.customSpecs.length > 0 && (
              <div className="px-3 py-2 border-b border-slate-100 bg-purple-50/40">
                <div className="grid grid-cols-2 gap-1">
                  {site.customSpecs.slice(0, 4).map(s => (
                    <div key={s.id} className="bg-white border border-purple-200 rounded px-1.5 py-1 min-w-0" title={s.note ? `${s.label}: ${s.value} (${s.note})` : `${s.label}: ${s.value}`}>
                      <div className="text-[9px] font-bold text-purple-600 truncate">{s.label}</div>
                      <div className="text-[11px] font-bold text-slate-800 truncate">{s.value}</div>
                    </div>
                  ))}
                  {site.customSpecs.length > 4 && (
                    <div className="col-span-2 text-[9px] text-purple-600 font-bold text-center pt-0.5">+{site.customSpecs.length - 4}{t('건 더', ' more')}</div>
                  )}
                </div>
              </div>
            )}

            {/* 특이사항 — 짧게 truncate */}
            {site.note && (
              <div className="px-3 py-2 bg-blue-50/40 text-[11px] text-blue-900 line-clamp-2 flex items-start gap-1.5" title={site.note}>
                <Info size={11} className="text-blue-500 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap break-all">{site.note}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default SiteListView;
