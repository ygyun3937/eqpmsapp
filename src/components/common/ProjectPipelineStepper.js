import React, { memo } from 'react';
import { ChevronRight, Settings } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';

const ProjectPipelineStepper = memo(function ProjectPipelineStepper({ phases, currentPhase, onUpdatePhase, projectId, role, onEditPhases }) {
  // phases가 없으면 전사 기본 8단계
  const list = (phases && phases.length > 0) ? phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
  const canEditDefinitions = role === 'ADMIN' || role === 'PM';

  return (
    <div className="overflow-x-auto mt-3 -mx-1 px-1 pb-1">
      <div className="flex items-center flex-nowrap whitespace-nowrap w-max">
        {list.map((step, idx) => (
          <div key={step.id || idx} className="flex items-center shrink-0">
            <button
              disabled={role === 'CUSTOMER'}
              onClick={(e) => { e.stopPropagation(); onUpdatePhase(projectId, idx); }}
              className={`text-[10px] px-1.5 py-0.5 rounded border transition-all disabled:opacity-80 shrink-0 ${idx < currentPhase ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm hover:bg-indigo-600' : idx === currentPhase ? 'bg-indigo-100 text-indigo-800 border-indigo-400 font-black shadow-sm ring-1 ring-indigo-400' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'}`}>
              {step.name}
            </button>
            {idx < list.length - 1 && <ChevronRight size={11} className={`mx-0 shrink-0 ${idx < currentPhase ? 'text-indigo-500' : 'text-slate-300'}`} />}
          </div>
        ))}
        {canEditDefinitions && onEditPhases && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditPhases(projectId); }}
            className="ml-1.5 shrink-0 text-[10px] px-1.5 py-0.5 rounded border bg-white text-slate-500 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors flex items-center"
            title="단계 정의 수정"
          >
            <Settings size={11} className="mr-0.5" />단계 편집
          </button>
        )}
      </div>
    </div>
  );
});

export default ProjectPipelineStepper;
