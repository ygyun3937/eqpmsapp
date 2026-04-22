import React, { memo } from 'react';

const NavItem = memo(function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
      {icon}<span className="font-medium text-sm">{label}</span>
    </button>
  );
});

export default NavItem;
