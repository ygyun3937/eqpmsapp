import React, { memo, useState } from 'react';
import { Users, HardHat, Building, UserCircle, User, MapPin, Edit, Trash, AlertTriangle, XCircle, Download, Plane, ShieldAlert, Calendar, Home, IdCard, ShieldCheck, CheckCircle, History, BarChart3, X, TrendingUp } from 'lucide-react';
import StatCard from '../common/StatCard';
import { exportToExcel } from '../../utils/export';
import { getCurrentTrip } from '../../utils/calc';
import TripStatsSection from './TripStatsSection';

const ResourceListView = memo(function ResourceListView({ engineers, projects, issues, getStatusColor, TODAY, onAddClick, onEditClick, onManageCertificates, onShowActivity, onDeleteClick, currentUser, t }) {
  const [heatmapOpen, setHeatmapOpen] = useState(false);
  const [viewMode, setViewMode] = useState('availability'); // 'availability' | 'stats'

  const checkExpiry = (dateStr) => {
    if (!dateStr) return { state: 'none', daysLeft: null };
    const exp = new Date(dateStr);
    if (isNaN(exp)) return { state: 'none', daysLeft: null };
    const diff = Math.floor((exp - TODAY) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { state: 'expired', daysLeft: diff };
    if (diff <= 30) return { state: 'warning', daysLeft: diff };
    return { state: 'ok', daysLeft: diff };
  };

  // 엔지니어의 자격 상태 집계
  const summarizeCerts = (eng) => {
    const cats = [
      { key: 'badges', label: t('출입증', 'Badges') },
      { key: 'safetyTrainings', label: t('안전교육', 'Safety') },
      { key: 'visas', label: t('비자', 'Visas') }
    ];
    const issues = []; // 만료/임박만
    let totalCount = 0;
    let okCount = 0;
    cats.forEach(cat => {
      const list = eng[cat.key] || [];
      list.forEach(item => {
        totalCount++;
        const status = checkExpiry(item.expiry);
        if (status.state === 'expired' || status.state === 'warning') {
          issues.push({ category: cat.label, catKey: cat.key, item, status });
        } else if (status.state === 'ok') {
          okCount++;
        }
        // 비자: 상태가 '필요' 또는 '만료'면 이슈로
        if (cat.key === 'visas' && (item.status === '필요' || item.status === '만료')) {
          if (!issues.find(x => x.item.id === item.id)) {
            issues.push({ category: cat.label, catKey: cat.key, item, status: { state: 'expired' } });
          }
        }
      });
    });
    return { issues, totalCount, okCount };
  };

  const hasIssue = (eng) => summarizeCerts(eng).issues.length > 0;
  const warningCount = engineers.filter(hasIssue).length;

  const projectMap = {};
  (projects || []).forEach(p => { projectMap[p.id] = p; });

  const getAssignedProjects = (eng) => {
    if (Array.isArray(eng.assignedProjectIds) && eng.assignedProjectIds.length > 0) {
      return eng.assignedProjectIds.map(id => projectMap[id]).filter(p => p && p.status !== '완료');
    }
    return (projects || []).filter(p => p.manager && eng.name && p.manager.includes(eng.name.split(' ')[0]) && p.status !== '완료');
  };

  const handleExport = () => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    // 1. 엔지니어 리스트 (가용성 컬럼 추가)
    const rows = engineers.map(e => {
      const trip = getCurrentTrip(e, projects);
      const tripText = !trip ? '본사 대기 (가용)'
        : trip.state === 'onsite' ? `현장 파견 (${trip.site || '-'}, ~${trip.returnDate}, 복귀 ${trip.daysLeft}일 전)`
        : `출장 예정 (${trip.site || '-'}, ${trip.departureDate}, 출발 ${trip.daysUntil}일 전)`;
      const availability = !trip ? '가용' : (trip.state === 'onsite' ? '현장 파견' : '출장 예정');
      const assigned = getAssignedProjects(e).map(p => p.name).join(' / ');
      const fmtCerts = (list) => (list || []).map(c => `${c.issuer || c.country || ''}${c.type ? `(${c.type})` : ''}${c.expiry ? ` ~${c.expiry}` : ''}${c.status ? ` [${c.status}]` : ''}`).join(' / ') || '-';
      return {
        id: e.id, name: e.name, grade: e.grade || '-', dept: e.dept,
        availability,
        tripStatus: tripText, manualStatus: e.status,
        currentSite: e.currentSite || '-',
        badges: fmtCerts(e.badges),
        safetyTrainings: fmtCerts(e.safetyTrainings),
        visas: fmtCerts(e.visas),
        assignedProjects: assigned || '-'
      };
    });

    // 2. 가용 인력 풀 (출장 일정 없는 엔지니어 별도 시트)
    const poolRows = engineers
      .filter(e => !getCurrentTrip(e, projects))
      .map(e => ({
        id: e.id, name: e.name, grade: e.grade || '-', dept: e.dept || '-',
        currentSite: e.currentSite || '-',
        manualStatus: e.status || '본사 대기',
        assignedProjects: getAssignedProjects(e).map(p => p.name).join(' / ') || '-'
      }));

    // 3. 8주 가용성 히트맵 (engineer × week)
    const today0 = new Date(TODAY);
    today0.setHours(0, 0, 0, 0);
    const dow = today0.getDay();
    const weekStart = new Date(today0);
    weekStart.setDate(today0.getDate() - (dow === 0 ? 6 : dow - 1));
    const heatmapWeeks = [];
    for (let i = 0; i < 8; i++) {
      const start = new Date(weekStart);
      start.setDate(weekStart.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      heatmapWeeks.push({ start, end, key: `w${i + 1}`, header: `${i + 1}주차 (${start.getMonth() + 1}/${start.getDate()}~${end.getDate()})` });
    }
    const heatmapRows = engineers.map(e => {
      const allTrips = (projects || []).flatMap(p => (p.trips || []).filter(tr => tr.engineerId === e.id).map(tr => ({ ...tr, _project: p })));
      const row = { name: e.name, grade: e.grade || '-', dept: e.dept || '-', total: 0 };
      heatmapWeeks.forEach(w => {
        let days = 0;
        const sites = new Set();
        allTrips.forEach(tr => {
          const ds = new Date(tr.departureDate);
          const dr = new Date(tr.returnDate);
          if (isNaN(ds) || isNaN(dr)) return;
          const oStart = ds > w.start ? ds : w.start;
          const oEnd = dr < w.end ? dr : w.end;
          const d = Math.floor((oEnd - oStart) / DAY_MS) + 1;
          if (d > 0) {
            days += d;
            if (tr.site) sites.add(tr.site);
            else if (tr._project?.name) sites.add(tr._project.name);
          }
        });
        days = Math.min(7, days);
        row[w.key] = days > 0 ? `${days}일${sites.size > 0 ? ' (' + Array.from(sites).join('/') + ')' : ''}` : '-';
        row.total += days;
      });
      row.total = `${row.total}일`;
      return row;
    });
    const heatmapColumns = [
      { header: '엔지니어', key: 'name' },
      { header: '직급', key: 'grade' },
      { header: '부서', key: 'dept' },
      ...heatmapWeeks.map(w => ({ header: w.header, key: w.key })),
      { header: '8주 합계', key: 'total' }
    ];

    exportToExcel('엔지니어_리스트', [
      {
        name: '1.엔지니어 리스트',
        rows,
        columns: [
          { header: 'ID', key: 'id' }, { header: '이름', key: 'name' }, { header: '직급', key: 'grade' },
          { header: '부서', key: 'dept' },
          { header: '가용성', key: 'availability' },
          { header: '출장 상태', key: 'tripStatus' }, { header: '수동 상태', key: 'manualStatus' },
          { header: '현재 위치', key: 'currentSite' },
          { header: '출입증', key: 'badges' }, { header: '안전교육', key: 'safetyTrainings' }, { header: '비자', key: 'visas' },
          { header: '배정 프로젝트', key: 'assignedProjects' }
        ]
      },
      {
        name: '2.가용 인력 풀',
        rows: poolRows,
        columns: [
          { header: 'ID', key: 'id' }, { header: '이름', key: 'name' }, { header: '직급', key: 'grade' },
          { header: '부서', key: 'dept' }, { header: '현재 위치', key: 'currentSite' },
          { header: '수동 상태', key: 'manualStatus' }, { header: '배정 프로젝트', key: 'assignedProjects' }
        ]
      },
      {
        name: '3.8주 가용성 히트맵',
        rows: heatmapRows,
        columns: heatmapColumns
      }
    ]);
  };

  // 비자 통계
  const visaIssueCount = engineers.filter(e => (e.visas || []).some(v => v.status === '필요' || v.status === '만료')).length;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold text-slate-800">{t('인력 및 리소스 관리', 'Resource Management')}</h1></div>
        <div className="flex items-center space-x-2">
          {viewMode === 'availability' && (
            <button
              onClick={() => setHeatmapOpen(true)}
              className="flex items-center bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors shadow-sm"
              title={t('다음 8주 가용성 + 출장 부하를 한눈에', '8-week availability + trip load')}
            >
              <BarChart3 size={16} className="mr-1.5" /> {t('8주 가용성', '8-week View')}
            </button>
          )}
          {viewMode === 'availability' && (
            <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
              <Download size={16} className="mr-1.5" /> Excel
            </button>
          )}
          {currentUser.role === 'ADMIN' && viewMode === 'availability' && (
            <button onClick={onAddClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center transition-colors"><User className="mr-2" size={16}/> {t('엔지니어 추가', 'Add Engineer')}</button>
          )}
        </div>
      </div>

      {/* 탭 토글 — 가용성 / 출장 통계(HR) */}
      <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden text-sm shadow-sm">
        <button type="button" onClick={() => setViewMode('availability')} className={`px-4 py-2 font-bold inline-flex items-center ${viewMode === 'availability' ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
          <Users size={14} className="mr-1.5" />{t('가용성·현황', 'Availability')}
        </button>
        <button type="button" onClick={() => setViewMode('stats')} className={`px-4 py-2 font-bold inline-flex items-center ${viewMode === 'stats' ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
          <TrendingUp size={14} className="mr-1.5" />{t('출장 통계 (HR)', 'Trip Stats (HR)')}
        </button>
      </div>

      {viewMode === 'stats' && (
        <TripStatsSection engineers={engineers} projects={projects} t={t} />
      )}

      {viewMode === 'availability' && (<>
      {(() => {
        const tripMap = {};
        engineers.forEach(e => { tripMap[e.id] = getCurrentTrip(e, projects); });
        const onsiteEngs = engineers.filter(e => tripMap[e.id] && tripMap[e.id].state === 'onsite');
        const scheduledEngs = engineers.filter(e => tripMap[e.id] && tripMap[e.id].state === 'scheduled');
        const availableEngs = engineers.filter(e => !tripMap[e.id]);

        // 자격 이슈 모음 (출입증·안전교육 만료/임박)
        const certIssuesByEng = engineers.map(e => {
          const issues = [];
          [['badges', '출입증'], ['safetyTrainings', '안전교육']].forEach(([key, label]) => {
            (e[key] || []).forEach(item => {
              const st = checkExpiry(item.expiry);
              if (st.state === 'expired') issues.push({ kind: `${label} 만료`, name: item.issuer || item.country || item.type || '', expired: true, days: st.daysLeft });
              else if (st.state === 'warning') issues.push({ kind: `${label} 임박`, name: item.issuer || item.country || item.type || '', expired: false, days: st.daysLeft });
            });
          });
          return { eng: e, issues };
        }).filter(x => x.issues.length > 0);
        const visaIssueEngs = engineers.filter(e => (e.visas || []).some(v => v.status === '필요' || v.status === '만료'));

        // 사이트별 그룹 (현장 파견 중인 엔지니어만)
        const siteGroups = {};
        onsiteEngs.forEach(e => {
          const site = tripMap[e.id].site || (t('미지정', 'Unassigned'));
          if (!siteGroups[site]) siteGroups[site] = [];
          siteGroups[site].push({ eng: e, trip: tripMap[e.id] });
        });
        const siteEntries = Object.entries(siteGroups).sort((a, b) => b[1].length - a[1].length);

        // 출장 일정 정렬
        const scheduledSorted = [...scheduledEngs].sort((a, b) => tripMap[a.id].daysUntil - tripMap[b.id].daysUntil);
        const returningSoon = [...onsiteEngs]
          .filter(e => tripMap[e.id].daysLeft <= 30)
          .sort((a, b) => tripMap[a.id].daysLeft - tripMap[b.id].daysLeft);

        return (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard title={t('전체 엔지니어', 'Total')} value={engineers.length} icon={<Users size={22} className="text-blue-500"/>} />
              <StatCard title={t('가용 인력', 'Available')} value={availableEngs.length} icon={<Home size={22} className="text-emerald-500"/>} color={availableEngs.length > 0 ? 'border-emerald-200 bg-emerald-50' : ''} />
              <StatCard title={t('현장 파견 중', 'On Trip')} value={onsiteEngs.length} icon={<HardHat size={22} className="text-purple-500"/>} color={onsiteEngs.length > 0 ? 'border-purple-200 bg-purple-50' : ''} />
              <StatCard title={t('출장 예정', 'Scheduled')} value={scheduledEngs.length} icon={<Calendar size={22} className="text-blue-500"/>} color={scheduledEngs.length > 0 ? 'border-blue-200 bg-blue-50' : ''} />
              <StatCard title={t('자격 만료/임박', 'Cert. Issues')} value={warningCount} icon={<UserCircle size={22} className="text-red-500"/>} color={warningCount > 0 ? 'border-red-200 bg-red-50' : ''} />
              <StatCard title={t('비자 이슈', 'Visa Issues')} value={visaIssueCount} icon={<ShieldAlert size={22} className="text-amber-500"/>} color={visaIssueCount > 0 ? 'border-amber-200 bg-amber-50' : ''} />
            </div>

            {/* 한눈에 보기 — 3컬럼 그리드 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 현장별 인력 배치 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center">
                  <MapPin size={16} className="mr-2 text-purple-500" />
                  {t('현장별 인력 배치', 'By Site')}
                  <span className="ml-auto text-xs text-slate-500">{onsiteEngs.length}{t('명 파견 중', ' on-site')}</span>
                </h3>
                {siteEntries.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <Building size={28} className="mx-auto mb-2 text-slate-300" />
                    {t('현장 파견 인력이 없습니다.', 'No field dispatched.')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {siteEntries.map(([site, list]) => (
                      <div key={site} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-slate-800 flex items-center">
                            <MapPin size={12} className="mr-1 text-purple-400" />{site}
                          </span>
                          <span className="text-xs font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">{list.length}{t('명', '')}</span>
                        </div>
                        <div className="space-y-1">
                          {list.map(({ eng, trip }) => (
                            <div key={eng.id} className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-700">
                                {eng.name}{eng.grade ? ` ${eng.grade}` : ''}
                              </span>
                              <span className="text-slate-500">~{trip.returnDate} <span className="text-purple-600 font-bold">{t(`복귀 ${trip.daysLeft}일 전`, `Return in ${trip.daysLeft}d`)}</span></span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 출장 일정 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center">
                  <Calendar size={16} className="mr-2 text-blue-500" />
                  {t('출장 일정', 'Trip Schedule')}
                </h3>
                {(scheduledSorted.length === 0 && returningSoon.length === 0) ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <Calendar size={28} className="mx-auto mb-2 text-slate-300" />
                    {t('예정/복귀 임박 일정이 없습니다.', 'No upcoming trips or returns.')}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {scheduledSorted.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-blue-600 uppercase mb-1.5 flex items-center">
                          <Plane size={11} className="mr-1" />{t('출장 예정', 'Scheduled')} ({scheduledSorted.length})
                        </div>
                        <div className="space-y-1.5">
                          {scheduledSorted.map(e => {
                            const tr = tripMap[e.id];
                            const urgent = tr.daysUntil <= 7;
                            return (
                              <div key={e.id} className={`p-2 rounded-lg border ${urgent ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-800">
                                    {e.name}{e.grade ? ` ${e.grade}` : ''}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${urgent ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                    {t(`출발 ${tr.daysUntil}일 전`, `Departs in ${tr.daysUntil}d`)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center">
                                  <MapPin size={9} className="mr-0.5" />{tr.site || '-'} · {tr.departureDate}{t('부터', ' onwards')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {returningSoon.length > 0 && (
                      <div>
                        <div className="text-[10px] font-bold text-emerald-600 uppercase mb-1.5 flex items-center">
                          <Home size={11} className="mr-1" />{t('복귀 임박 (30일 이내)', 'Returning Soon')} ({returningSoon.length})
                        </div>
                        <div className="space-y-1.5">
                          {returningSoon.map(e => {
                            const tr = tripMap[e.id];
                            const urgent = tr.daysLeft <= 7;
                            return (
                              <div key={e.id} className={`p-2 rounded-lg border ${urgent ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-slate-800">
                                    {e.name}{e.grade ? ` ${e.grade}` : ''}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${urgent ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                    {t(`복귀 ${tr.daysLeft}일 전`, `Returns in ${tr.daysLeft}d`)}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center">
                                  <MapPin size={9} className="mr-0.5" />{tr.site || '-'} · {tr.returnDate}{t('까지', ' until')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 가용 인력 풀 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center">
                  <Home size={16} className="mr-2 text-emerald-500" />
                  {t('가용 인력 (출장 없음)', 'Available Pool')}
                  <span className="ml-auto text-xs text-slate-500">{availableEngs.length}{t('명', '')}</span>
                </h3>
                {availableEngs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <Users size={28} className="mx-auto mb-2 text-slate-300" />
                    {t('대기 중인 인력이 없습니다.', 'No engineers available.')}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {availableEngs.map(e => (
                      <div key={e.id} className="flex items-center justify-between p-2 rounded-lg border border-emerald-100 bg-emerald-50/50">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">{e.name?.charAt(0) || '?'}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-slate-800 truncate">
                              {e.name}{e.grade ? <span className="ml-1 text-[11px] text-slate-500 font-normal">{e.grade}</span> : null}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{e.dept || '-'}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">{t('대기', 'Idle')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 인력 알림 — 자격/비자 이슈 (풀 폭) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center">
                <AlertTriangle size={16} className="mr-2 text-red-500" />
                {t('인력 알림', 'Alerts')}
                <span className="ml-auto text-xs text-slate-500">{certIssuesByEng.length + visaIssueEngs.length}{t('건', '')}</span>
              </h3>
              {(certIssuesByEng.length === 0 && visaIssueEngs.length === 0) ? (
                <div className="text-center py-6 text-emerald-600 text-sm font-medium">
                  <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                  {t('모든 인력이 정상 상태입니다.', 'All engineers in good standing.')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                  {certIssuesByEng.map(({ eng: e, issues: certs }) => {
                    const worstExpired = certs.some(i => i.expired);
                    return (
                      <div key={`exp-${e.id}`} className={`p-2.5 rounded-lg border flex items-start gap-2 ${worstExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                        {worstExpired ? <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800">{e.name}{e.grade ? ` ${e.grade}` : ''} <span className="text-xs font-medium text-slate-500">· {e.dept || '-'}</span></div>
                          <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-2">
                            {certs.map((it, i) => (
                              <span key={i} className={it.expired ? 'text-red-700 font-bold' : 'text-amber-700 font-bold'}>
                                {it.kind}{it.name ? `(${it.name})` : ''} {it.expired ? `${Math.abs(it.days)}${t('일 경과', 'd over')}` : `D-${it.days}`}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {visaIssueEngs.map(e => {
                    const visaIssues = (e.visas || []).filter(v => v.status === '필요' || v.status === '만료');
                    return (
                      <div key={`visa-${e.id}`} className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 flex items-start gap-2">
                        <Plane size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-800">{e.name}{e.grade ? ` ${e.grade}` : ''} <span className="text-xs font-medium text-slate-500">· {e.dept || '-'}</span></div>
                          <div className="text-[11px] text-amber-700 font-bold flex flex-wrap gap-x-2">
                            {visaIssues.map((v, i) => (
                              <span key={i}>
                                {t('비자', 'Visa')}: {v.country || ''}{v.type ? ` ${v.type}` : ''} ({v.status}){v.expiry ? ` · ${v.expiry}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 8주 가용성 히트맵 — 모달 */}
            {heatmapOpen && (() => {
                const DAY_MS = 24 * 60 * 60 * 1000;
                const today0 = new Date(TODAY);
                today0.setHours(0, 0, 0, 0);
                const dow = today0.getDay();
                const weekStart = new Date(today0);
                weekStart.setDate(today0.getDate() - (dow === 0 ? 6 : dow - 1));
                const WEEKS = 8;
                const weeks = [];
                for (let i = 0; i < WEEKS; i++) {
                  const start = new Date(weekStart);
                  start.setDate(weekStart.getDate() + i * 7);
                  const end = new Date(start);
                  end.setDate(start.getDate() + 6);
                  weeks.push({ start, end, label: `${start.getMonth() + 1}/${start.getDate()}~${end.getDate()}` });
                }
                const rows = engineers.map(e => {
                  const allTrips = (projects || []).flatMap(p => (p.trips || []).filter(tr => tr.engineerId === e.id).map(tr => ({ ...tr, _project: p })));
                  const cells = weeks.map(w => {
                    let days = 0;
                    const overlappingTrips = [];
                    allTrips.forEach(tr => {
                      const ds = new Date(tr.departureDate);
                      const dr = new Date(tr.returnDate);
                      if (isNaN(ds) || isNaN(dr)) return;
                      const oStart = ds > w.start ? ds : w.start;
                      const oEnd = dr < w.end ? dr : w.end;
                      const d = Math.floor((oEnd - oStart) / DAY_MS) + 1;
                      if (d > 0) {
                        days += d;
                        overlappingTrips.push({ site: tr.site, project: tr._project?.name || '-', departureDate: tr.departureDate, returnDate: tr.returnDate });
                      }
                    });
                    return { days: Math.min(7, days), trips: overlappingTrips };
                  });
                  const totalLoad = cells.reduce((s, c) => s + c.days, 0);
                  return { engineer: e, cells, totalLoad };
                }).sort((a, b) => a.totalLoad - b.totalLoad);  // 부하 적은 (가용) 순으로
                const colorFor = (d) => {
                  if (d === 0) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  if (d <= 2) return 'bg-blue-100 text-blue-800 border-blue-200';
                  if (d <= 4) return 'bg-blue-300 text-white border-blue-400';
                  if (d <= 6) return 'bg-blue-500 text-white border-blue-600';
                  return 'bg-blue-700 text-white border-blue-800';
                };
                return (
                  <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={() => setHeatmapOpen(false)}>
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50 flex-shrink-0">
                        <div className="flex items-center">
                          <BarChart3 size={20} className="text-indigo-600 mr-2" />
                          <div>
                            <h2 className="text-lg font-bold text-indigo-800">{t('8주 가용성 히트맵', '8-week Availability Heatmap')}</h2>
                            <p className="text-xs text-indigo-600 mt-0.5">{t('이번 주 ~ 8주차 / 부하 적은 순으로 정렬', 'This week ~ wk 8 / sorted by least loaded')}</p>
                          </div>
                        </div>
                        <button onClick={() => setHeatmapOpen(false)} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
                      </div>
                      <div className="flex-1 overflow-auto p-5 bg-white">
                        {rows.length === 0 ? (
                          <div className="text-center py-10 text-sm text-slate-400 italic">{t('등록된 엔지니어가 없습니다.', 'No engineers.')}</div>
                        ) : (
                  <div className="overflow-x-auto">
                    <table className="text-[10px] w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left py-1 pr-2 font-bold text-slate-500 sticky left-0 bg-white min-w-[140px]">{t('엔지니어', 'Engineer')}</th>
                          {weeks.map((w, i) => (
                            <th key={i} className="px-0.5 py-1 font-bold text-slate-500 text-center min-w-[68px] whitespace-nowrap">
                              <div className="text-[9px] text-slate-400 font-normal leading-none mb-0.5">{i === 0 ? t('이번주', 'This wk') : `${i + 1}${t('주차', 'wk')}`}</div>
                              <div className="text-[10px]">{w.label}</div>
                            </th>
                          ))}
                          <th className="px-1 py-1 font-bold text-slate-500 text-center text-[10px] min-w-[40px]">{t('합계', 'Total')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(row => (
                          <tr key={row.engineer.id} className="border-t border-slate-100">
                            <td className="py-1 pr-2 sticky left-0 bg-white whitespace-nowrap">
                              <span className="font-bold text-slate-700">{row.engineer.name}</span>
                              {row.engineer.grade && <span className="ml-1 text-[9px] text-slate-400 font-normal">{row.engineer.grade}</span>}
                              {row.totalLoad === 0 && <span className="ml-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1 rounded">{t('가용', 'Free')}</span>}
                            </td>
                            {row.cells.map((cell, i) => {
                              const firstTrip = cell.trips[0];
                              // 출장 기간을 주차 안에서 보이는 범위로 클램프 (이번 주 안에 보이는 부분만)
                              let dateRange = '';
                              if (firstTrip) {
                                const week = weeks[i];
                                const ds = new Date(firstTrip.departureDate);
                                const dr = new Date(firstTrip.returnDate);
                                const oStart = ds > week.start ? ds : week.start;
                                const oEnd = dr < week.end ? dr : week.end;
                                const sM = oStart.getMonth() + 1;
                                const sD = oStart.getDate();
                                const eM = oEnd.getMonth() + 1;
                                const eD = oEnd.getDate();
                                dateRange = sM === eM ? `${sM}/${sD}~${eD}` : `${sM}/${sD}~${eM}/${eD}`;
                              }
                              const firstSite = firstTrip?.site || firstTrip?.project || '';
                              const siteShort = firstSite.length > 4 ? firstSite.slice(0, 4) : firstSite;
                              const moreSites = cell.trips.length > 1 ? `+${cell.trips.length - 1}` : '';
                              return (
                                <td key={i} className="px-0.5 py-0.5">
                                  <div className={`w-full h-10 rounded border flex flex-col items-center justify-center font-black leading-tight overflow-hidden ${colorFor(cell.days)}`}
                                    title={cell.trips.length > 0 ? cell.trips.map(tr => `${tr.site || tr.project} (${tr.departureDate}~${tr.returnDate})`).join('\n') : t('가용 (출장 없음)', 'Available (no trip)')}>
                                    {cell.days > 0 ? (
                                      <>
                                        <span className="text-[10px] tabular-nums">{dateRange}<span className="ml-0.5 text-[9px] font-bold opacity-80">({cell.days}{t('일', 'd')})</span>{moreSites && <span className="ml-0.5">{moreSites}</span>}</span>
                                        <span className="text-[8px] opacity-90 truncate max-w-full px-0.5 font-bold">{siteShort}</span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] opacity-60">·</span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                            <td className="px-1 py-0.5 text-center text-[10px] font-black text-slate-700">{row.totalLoad}{t('일', 'd')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center gap-2 mt-3 text-[10px] flex-wrap">
                      <span className="text-slate-500 font-bold">{t('범례', 'Legend')}:</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-emerald-100"></span>0{t('일 (가용)', 'd (free)')}</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-blue-100"></span>1-2</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-blue-300"></span>3-4</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-blue-500"></span>5-6</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border bg-blue-700"></span>7</span>
                    </div>
                  </div>
                        )}
                      </div>
                      <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50 flex-shrink-0">
                        <button onClick={() => setHeatmapOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">{t('닫기', 'Close')}</button>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </>
        );
      })()}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('이름 / 소속', 'Name/Dept')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('출장 상태', 'Trip Status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('진행중인 배정 프로젝트', 'Assigned Projects')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('자격/만료 (클릭하여 관리)', 'Certifications')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('관리', 'Manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {engineers.map((eng) => {
              const assignedPrjs = getAssignedProjects(eng);
              const trip = getCurrentTrip(eng, projects);
              const certs = summarizeCerts(eng);
              const canManageCerts = currentUser.role === 'ADMIN' || currentUser.role === 'PM';

              const manualCls = eng.status === '현장 파견' ? 'bg-purple-50 border-purple-200 text-purple-700'
                : eng.status === '본사 복귀' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600';

              return (
                <tr key={eng.id} className="hover:bg-slate-50 transition-colors align-middle">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mr-3">{eng.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center">
                          {eng.name}
                          {eng.grade && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{eng.grade}</span>}
                        </div>
                        <div className="text-xs text-slate-500">{eng.dept || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {trip ? (
                        <>
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded border ${trip.state === 'onsite' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                            {trip.state === 'onsite' ? <HardHat size={11} className="mr-1" /> : <Calendar size={11} className="mr-1" />}
                            {trip.label}
                          </span>
                          <span className="text-[10px] text-slate-600 flex items-center">
                            <MapPin size={10} className="mr-1 text-slate-400" />
                            {trip.site} · {trip.state === 'onsite' ? `~${trip.returnDate} (${t(`복귀 ${trip.daysLeft}일 전`, `Return in ${trip.daysLeft}d`)})` : `${trip.departureDate}부터 (${t(`출발 ${trip.daysUntil}일 전`, `Depart in ${trip.daysUntil}d`)})`}
                          </span>
                          <span className="text-[9px] text-slate-400">{trip.projectName}</span>
                        </>
                      ) : (
                        <>
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded border ${manualCls}`}>
                            <Home size={11} className="mr-1" />{eng.status || '본사 대기'}
                          </span>
                          {eng.currentSite && (
                            <span className="text-[10px] text-slate-500 flex items-center"><MapPin size={10} className="mr-1 text-slate-400" />{eng.currentSite}</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {assignedPrjs.length === 0 ? (
                      <span className="text-xs text-slate-400">-</span>
                    ) : (
                      <div className={`space-y-1 ${assignedPrjs.length > 3 ? 'max-h-28 overflow-y-auto pr-1' : ''}`}>
                        {assignedPrjs.map(p => {
                          const fmt = (v) => v ? String(v).split('T')[0] : '-';
                          return (
                            <div key={p.id} className="text-xs bg-blue-50 border border-blue-100 px-2 py-1 rounded flex items-center gap-2 min-w-0">
                              <span className="font-bold text-blue-700 truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal whitespace-nowrap shrink-0">{fmt(p.startDate)} ~ {fmt(p.dueDate)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => canManageCerts && onManageCertificates && onManageCertificates(eng)}
                      disabled={!canManageCerts}
                      className={`text-left p-2 -m-2 rounded-lg transition-colors w-full ${canManageCerts ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default'}`}
                      title={canManageCerts ? t('클릭하여 자격 정보 관리', 'Click to manage') : ''}
                    >
                      {certs.totalCount === 0 ? (
                        <div className="flex items-center text-xs text-slate-400">
                          <ShieldCheck size={14} className="mr-1.5" />
                          {t('등록된 자격 없음 (클릭하여 추가)', 'No certs (click to add)')}
                        </div>
                      ) : certs.issues.length === 0 ? (
                        <div className="flex items-center text-xs text-emerald-700">
                          <CheckCircle size={14} className="mr-1.5 text-emerald-500" />
                          <span className="font-bold">{t(`정상 ${certs.totalCount}건`, `${certs.totalCount} OK`)}</span>
                          {canManageCerts && <Edit size={10} className="ml-1.5 text-slate-300" />}
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {certs.issues.map(issue => {
                            const isExpired = issue.status.state === 'expired';
                            const cls = isExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700';
                            const Icon = isExpired ? XCircle : AlertTriangle;
                            const dayLabel = issue.status.daysLeft != null
                              ? (isExpired ? `${Math.abs(issue.status.daysLeft)}일 경과` : `D-${issue.status.daysLeft}`)
                              : '';
                            return (
                              <div key={`${issue.catKey}-${issue.item.id}`} className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1.5 ${cls}`}>
                                <Icon size={11} className="shrink-0" />
                                <span className="font-bold truncate">{issue.category}</span>
                                <span className="truncate">{issue.item.issuer || issue.item.country || ''}{issue.item.type ? `/${issue.item.type}` : ''}{issue.item.status && issue.catKey === 'visas' ? ` (${issue.item.status})` : ''}</span>
                                {dayLabel && <span className="ml-auto font-bold shrink-0">{dayLabel}</span>}
                              </div>
                            );
                          })}
                          {certs.okCount > 0 && (
                            <div className="text-[10px] text-slate-500 px-2 mt-1">
                              + {t(`정상 ${certs.okCount}건`, `${certs.okCount} OK`)}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="inline-flex items-center gap-1.5">
                      {onShowActivity && currentUser.role !== 'CUSTOMER' && (
                        <button onClick={() => onShowActivity(eng)} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200 transition-colors" title={t('활동 이력 보기', 'View activity history')}>
                          <History size={13} className="mr-1" />{t('이력', 'History')}
                        </button>
                      )}
                      {currentUser.role === 'ADMIN' && (
                        <>
                          <button onClick={() => onEditClick(eng)} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition-colors" title={t('수정', 'Edit')}>
                            <Edit size={13} className="mr-1" />{t('수정', 'Edit')}
                          </button>
                          <button onClick={() => onDeleteClick(eng)} className="inline-flex items-center px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold border border-red-200 transition-colors" title={t('삭제', 'Delete')}>
                            <Trash size={13} className="mr-1" />{t('삭제', 'Delete')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>)}
    </div>
  );
});

export default ResourceListView;
