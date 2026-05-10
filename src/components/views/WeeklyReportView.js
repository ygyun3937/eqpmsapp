import React, { useState, useMemo, memo, useEffect } from 'react';
import {
  ClipboardList, ChevronLeft, ChevronRight, RefreshCw, Save, Download, FileText,
  Send, CheckCircle, XCircle, Clock, User, Building, AlertTriangle, MessageSquare,
  LifeBuoy, Plane, Star, Kanban, Users, X, BookOpen, Lightbulb
} from 'lucide-react';
import { exportToExcel } from '../../utils/export';
import { TODAY } from '../../constants';

// 월요일 시작 ISO 주
const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const startOfWeek = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return d;
};
const endOfWeek = (date) => {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
};

// 활동 타입별 라벨
const TYPE_LABELS = {
  PROJECT_CREATE: '프로젝트 생성', PROJECT_EDIT: '프로젝트 수정',
  PHASE_CHANGE: '단계 변경', PHASE_DEFINE: '단계 편집', MANAGER_CHANGE: '담당자 변경',
  TASK_ADD: '셋업 추가', TASK_COMPLETE: '셋업 완료', TASK_DELETE: '셋업 삭제',
  TASK_DATES: '일정 변경', TASK_RENAME: '셋업 이름 변경', TASK_MILESTONE: '마일스톤 토글',
  SETUP_PROGRESS: '셋업 진행', SETUP_DEFINE: '셋업 일괄 편집',
  EXTRA_ADD: '추가 대응 등록', EXTRA_UPDATE: '추가 대응 변경', EXTRA_DELETE: '추가 대응 삭제',
  CHECKLIST_CHANGE: '체크리스트 수정',
  ISSUE_ADD: '이슈 등록',
  REQUEST_ADD: '고객 요청 등록', REQUEST_STATUS: '고객 요청 처리',
  AS_ADD: 'AS 등록', AS_UPDATE: 'AS 처리',
  NOTE_ADD: '회의록 등록',
  PART_ADD: '자재 청구',
  VERSION_CHANGE: '버전 등록', VERSION_DELETE: '버전 삭제',
  SIGN_OFF: 'Buy-off 서명', SIGN_CANCEL: '사인 취소',
  TRIP_ADD: '출장 등록', TRIP_DELETE: '출장 삭제',
};

// 본인이 활동한 데이터를 주간 범위로 집계
function aggregate(targetUser, weekStart, weekEnd, projects, issues, engineers) {
  const ws = weekStart.getTime();
  const we = weekEnd.getTime();
  const inRange = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr).getTime();
    return !isNaN(d) && d >= ws && d <= we;
  };

  // 프로젝트별 활동
  const byProject = {};
  const ensure = (p) => {
    if (!byProject[p.id]) byProject[p.id] = {
      project: p,
      activities: [], notes: [], issues: [], asRecords: [],
      requests: [], parts: [], milestonesAchieved: [], tasksCompleted: 0
    };
    return byProject[p.id];
  };

  let totalActivities = 0, totalNotes = 0, totalIssuesAdded = 0,
      totalAS = 0, totalRequests = 0, totalTasks = 0, totalMilestones = 0;

  projects.forEach(p => {
    // 활동 이력
    (p.activityLog || []).forEach(log => {
      if (log.user === targetUser && inRange(log.date)) {
        ensure(p).activities.push(log);
        totalActivities++;
        if (log.type === 'TASK_COMPLETE') { ensure(p).tasksCompleted++; totalTasks++; }
        if (log.type === 'SIGN_OFF' || log.type === 'PHASE_CHANGE') {
          ensure(p).milestonesAchieved.push(log);
          totalMilestones++;
        }
      }
    });
    // 회의록
    (p.notes || []).forEach(n => {
      if (n.author === targetUser && inRange(n.date)) {
        ensure(p).notes.push(n);
        totalNotes++;
      }
    });
    // AS (engineer 필드)
    (p.asRecords || []).forEach(a => {
      if (a.engineer === targetUser && inRange(a.date)) {
        ensure(p).asRecords.push(a);
        totalAS++;
      }
    });
    // 고객 요청 (요청자 또는 응답자 본인)
    (p.customerRequests || []).forEach(r => {
      const isResponder = (r.responses || []).some(res => res.author === targetUser && inRange(res.date));
      const isRequester = r.requester === targetUser && inRange(r.date);
      if (isResponder || isRequester) {
        ensure(p).requests.push(r);
        totalRequests++;
      }
    });
  });

  // 이슈
  (issues || []).forEach(i => {
    if (i.author === targetUser && inRange(i.date)) {
      const proj = projects.find(p => p.id === i.projectId);
      if (proj) {
        ensure(proj).issues.push(i);
        totalIssuesAdded++;
      }
    }
  });

  // 출장 (engineerId 매칭)
  const me = (engineers || []).find(e => e.name === targetUser);
  const trips = [];
  if (me) {
    projects.forEach(p => {
      (p.trips || []).forEach(t => {
        if (t.engineerId !== me.id) return;
        const dep = new Date(t.departureDate).getTime();
        const ret = new Date(t.returnDate).getTime();
        if (isNaN(dep) || isNaN(ret)) return;
        // 주간과 겹치는지
        if (dep <= we && ret >= ws) {
          trips.push({ ...t, project: p });
        }
      });
    });
  }

  return {
    byProject: Object.values(byProject).sort((a, b) => b.activities.length - a.activities.length),
    trips,
    totals: {
      projects: Object.keys(byProject).length,
      activities: totalActivities,
      notes: totalNotes,
      issuesAdded: totalIssuesAdded,
      asProcessed: totalAS,
      requests: totalRequests,
      tasksCompleted: totalTasks,
      milestonesAchieved: totalMilestones,
      trips: trips.length,
    }
  };
}

// 자동 초안 생성 — 금주 실적
function generateAchievements(agg, t) {
  const lines = [];
  if (agg.byProject.length === 0 && agg.trips.length === 0) {
    return t('해당 주에 등록된 활동이 없습니다.', 'No activity recorded for this week.');
  }
  agg.byProject.forEach(g => {
    const { project: p, activities, notes, issues, asRecords, requests, tasksCompleted, milestonesAchieved } = g;
    lines.push(`■ ${p.name}${p.customer ? ` (${p.customer})` : ''}`);
    const phaseChanges = activities.filter(a => a.type === 'PHASE_CHANGE');
    if (phaseChanges.length) {
      phaseChanges.forEach(a => lines.push(`  - 단계: ${a.detail}`));
    }
    if (tasksCompleted > 0) lines.push(`  - 셋업 일정 ${tasksCompleted}건 완료`);
    if (milestonesAchieved.length > 0 && phaseChanges.length === 0) {
      lines.push(`  - 마일스톤 진행: ${milestonesAchieved.length}건`);
    }
    if (issues.length) lines.push(`  - 이슈 ${issues.length}건 등록 (${issues.map(i => i.severity).join('/')})`);
    if (notes.length) {
      const summaries = notes.map(n => n.summary || n.text || '').filter(Boolean).map(s => s.length > 30 ? s.slice(0, 30) + '…' : s);
      lines.push(`  - 회의록 ${notes.length}건${summaries.length ? ': ' + summaries.join(' / ') : ''}`);
    }
    if (asRecords.length) lines.push(`  - AS ${asRecords.length}건 처리 (${asRecords.map(a => a.type).join('/')})`);
    if (requests.length) lines.push(`  - 고객 요청 ${requests.length}건 응대`);
    lines.push('');
  });
  if (agg.trips.length) {
    lines.push(`■ 출장`);
    agg.trips.forEach(tr => {
      lines.push(`  - ${tr.departureDate} ~ ${tr.returnDate} · ${tr.project.name}${tr.site ? ` (${tr.site})` : ''}`);
    });
  }
  return lines.join('\n').trim();
}

// 자동 초안 생성 — 차주 계획 (다음 주 셋업 시작 / 출장 / 14일 내 임박 마일스톤)
function generateNextWeekPlan(targetUser, weekStart, projects, engineers) {
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const nextWeekEnd = new Date(nextWeekStart);
  nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
  nextWeekEnd.setHours(23, 59, 59, 999);
  const ws = nextWeekStart.getTime();
  const we = nextWeekEnd.getTime();
  const milestoneEnd = ws + 14 * 86400000;
  const me = (engineers || []).find(e => e.name === targetUser);

  const lines = [];
  // 다음 주 시작 예정 셋업 (담당자 = targetUser)
  const upcomingTasks = [];
  projects.forEach(p => {
    if (p.status === '완료') return;
    // PM 또는 추가 인력에 포함되는 프로젝트만
    const isMyProject = p.manager === targetUser
      || (p.additionalEngineers || []).some(e => e === targetUser || e.name === targetUser)
      || (me && (p.assignedEngineerIds || []).includes(me.id));
    if (!isMyProject && !me) return;
    (p.tasks || []).forEach(task => {
      if (task.isCompleted) return;
      if (!task.startDate) return;
      const tStart = new Date(task.startDate).getTime();
      if (tStart >= ws && tStart <= we) {
        upcomingTasks.push({ project: p, task });
      }
    });
  });
  if (upcomingTasks.length > 0) {
    lines.push('■ 셋업 일정 (시작 예정)');
    upcomingTasks.slice(0, 10).forEach(({ project, task }) => {
      lines.push(`  - ${project.name}: ${task.name} (${task.startDate} ~ ${task.endDate || '-'})`);
    });
    lines.push('');
  }

  // 다음 주 출장
  const upcomingTrips = [];
  if (me) {
    projects.forEach(p => {
      (p.trips || []).forEach(tr => {
        if (tr.engineerId !== me.id) return;
        const dep = new Date(tr.departureDate).getTime();
        const ret = new Date(tr.returnDate).getTime();
        if (isNaN(dep) || isNaN(ret)) return;
        if (dep <= we && ret >= ws) {
          upcomingTrips.push({ project: p, trip: tr });
        }
      });
    });
  }
  if (upcomingTrips.length > 0) {
    lines.push('■ 출장 일정');
    upcomingTrips.forEach(({ project, trip }) => {
      lines.push(`  - ${trip.departureDate} ~ ${trip.returnDate} · ${project.name}${trip.site ? ` (${trip.site})` : ''}`);
    });
    lines.push('');
  }

  // 14일 내 임박 마일스톤 (본인 담당)
  const upcomingMilestones = [];
  projects.forEach(p => {
    if (p.status === '완료') return;
    const isMyProject = p.manager === targetUser
      || (p.additionalEngineers || []).some(e => e === targetUser || e.name === targetUser);
    if (!isMyProject) return;
    (p.tasks || []).forEach(task => {
      if (!task.isMilestone || task.isCompleted) return;
      if (!task.endDate) return;
      const t0 = new Date(task.endDate).getTime();
      if (t0 >= ws && t0 <= milestoneEnd) {
        upcomingMilestones.push({ project: p, task });
      }
    });
    if (p.dueDate) {
      const due = new Date(p.dueDate).getTime();
      if (due >= ws && due <= milestoneEnd) {
        upcomingMilestones.push({ project: p, task: { name: '납기일', endDate: p.dueDate } });
      }
    }
  });
  if (upcomingMilestones.length > 0) {
    lines.push('■ 임박 마일스톤 (14일 내)');
    upcomingMilestones.forEach(({ project, task }) => {
      lines.push(`  - ${project.name}: ${task.name} (${task.endDate})`);
    });
  }

  if (lines.length === 0) return '';
  return lines.join('\n').trim();
}

