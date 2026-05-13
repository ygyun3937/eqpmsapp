import React, { useMemo, memo, useState, useRef, useEffect } from 'react';
import { Kanban, AlertCircle, CheckCircle, AlertTriangle, PieChart, BarChart3, Clock, Wrench, Download, CalendarDays, User, Building, TrendingUp, Users, MessageSquare, LifeBuoy, ExternalLink, MapPin, HardHat, ShieldAlert, Plane, UserCircle, XCircle, Calendar, Home, FileText, X, Search, Filter, ZoomIn, ZoomOut, Crosshair, Paperclip, ChevronDown, ChevronRight } from 'lucide-react';
import { TODAY, formatDomain } from '../../constants';
import { getCurrentTrip, fmtYMD, calcOverallProgress } from '../../utils/calc';
import { PROJECT_PHASES } from '../../constants';
import { Star } from 'lucide-react';
import StatCard from '../common/StatCard';
import SimpleBarChart from '../common/SimpleBarChart';
import { exportToExcel, drawDonutPng, drawBarPng } from '../../utils/export';
import { parseAnyDate } from '../../utils/dateUtils';

// 사용자 정의(prj.phases) 우선, 없으면 기본 단계명
const getCurrentPhaseName = (prj) => {
  const list = (prj && Array.isArray(prj.phases) && prj.phases.length > 0)
    ? prj.phases
    : PROJECT_PHASES.map((name, idx) => ({ id: `p${idx}`, name }));
  const idx = typeof prj?.phaseIndex === 'number' ? prj.phaseIndex : 0;
  return list[Math.max(0, Math.min(idx, list.length - 1))]?.name || '';
};

