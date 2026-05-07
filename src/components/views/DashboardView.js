import React, { useMemo, memo, useState } from 'react';
import { Kanban, AlertCircle, CheckCircle, AlertTriangle, PieChart, BarChart3, Clock, Wrench, Download, CalendarDays, User, Building, TrendingUp, Users, Zap, MessageSquare, LifeBuoy, ExternalLink, MapPin, HardHat, ShieldAlert, Plane, UserCircle, XCircle, Calendar, Home, FileText, X, Search, Filter } from 'lucide-react';
import { TODAY } from '../../constants';
import { getCurrentTrip, fmtYMD } from '../../utils/calc';
import { PROJECT_PHASES } from '../../constants';
import StatCard from '../common/StatCard';
import SimpleDonutChart from '../common/SimpleDonutChart';
import SimpleBarChart from '../common/SimpleBarChart';
import { exportToExcel } from '../../utils/export';

const DashboardView = memo(function DashboardView({ projects: rawProjects, issues: rawIssues, engineers, getStatusColor, calcExp, calcAct, onProjectClick, onIssueClick, currentUser, t }) {
  const [issuePopupOpen, setIssuePopupOpen] = useState(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteFilterProject, setNoteFilterProject] = useState('all');
  const [noteFilterAuthor, setNoteFilterAuthor] = useState('all');
  const [noteShowAll, setNoteShowAll] = useState(false);
  const projects = useMemo(() => {
    if (currentUser && currentUser.role === 'CUSTOMER') {
      const allowed = Array.isArray(currentUser.assignedProjectIds) ? currentUser.assignedProjectIds : [];
      return (rawProjects || []).filter(p => allowed.includes(p.id));
    }
    return rawProjects || [];
  }, [rawProjects, currentUser]);
  const issues = useMemo(() => {
    if (currentUser && currentUser.role === 'CUSTOMER') {
      const allowed = Array.isArray(currentUser.assignedProjectIds) ? currentUser.assignedProjectIds : [];
      return (rawIssues || []).filter(i => allowed.includes(i.projectId));
    }
    return rawIssues || [];
  }, [rawIssues, currentUser]);
  const activeProjectsCount = projects.filter(p => p.status !== '완료').length;
  const unresolvedIssuesCount = issues.filter(i => i.status !== '조치 완료').length;

  const projectStats = [
    { label: t('진행중', 'In Progress'), value: projects.filter(p => p.status === '진행중').length, color: 'bg-blue-500' },
    { label: t('마감임박', 'Due Soon'), value: projects.filter(p => p.status === '마감임박').length, color: 'bg-amber-500' },
    { label: t('완료', 'Completed'), value: projects.filter(p => p.status === '완료').length, color: 'bg-emerald-500' },
  ];

  const issueStats = [
    { label: 'High', value: issues.filter(i => i.severity === 'High' && i.status !== '조치 완료').length, color: 'bg-red-500', svgColor: '#ef4444' },
    { label: 'Medium', value: issues.filter(i => i.severity === 'Medium' && i.status !== '조치 완료').length, color: 'bg-amber-500', svgColor: '#f59e0b' },
    { label: 'Low', value: issues.filter(i => i.severity === 'Low' && i.status !== '조치 완료').length, color: 'bg-emerald-500', svgColor: '#10b981' },
  ];

  const completedPrjs = projects.filter(p => p.status === '완료' && p.signOff);
  const avgLeadTime = completedPrjs.length ? (completedPrjs.reduce((acc, p) => acc + (new Date(p.signOff.date) - new Date(p.startDate)), 0) / completedPrjs.length / (1000*60*60*24)).toFixed(1) : 0;
  const resolvedIssues = issues.filter(i => i.status === '조치 완료');
  const avgMttr = resolvedIssues.length ? (resolvedIssues.length * 1.5).toFixed(1) : 0;

  const handleExportSummary = () => {
    // 1. 기본 통계
    const basic = [
      { category: '전체 프로젝트 수', count: projects.length },
      { category: '진행중 프로젝트 수', count: activeProjectsCount },
      { category: '완료된 프로젝트 수', count: projects.filter(p => p.status === '완료').length },
      { category: '전체 미해결 이슈', count: unresolvedIssuesCount },
      { category: 'High 등급 미해결 이슈', count: issues.filter(i => i.severity === 'High' && i.status !== '조치 완료').length },
      { category: '현장 파견 엔지니어 수', count: engineers.filter(e => e.status === '현장 파견').length },
      { category: '평균 셋업 Lead Time (일)', count: avgLeadTime },
      { category: '평균 이슈 해결 시간 MTTR (일)', count: avgMttr },
    ];

    // 2. 도메인별 현황
    const domainMap = {};
    projects.forEach(p => {
      if (!domainMap[p.domain]) domainMap[p.domain] = { domain: p.domain, total: 0, active: 0, completed: 0, issues: 0, leadTimes: [] };
      domainMap[p.domain].total++;
      if (p.status === '완료') {
        domainMap[p.domain].completed++;
        if (p.signOff) domainMap[p.domain].leadTimes.push((new Date(p.signOff.date) - new Date(p.startDate)) / (1000*60*60*24));
      } else domainMap[p.domain].active++;
    });
    issues.forEach(i => {
      const prj = projects.find(p => p.id === i.projectId);
      if (prj && domainMap[prj.domain]) domainMap[prj.domain].issues++;
    });
    const domainRows = Object.values(domainMap).map(d => ({
      domain: d.domain, total: d.total, active: d.active, completed: d.completed, issues: d.issues,
      avgLeadTime: d.leadTimes.length ? (d.leadTimes.reduce((a,b)=>a+b,0)/d.leadTimes.length).toFixed(1) : '-'
    }));

    // 3. 프로젝트별 상세
    const projectRows = projects.map(p => ({
      id: p.id, name: p.name, domain: p.domain, customer: p.customer, site: p.site,
      manager: p.manager, status: p.status, phase: PROJECT_PHASES[typeof p.phaseIndex === 'number' ? p.phaseIndex : 0] || '',
      startDate: p.startDate, dueDate: p.dueDate,
      expectedProgress: calcExp(p.startDate, p.dueDate) + '%',
      actualProgress: calcAct(p.tasks) + '%',
      hwVersion: p.hwVersion || '-', swVersion: p.swVersion || '-', fwVersion: p.fwVersion || '-'
    }));

    // 4. 지연 위험 프로젝트
    const delayRows = projects.filter(p => p.status !== '완료').map(p => {
      const exp = calcExp(p.startDate, p.dueDate);
      const act = calcAct(p.tasks);
      return { name: p.name, manager: p.manager, domain: p.domain, expected: exp + '%', actual: act + '%', gap: (exp - act) + '%p' };
    }).filter(r => parseInt(r.gap) >= 15).sort((a, b) => parseInt(b.gap) - parseInt(a.gap));

    // 5. 미해결 이슈
    const issueRows = issues.filter(i => i.status !== '조치 완료').map(i => ({
      id: i.id, projectName: i.projectName, title: i.title, severity: i.severity, status: i.status, author: i.author, date: i.date
    }));

    // 6. 진행중 고객 요청
    const requestRows = [];
    projects.forEach(p => {
      (p.customerRequests || []).forEach(r => {
        if (r.status !== '반영 완료' && r.status !== '반려') {
          requestRows.push({ projectName: p.name, requester: r.requester, urgency: r.urgency, status: r.status, content: r.content, date: r.date });
        }
      });
    });

    // 7. AS 내역
    const asRows = [];
    projects.forEach(p => {
      (p.asRecords || []).forEach(a => {
        asRows.push({ projectName: p.name, type: a.type, engineer: a.engineer, status: a.status, description: a.description, resolution: a.resolution, date: a.date });
      });
    });

    // 8. 담당자 변경 이력
    const mgrHistoryRows = [];
    projects.forEach(p => {
      (p.managerHistory || []).forEach(h => {
        mgrHistoryRows.push({ projectName: p.name, from: h.from, to: h.to, reason: h.reason || '-', changedBy: h.changedBy, date: h.date });
      });
    });

    // 9. 엔지니어 현황
    const fmtCerts = (list) => (list || []).map(c => `${c.issuer || c.country || ''}${c.type ? `(${c.type})` : ''}${c.expiry ? ` ~${c.expiry}` : ''}${c.status ? ` [${c.status}]` : ''}`).join(' / ') || '-';
    const engRows = engineers.map(e => ({
      id: e.id, name: e.name, grade: e.grade || '-', dept: e.dept, status: e.status, currentSite: e.currentSite || '-',
      badges: fmtCerts(e.badges),
      safety: fmtCerts(e.safetyTrainings),
      visas: fmtCerts(e.visas)
    }));

    // 10. 최근 활동 이력 (전체 프로젝트 통합, 최근 50건)
    const activityRows = [];
    projects.forEach(p => {
      (p.activityLog || []).forEach(log => {
        activityRows.push({ projectName: p.name, date: log.date, user: log.user, type: log.type, detail: log.detail });
      });
    });
    activityRows.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentActivity = activityRows.slice(0, 50);

    exportToExcel('EQ_PMS_종합리포트', [
      {
        name: '1.기본통계',
        rows: basic,
        columns: [{ header: '항목', key: 'category' }, { header: '값', key: 'count' }]
      },
      {
        name: '2.도메인별',
        rows: domainRows,
        columns: [
          { header: '도메인', key: 'domain' }, { header: '전체', key: 'total' }, { header: '진행중', key: 'active' },
          { header: '완료', key: 'completed' }, { header: '이슈 건수', key: 'issues' }, { header: '평균 Lead Time(일)', key: 'avgLeadTime' }
        ]
      },
      {
        name: '3.프로젝트별 상세',
        rows: projectRows,
        columns: [
          { header: 'ID', key: 'id' }, { header: '프로젝트명', key: 'name' }, { header: '도메인', key: 'domain' },
          { header: '고객사', key: 'customer' }, { header: '사이트', key: 'site' }, { header: '담당자', key: 'manager' },
          { header: '상태', key: 'status' }, { header: '현재 단계', key: 'phase' },
          { header: '시작일', key: 'startDate' }, { header: '납기일', key: 'dueDate' },
          { header: '계획 진행률', key: 'expectedProgress' }, { header: '실적 진행률', key: 'actualProgress' },
          { header: 'HW', key: 'hwVersion' }, { header: 'SW', key: 'swVersion' }, { header: 'FW', key: 'fwVersion' }
        ]
      },
      {
        name: '4.지연 위험',
        rows: delayRows,
        columns: [
          { header: '프로젝트명', key: 'name' }, { header: '담당자', key: 'manager' }, { header: '도메인', key: 'domain' },
          { header: '계획', key: 'expected' }, { header: '실적', key: 'actual' }, { header: '차이', key: 'gap' }
        ]
      },
      {
        name: '5.미해결 이슈',
        rows: issueRows,
        columns: [
          { header: 'ID', key: 'id' }, { header: '프로젝트', key: 'projectName' }, { header: '이슈 제목', key: 'title' },
          { header: '심각도', key: 'severity' }, { header: '상태', key: 'status' }, { header: '작성자', key: 'author' }, { header: '일자', key: 'date' }
        ]
      },
      {
        name: '6.진행중 고객요청',
        rows: requestRows,
        columns: [
          { header: '프로젝트', key: 'projectName' }, { header: '요청자', key: 'requester' }, { header: '긴급도', key: 'urgency' },
          { header: '상태', key: 'status' }, { header: '요청 내용', key: 'content' }, { header: '일자', key: 'date' }
        ]
      },
      {
        name: '7.AS 내역',
        rows: asRows,
        columns: [
          { header: '프로젝트', key: 'projectName' }, { header: 'AS 유형', key: 'type' }, { header: '담당 엔지니어', key: 'engineer' },
          { header: '상태', key: 'status' }, { header: '증상', key: 'description' }, { header: '조치 내용', key: 'resolution' }, { header: '일자', key: 'date' }
        ]
      },
      {
        name: '8.담당자 변경이력',
        rows: mgrHistoryRows,
        columns: [
          { header: '프로젝트', key: 'projectName' }, { header: '이전 담당자', key: 'from' }, { header: '새 담당자', key: 'to' },
          { header: '변경 사유', key: 'reason' }, { header: '변경자', key: 'changedBy' }, { header: '일자', key: 'date' }
        ]
      },
      {
        name: '9.엔지니어 현황',
        rows: engRows,
        columns: [
          { header: 'ID', key: 'id' }, { header: '이름', key: 'name' }, { header: '직급', key: 'grade' }, { header: '부서', key: 'dept' },
          { header: '수동 상태', key: 'status' }, { header: '현재 위치', key: 'currentSite' },
          { header: '출입증', key: 'badges' }, { header: '안전교육', key: 'safety' }, { header: '비자', key: 'visas' }
        ]
      },
      {
        name: '10.최근 활동 이력',
        rows: recentActivity,
        columns: [
          { header: '프로젝트', key: 'projectName' }, { header: '일시', key: 'date' }, { header: '작성자', key: 'user' },
          { header: '이벤트 유형', key: 'type' }, { header: '상세', key: 'detail' }
        ]
      }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('대시보드 종합 현황', 'Dashboard Overview')}</h1>
          <p className="text-slate-500 mt-1">{t('프로젝트 및 이슈의 전체적인 현황을 차트로 분석합니다.', 'Analyze the overall status of projects and issues.')}</p>
        </div>
        <button onClick={handleExportSummary} className="flex items-center bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm">
          <Download size={16} className="mr-2" /> {t('종합 리포트 다운로드 (Excel)', 'Full Report (Excel)')}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title={t('진행중 프로젝트', 'Active Projects')} value={activeProjectsCount} icon={<Kanban size={24} className="text-blue-500" />} />
        <StatCard
          title={t('미해결 이슈', 'Unresolved Issues')}
          value={unresolvedIssuesCount}
          icon={<AlertCircle size={24} className="text-amber-500" />}
          color="border-amber-200 bg-amber-50"
          onClick={unresolvedIssuesCount > 0 ? () => setIssuePopupOpen(true) : undefined}
          hint={unresolvedIssuesCount > 0 ? t('클릭하여 상세 보기', 'Click to view details') : ''}
        />
        <StatCard title={t('전체 프로젝트', 'Total Projects')} value={projects.length} icon={<CheckCircle size={24} className="text-emerald-500" />} />
      </div>

      {/* 미해결 이슈 상세 팝업 */}
      {issuePopupOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]"
          onClick={() => setIssuePopupOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-amber-50 shrink-0">
              <h3 className="text-base font-bold text-amber-800 flex items-center">
                <AlertTriangle size={18} className="mr-2" />
                {t('미해결 이슈 전체', 'All Unresolved Issues')}
                <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">{unresolvedIssuesCount}{t('건', '')}</span>
              </h3>
              <button onClick={() => setIssuePopupOpen(false)} className="text-amber-400 hover:text-amber-600 p-1"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
              {(() => {
                const list = issues.filter(i => i.status !== '조치 완료');
                if (list.length === 0) return (
                  <div className="text-center py-10 text-emerald-600 text-sm">
                    <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                    {t('미해결 이슈가 없습니다.', 'No unresolved issues.')}
                  </div>
                );
                // 심각도순 정렬
                const order = { High: 0, Medium: 1, Low: 2 };
                const sorted = [...list].sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9) || new Date(b.date) - new Date(a.date));
                return (
                  <div className="space-y-2">
                    {sorted.map(issue => {
                      const sevColor = issue.severity === 'High' ? 'bg-red-100 text-red-700 border-red-200'
                        : issue.severity === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200'
                        : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                      return (
                        <button
                          key={issue.id}
                          onClick={() => { setIssuePopupOpen(false); onIssueClick && onIssueClick(issue); }}
                          className="w-full text-left p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400">{issue.id}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sevColor}`}>{issue.severity}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getStatusColor(issue.status)}`}>{issue.status}</span>
                            <span className="ml-auto text-[10px] text-slate-400">{issue.date}</span>
                          </div>
                          <div className="text-sm font-bold text-slate-800 group-hover:text-blue-600 mb-1">{issue.title}</div>
                          <div className="flex items-center text-[11px] text-slate-500 gap-3">
                            <span className="flex items-center"><Building size={10} className="mr-1" />{issue.projectName}</span>
                            <span className="flex items-center"><User size={10} className="mr-1" />{issue.author}</span>
                            {(issue.comments || []).length > 0 && (
                              <span className="flex items-center"><MessageSquare size={10} className="mr-1" />{issue.comments.length}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-white shrink-0">
              <button onClick={() => setIssuePopupOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t('닫기', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><PieChart size={18} className="mr-2 text-indigo-500"/> {t('고급 분석 (Analytics)', 'Advanced Analytics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <div><span className="text-xs font-bold text-slate-500 block mb-1">{t('평균 셋업 소요 시간 (Lead Time)', 'Avg. Setup Lead Time')}</span><div className="text-2xl font-black text-slate-800">{avgLeadTime} <span className="text-sm font-medium text-slate-500">Days</span></div></div><Clock size={32} className="text-indigo-200" />
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <div><span className="text-xs font-bold text-slate-500 block mb-1">{t('이슈 평균 해결 시간 (MTTR)', 'Mean Time To Recovery (MTTR)')}</span><div className="text-2xl font-black text-slate-800">{avgMttr} <span className="text-sm font-medium text-slate-500">Days</span></div></div><Wrench size={32} className="text-indigo-200" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2 text-red-500"/> {t('미해결 이슈 중요도 분포', 'Issue Severity Distribution')}</h2>
          <div className="flex-1 flex items-center justify-center"><SimpleDonutChart data={issueStats} t={t} /></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><BarChart3 size={18} className="mr-2 text-blue-500"/> {t('프로젝트 상태별 현황', 'Project Status')}</h2>
          <div className="flex-1 flex items-end"><SimpleBarChart data={projectStats} /></div>
        </div>
      </div>

      {/* ============ 인력/리소스 요약 섹션 ============ */}
      {currentUser.role !== 'CUSTOMER' && (engineers || []).length > 0 && (() => {
        const engs = engineers || [];

        // 만료/위험 체크
        const checkExp = (dateStr) => {
          if (!dateStr) return { state: 'none', daysLeft: null };
          const d = new Date(dateStr);
          if (isNaN(d)) return { state: 'none', daysLeft: null };
          const diff = Math.floor((d - TODAY) / (1000 * 60 * 60 * 24));
          if (diff < 0) return { state: 'expired', daysLeft: diff };
          if (diff <= 30) return { state: 'warning', daysLeft: diff };
          return { state: 'ok', daysLeft: diff };
        };

        // 명시된 출장 일정만 사용 (자동 추론 X)
        const tripMap = {};
        engs.forEach(e => { tripMap[e.id] = getCurrentTrip(e, projects); });

        const onsiteEngs = engs.filter(e => tripMap[e.id] && tripMap[e.id].state === 'onsite');
        const scheduledEngs = engs.filter(e => tripMap[e.id] && tripMap[e.id].state === 'scheduled');
        const noTripEngs = engs.filter(e => !tripMap[e.id]);

        // 자격 이슈 모음 (출입증/안전교육 만료/임박)
        const certIssuesByEng = engs.map(e => {
          const issues = [];
          [['badges', '출입증'], ['safetyTrainings', '안전교육']].forEach(([key, label]) => {
            (e[key] || []).forEach(item => {
              const st = checkExp(item.expiry);
              if (st.state === 'expired') issues.push({ kind: `${label} 만료`, name: item.issuer || item.country || '', expired: true, days: st.daysLeft });
              else if (st.state === 'warning') issues.push({ kind: `${label} 임박`, name: item.issuer || item.country || '', expired: false, days: st.daysLeft });
            });
          });
          return { eng: e, issues };
        }).filter(x => x.issues.length > 0);

        const expiringEngs = certIssuesByEng.map(x => x.eng);
        // 비자 이슈
        const visaIssueEngs = engs.filter(e => (e.visas || []).some(v => v.status === '필요' || v.status === '만료'));

        // 사이트별 그룹 (등록된 출장 진행 중인 엔지니어만)
        const siteGroups = {};
        onsiteEngs.forEach(e => {
          const site = tripMap[e.id].site || '미지정';
          if (!siteGroups[site]) siteGroups[site] = [];
          siteGroups[site].push({ eng: e, trip: tripMap[e.id] });
        });
        const siteEntries = Object.entries(siteGroups).sort((a, b) => b[1].length - a[1].length);

        const scheduledSorted = [...scheduledEngs].sort((a, b) => tripMap[a.id].daysUntil - tripMap[b.id].daysUntil);
        const returningSoon = [...onsiteEngs]
          .filter(e => tripMap[e.id].daysLeft <= 30)
          .sort((a, b) => tripMap[a.id].daysLeft - tripMap[b.id].daysLeft);

        return (
          <div className="space-y-4 pt-2">
            <div className="flex items-center">
              <Users size={20} className="text-indigo-500 mr-2" />
              <h2 className="text-lg font-bold text-slate-800">{t('인력/리소스 현황', 'Resource Overview')}</h2>
              <span className="ml-2 text-xs text-slate-400">{t('현장 배치, 자격 만료, 비자 이슈를 한눈에', 'Field deployment, expiring credentials, visa issues')}</span>
            </div>

            {/* 통계 카드 5개 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard title={t('전체 엔지니어', 'Total')} value={engs.length} icon={<Users size={22} className="text-indigo-500" />} />
              <StatCard title={t('현장 파견 중', 'On Trip')} value={onsiteEngs.length} icon={<HardHat size={22} className="text-purple-500" />} color={onsiteEngs.length > 0 ? 'border-purple-200 bg-purple-50' : ''} />
              <StatCard title={t('출장 예정', 'Scheduled')} value={scheduledEngs.length} icon={<Calendar size={22} className="text-blue-500" />} color={scheduledEngs.length > 0 ? 'border-blue-200 bg-blue-50' : ''} />
              <StatCard title={t('일정 미등록', 'No Trip')} value={noTripEngs.length} icon={<Home size={22} className="text-emerald-500" />} />
              <StatCard title={t('자격/비자 이슈', 'Issues')} value={expiringEngs.length + visaIssueEngs.length} icon={<AlertTriangle size={22} className="text-red-500" />} color={(expiringEngs.length + visaIssueEngs.length) > 0 ? 'border-red-200 bg-red-50' : ''} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 현장별 인력 배치 (자동 추론 + 일정 정보) */}
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

              {/* 출장 일정 (예정 + 복귀 임박) */}
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
                                  <MapPin size={9} className="mr-0.5" />{tr.site || '-'} · {tr.departureDate}부터
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
                                  <MapPin size={9} className="mr-0.5" />{tr.site || '-'} · {tr.returnDate}까지
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

              {/* 자격 만료 / 비자 이슈 알림 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center">
                  <AlertTriangle size={16} className="mr-2 text-red-500" />
                  {t('인력 알림', 'Alerts')}
                </h3>
                {(expiringEngs.length === 0 && visaIssueEngs.length === 0) ? (
                  <div className="text-center py-6 text-emerald-600 text-sm font-medium">
                    <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                    {t('모든 인력이 정상 상태입니다.', 'All engineers in good standing.')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {certIssuesByEng.map(({ eng: e, issues }) => {
                      const worstExpired = issues.some(i => i.expired);
                      return (
                        <div key={`exp-${e.id}`} className={`p-2.5 rounded-lg border flex items-center gap-2 ${worstExpired ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                          {worstExpired ? <XCircle size={16} className="text-red-500 shrink-0" /> : <AlertTriangle size={16} className="text-amber-500 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800">{e.name}{e.grade ? ` ${e.grade}` : ''} <span className="text-xs font-medium text-slate-500">· {e.dept}</span></div>
                            <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-2">
                              {issues.map((it, i) => (
                                <span key={i} className={it.expired ? 'text-red-700 font-bold' : 'text-amber-700 font-bold'}>
                                  {it.kind}{it.name ? `(${it.name})` : ''} {it.expired ? `${Math.abs(it.days)}일 경과` : `D-${it.days}`}
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
                        <div key={`visa-${e.id}`} className="p-2.5 rounded-lg border border-amber-200 bg-amber-50 flex items-center gap-2">
                          <Plane size={16} className="text-amber-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold text-slate-800">{e.name}{e.grade ? ` ${e.grade}` : ''}</div>
                            <div className="text-[11px] text-amber-700 font-bold">
                              {visaIssues.map((v, i) => (
                                <span key={i} className="mr-2">
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
            </div>
          </div>
        );
      })()}

      {/* 전체 프로젝트 일정 타임라인 */}
      {projects.length > 0 && (() => {
        const safeDateLocal = (v) => {
          const ymd = fmtYMD(v);
          if (!ymd) return null;
          const d = new Date(ymd);
          return isNaN(d.getTime()) ? null : d;
        };
        const withDates = projects.filter(p => safeDateLocal(p.startDate) && safeDateLocal(p.dueDate));
        if (withDates.length === 0) return null;
        const sorted = [...withDates].sort((a, b) => safeDateLocal(a.startDate) - safeDateLocal(b.startDate));
        const minDate = new Date(Math.min(...sorted.map(p => safeDateLocal(p.startDate).getTime())));
        const maxDate = new Date(Math.max(...sorted.map(p => safeDateLocal(p.dueDate).getTime())));
        minDate.setDate(1); // 월 시작으로 맞춤
        maxDate.setMonth(maxDate.getMonth() + 1, 0); // 월 끝으로 맞춤
        const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        const today = new Date();
        const todayPercent = Math.max(0, Math.min(100, ((today - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100));

        // 월별 눈금 생성
        const months = [];
        const cursor = new Date(minDate);
        while (cursor <= maxDate) {
          const pos = ((cursor - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
          months.push({ label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`, pos });
          cursor.setMonth(cursor.getMonth() + 1);
        }

        const chartLeft = '35%';

        return (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
              <CalendarDays size={18} className="mr-2 text-indigo-500" />
              {t('전체 프로젝트 일정 현황', 'Project Schedule Overview')}
            </h2>

            <div className="overflow-x-auto">
              <div className="min-w-[800px] relative pt-6">

                {/* 오늘 라벨 — pt-6 안쪽에 배치(잘림 방지), 점선은 헤더~막대 끝까지 */}
                <div className="absolute z-20 pointer-events-none" style={{ left: `calc(${chartLeft} + ${todayPercent}% * 0.65)`, top: 0, bottom: 0 }}>
                  <div className="absolute top-0.5 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap border border-red-600 leading-tight">
                    ▼ {t('오늘', 'Today')}
                  </div>
                  <div className="absolute top-7 bottom-2 left-0 border-l-2 border-dashed border-red-500 -translate-x-1/2"></div>
                </div>

                {/* 월별 헤더 */}
                <div className="flex h-8 border-b border-slate-200 relative" style={{ marginLeft: chartLeft }}>
                  {months.map((m, i) => {
                    const next = months[i + 1];
                    const widthPct = next ? next.pos - m.pos : 100 - m.pos;
                    return (
                      <div key={i} className="absolute h-full" style={{ left: `${m.pos}%`, width: `${widthPct}%` }}>
                        <div className="sticky left-0 inline-block whitespace-nowrap text-[10px] font-bold text-slate-500 border-l border-slate-200 pl-1 pb-1 bg-white">{m.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* 테이블 헤더 */}
                <div className="flex h-6 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 mt-2" style={{ paddingRight: '65%' }}>
                  <div style={{ width: '40%' }} className="pl-4">{t('프로젝트', 'Project')}</div>
                  <div style={{ width: '20%' }} className="text-center">{t('현재 단계', 'Phase')}</div>
                  <div style={{ width: '20%' }} className="text-center">{t('담당자', 'Manager')}</div>
                  <div style={{ width: '20%' }} className="text-center">{t('진행률', 'Progress')}</div>
                </div>

                {/* 프로젝트 바 */}
                <div className="space-y-2 pt-3">
                  {sorted.map(prj => {
                    const pStart = safeDateLocal(prj.startDate);
                    const pDue = safeDateLocal(prj.dueDate);
                    const leftPercent = ((pStart - minDate) / (1000 * 60 * 60 * 24) / totalDays) * 100;
                    const widthPercent = ((pDue - pStart) / (1000 * 60 * 60 * 24) / totalDays) * 100;
                    const actual = calcAct(prj.tasks);
                    const isCompleted = prj.status === '완료';
                    const isDelayed = !isCompleted && actual < calcExp(prj.startDate, prj.dueDate);
                    const phase = PROJECT_PHASES[typeof prj.phaseIndex === 'number' ? prj.phaseIndex : 0] || '';

                    // 색상 팔레트: 완료(sage green) / 정상(teal) / 지연(coral)
                    const dotColor = isCompleted ? 'bg-emerald-300' : isDelayed ? 'bg-orange-400' : 'bg-teal-500';
                    const barColor = isCompleted ? 'bg-emerald-300' : isDelayed ? 'bg-orange-400' : 'bg-teal-500';
                    const progressColor = isCompleted ? 'text-emerald-600' : isDelayed ? 'text-orange-600' : 'text-teal-600';

                    return (
                      <div
                        key={prj.id}
                        onClick={() => onProjectClick && onProjectClick(prj.id)}
                        className={`flex items-center h-10 group transition-colors rounded ${onProjectClick ? 'cursor-pointer hover:bg-indigo-50' : 'hover:bg-slate-50/50'}`}
                        title={onProjectClick ? t('클릭하여 상세 보기', 'Click to view details') : ''}
                      >
                        {/* 왼쪽: 프로젝트 정보 (4열) */}
                        <div className="flex items-center min-w-0" style={{ width: chartLeft }}>
                          <div style={{ width: '40%' }} className="flex items-center min-w-0 pl-1">
                            <span className={`w-2.5 h-2.5 rounded-full mr-2 shrink-0 ${dotColor}`}></span>
                            <span className="text-sm font-semibold text-slate-800 truncate group-hover:text-indigo-700">{prj.name}</span>
                            {onProjectClick && <ExternalLink size={11} className="ml-1 text-slate-300 opacity-0 group-hover:opacity-100 shrink-0" />}
                          </div>
                          <div style={{ width: '20%' }} className="text-xs text-slate-600 text-center truncate px-1">
                            {phase}
                          </div>
                          <div style={{ width: '20%' }} className="text-xs text-slate-600 text-center truncate px-1">
                            {prj.manager || '-'}
                          </div>
                          <div style={{ width: '20%' }} className="text-center">
                            <span className={`text-sm font-bold ${progressColor}`}>{actual}%</span>
                          </div>
                        </div>

                        {/* 오른쪽: 간트 바 */}
                        <div className="relative h-full flex items-center" style={{ width: '65%' }}>
                          {months.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${m.pos}%` }}></div>
                          ))}
                          <div
                            className={`absolute h-5 rounded-sm transition-all hover:shadow-sm cursor-default ${barColor}`}
                            style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 1)}%` }}
                            title={`${fmtYMD(prj.startDate) || '미정'} ~ ${fmtYMD(prj.dueDate) || '미정'}`}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 범례 */}
                <div className="flex items-center mt-6 pt-4 border-t border-slate-100 space-x-6 text-xs text-slate-500">
                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-teal-500 mr-2"></span>{t('정상 진행', 'On Track')}</div>
                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-orange-400 mr-2"></span>{t('지연', 'Delayed')}</div>
                  <div className="flex items-center"><span className="w-4 h-2.5 rounded-sm bg-emerald-300 mr-2"></span>{t('완료', 'Completed')}</div>
                  <div className="flex items-center"><span className="w-px h-4 bg-orange-400 mr-2"></span>{t('오늘 기준선', 'Today')}</div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============ 고급 분석 섹션 ============ */}
      {projects.length > 0 && (() => {
        // 1. 도메인별 분석
        const domainStats = {};
        projects.forEach(p => {
          if (!domainStats[p.domain]) {
            domainStats[p.domain] = { total: 0, completed: 0, active: 0, issues: 0, leadTimes: [] };
          }
          domainStats[p.domain].total++;
          if (p.status === '완료') {
            domainStats[p.domain].completed++;
            if (p.signOff) {
              const days = (new Date(p.signOff.date) - new Date(p.startDate)) / (1000 * 60 * 60 * 24);
              domainStats[p.domain].leadTimes.push(days);
            }
          } else {
            domainStats[p.domain].active++;
          }
        });
        issues.forEach(i => {
          const prj = projects.find(p => p.id === i.projectId);
          if (prj && domainStats[prj.domain]) domainStats[prj.domain].issues++;
        });

        // 2. 프로젝트별 현황 (담당자 표시)
        const projectList = projects.map(p => ({
          id: p.id,
          name: p.name,
          manager: p.manager || '미지정',
          domain: p.domain,
          status: p.status,
          progress: calcAct(p.tasks),
          phase: PROJECT_PHASES[typeof p.phaseIndex === 'number' ? p.phaseIndex : 0] || ''
        })).sort((a, b) => b.progress - a.progress);

        // 3. 월별 이슈 트렌드 (최근 6개월)
        const today = new Date();
        const monthlyIssues = [];
        for (let i = 5; i >= 0; i--) {
          const target = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
          const count = issues.filter(iss => {
            const d = new Date(iss.date);
            return d >= target && d < nextMonth;
          }).length;
          monthlyIssues.push({ label: `${target.getMonth() + 1}월`, value: count, color: 'bg-indigo-400' });
        }

        // 4. 지연 위험 프로젝트
        const delayedProjects = projects
          .filter(p => p.status !== '완료')
          .map(p => ({ prj: p, expected: calcExp(p.startDate, p.dueDate), actual: calcAct(p.tasks) }))
          .filter(({ expected, actual }) => expected - actual >= 15)
          .sort((a, b) => (b.expected - b.actual) - (a.expected - a.actual));

        // 5. 진행중 고객 요청 (접수 + 검토중)
        const pendingRequests = [];
        projects.forEach(p => {
          (p.customerRequests || []).forEach(r => {
            if (r.status === '접수' || r.status === '검토중') {
              pendingRequests.push({ ...r, projectId: p.id, projectName: p.name });
            }
          });
        });
        pendingRequests.sort((a, b) => {
          const urgencyOrder = { High: 0, Medium: 1, Low: 2 };
          return (urgencyOrder[a.urgency] ?? 3) - (urgencyOrder[b.urgency] ?? 3);
        });

        // 6. 진행중 AS (접수 + 출동)
        const pendingAS = [];
        projects.forEach(p => {
          (p.asRecords || []).forEach(a => {
            if (a.status !== '완료') {
              pendingAS.push({ ...a, projectId: p.id, projectName: p.name, customer: p.customer });
            }
          });
        });
        pendingAS.sort((a, b) => {
          // 긴급출동 우선
          if (a.type === '긴급출동' && b.type !== '긴급출동') return -1;
          if (b.type === '긴급출동' && a.type !== '긴급출동') return 1;
          return new Date(b.date) - new Date(a.date);
        });

        return (
          <div className="space-y-6">
            {/* 섹션 제목 */}
            <div className="flex items-center pt-4">
              <TrendingUp size={20} className="text-indigo-500 mr-2" />
              <h2 className="text-lg font-bold text-slate-800">{t('고급 분석 (Advanced Analytics)', 'Advanced Analytics')}</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 도메인별 분석 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                  <Building size={16} className="mr-2 text-indigo-500" />
                  {t('도메인별 현황', 'By Domain')}
                </h3>
                <div className="space-y-3">
                  {Object.entries(domainStats).map(([domain, s]) => {
                    const avgLead = s.leadTimes.length ? (s.leadTimes.reduce((a, b) => a + b, 0) / s.leadTimes.length).toFixed(1) : '-';
                    return (
                      <div key={domain} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-bold text-slate-800">{domain}</span>
                          <span className="text-xs text-slate-500">{t('총', 'Total')} {s.total}{t('건', '')}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div><div className="text-slate-400">{t('진행', 'Active')}</div><div className="font-bold text-blue-600">{s.active}</div></div>
                          <div><div className="text-slate-400">{t('완료', 'Done')}</div><div className="font-bold text-emerald-600">{s.completed}</div></div>
                          <div><div className="text-slate-400">{t('이슈', 'Issues')}</div><div className="font-bold text-red-600">{s.issues}</div></div>
                          <div><div className="text-slate-400">{t('평균일', 'Avg Days')}</div><div className="font-bold text-slate-700">{avgLead}</div></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 프로젝트별 현황 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                  <Kanban size={16} className="mr-2 text-purple-500" />
                  {t('프로젝트별 진행 현황', 'By Project')}
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {projectList.map((p) => {
                    const isCompleted = p.status === '완료';
                    return (
                      <div key={p.id} className="flex items-center p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-100">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center mb-1">
                            <span className="text-sm font-bold text-slate-800 truncate">{p.name}</span>
                            <span className={`ml-2 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>{p.phase}</span>
                          </div>
                          <div className="text-xs text-slate-500 flex items-center">
                            <User size={10} className="mr-1" />{p.manager}
                            <span className="mx-1.5 text-slate-300">·</span>
                            <span className="text-slate-400">{p.domain}</span>
                          </div>
                        </div>
                        <div className="ml-3 shrink-0 w-20">
                          <div className="text-right mb-1">
                            <span className={`text-sm font-bold ${isCompleted ? 'text-emerald-600' : p.progress >= 70 ? 'text-teal-600' : p.progress >= 30 ? 'text-blue-600' : 'text-slate-600'}`}>{p.progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className={`h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400' : p.progress >= 70 ? 'bg-teal-500' : p.progress >= 30 ? 'bg-blue-500' : 'bg-slate-400'}`} style={{ width: `${p.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 월별 이슈 트렌드 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                  <BarChart3 size={16} className="mr-2 text-red-500" />
                  {t('월별 이슈 트렌드 (최근 6개월)', 'Issue Trend (Last 6 Months)')}
                </h3>
                <div className="h-40 flex items-end">
                  <SimpleBarChart data={monthlyIssues} />
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                  <span>{t('최고', 'Peak')}: <strong className="text-red-600">{Math.max(...monthlyIssues.map(m => m.value))}{t('건', '')}</strong></span>
                  <span>{t('평균', 'Avg')}: <strong className="text-slate-700">{(monthlyIssues.reduce((a, b) => a + b.value, 0) / monthlyIssues.length).toFixed(1)}{t('건', '')}</strong></span>
                  <span>{t('합계', 'Total')}: <strong className="text-slate-700">{monthlyIssues.reduce((a, b) => a + b.value, 0)}{t('건', '')}</strong></span>
                </div>
              </div>

              {/* 지연 위험 프로젝트 */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                  <Zap size={16} className="mr-2 text-orange-500" />
                  {t('지연 위험 프로젝트', 'Delay Risk Alert')}
                  <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold border border-orange-200">{delayedProjects.length}{t('건', '')}</span>
                </h3>
                {delayedProjects.length === 0 ? (
                  <div className="text-center py-10 text-emerald-600 text-sm font-medium">
                    <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
                    {t('모든 프로젝트가 정상 진행 중입니다', 'All projects on track')}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {delayedProjects.map(({ prj, expected, actual }) => {
                      const gap = expected - actual;
                      return (
                        <div key={prj.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-bold text-slate-800 truncate">{prj.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                <User size={10} className="inline mr-1" />{prj.manager || '-'} · {prj.domain}
                              </div>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded shrink-0 ml-2 ${gap >= 30 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>-{gap}%p</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                            <span>{t('계획', 'Plan')}: {expected}%</span>
                            <span>{t('실적', 'Actual')}: {actual}%</span>
                          </div>
                          <div className="relative w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div className="absolute top-0 left-0 h-1.5 bg-slate-400 opacity-40" style={{ width: `${expected}%` }}></div>
                            <div className="absolute top-0 left-0 h-1.5 bg-orange-500" style={{ width: `${actual}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 최근 공유 노트 — 전사 직원이 빠뜨리지 않도록 검색/필터 + 전체 내용 표시 */}
            {(() => {
              const allNotes = [];
              projects.forEach(p => {
                (p.notes || []).forEach(n => {
                  allNotes.push({
                    id: n.id, projectId: p.id, projectName: p.name,
                    author: n.author, text: n.text, date: n.date,
                    ts: Number(n.id) || 0
                  });
                });
              });
              allNotes.sort((a, b) => b.ts - a.ts);
              const projectOptions = Array.from(new Set(allNotes.map(n => n.projectName))).sort();
              const authorOptions = Array.from(new Set(allNotes.map(n => n.author).filter(Boolean))).sort();
              const q = noteSearch.trim().toLowerCase();
              const filtered = allNotes.filter(n => {
                if (noteFilterProject !== 'all' && n.projectName !== noteFilterProject) return false;
                if (noteFilterAuthor !== 'all' && n.author !== noteFilterAuthor) return false;
                if (q) {
                  const hay = `${n.text || ''} ${n.author || ''} ${n.projectName || ''}`.toLowerCase();
                  if (!hay.includes(q)) return false;
                }
                return true;
              });
              const visible = noteShowAll ? filtered : filtered.slice(0, 12);
              const hasFilter = noteSearch || noteFilterProject !== 'all' || noteFilterAuthor !== 'all';

              return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center">
                    <FileText size={16} className="mr-2 text-amber-500" />
                    {t('최근 공유 노트', 'Recent Shared Notes')}
                    <span className="ml-2 text-xs text-slate-400">{t('카드 클릭 시 해당 프로젝트의 노트 탭으로 이동', 'Click a card to jump to the project Notes tab')}</span>
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                      {hasFilter ? `${filtered.length} / ${allNotes.length}` : allNotes.length}{t('건', '')}
                    </span>
                  </h3>

                  {/* 필터 바 */}
                  {allNotes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 flex-1 min-w-[200px]">
                        <Search size={14} className="text-slate-400 mr-1.5 shrink-0" />
                        <input
                          type="text"
                          value={noteSearch}
                          onChange={(e) => setNoteSearch(e.target.value)}
                          placeholder={t('내용/작성자/프로젝트 검색...', 'Search content / author / project...')}
                          className="bg-transparent border-none outline-none text-xs w-full"
                        />
                        {noteSearch && (
                          <button onClick={() => setNoteSearch('')} className="text-slate-400 hover:text-slate-600 ml-1"><X size={12} /></button>
                        )}
                      </div>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <Filter size={12} className="text-slate-400 mr-1.5" />
                        <select
                          value={noteFilterProject}
                          onChange={(e) => setNoteFilterProject(e.target.value)}
                          className="text-xs bg-transparent border-none outline-none cursor-pointer text-slate-700 font-medium"
                        >
                          <option value="all">{t('전체 프로젝트', 'All Projects')}</option>
                          {projectOptions.map(p => (<option key={p} value={p}>{p}</option>))}
                        </select>
                      </div>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <User size={12} className="text-slate-400 mr-1.5" />
                        <select
                          value={noteFilterAuthor}
                          onChange={(e) => setNoteFilterAuthor(e.target.value)}
                          className="text-xs bg-transparent border-none outline-none cursor-pointer text-slate-700 font-medium"
                        >
                          <option value="all">{t('전체 작성자', 'All Authors')}</option>
                          {authorOptions.map(a => (<option key={a} value={a}>{a}</option>))}
                        </select>
                      </div>
                      {hasFilter && (
                        <button
                          onClick={() => { setNoteSearch(''); setNoteFilterProject('all'); setNoteFilterAuthor('all'); }}
                          className="text-[11px] font-bold text-slate-500 hover:text-slate-700 px-2 py-1 rounded transition-colors"
                        >
                          {t('필터 초기화', 'Clear filters')}
                        </button>
                      )}
                    </div>
                  )}

                  {allNotes.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <FileText size={28} className="mx-auto mb-2 text-slate-300" />
                      {t('등록된 공유 노트가 없습니다.', 'No shared notes yet.')}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <Search size={28} className="mx-auto mb-2 text-slate-300" />
                      {t('검색 조건에 맞는 공유 노트가 없습니다.', 'No notes match your filter.')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {visible.map(n => (
                        <button
                          key={`${n.projectId}-${n.id}`}
                          onClick={() => onProjectClick && onProjectClick(n.projectId, 'notes')}
                          className="text-left p-4 bg-amber-50 border border-amber-100 rounded-lg hover:border-amber-400 hover:bg-amber-100/50 transition-colors group flex flex-col"
                          title={t('클릭하여 공유 노트 탭으로 이동', 'Click to open Notes tab')}
                        >
                          <div className="flex items-center text-[11px] text-slate-500 mb-2 gap-2">
                            <span className="flex items-center font-bold text-slate-700 truncate"><Building size={11} className="mr-1 shrink-0" />{n.projectName}</span>
                            <span className="ml-auto shrink-0">{n.date}</span>
                          </div>
                          <p className="text-sm text-slate-800 whitespace-pre-wrap break-words mb-3 flex-1">{n.text}</p>
                          <div className="flex items-center text-[11px] text-slate-500 pt-2 border-t border-amber-200/60">
                            <User size={11} className="mr-1" /><span className="font-medium">{n.author}</span>
                            <span className="ml-auto flex items-center text-amber-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                              {t('노트 탭 열기', 'Open Notes')} <ExternalLink size={11} className="ml-1" />
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filtered.length > 12 && (
                    <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                      <button
                        onClick={() => setNoteShowAll(v => !v)}
                        className="text-xs font-bold text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-md hover:bg-amber-50 transition-colors"
                      >
                        {noteShowAll
                          ? t('접기', 'Collapse')
                          : t(`+${filtered.length - 12}건 더 보기`, `Show ${filtered.length - 12} more`)}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* 진행중 AS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                <LifeBuoy size={16} className="mr-2 text-purple-500" />
                {t('진행중 AS 내역', 'Active AS')}
                <span className="ml-auto text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold border border-purple-200">{pendingAS.length}{t('건', '')}</span>
              </h3>
              {pendingAS.length === 0 ? (
                <div className="text-center py-8 text-emerald-600 text-sm font-medium">
                  <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                  {t('진행중인 AS가 없습니다', 'No active AS')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {pendingAS.map(a => {
                    const typeColor = a.type === '긴급출동' ? 'bg-red-100 text-red-700 border-red-200'
                      : a.type === '정기점검' ? 'bg-blue-100 text-blue-700 border-blue-200'
                        : a.type === '부품교체' ? 'bg-amber-100 text-amber-700 border-amber-200'
                          : a.type === '보증수리' ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200';
                    const statusColor = a.status === '출동' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                    return (
                      <button
                        key={`${a.projectId}-${a.id}`}
                        onClick={() => onProjectClick && onProjectClick(a.projectId)}
                        className="text-left p-3 bg-purple-50 border border-purple-100 rounded-lg hover:border-purple-300 hover:bg-purple-100/50 transition-colors group"
                      >
                        <div className="flex items-center flex-wrap gap-1.5 mb-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}>{a.type}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>{a.status}</span>
                          <span className="text-[10px] text-slate-500 ml-auto">{a.date}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 truncate mb-1 group-hover:text-purple-700 flex items-center">
                          {a.projectName}
                          {onProjectClick && <ExternalLink size={11} className="ml-1 text-slate-300 opacity-0 group-hover:opacity-100" />}
                        </div>
                        <div className="text-xs text-slate-500 mb-2 flex items-center gap-2">
                          <span className="flex items-center"><Building size={10} className="mr-1" />{a.customer}</span>
                          <span className="flex items-center"><User size={10} className="mr-1" />{a.engineer}</span>
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-2 whitespace-pre-wrap">{a.description}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 진행중 고객 요청 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center">
                <MessageSquare size={16} className="mr-2 text-cyan-500" />
                {t('진행중 고객 요청사항', 'Pending Customer Requests')}
                <span className="ml-auto text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold border border-cyan-200">{pendingRequests.length}{t('건', '')}</span>
              </h3>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-emerald-600 text-sm font-medium">
                  <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />
                  {t('처리 대기중인 요청이 없습니다', 'No pending requests')}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                  {pendingRequests.map(r => {
                    const urgencyColor = r.urgency === 'High' ? 'bg-red-100 text-red-700 border-red-200' : r.urgency === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                    const statusColor = r.status === '검토중' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                    return (
                      <div key={r.id} className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
                        <div className="flex items-center flex-wrap gap-1.5 mb-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${urgencyColor}`}>{r.urgency}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>{r.status}</span>
                          <span className="text-[10px] text-slate-500 ml-auto">{r.date}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-800 truncate mb-1">{r.projectName}</div>
                        <div className="text-xs text-slate-500 mb-2"><User size={10} className="inline mr-1" />{r.requester}</div>
                        <p className="text-xs text-slate-700 line-clamp-2 whitespace-pre-wrap">{r.content}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
});

export default DashboardView;