// 팀 종합 보고서 자동 생성 — 같은 부서원 보고서를 통합
function consolidateTeam(memberReports, kind /* 'achievements' | 'nextWeekPlan' | 'risks' */) {
  const lines = [];
  memberReports.forEach(r => {
    const text = (r[kind] || '').trim();
    if (!text) return;
    lines.push(`【 ${r.user} 】`);
    lines.push(text);
    lines.push('');
  });
  return lines.join('\n').trim();
}

// 자동 초안 생성 — 이슈/리스크 (미해결 이슈 + 지연 셋업 + 위험 상태 프로젝트)
function generateRisks(targetUser, projects, issues, engineers) {
  const lines = [];
  const now = Date.now();
  const me = (engineers || []).find(e => e.name === targetUser);

  // 본인 등록한 미해결 이슈
  const myOpenIssues = (issues || []).filter(i => i.author === targetUser && i.status !== '조치 완료');
  if (myOpenIssues.length > 0) {
    lines.push('■ 미해결 이슈');
    myOpenIssues.slice(0, 10).forEach(i => {
      lines.push(`  - [${i.severity}] ${i.projectName}: ${i.title}`);
    });
    lines.push('');
  }

  // 본인 담당 프로젝트 중 마감임박/이슈발생
  const riskyProjects = projects.filter(p => {
    if (p.status === '완료') return false;
    const isMyProject = p.manager === targetUser
      || (p.additionalEngineers || []).some(e => e === targetUser || e.name === targetUser)
      || (me && (p.assignedEngineerIds || []).includes(me.id));
    return isMyProject && (p.status === '마감임박' || p.status === '이슈발생');
  });
  if (riskyProjects.length > 0) {
    lines.push('■ 위험 상태 프로젝트');
    riskyProjects.forEach(p => {
      lines.push(`  - [${p.status}] ${p.name}${p.dueDate ? ` (납기 ${p.dueDate})` : ''}`);
    });
    lines.push('');
  }

  // 지연된 태스크 (납기 지났는데 미완료)
  const delayedTasks = [];
  projects.forEach(p => {
    if (p.status === '완료') return;
    const isMyProject = p.manager === targetUser
      || (p.additionalEngineers || []).some(e => e === targetUser || e.name === targetUser)
      || (me && (p.assignedEngineerIds || []).includes(me.id));
    if (!isMyProject) return;
    (p.tasks || []).forEach(task => {
      if (task.isCompleted || !task.endDate) return;
      const end = new Date(task.endDate).getTime();
      if (end < now) {
        delayedTasks.push({ project: p, task });
      } else if (task.delayReason) {
        delayedTasks.push({ project: p, task });
      }
    });
  });
  if (delayedTasks.length > 0) {
    lines.push('■ 지연 / 메모 있는 셋업');
    delayedTasks.slice(0, 10).forEach(({ project, task }) => {
      const overdue = new Date(task.endDate).getTime() < now ? '(기한 초과)' : '';
      lines.push(`  - ${project.name}: ${task.name} ${overdue}${task.delayReason ? ` — ${task.delayReason}` : ''}`);
    });
  }

  if (lines.length === 0) return '';
  return lines.join('\n').trim();
}

