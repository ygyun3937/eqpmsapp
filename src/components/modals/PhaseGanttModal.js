import React, { memo, useState, useMemo } from 'react';
import { X, CalendarDays, ListTodo, AlertCircle } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import { fmtYMD } from '../../utils/calc';

const PHASE_COLORS = [
  'bg-slate-400',
  'bg-blue-400',
  'bg-cyan-400',
  'bg-indigo-400',
  'bg-amber-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-emerald-400',
];

const PHASE_BG = [
  'bg-slate-50 border-slate-200',
  'bg-blue-50 border-blue-200',
  'bg-cyan-50 border-cyan-200',
  'bg-indigo-50 border-indigo-200',
  'bg-amber-50 border-amber-200',
  'bg-purple-50 border-purple-200',
  'bg-pink-50 border-pink-200',
  'bg-emerald-50 border-emerald-200',
];

const DAY_MS = 1000 * 60 * 60 * 24;
const toDate = (v) => {
  const ymd = fmtYMD(v);
  if (!ymd) return null;
  const d = new Date(ymd);
  return isNaN(d.getTime()) ? null : d;
};

const PhaseGanttModal = memo(function PhaseGanttModal({ project, onClose, t }) {
  const [tab, setTab] = useState('phase');

  const phaseDefs = useMemo(() => (
    (project?.phases && project.phases.length > 0)
      ? project.phases
      : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name, startDate: '', endDate: '' }))
  ), [project]);

  const projStart = useMemo(() => toDate(project?.startDate), [project]);
  const projDue = useMemo(() => toDate(project?.dueDate), [project]);

  // 단계 일정: 명시적 일정이 있으면 그대로, 없고 프로젝트 기간이 있으면 균등 분배, 둘 다 없으면 null
  const phaseSchedules = useMemo(() => {
    const totalDays = (projStart && projDue) ? (projDue - projStart) / DAY_MS : 0;
    const daysPerPhase = phaseDefs.length > 0 ? totalDays / phaseDefs.length : 0;
    return phaseDefs.map((p, idx) => {
      const s = toDate(p.startDate);
      const e = toDate(p.endDate);
      if (s && e) return { name: p.name, start: s, end: e, custom: true };
      if (projStart && totalDays > 0) {
        const start = new Date(projStart.getTime() + daysPerPhase * idx * DAY_MS);
        const end = new Date(projStart.getTime() + daysPerPhase * (idx + 1) * DAY_MS);
        return { name: p.name, start, end, custom: false };
      }
      return { name: p.name, start: null, end: null, custom: false };
    });
  }, [phaseDefs, projStart, projDue]);

  // 셋업 일정: project.tasks에서 startDate/endDate 모두 있는 항목만 표시
  const setupSchedules = useMemo(() => {
    return (project?.tasks || []).map((tk, idx) => {
      const s = toDate(tk.startDate);
      const e = toDate(tk.endDate);
      return { name: tk.name || `Step ${idx + 1}`, start: s, end: e, isCompleted: !!tk.isCompleted, hasSchedule: !!(s && e) };
    });
  }, [project]);

  const currentPhase = typeof project?.phaseIndex === 'number' ? project.phaseIndex : 0;

  // 차트 표시 범위 계산 — 현재 탭에 따라 다름
  const range = useMemo(() => {
    const list = tab === 'phase' ? phaseSchedules : setupSchedules.filter(s => s.hasSchedule);
    const starts = list.map(s => s.start && s.start.getTime()).filter(v => typeof v === 'number');
    const ends = list.map(s => s.end && s.end.getTime()).filter(v => typeof v === 'number');
    if (projStart) starts.push(projStart.getTime());
    if (projDue) ends.push(projDue.getTime());
    if (starts.length === 0 || ends.length === 0) return null;
    const minDate = new Date(Math.min(...starts));
    minDate.setDate(1);
    const maxDate = new Date(Math.max(...ends));
    maxDate.setMonth(maxDate.getMonth() + 1, 0);
    const fullDays = (maxDate - minDate) / DAY_MS;
    if (!isFinite(fullDays) || fullDays <= 0) return null;
    return { minDate, maxDate, fullDays };
  }, [tab, phaseSchedules, setupSchedules, projStart, projDue]);

  const months = useMemo(() => {
    if (!range) return [];
    const out = [];
    const cursor = new Date(range.minDate);
    while (cursor <= range.maxDate) {
      const pos = ((cursor - range.minDate) / DAY_MS / range.fullDays) * 100;
      out.push({ label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`, pos });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }, [range]);

  const todayPercent = useMemo(() => {
    if (!range) return null;
    const t0 = new Date();
    return Math.max(0, Math.min(100, ((t0 - range.minDate) / DAY_MS / range.fullDays) * 100));
  }, [range]);

  if (!project) return null;

  const colorAt = (i) => PHASE_COLORS[i % PHASE_COLORS.length];
  const bgAt = (i) => PHASE_BG[i % PHASE_BG.length];

  const customCount = phaseSchedules.filter(s => s.custom).length;
  const setupWithSchedule = setupSchedules.filter(s => s.hasSchedule).length;

  const renderEmpty = (msg) => (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <AlertCircle size={36} className="mb-2 text-slate-300" />
      <p className="text-sm font-medium">{msg}</p>
    </div>
  );

  const renderBars = (list, options = {}) => {
    if (!range) return null;
    const { minDate, fullDays } = range;
    return (
      <div className="space-y-2 pt-3">
        {list.map((sch, idx) => {
          if (!sch.start || !sch.end) {
            return (
              <div key={idx} className="flex items-center h-12">
                <div className="w-[200px] shrink-0 pr-3">
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-2 shrink-0 bg-slate-200"></span>
                    <span className="text-xs font-bold text-slate-400">{sch.name}</span>
                  </div>
                  <div className="text-[10px] text-amber-600 ml-5 mt-0.5">{t('일정 미정', 'No schedule')}</div>
                </div>
                <div className="flex-1 relative h-full flex items-center">
                  <div className="text-[10px] text-slate-300 italic ml-2">{t('일정이 지정되지 않은 항목', 'Item without schedule')}</div>
                </div>
              </div>
            );
          }
          const leftPercent = ((sch.start - minDate) / DAY_MS / fullDays) * 100;
          const widthPercent = ((sch.end - sch.start) / DAY_MS / fullDays) * 100;

          const isPast = options.mode === 'phase' ? idx < currentPhase : !!sch.isCompleted;
          const isCurrent = options.mode === 'phase' ? idx === currentPhase : false;

          return (
            <div key={idx} className="flex items-center h-12">
              <div className="w-[200px] shrink-0 pr-3">
                <div className="flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2 shrink-0 ${isPast ? 'bg-emerald-500' : isCurrent ? colorAt(idx) : 'bg-slate-200'}`}></span>
                  <span className={`text-xs font-bold ${isPast ? 'text-slate-400 line-through' : isCurrent ? 'text-indigo-700' : 'text-slate-500'}`}>{sch.name}</span>
                  {isCurrent && <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200 animate-pulse">{t('진행중', 'Active')}</span>}
                  {options.mode === 'phase' && sch.custom && <span className="ml-1 text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded font-bold border border-amber-200" title={t('일정 직접 지정됨', 'Custom schedule')}>{t('지정', 'set')}</span>}
                  {options.mode === 'setup' && sch.isCompleted && <span className="ml-1 text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded font-bold border border-emerald-200">{t('완료', 'Done')}</span>}
                </div>
                <div className="text-[10px] text-slate-400 ml-5 mt-0.5">
                  {fmtYMD(sch.start)} ~ {fmtYMD(sch.end)}
                </div>
              </div>

              <div className="flex-1 relative h-full flex items-center">
                {months.map((m, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${m.pos}%` }}></div>
                ))}
                <div
                  className={`absolute h-7 rounded-md border overflow-hidden transition-all ${isPast ? 'bg-emerald-50 border-emerald-200' : isCurrent ? `${bgAt(idx)}` : 'bg-slate-50 border-slate-200'}`}
                  style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 0.5)}%` }}
                >
                  <div className={`h-full ${isPast ? 'bg-emerald-400' : isCurrent ? colorAt(idx) + ' opacity-70' : 'bg-slate-200'}`} style={{ width: isPast ? '100%' : isCurrent ? '50%' : '0%' }}></div>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-600 whitespace-nowrap">{sch.name}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const phaseHasAnySchedule = phaseSchedules.some(s => s.start && s.end);
  const setupHasAnySchedule = setupSchedules.some(s => s.hasSchedule);

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-indigo-800 flex items-center"><CalendarDays size={20} className="mr-2" />{t('간트 차트', 'Gantt Chart')}</h2>
            <p className="text-xs text-indigo-600 mt-0.5">
              {project.name} ({fmtYMD(project.startDate) || t('미정', 'TBD')} ~ {fmtYMD(project.dueDate) || t('미정', 'TBD')})
            </p>
          </div>
          <button onClick={onClose} className="text-indigo-400 hover:text-indigo-600 p-2"><X size={20} /></button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setTab('phase')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === 'phase' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <CalendarDays size={14} />{t('단계별', 'Phases')}
            <span className="text-[10px] text-slate-400 font-medium ml-1">({phaseSchedules.length})</span>
          </button>
          <button
            onClick={() => setTab('setup')}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold border-b-2 transition-colors ${tab === 'setup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            <ListTodo size={14} />{t('셋업 일정', 'Setup Tasks')}
            <span className="text-[10px] text-slate-400 font-medium ml-1">({setupWithSchedule}/{setupSchedules.length})</span>
          </button>
          <div className="ml-auto px-5 py-2.5 text-[10px] text-slate-400 self-center">
            {tab === 'phase' ? (
              customCount > 0
                ? t(`단계 일정 ${customCount}/${phaseSchedules.length} 직접 지정됨`, `${customCount}/${phaseSchedules.length} phases scheduled`)
                : (projStart && projDue ? t('단계 일정 미지정 — 균등 분배 표시', 'No phase schedules — even split') : t('프로젝트 일정 미정', 'Project schedule TBD'))
            ) : (
              setupSchedules.length === 0
                ? t('셋업 일정 없음', 'No setup tasks')
                : t(`${setupWithSchedule}/${setupSchedules.length} 항목 일정 지정됨`, `${setupWithSchedule}/${setupSchedules.length} scheduled`)
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {tab === 'phase' && !phaseHasAnySchedule && renderEmpty(t('표시할 단계 일정이 없습니다. 프로젝트 시작일/납기일을 입력하거나 단계 편집에서 일정을 지정하세요.', 'No phase schedule to show. Set project dates or define phase schedules.'))}
          {tab === 'setup' && !setupHasAnySchedule && renderEmpty(t('셋업 일정이 등록되지 않았습니다. 셋업 일정 탭에서 시작일/종료일을 입력하세요.', 'No setup task schedule. Set start/end dates on setup tasks.'))}

          {((tab === 'phase' && phaseHasAnySchedule) || (tab === 'setup' && setupHasAnySchedule)) && range && (
            <div className="overflow-x-auto">
              <div className="min-w-[700px] relative">
                {/* 월별 헤더 */}
                <div className="flex h-8 border-b border-slate-200 relative ml-[200px]">
                  {months.map((m, i) => (
                    <div key={i} className="absolute text-[10px] font-bold text-slate-500 border-l border-slate-200 pl-1 h-full flex items-end pb-1" style={{ left: `${m.pos}%` }}>{m.label}</div>
                  ))}
                </div>

                {/* 오늘선 */}
                {todayPercent !== null && (
                  <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `calc(200px + ${todayPercent}% * (100% - 200px) / 100%)` }}>
                    <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{t('오늘', 'Today')}</div>
                  </div>
                )}

                {tab === 'phase' && renderBars(phaseSchedules, { mode: 'phase' })}
                {tab === 'setup' && renderBars(setupSchedules, { mode: 'setup' })}

                {/* 범례 */}
                <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-100 space-x-4 text-[10px] text-slate-500 flex-wrap gap-y-1">
                  <div className="flex items-center"><span className="w-3 h-2 rounded-sm bg-emerald-400 mr-1"></span>{tab === 'phase' ? t('완료된 단계', 'Completed') : t('완료된 작업', 'Completed task')}</div>
                  {tab === 'phase' && <div className="flex items-center"><span className="w-3 h-2 rounded-sm bg-indigo-400 mr-1"></span>{t('현재 단계', 'Current')}</div>}
                  <div className="flex items-center"><span className="w-3 h-2 rounded-sm bg-slate-200 mr-1"></span>{t('예정', 'Planned')}</div>
                  <div className="flex items-center"><span className="w-px h-3 bg-red-400 mr-1"></span>{t('오늘', 'Today')}</div>
                  {tab === 'phase' && <div className="flex items-center"><span className="text-amber-700 font-bold mr-0.5">지정</span>{t('= 일정 직접 지정', '= custom schedule')}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-white shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{t('닫기', 'Close')}</button>
        </div>
      </div>
    </div>
  );
});

export default PhaseGanttModal;
