import React, { useState, memo } from 'react';
import { X, Settings, Plus, Trash, ArrowUp, ArrowDown, RotateCcw, AlertTriangle, Info, Check, Calendar, Sparkles } from 'lucide-react';
import { PROJECT_PHASES, DOMAIN_VERSION_CATEGORIES } from '../../constants';

const PhaseEditModal = memo(function PhaseEditModal({ project, onClose, onSubmit, t }) {
  const [phases, setPhases] = useState(() => {
    if (project && project.phases && project.phases.length > 0) {
      return project.phases.map(p => ({ ...p, startDate: p.startDate || '', endDate: p.endDate || '' }));
    }
    return PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name, startDate: '', endDate: '' }));
  });
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  if (!project) return null;

  const updateName = (id, name) => setPhases(phases.map(p => p.id === id ? { ...p, name } : p));
  const updateDate = (id, key, value) => setPhases(phases.map(p => p.id === id ? { ...p, [key]: value } : p));
  const addPhase = () => {
    setError('');
    if (!newName.trim()) { setError(t('단계 이름을 입력하세요.', 'Enter step name.')); return; }
    if (phases.some(p => p.name === newName.trim())) { setError(t('이미 동일한 이름의 단계가 있습니다.', 'Duplicate name.')); return; }
    setPhases([...phases, { id: `p${Date.now()}`, name: newName.trim(), startDate: '', endDate: '' }]);
    setNewName('');
  };
  const removePhase = (id) => {
    if (phases.length <= 2) { setError(t('단계는 최소 2개 이상이어야 합니다.', 'At least 2 phases required.')); return; }
    setPhases(phases.filter(p => p.id !== id));
  };
  const move = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= phases.length) return;
    const arr = phases.slice();
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setPhases(arr);
  };
  const reset = () => {
    setPhases(PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name, startDate: '', endDate: '' })));
    setError('');
  };

  // 프로젝트 startDate~dueDate를 단계 수로 균등 배분
  const distributeEvenly = () => {
    setError('');
    if (!project.startDate || !project.dueDate) {
      setError(t('프로젝트 시작/종료일이 없어 자동 분배할 수 없습니다.', 'Project dates missing.'));
      return;
    }
    const start = new Date(project.startDate);
    const due = new Date(project.dueDate);
    const totalMs = due.getTime() - start.getTime();
    if (totalMs <= 0) {
      setError(t('프로젝트 종료일이 시작일보다 빠릅니다.', 'Due date precedes start date.'));
      return;
    }
    const n = phases.length;
    const stepMs = totalMs / n;
    const fmt = (d) => d.toISOString().split('T')[0];
    const next = phases.map((p, i) => {
      const s = new Date(start.getTime() + stepMs * i);
      const e = new Date(start.getTime() + stepMs * (i + 1) - 24 * 60 * 60 * 1000);
      return { ...p, startDate: fmt(s), endDate: fmt(i === n - 1 ? due : e) };
    });
    setPhases(next);
  };

  const clearDates = () => {
    setPhases(phases.map(p => ({ ...p, startDate: '', endDate: '' })));
    setError('');
  };

  const handleSave = () => {
    setError('');
    if (phases.length < 2) { setError(t('단계는 최소 2개 이상이어야 합니다.', 'At least 2 phases.')); return; }
    if (phases.some(p => !p.name.trim())) { setError(t('단계 이름이 비어 있습니다.', 'Empty name.')); return; }
    // 일정 검증: 각 단계의 종료일 >= 시작일
    for (const p of phases) {
      if (p.startDate && p.endDate && new Date(p.endDate) < new Date(p.startDate)) {
        setError(t(`"${p.name}" 단계의 종료일이 시작일보다 빠릅니다.`, `End before start in "${p.name}".`));
        return;
      }
    }
    onSubmit(project.id, phases.map(p => ({
      id: p.id,
      name: p.name.trim(),
      startDate: p.startDate || '',
      endDate: p.endDate || ''
    })));
    onClose();
  };

  const currentPhaseId = project.currentPhaseId || phases[project.phaseIndex || 0]?.id;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[92vh]">
        <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-indigo-50">
          <h2 className="text-lg font-bold flex items-center text-indigo-900">
            <Settings size={20} className="mr-2 text-indigo-600" />
            {t('프로젝트 단계 편집', 'Edit Project Phases')}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={22} /></button>
        </div>

        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-500 mb-1">{t('프로젝트', 'Project')}</p>
            <p className="text-sm font-bold text-slate-800">{project.name}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start text-xs text-amber-800">
            <AlertTriangle size={14} className="mr-1.5 shrink-0 mt-0.5" />
            <span>{t('이 프로젝트의 단계 구성과 단계별 시작/종료일을 편집합니다. 일정은 비워두면 간트차트에서 균등 분배로 자동 계산됩니다. 마지막 단계는 자동으로 "완료"로 처리됩니다.', 'Customize phases and per-phase schedules. Empty dates fall back to even distribution on the gantt chart. Last phase auto-marks "완료".')}</span>
          </div>

          {/* 단계 리스트 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700">{t('단계 정의', 'Phases')} ({phases.length})</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={distributeEvenly} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded inline-flex items-center" title={t('프로젝트 기간을 단계 수로 균등 분배', 'Distribute evenly')}>
                  <Sparkles size={10} className="mr-0.5" />{t('균등 분배', 'Auto-fill')}
                </button>
                <button type="button" onClick={clearDates} className="text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded inline-flex items-center" title={t('모든 단계 일정 비우기', 'Clear all dates')}>
                  {t('일정 비우기', 'Clear')}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {phases.map((p, idx) => {
                const isCurrent = p.id === currentPhaseId;
                const isLast = idx === phases.length - 1;
                return (
                  <div key={p.id} className={`p-2 rounded-lg border space-y-1.5 ${isCurrent ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-6 text-center shrink-0">#{idx + 1}</span>
                      <input
                        className={`flex-1 text-sm p-1.5 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 ${isCurrent ? 'bg-white' : ''}`}
                        value={p.name}
                        onChange={e => updateName(p.id, e.target.value)}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        {isCurrent && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">현재</span>}
                        {isLast && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">완료</span>}
                        <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)} className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="위로"><ArrowUp size={13} /></button>
                        <button type="button" disabled={idx === phases.length - 1} onClick={() => move(idx, 1)} className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title="아래로"><ArrowDown size={13} /></button>
                        <button type="button" onClick={() => removePhase(p.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title="삭제"><Trash size={11} className="mr-0.5" />삭제</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-8">
                      <div className="flex items-center">
                        <Calendar size={10} className="text-slate-400 mr-1 shrink-0" />
                        <span className="text-[10px] text-slate-500 mr-1 shrink-0">{t('시작', 'Start')}</span>
                        <input type="date" className="flex-1 text-[11px] p-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-500" value={p.startDate || ''} onChange={e => updateDate(p.id, 'startDate', e.target.value)} />
                      </div>
                      <div className="flex items-center">
                        <Calendar size={10} className="text-slate-400 mr-1 shrink-0" />
                        <span className="text-[10px] text-slate-500 mr-1 shrink-0">{t('종료', 'End')}</span>
                        <input type="date" className="flex-1 text-[11px] p-1 border border-slate-200 rounded focus:outline-none focus:border-indigo-500" value={p.endDate || ''} onChange={e => updateDate(p.id, 'endDate', e.target.value)} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 새 단계 추가 */}
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-lg p-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('새 단계 추가 (마지막에 추가됨)', 'Add new phase (at end)')}</label>
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPhase(); } }}
                placeholder={t('예: 시운전, 안정화', 'e.g. Trial run')}
              />
              <button type="button" onClick={addPhase} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg inline-flex items-center"><Plus size={12} className="mr-1" />추가</button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t('Enter 키로 빠르게 추가 — 추가한 후 위/아래 화살표로 순서 조정 가능', 'Press Enter to add. Reorder with arrows.')}</p>
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
          <button type="button" onClick={reset} className="text-xs font-bold text-slate-500 hover:text-slate-700 inline-flex items-center"><RotateCcw size={12} className="mr-1" />{t('표준 8단계로 초기화', 'Reset to default 8')}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">{t('취소', 'Cancel')}</button>
            <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg inline-flex items-center"><Check size={14} className="mr-1" />{t('저장', 'Save')}</button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PhaseEditModal;