const DashboardView = memo(function DashboardView({ projects: rawProjects, issues: rawIssues, engineers, getStatusColor, calcExp, calcAct, onProjectClick, onIssueClick, currentUser, t }) {
  const [issuePopupOpen, setIssuePopupOpen] = useState(false);
  const [popupKind, setPopupKind] = useState(null); // 'active' | 'risk' | 'milestone' | 'all' | null
  const [secondary, setSecondary] = useState(null); // 'analytics' | 'meetings' | 'resource' | null — 보조 섹션 모달
  const [reportPickerOpen, setReportPickerOpen] = useState(false);
  // 간트 줌 + 스크롤 (프로젝트 관리 간트와 동일 패턴)
  const [dashGanttZoom, setDashGanttZoom] = useState(1);
  const dashGanttScrollRef = useRef(null);
  const dashGanttInitialScrolled = useRef(false);
  const [noteSearch, setNoteSearch] = useState('');
  const [noteFilterProject, setNoteFilterProject] = useState('all');
  const [noteFilterAuthor, setNoteFilterAuthor] = useState('all');
  const [noteShowAll, setNoteShowAll] = useState(false);
  // 회의록 모달 — 프로젝트별 접기/펴기. 기본값: 모두 접힘 (Set이 빈 = 펼친 게 없음)
  const [expandedNoteProjects, setExpandedNoteProjects] = useState(() => new Set());
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

  const DAY_MS = 24 * 60 * 60 * 1000;

  // 위젯 1 — 임박한 마일스톤 (다음 60일)
  const upcomingMilestones = useMemo(() => {
    const now = new Date(TODAY);
    const horizonMs = now.getTime() + 60 * DAY_MS;
    const out = [];
    projects.forEach(p => {
      if (p.status === '완료') return;
      (p.phases || []).forEach(ph => {
        if (!ph.isMilestone || !ph.endDate) return;
        const t0 = new Date(ph.endDate).getTime();
        if (t0 >= now.getTime() && t0 <= horizonMs) out.push({ projectId: p.id, projectName: p.name, label: ph.name, date: ph.endDate, kind: 'phase', customer: p.customer });
      });
      (p.tasks || []).forEach(tk => {
        if (!tk.isMilestone || !tk.endDate || tk.isCompleted) return;
        const t0 = new Date(tk.endDate).getTime();
        if (t0 >= now.getTime() && t0 <= horizonMs) out.push({ projectId: p.id, projectName: p.name, label: tk.name, date: tk.endDate, kind: 'setup', customer: p.customer });
      });
      if (p.dueDate) {
        const t0 = new Date(p.dueDate).getTime();
        if (t0 >= now.getTime() && t0 <= horizonMs) out.push({ projectId: p.id, projectName: p.name, label: t('프로젝트 납기', 'Project Due'), date: p.dueDate, kind: 'due', customer: p.customer });
      }
    });
    return out.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 8);
  }, [projects, t]);

  // 위젯 2 — 지연/위험 Top N
  const topRisks = useMemo(() => {
    const today = new Date(TODAY);
    const arr = projects.filter(p => p.status !== '완료').map(p => {
      const exp = (p.startDate && p.dueDate) ? calcExp(p.startDate, p.dueDate) : 0;
      const act = calcOverallProgress(p);
      const slip = Math.max(0, exp - act);
      const projIssues = issues.filter(i => i.projectId === p.id && i.status !== '조치 완료');
      const highIssues = projIssues.filter(i => i.severity === 'High').length;
      const overdueTasks = (p.tasks || []).filter(tk => !tk.isCompleted && tk.endDate && new Date(tk.endDate) < today).length;
      const score = slip * 1.0 + projIssues.length * 5 + highIssues * 10 + overdueTasks * 8;
      const reasons = [];
      if (slip > 0) reasons.push(t(`일정 ${slip}% 지연`, `${slip}% behind`));
      if (highIssues > 0) reasons.push(t(`High 이슈 ${highIssues}건`, `${highIssues} High issue${highIssues > 1 ? 's' : ''}`));
      else if (projIssues.length > 0) reasons.push(t(`이슈 ${projIssues.length}건`, `${projIssues.length} issues`));
      if (overdueTasks > 0) reasons.push(t(`종료 지난 셋업 ${overdueTasks}건`, `${overdueTasks} overdue tasks`));
      return { project: p, score, slip, reasons, exp, act };
    }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    return arr;
  }, [projects, issues, calcExp, t]);

  // 위젯 3 — 인력 가용성 (콤팩트)
  const resourceStat = useMemo(() => {
    const onsite = [];
    const scheduled = [];
    (engineers || []).forEach(e => {
      const trip = getCurrentTrip(e, projects);
      if (trip && trip.state === 'onsite') onsite.push({ engineer: e, trip });
      else if (trip && trip.state === 'scheduled') scheduled.push({ engineer: e, trip });
    });
    onsite.sort((a, b) => (a.trip.daysLeft || 0) - (b.trip.daysLeft || 0));
    scheduled.sort((a, b) => (a.trip.daysUntil || 0) - (b.trip.daysUntil || 0));
    const available = (engineers || []).length - onsite.length;
    return { onsite, scheduled, available, total: (engineers || []).length };
  }, [engineers, projects]);

  // 간트 좌측 사이드바용 — 현장별 인력 배치 + 출장 일정 (기존 리소스 모달과 동일 정보)
  const ganttSidebar = useMemo(() => {
    const sites = {};
    resourceStat.onsite.forEach(({ engineer, trip }) => {
      const key = trip.site || trip.projectName || t('미지정', 'Unspecified');
      if (!sites[key]) sites[key] = [];
      sites[key].push({ engineer, trip });
    });
    const siteList = Object.entries(sites)
      .map(([site, list]) => ({ site, list: list.sort((a, b) => (a.trip.daysLeft || 0) - (b.trip.daysLeft || 0)) }))
      .sort((a, b) => b.list.length - a.list.length);
    const scheduled = [...resourceStat.scheduled].sort((a, b) => (a.trip.daysUntil || 0) - (b.trip.daysUntil || 0));
    return { siteList, scheduled };
  }, [resourceStat, t]);

  // 가용 인력 풀 — 출장 일정이 전혀 없는 엔지니어
  const availablePool = useMemo(() => {
    const busyIds = new Set();
    [...resourceStat.onsite, ...resourceStat.scheduled].forEach(it => busyIds.add(it.engineer.id));
    return (engineers || []).filter(e => !busyIds.has(e.id));
  }, [engineers, resourceStat]);

  // 인력 임박 이벤트 — 출장 출발/복귀, 자격·비자 만료 (다음 30일)
  const upcomingResourceEvents = useMemo(() => {
    const today = new Date(TODAY);
    today.setHours(0, 0, 0, 0);
    const events = [];
    // 출장 출발 임박
    resourceStat.scheduled.forEach(({ engineer, trip }) => {
      const days = Math.ceil((new Date(trip.departureDate) - today) / DAY_MS);
      if (days >= 0 && days <= 30) {
        events.push({ kind: 'depart', days, engineer, site: trip.site || trip.projectName });
      }
    });
    // 복귀 임박
    resourceStat.onsite.forEach(({ engineer, trip }) => {
      const days = Math.ceil((new Date(trip.returnDate) - today) / DAY_MS);
      if (days >= 0 && days <= 30) {
        events.push({ kind: 'return', days, engineer, site: trip.site || trip.projectName });
      }
    });
    // 자격/비자 만료 임박
    (engineers || []).forEach(e => {
      const checkExpiry = (item, label) => {
        if (!item.expiry) return;
        const d = new Date(item.expiry);
        if (isNaN(d)) return;
        const days = Math.ceil((d - today) / DAY_MS);
        if (days >= 0 && days <= 30) {
          events.push({ kind: 'cert', days, engineer: e, certKind: label, certName: item.issuer || item.country || item.type || '' });
        }
      };
      (e.badges || []).forEach(b => checkExpiry(b, '출입증'));
      (e.safetyTrainings || []).forEach(s => checkExpiry(s, '안전교육'));
      (e.visas || []).forEach(v => checkExpiry(v, '비자'));
    });
    return events.sort((a, b) => a.days - b.days);
  }, [resourceStat, engineers]);

  // 최근 미해결 이슈 — 우측 컬럼 위젯용
  const recentUnresolvedIssues = useMemo(() => {
    const sevRank = { High: 0, Medium: 1, Low: 2 };
    return [...issues]
      .filter(i => i.status !== '조치 완료')
      .sort((a, b) => {
        const sa = sevRank[a.severity] ?? 3;
        const sb = sevRank[b.severity] ?? 3;
        if (sa !== sb) return sa - sb;
        return new Date(b.date) - new Date(a.date);
      })
      .slice(0, 5);
  }, [issues]);

  // 위젯 4 — 전체 프로젝트 일정 현황 (미니 간트)
  const overallGantt = useMemo(() => {
    const starts = [], ends = [];
    const today = new Date(TODAY);
    projects.forEach(p => {
      if (p.startDate) starts.push(new Date(p.startDate));
      if (p.dueDate) ends.push(new Date(p.dueDate));
    });
    if (starts.length === 0 || ends.length === 0) return null;
    // 타임라인 범위 — 데이터 범위에 더해 오늘 ±버퍼를 강제로 포함
    // (오늘이 차트 오른쪽 끝에 붙어 스크롤이 클램프되어 한 달 전 위치를 보여주지 못하는 현상 방지)
    const padBefore = 60 * DAY_MS;  // 오늘 기준 최소 60일 전부터
    const padAfter = 90 * DAY_MS;   // 오늘 기준 최소 90일 후까지
    const minTime = Math.min(...starts.map(d => d.getTime()), today.getTime() - padBefore);
    const maxTime = Math.max(...ends.map(d => d.getTime()), today.getTime() + padAfter);
    const min = new Date(minTime); min.setDate(1);
    const max = new Date(maxTime); max.setMonth(max.getMonth() + 1, 0);
    const days = (max.getTime() - min.getTime()) / DAY_MS;
    if (days <= 0) return null;

    const months = [];
    const cursor = new Date(min);
    while (cursor <= max) {
      const pos = ((cursor - min) / DAY_MS / days) * 100;
      months.push({ label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`, pos });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    const todayPct = ((today - min) / DAY_MS / days) * 100;

    // 진행 중인 프로젝트 우선, 그 다음 시작일순
    const sorted = [...projects].sort((a, b) => {
      const ac = a.status === '완료' ? 1 : 0;
      const bc = b.status === '완료' ? 1 : 0;
      if (ac !== bc) return ac - bc;
      return new Date(a.startDate || 0) - new Date(b.startDate || 0);
    });
    const rows = sorted.filter(p => p.startDate && p.dueDate).map(p => {
      const s = new Date(p.startDate);
      const e = new Date(p.dueDate);
      return {
        project: p,
        leftPct: ((s - min) / DAY_MS / days) * 100,
        widthPct: ((e - s) / DAY_MS / days) * 100
      };
    });
    return { min, max, days, months, todayPct, rows };
  }, [projects]);

  // 간트 휠 줌 + Shift+휠 가로 스크롤 (프로젝트 관리 간트와 동일)
  useEffect(() => {
    const node = dashGanttScrollRef.current;
    if (!node) return;
    const handler = (e) => {
      if (e.shiftKey) {
        e.preventDefault();
        node.scrollLeft += (e.deltaY || e.deltaX);
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setDashGanttZoom(z => Math.max(0.5, Math.min(4, +((z + delta).toFixed(2)))));
    };
    node.addEventListener('wheel', handler, { passive: false });
    return () => node.removeEventListener('wheel', handler);
  }, []);

  // 초기 스크롤 — 오늘 - 1개월 위치가 뷰포트 좌측에 오도록
  // (실제 렌더된 폭을 읽어 비율로 계산 — 600px 최소 폭 폴백 케이스도 정확함)
  const scrollGanttToToday = () => {
    const node = dashGanttScrollRef.current;
    if (!node || !overallGantt) return;
    const inner = node.firstElementChild;
    if (!inner) return;
    const innerWidth = inner.scrollWidth;
    const fullD = overallGantt.days;
    if (!fullD || fullD <= 0 || innerWidth <= 0) return;
    const today = new Date(TODAY);
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - 30);
    const targetPct = ((targetDate - overallGantt.min) / DAY_MS) / fullD;
    node.scrollLeft = Math.max(0, targetPct * innerWidth);
  };
  useEffect(() => {
    if (!overallGantt) return;
    const id = setTimeout(() => {
      if (dashGanttInitialScrolled.current) return;
      scrollGanttToToday();
      dashGanttInitialScrolled.current = true;
    }, 100);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overallGantt, dashGanttZoom]);

  const upcomingSOPCount = upcomingMilestones.filter(m => {
    const dd = Math.ceil((new Date(m.date) - new Date(TODAY)) / DAY_MS);
    return dd <= 30;
  }).length;
  const riskCount = topRisks.length;

  const issueStats = [
    { label: 'High', value: issues.filter(i => i.severity === 'High' && i.status !== '조치 완료').length, color: 'bg-red-500', svgColor: '#ef4444' },
    { label: 'Medium', value: issues.filter(i => i.severity === 'Medium' && i.status !== '조치 완료').length, color: 'bg-amber-500', svgColor: '#f59e0b' },
    { label: 'Low', value: issues.filter(i => i.severity === 'Low' && i.status !== '조치 완료').length, color: 'bg-emerald-500', svgColor: '#10b981' },
  ];

  // AS 미완료 (status !== '완료') — 유형별 분포 + 최근 리스트
  const allAS = useMemo(() => {
    const recs = [];
    (projects || []).forEach(p => {
      (p.asRecords || []).forEach(a => {
        recs.push({ ...a, projectId: p.id, projectName: p.name, customer: p.customer });
      });
    });
    return recs;
  }, [projects]);
  const pendingAS = allAS.filter(a => a.status !== '완료');
  const asStats = [
    { label: '긴급출동', value: pendingAS.filter(a => a.type === '긴급출동').length, color: 'bg-rose-500' },
    { label: '정기점검', value: pendingAS.filter(a => a.type === '정기점검').length, color: 'bg-blue-500' },
    { label: '부품교체', value: pendingAS.filter(a => a.type === '부품교체').length, color: 'bg-amber-500' },
    { label: '불량수리', value: pendingAS.filter(a => a.type === '불량수리').length, color: 'bg-orange-500' },
    { label: '보증수리', value: pendingAS.filter(a => a.type === '보증수리').length, color: 'bg-indigo-500' },
  ];
  const recentPendingAS = [...pendingAS]
    .sort((a, b) => {
      if (a.type === '긴급출동' && b.type !== '긴급출동') return -1;
      if (b.type === '긴급출동' && a.type !== '긴급출동') return 1;
      return new Date(b.date) - new Date(a.date);
    })
    .slice(0, 5);
  const pendingASCount = pendingAS.length;

  const completedPrjs = projects.filter(p => p.status === '완료' && p.signOff);
  const avgLeadTime = completedPrjs.length ? (completedPrjs.reduce((acc, p) => acc + (new Date(p.signOff.date) - new Date(p.startDate)), 0) / completedPrjs.length / (1000*60*60*24)).toFixed(1) : 0;
  const resolvedIssues = issues.filter(i => i.status === '조치 완료');
  const avgMttr = resolvedIssues.length ? (resolvedIssues.length * 1.5).toFixed(1) : 0;

  const handleExportSummary = () => {
    // 진행중 프로젝트들의 종합 진척률 평균 계산
    const _activeProjects = projects.filter(p => p.status !== '완료');
    const _avgProgress = _activeProjects.length > 0
      ? Math.round(_activeProjects.reduce((s, p) => s + (calcOverallProgress(p) || 0), 0) / _activeProjects.length)
      : 0;
    // 고객 요청 미처리 (접수+검토중)
    let _pendingRequests = 0;
    let _totalRequests = 0;
    projects.forEach(p => {
      (p.customerRequests || []).forEach(r => {
        _totalRequests++;
        if (r.status === '접수' || r.status === '검토중') _pendingRequests++;
      });
    });
    // 1. 기본 통계
    const basic = [
      { category: '전체 프로젝트 수', count: projects.length },
      { category: '진행중 프로젝트 수', count: activeProjectsCount },
      { category: '마감임박 프로젝트 수', count: projects.filter(p => p.status === '마감임박').length },
      { category: '이슈발생 프로젝트 수', count: projects.filter(p => p.status === '이슈발생').length },
      { category: '완료된 프로젝트 수', count: projects.filter(p => p.status === '완료').length },
      { category: '고객 요청 미처리 (접수+검토중)', count: _pendingRequests },
      { category: '고객 요청 전체', count: _totalRequests },
      { category: '평균 진척률 (진행중, %)', count: _avgProgress },
      { category: '지연·위험 프로젝트 수', count: riskCount },
      { category: '임박 마일스톤 (30일 내)', count: upcomingSOPCount },
      { category: '전체 미해결 이슈', count: unresolvedIssuesCount },
      { category: 'High 등급 미해결 이슈', count: issues.filter(i => i.severity === 'High' && i.status !== '조치 완료').length },
      { category: '현장 파견 인원 (출장)', count: resourceStat.onsite.length },
      { category: '출장 예정 인원', count: resourceStat.scheduled.length },
      { category: '가용 인력 (출장 일정 없음)', count: availablePool.length },
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

    // 3. 프로젝트별 상세 — 종합 진척률 (단계 + 셋업 평균) 사용
    const projectRows = projects.map(p => ({
      id: p.id, name: p.name, domain: p.domain, customer: p.customer, site: p.site,
      manager: p.manager, status: p.status, phase: getCurrentPhaseName(p),
      startDate: p.startDate, dueDate: p.dueDate,
      expectedProgress: calcExp(p.startDate, p.dueDate) + '%',
      actualProgress: calcOverallProgress(p) + '%',
      hwVersion: p.hwVersion || '-', swVersion: p.swVersion || '-', fwVersion: p.fwVersion || '-'
    }));

    // 4. 지연 위험 프로젝트 — 종합 진척률 기준
    const delayRows = projects.filter(p => p.status !== '완료').map(p => {
      const exp = calcExp(p.startDate, p.dueDate) || 0;
      const act = calcOverallProgress(p) || 0;
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

    // 11. 마일스톤 로드맵 (다음 60일)
    const milestoneRows = upcomingMilestones.map(m => {
      const dDays = Math.ceil((new Date(m.date) - new Date(TODAY)) / DAY_MS);
      const kindLabel = m.kind === 'phase' ? '단계' : m.kind === 'setup' ? '셋업' : '납기';
      const urgencyLabel = dDays <= 7 ? 'D-7 (긴급)' : dDays <= 30 ? 'D-30 (주의)' : '여유';
      return {
        urgency: urgencyLabel,
        dDays: `D-${dDays}`,
        kind: kindLabel,
        name: m.label,
        projectName: m.projectName,
        customer: m.customer || '-',
        date: m.date
      };
    });

    // 14. 최근 회의록 (전 프로젝트, 최신 50건) — 본문/요약/회의일시/참석자/결정/액션/첨부
    const recentNotes = [];
    projects.forEach(p => {
      (p.notes || []).forEach(n => {
        const files = Array.isArray(n.files) ? n.files : (n.file ? [n.file] : []);
        recentNotes.push({
          ts: Number(n.id) || 0,
          date: n.date,
          projectName: p.name,
          author: n.author,
          meetingDate: n.meetingDate || '-',
          attendees: n.attendees || '-',
          summary: n.summary || '-',
          text: n.text || '-',
          decisions: n.decisions || '-',
          actions: n.actions || '-',
          files: files.length > 0 ? files.map(f => f.fileName).join(' / ') : '-'
        });
      });
    });
    recentNotes.sort((a, b) => b.ts - a.ts);
    const noteRows = recentNotes.slice(0, 50);

    // 12. 인력 임박 이벤트 (다음 30일)
    const eventRows = upcomingResourceEvents.map(ev => {
      const kindLabel = ev.kind === 'depart' ? '출장 출발' : ev.kind === 'return' ? '출장 복귀' : '자격/비자 만료';
      const detail = ev.kind === 'cert'
        ? `${ev.certKind}${ev.certName ? ` (${ev.certName})` : ''}`
        : (ev.site || '-');
      return {
        urgency: ev.days <= 7 ? 'D-7 (긴급)' : ev.days <= 30 ? 'D-30 (주의)' : '여유',
        dDays: `D-${ev.days}`,
        kind: kindLabel,
        engineer: ev.engineer.name,
        grade: ev.engineer.grade || '-',
        dept: ev.engineer.dept || '-',
        detail
      };
    });

    // 13. 자원 가용성 8주 히트맵 (engineer × week, 일수 + 사이트)
    const heatmapWeeks = [];
    {
      const today0 = new Date(TODAY);
      today0.setHours(0, 0, 0, 0);
      const dow = today0.getDay();
      const weekStart = new Date(today0);
      weekStart.setDate(today0.getDate() - (dow === 0 ? 6 : dow - 1));
      for (let i = 0; i < 8; i++) {
        const start = new Date(weekStart);
        start.setDate(weekStart.getDate() + i * 7);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        heatmapWeeks.push({ start, end, key: `w${i + 1}`, header: `${i + 1}주차 (${start.getMonth() + 1}/${start.getDate()}~${end.getDate()})` });
      }
    }
    const heatmapRows = (engineers || []).map(e => {
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

    // 차트 이미지 (PNG base64) — 캔버스로 직접 그려 임베드
    // 0.프로젝트 상태 도넛
    const projectStatusDonut = drawDonutPng({
      title: '프로젝트 상태 분포',
      data: [
        { label: '진행중', value: projects.filter(p => p.status === '진행중').length, color: '#3b82f6' },
        { label: '마감임박', value: projects.filter(p => p.status === '마감임박').length, color: '#f59e0b' },
        { label: '완료', value: projects.filter(p => p.status === '완료').length, color: '#10b981' },
      ],
      width: 640, height: 360
    });
    // 1.이슈 심각도 도넛
    const issueSeverityDonut = drawDonutPng({
      title: '미해결 이슈 심각도',
      data: [
        { label: 'High', value: issues.filter(i => i.severity === 'High' && i.status !== '조치 완료').length, color: '#ef4444' },
        { label: 'Medium', value: issues.filter(i => i.severity === 'Medium' && i.status !== '조치 완료').length, color: '#f59e0b' },
        { label: 'Low', value: issues.filter(i => i.severity === 'Low' && i.status !== '조치 완료').length, color: '#10b981' },
      ],
      width: 640, height: 360
    });
    // 2.도메인별 진행중 프로젝트 막대
    const domainBar = drawBarPng({
      title: '도메인별 진행 프로젝트 수',
      data: domainRows.map((d, i) => ({
        label: d.domain || '-',
        value: d.active,
        color: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e'][i % 6]
      })),
      width: 720, height: 360
    });
    // 3.도메인별 이슈 막대
    const domainIssueBar = drawBarPng({
      title: '도메인별 이슈 건수',
      data: domainRows.map((d, i) => ({
        label: d.domain || '-',
        value: d.issues,
        color: ['#ef4444', '#f59e0b', '#f43f5e', '#a855f7', '#0ea5e9', '#14b8a6'][i % 6]
      })),
      width: 720, height: 360
    });

    exportToExcel('EQ_PMS_종합리포트', [
      {
        name: '0.차트',
        imagesOnly: true,
        images: [
          // 좌상단 도넛 (A1~H20)
          { base64: projectStatusDonut, tl: { col: 0, row: 0 }, br: { col: 8, row: 19 } },
          // 우상단 도넛 (J1~Q20)
          { base64: issueSeverityDonut, tl: { col: 9, row: 0 }, br: { col: 17, row: 19 } },
          // 좌하단 막대 (A22~I44)
          { base64: domainBar, tl: { col: 0, row: 21 }, br: { col: 8, row: 43 } },
          // 우하단 막대 (J22~R44)
          { base64: domainIssueBar, tl: { col: 9, row: 21 }, br: { col: 17, row: 43 } },
        ]
      },
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
      },
      {
        name: '11.마일스톤 로드맵(60일)',
        rows: milestoneRows,
        columns: [
          { header: '긴급도', key: 'urgency' }, { header: 'D-N', key: 'dDays' }, { header: '종류', key: 'kind' },
          { header: '마일스톤', key: 'name' }, { header: '프로젝트', key: 'projectName' },
          { header: '고객사', key: 'customer' }, { header: '일자', key: 'date' }
        ]
      },
      {
        name: '12.인력 임박 이벤트(30일)',
        rows: eventRows,
        columns: [
          { header: '긴급도', key: 'urgency' }, { header: 'D-N', key: 'dDays' }, { header: '종류', key: 'kind' },
          { header: '엔지니어', key: 'engineer' }, { header: '직급', key: 'grade' }, { header: '부서', key: 'dept' },
          { header: '상세 (사이트/자격)', key: 'detail' }
        ]
      },
      {
        name: '13.가용성 8주 히트맵',
        rows: heatmapRows,
        columns: heatmapColumns
      },
      {
        name: '14.최근 회의록(50건)',
        rows: noteRows,
        columns: [
          { header: '등록 일시', key: 'date' }, { header: '프로젝트', key: 'projectName' }, { header: '작성자', key: 'author' },
          { header: '회의 일시', key: 'meetingDate' }, { header: '참석자', key: 'attendees' },
          { header: '요약', key: 'summary' }, { header: '본문', key: 'text' },
          { header: '결정사항', key: 'decisions' }, { header: '액션 아이템', key: 'actions' },
          { header: '첨부 파일', key: 'files' }
        ]
      }
    ]);
  };

  // PDF 리포트 — 브라우저 인쇄 다이얼로그로 (의존성 없음)
  const handleExportPDF = () => {
    const today = new Date().toISOString().split('T')[0];
    const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const todayD = new Date(TODAY);

    // KPI 카드 데이터 — 대시보드 KPI와 동일하게 (5개)
    const _activeProjects = projects.filter(p => p.status !== '완료');
    const _avgProgress = _activeProjects.length > 0
      ? Math.round(_activeProjects.reduce((s, p) => s + (calcOverallProgress(p) || 0), 0) / _activeProjects.length)
      : 0;
    let _pendingReqs = 0;
    projects.forEach(p => {
      (p.customerRequests || []).forEach(r => {
        if (r.status === '접수' || r.status === '검토중') _pendingReqs++;
      });
    });
    const kpiCards = [
      { label: '미해결 이슈', value: unresolvedIssuesCount, color: '#f97316' },
      { label: '지연·위험', value: riskCount, color: '#f43f5e' },
      { label: '임박 SOP (30일)', value: upcomingSOPCount, color: '#f59e0b' },
      { label: '고객 요청 미처리', value: _pendingReqs, color: '#06b6d4' },
      { label: '평균 진척률 (진행중)', value: `${_avgProgress}%`, color: '#10b981' }
    ];

    // 임박 마일스톤 표
    const milestoneRows = upcomingMilestones.map(m => {
      const dDays = Math.ceil((new Date(m.date) - todayD) / DAY_MS);
      const kindLabel = m.kind === 'phase' ? '단계' : m.kind === 'setup' ? '셋업' : '납기';
      return `<tr><td>${kindLabel}</td><td>${escapeHtml(m.label)}</td><td>${escapeHtml(m.projectName)}</td><td>${m.date}</td><td><strong style="color:${dDays<=7?'#dc2626':dDays<=30?'#d97706':'#64748b'}">D-${dDays}</strong></td></tr>`;
    }).join('');

    // 지연·위험 표
    const riskRows = topRisks.map((r, i) => `<tr><td>${i+1}</td><td>${escapeHtml(r.project.name)}</td><td>${escapeHtml(r.project.customer)}</td><td>${escapeHtml(r.project.manager||'-')}</td><td>${r.act}%</td><td>${r.exp}%</td><td><span style="background:#ef4444;color:#fff;padding:2px 6px;border-radius:4px">${Math.round(r.score)}</span></td><td style="color:#b91c1c">${escapeHtml(r.reasons.join(' · '))}</td></tr>`).join('');

    // 도메인별 진척률 (CSS 막대)
    const domainMap = {};
    projects.forEach(p => {
      const k = p.domain || '미분류';
      if (!domainMap[k]) domainMap[k] = { count: 0, sum: 0, completed: 0 };
      domainMap[k].count++;
      domainMap[k].sum += calcOverallProgress(p);
      if (p.status === '완료') domainMap[k].completed++;
    });
    const domainData = Object.entries(domainMap).map(([k, v]) => ({ domain: k, avg: Math.round(v.sum / v.count), count: v.count, completed: v.completed })).sort((a, b) => b.avg - a.avg);
    const domainBars = domainData.map(d => `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><strong>${escapeHtml(d.domain)}</strong><span>${d.avg}% (${d.completed}/${d.count})</span></div>
        <div style="height:14px;background:#f1f5f9;border-radius:4px;overflow:hidden"><div style="height:100%;width:${d.avg}%;background:${d.avg>=80?'#10b981':d.avg>=50?'#3b82f6':d.avg>=25?'#f59e0b':'#f43f5e'};"></div></div>
      </div>
    `).join('');

    // 인력 가용성
    const resourceRows = `
      <tr><td>가용 (출장 없음)</td><td><strong>${Math.max(0, resourceStat.available - resourceStat.scheduled.length)}</strong></td></tr>
      <tr><td>출장 예정</td><td><strong>${resourceStat.scheduled.length}</strong></td></tr>
      <tr><td>현장 파견 중</td><td><strong>${resourceStat.onsite.length}</strong></td></tr>
      <tr><td>전체 엔지니어</td><td><strong>${resourceStat.total}</strong></td></tr>
    `;

    // 인력 임박 이벤트 (다음 30일)
    const eventRows = upcomingResourceEvents.map(ev => {
      const kindLabel = ev.kind === 'depart' ? '<span style="background:#3b82f6;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">출발</span>'
        : ev.kind === 'return' ? '<span style="background:#10b981;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">복귀</span>'
        : '<span style="background:#f59e0b;color:#fff;padding:2px 6px;border-radius:4px;font-size:10px">만료</span>';
      const detail = ev.kind === 'cert'
        ? `${ev.certKind}${ev.certName ? ` (${ev.certName})` : ''}`
        : (ev.site || '-');
      return `<tr><td>${kindLabel}</td><td>${escapeHtml(ev.engineer.name)}${ev.engineer.grade ? ` <span style="color:#64748b;font-size:11px">${escapeHtml(ev.engineer.grade)}</span>` : ''}</td><td>${escapeHtml(detail)}</td><td><strong style="color:${ev.days<=7?'#dc2626':ev.days<=30?'#d97706':'#64748b'}">D-${ev.days}</strong></td></tr>`;
    }).join('');

    // 전체 프로젝트 일정 (상위 8개 텍스트 표)
    const scheduleRows = (overallGantt?.rows || []).slice(0, 12).map(r => `<tr><td>${escapeHtml(r.project.name)}</td><td>${escapeHtml(r.project.customer)}</td><td>${escapeHtml(r.project.status)}</td><td>${r.project.startDate}</td><td>${r.project.dueDate}</td><td>${calcOverallProgress(r.project)}%</td></tr>`).join('');

    const html = `
      <html>
      <head>
        <title>대시보드 종합 리포트 - ${today}</title>
        <style>
          body{font-family:'Segoe UI','Malgun Gothic',sans-serif; padding:30px; color:#1e293b; line-height:1.5;}
          h1{color:#1e40af; border-bottom:3px solid #3b82f6; padding-bottom:8px; margin-bottom:6px;}
          .meta{color:#64748b; font-size:12px; margin-bottom:24px;}
          h2{color:#334155; font-size:16px; margin-top:28px; margin-bottom:10px; padding-bottom:4px; border-bottom:1px solid #e2e8f0;}
          .kpi-row{display:flex; gap:12px; margin-bottom:16px; flex-wrap:wrap;}
          .kpi-card{flex:1; min-width:140px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px;}
          .kpi-label{font-size:11px; color:#64748b; font-weight:bold; text-transform:uppercase; margin-bottom:6px;}
          .kpi-value{font-size:32px; font-weight:900;}
          table{width:100%; border-collapse:collapse; font-size:12px; margin-bottom:8px;}
          th,td{border:1px solid #e2e8f0; padding:6px 8px; text-align:left;}
          th{background:#f1f5f9; color:#1e293b; font-weight:bold; font-size:11px;}
          .small{font-size:11px; color:#64748b;}
          @media print { @page { size: A4; margin: 15mm; } body{padding:0;} }
        </style>
      </head>
      <body>
        <h1>대시보드 종합 리포트</h1>
        <div class="meta">생성일: ${today} · ${currentUser?.name || ''}</div>

        <h2>핵심 지표 (KPI)</h2>
        <div class="kpi-row">
          ${kpiCards.map(k => `<div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-value" style="color:${k.color}">${k.value}</div></div>`).join('')}
        </div>

        <h2>도메인별 평균 진척률</h2>
        ${domainBars || '<div class="small">데이터 없음</div>'}

        <h2>인력 가용성</h2>
        <table><tr><th>구분</th><th>인원</th></tr>${resourceRows}</table>

        <h2>인력 임박 이벤트 (다음 30일)</h2>
        ${eventRows ? `<table><tr><th>종류</th><th>엔지니어</th><th>상세 (사이트/자격)</th><th>D-N</th></tr>${eventRows}</table>` : '<div class="small">30일 내 임박 이벤트 없음</div>'}

        <h2>임박한 마일스톤 (다음 60일)</h2>
        ${milestoneRows ? `<table><tr><th>구분</th><th>이름</th><th>프로젝트</th><th>일자</th><th>D-N</th></tr>${milestoneRows}</table>` : '<div class="small">임박한 항목 없음</div>'}

        <h2>지연·위험 프로젝트 (Top ${topRisks.length})</h2>
        ${riskRows ? `<table><tr><th>#</th><th>프로젝트</th><th>고객사</th><th>담당자</th><th>실적</th><th>예상</th><th>점수</th><th>사유</th></tr>${riskRows}</table>` : '<div class="small">위험 프로젝트 없음</div>'}

        <h2>전체 프로젝트 일정 (상위 12)</h2>
        ${scheduleRows ? `<table><tr><th>프로젝트</th><th>고객사</th><th>상태</th><th>시작일</th><th>납기일</th><th>진척</th></tr>${scheduleRows}</table>` : '<div class="small">일정 등록된 프로젝트 없음</div>'}

        <script>setTimeout(() => window.print(), 300);</script>
      </body>
      </html>
    `;
    const printWin = window.open('', '', 'width=900,height=1100');
    if (!printWin) return;
    printWin.document.write(html);
    printWin.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-800">{t('대시보드', 'Dashboard')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setSecondary('analytics')} className="flex items-center bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors shadow-sm">
            <PieChart size={16} className="mr-1.5" /> {t('고급 분석', 'Analytics')}
          </button>
          <button onClick={() => setSecondary('meetings')} className="flex items-center bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded-lg text-sm font-bold hover:bg-amber-100 transition-colors shadow-sm">
            <FileText size={16} className="mr-1.5" /> {t('회의록', 'Meetings')}
          </button>
          <button onClick={() => setReportPickerOpen(true)} className="flex items-center bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-2 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors shadow-sm" title={t('PDF 또는 Excel 리포트로 내보내기', 'Export report as PDF or Excel')}>
            <Download size={16} className="mr-1.5" /> {t('리포트', 'Report')}
          </button>
        </div>
      </div>
      {/* 상단 3분할 — [총프로젝트+KPI] / [임박 마일스톤] / [이슈 현황] */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 좌측 — 총프로젝트 카드 + KPI 5개 세로 스택 */}
        <div className="space-y-3 flex flex-col lg:h-[26rem]">
          {/* 총프로젝트 카드 — 큰 숫자 + 상태 가로 스택 막대 */}
          {(() => {
            const segs = [
              { label: t('진행중', 'Active'), value: projects.filter(p => p.status === '진행중').length, bar: 'bg-blue-500', dot: 'bg-blue-500' },
              { label: t('마감임박', 'Due Soon'), value: projects.filter(p => p.status === '마감임박').length, bar: 'bg-amber-500', dot: 'bg-amber-500' },
              { label: t('이슈발생', 'Issue'), value: projects.filter(p => p.status === '이슈발생').length, bar: 'bg-rose-500', dot: 'bg-rose-500' },
              { label: t('완료', 'Done'), value: projects.filter(p => p.status === '완료').length, bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
            ];
            const total = segs.reduce((s, d) => s + d.value, 0);
            return (
              <button
                type="button"
                onClick={projects.length > 0 ? () => setPopupKind('all') : undefined}
                className="w-full bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4 text-left hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-indigo-700 flex items-center"><Kanban size={14} className="mr-1.5" />{t('총 프로젝트', 'Total Projects')}</span>
                  <span className="text-[10px] text-indigo-400 font-bold">{t('클릭 → 전체', 'Click → All')}</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-4xl font-black text-slate-800 leading-none">{projects.length}</span>
                  <span className="text-sm font-bold text-slate-500">{t('건', '')}</span>
                </div>
                {/* 가로 스택 막대 */}
                <div className="flex h-5 w-full rounded-md overflow-hidden bg-white/60 border border-indigo-200/60 mb-2">
                  {total === 0 ? (
                    <div className="w-full flex items-center justify-center text-[9px] text-slate-400">{t('데이터 없음', 'No Data')}</div>
                  ) : segs.map((s, i) => {
                    const pct = (s.value / total) * 100;
                    if (pct === 0) return null;
                    return (
                      <div key={i} className={`${s.bar} flex items-center justify-center text-[9px] font-black text-white`} style={{ width: `${pct}%` }} title={`${s.label} ${s.value} (${Math.round(pct)}%)`}>
                        {pct >= 12 ? s.value : ''}
                      </div>
                    );
                  })}
                </div>
                {/* 인라인 범례 */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px]">
                  {segs.map(s => (
                    <span key={s.label} className="flex items-center gap-1 whitespace-nowrap">
                      <span className={`w-2 h-2 rounded-full ${s.dot}`}></span>
                      <span className="text-slate-600 font-bold">{s.label}</span>
                      <span className="text-slate-800 font-black">{s.value}</span>
                    </span>
                  ))}
                </div>
              </button>
            );
          })()}

          {/* KPI 5개 — 큰 숫자 + 하단 진행 막대 (스케일러블) */}
          {(() => {
            const totalIssues = (issues || []).length;
            const upcoming60 = upcomingMilestones.length || 1;
            // 평균 진척률 — 진행중 프로젝트의 종합 진척률 평균
            const activeProjects = projects.filter(p => p.status !== '완료');
            const avgProgress = activeProjects.length > 0
              ? Math.round(activeProjects.reduce((s, p) => s + (calcOverallProgress(p) || 0), 0) / activeProjects.length)
              : 0;
            // 평균 진척률 — 실적 vs 계획 비교 + 분포
            const planAvg = activeProjects.length > 0
              ? Math.round(activeProjects.reduce((s, p) => s + ((p.startDate && p.dueDate) ? calcExp(p.startDate, p.dueDate) : 0), 0) / activeProjects.length)
              : 0;
            // 진척률 분포 (4개 버킷)
            const progressBuckets = [0, 0, 0, 0]; // 0-25 / 25-50 / 50-75 / 75-100
            activeProjects.forEach(p => {
              const v = calcOverallProgress(p) || 0;
              const idx = v >= 75 ? 3 : v >= 50 ? 2 : v >= 25 ? 1 : 0;
              progressBuckets[idx]++;
            });
            // 고객 요청 — 미처리 (접수+검토중) / 전체
            const allRequestsFlat = [];
            projects.forEach(p => {
              (p.customerRequests || []).forEach(r => allRequestsFlat.push({ ...r, projectId: p.id, projectName: p.name }));
            });
            const pendingRequestsCount = allRequestsFlat.filter(r => r.status === '접수' || r.status === '검토중').length;
            const totalRequests = allRequestsFlat.length;
            const kpis = [
              { label: t('미해결 이슈', 'Issues'), value: unresolvedIssuesCount, total: totalIssues || unresolvedIssuesCount, color: 'orange', icon: <AlertCircle size={12} />, onClick: unresolvedIssuesCount > 0 ? () => setIssuePopupOpen(true) : null },
              { label: t('지연·위험', 'At Risk'), value: riskCount, total: activeProjectsCount || riskCount, color: 'rose', icon: <AlertTriangle size={12} />, onClick: riskCount > 0 ? () => setPopupKind('risk') : null },
              { label: t('임박 마일스톤 (30일)', 'Upcoming SOP (30d)'), value: upcomingSOPCount, total: upcoming60, color: 'amber', icon: <Star size={12} />, onClick: upcomingSOPCount > 0 ? () => setPopupKind('milestone') : null },
              // 고객 요청 미처리 — 접수+검토중 (회사 critical 지표, 응답 시간/만족도 직결)
              { label: t('고객 요청 미처리', 'Pending Requests'), value: pendingRequestsCount, total: totalRequests || pendingRequestsCount, color: 'cyan', icon: <MessageSquare size={12} />, onClick: pendingRequestsCount > 0 ? () => setPopupKind('request') : null },
              // 평균 진척률 — 실적/계획 비교 + 분포 mini bar (AS는 우측 위젯에서 노출)
              {
                label: t('평균 진척률 (진행중)', 'Avg Progress (Active)'),
                value: avgProgress, total: 100, isPercent: true, color: 'emerald',
                icon: <TrendingUp size={12} />, onClick: activeProjects.length > 0 ? () => setPopupKind('active') : null,
                planVal: planAvg, buckets: progressBuckets, activeCount: activeProjects.length
              },
            ];
            // pendingAS는 위젯에서 노출 — 카드는 제거. unused 경고 방지
            void pendingAS;
            // 색상 클래스 명시 매핑 (Tailwind JIT 안전)
            const colorMap = {
              orange: { iconCls: 'text-orange-600 bg-orange-50', barCls: 'bg-orange-500', track: 'bg-orange-100' },
              rose:   { iconCls: 'text-rose-600 bg-rose-50',     barCls: 'bg-rose-500',   track: 'bg-rose-100' },
              amber:  { iconCls: 'text-amber-600 bg-amber-50',   barCls: 'bg-amber-500',  track: 'bg-amber-100' },
              blue:   { iconCls: 'text-blue-600 bg-blue-50',     barCls: 'bg-blue-500',   track: 'bg-blue-100' },
              emerald:{ iconCls: 'text-emerald-600 bg-emerald-50', barCls: 'bg-emerald-500', track: 'bg-emerald-100' },
              purple: { iconCls: 'text-purple-600 bg-purple-50', barCls: 'bg-purple-500', track: 'bg-purple-100' },
              cyan:   { iconCls: 'text-cyan-600 bg-cyan-50',     barCls: 'bg-cyan-500',   track: 'bg-cyan-100' },
            };
            const renderCard = (k, i) => {
              const pct = k.total > 0 ? Math.min(1, k.value / k.total) : 0;
              const pctLabel = Math.round(pct * 100);
              const showRatio = k.total > 0 && k.total !== k.value;
              const c = colorMap[k.color];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={k.onClick || undefined}
                  disabled={!k.onClick}
                  className={`relative bg-white border border-slate-200 rounded-lg p-3 flex flex-col text-left transition-all min-w-0 h-full ${k.onClick ? 'hover:border-indigo-300 hover:shadow-md cursor-pointer' : 'cursor-default opacity-90'}`}
                  title={k.onClick ? t('클릭하여 상세 보기', 'Click for details') : ''}
                >
                  {/* 상단 — 아이콘 + 라벨 + 외부링크 */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${c.iconCls}`}>{k.icon}</span>
                      <span className="text-[10px] font-bold text-slate-600 truncate" title={k.label}>{k.label}</span>
                    </div>
                    {k.onClick && <ExternalLink size={11} className="text-slate-300 shrink-0" />}
                  </div>
                  {/* 큰 숫자 (메인) — 진척률 카드는 실적/계획 delta 함께 표시 */}
                  <div className="flex-1 flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-3xl font-black text-slate-800 leading-none tabular-nums">{k.value.toLocaleString()}</span>
                    {k.isPercent && <span className="text-base font-black text-slate-500 leading-none">%</span>}
                    {typeof k.planVal === 'number' && (() => {
                      const delta = k.value - k.planVal;
                      const dCls = delta >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-rose-600 bg-rose-50 border-rose-200';
                      return (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border tabular-nums leading-none ${dCls}`} title={t('실적 - 계획', 'Actual - Plan')}>
                          {delta >= 0 ? '+' : ''}{delta}%p
                        </span>
                      );
                    })()}
                  </div>
                  {/* 하단 진행 막대 + 비율 */}
                  {k.isPercent ? (
                    <div className="mt-2">
                      {/* 실적 막대 + 계획 마커 */}
                      <div className={`relative w-full h-2 rounded-full overflow-hidden ${c.track}`}>
                        <div className={`absolute top-0 left-0 h-full ${c.barCls} transition-all`} style={{ width: `${k.value}%` }}></div>
                        {typeof k.planVal === 'number' && (
                          <div className="absolute top-0 h-full w-0.5 bg-slate-700" style={{ left: `${Math.min(100, k.planVal)}%` }} title={t(`계획 ${k.planVal}%`, `Plan ${k.planVal}%`)}></div>
                        )}
                      </div>
                      {/* 진척률 분포 미니 막대 (4 버킷) */}
                      {Array.isArray(k.buckets) && (
                        <div className="mt-1.5">
                          <div className="flex h-1 w-full rounded-sm overflow-hidden bg-slate-100" title={t('진척률 분포', 'Progress distribution')}>
                            {(() => {
                              const total = k.buckets.reduce((s, n) => s + n, 0) || 1;
                              const bColors = ['bg-slate-300', 'bg-blue-300', 'bg-teal-400', 'bg-emerald-500'];
                              return k.buckets.map((n, bi) => (
                                <div key={bi} className={bColors[bi]} style={{ width: `${(n/total)*100}%` }} title={`${['0-25','25-50','50-75','75-100'][bi]}%: ${n}건`}></div>
                              ));
                            })()}
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-bold mt-0.5">
                            <span className="text-slate-400" title={t('계획 평균', 'Planned avg')}>{t('계획', 'Plan')} {k.planVal ?? 0}%</span>
                            <span className="text-slate-500">{k.activeCount || activeProjectsCount}{t('건', '')}</span>
                          </div>
                        </div>
                      )}
                      {!Array.isArray(k.buckets) && (
                        <div className="text-[9px] font-bold mt-1 text-slate-500">
                          {t(`진행중 ${activeProjectsCount}건 평균`, `Avg of ${activeProjectsCount} active`)}
                        </div>
                      )}
                    </div>
                  ) : showRatio ? (
                    <div className="mt-2">
                      <div className={`relative w-full h-1.5 rounded-full overflow-hidden ${c.track}`}>
                        <div className={`absolute top-0 left-0 h-full ${c.barCls} transition-all`} style={{ width: `${pct * 100}%` }}></div>
                      </div>
                      <div className="flex items-center justify-between text-[9px] font-bold mt-1">
                        <span className="text-slate-500 tabular-nums">{k.value.toLocaleString()} / {k.total.toLocaleString()}</span>
                        <span className="text-slate-700">{pctLabel}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 h-[22px]"></div>
                  )}
                </button>
              );
            };
            return (
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                  {kpis.slice(0, 3).map(renderCard)}
                </div>
                <div className="grid grid-cols-2 gap-2 flex-1 min-h-0">
                  {kpis.slice(3).map(renderCard)}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 중앙 — 인력/리소스 요약 (가용성 차트 + 임박 이벤트) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col lg:h-[26rem]">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center"><Users size={14} className="mr-1.5 text-indigo-500" />{t('인력/리소스 요약', 'Resource Summary')}</h3>
            <button onClick={() => setSecondary('resource')} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold">{t('상세', 'Details')} →</button>
          </div>
          {/* 상단: 가용성 가로 스택 막대 + 인라인 범례 */}
          {(() => {
            const stayingHome = Math.max(0, resourceStat.available - resourceStat.scheduled.length);
            const segs = [
              { label: t('가용', 'Available'), value: stayingHome, bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
              { label: t('출장 예정', 'Scheduled'), value: resourceStat.scheduled.length, bar: 'bg-blue-500', dot: 'bg-blue-500' },
              { label: t('현장 파견', 'On Site'), value: resourceStat.onsite.length, bar: 'bg-purple-500', dot: 'bg-purple-500' },
            ];
            const total = segs.reduce((s, d) => s + d.value, 0);
            return (
              <div className="mb-3 shrink-0">
                {/* 헤더: 총 인원 + 큰 숫자 */}
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500">{t('총 인원', 'Total')}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-slate-800 leading-none">{resourceStat.total}</span>
                    <span className="text-xs font-bold text-slate-500">{t('명', '')}</span>
                  </div>
                </div>
                {/* 가로 스택 막대 */}
                <div className="flex h-7 w-full rounded-md overflow-hidden bg-slate-100 border border-slate-200 mb-2">
                  {total === 0 ? (
                    <div className="w-full flex items-center justify-center text-[10px] text-slate-400">{t('데이터 없음', 'No Data')}</div>
                  ) : segs.map((s, i) => {
                    const pct = (s.value / total) * 100;
                    if (pct === 0) return null;
                    return (
                      <div key={i} className={`${s.bar} flex items-center justify-center text-[10px] font-black text-white transition-all`} style={{ width: `${pct}%` }} title={`${s.label} ${s.value}${t('명', '')} (${Math.round(pct)}%)`}>
                        {pct >= 10 ? s.value : ''}
                      </div>
                    );
                  })}
                </div>
                {/* 범례 + 카운트 + 비율 */}
                <div className="flex items-center justify-between gap-2 text-[10px] flex-wrap">
                  {segs.map(s => {
                    const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
                    return (
                      <div key={s.label} className="flex items-center gap-1 whitespace-nowrap">
                        <span className={`w-2.5 h-2.5 rounded-sm ${s.dot} shrink-0`}></span>
                        <span className="text-slate-600 font-bold">{s.label}</span>
                        <span className="text-slate-800 font-black">{s.value}</span>
                        <span className="text-slate-400">({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          {/* 하단: 임박 이벤트 리스트 (출장 출발/복귀 + 자격 만료) */}
          <div className="border-t border-slate-100 pt-2 flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 flex items-center"><AlertCircle size={11} className="mr-1 text-amber-500" />{t('임박 이벤트 (30일)', 'Upcoming Events (30d)')}</span>
              <span className="text-[9px] text-slate-400 font-bold">{upcomingResourceEvents.length}{t('건', '')}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
              {upcomingResourceEvents.length === 0 ? (
                <div className="text-center py-4 text-xs text-emerald-600 flex flex-col items-center gap-1">
                  <CheckCircle size={20} className="text-emerald-500" />
                  {t('30일 내 임박 이벤트 없음', 'No events in next 30d')}
                </div>
              ) : upcomingResourceEvents.map((ev, i) => {
                const urgent = ev.days <= 7;
                if (ev.kind === 'depart') {
                  return (
                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] ${urgent ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-white bg-blue-600 px-1 py-0.5 rounded shrink-0">
                        <Plane size={9} />{t('출발', 'Depart')}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{ev.engineer.name}</span>
                      {ev.engineer.grade && <span className="text-[9px] text-slate-500">{ev.engineer.grade}</span>}
                      <span className="text-slate-500 truncate">→ {ev.site || '-'}</span>
                      <span className={`ml-auto text-[9px] font-black px-1 rounded shrink-0 whitespace-nowrap ${urgent ? 'bg-blue-600 text-white' : 'text-blue-700'}`}>D-{ev.days}</span>
                    </div>
                  );
                } else if (ev.kind === 'return') {
                  return (
                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] ${urgent ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-white bg-emerald-600 px-1 py-0.5 rounded shrink-0">
                        <Home size={9} />{t('복귀', 'Return')}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{ev.engineer.name}</span>
                      {ev.engineer.grade && <span className="text-[9px] text-slate-500">{ev.engineer.grade}</span>}
                      <span className="text-slate-500 truncate">← {ev.site || '-'}</span>
                      <span className={`ml-auto text-[9px] font-black px-1 rounded shrink-0 whitespace-nowrap ${urgent ? 'bg-emerald-600 text-white' : 'text-emerald-700'}`}>D-{ev.days}</span>
                    </div>
                  );
                } else { // cert
                  return (
                    <div key={i} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] ${urgent ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-100'}`}>
                      <span className={`inline-flex items-center gap-0.5 text-[9px] font-black text-white px-1 py-0.5 rounded shrink-0 ${urgent ? 'bg-rose-600' : 'bg-amber-600'}`}>
                        <AlertTriangle size={9} />{t('만료', 'Expire')}
                      </span>
                      <span className="font-bold text-slate-800 truncate">{ev.engineer.name}</span>
                      <span className="text-slate-500 truncate">{ev.certKind}{ev.certName ? ` (${ev.certName})` : ''}</span>
                      <span className={`ml-auto text-[9px] font-black px-1 rounded shrink-0 whitespace-nowrap ${urgent ? 'bg-rose-600 text-white' : 'text-amber-700'}`}>D-{ev.days}</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>

        {/* 우측 — 이슈/AS 현황 (상하 2단: 위 이슈 / 아래 AS) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col lg:h-[26rem]">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center"><AlertCircle size={14} className="mr-1.5 text-amber-500" />{t('이슈 / AS 현황', 'Issue / AS Status')}</h3>
          </div>

          {/* === 상단: 이슈 === */}
          <div className="flex flex-col flex-1 min-h-0">
            <button
              onClick={() => unresolvedIssuesCount > 0 && setIssuePopupOpen(true)}
              disabled={unresolvedIssuesCount === 0}
              className={`flex items-center justify-between mb-1 -mx-1 px-1 py-0.5 rounded transition-colors ${unresolvedIssuesCount > 0 ? 'hover:bg-amber-50 cursor-pointer group' : 'cursor-default'}`}
            >
              <span className="text-[11px] font-bold text-slate-700 flex items-center"><AlertCircle size={11} className="mr-1 text-amber-500" />{t('미해결 이슈', 'Unresolved Issues')} <span className="ml-1 text-[10px] text-slate-400">({unresolvedIssuesCount})</span></span>
              {unresolvedIssuesCount > 0 && (
                <span className="text-[10px] text-blue-600 group-hover:text-blue-800 font-bold flex items-center">{t('전체 보기', 'View all')} <ExternalLink size={10} className="ml-0.5" /></span>
              )}
            </button>
            {(() => {
              const total = issueStats.reduce((s, d) => s + d.value, 0);
              return (
                <div className="mb-1.5">
                  <div className="flex h-4 w-full rounded-md overflow-hidden bg-slate-100 border border-slate-200 mb-1">
                    {total === 0 ? (
                      <div className="w-full flex items-center justify-center text-[9px] text-emerald-600 font-bold">{t('미해결 없음', 'None')}</div>
                    ) : issueStats.map((d, i) => {
                      const pct = (d.value / total) * 100;
                      if (pct === 0) return null;
                      return (
                        <div key={i} className={`${d.color} flex items-center justify-center text-[9px] font-black text-white`} style={{ width: `${pct}%` }} title={`${d.label} ${d.value}${t('건', '')}`}>
                          {pct >= 14 ? d.value : ''}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] flex-wrap">
                    {issueStats.map(d => (
                      <div key={d.label} className="flex items-center gap-0.5 whitespace-nowrap">
                        <span className={`w-1.5 h-1.5 rounded-sm ${d.color} shrink-0`}></span>
                        <span className="text-slate-600 font-bold">{d.label}</span>
                        <span className="text-slate-800 font-black">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
              {recentUnresolvedIssues.length === 0 ? (
                <div className="text-center py-2 text-[11px] text-emerald-600 flex items-center justify-center gap-1">
                  <CheckCircle size={14} className="text-emerald-500" />
                  {t('미해결 이슈 없음', 'No issues.')}
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {recentUnresolvedIssues.slice(0, 3).map(i => {
                    const sevCls = i.severity === 'High' ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : i.severity === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                    return (
                      <li key={i.id}>
                        <button onClick={() => onIssueClick && onIssueClick(i)} className="w-full text-left flex items-start gap-1.5 px-1.5 py-1 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                          <span className={`text-[9px] font-black px-1 py-0.5 rounded border shrink-0 ${sevCls}`}>{i.severity}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-800 truncate">{i.title}</div>
                            <div className="text-[9px] text-slate-500 truncate">{i.projectName}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* === 하단: AS === */}
          <div className="flex flex-col flex-1 min-h-0 mt-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => pendingASCount > 0 && setPopupKind('as')}
              disabled={pendingASCount === 0}
              className={`flex items-center justify-between mb-1 -mx-1 px-1 py-0.5 rounded transition-colors ${pendingASCount > 0 ? 'hover:bg-purple-50 cursor-pointer group' : 'cursor-default'}`}
            >
              <span className="text-[11px] font-bold text-slate-700 flex items-center"><LifeBuoy size={11} className="mr-1 text-purple-500" />{t('AS 미완료', 'Pending AS')} <span className="ml-1 text-[10px] text-slate-400">({pendingASCount})</span></span>
              {pendingASCount > 0 && (
                <span className="text-[10px] text-purple-600 group-hover:text-purple-800 font-bold flex items-center">{t('전체 보기', 'View all')} <ExternalLink size={10} className="ml-0.5" /></span>
              )}
            </button>
            {(() => {
              const total = asStats.reduce((s, d) => s + d.value, 0);
              return (
                <div className="mb-1.5">
                  <div className="flex h-4 w-full rounded-md overflow-hidden bg-slate-100 border border-slate-200 mb-1">
                    {total === 0 ? (
                      <div className="w-full flex items-center justify-center text-[9px] text-emerald-600 font-bold">{t('AS 미완료 없음', 'None')}</div>
                    ) : asStats.map((d, i) => {
                      const pct = (d.value / total) * 100;
                      if (pct === 0) return null;
                      return (
                        <div key={i} className={`${d.color} flex items-center justify-center text-[9px] font-black text-white`} style={{ width: `${pct}%` }} title={`${d.label} ${d.value}${t('건', '')}`}>
                          {pct >= 14 ? d.value : ''}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] flex-wrap">
                    {asStats.filter(d => d.value > 0).map(d => (
                      <div key={d.label} className="flex items-center gap-0.5 whitespace-nowrap">
                        <span className={`w-1.5 h-1.5 rounded-sm ${d.color} shrink-0`}></span>
                        <span className="text-slate-600 font-bold">{d.label}</span>
                        <span className="text-slate-800 font-black">{d.value}</span>
                      </div>
                    ))}
                    {asStats.every(d => d.value === 0) && asStats.map(d => (
                      <div key={d.label} className="flex items-center gap-0.5 whitespace-nowrap opacity-40">
                        <span className={`w-1.5 h-1.5 rounded-sm ${d.color} shrink-0`}></span>
                        <span className="text-slate-500 font-bold">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
              {recentPendingAS.length === 0 ? (
                <div className="text-center py-2 text-[11px] text-emerald-600 flex items-center justify-center gap-1">
                  <CheckCircle size={14} className="text-emerald-500" />
                  {t('AS 미완료 없음', 'No pending AS.')}
                </div>
              ) : (
                <ul className="space-y-0.5">
                  {recentPendingAS.slice(0, 3).map(a => {
                    const tCls = a.type === '긴급출동' ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : a.type === '정기점검' ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : a.type === '부품교체' ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : a.type === '불량수리' ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : 'bg-indigo-100 text-indigo-700 border-indigo-200';
                    return (
                      <li key={`${a.projectId}-${a.id}`}>
                        <button onClick={() => onProjectClick && onProjectClick(a.projectId, 'as')} className="w-full text-left flex items-start gap-1.5 px-1.5 py-1 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors">
                          <span className={`text-[9px] font-black px-1 py-0.5 rounded border shrink-0 ${tCls}`}>{a.type}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-slate-800 truncate">{a.projectName}</div>
                            <div className="text-[9px] text-slate-500 truncate">{a.engineer || '-'} · {a.date}</div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 전체 프로젝트 일정 + 인력 배치 — 간트 + 프로젝트별 배치 인력 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-slate-800 flex items-center"><CalendarDays size={14} className="mr-1.5 text-indigo-500" />{t('전체 프로젝트 일정 + 인력 배치', 'Project Timeline + Resources')}</h3>
          <div className="flex items-center gap-3 text-[10px] flex-wrap">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0"></span>
              <span className="text-slate-600 font-bold">{t('가용', 'Available')}</span>
              <span className="text-slate-800 font-black">{availablePool.length}</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 shrink-0"></span>
              <span className="text-slate-600 font-bold">{t('출장 예정', 'Scheduled')}</span>
              <span className="text-slate-800 font-black">{resourceStat.scheduled.length}</span>
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 shrink-0"></span>
              <span className="text-slate-600 font-bold">{t('현장 파견', 'On Site')}</span>
              <span className="text-slate-800 font-black">{resourceStat.onsite.length}</span>
            </span>
            <span className="text-slate-300">|</span>
            {/* 줌 컨트롤 + 오늘 이동 */}
            <div className="flex items-center gap-1">
              <button onClick={() => setDashGanttZoom(z => Math.max(0.5, +(z - 0.25).toFixed(2)))} disabled={dashGanttZoom <= 0.5} className="inline-flex items-center justify-center w-6 h-6 rounded bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('축소', 'Zoom out')}>
                <ZoomOut size={12} />
              </button>
              <span className="text-[10px] font-bold text-slate-700 px-1.5 min-w-[2.5rem] text-center bg-white border border-slate-200 rounded">{Math.round(dashGanttZoom * 100)}%</span>
              <button onClick={() => setDashGanttZoom(z => Math.min(4, +(z + 0.25).toFixed(2)))} disabled={dashGanttZoom >= 4} className="inline-flex items-center justify-center w-6 h-6 rounded bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-300 hover:border-indigo-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed" title={t('확대', 'Zoom in')}>
                <ZoomIn size={12} />
              </button>
              <button onClick={() => { dashGanttInitialScrolled.current = false; scrollGanttToToday(); dashGanttInitialScrolled.current = true; }} className="inline-flex items-center justify-center w-6 h-6 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 transition-colors ml-0.5" title={t('오늘로 이동', 'Jump to today')}>
                <Crosshair size={12} />
              </button>
            </div>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400 whitespace-nowrap">{t('휠=줌 · Shift+휠=좌우', 'wheel=zoom · Shift+wheel=pan')}</span>
          </div>
        </div>

        {/* 범례 — 막대(프로젝트 상태) + 마일스톤(종류 / 긴급도) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 mb-3 pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-700 whitespace-nowrap">{t('막대(프로젝트 상태)', 'Bar (status)')}:</span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-3 h-2 rounded-sm bg-blue-500"></span><span className="font-bold text-slate-600">{t('진행중', 'Active')}</span></span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-3 h-2 rounded-sm bg-amber-500"></span><span className="font-bold text-slate-600">{t('마감임박', 'Due Soon')}</span></span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-3 h-2 rounded-sm bg-red-500"></span><span className="font-bold text-slate-600">{t('이슈발생', 'Issue')}</span></span>
          <span className="flex items-center gap-1 whitespace-nowrap"><span className="w-3 h-2 rounded-sm bg-emerald-500"></span><span className="font-bold text-slate-600">{t('완료', 'Done')}</span></span>
          <span className="text-slate-400 italic whitespace-nowrap">{t('· 좌=경과(진함) / 우=예정(60% 투명)', '· left=past / right=upcoming (60%)')}</span>
          <span className="text-slate-300">|</span>
          <span className="font-bold text-slate-700 whitespace-nowrap">{t('마일스톤 ◆', 'Milestone ◆')}:</span>
          <span className="flex items-center gap-1 whitespace-nowrap" title={t('D-7 이내 임박 (긴급)', 'within D-7 (urgent)')}>
            <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#dc2626"/></svg>
            <span className="font-bold text-red-600">D-7 {t('임박', 'urgent')}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap" title={t('D-30 이내 임박', 'within D-30')}>
            <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#f59e0b"/></svg>
            <span className="font-bold text-amber-600">D-30 {t('임박', 'soon')}</span>
          </span>
          <span className="text-slate-400">·</span>
          <span className="flex items-center gap-1 whitespace-nowrap" title={t('단계(Phase) 마일스톤', 'Phase milestone')}>
            <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#f43f5e"/></svg>
            <span className="text-slate-600">{t('단계', 'Phase')}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap" title={t('셋업 작업 마일스톤', 'Setup task milestone')}>
            <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#a855f7"/></svg>
            <span className="text-slate-600">{t('셋업', 'Setup')}</span>
          </span>
          <span className="flex items-center gap-1 whitespace-nowrap" title={t('프로젝트 납기일', 'Project due date')}>
            <svg width="10" height="10" viewBox="0 0 14 14"><polygon points="7,1 13,7 7,13 1,7" fill="#3b82f6"/></svg>
            <span className="text-slate-600">{t('납기', 'Due')}</span>
          </span>
          <span className="text-slate-400 italic whitespace-nowrap">{t('· 지난 항목은 40% 흐림 / 호버 = 상세', '· past items dimmed / hover = detail')}</span>
        </div>
        {!overallGantt || overallGantt.rows.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">{t('일정이 등록된 프로젝트가 없습니다.', 'No projects with schedules.')}</div>
        ) : (() => {
          const ROW_H = 36;
          const STATUS_COLOR = (status) => {
            switch (status) {
              case '이슈발생': return { bar: 'bg-red-400', past: 'bg-red-600' };
              case '마감임박': return { bar: 'bg-amber-300', past: 'bg-amber-500' };
              case '완료': return { bar: 'bg-emerald-300', past: 'bg-emerald-500' };
              default: return { bar: 'bg-blue-300', past: 'bg-blue-500' };
            }
          };
          return (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3 lg:items-stretch">
              {/* 좌측 사이드바 — 현장별 인력 배치 + 출장 일정 (간트 외부, 간트 높이에 맞춤) */}
              <div className="flex flex-col gap-3 min-h-0">
                {/* 현장별 인력 배치 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200 shrink-0">
                    <span className="text-xs font-bold text-slate-700 flex items-center">
                      <MapPin size={12} className="mr-1 text-purple-500" />{t('현장별 인력 배치', 'By Site')}
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 bg-white border border-purple-200 px-1.5 py-0.5 rounded">{resourceStat.onsite.length}{t('명', '')}</span>
                  </div>
                  {ganttSidebar.siteList.length === 0 ? (
                    <div className="text-center py-3 text-[11px] text-slate-400 italic">{t('현재 현장 파견 인력 없음', 'No one on-site')}</div>
                  ) : (
                    <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1">
                      {ganttSidebar.siteList.map(({ site, list }) => (
                        <div key={site} className="bg-white rounded border border-purple-100 p-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-black text-purple-800 truncate flex items-center" title={site}>
                              <MapPin size={9} className="mr-0.5 text-purple-500 shrink-0" />{site}
                            </span>
                            <span className="text-[9px] font-bold text-purple-600 shrink-0">{list.length}{t('명', '')}</span>
                          </div>
                          <ul className="space-y-0.5">
                            {list.map(({ engineer: e, trip }) => (
                              <li key={e.id} className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-slate-700 truncate min-w-0">
                                  {e.name}{e.grade && <span className="ml-0.5 text-[9px] text-slate-500 font-normal">{e.grade}</span>}
                                </span>
                                <span className="text-[9px] font-bold text-purple-700 whitespace-nowrap shrink-0 ml-1">D-{Math.max(0, trip.daysLeft || 0)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 출장 일정 */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col flex-1 min-h-0">
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200 shrink-0">
                    <span className="text-xs font-bold text-slate-700 flex items-center">
                      <Plane size={12} className="mr-1 text-blue-500" />{t('출장 일정', 'Trip Schedule')}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-white border border-blue-200 px-1.5 py-0.5 rounded">{ganttSidebar.scheduled.length}{t('명', '')}</span>
                  </div>
                  {ganttSidebar.scheduled.length === 0 ? (
                    <div className="text-center py-3 text-[11px] text-slate-400 italic">{t('예정된 출장 없음', 'No scheduled trips')}</div>
                  ) : (
                    <ul className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-1">
                      {ganttSidebar.scheduled.map(({ engineer: e, trip }) => {
                        const urgent = (trip.daysUntil || 0) <= 7;
                        return (
                          <li key={e.id} className={`p-1.5 rounded border text-[10px] ${urgent ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-bold text-slate-800 truncate">
                                {e.name}{e.grade && <span className="ml-0.5 text-[9px] text-slate-500 font-normal">{e.grade}</span>}
                              </span>
                              <span className={`text-[9px] font-black px-1 py-0 rounded shrink-0 ${urgent ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>D-{Math.max(0, trip.daysUntil || 0)}</span>
                            </div>
                            <div className="text-[9px] text-slate-500 truncate flex items-center">
                              <MapPin size={8} className="mr-0.5 shrink-0" />{trip.site || trip.projectName || '-'} · {trip.departureDate}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* 우측 — 간트 차트 본체 */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              {/* 좌측 — 프로젝트명 + 담당자 (PM) */}
              <div className="w-80 shrink-0 bg-slate-50 border-r border-slate-200 pt-5">
                <div className="h-7 px-2 flex items-end pb-0.5 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">{t('프로젝트 / 담당자', 'Project / Manager')}</div>
                <div className="overflow-y-auto" style={{ maxHeight: `${Math.min(overallGantt.rows.length, 10) * ROW_H}px` }}>
                  {overallGantt.rows.map(r => (
                    <div key={r.project.id} style={{ height: ROW_H }} className="px-2 py-1 flex items-center border-b border-slate-100 last:border-b-0 cursor-pointer hover:bg-indigo-50/40 gap-1.5" onClick={() => onProjectClick && onProjectClick(r.project.id)} title={r.project.name}>
                      <span className="text-xs font-bold text-slate-700 truncate leading-tight flex-1 min-w-0">{r.project.name}</span>
                      {r.project.manager && (
                        <span className="text-[10px] font-bold bg-indigo-600 text-white shrink-0 inline-flex items-center rounded-full overflow-hidden" title={t(`담당자(PM): ${r.project.manager}`, `Project Manager: ${r.project.manager}`)}>
                          <span className="bg-indigo-700 px-1.5 py-0 text-[9px] font-black tracking-tight">PM</span>
                          <span className="px-1.5 py-0 truncate max-w-[5rem]">{r.project.manager}</span>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 차트 영역 — ref 부착, 줌 적용 */}
              <div className="flex-1 overflow-x-auto" ref={dashGanttScrollRef}>
                <div className="relative pt-5" style={{ width: `${Math.max(800, Math.round(overallGantt.days * 12 * dashGanttZoom))}px`, minWidth: '100%' }}>
                  <div className="h-7 border-b border-slate-200 bg-slate-50 relative">
                    {overallGantt.months.map((m, i) => (
                      <div key={i} className="absolute h-full text-[10px] font-bold text-slate-600 border-l border-slate-300 pl-1 flex items-end pb-0.5" style={{ left: `${m.pos}%` }}>{m.label}</div>
                    ))}
                  </div>
                  {overallGantt.todayPct >= 0 && overallGantt.todayPct <= 100 && (
                    <div className="absolute top-0 bottom-0 z-20 pointer-events-none" style={{ left: `${overallGantt.todayPct}%` }}>
                      <div className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap leading-tight border border-red-600">▼ {t('오늘', 'Today')}</div>
                      <div className="absolute top-5 bottom-0 left-0 border-l-2 border-dashed border-red-500 -translate-x-1/2"></div>
                    </div>
                  )}
                  <div className="overflow-y-auto" style={{ maxHeight: `${Math.min(overallGantt.rows.length, 8) * ROW_H}px` }}>
                    {overallGantt.rows.map(r => {
                      const c = STATUS_COLOR(r.project.status);
                      const innerTodayPct = Math.max(0, Math.min(100, ((overallGantt.todayPct - r.leftPct) / r.widthPct) * 100));
                      // 프로젝트 마일스톤 — 단계 + 셋업 + 납기일
                      const todayDate = new Date(TODAY);
                      const totalMs = overallGantt.days * DAY_MS;
                      const projMilestones = [];
                      (r.project.phases || []).forEach(ph => {
                        if (!ph.isMilestone || !ph.endDate) return;
                        const d = new Date(ph.endDate);
                        if (isNaN(d) || d < overallGantt.min || d > overallGantt.max) return;
                        const pos = ((d - overallGantt.min) / totalMs) * 100;
                        projMilestones.push({ kind: 'phase', name: ph.name, date: d, pos });
                      });
                      (r.project.tasks || []).forEach(tk => {
                        if (!tk.isMilestone || !tk.endDate || tk.isCompleted) return;
                        const d = new Date(tk.endDate);
                        if (isNaN(d) || d < overallGantt.min || d > overallGantt.max) return;
                        const pos = ((d - overallGantt.min) / totalMs) * 100;
                        projMilestones.push({ kind: 'setup', name: tk.name, date: d, pos });
                      });
                      if (r.project.dueDate) {
                        const d = new Date(r.project.dueDate);
                        if (!isNaN(d) && d >= overallGantt.min && d <= overallGantt.max) {
                          const pos = ((d - overallGantt.min) / totalMs) * 100;
                          projMilestones.push({ kind: 'due', name: t('납기', 'Due'), date: d, pos });
                        }
                      }
                      const colorFor = (kind, dDays) => {
                        if (dDays >= 0 && dDays <= 7) return '#dc2626';
                        if (dDays >= 0 && dDays <= 30) return '#f59e0b';
                        return kind === 'phase' ? '#f43f5e' : kind === 'setup' ? '#a855f7' : '#3b82f6';
                      };
                      return (
                        <div key={r.project.id} style={{ height: ROW_H }} className="relative border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 cursor-pointer" onClick={() => onProjectClick && onProjectClick(r.project.id)}>
                          {overallGantt.months.map((m, i) => (
                            <div key={i} className="absolute top-0 bottom-0 border-l border-slate-100" style={{ left: `${m.pos}%` }}></div>
                          ))}
                          <div className="absolute h-4 rounded shadow-sm overflow-hidden ring-1 ring-slate-300/50" style={{ left: `${r.leftPct}%`, width: `${Math.max(r.widthPct, 0.5)}%`, top: '50%', transform: 'translateY(-50%)' }} title={`${r.project.name} (${r.project.startDate} ~ ${r.project.dueDate})`}>
                            <div className={`absolute top-0 bottom-0 left-0 ${c.past}`} style={{ width: `${innerTodayPct}%` }}></div>
                            <div className={`absolute top-0 bottom-0 right-0 ${c.bar} opacity-60`} style={{ width: `${100 - innerTodayPct}%` }}></div>
                          </div>
                          {/* 마일스톤 다이아몬드 — 막대 위에 오버레이 (눈에 띄게 강화) */}
                          {projMilestones.map((ms, j) => {
                            const dDays = Math.ceil((ms.date - todayDate) / DAY_MS);
                            const fill = colorFor(ms.kind, dDays);
                            const isPast = dDays < 0;
                            const isUrgent = !isPast && dDays <= 7;
                            const isWarning = !isPast && dDays > 7 && dDays <= 30;
                            return (
                              <span
                                key={j}
                                className={`absolute z-30 pointer-events-none ${isPast ? 'opacity-40' : ''}`}
                                style={{ left: `${ms.pos}%`, top: '50%', transform: 'translate(-50%, -50%)' }}
                                title={`${ms.name} · ${ms.kind === 'phase' ? '단계' : ms.kind === 'setup' ? '셋업' : '납기'} · ${ms.date.toISOString().split('T')[0]}${dDays >= 0 ? ` · D-${dDays}` : ` · ${Math.abs(dDays)}일 경과`}`}
                              >
                                <span className="relative inline-flex items-center justify-center">
                                  {/* 긴급(D-7) 펄스 후광 */}
                                  {isUrgent && (
                                    <span className="absolute inline-flex w-5 h-5 rounded-full opacity-50 animate-ping" style={{ backgroundColor: fill }}></span>
                                  )}
                                  {/* 외곽 흰색 글로우 (눈에 띄게) */}
                                  <svg width={isUrgent ? '20' : isWarning ? '18' : '16'} height={isUrgent ? '20' : isWarning ? '18' : '16'} viewBox="0 0 14 14" className="relative drop-shadow">
                                    {/* 외곽 흰 테두리 */}
                                    <polygon points="7,0.5 13.5,7 7,13.5 0.5,7" fill="white" />
                                    {/* 내부 색 채움 */}
                                    <polygon points="7,2 12,7 7,12 2,7" fill={fill} />
                                    {/* 긴급은 작은 ! 표시 */}
                                    {isUrgent && (
                                      <text x="7" y="9" textAnchor="middle" fontSize="6" fontWeight="900" fill="white">!</text>
                                    )}
                                  </svg>
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* KPI 클릭 — 공통 ListPopup (진행중 / 위험 / 임박 / 전체) */}
      {popupKind && (() => {
        const today = new Date(TODAY);
        let title = '', headerCls = 'bg-blue-50', headerText = 'text-blue-800', icon = <Kanban size={18} className="mr-2" />, items = [];
        if (popupKind === 'active') {
          title = t('진행중 프로젝트', 'Active Projects');
          headerCls = 'bg-blue-50'; headerText = 'text-blue-800';
          icon = <Kanban size={18} className="mr-2" />;
          items = projects.filter(p => p.status !== '완료');
        } else if (popupKind === 'request') {
          title = t('고객 요청 미처리 (긴급도순)', 'Pending Customer Requests (Urgency)');
          headerCls = 'bg-cyan-50'; headerText = 'text-cyan-800';
          icon = <MessageSquare size={18} className="mr-2" />;
          const flat = [];
          projects.forEach(p => {
            (p.customerRequests || []).forEach(r => {
              if (r.status === '접수' || r.status === '검토중') {
                flat.push({ ...r, projectId: p.id, projectName: p.name, customer: p.customer });
              }
            });
          });
          const urgencyOrder = { High: 0, Medium: 1, Low: 2 };
          items = flat.sort((a, b) => {
            const ua = urgencyOrder[a.urgency] ?? 3;
            const ub = urgencyOrder[b.urgency] ?? 3;
            if (ua !== ub) return ua - ub;
            return new Date(b.date) - new Date(a.date);
          });
        } else if (popupKind === 'as') {
          title = t('AS 미완료 (긴급출동 우선)', 'Pending AS (Emergency First)');
          headerCls = 'bg-purple-50'; headerText = 'text-purple-800';
          icon = <LifeBuoy size={18} className="mr-2" />;
          items = pendingAS.slice().sort((a, b) => {
            if (a.type === '긴급출동' && b.type !== '긴급출동') return -1;
            if (b.type === '긴급출동' && a.type !== '긴급출동') return 1;
            return new Date(b.date) - new Date(a.date);
          });
        } else if (popupKind === 'risk') {
          title = t('지연·위험 프로젝트', 'At-Risk Projects');
          headerCls = 'bg-rose-50'; headerText = 'text-rose-800';
          icon = <AlertTriangle size={18} className="mr-2" />;
          items = topRisks; // 점수화된 객체 배열 (project, score, slip, reasons, exp, act)
        } else if (popupKind === 'milestone') {
          title = t('임박한 마일스톤 (60일)', 'Upcoming Milestones (60d)');
          headerCls = 'bg-amber-50'; headerText = 'text-amber-800';
          icon = <Star size={18} className="mr-2 fill-amber-500 text-amber-500" />;
          items = upcomingMilestones;
        } else if (popupKind === 'all') {
          title = t('전체 프로젝트', 'All Projects');
          headerCls = 'bg-emerald-50'; headerText = 'text-emerald-800';
          icon = <CheckCircle size={18} className="mr-2" />;
          items = projects;
        }
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={() => setPopupKind(null)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
              <div className={`px-5 py-4 border-b border-slate-200 flex justify-between items-center ${headerCls} shrink-0`}>
                <h3 className={`text-base font-bold ${headerText} flex items-center`}>
                  {icon}{title}
                  <span className={`ml-2 text-xs bg-white/70 ${headerText} px-2 py-0.5 rounded-full border border-current/20`}>{items.length}{t('건', '')}</span>
                </h3>
                <button onClick={() => setPopupKind(null)} className="text-slate-400 hover:text-slate-700 p-1"><X size={20} /></button>
              </div>
              <div className="overflow-y-auto flex-1 p-4 bg-slate-50 space-y-2">
                {items.length === 0 ? (
                  <div className="text-center py-10 text-emerald-600 text-sm">
                    <CheckCircle size={28} className="mx-auto mb-2 text-emerald-500" />{t('해당 항목이 없습니다.', 'None.')}
                  </div>
                ) : popupKind === 'risk' ? (
                  items.map((r, i) => (
                    <button key={r.project.id} onClick={() => { setPopupKind(null); onProjectClick && onProjectClick(r.project.id); }} className="w-full text-left p-3 bg-white border border-slate-200 hover:border-rose-400 hover:shadow-md rounded-lg transition-all">
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-black text-rose-600">#{i + 1}</span>
                          <span className="text-sm font-bold text-slate-800 truncate">{r.project.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">{r.project.id}</span>
                        </div>
                        <span className="text-xs font-black text-white bg-rose-500 px-2 py-0.5 rounded shrink-0">{Math.round(r.score)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mb-1">
                        <span className="text-blue-600">{t('실적', 'Act')} <strong>{r.act}%</strong></span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500">{t('예상', 'Exp')} {r.exp}%</span>
                        <span className="text-slate-300 mx-1">·</span>
                        <span className="text-slate-500">{r.project.customer} · {r.project.manager || '-'}</span>
                      </div>
                      <div className="text-xs text-rose-700">{r.reasons.join(' · ')}</div>
                    </button>
                  ))
                ) : popupKind === 'milestone' ? (
                  items.map((m, i) => {
                    const dDays = Math.ceil((new Date(m.date) - today) / DAY_MS);
                    const urgent = dDays <= 7, warning = dDays <= 30 && !urgent;
                    const bg = urgent ? 'bg-rose-50 border-rose-200' : warning ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200';
                    const dCls = urgent ? 'bg-rose-500 text-white' : warning ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700';
                    const kindLabel = m.kind === 'phase' ? t('단계', 'Phase') : m.kind === 'setup' ? t('셋업', 'Setup') : t('납기', 'Due');
                    return (
                      <button key={i} onClick={() => { setPopupKind(null); onProjectClick && onProjectClick(m.projectId); }} className={`w-full text-left p-3 ${bg} border hover:shadow-md rounded-lg transition-all`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-bold">{kindLabel}</span>
                            <span className="text-sm font-bold text-slate-800 truncate">{m.label}</span>
                          </div>
                          <span className={`text-xs font-black ${dCls} px-2 py-0.5 rounded shrink-0`}>D-{dDays}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                          <Building size={11} className="shrink-0" />{m.projectName}
                          <span className="text-slate-300">·</span>
                          <span className="font-mono text-slate-500">{m.date}</span>
                          {m.customer && <><span className="text-slate-300">·</span><span>{m.customer}</span></>}
                        </div>
                      </button>
                    );
                  })
                ) : popupKind === 'request' ? (
                  items.map(r => {
                    const urgencyColor = r.urgency === 'High' ? 'bg-red-100 text-red-700 border-red-200'
                      : r.urgency === 'Medium' ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-emerald-100 text-emerald-700 border-emerald-200';
                    const statusColor = r.status === '검토중' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                    return (
                      <button key={`${r.projectId}-${r.id}`} onClick={() => { setPopupKind(null); onProjectClick && onProjectClick(r.projectId, 'requests'); }} className="w-full text-left p-3 bg-white border border-slate-200 hover:border-cyan-400 hover:shadow-md rounded-lg transition-all">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${urgencyColor}`}>{r.urgency}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>{r.status}</span>
                          <span className="text-sm font-bold text-slate-800 truncate flex-1 min-w-0">{r.projectName}</span>
                          <span className="text-[10px] text-slate-400 ml-auto shrink-0">{r.date}</span>
                        </div>
                        <div className="flex items-center text-[11px] text-slate-500 gap-3 mb-1">
                          {r.customer && <span className="flex items-center"><Building size={10} className="mr-1" />{r.customer}</span>}
                          {r.requester && <span className="flex items-center"><User size={10} className="mr-1" />{r.requester}</span>}
                        </div>
                        {r.content && <p className="text-xs text-slate-700 line-clamp-2 whitespace-pre-wrap">{r.content}</p>}
                      </button>
                    );
                  })
                ) : popupKind === 'as' ? (
                  items.map(a => {
                    const typeColor = a.type === '긴급출동' ? 'bg-rose-100 text-rose-700 border-rose-200'
                      : a.type === '정기점검' ? 'bg-blue-100 text-blue-700 border-blue-200'
                      : a.type === '부품교체' ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : a.type === '불량수리' ? 'bg-orange-100 text-orange-700 border-orange-200'
                      : a.type === '보증수리' ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200';
                    const statusColor = a.status === '출동' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200';
                    return (
                      <button key={`${a.projectId}-${a.id}`} onClick={() => { setPopupKind(null); onProjectClick && onProjectClick(a.projectId, 'as'); }} className="w-full text-left p-3 bg-white border border-slate-200 hover:border-purple-400 hover:shadow-md rounded-lg transition-all">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeColor}`}>{a.type}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>{a.status}</span>
                          <span className="text-sm font-bold text-slate-800 truncate flex-1 min-w-0">{a.projectName}</span>
                          <span className="text-[10px] text-slate-400 ml-auto shrink-0">{a.date}</span>
                        </div>
                        <div className="flex items-center text-[11px] text-slate-500 gap-3 mb-1">
                          <span className="flex items-center"><Building size={10} className="mr-1" />{a.customer || '-'}</span>
                          <span className="flex items-center"><User size={10} className="mr-1" />{a.engineer || '-'}</span>
                        </div>
                        {a.description && <p className="text-xs text-slate-700 line-clamp-2 whitespace-pre-wrap">{a.description}</p>}
                      </button>
                    );
                  })
                ) : (
                  // 'active' / 'all' / 'newStart' — 프로젝트 리스트
                  items.map(p => {
                    const exp = (p.startDate && p.dueDate) ? calcExp(p.startDate, p.dueDate) : 0;
                    const act = calcOverallProgress(p);
                    const phaseName = getCurrentPhaseName(p);
                    const stCls = p.status === '완료' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : p.status === '이슈발생' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200';
                    return (
                      <button key={p.id} onClick={() => { setPopupKind(null); onProjectClick && onProjectClick(p.id); }} className="w-full text-left p-3 bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-lg transition-all">
                        <div className="flex items-center justify-between mb-1.5 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-bold text-slate-800 truncate">{p.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">{p.id}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shrink-0 ${stCls}`}>{p.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-100">{phaseName}</span>
                          <Building size={11} />{p.customer}
                          <span className="text-slate-300">·</span>
                          <User size={11} />{p.manager || '-'}
                          <span className="text-slate-300">·</span>
                          <span className="text-blue-600">{t('실적', 'Act')} <strong>{act}%</strong></span>
                          <span className="text-slate-400">/ {t('예상', 'Exp')} {exp}%</span>
                          {p.dueDate && <><span className="text-slate-300">·</span><span className="font-mono text-slate-500">~{p.dueDate}</span></>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-white shrink-0">
                <button onClick={() => setPopupKind(null)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t('닫기', 'Close')}</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 미해결 이슈 상세 팝업 */}
      {/* 리포트 형식 선택 모달 — PDF / Excel */}
      {reportPickerOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[210] p-4 animate-[fadeIn_0.2s_ease-in-out]"
          onClick={() => setReportPickerOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-emerald-50">
              <h3 className="text-base font-bold text-emerald-800 flex items-center">
                <Download size={18} className="mr-2" />
                {t('리포트 내보내기', 'Export Report')}
              </h3>
              <button onClick={() => setReportPickerOpen(false)} className="text-emerald-400 hover:text-emerald-600 p-1"><X size={20} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-500 mb-4">{t('내보낼 리포트 형식을 선택해주세요.', 'Choose a report format to export.')}</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setReportPickerOpen(false); handleExportPDF(); }}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 transition-all"
                >
                  <FileText size={28} className="text-rose-600" />
                  <span className="text-sm font-bold text-rose-800">PDF</span>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">{t('브라우저 인쇄', 'Browser print')}</span>
                </button>
                <button
                  onClick={() => { setReportPickerOpen(false); handleExportSummary(); }}
                  className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all"
                >
                  <Download size={28} className="text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">Excel</span>
                  <span className="text-[10px] text-slate-500 text-center leading-tight">{t('차트 + 14개 시트', 'Charts + 14 sheets')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* 보조 섹션 모달 — 헤더 버튼 클릭으로 진입 */}
      {secondary && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={() => setSecondary(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h3 className="text-base font-bold text-slate-800 flex items-center">
                {secondary === 'analytics' && <><PieChart size={18} className="mr-2 text-indigo-500" />{t('고급 분석', 'Advanced Analytics')}</>}
                {secondary === 'meetings' && <><FileText size={18} className="mr-2 text-amber-500" />{t('회의록', 'Meetings')}</>}
                {secondary === 'resource' && <><Users size={18} className="mr-2 text-indigo-500" />{t('인력/리소스 상세', 'Resource Details')}</>}
              </h3>
              <button onClick={() => setSecondary(null)} className="text-slate-400 hover:text-slate-700 p-1"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50">

      {/* === Analytics 섹션 (Lead Time / MTTR — 핵심 시간 지표) === */}
      {secondary === 'analytics' && (<>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><PieChart size={18} className="mr-2 text-indigo-500"/> {t('핵심 시간 지표', 'Key Time Metrics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <div><span className="text-xs font-bold text-slate-500 block mb-1">{t('평균 셋업 소요 시간 (Lead Time)', 'Avg. Setup Lead Time')}</span><div className="text-2xl font-black text-slate-800">{avgLeadTime} <span className="text-sm font-medium text-slate-500">Days</span></div></div><Clock size={32} className="text-indigo-200" />
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <div><span className="text-xs font-bold text-slate-500 block mb-1">{t('이슈 평균 해결 시간 (MTTR)', 'Mean Time To Recovery (MTTR)')}</span><div className="text-2xl font-black text-slate-800">{avgMttr} <span className="text-sm font-medium text-slate-500">Days</span></div></div><Wrench size={32} className="text-indigo-200" />
          </div>
        </div>
      </div>
      </>)}
      {/* === END Analytics-1 === */}

      {/* === Resource 섹션 === */}
      {secondary === 'resource' && (<>
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

              {/* 가용 인력 풀 — 출장 일정이 없는 엔지니어 (대기 인력) */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center">
                  <Home size={16} className="mr-2 text-emerald-500" />
                  {t('가용 인력 (출장 없음)', 'Available Pool')}
                  <span className="ml-auto text-xs text-slate-500">{noTripEngs.length}{t('명', '')}</span>
                </h3>
                {noTripEngs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <Users size={28} className="mx-auto mb-2 text-slate-300" />
                    {t('대기 중인 인력이 없습니다.', 'No engineers available.')}
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {noTripEngs.map(e => (
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

            {/* 두 번째 행 — 자격/비자 이슈 (단독, 풀 폭) */}
            <div className="grid grid-cols-1 gap-4">
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
      </>)}
      {/* === END Resource === */}

      {/* === Analytics-2 (고급 분석 큰 섹션 — 도메인 분석) === */}
      {secondary === 'analytics' && (<>
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
          phase: getCurrentPhaseName(p)
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
                            <span className="text-slate-400">{formatDomain(p.domain, p.subDomain)}</span>
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

            </div>

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
                        onClick={() => { setSecondary(null); onProjectClick && onProjectClick(a.projectId, 'as'); }}
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
      </>)}
      {/* === END Analytics-2 === */}

      {/* === Meetings 섹션 (회의록 / 공유 노트) === */}
      {secondary === 'meetings' && (() => {
        const allNotes = [];
        projects.forEach(p => {
          (p.notes || []).forEach(n => {
            allNotes.push({
              id: n.id, projectId: p.id, projectName: p.name,
              projectCode: p.id, customer: p.customer, domain: p.domain, manager: p.manager,
              author: n.author, text: n.text, summary: n.summary, date: n.date,
              files: Array.isArray(n.files) ? n.files : (n.file ? [n.file] : []),
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
              {t('최근 공유 노트 / 회의록', 'Recent Shared Notes / Meetings')}
              <span className="ml-2 text-xs text-slate-400">{t('카드 클릭 시 해당 프로젝트의 회의록 탭으로 이동', 'Click a card to jump to the project Meetings tab')}</span>
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
            ) : (() => {
              // 프로젝트별 그룹화 — visible은 이미 ts desc로 정렬돼 있어, 그룹 등장 순서 = 프로젝트 최신 노트 순
              const groups = [];
              const seen = new Map();
              visible.forEach(n => {
                if (!seen.has(n.projectId)) {
                  const g = { projectId: n.projectId, projectName: n.projectName, customer: n.customer, domain: n.domain, manager: n.manager, notes: [] };
                  seen.set(n.projectId, g);
                  groups.push(g);
                }
                seen.get(n.projectId).notes.push(n);
              });
              // 그룹 내부도 명시적으로 ts desc 정렬 (안전망)
              groups.forEach(g => g.notes.sort((a, b) => b.ts - a.ts));
              // 전체 펼치기/접기 상태 (Set은 펼친 프로젝트의 id를 보관 — 기본 빈 Set = 모두 접힘)
              const allExpanded = groups.length > 0 && groups.every(g => expandedNoteProjects.has(g.projectId));
              const allCollapsed = groups.every(g => !expandedNoteProjects.has(g.projectId));
              const toggleAll = () => {
                if (allExpanded) {
                  setExpandedNoteProjects(new Set());
                } else {
                  setExpandedNoteProjects(new Set(groups.map(g => g.projectId)));
                }
              };
              const toggleProject = (id) => {
                setExpandedNoteProjects(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                });
              };
              return (
                <div className="space-y-3">
                  {/* 전체 펼치기/접기 컨트롤 */}
                  {groups.length > 1 && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={toggleAll}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1 rounded transition-colors flex items-center gap-1"
                      >
                        {allCollapsed ? <><ChevronDown size={12} />{t('전체 펼치기', 'Expand all')}</> : <><ChevronRight size={12} />{t('전체 접기', 'Collapse all')}</>}
                      </button>
                    </div>
                  )}
                  {groups.map(g => {
                    const collapsed = !expandedNoteProjects.has(g.projectId);
                    return (
                    <div key={g.projectId} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                      {/* 프로젝트 헤더 — 클릭하면 접기/펼치기. 우측 → 버튼으로 프로젝트 이동 */}
                      <div className={`bg-gradient-to-r from-indigo-500 to-indigo-600 ${collapsed ? '' : 'border-b border-indigo-700/30'} flex items-stretch`}>
                        <button
                          type="button"
                          onClick={() => toggleProject(g.projectId)}
                          className="flex-1 min-w-0 text-left hover:bg-indigo-700/20 px-4 py-2.5 flex items-center gap-2 transition-colors"
                          title={collapsed ? t('펼치기', 'Expand') : t('접기', 'Collapse')}
                        >
                          {collapsed ? <ChevronRight size={14} className="text-white shrink-0" /> : <ChevronDown size={14} className="text-white shrink-0" />}
                          <Building size={16} className="text-white shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-black text-white truncate">{g.projectName}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-indigo-100 truncate">
                              {g.customer && <span className="truncate">{g.customer}</span>}
                              {g.customer && g.domain && <span className="text-indigo-300">·</span>}
                              {g.domain && <span className="bg-white/20 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0">{g.domain}</span>}
                              {g.manager && <><span className="text-indigo-300">·</span><span className="flex items-center"><User size={9} className="mr-0.5" />{g.manager}</span></>}
                            </div>
                          </div>
                          <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold shrink-0">{g.notes.length}{t('건', '')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSecondary(null); onProjectClick && onProjectClick(g.projectId, 'notes'); }}
                          className="px-3 hover:bg-indigo-700/30 transition-colors flex items-center justify-center border-l border-indigo-700/30 group"
                          title={t('해당 프로젝트 회의록 탭으로 이동', 'Open project Meetings tab')}
                        >
                          <ExternalLink size={14} className="text-indigo-100 group-hover:text-white" />
                        </button>
                      </div>

                      {/* 회의록 리스트 — 타임라인 브랜치 스타일 (접혔으면 렌더 안 함) */}
                      {!collapsed && (
                      <div className="relative p-3 bg-slate-50">
                        {/* 좌측 세로 타임라인 라인 */}
                        <div className="absolute left-[40px] top-5 bottom-5 w-0.5 bg-amber-200"></div>
                        <div className="space-y-2">
                          {g.notes.map(n => {
                            const d = n.ts ? new Date(n.ts) : null;
                            const dValid = d && !isNaN(d);
                            const now = new Date(TODAY);
                            const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const d0 = dValid ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
                            const diffDays = d0 ? Math.floor((today0 - d0) / DAY_MS) : null;
                            const dow = dValid ? ['일','월','화','수','목','금','토'][d.getDay()] : '';
                            const mm = dValid ? d.getMonth() + 1 : '';
                            const dd = dValid ? d.getDate() : '';
                            const hh = dValid ? String(d.getHours()).padStart(2,'0') : '';
                            const mi = dValid ? String(d.getMinutes()).padStart(2,'0') : '';
                            let rel = '';
                            if (diffDays === 0) rel = t('오늘', 'Today');
                            else if (diffDays === 1) rel = t('어제', 'Yesterday');
                            else if (diffDays > 1 && diffDays < 7) rel = t(`${diffDays}일 전`, `${diffDays}d ago`);
                            else if (diffDays >= 7 && diffDays < 30) rel = t(`${Math.floor(diffDays/7)}주 전`, `${Math.floor(diffDays/7)}w ago`);
                            else if (diffDays >= 30 && diffDays < 365) rel = t(`${Math.floor(diffDays/30)}개월 전`, `${Math.floor(diffDays/30)}mo ago`);
                            else if (diffDays >= 365) rel = t(`${Math.floor(diffDays/365)}년 전`, `${Math.floor(diffDays/365)}y ago`);
                            const stripCls = diffDays === null ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : diffDays <= 1 ? 'bg-amber-300 text-amber-900 border-amber-400'
                              : diffDays < 7 ? 'bg-amber-200 text-amber-800 border-amber-300'
                              : diffDays < 30 ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-slate-200 text-slate-700 border-slate-300';
                            return (
                              <div key={n.id} className="relative pl-[68px]">
                                {/* 좌측 날짜 노드 (캘린더 스타일, 라인 위에) */}
                                <div className={`absolute left-3 top-1 w-14 rounded-lg border-2 shadow-sm flex flex-col items-center justify-center py-1.5 z-10 ${stripCls}`} title={dValid ? `${mm}/${dd} ${hh}:${mi}` : ''}>
                                  <div className="text-[9px] font-black leading-none">{dValid ? `${mm}월` : '-'}</div>
                                  <div className="text-xl font-black leading-none mt-0.5 tabular-nums">{dValid ? dd : '-'}</div>
                                  <div className="text-[8px] font-medium leading-none mt-0.5 opacity-70">{dValid ? `${dow}요일` : ''}</div>
                                </div>
                                {/* 우측 회의록 카드 */}
                                <button
                                  onClick={() => { setSecondary(null); onProjectClick && onProjectClick(g.projectId, 'notes'); }}
                                  className="w-full text-left bg-white border border-amber-200 rounded-lg hover:border-amber-400 hover:shadow-md transition-all p-3"
                                  title={t('회의록 탭으로 이동', 'Open Meetings tab')}
                                >
                                  <div className="flex items-center justify-between mb-2 pb-2 border-b border-amber-100 gap-2">
                                    <span className="flex items-center text-[10px] text-amber-700 font-bold whitespace-nowrap">
                                      <Clock size={10} className="mr-1" />{dValid ? `${hh}:${mi}` : '-'}
                                      {rel && <span className="ml-1.5 text-slate-500 font-medium">· {rel}</span>}
                                    </span>
                                    <span className="text-[10px] text-slate-500 flex items-center truncate"><User size={10} className="mr-0.5 shrink-0" />{n.author}</span>
                                  </div>
                                  {n.summary && (
                                    <div className="mb-2 bg-amber-50 border border-amber-200 rounded p-1.5">
                                      <div className="text-[9px] font-bold text-amber-700 mb-0.5">{t('요약', 'Summary')}</div>
                                      <p className="text-xs text-slate-700 whitespace-pre-wrap line-clamp-2">{n.summary}</p>
                                    </div>
                                  )}
                                  {n.text && <p className="text-xs text-slate-800 whitespace-pre-wrap break-words line-clamp-3">{n.text}</p>}
                                  {n.files.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-700 font-bold">
                                      <Paperclip size={10} />
                                      {n.files.length}{t('개 첨부', ' files')}
                                    </div>
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      )}
                    </div>
                  );
                  })}
                </div>
              );
            })()}

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
      {/* === END Meetings === */}

            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-white shrink-0">
              <button onClick={() => setSecondary(null)} className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">{t('닫기', 'Close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DashboardView;
