import React, { memo } from 'react';

const SimpleBarChart = memo(function SimpleBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end h-36 space-x-4 w-full px-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group h-full">
          <div className="h-6 w-full flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-slate-700">{d.value}</div>
          <div className="w-full flex-1 flex items-end">
            <div className={`w-full ${d.color} rounded-t-md transition-all duration-700 hover:opacity-80`} style={{ height: `${(d.value / max) * 100}%`, minHeight: '4px' }}></div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 h-4 truncate w-full text-center shrink-0 leading-none">{d.label}</div>
        </div>
      ))}
    </div>
  );
});

export default SimpleBarChart;
