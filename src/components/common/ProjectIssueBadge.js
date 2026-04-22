import React, { memo } from 'react';
import { AlertCircle, AlertTriangle, User, X } from 'lucide-react';
import { getStatusColor } from '../../utils/status';

const ProjectIssueBadge = memo(function ProjectIssueBadge({ prjId, projectIssues, openIssueDropdownId, setOpenIssueDropdownId, onIssueClick, isGanttView = false, t }) {
  if (projectIssues.length === 0) return null;
  const isOpen = openIssueDropdownId === prjId;
  const toggleDropdown = (e) => { e.stopPropagation(); setOpenIssueDropdownId(isOpen ? null : prjId); };

  const btnClass = isGanttView
    ? "text-[10px] text-red-600 bg-red-50 inline-flex items-center px-1.5 py-0.5 rounded font-bold border border-red-100 hover:bg-red-100 cursor-pointer relative z-10"
    : "px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center animate-pulse hover:bg-red-200 transition-colors cursor-pointer relative z-10";

  return (
    <div className="relative">
      <button onClick={toggleDropdown} className={btnClass} title={t("클릭하여 미해결 이슈 목록 보기", "Click to view unresolved issues")}>
        <AlertCircle size={10} className="mr-1" />
        {isGanttView ? `${t('이슈', 'Issues')} ${projectIssues.length}${t('건', '')}` : `${t('미해결 이슈', 'Unresolved Issues')} ${projectIssues.length}${t('건', '')}`}
      </button>

      {isOpen && (
        <React.Fragment>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenIssueDropdownId(null); }}></div>
          <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden" style={{minWidth: '250px'}}>
            <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-xs font-bold text-slate-700 flex items-center">
                <AlertTriangle size={12} className="text-red-500 mr-1.5" /> {t('연관 미해결 이슈', 'Related Unresolved Issues')}
              </span>
              <X size={14} className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={(e) => { e.stopPropagation(); setOpenIssueDropdownId(null); }} />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {projectIssues.map((issue, idx) => (
                <div
                  key={`${issue.id}-${idx}`}
                  onClick={(e) => { e.stopPropagation(); onIssueClick(issue); setOpenIssueDropdownId(null); }}
                  className="px-3 py-2 border-b border-slate-50 hover:bg-blue-50 cursor-pointer text-xs group transition-colors"
                >
                  <div className="font-bold text-slate-800 group-hover:text-blue-600 truncate mb-1">{issue.title}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px] flex items-center">
                      <User size={10} className="mr-0.5"/>{issue.author}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
});

export default ProjectIssueBadge;
