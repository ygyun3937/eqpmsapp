import React, { useState, useEffect, useMemo, memo } from 'react';
import { Mail, RefreshCw, Filter, Search, Download, Loader, AlertTriangle, Inbox, User, Calendar, FileText, ExternalLink } from 'lucide-react';
import { callGoogleAction } from '../../utils/api';
import { exportToExcel } from '../../utils/export';

// 메일 종류 → 라벨/색상
const KIND_META = {
  trip_request: { ko: '출장 신청', en: 'Trip Request', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  trip_report:  { ko: '출장 보고', en: 'Trip Report',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  as_report:    { ko: 'AS 보고',   en: 'AS Report',    color: 'bg-purple-50 text-purple-700 border-purple-200' },
};

const fmtDate = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleString('sv-SE').slice(0, 16);
};

const AdminMailLogView = memo(function AdminMailLogView({ currentUser, t }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterKind, setFilterKind] = useState('all');
  const [filterSinceDays, setFilterSinceDays] = useState(30);
  const [search, setSearch] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  const fetchLogs = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    const result = await callGoogleAction('READ_MAIL_LOG', { limit: 500, sinceDays: filterSinceDays });
    if (result && result.status === 'success' && Array.isArray(result.logs)) {
      setLogs(result.logs);
    } else {
      setError((result && result.message) || t('이력 조회 실패', 'Failed to load logs'));
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
      if (filterKind !== 'all' && l['종류'] !== filterKind) return false;
      if (kw) {
        const hay = [l['수신'], l['참조'], l['제목'], l['작성자'], l['발송계정'], l['프로젝트명']].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [logs, filterKind, search]);

  const stats = useMemo(() => {
    const out = { total: logs.length, trip_request: 0, trip_report: 0, as_report: 0, today: 0, week: 0 };
    const dayMs = 86400000;
    const now = Date.now();
    logs.forEach(l => {
      if (l['종류'] === 'trip_request') out.trip_request++;
      else if (l['종류'] === 'trip_report') out.trip_report++;
      else if (l['종류'] === 'as_report') out.as_report++;
      const ts = new Date(l['발송시각']).getTime();
      if (!isNaN(ts)) {
        if (now - ts < dayMs) out.today++;
        if (now - ts < 7 * dayMs) out.week++;
      }
    });
    return out;
  }, [logs]);

  const handleExport = () => {
    const rows = filtered.map(l => ({
      sentAt: fmtDate(l['발송시각']),
      kind: KIND_META[l['종류']] ? KIND_META[l['종류']].ko : l['종류'],
      to: l['수신'] || '',
      cc: l['참조'] || '',
      subject: l['제목'] || '',
      author: l['작성자'] || '',
      sender: l['발송계정'] || '',
      projectName: l['프로젝트명'] || '',
      projectId: l['프로젝트 ID'] || ''
    }));
    exportToExcel(`MAK-PMS_메일이력_${new Date().toISOString().slice(0, 10)}`, [{
      name: '메일 발송 이력',
      rows,
      columns: [
        { header: '발송시각', key: 'sentAt' },
        { header: '종류', key: 'kind' },
        { header: '수신', key: 'to' },
        { header: '참조', key: 'cc' },
        { header: '제목', key: 'subject' },
        { header: '작성자(시스템)', key: 'author' },
        { header: '발송계정(Gmail)', key: 'sender' },
        { header: '프로젝트명', key: 'projectName' },
        { header: '프로젝트 ID', key: 'projectId' },
      ]
    }]);
  };

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
        {t('관리자만 접근할 수 있는 페이지입니다.', 'Admin only.')}
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-[fadeIn_0.3s_ease-in-out]">
      {/* 페이지 제목은 상위 탭 헤더 → 부제목 좌측, 액션 우측. */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">{t('출장 신청/보고 · AS 보고 메일의 발송 기록을 추적합니다.', 'Track sent Trip and AS report emails system-wide.')}</p>
        <div className="flex gap-2">
          <button onClick={fetchLogs} disabled={loading} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center">
            {loading ? <Loader size={13} className="animate-spin mr-1.5" /> : <RefreshCw size={13} className="mr-1.5" />}
            {t('새로고침', 'Refresh')}
          </button>
          <button onClick={handleExport} disabled={filtered.length === 0} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-bold inline-flex items-center">
            <Download size={13} className="mr-1.5" />{t('Excel', 'Excel')}
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-6 gap-2">
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">{t('전체', 'Total')}</div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">{t('오늘', 'Today')}</div>
          <div className="text-2xl font-bold text-blue-700">{stats.today}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase">{t('7일', '7d')}</div>
          <div className="text-2xl font-bold text-blue-700">{stats.week}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-indigo-700 uppercase">{t('출장 신청', 'Trip Req')}</div>
          <div className="text-2xl font-bold text-indigo-700">{stats.trip_request}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase">{t('출장 보고', 'Trip Rpt')}</div>
          <div className="text-2xl font-bold text-emerald-700">{stats.trip_report}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-purple-700 uppercase">{t('AS 보고', 'AS Rpt')}</div>
          <div className="text-2xl font-bold text-purple-700">{stats.as_report}</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter size={13} className="text-slate-500" />
          <select value={filterSinceDays} onChange={(e) => setFilterSinceDays(Number(e.target.value))} className="text-xs p-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500">
            <option value={7}>{t('최근 7일', 'Last 7 days')}</option>
            <option value={30}>{t('최근 30일', 'Last 30 days')}</option>
            <option value={90}>{t('최근 90일', 'Last 90 days')}</option>
            <option value={365}>{t('최근 1년', 'Last 1 year')}</option>
            <option value={0}>{t('전체 기간', 'All time')}</option>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <select value={filterKind} onChange={(e) => setFilterKind(e.target.value)} className="text-xs p-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500">
            <option value="all">{t('모든 종류', 'All kinds')}</option>
            <option value="trip_request">{t('출장 신청', 'Trip Request')}</option>
            <option value="trip_report">{t('출장 보고', 'Trip Report')}</option>
            <option value="as_report">{t('AS 보고', 'AS Report')}</option>
          </select>
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-[200px]">
          <Search size={13} className="text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('수신/제목/작성자/프로젝트 검색', 'Search recipient/subject/author/project')}
            className="flex-1 text-xs p-1.5 border border-slate-200 rounded-md focus:outline-none focus:border-blue-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-bold">{filtered.length}{t('건', '')}</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start">
          <AlertTriangle size={13} className="mr-1.5 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* 테이블 */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-slate-500">
            <Loader size={24} className="animate-spin mx-auto mb-2" />
            {t('이력 로드 중...', 'Loading...')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Inbox size={28} className="mx-auto mb-2 text-slate-300" />
            {t('표시할 메일 이력이 없습니다.', 'No mail history.')}
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">{t('발송시각', 'Sent')}</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">{t('종류', 'Kind')}</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">{t('수신/참조', 'To/Cc')}</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">{t('제목', 'Subject')}</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">{t('작성자', 'Author')}</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">{t('발송계정', 'Sender')}</th>
                  <th className="px-3 py-2 text-left font-bold text-slate-600">{t('프로젝트', 'Project')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, idx) => {
                  const meta = KIND_META[l['종류']];
                  return (
                    <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-700 whitespace-nowrap font-mono text-[11px]">{fmtDate(l['발송시각'])}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta ? meta.color : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {meta ? t(meta.ko, meta.en) : (l['종류'] || '-')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[240px]">
                        <div className="truncate" title={l['수신']}>{l['수신'] || '-'}</div>
                        {l['참조'] && <div className="truncate text-[10px] text-slate-500" title={l['참조']}>cc: {l['참조']}</div>}
                      </td>
                      <td className="px-3 py-2 font-bold text-slate-800 max-w-[300px]">
                        <div className="truncate" title={l['제목']}>{l['제목']}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div className="flex items-center"><User size={9} className="mr-1 text-slate-400" />{l['작성자'] || '-'}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-700 text-[10px] font-mono">
                        {l['발송계정'] || <span className="text-slate-400 italic">{t('시스템', 'system')}</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-700 max-w-[200px]">
                        <div className="truncate" title={l['프로젝트명']}>{l['프로젝트명'] || '-'}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-[11px] text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-start">
        <AlertTriangle size={11} className="mr-1.5 mt-0.5 shrink-0" />
        <div>
          {t('이 페이지는 ADMIN 권한자만 접근할 수 있습니다. 메일 이력은 GAS 백엔드의 MAIL_LOG 시트에 자동 기록되며, 시스템 외부에선 보이지 않습니다.',
             'This page is ADMIN-only. Mail history is stored in the MAIL_LOG sheet on the GAS backend.')}
        </div>
      </div>
    </div>
  );
});

export default AdminMailLogView;
