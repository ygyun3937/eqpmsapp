import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';

const DeleteConfirmModal = memo(function DeleteConfirmModal({ type, item, onClose, onConfirm, t }) {
  if (!item) return null;
  let title = '', itemName = '', desc = '';
  if (type === 'project') { title = t('프로젝트 삭제', 'Delete Project'); itemName = item.name; desc = t('모든 이슈 내역이 함께 영구 삭제', 'All related issues will be permanently deleted'); }
  else if (type === 'issue') { title = t('이슈 삭제', 'Delete Issue'); itemName = item.title; desc = t('코멘트가 영구 삭제', 'Comments and history will be permanently deleted'); }
  else if (type === 'release') { title = t('버전 삭제', 'Delete Release'); itemName = item.version; desc = t('릴리즈 내역이 영구 삭제', 'The release note will be permanently deleted'); }
  else if (type === 'engineer') { title = t('엔지니어 삭제', 'Delete Engineer'); itemName = item.name; desc = t('엔지니어 정보가 영구 삭제', 'Engineer information will be permanently deleted'); }
  else if (type === 'part') { title = t('자재 청구 삭제', 'Delete Part'); itemName = item.partName; desc = t('청구 기록이 영구 삭제', 'Part request history will be deleted'); }
  else if (type === 'site') { title = t('사이트 삭제', 'Delete Site'); itemName = item.fab; desc = t('제약사항 데이터가 영구 삭제', 'Infrastructure info will be permanently deleted'); }
  else if (type === 'user') { title = t('사용자 삭제', 'Delete User'); itemName = `${item.name} (${item.id})`; desc = t('계정 및 접근 권한이 영구 삭제', 'Account and access will be permanently deleted'); }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100"><AlertTriangle size={32} /></div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {t('선택하신', 'Selected item')} <strong className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{itemName}</strong> 데이터와 <br/>
          <span className="text-red-500">{desc}</span>{t('됩니다.', 'will be deleted.')}<br/>
          {t('이 작업은 되돌릴 수 없습니다.', 'This action cannot be undone.')}
        </p>
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl">{t('취소', 'Cancel')}</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-sm">{t('삭제합니다', 'Delete')}</button>
        </div>
      </div>
    </div>
  );
});

export default DeleteConfirmModal;
