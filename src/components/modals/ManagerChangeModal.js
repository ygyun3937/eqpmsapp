import React, { useState, memo } from 'react';
import { User, History } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const ManagerChangeModal = memo(function ManagerChangeModal({ project, onClose, onSubmit, t }) {
  const [newManager, setNewManager] = useState('');
  const [reason, setReason] = useState('');

  if (!project) return null;

  return (
    <ModalWrapper
      title={t('담당자 변경', 'Change Manager')}
      icon={<User size={18} />}
      color="blue"
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSubmit(project.id, newManager.trim(), reason.trim()); }}
      submitText={t('변경하기', 'Change')}
      t={t}
    >
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 mb-1">{t('프로젝트', 'Project')}</p>
        <p className="text-sm font-bold text-slate-800">{project.name}</p>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('현재 담당자', 'Current Manager')}</label>
        <input disabled className="w-full p-2.5 border rounded-lg text-sm bg-slate-100 text-slate-500" value={project.manager || t('미지정', 'Unassigned')} />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('새 담당자', 'New Manager')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm focus:outline-none focus:border-blue-500" value={newManager} onChange={e => setNewManager(e.target.value)} placeholder={t('새 담당자 이름 입력', 'Enter new manager name')} />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('변경 사유', 'Reason')}</label>
        <textarea rows="2" className="w-full p-2.5 border rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500" value={reason} onChange={e => setReason(e.target.value)} placeholder={t('변경 사유 입력 (선택)', 'Optional')}></textarea>
      </div>

      {project.managerHistory?.length > 0 && (
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center"><History size={14} className="mr-1.5" />{t('변경 이력', 'Change History')}</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {project.managerHistory.map((h, i) => (
              <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-700">{h.from} → {h.to}</span>
                  <span className="text-slate-400">{h.date}</span>
                </div>
                {h.reason && <p className="text-slate-500">{t('사유:', 'Reason:')} {h.reason}</p>}
                <p className="text-slate-400 mt-0.5">{t('변경자:', 'By:')} {h.changedBy}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ModalWrapper>
  );
});

export default ManagerChangeModal;
