import React, { useState, memo } from 'react';
import { X, ListTodo, Plus, Trash, ArrowUp, ArrowDown, AlertTriangle, Check, Calendar, Star, CheckCircle, Sparkles } from 'lucide-react';

const SetupTaskEditModal = memo(function SetupTaskEditModal({ project, onClose, onSubmit, t }) {
  const [tasks, setTasks] = useState(() =>
    (project?.tasks || []).map(tk => ({
      id: tk.id,
      name: tk.name || '',
      startDate: tk.startDate || '',
      endDate: tk.endDate || '',
      isCompleted: !!tk.isCompleted,
      isMilestone: !!tk.isMilestone,
      delayReason: tk.delayReason || ''
    }))
  );
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');

  if (!project) return null;

  const updateField = (id, key, value) => setTasks(tasks.map(tk => tk.id === id ? { ...tk, [key]: value } : tk));
  const toggleField = (id, key) => setTasks(tasks.map(tk => tk.id === id ? { ...tk, [key]: !tk[key] } : tk));
  const addTask = () => {
    setError('');
    if (!newName.trim()) { setError(t('작업명을 입력하세요.', 'Enter task name.')); return; }
    setTasks([...tasks, { id: Date.now(), name: newName.trim(), startDate: '', endDate: '', isCompleted: false, isMilestone: false, delayReason: '' }]);
    setNewName('');
  };
  const removeTask = (id) => setTasks(tasks.filter(tk => tk.id !== id));
  const move = (idx, dir) => {
    const next = idx + dir;
    if (next < 0 || next >= tasks.length) return;
    const arr = tasks.slice();
    [arr[idx], arr[next]] = [arr[next], arr[idx]];
    setTasks(arr);
  };

  // 프로젝트 startDate~dueDate를 작업 수로 균등 분배
  const distributeEvenly = () => {
    setError('');
    if (!project.startDate || !project.dueDate) {
      setError(t('프로젝트 시작/종료일이 없어 자동 분배할 수 없습니다.', 'Project dates missing.'));
      return;
    }
    if (tasks.length === 0) { setError(t('분배할 작업이 없습니다.', 'No tasks to distribute.')); return; }
    const start = new Date(project.startDate);
    const due = new Date(project.dueDate);
    const totalMs = due.getTime() - start.getTime();
    if (totalMs <= 0) { setError(t('프로젝트 종료일이 시작일보다 빠릅니다.', 'Due date precedes start date.')); return; }
    const stepMs = totalMs / tasks.length;
    const fmt = (d) => d.toISOString().split('T')[0];
    const next = tasks.map((tk, i) => {
      const s = new Date(start.getTime() + stepMs * i);
      const e = new Date(start.getTime() + stepMs * (i + 1) - 24 * 60 * 60 * 1000);
      return { ...tk, startDate: fmt(s), endDate: fmt(i === tasks.length - 1 ? due : e) };
    });
    setTasks(next);
  };

  const clearDates = () => setTasks(tasks.map(tk => ({ ...tk, startDate: '', endDate: '' })));

  const handleSave = () => {
    setError('');
    if (tasks.some(tk => !tk.name.trim())) { setError(t('작업명이 비어 있는 항목이 있습니다.', 'Empty task name.')); return; }
    for (const tk of tasks) {
      if (tk.startDate && tk.endDate && new Date(tk.endDate) < new Date(tk.startDate)) {
        setError(t(`"${tk.name}" 작업의 종료일이 시작일보다 빠릅니다.`, `End before start in "${tk.name}".`));
        return;
      }
    }
    onSubmit(project.id, tasks.map(tk => ({
      id: tk.id,
      name: tk.name.trim(),
      startDate: tk.startDate || '',
      endDate: tk.endDate || '',
      isCompleted: !!tk.isCompleted,
      isMilestone: !!tk.isMilestone,
      delayReason: tk.delayReason || ''
    })));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[92vh]">
        <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-blue-50">
          <h2 className="text-lg font-bold flex items-center text-blue-900">
            <ListTodo size={20} className="mr-2 text-blue-600" />
            {t('셋업 일정 편집', 'Edit Setup Tasks')}
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
            <span>{t('셋업 작업의 추가/이름/일정/마일스톤/완료 여부/순서를 한꺼번에 편집합니다. 일정은 비워두면 표시상 "—"로 표시됩니다. 저장 시 변경 내역이 활동 이력에 기록됩니다.', 'Bulk-edit setup task name/schedule/milestone/completion/order. Empty dates show as "—". Changes are logged.')}</span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700">{t('셋업 일정', 'Setup Tasks')} ({tasks.length})</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={distributeEvenly} className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded inline-flex items-center" title={t('프로젝트 기간을 작업 수로 균등 분배', 'Distribute evenly')}>
                  <Sparkles size={10} className="mr-0.5" />{t('균등 분배', 'Auto-fill')}
                </button>
                <button type="button" onClick={clearDates} className="text-[10px] font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded inline-flex items-center" title={t('모든 작업 일정 비우기', 'Clear all dates')}>
                  {t('일정 비우기', 'Clear')}
                </button>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                {t('등록된 셋업 작업이 없습니다. 아래에서 추가하세요.', 'No setup tasks. Add below.')}
              </div>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((tk, idx) => (
                  <div key={tk.id} className={`p-2 rounded-lg border space-y-1.5 ${tk.isCompleted ? 'bg-slate-50/60 border-slate-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-6 text-center shrink-0">#{idx + 1}</span>
                      <button type="button" onClick={() => toggleField(tk.id, 'isCompleted')} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${tk.isCompleted ? 'bg-blue-500 border-blue-500' : 'border-slate-300 hover:border-blue-400'}`} title={tk.isCompleted ? t('완료 취소', 'Uncomplete') : t('완료 처리', 'Complete')}>
                        {tk.isCompleted && <CheckCircle size={14} className="text-white" />}
                      </button>
                      <input
                        className={`flex-1 text-sm p-1.5 border border-slate-200 rounded focus:outline-none focus:border-blue-500 ${tk.isCompleted ? 'text-slate-400 line-through' : ''}`}
                        value={tk.name}
                        onChange={e => updateField(tk.id, 'name', e.target.value)}
                        placeholder={t('작업명', 'Task name')}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => toggleField(tk.id, 'isMilestone')} className={`inline-flex items-center px-1.5 py-1 rounded text-[10px] font-bold border transition-colors ${tk.isMilestone ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200'}`} title={t('마일스톤', 'Milestone')}>
                          <Star size={11} className={`mr-0.5 ${tk.isMilestone ? 'fill-rose-500 text-rose-500' : ''}`} />{t('마일스톤', 'Milestone')}
                        </button>
                        <button type="button" disabled={idx === 0} onClick={() => move(idx, -1)} className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('위로', 'Up')}><ArrowUp size={13} /></button>
                        <button type="button" disabled={idx === tasks.length - 1} onClick={() => move(idx, 1)} className="inline-flex items-center justify-center w-6 h-6 rounded bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('아래로', 'Down')}><ArrowDown size={13} /></button>
                        <button type="button" onClick={() => removeTask(tk.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}><Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pl-14">
                      <div className="flex items-center">
                        <Calendar size={10} className="text-slate-400 mr-1 shrink-0" />
                        <span className="text-[10px] text-slate-500 mr-1 shrink-0">{t('시작', 'Start')}</span>
                        <input type="date" max="9999-12-31" className="flex-1 text-[11px] p-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500" value={tk.startDate || ''} onChange={e => updateField(tk.id, 'startDate', e.target.value)} />
                      </div>
                      <div className="flex items-center">
                        <Calendar size={10} className="text-slate-400 mr-1 shrink-0" />
                        <span className="text-[10px] text-slate-500 mr-1 shrink-0">{t('종료', 'End')}</span>
                        <input type="date" max="9999-12-31" className="flex-1 text-[11px] p-1 border border-slate-200 rounded focus:outline-none focus:border-blue-500" value={tk.endDate || ''} onChange={e => updateField(tk.id, 'endDate', e.target.value)} />
                      </div>
                    </div>
                    {!tk.isCompleted && (
                      <div className="pl-14">
                        <input
                          type="text"
                          className="w-full text-[11px] p-1 border border-slate-200 rounded bg-slate-50 text-slate-600 focus:outline-none focus:border-blue-400 focus:bg-white placeholder-slate-300"
                          placeholder={t('지연 사유·메모 (선택)', 'Delay reason / note (optional)')}
                          value={tk.delayReason || ''}
                          onChange={e => updateField(tk.id, 'delayReason', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border-2 border-dashed border-slate-200 rounded-lg p-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">{t('새 작업 추가 (마지막에 추가됨)', 'Add new task (at end)')}</label>
            <div className="flex gap-2">
              <input
                className="flex-1 text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
                placeholder={t('예: 국내 Turn on, I/O 테스트', 'e.g. Domestic Turn-on')}
              />
              <button type="button" onClick={addTask} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg inline-flex items-center"><Plus size={12} className="mr-1" />{t('추가', 'Add')}</button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t('Enter 키로 빠르게 추가 — 추가한 후 위/아래 화살표로 순서 조정 가능', 'Press Enter to add. Reorder with arrows.')}</p>
          </div>

          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded">{error}</p>}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end items-center gap-2 shrink-0 bg-slate-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg">{t('취소', 'Cancel')}</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center"><Check size={14} className="mr-1" />{t('저장', 'Save')}</button>
        </div>
      </div>
    </div>
  );
});

export default SetupTaskEditModal;
