import React, { useState, useEffect, useMemo, memo } from 'react';
import { Activity, RefreshCw, Filter, Search, Download, Loader, AlertTriangle, Inbox, User, Clock, Database, ChevronDown, ChevronRight } from 'lucide-react';
import { callGoogleAction } from '../../utils/api';
import { exportToExcel } from '../../utils/export';

// 액션 별 메타 — UI 라벨/색상
const ACTION_META = {
  UPDATE_PROJECT_BY_ID: { ko: '프로젝트 (단일)', en: 'Project (single)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  UPDATE_PROJECTS:      { ko: '프로젝트 (전체)', en: 'Projects (all)',   color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  UPDATE_ISSUES:        { ko: '이슈',           en: 'Issues',           color: 'bg-red-50 text-red-700 border-red-200' },
  UPDATE_RELEASES:      { ko: '릴리즈',         en: 'Releases',         color: 'bg-amber-50 text-amber-700 border-amber-200' },
  UPDATE_ENGINEERS:     { ko: '엔지니어',       en: 'Engineers',        color: 'bg-blue-50 text-blue-700 border-blue-200' },
  UPDATE_PARTS:         { ko: '자재',           en: 'Parts',            color: 'bg-slate-50 text-slate-700 border-slate-200' },
  UPDATE_SITES:         { ko: '사이트',         en: 'Sites',            color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  UPDATE_CUSTOMERS:     { ko: '고객사',         en: 'Customers',        color: 'bg-teal-50 text-teal-700 border-teal-200' },
  UPDATE_USERS:         { ko: '사용자',         en: 'Users',            color: 'bg-purple-50 text-purple-700 border-purple-200' },
  UPDATE_SETTINGS:      { ko: '시스템 설정',    en: 'Settings',         color: 'bg-slate-100 text-slate-800 border-slate-300' },
  UPDATE_WEEKLY_REPORTS:{ ko: '주간 보고',      en: 'Weekly Reports',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  DELETE_PROJECT:       { ko: '프로젝트 삭제',  en: 'Project Delete',   color: 'bg-red-100 text-red-800 border-red-300' },
};
const actionLabel = (a, t) => {
  const m = ACTION_META[a];
  return m ? t(m.ko, m.en) : (a || '');
};
const actionColor = (a) => ACTION_META[a]?.color || 'bg-slate-50 text-slate-600 border-slate-200';

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleString('sv-SE').slice(0, 19);
};

// JSON 문자열을 사람이 읽기 좋게 트리밍
const previewJson = (s, maxLen = 120) => {
  if (s == null) return '';
  const str = String(s);
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + '…';
};

const AdminChangeLogView = memo(function AdminChangeLogView({ currentUser, t }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterSinceDays, setFilterSinceDays] = useState(7);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null); // 한 줄 펼침 (before/after 전체 보기)

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchLogs = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    const result = await callGoogleAction('READ_CHANGE_LOG', { limit: 500, sinceDays: filterSinceDays });
    if (result && result.status === 'success' && Array.isArray(result.logs)) {
      setLogs(result.logs);
    } else {
      setError((result && result.message) || t('이력 조회 실패. GAS 재배포가 필요할 수 있습니다 (READ_CHANGE_LOG 액션).', 'Failed to load logs. GAS may need redeployment (READ_CHANGE_LOG action).'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSinceDays]);

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return logs.filter(l => {
      if (filterAction !== 'all' && l.action !== filterAction) return false;
      if (kw) {
        const hay = [l.user, l.action, l.target, l.before, l.after].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, filterAction, search]);

  const stats = useMemo(() => {
    const out = { total: logs.length, today: 0, week: 0, byAction: {} };
    const dayMs = 86400000;
    const now = Date.now();
    logs.forEach(l => {
      const ts = new Date(l.timestamp).getTime();
      if (!isNaN(ts)) {
        if (now - ts < dayMs) out.today++;
        if (now - ts < 7 * dayMs) out.week++;
      }
      out.byAction[l.action] = (out.byAction[l.action] || 0) + 1;
    });
    return out;
  }, [logs]);

  const handleExport = () => {
    const rows = filtered.map(l => ({
      timestamp: fmtDate(l.timestamp),
      user: l.user || '',
      action: actionLabel(l.action, t),
      target: l.target || '',
      before: l.before || '',
      after: l.after || ''
    }));
    exportToExcel(rows, `MAK-PMS_시스템활동이력_${new Date().toISOString().slice(0, 10)}.xlsx`, 'CHANGE_LOG');
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500">
        <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
        <div className="font-bold">{t('관리자만 접근 가능합니다.', 'Admin only.')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-in-out]">
      {/* 페이지 제목은 상위 탭 헤더 → 부제목 좌측, 액션 우측. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500">{t('모든 데이터 변경(저장/수정/삭제)이 누가/언제/무엇을/이전→이후로 자동 기록됩니다. GAS 시트의 CHANGE_LOG에서 읽음.', 'All data mutations are auto-logged with user/timestamp/action/before/after. Read from GAS CHANGE_LOG sheet.')}</p>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} disabled={loading} className="px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 disabled:opacity-50 inline-flex items-center">
            {loading ? <Loader size={14} className="animate-spin mr-1" /> : <RefreshCw size={14} className="mr-1" />}{t('새로고침', 'Refresh')}
          </button>
          <button onClick={handleExport} disabled={filtered.length === 0} className="px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg inline-flex items-center">
            <Download size={14} className="mr-1" />{t('Excel 추출', 'Export Excel')}
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase">{t('전체', 'Total')}</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase">{t('오늘', 'Today')}</div>
          <div className="text-2xl font-black text-indigo-600 mt-1">{stats.today}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase">{t('최근 7일', '7d')}</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{stats.week}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase">{t('액션 종류', 'Action types')}</div>
          <div className="text-2xl font-black text-purple-600 mt-1">{Object.keys(stats.byAction).length}</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-bold text-slate-600">{t('기간', 'Period')}</label>
          <select value={filterSinceDays} onChange={(e) => setFilterSinceDays(Number(e.target.value))} className="text-xs p-1.5 border border-slate-300 rounded">
            <option value={1}>{t('오늘', 'Today')}</option>
            <option value={7}>{t('최근 7일', 'Last 7 days')}</option>
            <option value={30}>{t('최근 30일', 'Last 30 days')}</option>
            <option value={90}>{t('최근 90일', 'Last 90 days')}</option>
            <option value={0}>{t('전체', 'All')}</option>
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] font-bold text-slate-600">{t('액션', 'Action')}</label>
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="text-xs p-1.5 border border-slate-300 rounded">
            <option value="all">{t('전체', 'All')}</option>
            {Object.keys(ACTION_META).map(a => (
              <option key={a} value={a}>{actionLabel(a, t)}{stats.byAction[a] ? ` (${stats.byAction[a]})` : ''}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <Search size={12} className="text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('사용자·target·내용 검색', 'Search user / target / content')}
            className="flex-1 text-xs p-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500"
          />
          {search && <button onClick={() => setSearch('')} className="text-[11px] text-slate-400 hover:text-slate-600">×</button>}
        </div>
        <div className="text-[11px] text-slate-500 ml-auto">{filtered.length} / {logs.length}</div>
      </div>

      {/* 에러 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start">
          <AlertTriangle size={14} className="mr-1.5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* 목록 — 테이블 */}
      {!loading && filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">
          <Inbox size={32} className="mx-auto mb-2 text-slate-300" />
          {logs.length === 0
            ? t('기록된 활동이 없습니다. GAS의 CHANGE_LOG 시트가 비어있거나 액션 호출 전입니다.', 'No activity recorded yet.')
            : t('필터에 해당하는 항목이 없습니다.', 'No items match the filter.')}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-2 font-bold text-slate-600 w-8"></th>
                <th className="text-left p-2 font-bold text-slate-600 w-36"><Clock size={11} className="inline mr-1" />{t('시각', 'When')}</th>
                <th className="text-left p-2 font-bold text-slate-600 w-32"><User size={11} className="inline mr-1" />{t('사용자', 'User')}</th>
                <th className="text-left p-2 font-bold text-slate-600 w-32">{t('액션', 'Action')}</th>
                <th className="text-left p-2 font-bold text-slate-600 w-32"><Database size={11} className="inline mr-1" />{t('대상', 'Target')}</th>
                <th className="text-left p-2 font-bold text-slate-600">{t('변경 요약', 'Changes')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => {
                const rowKey = `${l.timestamp}_${i}`;
                const isOpen = expandedId === rowKey;
                return (
                  <React.Fragment key={rowKey}>
                    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                      <td className="p-2 text-center">
                        <button onClick={() => setExpandedId(isOpen ? null : rowKey)} className="text-slate-400 hover:text-slate-700">
                          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="p-2 text-slate-600 font-mono text-[11px]">{fmtDate(l.timestamp)}</td>
                      <td className="p-2 text-slate-800 font-bold">{l.user || '-'}</td>
                      <td className="p-2">
                        <span className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border ${actionColor(l.action)}`}>
                          {actionLabel(l.action, t)}
                        </span>
                      </td>
                      <td className="p-2 text-slate-700 font-mono text-[11px] break-all">{l.target || '-'}</td>
                      <td className="p-2 text-slate-600">
                        <div className="text-[11px] font-mono break-all"><span className="text-slate-400">before:</span> {previewJson(l.before)}</div>
                        <div className="text-[11px] font-mono break-all"><span className="text-emerald-600">after:</span> {previewJson(l.after)}</div>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-slate-100 bg-slate-50/30">
                        <td></td>
                        <td colSpan={5} className="p-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">{t('변경 전 (before)', 'Before')}</div>
                              <pre className="text-[11px] bg-white border border-slate-200 rounded p-2 whitespace-pre-wrap break-all max-h-64 overflow-auto font-mono">{l.before || '(empty)'}</pre>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-emerald-700 uppercase mb-1">{t('변경 후 (after)', 'After')}</div>
                              <pre className="text-[11px] bg-emerald-50 border border-emerald-200 rounded p-2 whitespace-pre-wrap break-all max-h-64 overflow-auto font-mono">{l.after || '(empty)'}</pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 안내 */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-[11px] text-indigo-900 flex items-start">
        <AlertTriangle size={12} className="mr-1.5 shrink-0 mt-0.5" />
        <div>
          <strong>{t('이력 저장 위치', 'Storage')}:</strong> {t('GAS 스프레드시트의 ', 'GAS spreadsheet ')}<code className="bg-white px-1 rounded">CHANGE_LOG</code>{t(' 시트. 10,000행 초과 시 오래된 절반 자동 정리.', ' sheet. Auto-prune oldest half when over 10,000 rows.')}
          <br/>
          <strong>{t('수집 대상', 'Captured')}:</strong> {t('UPDATE_PROJECT_BY_ID, UPDATE_PROJECTS, UPDATE_ISSUES, UPDATE_ENGINEERS 등 모든 mutation 액션 + 프로젝트 삭제(DELETE_PROJECT).', 'All UPDATE_* mutation actions + project deletes (DELETE_PROJECT).')}
        </div>
      </div>
    </div>
  );
});

export default AdminChangeLogView;
