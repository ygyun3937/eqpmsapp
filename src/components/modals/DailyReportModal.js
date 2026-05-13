import React, { useState, memo } from 'react';
import { CheckSquare } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const DailyReportModal = memo(function DailyReportModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({ projectId: projects[0]?.id || '', date: new Date().toISOString().split('T')[0], todayWork: '', tomorrowPlan: '', issues: '' });
  return (
    <ModalWrapper title={t('일일 현장 보고서', 'Daily Report')} icon={<CheckSquare size={18}/>} color="blue" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('보고서 제출', 'Submit')}>
      <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('프로젝트', 'Project')}</label><select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e=>setData({...data, projectId:e.target.value})}>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('작업 일자', 'Date')}</label><input required type="date" max="9999-12-31" className="w-full p-2.5 border rounded-lg text-sm" value={data.date} onChange={e=>setData({...data, date:e.target.value})} /></div>
      <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('금일 작업 내용', "Today's Work")}</label><textarea required rows="3" className="w-full p-2.5 border rounded-lg text-sm resize-none" value={data.todayWork} onChange={e=>setData({...data, todayWork:e.target.value})}></textarea></div>
      <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('명일 작업 계획', "Tomorrow's Plan")}</label><textarea required rows="2" className="w-full p-2.5 border rounded-lg text-sm resize-none" value={data.tomorrowPlan} onChange={e=>setData({...data, tomorrowPlan:e.target.value})}></textarea></div>
      <div><label className="block text-sm font-bold text-slate-700 mb-1">{t('특이사항 및 요청사항', 'Notes')}</label><textarea rows="2" className="w-full p-2.5 border rounded-lg text-sm resize-none" value={data.issues} onChange={e=>setData({...data, issues:e.target.value})}></textarea></div>
    </ModalWrapper>
  );
});

export default DailyReportModal;
