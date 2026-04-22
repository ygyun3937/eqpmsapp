import React, { useState, useMemo, memo } from 'react';
import { Plus, HardDrive, Monitor, Cpu, CalendarDays, User, FileText, Trash } from 'lucide-react';

const VersionHistoryView = memo(function VersionHistoryView({ releases, onAddClick, onDeleteRelease, currentUser, t }) {
  const [filterType, setFilterType] = useState('ALL');
  const filteredReleases = useMemo(() => filterType === 'ALL' ? releases : releases.filter(r => r.type === filterType), [releases, filterType]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto relative animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold text-slate-800">{t('버전 릴리즈 관리', 'Releases')}</h1></div>
        <div className="flex items-center space-x-2">
          {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
            <button onClick={onAddClick} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"><Plus size={16} className="mr-1" /> {t('새 버전 배포', 'New Release')}</button>
          )}
        </div>
      </div>
      <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm">
        {['ALL', 'HW', 'SW', 'FW'].map(type => <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filterType === type ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>{type === 'ALL' ? t('전체 보기', 'All') : `${type}`}</button>)}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">
        <div className="absolute left-10 top-6 bottom-6 w-0.5 bg-slate-200 z-0"></div>
        <div className="space-y-6 relative z-10">
          {filteredReleases.length === 0 ? <div className="text-center py-10 text-slate-500">등록된 내역이 없습니다.</div> : filteredReleases.map(release => (
            <div key={release.id} className="flex items-start group">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 bg-white ${release.type === 'HW' ? 'border-amber-200 text-amber-500 bg-amber-50' : release.type === 'SW' ? 'border-blue-200 text-blue-500 bg-blue-50' : 'border-emerald-200 text-emerald-500 bg-emerald-50'}`}>
                {release.type === 'HW' ? <HardDrive size={18}/> : release.type === 'SW' ? <Monitor size={18}/> : <Cpu size={18}/>}
              </div>
              <div className="ml-6 flex-1"><div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"><div className="flex justify-between items-start mb-3"><div className="flex items-center space-x-3"><span className={`px-2.5 py-1 rounded text-xs font-black border ${release.type === 'HW' ? 'bg-amber-50 border-amber-200 text-amber-700' : release.type === 'SW' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{release.type}</span><h3 className="text-lg font-black text-slate-800">{release.version}</h3></div><div className="flex items-center space-x-4"><div className="text-right"><div className="text-sm font-bold text-slate-600 flex items-center justify-end"><CalendarDays size={14} className="mr-1.5 text-slate-400" /> {release.date}</div><div className="text-xs text-slate-500 mt-1 flex items-center justify-end"><User size={12} className="mr-1" /> {release.author}</div></div>
                {(currentUser.role === 'ADMIN') && <button onClick={() => onDeleteRelease(release)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash size={18} /></button>}
              </div></div><div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-2"><h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center"><FileText size={12} className="mr-1" /> Update Notes</h4><p className="text-sm text-slate-700 whitespace-pre-wrap">{release.description}</p></div></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default VersionHistoryView;
