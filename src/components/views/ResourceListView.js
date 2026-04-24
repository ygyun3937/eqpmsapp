import React, { memo } from 'react';
import { Users, HardHat, Building, UserCircle, User, MapPin, Edit, Trash, AlertTriangle, XCircle, Download } from 'lucide-react';
import StatCard from '../common/StatCard';
import { exportToCSV } from '../../utils/export';

const ResourceListView = memo(function ResourceListView({ engineers, projects, getStatusColor, TODAY, onAddClick, onEditClick, onDeleteClick, currentUser, t }) {
  const warningCount = engineers.filter(eng => { const expDate = new Date(eng.accessExpiry); return TODAY > expDate || (expDate - TODAY) / (1000 * 60 * 60 * 24) <= 30; }).length;

  const handleExport = () => {
    exportToCSV(engineers.map(e => {
      const expDate = new Date(e.accessExpiry);
      const daysLeft = Math.floor((expDate - TODAY) / (1000 * 60 * 60 * 24));
      const expiryStatus = TODAY > expDate ? '만료됨' : daysLeft <= 30 ? `임박(${daysLeft}일)` : `정상(${daysLeft}일)`;
      const assigned = projects.filter(p => p.manager.includes(e.name.split(' ')[0]) && p.status !== '완료').map(p => p.name).join(' / ');
      return {
        id: e.id, name: e.name, dept: e.dept, role: e.role, status: e.status,
        currentSite: e.currentSite, accessExpiry: e.accessExpiry, expiryStatus, assignedProjects: assigned || '-'
      };
    }), '엔지니어_리스트', [
      { header: 'ID', key: 'id' }, { header: '이름', key: 'name' }, { header: '부서', key: 'dept' }, { header: '역할', key: 'role' },
      { header: '상태', key: 'status' }, { header: '현재 위치', key: 'currentSite' },
      { header: '출입증 만료일', key: 'accessExpiry' }, { header: '만료 상태', key: 'expiryStatus' },
      { header: '배정 프로젝트', key: 'assignedProjects' }
    ]);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold text-slate-800">{t('인력 및 리소스 관리', 'Resource Management')}</h1></div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> CSV
          </button>
          {currentUser.role === 'ADMIN' && (
            <button onClick={onAddClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center transition-colors"><User className="mr-2" size={16}/> {t('엔지니어 추가', 'Add Engineer')}</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title={t('전체 엔지니어', 'Total Engineers')} value={engineers.length} icon={<Users size={24} className="text-blue-500"/>} />
        <StatCard title={t('현장 파견 인원', 'Dispatched')} value={engineers.filter(e => e.status === '현장 파견').length} icon={<HardHat size={24} className="text-purple-500"/>} />
        <StatCard title={t('본사 대기/복귀', 'At Office')} value={engineers.filter(e => e.status.includes('본사')).length} icon={<Building size={24} className="text-emerald-500"/>} />
        <StatCard title={t('출입증 만료 위험', 'Expiring Badges')} value={warningCount} icon={<UserCircle size={24} className="text-red-500"/>} color="border-red-200 bg-red-50" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('이름 / 소속', 'Name/Dept')}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('현재 상태 / 위치', 'Status/Location')}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('진행중인 배정 프로젝트', 'Assigned Projects')}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('안전교육/출입증 만료일', 'Badge Expiry')}</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('관리', 'Manage')}</th></tr></thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {engineers.map((eng) => {
              const assignedPrjs = projects.filter(p => p.manager.includes(eng.name.split(' ')[0]) && p.status !== '완료');
              const expDate = new Date(eng.accessExpiry); const isExpired = TODAY > expDate; const isWarning = !isExpired && (expDate - TODAY) / (1000 * 60 * 60 * 24) <= 30;
              return (
                <tr key={eng.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mr-3">{eng.name.charAt(0)}</div><div><div className="text-sm font-bold text-slate-900">{eng.name}</div><div className="text-xs text-slate-500">{eng.dept} | {eng.role}</div></div></div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col items-start space-y-1.5"><span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full ${getStatusColor(eng.status)}`}>{eng.status}</span><span className="text-xs font-medium text-slate-700 flex items-center"><MapPin size={12} className="text-slate-400 mr-1.5" /> {eng.currentSite}</span></div></td>
                  <td className="px-6 py-4">{assignedPrjs.length === 0 ? <span className="text-xs text-slate-400">-</span> : <div className="space-y-1">{assignedPrjs.map(p => <div key={p.id} className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">{p.name}</div>)}</div>}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`px-3 py-1.5 rounded-lg border ${isExpired ? 'bg-red-50 border-red-200 text-red-700' : isWarning ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'} flex items-center`}>
                        {isExpired ? <XCircle size={16} className="text-red-500 mr-2"/> : isWarning ? <AlertTriangle size={16} className="text-amber-500 mr-2"/> : <UserCircle size={16} className="text-slate-400 mr-2"/>}
                        <div className="flex flex-col"><span className="text-[10px] uppercase font-bold opacity-70 mb-0.5">Expiry Date</span><span className="text-sm font-bold">{eng.accessExpiry}</span></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {currentUser.role === 'ADMIN' && (<><button onClick={() => onEditClick(eng)} className="text-slate-400 hover:text-indigo-600 transition-colors p-2"><Edit size={18} /></button><button onClick={() => onDeleteClick(eng)} className="text-slate-400 hover:text-red-600 transition-colors p-2"><Trash size={18} /></button></>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ResourceListView;
