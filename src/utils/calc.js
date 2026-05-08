import { TODAY } from '../constants';

// ISO 타임스탬프 / Date 문자열 / 'null' 등 잡음을 'YYYY-MM-DD'로 정규화
// 빈 값/유효하지 않은 값은 ''로 반환 → "미정" 폴백 처리 가능
export const fmtYMD = (v) => {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
  const m = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (m) return m[0];
  const d = new Date(s);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const calcExp = (startDate, dueDate) => {
  const start = new Date(startDate);
  const due = new Date(dueDate);
  if (TODAY < start) return 0;
  if (TODAY > due) return 100;
  return Math.round(((TODAY.getTime() - start.getTime()) / (due.getTime() - start.getTime())) * 100);
};

export const calcAct = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100);
};

// 단계별 일정 진척률 — 마지막 단계 = 100%
export const calcPhaseProgress = (project) => {
  const phases = (project && Array.isArray(project.phases) && project.phases.length > 1) ? project.phases : null;
  if (!phases) return 0;
  const idx = typeof project.phaseIndex === 'number' ? project.phaseIndex : 0;
  const clamped = Math.max(0, Math.min(idx, phases.length - 1));
  return Math.round((clamped / (phases.length - 1)) * 100);
};

// 종합 진척률 — 단계별 일정과 셋업 일정 모두 고려한 평균.
// 단계만 있으면 단계 진척만, 셋업만 있으면 셋업 진척만, 둘 다 있으면 평균.
export const calcOverallProgress = (project) => {
  if (!project) return 0;
  const hasPhases = Array.isArray(project.phases) && project.phases.length > 1;
  const hasTasks = Array.isArray(project.tasks) && project.tasks.length > 0;
  const phase = hasPhases ? calcPhaseProgress(project) : null;
  const setup = hasTasks ? calcAct(project.tasks) : null;
  if (phase !== null && setup !== null) return Math.round((phase + setup) / 2);
  if (phase !== null) return phase;
  if (setup !== null) return setup;
  return 0;
};

const daysBetween = (a, b) => Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));

// 엔지니어가 등록된 모든 출장 일정 모음 (project.trips 기준)
export const getEngineerTrips = (engineer, projects) => {
  if (!engineer || !engineer.id) return [];
  const out = [];
  (projects || []).forEach(p => {
    (p.trips || []).forEach(t => {
      if (t.engineerId === engineer.id) {
        out.push({
          ...t,
          projectId: p.id,
          projectName: p.name,
          site: p.site,
          customer: p.customer
        });
      }
    });
  });
  return out;
};

// 엔지니어의 "현재 또는 다음 출장" 한 건 반환 (명시된 trips만 사용)
// state: 'onsite' (오늘 진행 중), 'scheduled' (미래 출장), null (해당 없음)
export const getCurrentTrip = (engineer, projects) => {
  const trips = getEngineerTrips(engineer, projects);
  if (trips.length === 0) return null;
  const today = TODAY;

  const ongoing = trips
    .filter(t => {
      const a = new Date(t.departureDate); const b = new Date(t.returnDate);
      return !isNaN(a) && !isNaN(b) && a <= today && today <= b;
    })
    .sort((a, b) => new Date(a.returnDate) - new Date(b.returnDate));
  if (ongoing.length > 0) {
    const tr = ongoing[0];
    return {
      state: 'onsite',
      label: '현장 파견',
      site: tr.site,
      projectId: tr.projectId,
      projectName: tr.projectName,
      departureDate: tr.departureDate,
      returnDate: tr.returnDate,
      daysLeft: daysBetween(new Date(tr.returnDate), today),
      note: tr.note,
      tripId: tr.id
    };
  }

  const future = trips
    .filter(t => { const d = new Date(t.departureDate); return !isNaN(d) && d > today; })
    .sort((a, b) => new Date(a.departureDate) - new Date(b.departureDate));
  if (future.length > 0) {
    const tr = future[0];
    return {
      state: 'scheduled',
      label: '출장 예정',
      site: tr.site,
      projectId: tr.projectId,
      projectName: tr.projectName,
      departureDate: tr.departureDate,
      returnDate: tr.returnDate,
      daysUntil: daysBetween(new Date(tr.departureDate), today),
      note: tr.note,
      tripId: tr.id
    };
  }

  return null;
};