const WeeklyReportView = memo(function WeeklyReportView({
  projects, issues, engineers, users, currentUser, weeklyReports, onSaveReport, onSubmitReport, onApproveReport, onReturnReport, t
}) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(TODAY)));
  const [targetUser, setTargetUser] = useState(currentUser.name);
  const [achievements, setAchievements] = useState('');
  const [nextWeekPlan, setNextWeekPlan] = useState('');
  const [risks, setRisks] = useState('');
  const [reviewerComment, setReviewerComment] = useState('');
  const [activeTab, setActiveTab] = useState('mine'); // 'mine' | 'team' (PM/ADMIN)
  const [helpOpen, setHelpOpen] = useState(false);
  const [reviewReportId, setReviewReportId] = useState(null); // 팀원 보고서 결재 모달
  const [reviewComment, setReviewComment] = useState(''); // 결재 모달 내 코멘트
  // 팀 종합 보고서
  const [teamReportOpen, setTeamReportOpen] = useState(false);
  const [teamAchievements, setTeamAchievements] = useState('');
  const [teamPlan, setTeamPlan] = useState('');
  const [teamRisks, setTeamRisks] = useState('');
  const [teamLeadNote, setTeamLeadNote] = useState(''); // 팀장 종합 코멘트

  const weekEnd = useMemo(() => endOfWeek(weekStart), [weekStart]);
  const reportKey = `${targetUser}__${fmtDate(weekStart)}`;

  // 팀장(isTeamLead) 또는 ADMIN만 다른 사람 보고서 조회/승인 가능
  const isLead = currentUser.role === 'ADMIN' || currentUser.isTeamLead === true;
  const canSelectOthers = isLead;
  const canApprove = isLead;
  // 팀장은 같은 부서만, ADMIN은 전체
  const isInScope = (userName) => {
    if (currentUser.role === 'ADMIN') return true;
    if (userName === currentUser.name) return true;
    if (!currentUser.isTeamLead) return false;
    if (!currentUser.dept) return false;
    // users 또는 engineers에서 해당 사용자의 부서 찾기
    const u = (users || []).find(x => x.name === userName);
    if (u) return u.dept === currentUser.dept;
    const e = (engineers || []).find(x => x.name === userName);
    if (e) return e.dept === currentUser.dept;
    return false;
  };

  // 기존 보고서 찾기
  const existingReport = useMemo(
    () => (weeklyReports || []).find(r => r.user === targetUser && r.weekStart === fmtDate(weekStart)),
    [weeklyReports, targetUser, weekStart]
  );

  // 사용자 변경 시 폼 데이터 로드
  useEffect(() => {
    if (existingReport) {
      setAchievements(existingReport.achievements || '');
      setNextWeekPlan(existingReport.nextWeekPlan || '');
      setRisks(existingReport.risks || '');
      setReviewerComment(existingReport.reviewerComment || '');
    } else {
      setAchievements('');
      setNextWeekPlan('');
      setRisks('');
      setReviewerComment('');
    }
  }, [reportKey, existingReport]);

  // 자동 집계
  const agg = useMemo(
    () => aggregate(targetUser, weekStart, weekEnd, projects, issues, engineers),
    [targetUser, weekStart, weekEnd, projects, issues, engineers]
  );

  // 사용자 옵션 — ADMIN은 전체, 팀장은 같은 부서, 일반은 본인만
  const userOptions = useMemo(() => {
    const allowed = new Set();
    allowed.add(currentUser.name); // 본인은 항상 포함
    if (currentUser.role !== 'ADMIN' && !currentUser.isTeamLead) {
      return [currentUser.name];
    }
    (users || []).forEach(u => {
      if (u.role === 'CUSTOMER') return;
      if (!u.weeklyReportEnabled && u.role !== 'ADMIN') return; // 주간 보고 권한 없는 사람 제외
      if (currentUser.role === 'ADMIN') {
        allowed.add(u.name);
      } else if (currentUser.isTeamLead && u.dept === currentUser.dept) {
        allowed.add(u.name);
      }
    });
    // 엔지니어도 같이 보여줌 (user 등록 안 됐어도 조회 대상)
    (engineers || []).forEach(e => {
      if (currentUser.role === 'ADMIN' || (currentUser.isTeamLead && e.dept === currentUser.dept)) {
        allowed.add(e.name);
      }
    });
    return Array.from(allowed).sort();
  }, [users, engineers, currentUser]);

  const handleGenerateAchievements = () => {
    setAchievements(generateAchievements(agg, t));
  };
  const handleGenerateAll = () => {
    setAchievements(generateAchievements(agg, t));
    setNextWeekPlan(generateNextWeekPlan(targetUser, weekStart, projects, engineers));
    setRisks(generateRisks(targetUser, projects, issues, engineers));
  };

  const buildReport = (status) => ({
    id: existingReport?.id || Date.now(),
    user: targetUser,
    weekStart: fmtDate(weekStart),
    weekEnd: fmtDate(weekEnd),
    achievements, nextWeekPlan, risks,
    summary: agg.totals,
    status: status || existingReport?.status || 'draft',
    createdAt: existingReport?.createdAt || new Date().toLocaleString(),
    updatedAt: new Date().toLocaleString(),
    submittedAt: status === 'submitted' ? new Date().toLocaleString() : (existingReport?.submittedAt || null),
    approvedBy: existingReport?.approvedBy || null,
    approvedAt: existingReport?.approvedAt || null,
    reviewerComment,
  });

  const handleSave = () => {
    onSaveReport(buildReport());
  };
  const handleSubmit = () => {
    onSubmitReport(buildReport('submitted'));
  };
  const handleApprove = () => {
    onApproveReport({ ...buildReport('approved'), approvedBy: currentUser.name, approvedAt: new Date().toLocaleString(), reviewerComment });
  };
  const handleReturn = () => {
    if (!reviewerComment.trim()) {
      const ok = window.confirm(t('반려 사유 코멘트가 비어있습니다. 작성자가 무엇을 수정해야 할지 알 수 없습니다. 그래도 반려할까요?', 'No comment entered. Author won\'t know what to fix. Return anyway?'));
      if (!ok) return;
    }
    onReturnReport({ ...buildReport('returned'), approvedBy: currentUser.name, reviewerComment });
  };

  // 팀원 보기 — 카드 클릭 시 결재 모달용 핸들러 (작성자 콘텐츠는 변경 X, 상태/코멘트만 갱신)
  const reviewReport = (weeklyReports || []).find(r => r.id === reviewReportId);
  const handleReviewApprove = () => {
    if (!reviewReport) return;
    onApproveReport({
      ...reviewReport,
      status: 'approved',
      approvedBy: currentUser.name,
      approvedAt: new Date().toLocaleString(),
      reviewerComment: reviewComment,
      updatedAt: new Date().toLocaleString(),
    });
    setReviewReportId(null);
    setReviewComment('');
  };
  const handleReviewReturn = () => {
    if (!reviewReport) return;
    if (!reviewComment.trim()) {
      const ok = window.confirm(t('반려 사유 코멘트가 비어있습니다. 작성자가 무엇을 수정해야 할지 알 수 없습니다. 그래도 반려할까요?', 'No comment. Return anyway?'));
      if (!ok) return;
    }
    onReturnReport({
      ...reviewReport,
      status: 'returned',
      approvedBy: currentUser.name,
      reviewerComment: reviewComment,
      updatedAt: new Date().toLocaleString(),
    });
    setReviewReportId(null);
    setReviewComment('');
  };

  // 주차 이동
  const moveWeek = (offset) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + offset * 7);
    setWeekStart(startOfWeek(next));
  };
  const goThisWeek = () => setWeekStart(startOfWeek(new Date(TODAY)));

  // Excel 추출
  const handleExportExcel = () => {
    const sheets = [];
    sheets.push({
      name: '주간 보고서',
      rows: [
        { field: '작성자', value: targetUser },
        { field: '주차', value: `${fmtDate(weekStart)} ~ ${fmtDate(weekEnd)}` },
        { field: '상태', value: existingReport?.status || 'draft' },
        { field: '제출 일시', value: existingReport?.submittedAt || '-' },
        { field: '승인자', value: existingReport?.approvedBy || '-' },
        { field: '승인 일시', value: existingReport?.approvedAt || '-' },
        { field: '금주 실적', value: achievements || '-' },
        { field: '차주 계획', value: nextWeekPlan || '-' },
        { field: '이슈 / 리스크', value: risks || '-' },
        { field: '리뷰어 코멘트', value: reviewerComment || '-' },
      ],
      columns: [{ header: '항목', key: 'field' }, { header: '값', key: 'value' }]
    });
    sheets.push({
      name: '자동 집계 요약',
      rows: [
        { item: '관여 프로젝트', count: agg.totals.projects },
        { item: '활동 이력 건수', count: agg.totals.activities },
        { item: '셋업 완료', count: agg.totals.tasksCompleted },
        { item: '회의록 작성', count: agg.totals.notes },
        { item: '이슈 등록', count: agg.totals.issuesAdded },
        { item: 'AS 처리', count: agg.totals.asProcessed },
        { item: '고객 요청 응대', count: agg.totals.requests },
        { item: '마일스톤 진행', count: agg.totals.milestonesAchieved },
        { item: '출장 일정', count: agg.totals.trips },
      ],
      columns: [{ header: '항목', key: 'item' }, { header: '건수', key: 'count' }]
    });
    sheets.push({
      name: '활동 상세',
      rows: agg.byProject.flatMap(g => g.activities.map(log => ({
        projectName: g.project.name, date: log.date, type: TYPE_LABELS[log.type] || log.type, detail: log.detail
      }))),
      columns: [
        { header: '프로젝트', key: 'projectName' }, { header: '일시', key: 'date' },
        { header: '유형', key: 'type' }, { header: '상세', key: 'detail' }
      ]
    });
    if (agg.trips.length > 0) {
      sheets.push({
        name: '출장',
        rows: agg.trips.map(tr => ({
          projectName: tr.project.name, departureDate: tr.departureDate, returnDate: tr.returnDate,
          site: tr.site || '-', note: tr.note || '-'
        })),
        columns: [
          { header: '프로젝트', key: 'projectName' }, { header: '출발일', key: 'departureDate' },
          { header: '복귀일', key: 'returnDate' }, { header: '사이트', key: 'site' }, { header: '메모', key: 'note' }
        ]
      });
    }
    exportToExcel(`주간보고_${targetUser}_${fmtDate(weekStart)}`, sheets);
  };

  // PDF 인쇄
  const handleExportPDF = () => {
    const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const html = `
      <html><head><meta charset="utf-8"><title>주간 보고서 - ${escapeHtml(targetUser)} ${fmtDate(weekStart)}</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 30px; color: #1e293b; }
        h1 { font-size: 22px; border-bottom: 3px solid #4f46e5; padding-bottom: 8px; }
        h2 { font-size: 14px; color: #4f46e5; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
        th { background: #4f46e5; color: white; padding: 6px; text-align: left; }
        td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
        .meta { color: #64748b; font-size: 11px; margin-bottom: 12px; }
        .body { white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; }
        .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 10px 0; }
        .summary > div { background: #f1f5f9; padding: 8px; border-radius: 4px; text-align: center; }
        .summary strong { display: block; font-size: 18px; color: #4f46e5; }
        .summary span { font-size: 10px; color: #64748b; }
      </style></head><body>
      <h1>주간 업무 보고서</h1>
      <div class="meta">
        작성자: <strong>${escapeHtml(targetUser)}</strong> · 주차: <strong>${fmtDate(weekStart)} ~ ${fmtDate(weekEnd)}</strong>
        ${existingReport?.status ? ` · 상태: <strong>${escapeHtml(existingReport.status)}</strong>` : ''}
      </div>
      <div class="summary">
        <div><strong>${agg.totals.projects}</strong><span>관여 프로젝트</span></div>
        <div><strong>${agg.totals.tasksCompleted}</strong><span>셋업 완료</span></div>
        <div><strong>${agg.totals.notes}</strong><span>회의록</span></div>
        <div><strong>${agg.totals.issuesAdded}</strong><span>이슈 등록</span></div>
        <div><strong>${agg.totals.asProcessed}</strong><span>AS 처리</span></div>
      </div>
      <h2>금주 실적</h2><div class="body">${escapeHtml(achievements) || '<i style="color:#94a3b8">미작성</i>'}</div>
      <h2>차주 계획</h2><div class="body">${escapeHtml(nextWeekPlan) || '<i style="color:#94a3b8">미작성</i>'}</div>
      <h2>이슈 / 리스크</h2><div class="body">${escapeHtml(risks) || '<i style="color:#94a3b8">미작성</i>'}</div>
      ${reviewerComment ? `<h2>리뷰어 코멘트</h2><div class="body">${escapeHtml(reviewerComment)}</div>` : ''}
      <script>setTimeout(() => window.print(), 300);</script>
      </body></html>`;
    const w = window.open('', '', 'width=900,height=1100');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  // 상태 라벨 + 색상
  const statusInfo = (s) => {
    switch (s) {
      case 'submitted': return { label: t('제출됨', 'Submitted'), cls: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Send size={12} /> };
      case 'approved': return { label: t('승인됨', 'Approved'), cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle size={12} /> };
      case 'returned': return { label: t('반려됨', 'Returned'), cls: 'bg-rose-100 text-rose-700 border-rose-200', icon: <XCircle size={12} /> };
      default: return { label: t('초안', 'Draft'), cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: <Clock size={12} /> };
    }
  };

  // 팀원 보기 — 이번 주 모든 보고서 (개별만, 종합은 별도). 팀장은 같은 부서만.
  const teamReports = useMemo(() => {
    if (!canApprove) return [];
    const ws = fmtDate(weekStart);
    return (weeklyReports || [])
      .filter(r => r.weekStart === ws && r.kind !== 'team' && isInScope(r.user))
      .sort((a, b) => a.user.localeCompare(b.user));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weeklyReports, weekStart, canApprove, users, engineers, currentUser]);

  // 팀 종합 보고서 — 팀장이 작성하는 dept 단위 보고서
  const teamReportKey = `${currentUser.name}__team__${fmtDate(weekStart)}`;
  const existingTeamReport = useMemo(
    () => (weeklyReports || []).find(r => r.kind === 'team' && r.user === currentUser.name && r.weekStart === fmtDate(weekStart)),
    [weeklyReports, currentUser.name, weekStart]
  );

  // 팀 보고서 모달 열릴 때 기존 데이터 로드 또는 자동 정리 초안
  useEffect(() => {
    if (!teamReportOpen) return;
    if (existingTeamReport) {
      setTeamAchievements(existingTeamReport.achievements || '');
      setTeamPlan(existingTeamReport.nextWeekPlan || '');
      setTeamRisks(existingTeamReport.risks || '');
      setTeamLeadNote(existingTeamReport.summary?.leadNote || '');
    } else {
      // 자동 정리 초안 생성
      setTeamAchievements(consolidateTeam(teamReports, 'achievements'));
      setTeamPlan(consolidateTeam(teamReports, 'nextWeekPlan'));
      setTeamRisks(consolidateTeam(teamReports, 'risks'));
      setTeamLeadNote('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamReportOpen, teamReportKey]);

  const teamStats = useMemo(() => ({
    total: teamReports.length,
    submitted: teamReports.filter(r => r.status === 'submitted').length,
    approved: teamReports.filter(r => r.status === 'approved').length,
    returned: teamReports.filter(r => r.status === 'returned').length,
    draft: teamReports.filter(r => !r.status || r.status === 'draft').length,
  }), [teamReports]);

  const buildTeamReport = (status) => ({
    id: existingTeamReport?.id || (Date.now() + 1), // +1 to avoid collision with individual on same ms
    kind: 'team',
    user: currentUser.name,
    dept: currentUser.dept || '',
    weekStart: fmtDate(weekStart),
    weekEnd: fmtDate(weekEnd),
    achievements: teamAchievements,
    nextWeekPlan: teamPlan,
    risks: teamRisks,
    summary: {
      memberTotal: teamStats.total,
      memberSubmitted: teamStats.submitted,
      memberApproved: teamStats.approved,
      leadNote: teamLeadNote,
    },
    status: status || existingTeamReport?.status || 'draft',
    createdAt: existingTeamReport?.createdAt || new Date().toLocaleString(),
    updatedAt: new Date().toLocaleString(),
    submittedAt: status === 'submitted' ? new Date().toLocaleString() : (existingTeamReport?.submittedAt || null),
    approvedBy: existingTeamReport?.approvedBy || null,
    approvedAt: existingTeamReport?.approvedAt || null,
    reviewerComment: existingTeamReport?.reviewerComment || '',
  });

  const handleSaveTeam = () => onSaveReport(buildTeamReport());
  const handleSubmitTeam = () => onSubmitReport(buildTeamReport('submitted'));
  const handleRegenerateTeam = () => {
    setTeamAchievements(consolidateTeam(teamReports, 'achievements'));
    setTeamPlan(consolidateTeam(teamReports, 'nextWeekPlan'));
    setTeamRisks(consolidateTeam(teamReports, 'risks'));
  };

  // 팀 보고서 Excel 추출
  const handleExportTeamExcel = () => {
    const sheets = [];
    sheets.push({
      name: '팀 종합 보고서',
      rows: [
        { field: '팀장', value: currentUser.name },
        { field: '부서', value: currentUser.dept || '-' },
        { field: '주차', value: `${fmtDate(weekStart)} ~ ${fmtDate(weekEnd)}` },
        { field: '팀원 수', value: teamStats.total },
        { field: '제출 건수', value: teamStats.submitted + teamStats.approved },
        { field: '승인 완료', value: teamStats.approved },
        { field: '팀 종합 — 금주 실적', value: teamAchievements || '-' },
        { field: '팀 종합 — 차주 계획', value: teamPlan || '-' },
        { field: '팀 종합 — 이슈/리스크', value: teamRisks || '-' },
        { field: '팀장 종합 코멘트', value: teamLeadNote || '-' },
      ],
      columns: [{ header: '항목', key: 'field' }, { header: '값', key: 'value' }]
    });
    sheets.push({
      name: '팀원별 원본',
      rows: teamReports.map(r => ({
        user: r.user, status: r.status || 'draft',
        achievements: r.achievements || '-', plan: r.nextWeekPlan || '-', risks: r.risks || '-'
      })),
      columns: [
        { header: '팀원', key: 'user' }, { header: '상태', key: 'status' },
        { header: '금주 실적', key: 'achievements' }, { header: '차주 계획', key: 'plan' }, { header: '이슈/리스크', key: 'risks' }
      ]
    });
    exportToExcel(`팀종합보고_${currentUser.dept || 'team'}_${fmtDate(weekStart)}`, sheets);
  };

  const handleExportTeamPDF = () => {
    const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const html = `
      <html><head><meta charset="utf-8"><title>팀 종합 주간 보고 - ${escapeHtml(currentUser.dept || '')} ${fmtDate(weekStart)}</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 30px; color: #1e293b; }
        h1 { font-size: 22px; border-bottom: 3px solid #4f46e5; padding-bottom: 8px; }
        h2 { font-size: 14px; color: #4f46e5; margin-top: 20px; }
        .meta { color: #64748b; font-size: 11px; margin-bottom: 12px; }
        .body { white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 12px; }
        .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
        .summary > div { background: #f1f5f9; padding: 8px; border-radius: 4px; text-align: center; }
        .summary strong { display: block; font-size: 18px; color: #4f46e5; }
        .summary span { font-size: 10px; color: #64748b; }
      </style></head><body>
      <h1>팀 종합 주간 업무 보고서</h1>
      <div class="meta">
        팀장: <strong>${escapeHtml(currentUser.name)}</strong> · 부서: <strong>${escapeHtml(currentUser.dept || '-')}</strong> · 주차: <strong>${fmtDate(weekStart)} ~ ${fmtDate(weekEnd)}</strong>
      </div>
      <div class="summary">
        <div><strong>${teamStats.total}</strong><span>팀원 수</span></div>
        <div><strong>${teamStats.submitted + teamStats.approved}</strong><span>제출 건수</span></div>
        <div><strong>${teamStats.approved}</strong><span>승인 완료</span></div>
        <div><strong>${teamStats.draft + teamStats.returned}</strong><span>미제출</span></div>
      </div>
      ${teamLeadNote ? `<h2>팀장 종합 코멘트</h2><div class="body">${escapeHtml(teamLeadNote)}</div>` : ''}
      <h2>팀 종합 — 금주 실적</h2><div class="body">${escapeHtml(teamAchievements) || '<i style="color:#94a3b8">미작성</i>'}</div>
      <h2>팀 종합 — 차주 계획</h2><div class="body">${escapeHtml(teamPlan) || '<i style="color:#94a3b8">미작성</i>'}</div>
      <h2>팀 종합 — 이슈 / 리스크</h2><div class="body">${escapeHtml(teamRisks) || '<i style="color:#94a3b8">미작성</i>'}</div>
      <script>setTimeout(() => window.print(), 300);</script>
      </body></html>`;
    const w = window.open('', '', 'width=900,height=1100');
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <ClipboardList size={24} className="mr-2 text-indigo-500" />
            {t('주간 업무 보고', 'Weekly Reports')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('시스템 활동 자동 집계 + 편집/제출/승인', 'Auto-aggregated activity + edit/submit/approve')}</p>
        </div>
        <button
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-sm font-bold transition-colors shadow-sm"
        >
          <BookOpen size={14} />{t('샘플 + 사용 가이드', 'Sample + Guide')}
        </button>
      </div>

      {/* 탭 (팀장만) */}
      {canApprove && (
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'mine' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <User size={14} className="inline mr-1" />{t('내 보고서', 'My Report')}
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'team' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <Users size={14} className="inline mr-1" />{t('팀원 보기', 'Team View')} <span className="ml-1 text-xs text-slate-400">({teamReports.length})</span>
          </button>
        </div>
      )}

      {activeTab === 'mine' && (
      <>
      {/* 주차 + 작성자 선택 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button onClick={() => moveWeek(-1)} className="p-1.5 rounded hover:bg-slate-100 transition-colors" title={t('이전 주', 'Previous week')}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={goThisWeek} className="px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200">
            {t('이번 주', 'This week')}
          </button>
          <button onClick={() => moveWeek(1)} className="p-1.5 rounded hover:bg-slate-100 transition-colors" title={t('다음 주', 'Next week')}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="text-sm font-bold text-slate-700 tabular-nums">
          {fmtDate(weekStart)} ~ {fmtDate(weekEnd)}
        </div>
        <span className="text-slate-300">·</span>
        <div className="flex items-center gap-2">
          <User size={14} className="text-slate-500" />
          {canSelectOthers ? (
            <select
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
              className="text-sm font-bold border border-slate-200 rounded px-2 py-1 bg-white"
            >
              {userOptions.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          ) : (
            <span className="text-sm font-bold text-slate-700">{targetUser}</span>
          )}
        </div>
        {existingReport && (
          <span className={`ml-auto text-[11px] font-bold px-2 py-1 rounded border flex items-center gap-1 ${statusInfo(existingReport.status).cls}`}>
            {statusInfo(existingReport.status).icon}
            {statusInfo(existingReport.status).label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        {/* 좌측 — 자동 집계 */}
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
              <RefreshCw size={14} className="mr-1.5 text-indigo-500" />
              {t('자동 집계 요약', 'Auto Summary')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: <Building size={14} />, label: t('프로젝트', 'Projects'), value: agg.totals.projects, color: 'bg-indigo-50 text-indigo-700' },
                { icon: <Kanban size={14} />, label: t('셋업 완료', 'Tasks'), value: agg.totals.tasksCompleted, color: 'bg-blue-50 text-blue-700' },
                { icon: <Star size={14} />, label: t('마일스톤', 'Milestone'), value: agg.totals.milestonesAchieved, color: 'bg-amber-50 text-amber-700' },
                { icon: <FileText size={14} />, label: t('회의록', 'Meetings'), value: agg.totals.notes, color: 'bg-amber-50 text-amber-700' },
                { icon: <AlertTriangle size={14} />, label: t('이슈', 'Issues'), value: agg.totals.issuesAdded, color: 'bg-rose-50 text-rose-700' },
                { icon: <LifeBuoy size={14} />, label: t('AS', 'AS'), value: agg.totals.asProcessed, color: 'bg-purple-50 text-purple-700' },
                { icon: <MessageSquare size={14} />, label: t('고객요청', 'Requests'), value: agg.totals.requests, color: 'bg-cyan-50 text-cyan-700' },
                { icon: <Plane size={14} />, label: t('출장', 'Trips'), value: agg.totals.trips, color: 'bg-blue-50 text-blue-700' },
                { icon: <RefreshCw size={14} />, label: t('전체 활동', 'Activities'), value: agg.totals.activities, color: 'bg-slate-50 text-slate-700' },
              ].map((m, i) => (
                <div key={i} className={`rounded-lg border border-slate-100 p-2 text-center ${m.color}`}>
                  <div className="flex items-center justify-center mb-0.5">{m.icon}</div>
                  <div className="text-lg font-black tabular-nums">{m.value}</div>
                  <div className="text-[9px] font-bold opacity-80">{m.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 프로젝트별 활동 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
              <Kanban size={14} className="mr-1.5 text-indigo-500" />
              {t('프로젝트별 활동', 'By Project')}
              <span className="ml-2 text-xs text-slate-400">({agg.byProject.length})</span>
            </h3>
            {agg.byProject.length === 0 && agg.trips.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">{t('해당 주 활동 없음', 'No activity')}</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {agg.byProject.map(g => (
                  <div key={g.project.id} className="bg-slate-50 border border-slate-200 rounded p-2.5">
                    <div className="text-xs font-black text-slate-800 truncate mb-1">{g.project.name}</div>
                    <div className="flex flex-wrap gap-1 text-[10px]">
                      {g.tasksCompleted > 0 && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">셋업 {g.tasksCompleted}</span>}
                      {g.notes.length > 0 && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">회의록 {g.notes.length}</span>}
                      {g.issues.length > 0 && <span className="bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">이슈 {g.issues.length}</span>}
                      {g.asRecords.length > 0 && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">AS {g.asRecords.length}</span>}
                      {g.requests.length > 0 && <span className="bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded font-bold">요청 {g.requests.length}</span>}
                      {g.milestonesAchieved.length > 0 && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">마일스톤 {g.milestonesAchieved.length}</span>}
                    </div>
                  </div>
                ))}
                {agg.trips.map(tr => (
                  <div key={`${tr.project.id}-${tr.id || tr.departureDate}`} className="bg-blue-50 border border-blue-200 rounded p-2.5">
                    <div className="text-xs font-black text-slate-800 truncate mb-1 flex items-center"><Plane size={10} className="mr-1 text-blue-500" />출장 — {tr.project.name}</div>
                    <div className="text-[10px] text-slate-600">{tr.departureDate} ~ {tr.returnDate}{tr.site ? ` · ${tr.site}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측 — 보고서 폼 */}
        <div className="space-y-3">
          {/* 액션 바 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 space-y-2">
            {/* 1-Click 풀 자동 생성 + 추출 */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleGenerateAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-bold shadow-sm transition-colors"
              >
                <RefreshCw size={14} />{t('전체 자동 생성', 'Auto-fill All')}
              </button>
              <span className="text-[11px] text-slate-500">{t('금주 실적 + 차주 계획 + 이슈/리스크 모두 채움', 'Fills all 3 sections')}</span>
              <button
                onClick={() => { handleGenerateAll(); setTimeout(() => handleExportExcel(), 100); }}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold shadow-sm"
                title={t('자동 생성 후 Excel로 바로 추출', 'Auto-fill then export to Excel')}
              >
                <Download size={14} />{t('자동 + Excel 추출', 'Auto + Excel')}
              </button>
              <button
                onClick={() => { handleGenerateAll(); setTimeout(() => handleExportPDF(), 100); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold shadow-sm"
                title={t('자동 생성 후 PDF로 바로 인쇄', 'Auto-fill then export to PDF')}
              >
                <FileText size={14} />{t('자동 + PDF', 'Auto + PDF')}
              </button>
            </div>
            {/* 부분 액션 */}
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
              <button
                onClick={handleGenerateAchievements}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200"
              >
                {t('금주 실적만 자동', 'Achievements only')}
              </button>
              <span className="text-[10px] text-slate-400">{t('편집한 텍스트 그대로 추출:', 'Or export current text:')}</span>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold border border-emerald-200"
              >
                <Download size={11} />Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold border border-rose-200"
              >
                <FileText size={11} />PDF
              </button>
            </div>
          </div>

          {/* 보고서 폼 */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('금주 실적 *', 'Achievements *')}</label>
              <textarea
                rows={10}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-y focus:outline-none focus:border-indigo-500 font-mono"
                placeholder={t('이번 주에 한 일을 입력하세요. (좌측 자동 집계 → 초안 자동 생성)', 'What you did this week.')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('차주 계획', 'Next Week Plan')}</label>
              <textarea
                rows={5}
                value={nextWeekPlan}
                onChange={(e) => setNextWeekPlan(e.target.value)}
                className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-y focus:outline-none focus:border-indigo-500"
                placeholder={t('다음 주 일정·할 일·우선순위', 'Next week tasks/priorities')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('이슈 / 리스크 / 도움 요청', 'Issues / Risks / Asks')}</label>
              <textarea
                rows={3}
                value={risks}
                onChange={(e) => setRisks(e.target.value)}
                className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-y focus:outline-none focus:border-indigo-500"
                placeholder={t('막혀있는 점, 도움 필요한 점, 일정 리스크', 'Blockers, asks, schedule risks')}
              />
            </div>

            {/* 반려된 보고서 — 작성자에게 명확히 안내 */}
            {existingReport?.status === 'returned' && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <XCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-black text-rose-800 mb-1">{t('이 보고서가 반려되었습니다', 'This report has been returned')}</div>
                    <div className="text-[11px] text-rose-700 mb-2">
                      {t(`반려자: ${existingReport.approvedBy || '-'}`, `Returned by: ${existingReport.approvedBy || '-'}`)}
                    </div>
                    {existingReport.reviewerComment && (
                      <div className="bg-white border border-rose-200 rounded p-2.5 mb-2">
                        <div className="text-[10px] font-bold text-rose-700 mb-0.5">{t('반려 사유 / 코멘트', 'Reason / Comment')}</div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{existingReport.reviewerComment}</p>
                      </div>
                    )}
                    {targetUser === currentUser.name && (
                      <p className="text-[11px] text-rose-700 font-bold">
                        {t('내용 수정 후 다시 [제출] 버튼을 눌러 재제출하세요.', 'Edit and click [Submit] to resubmit.')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 리뷰어 코멘트 (승인됨일 때 — 반려는 위에 별도 박스) */}
            {existingReport?.status === 'approved' && existingReport.reviewerComment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5">
                <div className="text-[10px] font-bold text-emerald-700 mb-0.5 flex items-center">
                  <CheckCircle size={11} className="mr-1" />
                  {t('리뷰어 코멘트', 'Reviewer Comment')} ({existingReport.approvedBy})
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap">{existingReport.reviewerComment}</p>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <button
                onClick={handleSave}
                disabled={!achievements.trim() && !nextWeekPlan.trim() && !risks.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 text-sm font-bold transition-colors"
              >
                <Save size={14} />{t('초안 저장', 'Save Draft')}
              </button>
              {existingReport?.status !== 'approved' && targetUser === currentUser.name && (
                <button
                  onClick={handleSubmit}
                  disabled={!achievements.trim()}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded text-white text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${existingReport?.status === 'returned' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                  <Send size={14} />{existingReport?.status === 'returned' ? t('재제출', 'Resubmit') : t('제출', 'Submit')}
                </button>
              )}
              {/* 팀장 승인/반려 — 본인이 제출자가 아니고 제출 상태일 때 */}
              {canApprove && existingReport?.status === 'submitted' && existingReport.user !== currentUser.name && (
                <>
                  <textarea
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    rows={1}
                    placeholder={t('리뷰어 코멘트 (선택, 반려 시 권장)', 'Reviewer comment (optional, recommended on return)')}
                    className="flex-1 min-w-[200px] text-xs p-2 border border-slate-300 rounded resize-none focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    <CheckCircle size={14} />{t('승인', 'Approve')}
                  </button>
                  <button
                    onClick={handleReturn}
                    className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    <XCircle size={14} />{t('반려', 'Return')}
                  </button>
                </>
              )}
              {existingReport?.status === 'approved' && (
                <span className="ml-auto text-[11px] text-emerald-700 font-bold flex items-center">
                  <CheckCircle size={12} className="mr-1" />{t(`${existingReport.approvedBy}이(가) ${existingReport.approvedAt}에 승인`, `Approved by ${existingReport.approvedBy} at ${existingReport.approvedAt}`)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* 팀원 보기 — PM/ADMIN */}
      {activeTab === 'team' && canApprove && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <button onClick={() => moveWeek(-1)} className="p-1.5 rounded hover:bg-slate-100"><ChevronLeft size={16} /></button>
              <button onClick={goThisWeek} className="px-3 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200">{t('이번 주', 'This week')}</button>
              <button onClick={() => moveWeek(1)} className="p-1.5 rounded hover:bg-slate-100"><ChevronRight size={16} /></button>
            </div>
            <div className="text-sm font-bold text-slate-700 tabular-nums">
              {fmtDate(weekStart)} ~ {fmtDate(weekEnd)}
            </div>
            <span className="ml-auto text-xs text-slate-500">{teamReports.length}{t('건 제출', ' submitted')}</span>
          </div>

          {/* 팀 종합 보고서 카드 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-indigo-800 flex items-center gap-2 mb-1">
                  <Users size={16} />
                  {t('팀 종합 보고서', 'Team Consolidated Report')}
                  {existingTeamReport && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${statusInfo(existingTeamReport.status).cls}`}>
                      {statusInfo(existingTeamReport.status).icon}
                      {statusInfo(existingTeamReport.status).label}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-600 mb-2">
                  {currentUser.role === 'ADMIN'
                    ? t('전체 부서 팀원 보고서를 자동 정리해 종합 보고서를 작성합니다.', 'Consolidate all dept reports.')
                    : t(`${currentUser.dept || '본인 부서'} 팀원 보고서를 자동 정리해 종합 보고서를 작성합니다.`, `Consolidate ${currentUser.dept || 'your dept'} reports.`)}
                </p>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-700"><strong className="text-indigo-700 text-sm">{teamStats.total}</strong>{t('명', '')}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-blue-700"><strong>{teamStats.submitted}</strong>{t(' 제출', ' Submit')}</span>
                  <span className="text-emerald-700"><strong>{teamStats.approved}</strong>{t(' 승인', ' Appr')}</span>
                  <span className="text-rose-700"><strong>{teamStats.returned}</strong>{t(' 반려', ' Ret')}</span>
                  <span className="text-slate-500"><strong>{teamStats.draft}</strong>{t(' 초안/미제출', ' Draft')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setTeamReportOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white text-sm font-bold shadow-sm"
                >
                  <ClipboardList size={14} />
                  {existingTeamReport ? t('편집 / 추출', 'Edit / Export') : t('자동 정리 + 작성', 'Auto Compile')}
                </button>
              </div>
            </div>
            {teamStats.draft > 0 && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-800 flex items-start">
                <AlertTriangle size={12} className="mr-1.5 mt-0.5 shrink-0" />
                <span>{t(`아직 ${teamStats.draft}명이 제출하지 않았습니다. 모두 제출 후 종합하는 것을 권장합니다.`, `${teamStats.draft} not submitted yet.`)}</span>
              </div>
            )}
          </div>

          {teamReports.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">
              {t('해당 주에 제출된 보고서가 없습니다.', 'No reports submitted for this week.')}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teamReports.map(r => {
                const sInfo = statusInfo(r.status);
                return (
                  <button
                    key={r.id}
                    onClick={() => { setReviewReportId(r.id); setReviewComment(r.reviewerComment || ''); }}
                    className="text-left bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-400 hover:shadow-md transition-all p-4"
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">{r.user.charAt(0)}</div>
                        <span className="text-sm font-bold text-slate-800">{r.user}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${sInfo.cls}`}>
                        {sInfo.icon}{sInfo.label}
                      </span>
                    </div>
                    {r.summary && (
                      <div className="flex flex-wrap gap-1 mb-2 text-[10px]">
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">P {r.summary.projects || 0}</span>
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">셋업 {r.summary.tasksCompleted || 0}</span>
                        <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-bold">회의록 {r.summary.notes || 0}</span>
                        <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">이슈 {r.summary.issuesAdded || 0}</span>
                        <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-bold">AS {r.summary.asProcessed || 0}</span>
                      </div>
                    )}
                    <p className="text-xs text-slate-700 line-clamp-3 whitespace-pre-wrap">{r.achievements || '(미작성)'}</p>
                    <div className="text-[10px] text-slate-400 mt-2 flex items-center justify-between">
                      <span>{t('제출', 'Submitted')}: {r.submittedAt || '-'}</span>
                      {r.approvedAt && <span>{t('승인', 'Approved')}: {r.approvedAt}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 팀 종합 보고서 모달 */}
      {teamReportOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={() => setTeamReportOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[92vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 shrink-0">
              <div>
                <h3 className="text-base font-black text-indigo-800 flex items-center gap-2">
                  <Users size={18} />
                  {t('팀 종합 주간 보고서', 'Team Consolidated Weekly Report')}
                  {existingTeamReport && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${statusInfo(existingTeamReport.status).cls}`}>
                      {statusInfo(existingTeamReport.status).icon}
                      {statusInfo(existingTeamReport.status).label}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {t(`팀장: ${currentUser.name} · 부서: ${currentUser.dept || '-'} · 주차: ${fmtDate(weekStart)} ~ ${fmtDate(weekEnd)}`, `Lead: ${currentUser.name} · Dept: ${currentUser.dept || '-'} · ${fmtDate(weekStart)} ~ ${fmtDate(weekEnd)}`)}
                </p>
              </div>
              <button onClick={() => setTeamReportOpen(false)} className="text-slate-400 hover:text-slate-700 p-1"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto flex-1 p-5 space-y-3 bg-slate-50">
              {/* 팀 통계 */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: t('팀원 수', 'Members'), v: teamStats.total, c: 'bg-indigo-50 text-indigo-700' },
                  { label: t('제출됨', 'Submitted'), v: teamStats.submitted, c: 'bg-blue-50 text-blue-700' },
                  { label: t('승인 완료', 'Approved'), v: teamStats.approved, c: 'bg-emerald-50 text-emerald-700' },
                  { label: t('미제출', 'Not Submitted'), v: teamStats.draft + teamStats.returned, c: 'bg-amber-50 text-amber-700' },
                ].map((m, i) => (
                  <div key={i} className={`rounded-lg border border-slate-100 p-3 text-center ${m.c}`}>
                    <div className="text-2xl font-black tabular-nums">{m.v}</div>
                    <div className="text-[10px] font-bold opacity-80">{m.label}</div>
                  </div>
                ))}
              </div>

              {/* 액션 바 */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleRegenerateTeam}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold border border-indigo-200"
                  title={t('팀원 보고서를 다시 자동 정리 (편집한 내용 덮어씀)', 'Re-aggregate from member reports (overwrites edits)')}
                >
                  <RefreshCw size={12} />{t('자동 정리 다시 생성', 'Re-aggregate')}
                </button>
                <span className="text-[10px] text-slate-400">{t('팀원 보고서 변경 시 다시 클릭하면 재집계됨', 'Re-fetch member reports')}</span>
                <span className="ml-auto"></span>
                <button
                  onClick={handleExportTeamExcel}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm"
                >
                  <Download size={12} />Excel
                </button>
                <button
                  onClick={handleExportTeamPDF}
                  className="flex items-center gap-1.5 px-3 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-sm"
                >
                  <FileText size={12} />PDF
                </button>
              </div>

              {/* 팀장 종합 코멘트 */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <label className="block text-xs font-bold text-indigo-700 mb-1 flex items-center"><Lightbulb size={11} className="mr-1" />{t('팀장 종합 코멘트 (선택)', 'Team Lead Note (optional)')}</label>
                <p className="text-[10px] text-slate-500 mb-1.5">{t('팀 전체 관점의 한 줄 요약·KPI·다음 주 우선순위 등을 작성하면 보고서 상단에 노출됩니다.', 'A one-liner summary / KPI / priorities — shown at top of the report.')}</p>
                <textarea
                  rows={2}
                  value={teamLeadNote}
                  onChange={(e) => setTeamLeadNote(e.target.value)}
                  className="w-full text-sm p-2 border border-indigo-200 rounded-lg resize-y focus:outline-none focus:border-indigo-500"
                  placeholder={t('예: 이번 주 SAT 3건 완료, 다음 주 SOP 2건 예정. P3 라인 일정 리스크 주의', 'e.g., 3 SATs done, 2 SOPs next week, watch P3 schedule risk')}
                />
              </div>

              {/* 3 섹션 */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">{t('금주 실적 (팀 종합)', 'Team Achievements')}</label>
                  <textarea
                    rows={8}
                    value={teamAchievements}
                    onChange={(e) => setTeamAchievements(e.target.value)}
                    className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-y focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-700 mb-1">{t('차주 계획 (팀 종합)', 'Team Next Week Plan')}</label>
                  <textarea
                    rows={6}
                    value={teamPlan}
                    onChange={(e) => setTeamPlan(e.target.value)}
                    className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-y focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-rose-700 mb-1">{t('이슈 / 리스크 (팀 종합)', 'Team Issues / Risks')}</label>
                  <textarea
                    rows={4}
                    value={teamRisks}
                    onChange={(e) => setTeamRisks(e.target.value)}
                    className="w-full text-sm p-3 border border-slate-300 rounded-lg resize-y focus:outline-none focus:border-rose-500 font-mono"
                  />
                </div>
              </div>

              {existingTeamReport?.reviewerComment && existingTeamReport.status !== 'submitted' && (
                <div className={`rounded-lg p-3 border ${existingTeamReport.status === 'returned' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className={`text-[10px] font-bold mb-1 ${existingTeamReport.status === 'returned' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {t(`상위 관리자 ${existingTeamReport.status === 'returned' ? '반려' : '승인'} 코멘트`, `Manager Comment`)} ({existingTeamReport.approvedBy})
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{existingTeamReport.reviewerComment}</p>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-slate-200 bg-white shrink-0 flex items-center gap-2 justify-end flex-wrap">
              <span className="text-[11px] text-slate-500 mr-auto">
                {existingTeamReport
                  ? t(`마지막 저장: ${existingTeamReport.updatedAt}`, `Last saved: ${existingTeamReport.updatedAt}`)
                  : t('아직 저장되지 않았습니다.', 'Not saved yet.')}
              </span>
              <button
                onClick={() => setTeamReportOpen(false)}
                className="px-3 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                {t('닫기', 'Close')}
              </button>
              <button
                onClick={handleSaveTeam}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
              >
                <Save size={14} />{t('초안 저장', 'Save')}
              </button>
              {existingTeamReport?.status !== 'approved' && (
                <button
                  onClick={handleSubmitTeam}
                  disabled={!teamAchievements.trim()}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded text-white text-sm font-bold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${existingTeamReport?.status === 'returned' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                  <Send size={14} />{existingTeamReport?.status === 'returned' ? t('재제출', 'Resubmit') : t('상위에 제출', 'Submit Up')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 팀원 보고서 결재 모달 */}
      {reviewReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={() => { setReviewReportId(null); setReviewComment(''); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-indigo-50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">{reviewReport.user.charAt(0)}</div>
                <div>
                  <h3 className="text-base font-bold text-indigo-800 flex items-center gap-2">
                    {reviewReport.user}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${statusInfo(reviewReport.status).cls}`}>
                      {statusInfo(reviewReport.status).icon}
                      {statusInfo(reviewReport.status).label}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                    {reviewReport.weekStart} ~ {reviewReport.weekEnd} · {t('제출', 'Submitted')}: {reviewReport.submittedAt || '-'}
                  </p>
                </div>
              </div>
              <button onClick={() => { setReviewReportId(null); setReviewComment(''); }} className="text-slate-400 hover:text-slate-700 p-1"><X size={20} /></button>
            </div>

            {/* 본문 */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4 bg-slate-50">
              {/* 자동 집계 요약 */}
              {reviewReport.summary && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {[
                    { label: '프로젝트', v: reviewReport.summary.projects, c: 'bg-indigo-50 text-indigo-700' },
                    { label: '셋업 완료', v: reviewReport.summary.tasksCompleted, c: 'bg-blue-50 text-blue-700' },
                    { label: '회의록', v: reviewReport.summary.notes, c: 'bg-amber-50 text-amber-700' },
                    { label: '이슈', v: reviewReport.summary.issuesAdded, c: 'bg-rose-50 text-rose-700' },
                    { label: 'AS', v: reviewReport.summary.asProcessed, c: 'bg-purple-50 text-purple-700' },
                  ].map((m, i) => (
                    <div key={i} className={`rounded-lg border border-slate-100 p-2 text-center ${m.c}`}>
                      <div className="text-lg font-black tabular-nums">{m.v ?? 0}</div>
                      <div className="text-[10px] font-bold opacity-80">{m.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 금주 실적 */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-blue-50 border-b border-blue-200 text-xs font-black text-blue-800">{t('금주 실적', 'Achievements')}</div>
                <pre className="p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono">{reviewReport.achievements || t('(미작성)', '(Empty)')}</pre>
              </div>
              {/* 차주 계획 */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-200 text-xs font-black text-emerald-800">{t('차주 계획', 'Next Week Plan')}</div>
                <pre className="p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono">{reviewReport.nextWeekPlan || t('(미작성)', '(Empty)')}</pre>
              </div>
              {/* 이슈 / 리스크 */}
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-rose-50 border-b border-rose-200 text-xs font-black text-rose-800">{t('이슈 / 리스크 / 도움 요청', 'Issues / Risks')}</div>
                <pre className="p-3 text-xs text-slate-700 whitespace-pre-wrap font-mono">{reviewReport.risks || t('(미작성)', '(Empty)')}</pre>
              </div>

              {/* 기존 리뷰어 코멘트 (이미 한 번 결재된 경우) */}
              {reviewReport.reviewerComment && reviewReport.status !== 'submitted' && (
                <div className={`rounded-lg p-3 border ${reviewReport.status === 'returned' ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className={`text-[10px] font-bold mb-1 ${reviewReport.status === 'returned' ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {t(`이전 ${reviewReport.status === 'returned' ? '반려' : '승인'} 코멘트`, `Previous ${reviewReport.status === 'returned' ? 'Return' : 'Approval'} Comment`)} ({reviewReport.approvedBy})
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{reviewReport.reviewerComment}</p>
                </div>
              )}
            </div>

            {/* 푸터 — 결재 액션 */}
            <div className="px-5 py-4 border-t border-slate-200 bg-white shrink-0">
              {reviewReport.status === 'submitted' && reviewReport.user !== currentUser.name && canApprove && (
                <>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    {t('리뷰어 코멘트 (반려 시 권장)', 'Reviewer Comment (recommended on return)')}
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={2}
                    placeholder={t('승인 코멘트 또는 반려 사유를 입력하세요', 'Approval comment or return reason')}
                    className="w-full text-xs p-2 border border-slate-300 rounded resize-none focus:outline-none focus:border-indigo-500 mb-3"
                  />
                  <div className="flex items-center gap-2 justify-end flex-wrap">
                    <button
                      onClick={() => { setReviewReportId(null); setReviewComment(''); }}
                      className="px-3 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      {t('닫기', 'Close')}
                    </button>
                    <button
                      onClick={handleReviewReturn}
                      className="flex items-center gap-1.5 px-4 py-2 rounded bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold transition-colors shadow-sm"
                    >
                      <XCircle size={14} />{t('반려', 'Return')}
                    </button>
                    <button
                      onClick={handleReviewApprove}
                      className="flex items-center gap-1.5 px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-colors shadow-sm"
                    >
                      <CheckCircle size={14} />{t('승인', 'Approve')}
                    </button>
                  </div>
                </>
              )}
              {/* 이미 결재 완료된 경우 */}
              {reviewReport.status !== 'submitted' && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {reviewReport.status === 'approved'
                      ? t(`✓ ${reviewReport.approvedBy}이(가) ${reviewReport.approvedAt}에 승인 완료`, `✓ Approved by ${reviewReport.approvedBy}`)
                      : reviewReport.status === 'returned'
                        ? t(`✗ ${reviewReport.approvedBy}이(가) 반려한 보고서 — 작성자가 재제출 대기 중`, `✗ Returned — waiting resubmit`)
                        : ''}
                  </span>
                  <button onClick={() => { setReviewReportId(null); setReviewComment(''); }} className="px-4 py-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    {t('닫기', 'Close')}
                  </button>
                </div>
              )}
              {/* 본인이 작성자인 경우 */}
              {reviewReport.user === currentUser.name && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{t('본인 보고서는 [내 보고서] 탭에서 편집하세요.', 'Edit your own report in [My Report] tab.')}</span>
                  <button onClick={() => { setReviewReportId(null); setReviewComment(''); setActiveTab('mine'); setTargetUser(reviewReport.user); }} className="px-4 py-2 text-sm font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg">
                    {t('내 보고서로 이동', 'Go to My Report')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 샘플 + 가이드 모달 */}
      {helpOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]" onClick={() => setHelpOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-amber-50 shrink-0">
              <h3 className="text-base font-bold text-amber-800 flex items-center">
                <BookOpen size={18} className="mr-2" />
                {t('주간 업무 보고 — 샘플 + 사용 가이드', 'Weekly Reports — Sample + Guide')}
              </h3>
              <button onClick={() => setHelpOpen(false)} className="text-amber-400 hover:text-amber-600 p-1"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50">

              {/* === 1. 한눈에 사용 흐름 === */}
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center"><Lightbulb size={14} className="mr-1.5" />{t('30초 사용법 (가장 빠른 방법)', '30-Second Usage')}</h4>
                <ol className="space-y-2 text-sm text-slate-700">
                  <li className="flex gap-2">
                    <span className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center font-black text-xs shrink-0">1</span>
                    <span>좌측 메뉴에서 <strong className="text-indigo-700">"주간 업무 보고"</strong> 클릭</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center font-black text-xs shrink-0">2</span>
                    <span>주차 확인 (기본 이번 주, ◀ ▶로 이동 가능)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center font-black text-xs shrink-0">3</span>
                    <span><strong className="text-emerald-700">"⬇ 자동 + Excel 추출"</strong> 또는 <strong className="text-rose-700">"📄 자동 + PDF"</strong> 클릭 → <strong>완료</strong></span>
                  </li>
                </ol>
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800 flex items-start">
                  <Lightbulb size={12} className="mr-1.5 mt-0.5 shrink-0" />
                  <span>편집 없이 한 번 클릭으로 시스템 데이터 기반 보고서가 추출됩니다. 수정하고 싶으면 textarea에서 편집 후 하단 Excel/PDF 버튼 사용.</span>
                </div>
              </section>

              {/* === 2. 샘플 보고서 === */}
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center"><FileText size={14} className="mr-1.5" />{t('샘플 보고서 (자동 생성 결과 예시)', 'Sample Report (Auto-generated)')}</h4>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 pb-2 border-b border-slate-200">
                    <span className="font-bold">작성자:</span> 홍길동
                    <span className="text-slate-300">·</span>
                    <span className="font-bold">주차:</span> 2025-12-08 ~ 2025-12-14
                    <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">제출됨</span>
                  </div>

                  <div>
                    <div className="text-[11px] font-black text-indigo-700 mb-1">[금주 실적]</div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-200">{`■ Cycler Line 1 (LG에너지솔루션 P3)
  - 단계: '셋업' → '검수'
  - 셋업 일정 5건 완료
  - 회의록 2건: SOP 확정 회의 / 시운전 검토
  - 이슈 1건 등록 (Medium)

■ EOL Tester (삼성SDI)
  - 셋업 일정 3건 완료
  - AS 1건 처리 (긴급출동)

■ 출장
  - 2025-12-10 ~ 12-12 · Cycler Line 1 (천안 P3)`}</pre>
                  </div>

                  <div>
                    <div className="text-[11px] font-black text-indigo-700 mb-1">[차주 계획]</div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-200">{`■ 셋업 일정 (시작 예정)
  - Cycler Line 1: 최종 검수 (2025-12-15 ~ 12-19)
  - EOL Tester: 캘리브레이션 (2025-12-16 ~ 12-18)

■ 출장 일정
  - 2025-12-15 ~ 12-17 · Cycler Line 2 (오창)

■ 임박 마일스톤 (14일 내)
  - Cycler Line 1: SOP (2025-12-19)
  - EOL Tester: 1차 검수 (2025-12-22)`}</pre>
                  </div>

                  <div>
                    <div className="text-[11px] font-black text-indigo-700 mb-1">[이슈 / 리스크 / 도움 요청]</div>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border border-slate-200">{`■ 미해결 이슈
  - [High] Cycler Line 1: 충방전 안정성 미달
  - [Medium] EOL Tester: 통신 간헐적 끊김

■ 위험 상태 프로젝트
  - [마감임박] Cycler Line 3 (납기 2025-12-22)

■ 지연 / 메모 있는 셋업
  - Cycler Line 3: 챔버 도킹 (기한 초과) — 자재 입고 지연`}</pre>
                  </div>
                </div>
              </section>

              {/* === 3. 자동 채워지는 데이터 === */}
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center"><RefreshCw size={14} className="mr-1.5" />{t('자동으로 채워지는 데이터', 'Auto-fill Data Sources')}</h4>
                <div className="space-y-3 text-xs text-slate-700">
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <div className="font-bold text-blue-800 mb-1">📋 금주 실적</div>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                      <li>본인이 작성자로 기록된 <strong>활동 이력</strong> (단계 변경, 셋업 완료, 일정/이름 수정 등)</li>
                      <li>본인이 작성한 <strong>회의록</strong> (요약 일부 자동 인용)</li>
                      <li>본인이 등록한 <strong>이슈</strong> (심각도 표시)</li>
                      <li>본인이 처리한 <strong>AS</strong> 및 <strong>고객 요청</strong></li>
                      <li>본인의 <strong>출장</strong> (engineerId 매칭)</li>
                    </ul>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                    <div className="font-bold text-emerald-800 mb-1">📅 차주 계획</div>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                      <li>다음 주 <strong>시작 예정 셋업 일정</strong> (담당 프로젝트의 미완료 task)</li>
                      <li>다음 주 <strong>출장 일정</strong></li>
                      <li><strong>14일 내 임박 마일스톤</strong> (단계 마일스톤 + 프로젝트 납기)</li>
                    </ul>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded p-3">
                    <div className="font-bold text-rose-800 mb-1">⚠ 이슈 / 리스크</div>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                      <li>본인 등록한 <strong>미해결 이슈</strong></li>
                      <li>본인 담당 프로젝트 중 <strong>마감임박/이슈발생</strong> 상태</li>
                      <li><strong>기한 초과</strong>되거나 <strong>지연 사유</strong> 입력된 셋업</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-800 flex items-start">
                  <Lightbulb size={12} className="mr-1.5 mt-0.5 shrink-0" />
                  <span>시스템에 활동을 즉시 등록할수록 보고서 정확도가 올라갑니다. 회의록 등록 시 <strong>한줄 요약</strong>을 적으면 그대로 노출됩니다.</span>
                </div>
              </section>

              {/* === 4. 권한별 차이 === */}
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center"><Users size={14} className="mr-1.5" />{t('권한별 사용 범위', 'Access by Role')}</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border border-slate-200 rounded-lg">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold border-b border-slate-200">권한</th>
                        <th className="px-3 py-2 text-center font-bold border-b border-slate-200">본인 작성</th>
                        <th className="px-3 py-2 text-center font-bold border-b border-slate-200">다른 사람 조회</th>
                        <th className="px-3 py-2 text-center font-bold border-b border-slate-200">승인/반려</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr><td className="px-3 py-2 font-bold text-rose-700">ADMIN</td><td className="text-center">✅</td><td className="text-center">✅ 모든 부서</td><td className="text-center">✅</td></tr>
                      <tr><td className="px-3 py-2 font-bold text-purple-700">팀장 <span className="text-[10px] text-slate-500">(사용자 관리에서 지정)</span></td><td className="text-center">✅</td><td className="text-center">✅ <strong>같은 부서만</strong></td><td className="text-center">✅</td></tr>
                      <tr><td className="px-3 py-2 font-bold text-blue-700">PM/엔지니어 (일반)</td><td className="text-center">✅</td><td className="text-center">❌ 본인만</td><td className="text-center">❌</td></tr>
                      <tr><td className="px-3 py-2 font-bold text-slate-500">고객사</td><td className="text-center">❌</td><td className="text-center">❌</td><td className="text-center">❌</td></tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* === 5. 워크플로우 === */}
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center"><Send size={14} className="mr-1.5" />{t('제출 → 승인 워크플로우', 'Submit → Approve Workflow')}</h4>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded font-bold flex items-center gap-1"><Clock size={11} />초안</span>
                  <span className="text-slate-400">→</span>
                  <span className="bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded font-bold flex items-center gap-1"><Send size={11} />제출됨</span>
                  <span className="text-slate-400">→</span>
                  <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded font-bold flex items-center gap-1"><CheckCircle size={11} />승인됨</span>
                  <span className="text-slate-400">또는</span>
                  <span className="bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded font-bold flex items-center gap-1"><XCircle size={11} />반려됨</span>
                </div>
                <ul className="list-disc pl-5 mt-3 text-xs text-slate-700 space-y-1">
                  <li><strong>초안 저장</strong>: 작성 중 언제든 저장. 자동 집계 + 편집 내용 보존</li>
                  <li><strong>제출</strong>: 팀장에게 결재 요청. 제출 후에도 수정 가능</li>
                  <li><strong>팀장 승인</strong>: 같은 부서 보고서에 한해. 코멘트는 선택 (있으면 녹색 박스로 노출됨)</li>
                  <li><strong>팀장 반려</strong>:
                    <ul className="list-disc pl-5 mt-1 space-y-0.5">
                      <li>승인/반려 버튼 옆 텍스트 입력란에 <strong>반려 사유 작성</strong> → "반려" 버튼 클릭</li>
                      <li>코멘트 비어있으면 확인 다이얼로그 — 권장: 무엇을 수정해야 할지 명시</li>
                      <li>반려된 보고서는 작성자에게 <strong>큰 빨간색 알림 박스</strong>로 표시됨 (반려 사유·반려자·재제출 안내 포함)</li>
                    </ul>
                  </li>
                  <li><strong>재제출</strong>: 반려된 보고서는 작성자가 수정 후 [재제출] 버튼 클릭 (제출 버튼이 빨강으로 표시) → status는 다시 "제출됨"</li>
                </ul>
              </section>

              {/* === 6. 팀 종합 보고서 (팀장 전용) === */}
              <section className="bg-white rounded-xl border-2 border-indigo-200 p-5">
                <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center">
                  <Users size={14} className="mr-1.5" />
                  {t('팀 종합 보고서 (팀장 전용)', 'Team Consolidated Report (Team Lead Only)')}
                </h4>
                <p className="text-xs text-slate-600 mb-3">{t('팀원 개별 보고서를 자동 정리해 부서 단위 보고서로 합치고, 상위(ADMIN)에게 제출/추출합니다.', 'Auto-aggregate member reports into a single dept-level report and submit upward.')}</p>

                <div className="space-y-3">
                  <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                    <div className="font-bold text-indigo-800 mb-1.5 text-xs">📍 위치</div>
                    <p className="text-xs text-slate-700">"주간 업무 보고" → <strong>"팀원 보기"</strong> 탭 → 상단 인디고 카드 <strong>"팀 종합 보고서"</strong></p>
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                    <div className="font-bold text-emerald-800 mb-1.5 text-xs">📋 사용 흐름</div>
                    <ol className="space-y-1 text-xs text-slate-700">
                      <li className="flex gap-2">
                        <span className="bg-emerald-200 text-emerald-800 rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shrink-0">1</span>
                        <span>팀원들 본인 보고서 작성/제출 → 팀장이 카드 클릭으로 <strong>승인/반려</strong> 결재</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-emerald-200 text-emerald-800 rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shrink-0">2</span>
                        <span>모두 처리되면 상단 카드의 <strong>"자동 정리 + 작성"</strong> 버튼 클릭</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-emerald-200 text-emerald-800 rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shrink-0">3</span>
                        <span>모달이 열리며 팀원 보고서 내용이 자동으로 <strong>3섹션(실적/계획/리스크)에 정리됨</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-emerald-200 text-emerald-800 rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shrink-0">4</span>
                        <span><strong>"팀장 종합 코멘트"</strong> 입력 (선택) — 팀 전체 KPI, 우선순위, 한 줄 요약</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="bg-emerald-200 text-emerald-800 rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shrink-0">5</span>
                        <span>필요 시 textarea에서 직접 편집 후 <strong>Excel/PDF 추출</strong> 또는 <strong>"상위에 제출"</strong></span>
                      </li>
                    </ol>
                  </div>

                  {/* 팀 종합 샘플 보고서 */}
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <div className="font-bold text-amber-800 mb-2 text-xs flex items-center"><FileText size={11} className="mr-1" />샘플 — 팀 종합 보고서 (자동 정리 결과)</div>

                    <div className="bg-white border border-amber-200 rounded-lg overflow-hidden">
                      {/* 헤더 */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-3 py-2 border-b border-indigo-200">
                        <div className="text-xs font-black text-indigo-800 flex items-center gap-2">
                          <Users size={11} />팀 종합 주간 보고서
                          <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold">제출됨</span>
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          팀장: 김팀장 · 부서: 제조기술팀 · 주차: 2025-12-08 ~ 2025-12-14
                        </div>
                      </div>

                      {/* 통계 4개 */}
                      <div className="grid grid-cols-4 gap-1.5 p-2 bg-slate-50 border-b border-slate-200">
                        <div className="bg-indigo-50 rounded px-1 py-1.5 text-center">
                          <div className="text-base font-black text-indigo-700">5</div>
                          <div className="text-[9px] font-bold text-indigo-600">팀원</div>
                        </div>
                        <div className="bg-blue-50 rounded px-1 py-1.5 text-center">
                          <div className="text-base font-black text-blue-700">5</div>
                          <div className="text-[9px] font-bold text-blue-600">제출됨</div>
                        </div>
                        <div className="bg-emerald-50 rounded px-1 py-1.5 text-center">
                          <div className="text-base font-black text-emerald-700">4</div>
                          <div className="text-[9px] font-bold text-emerald-600">승인</div>
                        </div>
                        <div className="bg-amber-50 rounded px-1 py-1.5 text-center">
                          <div className="text-base font-black text-amber-700">0</div>
                          <div className="text-[9px] font-bold text-amber-600">미제출</div>
                        </div>
                      </div>

                      {/* 팀장 종합 코멘트 */}
                      <div className="p-2.5 bg-indigo-50/40 border-b border-indigo-100">
                        <div className="text-[10px] font-black text-indigo-700 mb-1 flex items-center"><Lightbulb size={10} className="mr-1" />팀장 종합 코멘트</div>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          이번 주 SAT 3건 완료(LG에솔 2건, 삼성SDI 1건). 다음 주 SOP 2건 예정. P3 라인 자재 입고 지연으로 일정 리스크 있음 — 발주처 협조 요청 진행 중.
                        </p>
                      </div>

                      {/* 금주 실적 */}
                      <div className="p-2.5 border-b border-slate-100">
                        <div className="text-[10px] font-black text-blue-700 mb-1">[금주 실적]</div>
                        <pre className="text-[10px] text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">{`【 김팀장 】
■ Cycler Line 1 (LG에너지솔루션 P3)
  - 단계: '셋업' → '검수'
  - 셋업 일정 5건 완료
  - 회의록 2건: SAT 회의 / SOP 확정
■ 출장: 2025-12-10 ~ 12-12 · 천안 P3

【 홍길동 】
■ EOL Tester (삼성SDI)
  - 셋업 3건 완료
  - AS 1건 처리 (긴급출동)

【 이엔지 】
■ Cycler Line 2 (LG에너지솔루션 오창)
  - 캘리브레이션 완료
  - 회의록 1건: 부품 교체 협의

【 박엔지 】
■ Cycler Line 3 — 자재 입고 대응 (지연 이슈 발생)
  - 회의록 1건: 발주처 미팅`}</pre>
                      </div>

                      {/* 차주 계획 */}
                      <div className="p-2.5 border-b border-slate-100">
                        <div className="text-[10px] font-black text-emerald-700 mb-1">[차주 계획]</div>
                        <pre className="text-[10px] text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">{`【 김팀장 】
■ 셋업: Cycler Line 1 최종 검수 (12-15~19)
■ 임박 마일스톤: SOP (12-19)

【 홍길동 】
■ 셋업: EOL Tester 캘리브레이션 (12-16~18)
■ 출장: 12-15~17 · 오창

【 이엔지 】
■ 셋업: Cycler Line 2 SOP 준비

【 박엔지 】
■ 자재 입고 후 챔버 도킹 재개`}</pre>
                      </div>

                      {/* 이슈 / 리스크 */}
                      <div className="p-2.5">
                        <div className="text-[10px] font-black text-rose-700 mb-1">[이슈 / 리스크 / 도움 요청]</div>
                        <pre className="text-[10px] text-slate-700 whitespace-pre-wrap font-mono bg-slate-50 p-2 rounded border border-slate-100 leading-relaxed">{`【 김팀장 】
■ 미해결 이슈
  - [High] Cycler Line 1: 충방전 안정성 미달

【 박엔지 】
■ 위험 상태 프로젝트
  - [마감임박] Cycler Line 3 (납기 12-22)
■ 지연 / 메모 있는 셋업
  - 챔버 도킹 (기한 초과) — 자재 입고 지연
  ※ 발주처 회신 12-15까지 요청

【 홍길동 】
■ 미해결 이슈
  - [Medium] EOL Tester: 통신 간헐적 끊김`}</pre>
                      </div>
                    </div>
                    <p className="text-[10px] text-amber-700 mt-2 leading-relaxed">
                      <strong>형식 특징</strong>: 팀원 이름이 <code className="bg-white px-1 rounded">【 】</code> 으로 묶이고, 그 아래 본인이 작성한 텍스트 그대로 정리됨. 빈 섹션은 자동 제외. 팀장 종합 코멘트는 별도 강조 박스로 보고서 상단에 노출.
                    </p>
                  </div>

                  <div className="bg-rose-50 border border-rose-200 rounded p-3">
                    <div className="font-bold text-rose-800 mb-1.5 text-xs">📤 제출 후 흐름</div>
                    <ul className="text-xs text-slate-700 space-y-0.5 list-disc pl-5">
                      <li>"상위에 제출" 클릭 → 상태 <strong>제출됨</strong>으로 변경</li>
                      <li>ADMIN이 결재 (승인/반려) — 개별 보고서와 동일한 워크플로우</li>
                      <li>반려되면 팀장에게 알림 + 빨강 "재제출" 버튼으로 다시 제출 가능</li>
                      <li>승인되면 부서 종합 보고 완료</li>
                    </ul>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded p-3">
                    <div className="font-bold text-slate-700 mb-1.5 text-xs">🔄 재집계</div>
                    <p className="text-xs text-slate-700">팀원이 보고서를 추가 제출하거나 수정한 경우, 모달 액션 바의 <strong>"자동 정리 다시 생성"</strong> 버튼 클릭 → 최신 팀원 보고서 기준으로 재집계됩니다 (편집한 내용은 덮어써짐 — 종합 코멘트는 유지).</p>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded p-3">
                    <div className="font-bold text-indigo-800 mb-1.5 text-xs">📊 추출 형식</div>
                    <ul className="text-xs text-slate-700 space-y-0.5 list-disc pl-5">
                      <li><strong>Excel</strong>: 2시트 — "팀 종합 보고서" (요약 + 3섹션 + 종합 코멘트) / "팀원별 원본"</li>
                      <li><strong>PDF</strong>: 4 통계 카드 + 종합 코멘트 + 3섹션 — 메일/회의 첨부용</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* === 7. 팁 === */}
              <section className="bg-white rounded-xl border border-slate-200 p-5">
                <h4 className="text-sm font-bold text-indigo-700 mb-3 flex items-center"><Lightbulb size={14} className="mr-1.5" />{t('운영 팁', 'Tips')}</h4>
                <ul className="list-disc pl-5 text-xs text-slate-700 space-y-1.5">
                  <li><strong>매주 금요일 오후</strong>: 팀원은 "자동 + Excel 추출" 한 번 클릭 → 제출. 팀장은 곧바로 결재 → 팀 종합 자동 정리 → 상위 제출</li>
                  <li><strong>시스템에 즉시 입력</strong>: 회의 끝 → 회의록 등록, 이슈 발생 → 등록, AS 처리 → 결과 입력. 보고서 자동 채움 정확도 직결</li>
                  <li><strong>회의록 한줄 요약</strong>: 상세 모드에서 "한줄 요약" 입력 시 보고서 본문에 그대로 인용됨</li>
                  <li><strong>추가 메모</strong>: 시스템에 없는 내용 (정성적 회고, 외부 회의 등)은 textarea에서 직접 추가</li>
                  <li><strong>주차 이동</strong>: ◀ ▶ 또는 "이번 주" 버튼으로 빠르게 이동. 과거 보고서도 다시 추출 가능</li>
                  <li><strong>팀장은 팀원 보기 탭</strong>에서 카드 클릭 → 모달 결재 → 상단 카드에서 종합 보고서 작성, 한 화면에서 모든 흐름 처리</li>
                  <li><strong>팀원이 미제출 시 경고</strong>: 종합 보고서 카드에 "아직 N명이 제출 안 함" amber 경고 — 종합 전 모두 제출 받는 것 권장</li>
                </ul>
              </section>

            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-white shrink-0">
              <button onClick={() => setHelpOpen(false)} className="px-4 py-2 text-sm font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex items-center">
                <CheckCircle size={14} className="mr-1.5" />{t('이해했어요', 'Got it')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default WeeklyReportView;
