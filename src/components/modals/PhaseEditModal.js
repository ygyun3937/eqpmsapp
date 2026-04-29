import React, { useState, memo } from 'react';
import { X, Settings, Plus, Trash, ArrowUp, ArrowDown, RotateCcw, AlertTriangle, Info, Check } from 'lucide-react';
import { PROJECT_PHASES, DOMAIN_VERSION_CATEGORIES } from '../../constants';

const PhaseEditModal = memo(function PhaseEditModal({ project, onClose, onSubmit, t }) {
  const [phases, setPhases] = useState(() => {
    if (project && project.phases && project.phases.length > 0) {
      return project.phases.map(p => ({ ...p }));
    }
    return PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
  });
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  if (!project) return null;

  const updateName = (id, name) => setPhases(phases.map(p => p.id === id ? { ...p, name } : p));
  const addPhase = () => {
    setError('');
    if (!newName.trim()) { setError(t('단계 이름을 입력하세요.', 'Enter step name.')); return; }
    if (phases.some(p => p.name === newName.trim())) { setError(t('이미 동일한 이름의 단계가 있습니다.', 'Duplicate name.')); return; }
    setPhases([...phases, { id: `p${Date.now()}`, name: newName.trim() }]);
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
    setPhases(PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name })));
    setError('');
  };

  const handleSave = () => {
    setError('');
    if (phases.length < 2) { setError(t('단계는 최소 2개 이상이어야 합니다.', 'At least 2 phases.')); return; }
    if (phases.some(p => !p.name.trim())) { setError(t('단계 이름이 비어 있습니다.', 'Empty name.')); return; }
    onSubmit(project.id, phases.map(p => ({ id: p.id, name: p.name.trim() })));
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
            <span>{t('이 프로젝트의 단계 구성을 자유롭게 편집합니다. 마지막 단계는 자동으로 "완료"로 처리됩니다 (단계 변경 시 status가 "완료"로 전환).', 'Customize phases for this project. Last phase auto-marks status as "완료".')}</span>
          </div>

          {/* 단계 리스트 */}
          <div>
            <p className="text-xs font-bold text-slate-700 mb-2">{t('단계 정의', 'Phases')} ({phases.length})</p>
            <div className="space-y-1.5">
              {phases.map((p, idx) => {
                const isCurrent = p.id === currentPhaseId;
                const isLast = idx === phases.length - 1;
                return (
                  <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg border ${isCurrent ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-white border-slate-200'}`}>
                    <span className="text-[10px] font-bold text-slate-400 w-6 text-center shrink-0">#{idx + 1}</span>
                    <input
                      className={`flex-1 text-sm p-1.5 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 ${isCurrent ? 'bg-white' : ''}`}
                      value={p.name}
                      onChange={e => updateName(p.id, e.target.value)}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isCurrent && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded mr-1">현재</span>}
                      {isLast && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded mr-1">완료</span>}
                      <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)} className="text-slate-400 hover:text-indigo-600 p-1 disabled:opacity-30" title="위로"><ArrowUp size={12} /></button>
                      <button type="button" disabled={idx === phases.length - 1} onClick={() => move(idx, 1)} className="text-slate-400 hover:text-indigo-600 p-1 disabled:opacity-30" title="아래로"><ArrowDown size={12} /></button>
                      <button type="button" onClick={() => removePhase(p.id)} className="text-slate-300 hover:text-red-500 p-1" title="삭제"><Trash size={12} /></button>
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
