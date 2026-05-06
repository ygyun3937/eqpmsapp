import React, { useState, memo } from 'react';
import { Edit, Zap, AlertTriangle } from 'lucide-react';
import { DOMAINS, BATTERY_DOMAINS } from '../../constants';
import { fmtYMD } from '../../utils/calc';
import ModalWrapper from '../common/ModalWrapper';

const cleanText = (v) => {
  if (v == null) return '';
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
  return s;
};

const ProjectEditModal = memo(function ProjectEditModal({ project, engineers, currentUser, onClose, onSubmit, t }) {
  const [data, setData] = useState({
    domain: project?.domain || '반도체',
    name: project?.name || '',
    customer: project?.customer || '',
    site: project?.site || '',
    startDate: fmtYMD(project?.startDate),
    dueDate: fmtYMD(project?.dueDate),
    startTBD: !fmtYMD(project?.startDate),
    dueTBD: !fmtYMD(project?.dueDate),
    manager: project?.manager || '',
    notionLink: project?.notionLink || '',
    voltage: cleanText(project?.voltage),
    current: cleanText(project?.current),
    spec: cleanText(project?.spec)
  });

  if (!project) return null;
  const list = engineers || [];
  const hasCurrentInList = list.some(e => e.name === data.manager);
  const isAdmin = currentUser?.role === 'ADMIN';
  const isBattery = BATTERY_DOMAINS.includes(data.domain);
  const domainChanged = data.domain !== project.domain;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...data,
      startDate: data.startTBD ? '' : data.startDate,
      dueDate: data.dueTBD ? '' : data.dueDate
    };
    delete payload.startTBD;
    delete payload.dueTBD;
    onSubmit(project.id, payload);
  };

  return (
    <ModalWrapper
      title={t('프로젝트 정보 수정', 'Edit Project')}
      icon={<Edit size={18} />}
      color="indigo"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitText={t('저장', 'Save')}
      t={t}
    >
      {/* 산업군 — ADMIN만 수정 가능 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
          <span>{t('산업군', 'Domain')}</span>
          {!isAdmin && <span className="text-[10px] text-slate-400 font-normal">{t('관리자만 수정 가능', 'Admin only')}</span>}
        </label>
        {isAdmin ? (
          <select className="w-full p-2.5 border rounded-lg text-sm bg-indigo-50 text-indigo-700 font-bold" value={data.domain} onChange={e => setData({...data, domain: e.target.value})}>
            {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input disabled className="w-full p-2.5 border rounded-lg text-sm bg-slate-100 text-slate-500 font-bold" value={data.domain} />
        )}
        {domainChanged && (
          <div className="mt-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start">
            <AlertTriangle size={12} className="mr-1 mt-0.5 shrink-0" />
            <span>{t('산업군 변경 시 도메인별 추천 카테고리(검수표/버전 등)가 달라질 수 있습니다. 기존 데이터는 유지됩니다.', 'Domain change updates suggested categories. Existing data is preserved.')}</span>
          </div>
        )}
      </div>

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

      {/* 2차전지 추가 스펙 */}
      {isBattery && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-2">
          <p className="text-xs font-bold text-purple-800 flex items-center"><Zap size={12} className="mr-1" />{t('2차전지 장비 스펙', 'Battery Equipment Specs')}</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('전압', 'Voltage')}</label>
              <input className="w-full p-2 border rounded-lg text-sm" value={data.voltage} onChange={e=>setData({...data, voltage:e.target.value})} placeholder={t('예: 5V / 60V / 1000V', 'e.g. 5V')} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('전류', 'Current')}</label>
              <input className="w-full p-2 border rounded-lg text-sm" value={data.current} onChange={e=>setData({...data, current:e.target.value})} placeholder={t('예: 100A / 300A', 'e.g. 100A')} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-0.5">{t('사양', 'Spec')}</label>
              <input className="w-full p-2 border rounded-lg text-sm" value={data.spec} onChange={e=>setData({...data, spec:e.target.value})} placeholder={t('예: 256ch, 파우치셀', 'e.g. 256ch')} />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">{t('시작일', 'Start Date')}</label>
            <label className="text-[11px] text-slate-500 inline-flex items-center cursor-pointer">
              <input type="checkbox" className="mr-1" checked={data.startTBD} onChange={e => setData({...data, startTBD: e.target.checked})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.startTBD} disabled={data.startTBD} type="date" className={`w-full p-2.5 border rounded-lg text-sm ${data.startTBD ? 'bg-slate-100 text-slate-400' : ''}`} value={data.startTBD ? '' : data.startDate} onChange={e => setData({...data, startDate: e.target.value})} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">{t('납기일', 'Due Date')}</label>
            <label className="text-[11px] text-slate-500 inline-flex items-center cursor-pointer">
              <input type="checkbox" className="mr-1" checked={data.dueTBD} onChange={e => setData({...data, dueTBD: e.target.checked})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.dueTBD} disabled={data.dueTBD} type="date" className={`w-full p-2.5 border rounded-lg text-sm ${data.dueTBD ? 'bg-slate-100 text-slate-400' : ''}`} value={data.dueTBD ? '' : data.dueDate} onChange={e => setData({...data, dueDate: e.target.value})} />
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
    </ModalWrapper>
  );
});

export default ProjectEditModal;
