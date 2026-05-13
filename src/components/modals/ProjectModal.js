import React, { useState, memo } from 'react';
import { PARENT_DOMAINS, SUB_DOMAIN_PRESETS, isBatteryDomain } from '../../constants';
import { Zap } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const ProjectModal = memo(function ProjectModal({ engineers, customers, prefill, subDomainsBySettings, onClose, onSubmit, t }) {
  const [data, setData] = useState({
    domain: prefill?.domain || '반도체',
    subDomain: prefill?.subDomain || '',
    name: '',
    // 엔드유저 / 설비업체 분리
    endUserId: prefill?.endUserId || prefill?.customerId || '',
    endUser: prefill?.endUser || prefill?.customer || '',
    vendorId: prefill?.vendorId || '',
    vendor: prefill?.vendor || '',
    // 호환
    customer: prefill?.customer || prefill?.endUser || '',
    customerId: prefill?.customerId || prefill?.endUserId || '',
    site: '',
    startDate: '', dueDate: '', startTBD: false, dueTBD: false,
    status: '진행중', manager: '',
    hwVersion: '', swVersion: '', fwVersion: '', phaseIndex: 0,
    voltage: '', current: '', spec: ''
  });
  const list = engineers || [];
  const customerList = customers || [];
  const isBattery = isBatteryDomain(data.domain);
  // 중분류 옵션: settings에서 등록된 목록 우선, 없으면 PRESET
  const subOptions = ((subDomainsBySettings && subDomainsBySettings[data.domain]) || SUB_DOMAIN_PRESETS[data.domain] || []);

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
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('대분류', 'Domain')}</label>
          <select className="w-full p-2.5 border rounded-lg text-sm bg-indigo-50 text-indigo-700 font-bold" value={data.domain} onChange={e=>setData({...data, domain:e.target.value, subDomain:''})}>
            {PARENT_DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('중분류 (선택)', 'Sub (optional)')}</label>
          <input
            list={`subdomain-list-${data.domain}`}
            className="w-full p-2.5 border rounded-lg text-sm bg-indigo-50/50 text-indigo-700"
            value={data.subDomain}
            onChange={e=>setData({...data, subDomain:e.target.value})}
            placeholder={subOptions.length ? t(`예: ${subOptions[0]}`, `e.g. ${subOptions[0]}`) : t('직접 입력 가능', 'Free input')}
          />
          <datalist id={`subdomain-list-${data.domain}`}>
            {subOptions.map(s => <option key={s} value={s} />)}
          </datalist>
          <p className="text-[10px] text-slate-400 mt-1">{t('등록된 옵션에서 선택하거나 직접 입력 (예: EOL, ESS, 사이클러, 플라즈마)', 'Pick from preset or type freely')}</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('프로젝트명', 'Project Name')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.name} onChange={e=>setData({...data, name:e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* 엔드유저 — 사이트 소유자 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('엔드유저', 'End User')}</label>
          {customerList.length > 0 ? (
            <>
              <select
                className="w-full p-2.5 border rounded-lg text-sm bg-white"
                value={data.endUserId || '__manual__'}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '__manual__') {
                    setData({ ...data, endUserId: '', customerId: '' });
                  } else {
                    const c = customerList.find(x => x.id === v);
                    const name = c?.name || '';
                    setData({ ...data, endUserId: v, endUser: name, customerId: v, customer: name });
                  }
                }}
              >
                <option value="__manual__">{t('-- 직접 입력 / 미지정 --', '-- Type manually / None --')}</option>
                {customerList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.domain ? ` · ${c.domain}` : ''}</option>
                ))}
              </select>
              {!data.endUserId && (
                <input className="w-full p-2 mt-1.5 border rounded-lg text-sm" placeholder={t('엔드유저 직접 입력 (선택)', 'Enter end-user (optional)')} value={data.endUser} onChange={e => setData({...data, endUser: e.target.value, customer: e.target.value})} />
              )}
            </>
          ) : (
            <input className="w-full p-2.5 border rounded-lg text-sm" value={data.endUser} onChange={e=>setData({...data, endUser:e.target.value, customer:e.target.value})} />
          )}
        </div>

        {/* 설비업체 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('설비업체', 'Vendor')}</label>
          {customerList.length > 0 ? (
            <>
              <select
                className="w-full p-2.5 border rounded-lg text-sm bg-white"
                value={data.vendorId || '__manual__'}
                onChange={e => {
                  const v = e.target.value;
                  if (v === '__manual__') {
                    setData({ ...data, vendorId: '' });
                  } else {
                    const c = customerList.find(x => x.id === v);
                    setData({ ...data, vendorId: v, vendor: c?.name || '' });
                  }
                }}
              >
                <option value="__manual__">{t('-- 직접 입력 / 미지정 --', '-- Type manually / None --')}</option>
                {customerList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.domain ? ` · ${c.domain}` : ''}</option>
                ))}
              </select>
              {!data.vendorId && (
                <input className="w-full p-2 mt-1.5 border rounded-lg text-sm" placeholder={t('설비업체 직접 입력 (선택)', 'Enter vendor (optional)')} value={data.vendor} onChange={e => setData({...data, vendor: e.target.value})} />
              )}
            </>
          ) : (
            <input className="w-full p-2.5 border rounded-lg text-sm" value={data.vendor} onChange={e=>setData({...data, vendor:e.target.value})} />
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('사이트(지역)', 'Site Location')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.site} onChange={e=>setData({...data, site:e.target.value})} />
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
              <input type="checkbox" className="mr-1" checked={data.startTBD} onChange={e=>setData({...data, startTBD:e.target.checked, startDate: e.target.checked ? '' : data.startDate})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.startTBD} type="date" max="9999-12-31" className="w-full p-2.5 border rounded-lg text-sm" value={data.startDate || ''} onChange={e=>setData({...data, startDate:e.target.value, startTBD: !e.target.value})} />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-slate-700">{t('납기일', 'Due Date')}</label>
            <label className="text-[11px] text-slate-500 inline-flex items-center cursor-pointer">
              <input type="checkbox" className="mr-1" checked={data.dueTBD} onChange={e=>setData({...data, dueTBD:e.target.checked, dueDate: e.target.checked ? '' : data.dueDate})} />
              {t('미정', 'TBD')}
            </label>
          </div>
          <input required={!data.dueTBD} type="date" max="9999-12-31" className="w-full p-2.5 border rounded-lg text-sm" value={data.dueDate || ''} onChange={e=>setData({...data, dueDate:e.target.value, dueTBD: !e.target.value})} />
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
              {list.map(eng => {
                const dept = eng.dept && eng.dept !== 'null' ? eng.dept : '';
                const grade = (eng.grade && eng.grade !== 'null') ? eng.grade
                             : (eng.role && eng.role !== 'null' ? eng.role : '');
                return (
                  <option key={eng.id} value={eng.name}>
                    {eng.name}{dept ? ` · ${dept}` : ''}{grade ? ` · ${grade}` : ''}
                  </option>
                );
              })}
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
