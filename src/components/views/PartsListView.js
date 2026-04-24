import React, { useState, useMemo, memo } from 'react';
import { Plus, Filter, User, Trash, ChevronRight, Package, Download } from 'lucide-react';
import { PART_PHASES } from '../../constants';
import { exportToExcel } from '../../utils/export';

const PartsListView = memo(function PartsListView({ parts, getStatusColor, onUpdateStatus, onDeletePart, onAddClick, currentUser, t }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const filteredParts = useMemo(() => filterStatus === 'all' ? parts : parts.filter(p => p.status === filterStatus), [parts, filterStatus]);

  const handleExport = () => {
    exportToExcel('자재_리스트', [{
      name: '자재 리스트',
      rows: filteredParts.map(p => ({
        id: p.id, projectName: p.projectName, partName: p.partName, partNumber: p.partNumber,
        quantity: p.quantity, urgency: p.urgency, status: p.status, author: p.author, date: p.date
      })),
      columns: [
        { header: 'ID', key: 'id' }, { header: '프로젝트', key: 'projectName' }, { header: '파트명', key: 'partName' },
        { header: 'P/N', key: 'partNumber' }, { header: '수량', key: 'quantity' }, { header: '긴급도', key: 'urgency' },
        { header: '상태', key: 'status' }, { header: '청구자', key: 'author' }, { header: '일자', key: 'date' }
      ]
    }]);
  };

  const getStepClass = (currentStatus, step) => {
    const statusIndex = PART_PHASES.indexOf(currentStatus);
    const stepIndex = PART_PHASES.indexOf(step);
    if (stepIndex < statusIndex) return "bg-indigo-500 text-white border-indigo-600";
    if (stepIndex === statusIndex) return "bg-indigo-100 text-indigo-800 border-indigo-400 font-bold ring-1 ring-indigo-400";
    return "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200";
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold text-slate-800">{t('자재 및 스페어 파트 관리', 'Parts Management')}</h1></div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> Excel
          </button>
          <div className="flex bg-white rounded-lg px-3 py-1.5 border border-slate-200 items-center">
            <Filter size={16} className="text-slate-400 mr-2" />
            <select className="text-sm border-none outline-none font-bold text-slate-700" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">{t('전체 상태 보기', 'All Status')}</option>
              {PART_PHASES.map(phase => <option key={phase} value={phase}>{phase}</option>)}
            </select>
          </div>
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={onAddClick} className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"><Plus size={16} className="mr-1.5" /> {t('자재 청구', 'Request Part')}</button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('파트 정보', 'Part Info')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('프로젝트 / 청구자', 'Project / Author')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('수량 및 중요도', 'Qty / Urgency')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('처리 단계', 'Status Phase')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">{t('관리', 'Manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredParts.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400">{t('내역이 없습니다.', 'No parts requested.')}</td></tr>
            ) : (
              filteredParts.map(part => (
                <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {part.photo && part.photo !== 'null' && part.photo.startsWith('data:') ? (
                        <img src={part.photo} className="w-12 h-12 rounded-lg mr-4 object-cover border border-slate-200" alt="part" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg mr-4 flex items-center justify-center border border-slate-200"><Package size={24} className="text-slate-300"/></div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-900">{part.partName}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">P/N: {part.partNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800">{part.projectName}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center"><User size={12} className="mr-1" /> {part.author} ({part.date})</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start space-y-1.5">
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{part.quantity} EA</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(part.urgency)}`}>{part.urgency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center flex-wrap gap-y-1">
                      {PART_PHASES.map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <button disabled={currentUser.role === 'ENGINEER'} onClick={() => onUpdateStatus(part.id, step)} className={`text-[10px] px-2 py-1 rounded border transition-colors disabled:opacity-80 ${getStepClass(part.status, step)}`}>{step}</button>
                          {idx < PART_PHASES.length - 1 && <ChevronRight size={12} className="mx-0.5 text-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                      <button onClick={() => onDeletePart(part)} className="text-slate-400 hover:text-red-600 transition-colors p-2"><Trash size={18} /></button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default PartsListView;
