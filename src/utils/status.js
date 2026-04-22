export const getStatusColor = (status) => {
  if (['완료', '조치 완료', 'Low', '교체완료', '본사 복귀'].includes(status)) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (['진행중', '조치 진행 중', '발주'].includes(status)) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (['마감임박', '이슈 확인', 'Medium', '입고'].includes(status)) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (['High', '청구'].includes(status)) return 'bg-red-100 text-red-800 border-red-200';
  if (['현장 파견'].includes(status)) return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
};
