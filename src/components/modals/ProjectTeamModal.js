import React, { useState, memo, useMemo } from 'react';
import { Users, User, UserPlus, Plane, Plus, Trash, Calendar, MapPin, History, Info, AlertTriangle, Pencil, Save, X, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { fmtYMD } from '../../utils/calc';
import ModalWrapper from '../common/ModalWrapper';
import SendReportEmailModal from './SendReportEmailModal';

const ProjectTeamModal = memo(function ProjectTeamModal({
  project, engineers, users, customers, currentUser, mailGasUrl,
  onClose, onChangeManager, onToggleAssignment,
  onAddTrip, onUpdateTrip, onDeleteTrip,
  t
}) {
  const [activeTab, setActiveTab] = useState('manager');
  // 메인 담당자 변경
  const [newManager, setNewManager] = useState('');
  const [reason, setReason] = useState('');
  // 출장 일정
  const [tripForm, setTripForm] = useState({ engineerId: '', companionIds: [], departureDate: '', returnDate: '', note: '' });
  const [tripError, setTripError] = useState('');
  const [emailTrip, setEmailTrip] = useState(null); // { kind: 'trip_request'|'trip_report', trip }
  // 출장 수정
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ engineerId: '', companionIds: [], departureDate: '', returnDate: '', note: '', reason: '' });
  const [editError, setEditError] = useState('');
  const [historyOpenIds, setHistoryOpenIds] = useState(() => new Set());

  const list = engineers || [];

  // 추가 인력 상태 (이 프로젝트가 assignedProjectIds에 포함된 엔지니어)
  const assignedSet = useMemo(() => {
    if (!project) return new Set();
    return new Set(list.filter(e => Array.isArray(e.assignedProjectIds) && e.assignedProjectIds.includes(project.id)).map(e => e.id));
  }, [list, project]);

  // 출장 인력 풀 = 메인 PM (이름 매칭) + assignedProjectIds로 배정된 엔지니어
  const tripPool = useMemo(() => {
    if (!project) return [];
    const map = new Map();
    list.forEach(e => {
      if (assignedSet.has(e.id)) map.set(e.id, e);
      if (project.manager && e.name === project.manager) map.set(e.id, e);
    });
    return Array.from(map.values());
  }, [list, project, assignedSet]);

  if (!project) return null;
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
    const companions = (tripForm.companionIds || [])
      .filter(id => id && id !== tripForm.engineerId)
      .map(id => ({ id, name: (list.find(e => e.id === id) || {}).name || '' }));
    onAddTrip(project.id, { ...tripForm, companions });
    setTripForm({ engineerId: '', companionIds: [], departureDate: '', returnDate: '', note: '' });
  };

  const toggleCompanion = (formSetter, form, id) => {
    if (!id) return;
    if (id === form.engineerId) return; // 주담당과 동일 불가
    const set = new Set(form.companionIds || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    formSetter({ ...form, companionIds: Array.from(set) });
  };

  const handleStartEdit = (trip) => {
    setEditError('');
    setEditingId(trip.id);
    setEditForm({
      engineerId: trip.engineerId || '',
      companionIds: Array.isArray(trip.companions) ? trip.companions.map(c => c.id).filter(Boolean) : [],
      departureDate: trip.departureDate || '',
      returnDate: trip.returnDate || '',
      note: trip.note || '',
      reason: ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditError('');
    setEditForm({ engineerId: '', companionIds: [], departureDate: '', returnDate: '', note: '', reason: '' });
  };

  const handleSaveEdit = (trip) => {
    setEditError('');
    if (!editForm.engineerId) { setEditError(t('출장 인력을 선택하세요.', 'Select engineer.')); return; }
    if (!editForm.departureDate) { setEditError(t('출발일을 입력하세요.', 'Enter departure.')); return; }
    if (!editForm.returnDate) { setEditError(t('복귀일을 입력하세요.', 'Enter return.')); return; }
    if (new Date(editForm.returnDate) < new Date(editForm.departureDate)) {
      setEditError(t('복귀일이 출발일보다 빠를 수 없습니다.', 'Return must be after departure.')); return;
    }

    // 변경된 필드만 추출
    const fieldLabels = {
      engineerId: t('인력', 'Engineer'),
      departureDate: t('출발일', 'Departure'),
      returnDate: t('복귀일', 'Return'),
      note: t('메모', 'Note')
    };
    const nameOf = (id) => {
      const e = (engineers || []).find(x => x.id === id);
      return e ? e.name : id;
    };
    const changes = [];
    ['engineerId', 'departureDate', 'returnDate', 'note'].forEach(k => {
      const before = trip[k] || '';
      const after = editForm[k] || '';
      if (before !== after) {
        const beforeDisp = k === 'engineerId' ? nameOf(before) : before;
        const afterDisp = k === 'engineerId' ? nameOf(after) : after;
        changes.push({ field: fieldLabels[k], from: beforeDisp || '(없음)', to: afterDisp || '(없음)' });
      }
    });

    // 동행자 변경 비교
    const beforeCompIds = (trip.companions || []).map(c => c.id).filter(Boolean).sort();
    const afterCompIds = (editForm.companionIds || []).filter(id => id && id !== editForm.engineerId).sort();
    if (JSON.stringify(beforeCompIds) !== JSON.stringify(afterCompIds)) {
      const beforeDisp = beforeCompIds.map(id => nameOf(id)).join(', ') || '(없음)';
      const afterDisp = afterCompIds.map(id => nameOf(id)).join(', ') || '(없음)';
      changes.push({ field: t('동행자', 'Companions'), from: beforeDisp, to: afterDisp });
    }

    if (changes.length === 0) {
      handleCancelEdit();
      return;
    }

    const newName = nameOf(editForm.engineerId);
    const companions = afterCompIds.map(id => ({ id, name: nameOf(id) }));
    const updates = {
      engineerId: editForm.engineerId,
      engineerName: newName,
      companions,
      departureDate: editForm.departureDate,
      returnDate: editForm.returnDate,
      note: editForm.note,
      editHistory: [
        ...(trip.editHistory || []),
        {
          ts: new Date().toLocaleString(),
          by: currentUser?.name || '-',
          changes,
          reason: (editForm.reason || '').trim()
        }
      ]
    };
    const summaryText = `출장 수정 (${newName} ${editForm.departureDate}~${editForm.returnDate}): ` +
      changes.map(c => `${c.field} ${c.from} → ${c.to}`).join(', ') +
      (editForm.reason ? ` / 사유: ${editForm.reason}` : '');
    onUpdateTrip(project.id, trip.id, updates, summaryText);
    handleCancelEdit();
  };

  const toggleHistory = (id) => {
    setHistoryOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
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
          <span className="flex items-center"><Calendar size={10} className="mr-1" />{fmtYMD(project.startDate) || '미정'} ~ {fmtYMD(project.dueDate) || '미정'}</span>
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
            <span>{t('인력 풀 = 메인 담당자 + 추가 배정 엔지니어. 한 명이 같은 프로젝트에 여러 번 출장 가능합니다. 등록 후 일정/인력 수정도 가능하며, 변경 이력은 자동으로 기록됩니다.', 'Pool = main PM + assignees. Multiple trips allowed. Edits are tracked in history.')}</span>
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
                <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={tripForm.engineerId} onChange={e => setTripForm({...tripForm, engineerId: e.target.value, companionIds: (tripForm.companionIds || []).filter(id => id !== e.target.value)})}>
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
            {tripPool.length > 1 && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('동행 엔지니어 (선택, 다중)', 'Companions (optional, multi)')}
                  {(tripForm.companionIds || []).length > 0 && <span className="ml-1 text-[10px] text-purple-600 font-normal">· {tripForm.companionIds.length}{t('명 선택', ' selected')}</span>}
                </label>
                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 max-h-28 overflow-y-auto grid grid-cols-2 gap-1">
                  {tripPool.filter(eng => eng.id !== tripForm.engineerId).map(eng => (
                    <label key={eng.id} className="flex items-center text-[11px] text-slate-700 cursor-pointer hover:bg-white p-1 rounded">
                      <input type="checkbox" className="mr-1.5" checked={(tripForm.companionIds || []).includes(eng.id)} onChange={() => toggleCompanion(setTripForm, tripForm, eng.id)} />
                      <span className="truncate">{eng.name}{eng.grade ? ` ${eng.grade}` : ''}</span>
                    </label>
                  ))}
                  {tripPool.filter(eng => eng.id !== tripForm.engineerId).length === 0 && (
                    <span className="text-[10px] text-slate-400 italic col-span-2">{t('동행 가능한 인력이 없습니다.', 'No available companions.')}</span>
                  )}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('출발일', 'Departure')}</label>
                <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={tripForm.departureDate} onChange={e => setTripForm({...tripForm, departureDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('복귀일', 'Return')}</label>
                <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={tripForm.returnDate} onChange={e => setTripForm({...tripForm, returnDate: e.target.value})} />
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
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {trips.map(tr => {
                  const eng = engineerById(tr.engineerId);
                  const isEditing = editingId === tr.id;
                  const history = tr.editHistory || [];
                  const showHistory = historyOpenIds.has(tr.id);

                  if (isEditing) {
                    return (
                      <div key={tr.id} className="bg-blue-50 p-2.5 rounded border border-blue-300 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-blue-700 flex items-center">
                            <Pencil size={10} className="mr-1" />{t('출장 수정', 'Edit Trip')}
                          </span>
                          <button type="button" onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 p-0.5"><X size={12} /></button>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">{t('인력', 'Engineer')}</label>
                          <select className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editForm.engineerId} onChange={e => setEditForm({...editForm, engineerId: e.target.value, companionIds: (editForm.companionIds || []).filter(id => id !== e.target.value)})}>
                            <option value="">{t('-- 선택 --', '-- Select --')}</option>
                            {tripPool.map(e2 => (
                              <option key={e2.id} value={e2.id}>
                                {e2.name}{e2.grade ? ` ${e2.grade}` : ''}{e2.dept ? ` · ${e2.dept}` : ''}
                                {project.manager === e2.name ? ' · 메인 PM' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        {tripPool.length > 1 && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">
                              {t('동행 엔지니어', 'Companions')}
                              {(editForm.companionIds || []).length > 0 && <span className="ml-1 text-[9px] text-purple-600 font-normal">· {editForm.companionIds.length}{t('명', '')}</span>}
                            </label>
                            <div className="border border-slate-200 rounded p-1.5 bg-white max-h-24 overflow-y-auto grid grid-cols-2 gap-1">
                              {tripPool.filter(eng => eng.id !== editForm.engineerId).map(eng => (
                                <label key={eng.id} className="flex items-center text-[10px] text-slate-700 cursor-pointer hover:bg-slate-50 p-0.5 rounded">
                                  <input type="checkbox" className="mr-1" checked={(editForm.companionIds || []).includes(eng.id)} onChange={() => toggleCompanion(setEditForm, editForm, eng.id)} />
                                  <span className="truncate">{eng.name}{eng.grade ? ` ${eng.grade}` : ''}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">{t('출발일', 'Departure')}</label>
                            <input type="date" max="9999-12-31" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editForm.departureDate} onChange={e => setEditForm({...editForm, departureDate: e.target.value})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-700 mb-0.5">{t('복귀일', 'Return')}</label>
                            <input type="date" max="9999-12-31" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editForm.returnDate} onChange={e => setEditForm({...editForm, returnDate: e.target.value})} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">{t('메모', 'Note')}</label>
                          <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 mb-0.5">{t('변경 사유 (선택)', 'Reason (Optional)')}</label>
                          <input type="text" className="w-full text-xs p-1.5 border border-slate-300 rounded" value={editForm.reason} onChange={e => setEditForm({...editForm, reason: e.target.value})} placeholder={t('예: 일정 지연, 인력 교체', 'e.g. delay, swap')} />
                        </div>
                        {editError && <p className="text-[11px] font-bold text-red-600">{editError}</p>}
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={handleCancelEdit} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded">
                            {t('취소', 'Cancel')}
                          </button>
                          <button type="button" onClick={() => handleSaveEdit(tr)} className="inline-flex items-center px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded">
                            <Save size={10} className="mr-1" />{t('저장', 'Save')}
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={tr.id} className="bg-white p-2 rounded border border-slate-200">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-800 flex items-center">
                            <User size={10} className="mr-1 text-slate-400" />
                            {eng ? eng.name : (tr.engineerName || '(unknown)')}
                            {eng?.grade && <span className="ml-1 text-[10px] font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-600">{eng.grade}</span>}
                            {history.length > 0 && (
                              <span className="ml-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">{t('수정됨', 'edited')} {history.length}</span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-600 flex items-center mt-0.5">
                            <Calendar size={9} className="mr-0.5 text-purple-400" />
                            {tr.departureDate} ~ {tr.returnDate}
                          </div>
                          {Array.isArray(tr.companions) && tr.companions.length > 0 && (
                            <div className="text-[10px] text-slate-600 mt-0.5 flex items-start">
                              <Users size={9} className="mr-1 mt-0.5 text-purple-400 shrink-0" />
                              <span><span className="text-slate-500">{t('동행', 'With')}:</span> <span className="font-bold">{tr.companions.map(c => c.name).filter(Boolean).join(', ')}</span></span>
                            </div>
                          )}
                          {tr.note && <div className="text-[10px] text-slate-500 italic mt-0.5">{tr.note}</div>}
                          {history.length > 0 && (
                            <button type="button" onClick={() => toggleHistory(tr.id)} className="mt-1 text-[10px] text-slate-500 hover:text-slate-700 flex items-center font-bold">
                              {showHistory ? <ChevronUp size={10} className="mr-0.5" /> : <ChevronDown size={10} className="mr-0.5" />}
                              <History size={10} className="mr-0.5" />
                              {t('수정 이력', 'Edit history')} ({history.length})
                            </button>
                          )}
                          {showHistory && history.length > 0 && (
                            <div className="mt-1.5 space-y-1 border-l-2 border-amber-200 pl-2">
                              {[...history].reverse().map((h, i) => (
                                <div key={i} className="text-[10px] text-slate-600 bg-amber-50/40 rounded p-1.5 border border-amber-100">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-700">{h.by}</span>
                                    <span className="text-slate-400">{h.ts}</span>
                                  </div>
                                  {(h.changes || []).map((c, j) => (
                                    <div key={j} className="text-slate-600">
                                      <span className="font-bold">{c.field}:</span> <span className="line-through text-slate-400">{c.from}</span> → <span className="text-emerald-700 font-bold">{c.to}</span>
                                    </div>
                                  ))}
                                  {h.reason && <div className="text-slate-500 italic mt-0.5">{t('사유:', 'Reason:')} {h.reason}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button type="button" onClick={() => setEmailTrip({ kind: 'trip_request', trip: { ...tr, engineerName: eng?.name || tr.engineerName, site: project.site } })} className="inline-flex items-center px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-sm transition-colors" title={t('출장 신청서를 이메일로 발송 (수신/참조 직접 지정)', 'Email this trip request (recipients customizable)')}>
                            <Mail size={11} className="mr-1" />{t('신청서 메일', 'Send Request')}
                          </button>
                          <button type="button" onClick={() => setEmailTrip({ kind: 'trip_report', trip: { ...tr, engineerName: eng?.name || tr.engineerName, site: project.site } })} className="inline-flex items-center px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-sm transition-colors" title={t('출장 보고서를 이메일로 발송 (수신/참조 직접 지정)', 'Email this trip report (recipients customizable)')}>
                            <Mail size={11} className="mr-1" />{t('보고서 메일', 'Send Report')}
                          </button>
                          <button type="button" onClick={() => handleStartEdit(tr)} className="inline-flex items-center px-1.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-bold border border-blue-200 transition-colors" title={t('수정', 'Edit')}>
                            <Pencil size={11} className="mr-0.5" />{t('수정', 'Edit')}
                          </button>
                          <button type="button" onClick={() => onDeleteTrip(project.id, tr.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                            <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
      {emailTrip && (
        <SendReportEmailModal
          kind={emailTrip.kind}
          project={project}
          trip={emailTrip.trip}
          defaultTo={[]}
          defaultCc={[]}
          author={currentUser?.name || ''}
          authorEmail={currentUser?.email || ''}
          mailGasUrl={mailGasUrl}
          users={users}
          customers={customers}
          onClose={() => setEmailTrip(null)}
          onSent={() => setEmailTrip(null)}
          t={t}
        />
      )}
    </ModalWrapper>
  );
});

export default ProjectTeamModal;
