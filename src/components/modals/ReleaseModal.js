import React, { useState, memo } from 'react';
import ModalWrapper from '../common/ModalWrapper';

const ReleaseModal = memo(function ReleaseModal({ onClose, onSubmit, t }) {
  const [data, setData] = useState({ type: 'SW', version: '', author: '', description: '' });
  return (
    <ModalWrapper title={t('새 버전 배포 등록', 'New Release')} color="indigo" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('공유하기', 'Share')}>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold mb-1">{t('분류', 'Type')}</label><select className="w-full p-2.5 border rounded-lg" value={data.type} onChange={e=>setData({...data, type:e.target.value})}><option value="SW">SW</option><option value="FW">FW</option><option value="HW">HW</option></select></div>
        <div><label className="block text-sm font-bold mb-1">{t('버전 정보', 'Version')}</label><input required className="w-full p-2.5 border rounded-lg font-bold" value={data.version} onChange={e=>setData({...data, version:e.target.value})} /></div>
      </div>
      <div><label className="block text-sm font-bold mb-1">{t('작성자', 'Author')}</label><input required className="w-full p-2.5 border rounded-lg" value={data.author} onChange={e=>setData({...data, author:e.target.value})} /></div>
      <div><label className="block text-sm font-bold mb-1">{t('릴리즈 노트', 'Release Notes')}</label><textarea required rows="5" className="w-full p-2.5 border rounded-lg resize-none" value={data.description} onChange={e=>setData({...data, description:e.target.value})}></textarea></div>
    </ModalWrapper>
  );
});

export default ReleaseModal;
