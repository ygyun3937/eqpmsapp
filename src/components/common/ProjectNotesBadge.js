import React, { memo, useState } from 'react';
import { FileText, StickyNote, X, User, Clock, Calendar, CheckSquare, ListTodo, Paperclip, ExternalLink, Download } from 'lucide-react';

const fmtSize = (b) => {
  if (!b && b !== 0) return '';
  if (b < 1024) return b + ' B';
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1024 / 1024).toFixed(2) + ' MB';
};

// 회의록/노트 미니 뷰 — TaskModal의 회의록 탭과 동일한 타임라인 브랜치 테마
const ProjectNotesBadge = memo(function ProjectNotesBadge({ prjId, notes, openId, setOpenId, isGanttView = false, t, onJump }) {
  const [filter, setFilter] = useState('all'); // 'all' | 'meeting' | 'note'
  const isOpen = openId === prjId;
  if (!notes || notes.length === 0) return null;
  const toggle = (e) => { e.stopPropagation(); setOpenId(isOpen ? null : prjId); };

  const btnClass = isGanttView
    ? "text-[10px] text-amber-700 bg-amber-50 inline-flex items-center px-1.5 py-0.5 rounded font-bold border border-amber-200 hover:bg-amber-100 cursor-pointer"
    : "px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center hover:bg-amber-200 transition-colors cursor-pointer border border-amber-200";

  // 카운트
  const cnt = { all: notes.length, meeting: 0, note: 0 };
  notes.forEach(n => { const k = n.kind === 'note' ? 'note' : 'meeting'; cnt[k] += 1; });

  // 필터 + 최신순
  const filtered = notes.filter(n => {
    if (filter === 'all') return true;
    const k = n.kind === 'note' ? 'note' : 'meeting';
    return k === filter;
  });
  const sorted = [...filtered].sort((a, b) => (Number(b.id) || 0) - (Number(a.id) || 0));
  const today = new Date();
  const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const DAY = 86400000;

  return (
    <>
      <button onClick={toggle} className={btnClass} title={t('클릭하여 공유 노트 보기', 'Click to view shared notes')}>
        <FileText size={10} className="mr-1" />
        {t('공유 노트', 'Notes')} {notes.length}{t('건', '')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={(e) => { e.stopPropagation(); setOpenId(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-amber-50 shrink-0">
              <h3 className="text-base font-bold text-amber-800 flex items-center">
                <FileText size={18} className="mr-2" />
                {t('회의록 / 공유 노트', 'Meetings / Notes')}
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{notes.length}{t('건', '')}</span>
              </h3>
              <button onClick={(e) => { e.stopPropagation(); setOpenId(null); }} className="text-amber-400 hover:text-amber-600 p-1"><X size={20} /></button>
            </div>

            {/* 필터 칩 */}
            {notes.length > 0 && (
              <div className="px-5 py-2.5 border-b border-slate-100 bg-white flex items-center gap-1.5 flex-wrap shrink-0">
                <span className="text-[11px] font-bold text-slate-500 mr-1">{t('필터', 'Filter')}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFilter('all'); }} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors ${filter === 'all' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{t('전체', 'All')} {cnt.all}</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFilter('meeting'); }} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${filter === 'meeting' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'}`}><FileText size={10} className="mr-1" />{t('회의록', 'Meeting')} {cnt.meeting}</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFilter('note'); }} className={`text-[11px] font-bold px-2 py-1 rounded-full border transition-colors inline-flex items-center ${filter === 'note' ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}><StickyNote size={10} className="mr-1" />{t('노트', 'Note')} {cnt.note}</button>
              </div>
            )}

            {/* 본문 — 타임라인 브랜치 */}
            <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
              {sorted.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">{filter === 'meeting' ? t('등록된 회의록이 없습니다.', 'No meetings.') : filter === 'note' ? t('등록된 노트가 없습니다.', 'No notes.') : t('등록된 항목이 없습니다.', 'No items.')}</div>
              ) : (
                <div className="relative">
                  {/* 좌측 세로 타임라인 라인 */}
                  <div className="absolute left-7 top-2 bottom-2 w-0.5 bg-amber-200"></div>
                  <div className="space-y-3">
                    {sorted.map(note => {
                      const ts = Number(note.id) || 0;
                      const d = ts > 0 ? new Date(ts) : null;
                      const valid = d && !isNaN(d);
                      const d0 = valid ? new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() : null;
                      const diff = d0 !== null ? Math.floor((today0 - d0) / DAY) : null;
                      const dow = valid ? ['일','월','화','수','목','금','토'][d.getDay()] : '';
                      const mm = valid ? d.getMonth() + 1 : '';
                      const dd = valid ? d.getDate() : '';
                      const hh = valid ? String(d.getHours()).padStart(2,'0') : '';
                      const mi = valid ? String(d.getMinutes()).padStart(2,'0') : '';
                      let rel = '';
                      if (diff === 0) rel = t('오늘', 'Today');
                      else if (diff === 1) rel = t('어제', 'Yesterday');
                      else if (diff > 1 && diff < 7) rel = t(`${diff}일 전`, `${diff}d ago`);
                      else if (diff >= 7 && diff < 30) rel = t(`${Math.floor(diff/7)}주 전`, `${Math.floor(diff/7)}w ago`);
                      else if (diff >= 30 && diff < 365) rel = t(`${Math.floor(diff/30)}개월 전`, `${Math.floor(diff/30)}mo ago`);
                      else if (diff >= 365) rel = t(`${Math.floor(diff/365)}년 전`, `${Math.floor(diff/365)}y ago`);
                      const stripCls = diff === null ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : diff <= 1 ? 'bg-amber-300 text-amber-900 border-amber-400'
                        : diff < 7 ? 'bg-amber-200 text-amber-800 border-amber-300'
                        : diff < 30 ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-slate-200 text-slate-700 border-slate-300';
                      const isNote = note.kind === 'note';
                      const files = Array.isArray(note.files) ? note.files : (note.file ? [note.file] : []);
                      return (
                        <div key={note.id} className="relative pl-[68px]">
                          {/* 좌측 날짜 노드 */}
                          <div className={`absolute left-0 top-1 w-14 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center py-1.5 z-10 ${stripCls}`} title={valid ? `${mm}/${dd} ${hh}:${mi}` : note.date}>
                            <div className="text-[9px] font-black leading-none">{valid ? `${mm}월` : '-'}</div>
                            <div className="text-xl font-black leading-none mt-0.5 tabular-nums">{valid ? dd : '-'}</div>
                            <div className="text-[8px] font-medium leading-none mt-0.5 opacity-70">{valid ? `${dow}요일` : ''}</div>
                          </div>
                          {/* 우측 본문 카드 */}
                          <div className={`bg-white p-3 rounded-xl border shadow-sm ${isNote ? 'border-slate-300' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${isNote ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-600'}`}>{(note.author || '?').charAt(0)}</div>
                                <span className="text-xs font-bold text-slate-800">{note.author}</span>
                                <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${isNote ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                  {isNote ? <><StickyNote size={9} className="mr-1" />{t('노트', 'Note')}</> : <><FileText size={9} className="mr-1" />{t('회의록', 'Meeting')}</>}
                                </span>
                                {valid && (
                                  <span className="text-[10px] text-slate-500 flex items-center"><Clock size={10} className="mr-0.5" />{hh}:{mi}{rel && <span className="ml-1.5 text-slate-400 font-medium">· {rel}</span>}</span>
                                )}
                                {!valid && note.date && <span className="text-[10px] text-slate-400">{note.date}</span>}
                              </div>
                            </div>
                            {/* 상세 모드 메타: 회의 일시 + 참석자 */}
                            {(note.meetingDate || note.attendees) && (
                              <div className="mb-2 flex items-center gap-1.5 flex-wrap text-[11px]">
                                {note.meetingDate && (
                                  <span className="inline-flex items-center bg-indigo-50 text-indigo-800 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                                    <Calendar size={9} className="mr-1" />{note.meetingDate.replace('T', ' ').slice(0, 16)}
                                  </span>
                                )}
                                {note.attendees && (
                                  <span className="inline-flex items-center bg-slate-50 text-slate-700 border border-slate-200 px-1.5 py-0.5 rounded font-bold max-w-full">
                                    <User size={9} className="mr-1" />
                                    <span className="truncate max-w-[300px]">{note.attendees}</span>
                                  </span>
                                )}
                              </div>
                            )}
                            {note.summary && (
                              <div className="mb-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                <div className="text-[10px] font-bold text-amber-700 mb-0.5">{t('요약', 'Summary')}</div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.summary}</p>
                              </div>
                            )}
                            {note.text && <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.text}</p>}
                            {note.decisions && (
                              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2">
                                <div className="text-[10px] font-bold text-emerald-700 mb-0.5 flex items-center"><CheckSquare size={10} className="mr-1" />{t('결정사항', 'Decisions')}</div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.decisions}</p>
                              </div>
                            )}
                            {note.actions && (
                              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
                                <div className="text-[10px] font-bold text-blue-700 mb-0.5 flex items-center"><ListTodo size={10} className="mr-1" />{t('액션 아이템', 'Action Items')}</div>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{note.actions}</p>
                              </div>
                            )}
                            {files.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {files.map((f, fIdx) => (
                                  <div key={fIdx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded p-1.5">
                                    <Paperclip size={11} className="text-amber-600 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-[11px] font-bold text-slate-800 truncate" title={f.fileName}>{f.fileName}</div>
                                      <div className="text-[10px] text-slate-500 font-mono">{fmtSize(f.size)}</div>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      {f.viewUrl && <a href={f.viewUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" title={t('Drive에서 열기', 'Open in Drive')}><ExternalLink size={11} /></a>}
                                      {f.downloadUrl && <a href={f.downloadUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50" title={t('다운로드', 'Download')}><Download size={11} /></a>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 푸터 */}
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
