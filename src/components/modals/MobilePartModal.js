import React, { useState, memo } from 'react';
import { Package, X, Camera, Images } from 'lucide-react';

const MobilePartModal = memo(function MobilePartModal({ projects, onClose, onSubmit, t }) {
  const [formData, setFormData] = useState({ projectId: projects[0]?.id || '', partName: '', partNumber: '', quantity: 1, urgency: 'Medium', author: '박현장(본인)' });
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };
  const handleSubmit = (e) => { e.preventDefault(); onSubmit({ ...formData, photo: previewUrl }); };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-amber-500 text-white p-4 flex justify-between items-center shadow-md shrink-0">
        <h2 className="text-lg font-bold flex items-center"><Package size={18} className="mr-2" />{t('자재/스페어 파트 청구', 'Part Request')}</h2>
        <button type="button" onClick={onClose}><X size={24} /></button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col space-y-5 pb-20">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('파트 사진 첨부', 'Attach Photo')}</label>
          {previewUrl ? (
            <div className="relative bg-slate-100 rounded-xl p-2 border border-slate-200">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain rounded-lg shadow-sm" />
              <button type="button" onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 bg-slate-900/70 text-white w-8 h-8 rounded-full shadow-md backdrop-blur-sm flex items-center justify-center"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex space-x-3 w-full">
              <label className="flex-1 flex flex-col items-center justify-center py-5 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-amber-500 shadow-sm transition-colors active:bg-slate-50">
                <Camera size={32} className="mb-2 text-slate-400" /><span className="font-bold text-sm">{t('사진 촬영', 'Camera')}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
              </label>
              <label className="flex-1 flex flex-col items-center justify-center py-5 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-blue-500 shadow-sm transition-colors active:bg-slate-50">
                <Images size={32} className="mb-2 text-slate-400" /><span className="font-bold text-sm">{t('앨범 선택', 'Gallery')}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('관련 프로젝트', 'Project')}</label>
          <select required className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('파트명', 'Part Name')}</label>
            <input required className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={formData.partName} onChange={e => setFormData({...formData, partName: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('수량', 'Qty')}</label>
            <input required type="number" min="1" className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-blue-600" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('도면번호', 'Part Number')}</label>
          <input className="w-full p-3 border border-slate-300 rounded-xl text-sm font-mono" value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} placeholder={t('모를 경우 생략', 'Optional')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('긴급도', 'Urgency')}</label>
            <select className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})}>
              <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('작성자', 'Author')}</label>
            <input required className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
          </div>
        </div>
        <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-transform mt-auto">{t('발주 요청', 'Submit Request')}</button>
      </form>
    </div>
  );
});

export default MobilePartModal;
