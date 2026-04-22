import React, { useState, memo } from 'react';
import { X, Kanban, User, MessageCircle, Send, Image as ImageIcon } from 'lucide-react';
import { ISSUE_PHASES } from '../../constants';

const IssueDetailModal = memo(function IssueDetailModal({ issue, issuesList, onClose, onAddComment, onUpdateIssueStatus, getStatusColor, t }) {
  const [newComment, setNewComment] = useState('');
  const currentIssue = issuesList.find(i => i.id === issue?.id) || issue;
  if (!currentIssue) return null;
  const handleSubmit = (e) => { e.preventDefault(); if (newComment.trim()) { onAddComment(currentIssue.id, newComment.trim()); setNewComment(''); } };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-2 md:p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 flex justify-between items-start bg-slate-50 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center space-x-2 mb-2 md:mb-3">
              <span className="text-[10px] md:text-xs font-bold text-slate-500">{currentIssue.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${getStatusColor(currentIssue.severity)}`}>{currentIssue.severity}</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 break-words leading-tight">{currentIssue.title}</h2>
            <p className="text-[10px] md:text-sm text-slate-500 mt-1.5 flex flex-wrap items-center gap-y-1">
              <span className="flex items-center"><Kanban size={14} className="mr-1" /> <span className="truncate max-w-[150px] md:max-w-none">{currentIssue.projectName}</span></span>
              <span className="mx-1 md:mx-2">|</span>
              <span className="flex items-center"><User size={14} className="mr-1" /> {currentIssue.author}</span>
              <span className="mx-1 md:mx-2">|</span>
              <span>{currentIssue.date}</span>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-200 overflow-x-auto pb-1">
              <h3 className="text-[10px] md:text-xs font-bold text-slate-500 mb-2">{t('이슈 처리 단계', 'Issue Phase')}</h3>
              <div className="flex items-center space-x-1 bg-slate-200/50 p-1 rounded-lg inline-flex border border-slate-200 min-w-max">
                {ISSUE_PHASES.map((status) => (
                  <button key={status} onClick={() => onUpdateIssueStatus(currentIssue.id, status)} className={`px-3 md:px-4 py-1.5 text-[10px] md:text-sm font-bold rounded-md transition-all ${currentIssue.status === status ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/80'}`}>{status}</button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 shrink-0"><X size={24} /></button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-100/50">
          {currentIssue.photo && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center"><ImageIcon size={16} className="text-slate-400 mr-2" /> {t('첨부 사진', 'Attached Photo')}</h3>
              <img src={currentIssue.photo} className="max-h-64 rounded-lg shadow-sm border border-slate-200 object-contain" alt="현장 첨부 이미지" />
            </div>
          )}
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center"><MessageCircle size={18} className="text-blue-500 mr-2" /> {t('진행 상황 및 코멘트', 'Progress & Comments')} ({currentIssue.comments?.length || 0})</h3>
          <div className="space-y-4">
            {(!currentIssue.comments || currentIssue.comments.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs md:text-sm border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">{t('아직 등록된 진행 상황이 없습니다.', 'No comments registered yet.')}</div>
            ) : (
              currentIssue.comments.map(comment => (
                <div key={comment.id} className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs md:text-sm text-slate-800 flex items-center">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] md:text-xs mr-2">{comment.author.charAt(0)}</div>{comment.author}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-400">{comment.date}</span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 whitespace-pre-wrap ml-7 md:ml-8 leading-relaxed">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="p-3 md:p-4 border-t border-slate-200 bg-white flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input type="text" placeholder={t("해결 상황 입력...", "Enter update...")} className="flex-1 text-xs md:text-sm p-2.5 md:p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
            <button type="submit" disabled={!newComment.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center shrink-0">
              <Send size={16} className="md:mr-1.5" /> <span className="hidden md:inline">{t('등록', 'Submit')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
});

export default IssueDetailModal;
