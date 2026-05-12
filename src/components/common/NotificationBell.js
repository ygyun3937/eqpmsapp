import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Bell, MessageSquare, AlertCircle, LifeBuoy, GitCommit, Plane,
  ListPlus, FileText, X, CheckCheck, User, Paperclip
} from 'lucide-react';

// 타입별 아이콘/색상
const TYPE_META = {
  NOTE:     { icon: FileText,      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   labelKo: '공유 노트',     labelEn: 'Shared Note' },
  ISSUE:    { icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     labelKo: '신규 이슈',     labelEn: 'New Issue' },
  REQUEST:  { icon: MessageSquare, color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200',    labelKo: '고객 요청',     labelEn: 'Customer Request' },
  AS:       { icon: LifeBuoy,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  labelKo: 'AS',           labelEn: 'AS' },
  VERSION:  { icon: GitCommit,     color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  labelKo: '버전 업데이트', labelEn: 'Version' },
  TRIP:     { icon: Plane,         color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    labelKo: '출장',         labelEn: 'Trip' },
  EXTRA:    { icon: ListPlus,      color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', labelKo: '추가 작업',     labelEn: 'Extra Task' },
  ATTACHMENT: { icon: Paperclip,   color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', labelKo: '참고 자료',     labelEn: 'Attachment' },
};

// ts(ms) → 상대 시간 표시
function formatRelative(ts, t) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return t('방금 전', 'just now');
  if (m < 60) return t(`${m}분 전`, `${m}m ago`);
  const h = Math.floor(m / 60);
  if (h < 24) return t(`${h}시간 전`, `${h}h ago`);
  const d = Math.floor(h / 24);
  if (d < 30) return t(`${d}일 전`, `${d}d ago`);
  const mo = Math.floor(d / 30);
  return t(`${mo}개월 전`, `${mo}mo ago`);
}

export default function NotificationBell({ notifications, lastSeen, onMarkAllRead, onJump, t }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all | unread | NOTE | ISSUE | ...
  const [anchorRect, setAnchorRect] = useState(null);
  const ref = useRef(null);
  const btnRef = useRef(null);

  // 외부 클릭 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // 종 버튼 위치 추적 — 리사이즈/스크롤 시에도 dropdown 위치 갱신
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (btnRef.current) setAnchorRect(btnRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const unreadCount = useMemo(
    () => (notifications || []).filter(n => n.ts > lastSeen).length,
    [notifications, lastSeen]
  );

  const filtered = useMemo(() => {
    let list = notifications || [];
    if (filter === 'unread') list = list.filter(n => n.ts > lastSeen);
    else if (filter !== 'all') list = list.filter(n => n.type === filter);
    return list;
  }, [notifications, filter, lastSeen]);

  // 종 토글: 닫혀 있을 때 열고, 열릴 때 자동으로 읽음 처리는 X (사용자가 명시적으로 처리)
  const handleToggle = () => setOpen(v => !v);

  return (
    <div className="relative" ref={ref}>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className="relative bg-slate-100 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center shadow-sm border border-slate-200"
        title={t('알림', 'Notifications')}
      >
        <Bell size={14} className={unreadCount > 0 ? 'text-amber-600' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full px-1 border-2 border-white shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (() => {
        // 종 버튼 위치 기반으로 dropdown 우측 끝을 종 우측에 맞추고, top은 종 바로 아래
        const DROPDOWN_WIDTH = 420;
        const MARGIN = 8;
        let top = 60, right = 12;
        if (anchorRect) {
          top = Math.round(anchorRect.bottom + 6); // 종 아래 6px
          right = Math.max(MARGIN, Math.round(window.innerWidth - anchorRect.right)); // 종 우측 끝에 정렬
          // viewport 왼쪽 넘어가지 않도록 보정 (창이 좁을 때)
          const dropdownLeft = window.innerWidth - right - DROPDOWN_WIDTH;
          if (dropdownLeft < MARGIN) right = Math.max(MARGIN, window.innerWidth - DROPDOWN_WIDTH - MARGIN);
        }
        return (
        <>
          {/* 배경 클릭으로 닫기 */}
          <div className="fixed inset-0 z-[180]" onClick={() => setOpen(false)} />
          <div style={{ top, right }} className="fixed w-[420px] max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-xl shadow-2xl z-[190] overflow-hidden animate-[fadeIn_0.15s_ease-in-out]">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center">
              <Bell size={16} className="text-amber-500 mr-2" />
              <span className="font-bold text-slate-800 text-sm">{t('알림 센터', 'Notifications')}</span>
              {unreadCount > 0 && (
                <span className="ml-2 text-[10px] bg-red-50 text-red-700 font-bold px-1.5 py-0.5 rounded-full border border-red-200">
                  {t(`미확인 ${unreadCount}`, `${unreadCount} unread`)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={onMarkAllRead}
                disabled={unreadCount === 0}
                className="text-[11px] font-bold flex items-center px-2 py-1 rounded-md transition-colors text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('전체 읽음 처리', 'Mark all as read')}
              >
                <CheckCheck size={12} className="mr-1" /> {t('모두 읽음', 'All read')}
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={16} /></button>
            </div>
          </div>

          {/* 필터 칩 */}
          <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1 overflow-x-auto bg-slate-50">
            {[
              { v: 'all',     ko: '전체',       en: 'All' },
              { v: 'unread',  ko: '미확인',     en: 'Unread' },
              { v: 'NOTE',    ko: '공유노트',   en: 'Notes' },
              { v: 'ISSUE',   ko: '이슈',       en: 'Issues' },
              { v: 'REQUEST', ko: '고객요청',   en: 'Requests' },
              { v: 'AS',      ko: 'AS',        en: 'AS' },
              { v: 'VERSION', ko: '버전',       en: 'Version' },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFilter(f.v)}
                className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap transition-colors border ${filter === f.v ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
              >
                {t(f.ko, f.en)}
              </button>
            ))}
          </div>

          {/* 리스트 */}
          <div className="max-h-[480px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                <Bell size={28} className="mx-auto mb-2 text-slate-200" />
                {filter === 'unread'
                  ? t('새로운 알림이 없습니다.', 'No new notifications.')
                  : t('표시할 알림이 없습니다.', 'No notifications.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map(n => {
                  const meta = TYPE_META[n.type] || TYPE_META.NOTE;
                  const Icon = meta.icon;
                  const isUnread = n.ts > lastSeen;
                  return (
                    <button
                      key={n.id}
                      onClick={() => { onJump && onJump(n); setOpen(false); }}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 group ${isUnread ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`shrink-0 w-9 h-9 rounded-full ${meta.bg} ${meta.border} border flex items-center justify-center`}>
                        <Icon size={16} className={meta.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-0.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>
                            {t(meta.labelKo, meta.labelEn)}
                          </span>
                          {isUnread && <span className="ml-1.5 w-2 h-2 bg-blue-500 rounded-full shrink-0" title={t('미확인', 'Unread')}></span>}
                          <span className="ml-auto text-[10px] text-slate-400 shrink-0">{formatRelative(n.ts, t)}</span>
                        </div>
                        <div className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">{n.title}</div>
                        {n.detail && (
                          <div className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 whitespace-pre-wrap">{n.detail}</div>
                        )}
                        <div className="flex items-center text-[10px] text-slate-400 mt-1 gap-2">
                          <span className="truncate font-medium text-slate-500">{n.projectName}</span>
                          {n.author && <span className="flex items-center shrink-0"><User size={9} className="mr-0.5" />{n.author}</span>}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 flex items-center justify-between">
            <span>{t('최근 50건까지 표시', 'Showing latest 50')}</span>
            <span className="font-bold text-slate-600">{(notifications || []).length}{t('건', '')}</span>
          </div>
        </div>
        </>
        );
      })()}
    </div>
  );
}
