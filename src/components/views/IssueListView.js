import React, { memo, useMemo } from 'react';
import { Plus, Kanban, User, Trash, MessageCircle, Download } from 'lucide-react';
import { exportToExcel } from '../../utils/export';

const IssueListView = memo(function IssueListView({ issues, getStatusColor, onAddClick, onIssueClick, onDeleteIssue, currentUser, t }) {
  const visibleIssues = useMemo(() => {
    if (currentUser.role === 'CUSTOMER') {
      const allowed = Array.isArray(currentUser.assignedProjectIds) ? currentUser.assignedProjectIds : [];
      return (issues || []).filter(i => allowed.includes(i.projectId));
    }
    return issues || [];
  }, [issues, currentUser]);

  const handleExport = () => {
    exportToExcel('이슈_리스트', [{
      name: '이슈 리스트',
      rows: visibleIssues.map(i => ({
        id: i.id, projectName: i.projectName, title: i.title, severity: i.severity, status: i.status,
        author: i.author, date: i.date, comments: (i.comments || []).length
      })),
      columns: [
        { header: 'ID', key: 'id' }, { header: '프로젝트', key: 'projectName' }, { header: '이슈 제목', key: 'title' },
        { header: '심각도', key: 'severity' }, { header: '상태', key: 'status' }, { header: '작성자', key: 'author' },
        { header: '일자', key: 'date' }, { header: '코멘트 수', key: 'comments' }
      ]
    }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold">{t('이슈 및 펀치 관리', 'Issues & Punches')}</h1></div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> Excel
          </button>
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={onAddClick} className="flex items-center bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              <Plus size={16} className="mr-1" /> {t('현장 이슈 등록', 'Report Issue')}
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {visibleIssues.map((issue) => (
          <div key={issue.id} onClick={() => onIssueClick(issue)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between cursor-pointer group hover:border-blue-300 transition-colors">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xs font-bold text-slate-500">{issue.id}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(issue.status)}`}>{issue.status}</span>
              </div>
              <div className="flex items-center">
                {issue.photo && issue.photo !== 'null' && issue.photo.startsWith('data:') && <img src={issue.photo} className="w-10 h-10 rounded mr-3 object-cover border border-slate-200" alt="이슈" />}
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
