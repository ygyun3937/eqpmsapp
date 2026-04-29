import React, { useState, memo } from 'react';
import { Edit } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const ProjectEditModal = memo(function ProjectEditModal({ project, engineers, onClose, onSubmit, t }) {
  const [data, setData] = useState({
    name: project?.name || '',
    customer: project?.customer || '',
    site: project?.site || '',
    startDate: project?.startDate || '',
    dueDate: project?.dueDate || '',
    manager: project?.manager || '',
    notionLink: project?.notionLink || ''
  });

  if (!project) return null;
  const list = engineers || [];
  // 현재 담당자가 엔지니어 리스트에 없을 수 있으니 보존용 합성 옵션
  const hasCurrentInList = list.some(e => e.name === data.manager);

  return (
    <ModalWrapper
      title={t('프로젝트 정보 수정', 'Edit Project')}
      icon={<Edit size={18} />}
      color="indigo"
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onSubmit(project.id, data); }}
      submitText={t('저장', 'Save')}
      t={t}
    >
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('프로젝트명', 'Project Name')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.name} onChange={e => setData({...data, name: e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('고객사', 'Customer')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.customer} onChange={e => setData({...data, customer: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('사이트', 'Site')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.site} onChange={e => setData({...data, site: e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('시작일', 'Start Date')}</label>
          <input required type="date" className="w-full p-2.5 border rounded-lg text-sm" value={data.startDate} onChange={e => setData({...data, startDate: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('납기일', 'Due Date')}</label>
          <input required type="date" className="w-full p-2.5 border rounded-lg text-sm" value={data.dueDate} onChange={e => setData({...data, dueDate: e.target.value})} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('담당자(PM)', 'Manager')}</label>
        {list.length === 0 ? (
          <input className="w-full p-2.5 border rounded-lg text-sm" value={data.manager} onChange={e => setData({...data, manager: e.target.value})} placeholder={t('등록된 인력이 없어 직접 입력', 'No engineers — type name')} />
        ) : (
          <select className="w-full p-2.5 border rounded-lg text-sm" value={data.manager} onChange={e => setData({...data, manager: e.target.value})}>
            <option value="">{t('-- 미지정 --', '-- Unassigned --')}</option>
            {!hasCurrentInList && data.manager && (
              <option value={data.manager}>{data.manager} {t('(레거시)', '(Legacy)')}</option>
            )}
            {list.map(eng => (
              <option key={eng.id} value={eng.name}>
                {eng.name}{eng.dept ? ` · ${eng.dept}` : ''}{eng.role ? ` · ${eng.role}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Notion 링크 (선택)', 'Notion Link (Optional)')}</label>
        <input type="url" className="w-full p-2.5 border rounded-lg text-sm" value={data.notionLink} onChange={e => setData({...data, notionLink: e.target.value})} placeholder="https://notion.so/..." />
      </div>
    </ModalWrapper>
  );
});

export default ProjectEditModal;
