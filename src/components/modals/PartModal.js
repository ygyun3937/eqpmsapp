import React, { useState, memo } from 'react';
import { Package, Camera, Images, X } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const PartModal = memo(function PartModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({ projectId: projects[0]?.id || '', partName: '', partNumber: '', quantity: 1, urgency: 'Medium', author: '' });
  const [preview, setPreview] = useState(null);
  const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setPreview(reader.result); reader.readAsDataURL(file); } };

  return (
    <ModalWrapper title={t('자재/스페어 파트 청구', 'Part Request')} icon={<Package size={18}/>} color="amber" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit({...data, photo:preview});}} submitText={t('발주 요청', 'Request')}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">{t('파트 사진 첨부', 'Attach Photo')}</label>
        {preview ? (
          <div className="relative bg-slate-100 rounded-xl p-2 border border-slate-200">
            <img src={preview} className="w-full h-40 object-contain rounded-lg" alt="미리보기" />
            <button type="button" onClick={()=>setPreview(null)} className="absolute top-4 right-4 bg-slate-900/70 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-900"><X size={16}/></button>
          </div>
        ) : (
          <div className="flex space-x-3 w-full">
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-amber-500 transition-colors"><Camera size={28} className="mb-2"/><span className="font-bold text-sm">{t('사진 촬영', 'Camera')}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange}/></label>
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-blue-500 transition-colors"><Images size={28} className="mb-2"/><span className="font-bold text-sm">{t('앨범 선택', 'Gallery')}</span><input type="file" accept="image/*" className="hidden" onChange={handleImageChange}/></label>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('관련 프로젝트', 'Project')}</label>
        <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e=>setData({...data, projectId:e.target.value})}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('파트명 (품명)', 'Part Name')}</label><input required className="w-full p-2.5 border rounded-lg text-sm" value={data.partName} onChange={e=>setData({...data, partName:e.target.value})} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('필요 수량', 'Quantity')}</label><input required type="number" min="1" className="w-full p-2.5 border rounded-lg text-sm text-blue-600 font-bold" value={data.quantity} onChange={e=>setData({...data, quantity:parseInt(e.target.value)})} /></div>
      </div>
      <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('도면번호 (Part Number)', 'Part Number')}</label><input className="w-full p-2.5 border rounded-lg text-sm font-mono" value={data.partNumber} onChange={e=>setData({...data, partNumber:e.target.value})} placeholder={t('모를 경우 생략 가능', 'Optional')} /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('긴급도', 'Urgency')}</label><select className="w-full p-2.5 border rounded-lg text-sm" value={data.urgency} onChange={e=>setData({...data, urgency:e.target.value})}><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('작성자', 'Author')}</label><input required className="w-full p-2.5 border rounded-lg text-sm" value={data.author} onChange={e=>setData({...data, author:e.target.value})} /></div>
      </div>
    </ModalWrapper>
  );
});

export default PartModal;
