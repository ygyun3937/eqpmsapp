import React, { memo } from 'react';
import { Users, HardHat, Building, UserCircle, User, MapPin, Edit, Trash, AlertTriangle, XCircle, Download, Plane, ShieldAlert, Calendar, Home, IdCard, ShieldCheck, CheckCircle } from 'lucide-react';
import StatCard from '../common/StatCard';
import { exportToExcel } from '../../utils/export';
import { getCurrentTrip } from '../../utils/calc';

const ResourceListView = memo(function ResourceListView({ engineers, projects, getStatusColor, TODAY, onAddClick, onEditClick, onManageCertificates, onDeleteClick, currentUser, t }) {
  const checkExpiry = (dateStr) => {
    if (!dateStr) return { state: 'none', daysLeft: null };
    const exp = new Date(dateStr);
    if (isNaN(exp)) return { state: 'none', daysLeft: null };
    const diff = Math.floor((exp - TODAY) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { state: 'expired', daysLeft: diff };
    if (diff <= 30) return { state: 'warning', daysLeft: diff };
    return { state: 'ok', daysLeft: diff };
  };

  // 엔지니어의 자격 상태 집계
  const summarizeCerts = (eng) => {
    const cats = [
      { key: 'badges', label: t('출입증', 'Badges') },
      { key: 'safetyTrainings', label: t('안전교육', 'Safety') },
      { key: 'visas', label: t('비자', 'Visas') }
    ];
    const issues = []; // 만료/임박만
    let totalCount = 0;
    let okCount = 0;
    cats.forEach(cat => {
      const list = eng[cat.key] || [];
      list.forEach(item => {
        totalCount++;
        const status = checkExpiry(item.expiry);
        if (status.state === 'expired' || status.state === 'warning') {
          issues.push({ category: cat.label, catKey: cat.key, item, status });
        } else if (status.state === 'ok') {
          okCount++;
        }
        // 비자: 상태가 '필요' 또는 '만료'면 이슈로
        if (cat.key === 'visas' && (item.status === '필요' || item.status === '만료')) {
          if (!issues.find(x => x.item.id === item.id)) {
            issues.push({ category: cat.label, catKey: cat.key, item, status: { state: 'expired' } });
          }
        }
      });
    });
    return { issues, totalCount, okCount };
  };

  const hasIssue = (eng) => summarizeCerts(eng).issues.length > 0;
  const warningCount = engineers.filter(hasIssue).length;

  const projectMap = {};
  (projects || []).forEach(p => { projectMap[p.id] = p; });

  const getAssignedProjects = (eng) => {
    if (Array.isArray(eng.assignedProjectIds) && eng.assignedProjectIds.length > 0) {
      return eng.assignedProjectIds.map(id => projectMap[id]).filter(p => p && p.status !== '완료');
    }
    return (projects || []).filter(p => p.manager && eng.name && p.manager.includes(eng.name.split(' ')[0]) && p.status !== '완료');
  };

  const handleExport = () => {
    const rows = engineers.map(e => {
      const trip = getCurrentTrip(e, projects);
      const tripText = !trip ? '-'
        : trip.state === 'onsite' ? `현장 파견 (${trip.site || '-'}, ~${trip.returnDate}, 복귀 ${trip.daysLeft}일 전)`
        : `출장 예정 (${trip.site || '-'}, ${trip.departureDate}, 출발 ${trip.daysUntil}일 전)`;
      const assigned = getAssignedProjects(e).map(p => p.name).join(' / ');
      const fmtCerts = (list) => (list || []).map(c => `${c.issuer || c.country || ''}${c.type ? `(${c.type})` : ''}${c.expiry ? ` ~${c.expiry}` : ''}${c.status ? ` [${c.status}]` : ''}`).join(' / ') || '-';
      return {
        id: e.id, name: e.name, grade: e.grade || '-', dept: e.dept,
        tripStatus: tripText, manualStatus: e.status,
        currentSite: e.currentSite || '-',
        badges: fmtCerts(e.badges),
        safetyTrainings: fmtCerts(e.safetyTrainings),
        visas: fmtCerts(e.visas),
        assignedProjects: assigned || '-'
      };
    });
    exportToExcel('엔지니어_리스트', [{
      name: '엔지니어 리스트',
      rows: rows,
      columns: [
        { header: 'ID', key: 'id' }, { header: '이름', key: 'name' }, { header: '직급', key: 'grade' },
        { header: '부서', key: 'dept' },
        { header: '출장 상태', key: 'tripStatus' }, { header: '수동 상태', key: 'manualStatus' },
        { header: '현재 위치', key: 'currentSite' },
        { header: '출입증', key: 'badges' }, { header: '안전교육', key: 'safetyTrainings' }, { header: '비자', key: 'visas' },
        { header: '배정 프로젝트', key: 'assignedProjects' }
      ]
    }]);
  };

  // 비자 통계
  const visaIssueCount = engineers.filter(e => (e.visas || []).some(v => v.status === '필요' || v.status === '만료')).length;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold text-slate-800">{t('인력 및 리소스 관리', 'Resource Management')}</h1></div>
        <div className="flex items-center space-x-3">
          <button onClick={handleExport} className="flex items-center bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors shadow-sm">
            <Download size={16} className="mr-1.5" /> Excel
          </button>
          {currentUser.role === 'ADMIN' && (
            <button onClick={onAddClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center transition-colors"><User className="mr-2" size={16}/> {t('엔지니어 추가', 'Add Engineer')}</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title={t('전체 엔지니어', 'Total')} value={engineers.length} icon={<Users size={22} className="text-blue-500"/>} />
        <StatCard title={t('현장 파견 중', 'On Trip')} value={engineers.filter(e => { const tr = getCurrentTrip(e, projects); return tr && tr.state === 'onsite'; }).length} icon={<HardHat size={22} className="text-purple-500"/>} />
        <StatCard title={t('출장 예정', 'Scheduled')} value={engineers.filter(e => { const tr = getCurrentTrip(e, projects); return tr && tr.state === 'scheduled'; }).length} icon={<Calendar size={22} className="text-blue-500"/>} color="border-blue-200 bg-blue-50" />
        <StatCard title={t('자격 만료/임박', 'Cert. Issues')} value={warningCount} icon={<UserCircle size={22} className="text-red-500"/>} color={warningCount > 0 ? 'border-red-200 bg-red-50' : ''} />
        <StatCard title={t('비자 이슈', 'Visa Issues')} value={visaIssueCount} icon={<ShieldAlert size={22} className="text-amber-500"/>} color={visaIssueCount > 0 ? 'border-amber-200 bg-amber-50' : ''} />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('이름 / 소속', 'Name/Dept')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('출장 상태', 'Trip Status')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('진행중인 배정 프로젝트', 'Assigned Projects')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('자격/만료 (클릭하여 관리)', 'Certifications')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('관리', 'Manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {engineers.map((eng) => {
              const assignedPrjs = getAssignedProjects(eng);
              const trip = getCurrentTrip(eng, projects);
              const certs = summarizeCerts(eng);
              const canManageCerts = currentUser.role === 'ADMIN' || currentUser.role === 'PM';

              const manualCls = eng.status === '현장 파견' ? 'bg-purple-50 border-purple-200 text-purple-700'
                : eng.status === '본사 복귀' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-50 border-slate-200 text-slate-600';

              return (
                <tr key={eng.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mr-3">{eng.name.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 flex items-center">
                          {eng.name}
                          {eng.grade && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">{eng.grade}</span>}
                        </div>
                        <div className="text-xs text-slate-500">{eng.dept || '-'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col items-start gap-1">
                      {trip ? (
                        <>
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded border ${trip.state === 'onsite' ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                            {trip.state === 'onsite' ? <HardHat size={11} className="mr-1" /> : <Calendar size={11} className="mr-1" />}
                            {trip.label}
                          </span>
                          <span className="text-[10px] text-slate-600 flex items-center">
                            <MapPin size={10} className="mr-1 text-slate-400" />
                            {trip.site} · {trip.state === 'onsite' ? `~${trip.returnDate} (${t(`복귀 ${trip.daysLeft}일 전`, `Return in ${trip.daysLeft}d`)})` : `${trip.departureDate}부터 (${t(`출발 ${trip.daysUntil}일 전`, `Depart in ${trip.daysUntil}d`)})`}
                          </span>
                          <span className="text-[9px] text-slate-400">{trip.projectName}</span>
                        </>
                      ) : (
                        <>
                          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-1 rounded border ${manualCls}`}>
                            <Home size={11} className="mr-1" />{eng.status || '본사 대기'}
                          </span>
                          {eng.currentSite && (
                            <span className="text-[10px] text-slate-500 flex items-center"><MapPin size={10} className="mr-1 text-slate-400" />{eng.currentSite}</span>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {assignedPrjs.length === 0 ? (
                      <span className="text-xs text-slate-400">-</span>
                    ) : (
                      <div className={`space-y-1 ${assignedPrjs.length > 3 ? 'max-h-28 overflow-y-auto pr-1' : ''}`}>
                        {assignedPrjs.map(p => {
                          const fmt = (v) => v ? String(v).split('T')[0] : '-';
                          return (
                            <div key={p.id} className="text-xs bg-blue-50 border border-blue-100 px-2 py-1 rounded flex items-center gap-2 min-w-0">
                              <span className="font-bold text-blue-700 truncate">{p.name}</span>
                              <span className="text-[10px] text-slate-500 font-normal whitespace-nowrap shrink-0">{fmt(p.startDate)} ~ {fmt(p.dueDate)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => canManageCerts && onManageCertificates && onManageCertificates(eng)}
                      disabled={!canManageCerts}
                      className={`text-left p-2 -m-2 rounded-lg transition-colors w-full ${canManageCerts ? 'cursor-pointer hover:bg-indigo-50' : 'cursor-default'}`}
                      title={canManageCerts ? t('클릭하여 자격 정보 관리', 'Click to manage') : ''}
                    >
                      {certs.totalCount === 0 ? (
                        <div className="flex items-center text-xs text-slate-400">
                          <ShieldCheck size={14} className="mr-1.5" />
                          {t('등록된 자격 없음 (클릭하여 추가)', 'No certs (click to add)')}
                        </div>
                      ) : certs.issues.length === 0 ? (
                        <div className="flex items-center text-xs text-emerald-700">
                          <CheckCircle size={14} className="mr-1.5 text-emerald-500" />
                          <span className="font-bold">{t(`정상 ${certs.totalCount}건`, `${certs.totalCount} OK`)}</span>
                          {canManageCerts && <Edit size={10} className="ml-1.5 text-slate-300" />}
                        </div>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {certs.issues.map(issue => {
                            const isExpired = issue.status.state === 'expired';
                            const cls = isExpired ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-700';
                            const Icon = isExpired ? XCircle : AlertTriangle;
                            const dayLabel = issue.status.daysLeft != null
                              ? (isExpired ? `${Math.abs(issue.status.daysLeft)}일 경과` : `D-${issue.status.daysLeft}`)
                              : '';
                            return (
                              <div key={`${issue.catKey}-${issue.item.id}`} className={`text-[11px] px-2 py-1 rounded border flex items-center gap-1.5 ${cls}`}>
                                <Icon size={11} className="shrink-0" />
                                <span className="font-bold truncate">{issue.category}</span>
                                <span className="truncate">{issue.item.issuer || issue.item.country || ''}{issue.item.type ? `/${issue.item.type}` : ''}{issue.item.status && issue.catKey === 'visas' ? ` (${issue.item.status})` : ''}</span>
                                {dayLabel && <span className="ml-auto font-bold shrink-0">{dayLabel}</span>}
                              </div>
                            );
                          })}
                          {certs.okCount > 0 && (
                            <div className="text-[10px] text-slate-500 px-2 mt-1">
                              + {t(`정상 ${certs.okCount}건`, `${certs.okCount} OK`)}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {currentUser.role === 'ADMIN' && (<><button onClick={() => onEditClick(eng)} className="text-slate-400 hover:text-indigo-600 transition-colors p-2"><Edit size={18} /></button><button onClick={() => onDeleteClick(eng)} className="text-slate-400 hover:text-red-600 transition-colors p-2"><Trash size={18} /></button></>)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default ResourceListView;
