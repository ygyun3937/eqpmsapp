import React, { useState, memo, useMemo } from 'react';
import { ShieldCheck, IdCard, Plane, Plus, Trash, AlertTriangle, XCircle, CheckCircle, Info, Calendar } from 'lucide-react';
import ModalWrapper from '../common/ModalWrapper';
import { TODAY } from '../../constants';

const checkExpiry = (dateStr) => {
  if (!dateStr) return { state: 'none' };
  const d = new Date(dateStr);
  if (isNaN(d)) return { state: 'none' };
  const diff = Math.floor((d - TODAY) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { state: 'expired', daysLeft: diff };
  if (diff <= 30) return { state: 'warning', daysLeft: diff };
  return { state: 'ok', daysLeft: diff };
};

const VISA_STATUS_OPTIONS = ['미해당', '필요', '신청중', '취득', '만료'];

const EngineerCertificatesModal = memo(function EngineerCertificatesModal({
  engineer, projects,
  onClose, onAdd, onUpdate, onDelete,
  t
}) {
  const [activeTab, setActiveTab] = useState('badges');
  const [badgeForm, setBadgeForm] = useState({ issuer: '', expiry: '', note: '' });
  const [safetyForm, setSafetyForm] = useState({ issuer: '', expiry: '', note: '' });
  const [visaForm, setVisaForm] = useState({ country: '', type: '', status: '취득', expiry: '', note: '' });
  const [error, setError] = useState('');

  // 고객사 자동완성 (출입증 발급기관)
  const customerList = useMemo(() => {
    const set = new Set();
    (projects || []).forEach(p => { if (p.customer) set.add(p.customer); });
    return Array.from(set);
  }, [projects]);

  if (!engineer) return null;

  const badges = engineer.badges || [];
  const safetyTrainings = engineer.safetyTrainings || [];
  const visas = engineer.visas || [];

  const handleAdd = (category, form, setForm, defaultForm) => {
    setError('');
    if (category === 'visas') {
      if (!form.status) { setError(t('상태를 선택하세요.', 'Select status.')); return; }
    } else {
      if (!form.issuer.trim()) { setError(t('발급기관/종류를 입력하세요.', 'Enter issuer.')); return; }
      // 안전교육은 만료없는 경우(상시 이수)가 있어 만료일 선택입력 허용
      if (category !== 'safetyTrainings' && !form.expiry) { setError(t('만료일을 입력하세요.', 'Enter expiry.')); return; }
    }
    onAdd(engineer.id, category, { ...form, issuer: (form.issuer || '').trim(), note: (form.note || '').trim(), country: (form.country || '').trim(), type: (form.type || '').trim() });
    setForm(defaultForm);
  };

  const renderCertCard = (item, category, label) => {
    const { state, daysLeft } = checkExpiry(item.expiry);
    const cls = state === 'expired' ? 'bg-red-50 border-red-200'
      : state === 'warning' ? 'bg-amber-50 border-amber-200'
        : 'bg-white border-slate-200';
    const Icon = state === 'expired' ? XCircle : state === 'warning' ? AlertTriangle : CheckCircle;
    const iconCls = state === 'expired' ? 'text-red-500' : state === 'warning' ? 'text-amber-500' : 'text-emerald-500';
    const isPermanent = !item.expiry && category === 'safetyTrainings';
    return (
      <div key={item.id} className={`p-2.5 rounded-lg border ${cls}`}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center text-sm font-bold text-slate-800">
              <Icon size={12} className={`mr-1.5 ${iconCls}`} />
              {item.issuer || item.country || '(미입력)'}
              {item.type && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{item.type}</span>}
              {category === 'visas' && item.status && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">{item.status}</span>}
              {isPermanent && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">{t('상시 (만료없음)', 'Permanent')}</span>}
            </div>
            {item.expiry && (
              <div className="text-[11px] text-slate-600 mt-0.5 flex items-center">
                <Calendar size={10} className="mr-1 text-slate-400" />
                {item.expiry}
                {state === 'expired' && <span className="ml-1.5 text-red-700 font-bold">({Math.abs(daysLeft)}일 경과)</span>}
                {state === 'warning' && <span className="ml-1.5 text-amber-700 font-bold">(D-{daysLeft})</span>}
              </div>
            )}
            {item.note && <div className="text-[11px] text-slate-500 italic mt-0.5">{item.note}</div>}
          </div>
          <button type="button" onClick={() => onDelete(engineer.id, category, item.id)} className="inline-flex items-center px-1.5 py-1 rounded bg-red-50 hover:bg-red-100 text-red-700 text-[10px] font-bold border border-red-200 transition-colors shrink-0" title={t('삭제', 'Delete')}>
            <Trash size={11} className="mr-0.5" />{t('삭제', 'Delete')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <ModalWrapper
      title={t('자격/만료 정보 관리', 'Certifications')}
      icon={<ShieldCheck size={18} />}
      color="indigo"
      onClose={onClose}
      onSubmit={(e) => { e.preventDefault(); onClose(); }}
      submitText={t('닫기', 'Close')}
      t={t}
    >
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <p className="text-xs text-slate-500 mb-1">{t('엔지니어', 'Engineer')}</p>
        <p className="text-sm font-bold text-slate-800">
          {engineer.name}
          {engineer.grade && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{engineer.grade}</span>}
          <span className="ml-2 text-[11px] text-slate-500 font-normal">{engineer.dept}</span>
        </p>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-slate-200">
        <button type="button" onClick={() => { setActiveTab('badges'); setError(''); }} className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'badges' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>
          <IdCard size={14} className="mr-1" />{t('출입증', 'Badges')} ({badges.length})
        </button>
        <button type="button" onClick={() => { setActiveTab('safety'); setError(''); }} className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'safety' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}>
          <ShieldCheck size={14} className="mr-1" />{t('안전교육', 'Safety')} ({safetyTrainings.length})
        </button>
        <button type="button" onClick={() => { setActiveTab('visas'); setError(''); }} className={`flex-1 py-2 text-xs font-bold border-b-2 transition-colors flex items-center justify-center ${activeTab === 'visas' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
          <Plane size={14} className="mr-1" />{t('비자', 'Visas')} ({visas.length})
        </button>
      </div>

      {/* 출입증 */}
      {activeTab === 'badges' && (
        <div className="space-y-3">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-start text-xs text-indigo-800">
            <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
            <span>{t('고객사·현장별 출입증을 여러 개 등록할 수 있습니다.', 'Register multiple badges per customer site.')}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('발급기관/종류', 'Issuer')}</label>
                <input list="badge-issuers" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={badgeForm.issuer} onChange={e => setBadgeForm({...badgeForm, issuer: e.target.value})} placeholder={t('예: A전자, SKON', 'e.g. customer name')} />
                <datalist id="badge-issuers">
                  {customerList.map(c => <option key={c} value={`${c} 출입증`} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('만료일', 'Expiry')}</label>
                <input type="date" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={badgeForm.expiry} onChange={e => setBadgeForm({...badgeForm, expiry: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('메모 (선택)', 'Note')}</label>
              <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={badgeForm.note} onChange={e => setBadgeForm({...badgeForm, note: e.target.value})} placeholder={t('예: 카드번호, 보안 등급', 'e.g. card no')} />
            </div>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button type="button" onClick={() => handleAdd('badges', badgeForm, setBadgeForm, { issuer: '', expiry: '', note: '' })} className="inline-flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg">
                <Plus size={12} className="mr-1" />{t('출입증 추가', 'Add')}
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {badges.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                {t('등록된 출입증이 없습니다.', 'No badges.')}
              </div>
            ) : badges.map(b => renderCertCard(b, 'badges'))}
          </div>
        </div>
      )}

      {/* 안전교육 */}
      {activeTab === 'safety' && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start text-xs text-emerald-800">
            <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
            <span>{t('회사별 안전교육 이수 내역을 여러 개 등록할 수 있습니다. 만료기간이 없는 교육(상시 이수)은 만료일을 비워두세요.', 'Register multiple safety training certificates. Leave expiry blank for permanent (no-expiry) trainings.')}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('교육명/발급기관', 'Training/Issuer')}</label>
                <input list="safety-issuers" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={safetyForm.issuer} onChange={e => setSafetyForm({...safetyForm, issuer: e.target.value})} placeholder={t('예: 기본 안전교육, A전자 협력사 안전', 'e.g. safety training')} />
                <datalist id="safety-issuers">
                  {customerList.map(c => <option key={c} value={`${c} 안전교육`} />)}
                  <option value="기본 안전교육" />
                  <option value="고소작업 교육" />
                  <option value="화학물질 취급 교육" />
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('만료일 (없으면 비워두세요)', 'Expiry (Optional)')}</label>
                <input type="date" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={safetyForm.expiry} onChange={e => setSafetyForm({...safetyForm, expiry: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('메모 (선택)', 'Note')}</label>
              <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={safetyForm.note} onChange={e => setSafetyForm({...safetyForm, note: e.target.value})} placeholder={t('예: 수료번호, 이수시간', 'e.g. cert no')} />
            </div>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button type="button" onClick={() => handleAdd('safetyTrainings', safetyForm, setSafetyForm, { issuer: '', expiry: '', note: '' })} className="inline-flex items-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg">
                <Plus size={12} className="mr-1" />{t('안전교육 추가', 'Add')}
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {safetyTrainings.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                {t('등록된 안전교육이 없습니다.', 'No safety training.')}
              </div>
            ) : safetyTrainings.map(s => renderCertCard(s, 'safetyTrainings'))}
          </div>
        </div>
      )}

      {/* 비자 */}
      {activeTab === 'visas' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start text-xs text-blue-800">
            <Info size={14} className="mr-1.5 shrink-0 mt-0.5" />
            <span>{t('국가별 비자를 여러 개 등록할 수 있습니다 (예: 미국 B1/B2, 베트남 ICR).', 'Register multiple visas per country.')}</span>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('국가', 'Country')}</label>
                <input className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={visaForm.country} onChange={e => setVisaForm({...visaForm, country: e.target.value})} placeholder={t('예: 미국, 베트남', 'e.g. USA, VN')} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('비자 종류', 'Type')}</label>
                <input className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={visaForm.type} onChange={e => setVisaForm({...visaForm, type: e.target.value})} placeholder="B1/B2, H-1B" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('상태', 'Status')}</label>
                <select className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={visaForm.status} onChange={e => setVisaForm({...visaForm, status: e.target.value})}>
                  {VISA_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('만료일', 'Expiry')}</label>
                <input type="date" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={visaForm.expiry} onChange={e => setVisaForm({...visaForm, expiry: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('메모 (선택)', 'Note')}</label>
                <input type="text" className="w-full text-sm p-2 border border-slate-300 rounded-lg" value={visaForm.note} onChange={e => setVisaForm({...visaForm, note: e.target.value})} />
              </div>
            </div>
            {error && <p className="text-xs font-bold text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button type="button" onClick={() => handleAdd('visas', visaForm, setVisaForm, { country: '', type: '', status: '취득', expiry: '', note: '' })} className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg">
                <Plus size={12} className="mr-1" />{t('비자 추가', 'Add')}
              </button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {visas.length === 0 ? (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
                {t('등록된 비자가 없습니다.', 'No visas.')}
              </div>
            ) : visas.map(v => renderCertCard(v, 'visas'))}
          </div>
        </div>
      )}
    </ModalWrapper>
  );
});

export default EngineerCertificatesModal;
