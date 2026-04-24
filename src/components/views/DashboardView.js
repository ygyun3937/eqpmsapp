import React, { useMemo, memo } from 'react';
import { Kanban, AlertCircle, CheckCircle, AlertTriangle, PieChart, BarChart3, Clock, Wrench, Download, CalendarDays, User, Building } from 'lucide-react';
import { PROJECT_PHASES } from '../../constants';
import StatCard from '../common/StatCard';
import SimpleDonutChart from '../common/SimpleDonutChart';
import SimpleBarChart from '../common/SimpleBarChart';
import { exportToCSV } from '../../utils/export';

const DashboardView = memo(function DashboardView({ projects, issues, engineers, getStatusColor, calcExp, calcAct, t }) {
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
    const summaryData = [
      { category: '전체 프로젝트 수', count: projects.length },
      { category: '진행중 프로젝트 수', count: activeProjectsCount },
      { category: '완료된 프로젝트 수', count: projectStats.find(s=>s.label===t('완료','Completed'))?.value || 0 },
      { category: '전체 미해결 이슈', count: unresolvedIssuesCount },
      { category: 'High 등급 미해결 이슈', count: issueStats.find(s=>s.label==='High')?.value || 0 },
      { category: '현장 파견 엔지니어 수', count: engineers.filter(e => e.status === '현장 파견').length }
    ];
    exportToCSV(summaryData, 'EQ_PMS_대시보드_요약', [
      { header: '항목(Category)', key: 'category' },
      { header: '수량/건수(Count)', key: 'count' }
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
          <Download size={16} className="mr-2" /> {t('요약 데이터 엑셀 다운로드', 'Export Summary (CSV)')}
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
    </div>
  );
});

export default DashboardView;
