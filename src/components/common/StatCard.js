import React, { memo } from 'react';

const StatCard = memo(function StatCard({ title, value, icon, color = 'bg-white border-slate-200', onClick, hint }) {
  const clickable = typeof onClick === 'function';
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={clickable ? onClick : undefined}
      className={`text-left w-full rounded-xl border shadow-sm p-6 ${color} ${clickable ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-300' : ''}`}
      title={hint || ''}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-600 text-sm font-bold">{title}</h3>
        <div className="p-2 bg-white/50 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-800">{value}</div>
      {clickable && hint && (
        <div className="mt-1 text-[10px] text-slate-400 font-medium">{hint}</div>
      )}
    </Tag>
  );
});

export default StatCard;
