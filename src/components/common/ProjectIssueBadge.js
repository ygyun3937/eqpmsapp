import React, { memo } from 'react';
import { AlertCircle, AlertTriangle, User, X } from 'lucide-react';
import { getStatusColor } from '../../utils/status';

const ProjectIssueBadge = memo(function ProjectIssueBadge({ prjId, projectIssues, openIssueDropdownId, setOpenIssueDropdownId, onIssueClick, isGanttView = false, t }) {
  const isOpen = openIssueDropdownId === prjId;

  if (projectIssues.length === 0) return null;
  const toggleDropdown = (e) => { e.stopPropagation(); setOpenIssueDropdownId(isOpen ? null : prjId); };

  const btnClass = isGanttView
    ? "text-[10px] text-red-600 bg-red-50 inline-flex items-center px-1.5 py-0.5 rounded font-bold border border-red-100 hover:bg-red-100 cursor-pointer"
    : "px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center animate-pulse hover:bg-red-200 transition-colors cursor-pointer";

  return (
    <>
      <button onClick={toggleDropdown} className={btnClass} title={t("클릭하여 미해결 이슈 목록 보기", "Click to view unresolved issues")}>
        <AlertCircle size={10} className="mr-1" />
        {isGanttView ? `${t('이슈', 'Issues')} ${projectIssues.length}${t('건', '')}` : `${t('미해결 이슈', 'Unresolved Issues')} ${projectIssues.length}${t('건', '')}`}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={(e) => { e.stopPropagation(); setOpenIssueDropdownId(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-red-50 shrink-0">
              <h3 className="text-base font-bold text-red-800 flex items-center">
                <AlertTriangle size={18} className="mr-2" />
                {t('연관 미해결 이슈', 'Related Unresolved Issues')}
                <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">{projectIssues.length}{t('건', '')}</span>
              </h3>
              <button onClick={(e) => { e.stopPropagation(); setOpenIssueDropdownId(null); }} className="text-red-400 hover:text-red-600 p-1"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 bg-slate-50">
              <div className="space-y-2">
                {projectIssues.map((issue, idx) => (
                  <div
                    key={`${issue.id}-${idx}`}
                    onClick={(e) => { e.stopPropagation(); onIssueClick(issue); setOpenIssueDropdownId(null); }}
                    className="p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md cursor-pointer transition-all group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-slate-400">{issue.id}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 mb-2">{issue.title}</div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span className="flex items-center"><User size={10} className="mr-1" />{issue.author}</span>
                      <span>{issue.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-white shrink-0">
              <button onClick={(e) => { e.stopPropagation(); setOpenIssueDropdownId(null); }} className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t('닫기', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ProjectIssueBadge;
