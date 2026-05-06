import React, { useState, memo } from 'react';
import { DOMAINS, BATTERY_DOMAINS } from '../../constants';
import { Zap } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const ProjectModal = memo(function ProjectModal({ engineers, onClose, onSubmit, t }) {
  const [data, setData] = useState({
    domain: '반도체', name: '', customer: '', site: '',
    startDate: '', dueDate: '', startTBD: false, dueTBD: false,
    status: '진행중', manager: '',
    hwVersion: '', swVersion: '', fwVersion: '', phaseIndex: 0,
    voltage: '', current: '', spec: ''
  });
  const list = engineers || [];
  const isBattery = BATTERY_DOMAINS.includes(data.domain);

  const handleSubmit = (e) => {
    e.preventDefault();
    // 미정 체크 시 날짜 빈 문자열로 저장
    const payload = {
      ...data,
      startDate: data.startTBD ? '' : data.startDate,
      dueDate: data.dueTBD ? '' : data.dueDate
    };
    delete payload.startTBD;
    delete payload.dueTBD;
    onSubmit(payload);
  };

  return (
    <ModalWrapper title={t('새 프로젝트 생성', 'New Project')} onClose={onClose} onSubmit={handleSubmit} submitText={t('생성하기', 'Create')}>
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

      {/* 2차전지 계열 추가 스펙 */}
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
          <p className="text-[10px] text-purple-700">{t('비워두고 나중에 수정 가능 (관리자/PM)', 'Optional, editable later')}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">{t('시작일', 'Start Date')}</label>
            <label className="text-[11px] text-slate-500 inline-flex items-center cursor-pointer">
              <input type="checkbox" className="mr-1" checked={data.startTBD} onChange={e=>setData({...data, startTBD:e.target.checked})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.startTBD} disabled={data.startTBD} type="date" className={`w-full p-2.5 border rounded-lg text-sm ${data.startTBD ? 'bg-slate-100 text-slate-400' : ''}`} value={data.startTBD ? '' : data.startDate} onChange={e=>setData({...data, startDate:e.target.value})} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">{t('납기일', 'Due Date')}</label>
            <label className="text-[11px] text-slate-500 inline-flex items-center cursor-pointer">
              <input type="checkbox" className="mr-1" checked={data.dueTBD} onChange={e=>setData({...data, dueTBD:e.target.checked})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.dueTBD} disabled={data.dueTBD} type="date" className={`w-full p-2.5 border rounded-lg text-sm ${data.dueTBD ? 'bg-slate-100 text-slate-400' : ''}`} value={data.dueTBD ? '' : data.dueDate} onChange={e=>setData({...data, dueDate:e.target.value})} />
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
