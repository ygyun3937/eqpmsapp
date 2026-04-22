import React, { useState, memo } from 'react';
import { AlertTriangle, X, Camera, Images } from 'lucide-react';

const MobileIssueModal = memo(function MobileIssueModal({ projects, onClose, onSubmit, t }) {
  const [formData, setFormData] = useState({ projectId: projects[0]?.id || '', title: '', severity: 'High', author: '박현장(본인)', alertEmail: '' });
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
      <div className="bg-red-500 text-white p-4 flex justify-between items-center shadow-md shrink-0">
        <h2 className="text-lg font-bold flex items-center"><AlertTriangle size={18} className="mr-2" />{t('현장 이슈 등록', 'Register Issue')}</h2>
        <button type="button" onClick={onClose}><X size={24} /></button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col space-y-5 pb-20">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('현장 사진 첨부', 'Attach Photo')}</label>
          {previewUrl ? (
            <div className="relative bg-slate-100 rounded-xl p-2 border border-slate-200">
              <img src={previewUrl} alt="Preview" className="w-full h-48 object-contain rounded-lg shadow-sm" />
              <button type="button" onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 bg-slate-900/70 text-white w-8 h-8 rounded-full shadow-md backdrop-blur-sm flex items-center justify-center"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex space-x-3 w-full">
              <label className="flex-1 flex flex-col items-center justify-center py-5 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-red-500 shadow-sm transition-colors active:bg-slate-50">
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
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('이슈 내용', 'Issue Title')}</label>
          <input required type="text" className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder={t('무엇이 문제인가요?', 'What is the issue?')} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('알림 수신 이메일 (선택)', 'Alert Email (Optional)')}</label>
          <input type="email" className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={formData.alertEmail} onChange={e => setFormData({...formData, alertEmail: e.target.value})} placeholder="manager@company.com" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('중요도', 'Severity')}</label>
            <select className="w-full p-3 border border-slate-300 rounded-xl text-sm font-bold text-red-600 bg-red-50" value={formData.severity} onChange={e => setFormData({...formData, severity: e.target.value})}>
              <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">{t('작성자', 'Author')}</label>
            <input required type="text" className="w-full p-3 border border-slate-300 rounded-xl text-sm" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
          </div>
        </div>
        <button type="submit" className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-[0.98] transition-transform mt-auto">{t('이슈 전송', 'Submit Issue')}</button>
      </form>
    </div>
  );
});

export default MobileIssueModal;
