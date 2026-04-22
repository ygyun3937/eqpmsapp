import React, { memo } from 'react';

const StatCard = memo(function StatCard({ title, value, icon, color = 'bg-white border-slate-200' }) {
  return (
    <div className={`rounded-xl border shadow-sm p-6 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-600 text-sm font-bold">{title}</h3>
        <div className="p-2 bg-white/50 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-800">{value}</div>
    </div>
  );
});

export default StatCard;
