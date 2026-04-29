import React, { useState, memo } from 'react';
import { DOMAINS } from '../../constants';
import ModalWrapper from '../common/ModalWrapper';

const ProjectModal = memo(function ProjectModal({ engineers, onClose, onSubmit, t }) {
  const [data, setData] = useState({ domain: '반도체', name: '', customer: '', site: '', startDate: '', dueDate: '', status: '진행중', manager: '', hwVersion: '', swVersion: '', fwVersion: '', phaseIndex: 0 });
  const list = engineers || [];

  return (
    <ModalWrapper title={t('새 프로젝트 생성', 'New Project')} onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('생성하기', 'Create')}>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('산업군', 'Domain')}</label>
        <select className="w-full p-2.5 border rounded-lg text-sm bg-indigo-50 text-indigo-700 font-bold" value={data.domain} onChange={e=>setData({...data, domain:e.target.value})}>
          {DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('프로젝트명', 'Project Name')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.name} onChange={e=>setData({...data, name:e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('고객사', 'Customer')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.customer} onChange={e=>setData({...data, customer:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('사이트(지역)', 'Site Location')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.site} onChange={e=>setData({...data, site:e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('시작일', 'Start Date')}</label>
          <input required type="date" className="w-full p-2.5 border rounded-lg text-sm" value={data.startDate} onChange={e=>setData({...data, startDate:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('납기일', 'Due Date')}</label>
          <input required type="date" className="w-full p-2.5 border rounded-lg text-sm" value={data.dueDate} onChange={e=>setData({...data, dueDate:e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('담당자(PM)', 'Manager')}</label>
          {list.length === 0 ? (
            <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.manager} onChange={e=>setData({...data, manager:e.target.value})} placeholder={t('등록된 인력이 없어 직접 입력', 'No engineers — type name')} />
          ) : (
            <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.manager} onChange={e=>setData({...data, manager:e.target.value})}>
              <option value="">{t('-- 인력에서 선택 --', '-- Select engineer --')}</option>
              {list.map(eng => (
                <option key={eng.id} value={eng.name}>
                  {eng.name}{eng.dept ? ` · ${eng.dept}` : ''}{eng.role ? ` · ${eng.role}` : ''}
                </option>
              ))}
            </select>
          )}
          <p className="text-[10px] text-slate-400 mt-1">{t('인력/리소스 관리에 등록된 엔지니어 중에서 선택하세요.', 'Pick from registered engineers.')}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('초기 상태', 'Status')}</label>
          <select className="w-full p-2.5 border rounded-lg text-sm" value={data.status} onChange={e=>setData({...data, status:e.target.value})}>
            <option value="진행중">진행중</option>
            <option value="이슈발생">이슈발생</option>
          </select>
        </div>
      </div>
    </ModalWrapper>
  );
});

export default ProjectModal;
