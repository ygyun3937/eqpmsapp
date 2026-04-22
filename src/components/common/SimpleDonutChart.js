import React, { memo } from 'react';

const SimpleDonutChart = memo(function SimpleDonutChart({ data, t }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentOffset = 0;

  if (total === 0) {
    return <div className="h-32 flex items-center justify-center text-sm text-slate-400">{t('데이터가 없습니다.', 'No Data')}</div>;
  }

  return (
    <div className="flex items-center justify-center h-full w-full">
      <svg viewBox="0 0 36 36" className="w-32 h-32 transform -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
        {data.map((d, i) => {
          if (d.value === 0) return null;
          const percentage = (d.value / total) * 100;
          const strokeDasharray = `${percentage} ${100 - percentage}`;
          const offset = 100 - currentOffset;
          currentOffset += percentage;
          return (
            <circle key={i} cx="18" cy="18" r="15.915" fill="transparent" stroke={d.svgColor} strokeWidth="4" strokeDasharray={strokeDasharray} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
          );
        })}
      </svg>
      <div className="ml-6 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center text-xs">
            <span className={`w-3 h-3 rounded-full mr-2 ${d.color}`}></span>
            <span className="text-slate-600 w-12">{d.label}</span>
            <span className="font-bold text-slate-800">{d.value}{t('건', '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default SimpleDonutChart;
