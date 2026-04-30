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
      <div className="grid grid-cols-1 gap-4">
        {sites.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400">{t('등록된 정보가 없습니다.', 'No data available.')}</div>
        ) : sites.map(site => (
          <div key={site.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-indigo-300 transition-colors">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded mr-2">{site.customer}</span>
                <span className="text-lg font-bold text-slate-800">{site.fab}</span>
                <span className="text-sm text-slate-500 ml-2">({site.line})</span>
              </div>
              {currentUser.role === 'ADMIN' && (
                <div className="flex space-x-2">
                  <button onClick={() => onEditClick(site)} className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => onDeleteClick(site)} className="text-slate-400 hover:text-red-600 p-1 transition-colors"><Trash size={16} /></button>
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-500 flex items-center mb-1"><Cpu size={14} className="mr-1 text-slate-400"/> Power</span>
                <p className="text-sm font-bold text-slate-800">{site.power || '-'}</p>
              </div>
            </div>
            {Array.isArray(site.customSpecs) && site.customSpecs.length > 0 && (
              <div className="px-5 pb-5">
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                  <span className="text-xs font-bold text-purple-700 flex items-center mb-2">
                    <Cable size={14} className="mr-1" />
                    {t('추가 스펙', 'Additional Specs')}
                    <span className="ml-2 text-[10px] bg-white border border-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">{site.customSpecs.length}{t('건', '')}</span>
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {site.customSpecs.map(s => (
                      <div key={s.id} className="bg-white border border-purple-200 rounded-lg p-2.5">
                        <div className="text-[10px] font-bold text-purple-600 mb-0.5">{s.label}</div>
                        <div className="text-sm font-bold text-slate-800 break-all">{s.value}</div>
                        {s.note && <div className="text-[11px] text-slate-500 mt-0.5 italic">{s.note}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {site.note && (
              <div className="px-5 pb-5">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <span className="text-xs font-bold text-blue-700 flex items-center mb-1"><Info size={14} className="mr-1"/> {t('기타 특이사항', 'Notes')}</span>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{site.note}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
});

export default SiteListView;
