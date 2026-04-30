import React, { memo } from 'react';
import { FileText, X, User } from 'lucide-react';

const ProjectNotesBadge = memo(function ProjectNotesBadge({ prjId, notes, openId, setOpenId, isGanttView = false, t, onJump }) {
  const isOpen = openId === prjId;
  if (!notes || notes.length === 0) return null;
  const toggle = (e) => { e.stopPropagation(); setOpenId(isOpen ? null : prjId); };

  const btnClass = isGanttView
    ? "text-[10px] text-amber-700 bg-amber-50 inline-flex items-center px-1.5 py-0.5 rounded font-bold border border-amber-200 hover:bg-amber-100 cursor-pointer"
    : "px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center hover:bg-amber-200 transition-colors cursor-pointer border border-amber-200";

  // 최신순
  const sorted = [...notes].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));

  return (
    <>
      <button onClick={toggle} className={btnClass} title={t('클릭하여 공유 노트 보기', 'Click to view shared notes')}>
        <FileText size={10} className="mr-1" />
        {t('공유 노트', 'Notes')} {notes.length}{t('건', '')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={(e) => { e.stopPropagation(); setOpenId(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-amber-50 shrink-0">
              <h3 className="text-base font-bold text-amber-800 flex items-center">
                <FileText size={18} className="mr-2" />
                {t('공유 노트', 'Shared Notes')}
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{notes.length}{t('건', '')}</span>
              </h3>
              <button onClick={(e) => { e.stopPropagation(); setOpenId(null); }} className="text-amber-400 hover:text-amber-600 p-1"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 bg-slate-50">
              <div className="space-y-2">
                {sorted.map(n => (
                  <div key={n.id} className="p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1.5">
                      <span className="flex items-center font-bold text-slate-700"><User size={10} className="mr-1" />{n.author}</span>
                      <span>{n.date}</span>
                    </div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{n.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-between bg-white shrink-0">
              {onJump ? (
                <button onClick={(e) => { e.stopPropagation(); setOpenId(null); onJump(); }} className="px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors">{t('프로젝트에서 노트 추가', 'Open project & add note')}</button>
              ) : <span />}
              <button onClick={(e) => { e.stopPropagation(); setOpenId(null); }} className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t('닫기', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default ProjectNotesBadge;
