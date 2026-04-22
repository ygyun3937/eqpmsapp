import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';

const ProjectPipelineStepper = memo(function ProjectPipelineStepper({ currentPhase, onUpdatePhase, projectId, role }) {
  return (
    <div className="flex items-center flex-wrap gap-y-1 mt-3">
      {PROJECT_PHASES.map((step, idx) => (
        <div key={step} className="flex items-center">
          <button
            disabled={role === 'CUSTOMER'}
            onClick={(e) => { e.stopPropagation(); onUpdatePhase(projectId, idx); }}
            className={`text-[10px] px-2 py-1 rounded border transition-all disabled:opacity-80 ${idx < currentPhase ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm hover:bg-indigo-600' : idx === currentPhase ? 'bg-indigo-100 text-indigo-800 border-indigo-400 font-black shadow-sm ring-1 ring-indigo-400' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'}`}>
            {step}
          </button>
          {idx < PROJECT_PHASES.length - 1 && <ChevronRight size={12} className={`mx-0.5 ${idx < currentPhase ? 'text-indigo-500' : 'text-slate-300'}`} />}
        </div>
      ))}
    </div>
  );
});

export default ProjectPipelineStepper;
