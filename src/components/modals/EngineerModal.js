import React, { useState, memo } from 'react';
import ModalWrapper from '../common/ModalWrapper';
import { ENGINEER_GRADES } from '../../constants';
import { ShieldCheck } from 'lucide-react';

const EngineerModal = memo(function EngineerModal({ engineer, projects, onClose, onSubmit, t }) {
  const [data, setData] = useState(engineer || {
    name: '', dept: '', grade: '', currentSite: '', status: '본사 대기',
    badges: [], safetyTrainings: [], visas: [],
    assignedProjectIds: []
  });

  const activeProjects = (projects || []).filter(p => p.status !== '완료');

  const toggleProject = (id) => {
    const current = Array.isArray(data.assignedProjectIds) ? data.assignedProjectIds : [];
    setData({
      ...data,
      assignedProjectIds: current.includes(id) ? current.filter(x => x !== id) : [...current, id]
    });
  };

  return (
    <ModalWrapper title={engineer ? t('인력 정보 수정', 'Edit Engineer') : t('새 엔지니어 추가', 'Add Engineer')} color="indigo" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('저장하기', 'Save')}>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-bold mb-1">{t('이름', 'Name')}</label>
          <input required className="w-full p-2.5 border rounded-lg" value={data.name} onChange={e=>setData({...data, name:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">{t('직급', 'Grade')}</label>
          <input list="engineer-grades" className="w-full p-2.5 border rounded-lg" value={data.grade || ''} onChange={e=>setData({...data, grade:e.target.value})} placeholder={t('예: 책임', 'e.g. Senior')} />
          <datalist id="engineer-grades">
            {ENGINEER_GRADES.map(g => <option key={g} value={g} />)}
          </datalist>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold mb-1">{t('부서', 'Department')}</label><input required className="w-full p-2.5 border rounded-lg" value={data.dept} onChange={e=>setData({...data, dept:e.target.value})} /></div>
        <div><label className="block text-sm font-bold mb-1">{t('현재 위치', 'Location')}</label><input className="w-full p-2.5 border rounded-lg" value={data.currentSite} onChange={e=>setData({...data, currentSite:e.target.value})} placeholder={t('현재 머무는 곳', 'Current location')} /></div>
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">{t('수동 상태', 'Manual Status')}</label>
        <select className="w-full p-2.5 border rounded-lg" value={data.status} onChange={e=>setData({...data, status:e.target.value})}>
          <option value="본사 대기">{t('본사 대기', 'Standby')}</option>
          <option value="현장 파견">{t('현장 파견', 'Dispatched')}</option>
          <option value="본사 복귀">{t('본사 복귀', 'Returned')}</option>
        </select>
      </div>

      {/* 자격 정보 안내 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start text-xs text-indigo-800">
        <ShieldCheck size={14} className="mr-1.5 shrink-0 mt-0.5" />
        <span>{engineer
          ? t('출입증/안전교육/비자는 리스트의 자격 셀을 클릭하여 별도 모달에서 관리합니다.', 'Manage badges/safety/visa via the cell click on the list.')
          : t('저장 후 리스트에서 자격 셀을 클릭하면 출입증/안전교육/비자를 추가/수정할 수 있습니다.', 'After saving, click the certifications cell on the list to manage.')}</span>
      </div>

      {/* 프로젝트 배정 */}
      <div className="border-t pt-3">
        <label className="block text-sm font-bold mb-1">{t('배정 프로젝트 (활성)', 'Assigned Projects (Active)')}</label>
        <div className="border rounded-lg p-3 max-h-44 overflow-y-auto bg-slate-50 space-y-1">
          {activeProjects.length === 0 ? (
            <p className="text-xs text-slate-400">{t('현재 활성화된 프로젝트가 없습니다.', 'No active projects.')}</p>
          ) : activeProjects.map(p => {
            const checked = (data.assignedProjectIds || []).includes(p.id);
            return (
              <label key={p.id} className="flex items-center text-xs text-slate-700 cursor-pointer hover:bg-white p-1.5 rounded">
                <input type="checkbox" className="mr-2" checked={checked} onChange={() => toggleProject(p.id)} />
                <span className="font-bold mr-2 text-slate-500">{p.id}</span>
                <span className="font-bold">{p.name}</span>
                <span className="ml-auto text-[10px] text-slate-400">{p.customer}</span>
              </label>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-1">{t('완료된 프로젝트는 자동 제외됩니다.', 'Completed projects are excluded.')}</p>
      </div>
    </ModalWrapper>
  );
});

export default EngineerModal;
