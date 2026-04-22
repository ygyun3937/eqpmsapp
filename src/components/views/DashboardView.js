import React, { memo } from 'react';
import { Kanban, AlertCircle, CheckCircle, AlertTriangle, PieChart, BarChart3, Clock, Wrench, Download } from 'lucide-react';
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
    </div>
  );
});

export default DashboardView;
