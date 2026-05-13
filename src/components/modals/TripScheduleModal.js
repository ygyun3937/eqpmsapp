import React, { useState, memo, useMemo } from 'react';
import { Plane, Plus, Trash, Calendar, MapPin, User, X, Info, AlertTriangle } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const TripScheduleModal = memo(function TripScheduleModal({ project, engineers, onClose, onAddTrip, onUpdateTrip, onDeleteTrip, t }) {
  const [form, setForm] = useState({ engineerId: '', departureDate: '', returnDate: '', note: '' });
  const [error, setError] = useState('');

  // 출장 가능 인력 풀 = 메인 PM (이름 매칭) + 이 프로젝트에 assignedProjectIds로 배정된 엔지니어
  const eligibleEngineers = useMemo(() => {
    const list = engineers || [];
    const set = new Map();
    list.forEach(e => {
      if (Array.isArray(e.assignedProjectIds) && e.assignedProjectIds.includes(project.id)) {
        set.set(e.id, e);
      }
      // 메인 PM 이름 매칭 (레거시/단일 입력 호환)
      if (project.manager && e.name === project.manager) {
        set.set(e.id, e);
      }
    });
    return Array.from(set.values());
  }, [engineers, project]);

  const trips = (project.trips || []).slice().sort((a, b) => new Date(a.departureDate || 0) - new Date(b.departureDate || 0));

  const engineerById = (id) => (engineers || []).find(e => e.id === id);

  const handleAdd = () => {
    setError('');
    if (!form.engineerId) { setError(t('출장 인력을 선택하세요.', 'Select an engineer.')); return; }
    if (!form.departureDate) { setError(t('출발일을 입력하세요.', 'Enter departure date.')); return; }
    if (!form.returnDate) { setError(t('도착(복귀)일을 입력하세요.', 'Enter return date.')); return; }
    if (new Date(form.returnDate) < new Date(form.departureDate)) { setError(t('복귀일이 출발일보다 빠를 수 없습니다.', 'Return must be after departure.')); return; }
    onAddTrip(project.id, { ...form });
    setForm({ engineerId: '', departureDate: '', returnDate: '', note: '' });
  };

  if (!project) return null;

  return (
    <ModalWrapper
      title={t('출장 일정 관리', 'Trip Schedule')}
      icon={<Plane size={18} />}
      color="blue"
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onClose(); }}
      submitText={t('닫기', 'Close')}
      t={t}
    >
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 mb-1">{t('프로젝트', 'Project')}</p>
        <p className="text-sm font-bold text-slate-800">{project.name}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">
          <Calendar size={10} className="inline mr-1" />{project.startDate} ~ {project.dueDate}
          <MapPin size={10} className="inline mx-1.5" />{project.site}
        </p>
      </div>

      {/* 안내 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start text-xs text-blue-800">
        <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
        <span>{t('인력 풀 = 메인 담당자 + 이 프로젝트에 배정된 엔지니어. 한 명이 같은 프로젝트에 여러 번 출장 가능합니다. 입력된 출장 일정이 우선 표시됩니다 (없으면 프로젝트 일정으로 자동 추론).', 'Pool = main PM + assignees. One person can have multiple trips to the same project. Trips override project-date inference.')}</span>
      </div>

      {/* 등록 폼 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('출장 인력', 'Engineer')}</label>
            {eligibleEngineers.length === 0 ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start">
                <AlertTriangle size={12} className="mr-1 mt-0.5 shrink-0" />
                {t('이 프로젝트에 배정된 인력이 없습니다. 인력/리소스 관리에서 엔지니어 편집 → 활성 프로젝트 체크 또는 메인 담당자를 변경해 주세요.', 'No assignees. Edit engineers in Resources tab to assign this project.')}
              </div>
            ) : (
              <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={form.engineerId} onChange={e => setForm({...form, engineerId: e.target.value})}>
                <option value="">{t('-- 선택 --', '-- Select --')}</option>
                {eligibleEngineers.map(eng => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}{eng.grade ? ` ${eng.grade}` : ''}{eng.dept ? ` · ${eng.dept}` : ''}
                    {project.manager === eng.name ? ' · 메인 PM' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('출발일', 'Departure')}</label>
            <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={form.departureDate} onChange={e => setForm({...form, departureDate: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('도착(복귀)일', 'Return')}</label>
            <input type="date" max="9999-12-31" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={form.returnDate} onChange={e => setForm({...form, returnDate: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">{t('메모 (선택)', 'Note (Optional)')}</label>
          <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={form.note} onChange={e => setForm({...form, note: e.target.value})} placeholder={t('예: 셋업 1차, 트레이닝, Buy-off 입회 등', 'e.g. setup 1st, training, Buy-off')} />
        </div>
        {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        <div className="flex justify-end">
          <button type="button" onClick={handleAdd} disabled={eligibleEngineers.length === 0} className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors">
            <Plus size={12} className="mr-1" />{t('출장 추가', 'Add Trip')}
          </button>
        </div>
      </div>

      {/* 등록된 출장 리스트 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-bold text-slate-700 flex items-center"><Plane size={14} className="mr-1.5 text-blue-500" />{t('등록된 출장', 'Registered Trips')}</h4>
          <span className="text-[10px] text-slate-400">{t('총', 'Total')} {trips.length}{t('건', '')}</span>
        </div>
        {trips.length === 0 ? (
          <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
            {t('등록된 출장 일정이 없습니다.', 'No trips registered.')}
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {trips.map(trip => {
              const eng = engineerById(trip.engineerId);
              return (
                <div key={trip.id} className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center text-sm font-bold text-slate-800 mb-0.5">
                        <User size={12} className="mr-1 text-slate-400" />
                        {eng ? eng.name : (trip.engineerName || '(unknown)')}
                        {eng && eng.grade && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{eng.grade}</span>}
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center">
                        <Calendar size={10} className="mr-1 text-blue-400" />
                        {trip.departureDate} ~ {trip.returnDate}
                      </div>
                      {trip.note && <div className="text-[11px] text-slate-500 mt-1 italic">{trip.note}</div>}
                    </div>
                    <button onClick={() => onDeleteTrip(project.id, trip.id)} className="text-slate-300 hover:text-red-500 p-1 shrink-0" title={t('삭제', 'Delete')}><Trash size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalWrapper>
  );
});

export default TripScheduleModal;
