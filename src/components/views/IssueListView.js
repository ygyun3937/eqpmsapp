import React, { memo } from 'react';
import { Plus, Kanban, User, Trash, MessageCircle } from 'lucide-react';

const IssueListView = memo(function IssueListView({ issues, getStatusColor, onAddClick, onIssueClick, onDeleteIssue, currentUser, t }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold">{t('이슈 및 펀치 관리', 'Issues & Punches')}</h1></div>
        {currentUser.role !== 'CUSTOMER' && (
          <button onClick={onAddClick} className="flex items-center bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
            <Plus size={16} className="mr-1" /> {t('현장 이슈 등록', 'Report Issue')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {issues.map((issue) => (
          <div key={issue.id} onClick={() => onIssueClick(issue)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between cursor-pointer group hover:border-blue-300 transition-colors">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xs font-bold text-slate-500">{issue.id}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(issue.status)}`}>{issue.status}</span>
              </div>
              <div className="flex items-center">
                {issue.photo && <img src={issue.photo} className="w-10 h-10 rounded mr-3 object-cover border border-slate-200" alt="이슈" />}
                <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{issue.title}</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center"><Kanban size={14} className="mr-1.5" /> {issue.projectName}</p>
            </div>
            <div className="flex flex-col items-end mt-4 md:mt-0">
              <div className="text-sm mb-1 flex items-center justify-end">
                {t('작성자', 'Author')}: {issue.author}
                {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteIssue(issue); }} className="text-slate-300 hover:text-red-500 ml-4 transition-colors"><Trash size={16} /></button>
                )}
              </div>
              <div className="text-sm text-slate-500 mt-1 flex items-center">
                {issue.date}
                <div className="flex items-center ml-3 text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full"><MessageCircle size={14} className="mr-1" /><span className="font-bold">{issue.comments?.length || 0}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default IssueListView;
