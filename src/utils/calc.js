import { TODAY } from '../constants';

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
