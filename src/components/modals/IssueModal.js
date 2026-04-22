import React, { useState, memo } from 'react';
import { AlertTriangle, Camera, Images, X } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const IssueModal = memo(function IssueModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({ projectId: projects[0]?.id || '', title: '', severity: 'Medium', author: '', alertEmail: '' });
  const [preview, setPreview] = useState(null);
  const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => setPreview(reader.result); reader.readAsDataURL(file); } };

  return (
    <ModalWrapper title={t('현장 이슈 등록', 'Register Issue')} icon={<AlertTriangle size={18}/>} color="red" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit({...data, photo:preview});}} submitText={t('이슈 전송', 'Submit Issue')}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">{t('현장 사진 첨부 (선택)', 'Attach Photo (Optional)')}</label>
        {preview ? (
          <div className="relative bg-slate-100 rounded-xl p-2 border border-slate-200">
            <img src={preview} className="w-full h-40 object-contain rounded-lg" alt="미리보기" />
            <button type="button" onClick={()=>setPreview(null)} className="absolute top-4 right-4 bg-slate-900/70 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-900"><X size={16}/></button>
          </div>
        ) : (
          <div className="flex space-x-3 w-full">
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-red-500 transition-colors"><Camera size={28} className="mb-2"/><span className="font-bold text-sm">{t('사진 촬영', 'Camera')}</span><input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange}/></label>
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-blue-500 transition-colors"><Images size={28} className="mb-2"/><span className="font-bold text-sm">{t('앨범 선택', 'Gallery')}</span><input type="file" accept="image/*" className="hidden" onChange={handleImageChange}/></label>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('관련 프로젝트', 'Project')}</label>
        <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e=>setData({...data, projectId:e.target.value})}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('이슈 내용 (제목)', 'Issue Title')}</label>
        <input required type="text" className="w-full p-2.5 border rounded-lg text-sm" value={data.title} onChange={e=>setData({...data, title:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('알림 수신 이메일 (선택)', 'Alert Email (Optional)')}</label>
        <input type="email" placeholder="manager@company.com" className="w-full p-2.5 border rounded-lg text-sm" value={data.alertEmail} onChange={e=>setData({...data, alertEmail:e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('중요도', 'Severity')}</label>
          <select className="w-full p-2.5 border rounded-lg text-sm font-bold text-red-600 bg-red-50" value={data.severity} onChange={e=>setData({...data, severity:e.target.value})}><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('작성자', 'Author')}</label>
          <input required type="text" className="w-full p-2.5 border rounded-lg text-sm" value={data.author} onChange={e=>setData({...data, author:e.target.value})} />
        </div>
      </div>
    </ModalWrapper>
  );
});

export default IssueModal;
