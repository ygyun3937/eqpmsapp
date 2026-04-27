import React, { useMemo, memo } from 'react';
import { Kanban, AlertCircle, CheckCircle, AlertTriangle, PieChart, BarChart3, Clock, Wrench, Download, CalendarDays, User, Building, TrendingUp, Users, Zap, MessageSquare } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import StatCard from '../common/StatCard';
import SimpleDonutChart from '../common/SimpleDonutChart';
import SimpleBarChart from '../common/SimpleBarChart';
import { exportToExcel } from '../../utils/export';

const DashboardView = memo(function DashboardView({ projects: rawProjects, issues: rawIssues, engineers, getStatusColor, calcExp, calcAct, currentUser, t }) {
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
    const engRows = engineers.map(e => ({
      id: e.id, name: e.name, dept: e.dept, role: e.role, status: e.status, currentSite: e.currentSite, accessExpiry: e.accessExpiry
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
          { header: 'ID', key: 'id' }, { header: '이름', key: 'name' }, { header: '부서', key: 'dept' }, { header: '역할', key: 'role' },
          { header: '상태', key: 'status' }, { header: '현재 위치', key: 'currentSite' }, { header: '출입증 만료일', key: 'accessExpiry' }
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
        <StatCard title={t('미해결 이슈', 'Unresolved Issues')} value={unresolvedIssuesCount} icon={<AlertCircle size={24} className="text-amber-500" />} color="border-amber-200 bg-amber-50" />
        <StatCard title={t('전체 프로젝트', 'Total Projects')} value={projects.length} icon={<CheckCircle size={24} className="text-emerald-500" />} />
      </div>
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

      {/* 전체 프로젝트 일정 타임라인 */}
      {projects.length > 0 && (() => {
        const sorted = [...projects].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const minDate = new Date(Math.min(...sorted.map(p => new Date(p.startDate))));
        const maxDate = new Date(Math.max(...sorted.map(p => new Date(p.dueDate))));
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
              <div className="min-w-[800px] relative">

                {/* 월별 헤더 */}
                <div className="flex h-8 border-b border-slate-200 relative" style={{ marginLeft: chartLeft }}>
                  {months.map((m, i) => (
                    <div key={i} className="absolute text-[10px] font-bold text-slate-500 border-l border-slate-200 pl-1 h-full flex items-end pb-1" style={{ left: `${m.pos}%` }}>{m.label}</div>
                  ))}
                </div>

                {/* 오늘 표시선 */}
                <div className="absolute top-0 bottom-8 w-px bg-orange-400 z-10" style={{ left: `calc(${chartLeft} + ${todayPercent}% * 0.65)` }}>
                  <div className="absolute bottom-0 -translate-x-1/2 translate-y-5 text-orange-500 text-[10px] font-bold">{t('오늘', 'Today')}</div>
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
                    const pStart = new Date(prj.startDate);
                    const pDue = new Date(prj.dueDate);
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
                      <div key={prj.id} className="flex items-center h-10 group hover:bg-slate-50/50 transition-colors">
                        {/* 왼쪽: 프로젝트 정보 (4열) */}
                        <div className="flex items-center min-w-0" style={{ width: chartLeft }}>
                          <div style={{ width: '40%' }} className="flex items-center min-w-0 pl-1">
                            <span className={`w-2.5 h-2.5 rounded-full mr-2 shrink-0 ${dotColor}`}></span>
                            <span className="text-sm font-semibold text-slate-800 truncate">{prj.name}</span>
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
                            title={`${prj.startDate} ~ ${prj.dueDate}`}
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
