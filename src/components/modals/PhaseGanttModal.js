import React, { memo } from 'react';
import { X, CalendarDays } from 'lucide-react';
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

const PhaseGanttModal = memo(function PhaseGanttModal({ project, onClose, t }) {
  if (!project) return null;

  // project.phases (커스텀) 우선, 없으면 PROJECT_PHASES 폴백
  const phaseDefs = (project.phases && project.phases.length > 0)
    ? project.phases
    : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name, startDate: '', endDate: '' }));

  const projStart = new Date(project.startDate);
  const projDue = new Date(project.dueDate);
  const totalDays = (projDue - projStart) / (1000 * 60 * 60 * 24);
  const phaseCount = phaseDefs.length;
  const daysPerPhase = totalDays / phaseCount;

  const currentPhase = typeof project.phaseIndex === 'number' ? project.phaseIndex : 0;

  // 각 단계의 실제 일정 결정 (있으면 사용, 없으면 균등 배분)
  const phaseSchedules = phaseDefs.map((p, idx) => {
    if (p.startDate && p.endDate) {
      return { name: p.name, start: new Date(p.startDate), end: new Date(p.endDate), custom: true };
    }
    const s = new Date(projStart.getTime() + daysPerPhase * idx * 24 * 60 * 60 * 1000);
    const e = new Date(projStart.getTime() + daysPerPhase * (idx + 1) * 24 * 60 * 60 * 1000);
    return { name: p.name, start: s, end: e, custom: false };
  });

  // 차트 표시 범위: 프로젝트 기간 + 단계 일정이 더 넓으면 확장
  const allStarts = phaseSchedules.map(s => s.start.getTime()).concat(projStart.getTime());
  const allEnds = phaseSchedules.map(s => s.end.getTime()).concat(projDue.getTime());
  const minDate = new Date(Math.min(...allStarts));
  minDate.setDate(1);
  const maxDate = new Date(Math.max(...allEnds));
  maxDate.setMonth(maxDate.getMonth() + 1, 0);
  const fullDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);

  const months = [];
  const cursor = new Date(minDate);
  while (cursor <= maxDate) {
    const pos = ((cursor - minDate) / (1000 * 60 * 60 * 24) / fullDays) * 100;
    months.push({ label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`, pos });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const today = new Date();
  const todayPercent = Math.max(0, Math.min(100, ((today - minDate) / (1000 * 60 * 60 * 24) / fullDays) * 100));

  const colorAt = (i) => PHASE_COLORS[i % PHASE_COLORS.length];
  const bgAt = (i) => PHASE_BG[i % PHASE_BG.length];

  const customCount = phaseSchedules.filter(s => s.custom).length;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-indigo-800 flex items-center"><CalendarDays size={20} className="mr-2" />{t('단계별 간트 차트', 'Phase Gantt Chart')}</h2>
            <p className="text-xs text-indigo-600 mt-0.5">
              {project.name} ({fmtYMD(project.startDate) || '미정'} ~ {fmtYMD(project.dueDate) || '미정'})
              <span className="ml-2 text-[10px] text-indigo-500">
                {customCount > 0
                  ? t(`단계 일정 ${customCount}/${phaseCount} 직접 지정됨`, `${customCount}/${phaseCount} phases scheduled`)
                  : t('단계 일정 미지정 — 균등 분배 표시 (단계 편집에서 지정 가능)', 'No phase schedules — even split (set in Edit Phases)')}
              </span>
            </p>
          </div>
          <button onClick={onClose} className="text-indigo-400 hover:text-indigo-600 p-2"><X size={20} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="overflow-x-auto">
            <div className="min-w-[700px] relative">

              {/* 월별 헤더 */}
              <div className="flex h-8 border-b border-slate-200 relative ml-[200px]">
                {months.map((m, i) => (
                  <div key={i} className="absolute text-[10px] font-bold text-slate-500 border-l border-slate-200 pl-1 h-full flex items-end pb-1" style={{ left: `${m.pos}%` }}>{m.label}</div>
                ))}
              </div>

              {/* 오늘선 */}
              <div className="absolute top-0 bottom-0 w-px bg-red-400 z-10" style={{ left: `calc(200px + ${todayPercent}% * (100% - 200px) / 100%)` }}>
                <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{t('오늘', 'Today')}</div>
              </div>

              {/* 단계별 바 */}
              <div className="space-y-2 pt-3">
                {phaseSchedules.map((sch, idx) => {
                  const leftPercent = ((sch.start - minDate) / (1000 * 60 * 60 * 24) / fullDays) * 100;
                  const widthPercent = ((sch.end - sch.start) / (1000 * 60 * 60 * 24) / fullDays) * 100;

                  const isPast = idx < currentPhase;
                  const isCurrent = idx === currentPhase;

                  return (
                    <div key={idx} className="flex items-center h-12">
                      {/* 단계명 */}
                      <div className="w-[200px] shrink-0 pr-3">
                        <div className="flex items-center">
                          <span className={`w-3 h-3 rounded-full mr-2 shrink-0 ${isPast ? 'bg-emerald-500' : isCurrent ? colorAt(idx) : 'bg-slate-200'}`}></span>
                          <span className={`text-xs font-bold ${isPast ? 'text-slate-400 line-through' : isCurrent ? 'text-indigo-700' : 'text-slate-500'}`}>{sch.name}</span>
                          {isCurrent && <span className="ml-2 text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200 animate-pulse">{t('진행중', 'Active')}</span>}
                          {sch.custom && <span className="ml-1 text-[9px] bg-amber-50 text-amber-700 px-1 py-0.5 rounded font-bold border border-amber-200" title={t('일정 직접 지정됨', 'Custom schedule')}>{t('지정', 'set')}</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 ml-5 mt-0.5">
                          {sch.start.toISOString().split('T')[0]} ~ {sch.end.toISOString().split('T')[0]}
                        </div>
                      </div>

                      {/* 간트 바 */}
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

              {/* 범례 */}
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-slate-100 space-x-4 text-[10px] text-slate-500">
                <div className="flex items-center"><span className="w-3 h-2 rounded-sm bg-emerald-400 mr-1"></span>{t('완료된 단계', 'Completed')}</div>
                <div className="flex items-center"><span className="w-3 h-2 rounded-sm bg-indigo-400 mr-1"></span>{t('현재 단계', 'Current')}</div>
                <div className="flex items-center"><span className="w-3 h-2 rounded-sm bg-slate-200 mr-1"></span>{t('예정 단계', 'Planned')}</div>
                <div className="flex items-center"><span className="w-px h-3 bg-red-400 mr-1"></span>{t('오늘', 'Today')}</div>
                <div className="flex items-center"><span className="text-amber-700 font-bold mr-0.5">지정</span>{t('= 일정 직접 지정', '= custom schedule')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-white shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{t('닫기', 'Close')}</button>
        </div>
      </div>
    </div>
  );
});

export default PhaseGanttModal;
