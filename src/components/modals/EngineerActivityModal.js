import React, { useState, memo, useMemo } from 'react';
import {
  X, History, User, Plane, AlertCircle, FileText, GitCommit, LifeBuoy,
  MessageSquare, Users as UsersIcon, Search, Filter, Edit2, Calendar
} from 'lucide-react';

const TYPE_META = {
  TRIP:        { icon: Plane,         color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200',    labelKo: '출장 등록',    labelEn: 'Trip' },
  TRIP_EDIT:   { icon: Edit2,         color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300',    labelKo: '출장 수정',    labelEn: 'Trip edit' },
  ISSUE:       { icon: AlertCircle,   color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     labelKo: '이슈 등록',    labelEn: 'Issue' },
  ISSUE_EDIT:  { icon: Edit2,         color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300',     labelKo: '이슈 수정',    labelEn: 'Issue edit' },
  NOTE:        { icon: FileText,      color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   labelKo: '공유 노트',    labelEn: 'Note' },
  VERSION:     { icon: GitCommit,     color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  labelKo: '버전 등록',    labelEn: 'Version' },
  AS:          { icon: LifeBuoy,      color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200',  labelKo: 'AS 처리',     labelEn: 'AS' },
  REQUEST:     { icon: MessageSquare, color: 'text-cyan-600',    bg: 'bg-cyan-50',    border: 'border-cyan-200',    labelKo: '고객 요청',    labelEn: 'Request' },
  PM_CHANGE:   { icon: UsersIcon,     color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', labelKo: '메인 PM 변경', labelEn: 'PM change' },
};

const FILTER_CHIPS = [
  { v: 'all',        ko: '전체',    en: 'All' },
  { v: 'TRIP',       ko: '출장',    en: 'Trip' },
  { v: 'TRIP_EDIT',  ko: '출장수정', en: 'Trip edit' },
  { v: 'ISSUE',      ko: '이슈',    en: 'Issue' },
  { v: 'ISSUE_EDIT', ko: '이슈수정', en: 'Issue edit' },
  { v: 'NOTE',       ko: '노트',    en: 'Note' },
  { v: 'VERSION',    ko: '버전',    en: 'Version' },
  { v: 'AS',         ko: 'AS',     en: 'AS' },
  { v: 'REQUEST',    ko: '요청',    en: 'Request' },
  { v: 'PM_CHANGE',  ko: 'PM변경',  en: 'PM' },
];

const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  const d = new Date(v);
  const t = d.getTime();
  return isNaN(t) ? 0 : t;
};

const fmtDate = (ms) => {
  if (!ms) return '-';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const EngineerActivityModal = memo(function EngineerActivityModal({ engineer, projects, issues, onClose, t }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const events = useMemo(() => {
    if (!engineer) return [];
    const name = engineer.name;
    const id = engineer.id;
    const out = [];

    (projects || []).forEach(p => {
      // 출장 등록 + 수정 이력
      (p.trips || []).forEach(tr => {
        const matchTrip = (tr.engineerId && tr.engineerId === id) || (tr.engineerName === name);
        if (matchTrip) {
          out.push({
            type: 'TRIP',
            ts: toMs(tr.createdAt) || toMs(tr.departureDate),
            projectId: p.id,
            projectName: p.name,
            title: `${t('출장 등록', 'Trip')}: ${tr.departureDate || '-'} ~ ${tr.returnDate || '-'}`,
            detail: tr.note || '',
            actor: tr.createdBy || name
          });
        }
        (tr.editHistory || []).forEach(h => {
          if (h.by === name) {
            const changesText = (h.changes || []).map(c => `${c.field}: ${c.from} → ${c.to}`).join(', ');
            out.push({
              type: 'TRIP_EDIT',
              ts: toMs(h.ts),
              projectId: p.id,
              projectName: p.name,
              title: `${t('출장 수정', 'Trip edit')}: ${tr.engineerName || ''} (${tr.departureDate || ''}~${tr.returnDate || ''})`,
              detail: changesText + (h.reason ? ` / 사유: ${h.reason}` : ''),
              actor: h.by
            });
          }
        });
      });

      // 노트
      (p.notes || []).forEach(n => {
        if (n.author === name) {
          out.push({
            type: 'NOTE',
            ts: toMs(n.date) || toMs(n.createdAt) || (typeof n.id === 'number' ? n.id : 0),
            projectId: p.id,
            projectName: p.name,
            title: t('공유 노트 등록', 'Note added'),
            detail: n.content || '',
            actor: n.author
          });
        }
      });

      // 버전
      (p.versions || []).forEach(v => {
        if (v.author === name) {
          out.push({
            type: 'VERSION',
            ts: toMs(v.releaseDate) || (typeof v.id === 'number' ? v.id : 0),
            projectId: p.id,
            projectName: p.name,
            title: `${t('버전 등록', 'Version')}: [${v.category}] ${v.version}`,
            detail: v.note || '',
            actor: v.author
          });
        }
      });

      // AS
      (p.asRecords || []).forEach(a => {
        if (a.engineer === name) {
          out.push({
            type: 'AS',
            ts: toMs(a.date) || (typeof a.id === 'number' ? a.id : 0),
            projectId: p.id,
            projectName: p.name,
            title: `${t('AS 처리', 'AS')}: [${a.type || ''}] ${a.status || ''}`,
            detail: a.description || '',
            actor: a.engineer
          });
        }
      });

      // 고객 요청 (작성자/응답자 매칭)
      (p.customerRequests || []).forEach(r => {
        if (r.author === name || r.responder === name) {
          out.push({
            type: 'REQUEST',
            ts: toMs(r.date) || toMs(r.createdAt) || (typeof r.id === 'number' ? r.id : 0),
            projectId: p.id,
            projectName: p.name,
            title: `${t('고객 요청', 'Request')}: ${r.title || ''}`,
            detail: r.content || r.description || '',
            actor: r.author
          });
        }
      });

      // 메인 PM 변경 (from/to/changedBy 매칭)
      (p.managerHistory || []).forEach(h => {
        if (h.to === name || h.from === name || h.changedBy === name) {
          out.push({
            type: 'PM_CHANGE',
            ts: toMs(h.date),
            projectId: p.id,
            projectName: p.name,
            title: `${t('메인 PM 변경', 'PM change')}: ${h.from || '-'} → ${h.to || '-'}`,
            detail: h.reason ? `사유: ${h.reason}` : '',
            actor: h.changedBy || h.to
          });
        }
      });
    });

    // 이슈 (top-level)
    (issues || []).forEach(iss => {
      if (iss.author === name) {
        out.push({
          type: 'ISSUE',
          ts: toMs(iss.date),
          projectId: iss.projectId,
          projectName: iss.projectName,
          title: `${t('이슈 등록', 'Issue')}: [${iss.severity}] ${iss.title}`,
          detail: '',
          actor: iss.author
        });
      }
      (iss.editHistory || []).forEach(h => {
        if (h.by === name) {
          const changesText = (h.changes || []).map(c => `${c.field}: ${c.from} → ${c.to}`).join(', ');
          out.push({
            type: 'ISSUE_EDIT',
            ts: toMs(h.ts),
            projectId: iss.projectId,
            projectName: iss.projectName,
            title: `${t('이슈 수정', 'Issue edit')}: [${iss.id}] ${iss.title}`,
            detail: changesText + (h.reason ? ` / 사유: ${h.reason}` : ''),
            actor: h.by
          });
        }
      });
    });

    out.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return out;
  }, [engineer, projects, issues, t]);

  const filtered = useMemo(() => {
    let list = events;
    if (filter !== 'all') list = list.filter(e => e.type === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(e =>
        (e.title || '').toLowerCase().includes(q) ||
        (e.detail || '').toLowerCase().includes(q) ||
        (e.projectName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [events, filter, search]);

  const counts = useMemo(() => {
    const c = { all: events.length };
    events.forEach(e => { c[e.type] = (c[e.type] || 0) + 1; });
    return c;
  }, [events]);

  if (!engineer) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* 헤더 */}
        <div className="px-6 py-4 flex justify-between items-center shrink-0 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <History size={18} className="mr-2 text-indigo-600" />
              {t('활동 이력', 'Activity History')}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 flex items-center">
              <User size={11} className="mr-1 text-slate-400" />
              <span className="font-bold">{engineer.name}</span>
              {engineer.grade && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{engineer.grade}</span>}
              {engineer.dept && <span className="ml-2 text-slate-500">{engineer.dept}</span>}
              <span className="ml-2 text-slate-400">· {t('총', 'Total')} {events.length}{t('건', '')}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-white"><X size={20} /></button>
        </div>

        {/* 검색 + 필터 */}
        <div className="px-6 py-3 border-b border-slate-100 space-y-2 shrink-0 bg-slate-50">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('내용/프로젝트 검색', 'Search content/project')}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
            />
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <Filter size={11} className="text-slate-400 shrink-0 mr-0.5" />
            {FILTER_CHIPS.map(f => {
              const cnt = counts[f.v] || 0;
              const disabled = f.v !== 'all' && cnt === 0;
              return (
                <button
                  key={f.v}
                  onClick={() => setFilter(f.v)}
                  disabled={disabled}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap transition-colors border shrink-0
                    ${filter === f.v ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}
                    ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {t(f.ko, f.en)} {cnt > 0 && <span className={filter === f.v ? 'text-indigo-100' : 'text-slate-400'}>{cnt}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 타임라인 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              <History size={32} className="mx-auto mb-2 text-slate-200" />
              {events.length === 0
                ? t('등록된 활동 이력이 없습니다.', 'No activity yet.')
                : t('해당 조건의 활동이 없습니다.', 'No matching activity.')}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((e, i) => {
                const meta = TYPE_META[e.type] || TYPE_META.NOTE;
                const Icon = meta.icon;
                return (
                  <div key={i} className={`p-3 rounded-lg border ${meta.bg} ${meta.border} flex gap-3`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full bg-white border ${meta.border} flex items-center justify-center`}>
                      <Icon size={14} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-0.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${meta.bg} ${meta.color} border ${meta.border}`}>
                          {t(meta.labelKo, meta.labelEn)}
                        </span>
                        <span className="ml-auto text-[10px] text-slate-500 shrink-0 flex items-center">
                          <Calendar size={9} className="mr-0.5" />{fmtDate(e.ts)}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 break-words">{e.title}</div>
                      {e.detail && (
                        <div className="text-[11px] text-slate-600 mt-0.5 whitespace-pre-wrap break-words line-clamp-3">{e.detail}</div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-1 truncate">{e.projectName}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center shrink-0 bg-white">
          <span className="text-[10px] text-slate-400">
            {t('출장/이슈/노트/버전/AS/요청/PM 변경 이력 — 본인 명의로 기록된 활동 자동 집계', 'Auto-aggregated activity by name')}
          </span>
          <button type="button" onClick={onClose} className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
            {t('닫기', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
});

export default EngineerActivityModal;
