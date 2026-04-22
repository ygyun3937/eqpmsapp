import React, { useState, memo } from 'react';
import ModalWrapper from '../common/ModalWrapper';

const EngineerModal = memo(function EngineerModal({ engineer, onClose, onSubmit, t }) {
  const [data, setData] = useState(engineer || { name: '', dept: '', role: '', currentSite: '', status: '본사 대기', accessExpiry: '' });
  return (
    <ModalWrapper title={engineer ? t('인력 정보 수정', 'Edit Engineer') : t('새 엔지니어 추가', 'Add Engineer')} color="indigo" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('저장하기', 'Save')}>
      <div><label className="block text-sm font-bold mb-1">{t('이름', 'Name')}</label><input required className="w-full p-2.5 border rounded-lg" value={data.name} onChange={e=>setData({...data, name:e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold mb-1">{t('부서', 'Department')}</label><input required className="w-full p-2.5 border rounded-lg" value={data.dept} onChange={e=>setData({...data, dept:e.target.value})} /></div>
        <div><label className="block text-sm font-bold mb-1">{t('역할', 'Role')}</label><input required className="w-full p-2.5 border rounded-lg" value={data.role} onChange={e=>setData({...data, role:e.target.value})} /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold mb-1">{t('상태', 'Status')}</label><select className="w-full p-2.5 border rounded-lg" value={data.status} onChange={e=>setData({...data, status:e.target.value})}><option value="본사 대기">본사 대기</option><option value="현장 파견">현장 파견</option><option value="본사 복귀">본사 복귀</option></select></div>
        <div><label className="block text-sm font-bold mb-1">{t('현재 위치', 'Location')}</label><input required className="w-full p-2.5 border rounded-lg" value={data.currentSite} onChange={e=>setData({...data, currentSite:e.target.value})} /></div>
      </div>
      <div><label className="block text-sm font-bold mb-1">{t('출입증 만료일', 'Badge Expiry Date')}</label><input required type="date" className="w-full p-2.5 border rounded-lg" value={data.accessExpiry} onChange={e=>setData({...data, accessExpiry:e.target.value})} /></div>
    </ModalWrapper>
  );
});

export default EngineerModal;
