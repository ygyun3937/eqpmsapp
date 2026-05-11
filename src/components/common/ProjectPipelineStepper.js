import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';

// 단계 칩 그룹 — 단계 편집 버튼은 헤더(상위 컨테이너)에 따로 존재하므로 여기선 표시하지 않음.
// 단계가 많아지면 줄바꿈으로 다 보이게 (flex-wrap).
const ProjectPipelineStepper = memo(function ProjectPipelineStepper({ phases, currentPhase, onUpdatePhase, projectId, role }) {
  const list = (phases && phases.length > 0) ? phases : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));

  return (
    <div className="mt-3 flex items-center flex-wrap gap-y-1.5">
      {list.map((step, idx) => (
        <div key={step.id || idx} className="flex items-center">
          <button
            disabled={role === 'CUSTOMER'}
            onClick={(e) => { e.stopPropagation(); onUpdatePhase(projectId, idx); }}
            className={`text-[10px] px-1.5 py-0.5 rounded border transition-all disabled:opacity-80 ${idx < currentPhase ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm hover:bg-indigo-600' : idx === currentPhase ? 'bg-indigo-100 text-indigo-800 border-indigo-400 font-black shadow-sm ring-1 ring-indigo-400' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'}`}>
            {step.name}
          </button>
          {idx < list.length - 1 && <ChevronRight size={11} className={`shrink-0 ${idx < currentPhase ? 'text-indigo-500' : 'text-slate-300'}`} />}
        </div>
      ))}
    </div>
  );
});

export default ProjectPipelineStepper;
