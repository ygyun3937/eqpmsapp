import React, { useState, memo } from 'react';
import ModalWrapper from '../common/ModalWrapper';

const VersionModal = memo(function VersionModal({ project, onClose, onSubmit, t }) {
  const [data, setData] = useState({ hw: project?.hwVersion||'', sw: project?.swVersion||'', fw: project?.fwVersion||'' });
  if (!project) return null;
  return (
    <ModalWrapper title={t('버전 업데이트', 'Update Version')} onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(project.id, data.hw, data.sw, data.fw);}} submitText={t('업데이트', 'Update')}>
      <div><label className="block text-sm font-medium mb-1">HW 리비전</label><input className="w-full p-2.5 border rounded-lg" value={data.hw} onChange={e=>setData({...data, hw:e.target.value})} /></div>
      <div><label className="block text-sm font-medium mb-1">SW 버전</label><input className="w-full p-2.5 border rounded-lg" value={data.sw} onChange={e=>setData({...data, sw:e.target.value})} /></div>
      <div><label className="block text-sm font-medium mb-1">FW 버전</label><input className="w-full p-2.5 border rounded-lg" value={data.fw} onChange={e=>setData({...data, fw:e.target.value})} /></div>
    </ModalWrapper>
  );
});

export default VersionModal;
