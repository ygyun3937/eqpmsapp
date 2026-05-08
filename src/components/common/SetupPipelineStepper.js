import React, { memo } from 'react';
import { ChevronRight, Settings, Star } from 'lucide-react';

// 셋업 일정용 stepper — ProjectPipelineStepper와 동일 동작.
// 클릭한 작업이 "현재"가 되고, 그 앞의 모든 작업은 자동 완료, 그 뒤는 미완료.
const SetupPipelineStepper = memo(function SetupPipelineStepper({ tasks, onSetCurrentSetupTask, projectId, role, onEditSetupTasks }) {
  const list = tasks || [];
  const canEditDefinitions = role === 'ADMIN' || role === 'PM';
  // 현재 작업 인덱스 = 완료되지 않은 첫 작업 (모두 완료면 마지막)
  const currentIdx = (() => {
    const firstIncomplete = list.findIndex(tk => !tk.isCompleted);
    if (firstIncomplete < 0) return list.length - 1;
    return firstIncomplete;
  })();

  if (list.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-2">
        등록된 셋업 작업이 없습니다.
        {canEditDefinitions && onEditSetupTasks && (
          <button type="button" onClick={(e) => { e.stopPropagation(); onEditSetupTasks(projectId); }} className="ml-2 inline-flex items-center text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded">
            <Settings size={11} className="mr-0.5" />셋업 일정 편집
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto mt-3 -mx-1 px-1 pb-1">
      <div className="flex items-center flex-nowrap whitespace-nowrap w-max">
        {list.map((tk, idx) => {
          const isPast = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          return (
            <div key={tk.id || idx} className="flex items-center shrink-0">
              <button
                disabled={role === 'CUSTOMER'}
                onClick={(e) => { e.stopPropagation(); if (onSetCurrentSetupTask) onSetCurrentSetupTask(projectId, tk.id); }}
                title="이 작업을 현재로 설정 (이전 작업은 자동 완료)"
                className={`text-[10px] px-1.5 py-0.5 rounded border transition-all disabled:opacity-80 shrink-0 inline-flex items-center ${isPast ? 'bg-blue-500 text-white border-blue-600 shadow-sm hover:bg-blue-600' : isCurrent ? 'bg-blue-100 text-blue-800 border-blue-400 font-black shadow-sm ring-1 ring-blue-400' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'}`}>
                {tk.isMilestone && <Star size={9} className={`mr-0.5 ${isPast ? 'fill-white text-white' : 'fill-rose-500 text-rose-500'}`} />}
                {tk.name}
              </button>
              {idx < list.length - 1 && <ChevronRight size={11} className={`mx-0 shrink-0 ${isPast ? 'text-blue-500' : 'text-slate-300'}`} />}
            </div>
          );
        })}
        {canEditDefinitions && onEditSetupTasks && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditSetupTasks(projectId); }}
            className="ml-1.5 shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-white text-slate-500 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors flex items-center"
            title="셋업 일정 편집"
          >
            <Settings size={11} className="mr-0.5" />셋업 편집
          </button>
        )}
      </div>
    </div>
  );
});

export default SetupPipelineStepper;
