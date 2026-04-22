import React, { memo } from 'react';
import { X } from 'lucide-react';

const ModalWrapper = memo(function ModalWrapper({ title, onClose, onSubmit, children, submitText, icon, color = 'blue', t = (ko, en) => ko }) {
  const colors = {
    blue: { bg: 'bg-blue-600 hover:bg-blue-700', header: 'bg-slate-50 text-slate-800' },
    red: { bg: 'bg-red-600 hover:bg-red-700', header: 'bg-red-500 text-white' },
    amber: { bg: 'bg-amber-500 hover:bg-amber-600', header: 'bg-amber-500 text-white' },
    indigo: { bg: 'bg-indigo-600 hover:bg-indigo-700', header: 'bg-indigo-50 text-indigo-900' }
  };
  const theme = colors[color] || colors.blue;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
        <div className={`px-6 py-4 flex justify-between items-center shrink-0 ${theme.header}`}>
          <h2 className="text-lg font-bold flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity"><X size={24} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {children}
          {submitText && (
            <div className="pt-4 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">{t('취소', 'Cancel')}</button>
              <button type="submit" className={`px-4 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-colors flex items-center ${theme.bg}`}>{submitText}</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
});

export default ModalWrapper;
