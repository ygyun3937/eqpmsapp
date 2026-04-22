import React, { useState, memo } from 'react';
import { Database } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';

const SiteModal = memo(function SiteModal({ site, onClose, onSubmit, t }) {
  const [data, setData] = useState(site || { customer: '', fab: '', line: '', power: '', pcw: '', gas: '', limit: '', note: '' });
  return (
    <ModalWrapper title={site ? t('사이트 수정', 'Edit Site') : t('새 사이트 등록', 'New Site')} icon={<Database size={20}/>} color="indigo" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={site ? t('수정하기', 'Update') : t('등록하기', 'Submit')}>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('고객사', 'Customer')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.customer} onChange={e=>setData({...data, customer:e.target.value})} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('공장/라인', 'Fab/Line')}</label>
          <div className="flex gap-2">
            <input required placeholder="Fab" className="w-1/2 p-2.5 border rounded-lg text-sm" value={data.fab} onChange={e=>setData({...data, fab:e.target.value})} />
            <input required placeholder="Line" className="w-1/2 p-2.5 border rounded-lg text-sm" value={data.line} onChange={e=>setData({...data, line:e.target.value})} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div><label className="block text-sm font-bold text-slate-700 mb-1">Power</label><input required className="w-full p-2.5 border rounded-lg text-sm" value={data.power} onChange={e=>setData({...data, power:e.target.value})} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-1">PCW</label><input required className="w-full p-2.5 border rounded-lg text-sm" value={data.pcw} onChange={e=>setData({...data, pcw:e.target.value})} /></div>
        <div><label className="block text-sm font-bold text-slate-700 mb-1">Gas/CDA</label><input required className="w-full p-2.5 border rounded-lg text-sm" value={data.gas} onChange={e=>setData({...data, gas:e.target.value})} /></div>
      </div>
      <div>
        <label className="block text-sm font-bold text-amber-700 mb-1">{t('반입 제약/하중 제한', 'Restrictions')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm bg-amber-50" value={data.limit} onChange={e=>setData({...data, limit:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('기타 특이사항', 'Notes')}</label>
        <textarea rows="2" className="w-full p-2.5 border rounded-lg text-sm resize-none" value={data.note} onChange={e=>setData({...data, note:e.target.value})}></textarea>
      </div>
    </ModalWrapper>
  );
});

export default SiteModal;
