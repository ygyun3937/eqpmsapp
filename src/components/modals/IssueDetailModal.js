import React, { useState, memo } from 'react';
import { X, Kanban, User, MessageCircle, Send, Image as ImageIcon, Pencil, Save, History, ChevronDown, ChevronUp } from 'lucide-react';
import { ISSUE_PHASES } from '../../constants';

const IssueDetailModal = memo(function IssueDetailModal({ issue, issuesList, engineers, currentUser, onClose, onAddComment, onUpdateIssueStatus, onUpdateIssue, getStatusColor, t }) {
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', author: '', reason: '' });
  const [editError, setEditError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const currentIssue = issuesList.find(i => i.id === issue?.id) || issue;
  if (!currentIssue) return null;

  const isAdmin = currentUser?.role === 'ADMIN';
  const history = currentIssue.editHistory || [];
  const engineerNames = Array.from(new Set((engineers || []).map(e => e.name).filter(Boolean)));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) { onAddComment(currentIssue.id, newComment.trim()); setNewComment(''); }
  };

  const handleStartEdit = () => {
    setEditError('');
    setEditForm({ title: currentIssue.title || '', author: currentIssue.author || '', reason: '' });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError('');
  };

  const handleSaveEdit = () => {
    setEditError('');
    if (!editForm.title.trim()) { setEditError(t('제목을 입력하세요.', 'Enter title.')); return; }
    if (!editForm.author.trim()) { setEditError(t('담당자를 입력하세요.', 'Enter assignee.')); return; }

    const fieldLabels = { title: t('제목', 'Title'), author: t('담당자(작성자)', 'Assignee') };
    const changes = [];
    ['title', 'author'].forEach(k => {
      const before = (currentIssue[k] || '').trim();
      const after = (editForm[k] || '').trim();
      if (before !== after) changes.push({ field: fieldLabels[k], from: before || '(없음)', to: after || '(없음)' });
    });

    if (changes.length === 0) { handleCancelEdit(); return; }

    const updates = {
      title: editForm.title.trim(),
      author: editForm.author.trim(),
      editHistory: [
        ...history,
        {
          ts: new Date().toLocaleString(),
          by: currentUser?.name || '-',
          changes,
          reason: (editForm.reason || '').trim()
        }
      ]
    };
    const summaryText = `이슈 수정 [${currentIssue.id}]: ` +
      changes.map(c => `${c.field} "${c.from}" → "${c.to}"`).join(', ') +
      (editForm.reason ? ` / 사유: ${editForm.reason}` : '');
    onUpdateIssue(currentIssue.id, updates, summaryText);
    setIsEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-2 md:p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 flex justify-between items-start bg-slate-50 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center space-x-2 mb-2 md:mb-3">
              <span className="text-[10px] md:text-xs font-bold text-slate-500">{currentIssue.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${getStatusColor(currentIssue.severity)}`}>{currentIssue.severity}</span>
              {history.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">{t('수정됨', 'edited')} {history.length}</span>
              )}
            </div>

            {!isEditing ? (
              <>
                <div className="flex items-start gap-2">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 break-words leading-tight flex-1">{currentIssue.title}</h2>
                  {isAdmin && onUpdateIssue && (
                    <button type="button" onClick={handleStartEdit} className="shrink-0 inline-flex items-center px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded border border-blue-200" title={t('관리자 수정', 'Admin edit')}>
                      <Pencil size={11} className="mr-1" />{t('수정', 'Edit')}
                    </button>
                  )}
                </div>
                <p className="text-[10px] md:text-sm text-slate-500 mt-1.5 flex flex-wrap items-center gap-y-1">
                  <span className="flex items-center"><Kanban size={14} className="mr-1" /> <span className="truncate max-w-[150px] md:max-w-none">{currentIssue.projectName}</span></span>
                  <span className="mx-1 md:mx-2">|</span>
                  <span className="flex items-center"><User size={14} className="mr-1" /> {currentIssue.author}</span>
                  <span className="mx-1 md:mx-2">|</span>
                  <span>{currentIssue.date}</span>
                </p>
              </>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-700 flex items-center"><Pencil size={11} className="mr-1" />{t('이슈 수정 (관리자)', 'Edit Issue (Admin)')}</span>
                  <button type="button" onClick={handleCancelEdit} className="text-slate-400 hover:text-slate-600 p-0.5"><X size={14} /></button>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('제목', 'Title')}</label>
                  <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('담당자(작성자)', 'Assignee (Author)')}</label>
                  <input list="issue-assignee-list" type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={editForm.author} onChange={e => setEditForm({...editForm, author: e.target.value})} placeholder={t('이름 입력 또는 선택', 'Type or select')} />
                  {engineerNames.length > 0 && (
                    <datalist id="issue-assignee-list">
                      {engineerNames.map(n => <option key={n} value={n} />)}
                    </datalist>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('변경 사유 (선택)', 'Reason (Optional)')}</label>
                  <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={editForm.reason} onChange={e => setEditForm({...editForm, reason: e.target.value})} placeholder={t('예: 오타 수정, 담당자 교체', 'e.g. typo, reassign')} />
                </div>
                {editError && <p className="text-[11px] font-bold text-red-600">{editError}</p>}
                <div className="flex justify-end gap-1.5">
                  <button type="button" onClick={handleCancelEdit} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded">
                    {t('취소', 'Cancel')}
                  </button>
                  <button type="button" onClick={handleSaveEdit} className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded">
                    <Save size={11} className="mr-1" />{t('저장', 'Save')}
                  </button>
                </div>
              </div>
            )}

            {history.length > 0 && (
              <div className="mt-2">
                <button type="button" onClick={() => setShowHistory(s => !s)} className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center font-bold">
                  {showHistory ? <ChevronUp size={11} className="mr-0.5" /> : <ChevronDown size={11} className="mr-0.5" />}
                  <History size={11} className="mr-0.5" />
                  {t('수정 이력', 'Edit history')} ({history.length})
                </button>
                {showHistory && (
                  <div className="mt-1.5 space-y-1 border-l-2 border-amber-200 pl-2">
                    {[...history].reverse().map((h, i) => (
                      <div key={i} className="text-[11px] text-slate-600 bg-amber-50/40 rounded p-1.5 border border-amber-100">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700">{h.by}</span>
                          <span className="text-slate-400">{h.ts}</span>
                        </div>
                        {(h.changes || []).map((c, j) => (
                          <div key={j} className="text-slate-600">
                            <span className="font-bold">{c.field}:</span> <span className="line-through text-slate-400">{c.from}</span> → <span className="text-emerald-700 font-bold">{c.to}</span>
                          </div>
                        ))}
                        {h.reason && <div className="text-slate-500 italic mt-0.5">{t('사유:', 'Reason:')} {h.reason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
          {currentIssue.photo && currentIssue.photo !== 'null' && currentIssue.photo.startsWith('data:') && (
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
