import React, { useState, memo, useMemo } from 'react';
import { Users, User, UserPlus, Plane, Plus, Trash, Calendar, MapPin, History, Info, AlertTriangle } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const ProjectTeamModal = memo(function ProjectTeamModal({
  project, engineers,
  onClose, onChangeManager, onToggleAssignment,
  onAddTrip, onDeleteTrip,
  t
}) {
  const [activeTab, setActiveTab] = useState('manager');
  // 메인 담당자 변경
  const [newManager, setNewManager] = useState('');
  const [reason, setReason] = useState('');
  // 출장 일정
  const [tripForm, setTripForm] = useState({ engineerId: '', departureDate: '', returnDate: '', note: '' });
  const [tripError, setTripError] = useState('');

  if (!project) return null;
  const list = engineers || [];

  // 추가 인력 상태 (이 프로젝트가 assignedProjectIds에 포함된 엔지니어)
  const assignedSet = useMemo(() => new Set(list.filter(e => Array.isArray(e.assignedProjectIds) && e.assignedProjectIds.includes(project.id)).map(e => e.id)), [list, project.id]);

  // 출장 인력 풀 = 메인 PM (이름 매칭) + assignedProjectIds로 배정된 엔지니어
  const tripPool = useMemo(() => {
    const map = new Map();
    list.forEach(e => {
      if (assignedSet.has(e.id)) map.set(e.id, e);
      if (project.manager && e.name === project.manager) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [list, project.manager, assignedSet]);

  const trips = (project.trips || []).slice().sort((a, b) => new Date(a.departureDate || 0) - new Date(b.departureDate || 0));
  const engineerById = (id) => list.find(e => e.id === id);

  const handleSubmitManager = () => {
    if (!newManager.trim()) return;
    onChangeManager(project.id, newManager.trim(), reason.trim());
    setNewManager('');
    setReason('');
  };

  const handleAddTrip = () => {
    setTripError('');
    if (!tripForm.engineerId) { setTripError(t('출장 인력을 선택하세요.', 'Select engineer.')); return; }
    if (!tripForm.departureDate) { setTripError(t('출발일을 입력하세요.', 'Enter departure.')); return; }
    if (!tripForm.returnDate) { setTripError(t('복귀일을 입력하세요.', 'Enter return.')); return; }
    if (new Date(tripForm.returnDate) < new Date(tripForm.departureDate)) { setTripError(t('복귀일이 출발일보다 빠를 수 없습니다.', 'Return must be after departure.')); return; }
    onAddTrip(project.id, { ...tripForm });
    setTripForm({ engineerId: '', departureDate: '', returnDate: '', note: '' });
  };

  return (
    <ModalWrapper
      title={t('담당자 / 출장 일정', 'Team & Trips')}
      icon={<Users size={18} />}
      color="blue"
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onClose(); }}
      submitText={t('닫기', 'Close')}
      t={t}
    >
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 mb-1">{t('프로젝트', 'Project')}</p>
        <p className="text-sm font-bold text-slate-800">{project.name}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap gap-x-3">
          <span className="flex items-center"><Calendar size={10} className="mr-1" />{project.startDate} ~ {project.dueDate}</span>
          <span className="flex items-center"><MapPin size={10} className="mr-1" />{project.site}</span>
        </p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-slate-200 -mt-1">
        <button type="button" onClick={() => setActiveTab('manager')} className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'manager' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <User size={14} className="mr-1" />{t('메인 담당자', 'Main PM')}
        </button>
        <button type="button" onClick={() => setActiveTab('team')} className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'team' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <UserPlus size={14} className="mr-1" />{t('추가 인력', 'Team')} ({assignedSet.size})
        </button>
        <button type="button" onClick={() => setActiveTab('trips')} className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'trips' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Plane size={14} className="mr-1" />{t('출장 일정', 'Trips')} ({trips.length})
        </button>
      </div>

      {/* 메인 담당자 탭 */}
      {activeTab === 'manager' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('현재 담당자', 'Current')}</label>
            <input disabled className="w-full p-2 border rounded-lg text-sm bg-slate-100 text-slate-500" value={project.manager || t('미지정', 'Unassigned')} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('새 담당자', 'New')}</label>
            {list.length === 0 ? (
              <input className="w-full p-2 border rounded-lg text-sm" value={newManager} onChange={e => setNewManager(e.target.value)} placeholder={t('이름 직접 입력', 'Type name')} />
            ) : (
              <select className="w-full p-2 border rounded-lg text-sm" value={newManager} onChange={e => setNewManager(e.target.value)}>
                <option value="">{t('-- 선택 --', '-- Select --')}</option>
                {list.filter(eng => eng.name !== project.manager).map(eng => (
                  <option key={eng.id} value={eng.name}>
                    {eng.name}{eng.grade ? ` ${eng.grade}` : ''}{eng.dept ? ` · ${eng.dept}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('변경 사유 (선택)', 'Reason (Optional)')}</label>
            <textarea rows="2" className="w-full p-2 border rounded-lg text-sm resize-none" value={reason} onChange={e => setReason(e.target.value)} placeholder={t('예: 휴직, 프로젝트 종료, 인력 재편', 'e.g. leave, project end')}></textarea>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleSubmitManager} disabled={!newManager.trim()} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg">
              {t('담당자 변경', 'Change')}
            </button>
          </div>
          {project.managerHistory?.length > 0 && (
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-slate-700 mb-2 flex items-center"><History size={12} className="mr-1.5" />{t('변경 이력', 'History')}</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {project.managerHistory.map((h, i) => (
                  <div key={i} className="bg-slate-50 p-2 rounded text-[11px] border border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">{h.from} → {h.to}</span>
                      <span className="text-slate-400">{h.date}</span>
                    </div>
                    {h.reason && <p className="text-slate-500">{t('사유:', 'Reason:')} {h.reason}</p>}
                    <p className="text-slate-400">{t('변경자:', 'By:')} {h.changedBy}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 추가 인력 탭 */}
      {activeTab === 'team' && (
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start text-xs text-indigo-800">
            <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
            <span>{t('이 프로젝트에 추가로 투입할 엔지니어를 체크하세요. 메인 담당자와 별개로 멀티 배정 가능합니다.', 'Check engineers to assign additionally. Independent of main PM.')}</span>
          </div>
          {list.length === 0 ? (
            <div className="text-center py-6 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg text-xs">
              <AlertTriangle size={14} className="inline mr-1" />
              {t('인력/리소스에 등록된 엔지니어가 없습니다.', 'No engineers registered.')}
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto bg-slate-50">
              {list.map(eng => {
                const isAssigned = assignedSet.has(eng.id);
                const isMain = eng.name === project.manager;
                return (
                  <label key={eng.id} className={`flex items-center p-2 border-b last:border-b-0 border-slate-100 cursor-pointer transition-colors ${isAssigned ? 'bg-indigo-50' : 'hover:bg-white'}`}>
                    <input type="checkbox" checked={isAssigned} onChange={() => onToggleAssignment(eng.id, project.id)} className="mr-2" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-800 flex items-center">
                        {eng.name}
                        {eng.grade && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{eng.grade}</span>}
                        {isMain && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">메인 PM</span>}
                      </div>
                      <div className="text-[10px] text-slate-500">{eng.dept || '-'}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-slate-400">{t('체크 시 즉시 반영됩니다. (출장 일정 인력 풀에도 자동 포함)', 'Saved instantly. Also added to trip pool.')}</p>
        </div>
      )}

      {/* 출장 일정 탭 */}
      {activeTab === 'trips' && (
        <div className="space-y-3">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start text-xs text-purple-800">
            <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
            <span>{t('인력 풀 = 메인 담당자 + 추가 배정 엔지니어. 한 명이 같은 프로젝트에 여러 번 출장 가능합니다.', 'Pool = main PM + assignees. Multiple trips allowed.')}</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('출장 인력', 'Engineer')}</label>
              {tripPool.length === 0 ? (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start">
                  <AlertTriangle size={12} className="mr-1 mt-0.5 shrink-0" />
                  {t('이 프로젝트에 배정된 인력이 없습니다. "추가 인력" 탭에서 먼저 배정해 주세요.', 'No assignees. Use "Team" tab first.')}
                </div>
              ) : (
                <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={tripForm.engineerId} onChange={e => setTripForm({...tripForm, engineerId: e.target.value})}>
                  <option value="">{t('-- 선택 --', '-- Select --')}</option>
                  {tripPool.map(eng => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name}{eng.grade ? ` ${eng.grade}` : ''}{eng.dept ? ` · ${eng.dept}` : ''}
                      {project.manager === eng.name ? ' · 메인 PM' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('출발일', 'Departure')}</label>
                <input type="date" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={tripForm.departureDate} onChange={e => setTripForm({...tripForm, departureDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('복귀일', 'Return')}</label>
                <input type="date" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={tripForm.returnDate} onChange={e => setTripForm({...tripForm, returnDate: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('메모 (선택)', 'Note')}</label>
              <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={tripForm.note} onChange={e => setTripForm({...tripForm, note: e.target.value})} placeholder={t('예: 셋업 1차, Buy-off 입회', 'e.g. setup 1st')} />
            </div>
            {tripError && <p className="text-xs font-bold text-red-600">{tripError}</p>}
            <div className="flex justify-end">
              <button type="button" onClick={handleAddTrip} disabled={tripPool.length === 0} className="inline-flex items-center px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg">
                <Plus size={12} className="mr-1" />{t('출장 추가', 'Add')}
              </button>
            </div>
          </div>

          {/* 등록된 출장 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <h4 className="text-xs font-bold text-slate-700 flex items-center"><Plane size={12} className="mr-1 text-purple-500" />{t('등록된 출장', 'Registered')}</h4>
              <span className="text-[10px] text-slate-400">{trips.length}{t('건', '')}</span>
            </div>
            {trips.length === 0 ? (
              <div className="text-center py-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                {t('등록된 출장이 없습니다.', 'No trips.')}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {trips.map(tr => {
                  const eng = engineerById(tr.engineerId);
                  return (
                    <div key={tr.id} className="bg-white p-2 rounded border border-slate-200">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 flex items-center">
                            <User size={10} className="mr-1 text-slate-400" />
                            {eng ? eng.name : (tr.engineerName || '(unknown)')}
                            {eng?.grade && <span className="ml-1 text-[10px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-600">{eng.grade}</span>}
                          </div>
                          <div className="text-[10px] text-slate-600 flex items-center mt-0.5">
                            <Calendar size={9} className="mr-0.5 text-purple-400" />
                            {tr.departureDate} ~ {tr.returnDate}
                          </div>
                          {tr.note && <div className="text-[10px] text-slate-500 italic mt-0.5">{tr.note}</div>}
                        </div>
                        <button type="button" onClick={() => onDeleteTrip(project.id, tr.id)} className="text-slate-300 hover:text-red-500 p-0.5"><Trash size={10} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </ModalWrapper>
  );
});

export default ProjectTeamModal;
