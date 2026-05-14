import React, { useState, useMemo, memo } from 'react';
import { Calendar, Users, MapPin, Plane, TrendingUp, UserCheck, Clock } from 'lucide-react';
import StatCard from '../common/StatCard';

// 날짜 → 기간 (YYYY-MM-DD)
const toDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d;
};
const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daysBetween = (a, b) => Math.max(1, Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1);

const getPresetRange = (preset, today = new Date()) => {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (preset === 'this_month') {
    const from = new Date(t.getFullYear(), t.getMonth(), 1);
    const to = new Date(t.getFullYear(), t.getMonth() + 1, 0);
    return { from: fmt(from), to: fmt(to) };
  }
  if (preset === 'this_quarter') {
    const q = Math.floor(t.getMonth() / 3);
    const from = new Date(t.getFullYear(), q * 3, 1);
    const to = new Date(t.getFullYear(), q * 3 + 3, 0);
    return { from: fmt(from), to: fmt(to) };
  }
  if (preset === 'this_year') {
    return { from: `${t.getFullYear()}-01-01`, to: `${t.getFullYear()}-12-31` };
  }
  return null;
};

const TripStatsSection = memo(function TripStatsSection({ engineers, projects, t }) {
  const today = useMemo(() => new Date(), []);
  const initialRange = useMemo(() => getPresetRange('this_month', today), [today]);
  const [preset, setPreset] = useState('this_month');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [perspective, setPerspective] = useState('all'); // 'all' | 'person' | 'site'

  const setPresetAndRange = (p) => {
    setPreset(p);
    if (p === 'custom') return;
    const r = getPresetRange(p, today);
    if (r) { setFrom(r.from); setTo(r.to); }
  };

  // 기간 내 출장 평탄화 (출발일 또는 복귀일이 기간과 겹치면 포함)
  const tripsInPeriod = useMemo(() => {
    const fromDate = toDate(from);
    const toDateE = toDate(to);
    if (!fromDate || !toDateE) return [];
    const fromMs = fromDate.getTime();
    const toMs = new Date(toDateE.getFullYear(), toDateE.getMonth(), toDateE.getDate(), 23, 59, 59).getTime();
    const list = [];
    (projects || []).forEach(p => {
      (p.trips || []).forEach(tr => {
        const dep = toDate(tr.departureDate);
        const ret = toDate(tr.returnDate) || dep;
        if (!dep) return;
        const depMs = dep.getTime();
        const retMs = (ret || dep).getTime();
        // 기간과 겹침
        if (retMs < fromMs || depMs > toMs) return;
        list.push({
          ...tr,
          projectId: p.id,
          projectName: p.name,
          site: tr.site || p.site || '',
          _depMs: depMs,
          _retMs: retMs,
          _days: daysBetween(dep, ret || dep)
        });
      });
    });
    list.sort((a, b) => a._depMs - b._depMs);
    return list;
  }, [projects, from, to]);

  // 모든 참가자 (주담당 + 동행자) 평탄화 — 통계 집계용
  const participations = useMemo(() => {
    const rows = [];
    tripsInPeriod.forEach(tr => {
      const mainName = tr.engineerName || (engineers.find(e => e.id === tr.engineerId) || {}).name || '';
      if (mainName) {
        rows.push({ tripId: tr.id, engineerId: tr.engineerId, name: mainName, role: 'main', site: tr.site, projectName: tr.projectName, days: tr._days, departureDate: tr.departureDate, returnDate: tr.returnDate, companions: tr.companions || [] });
      }
      (tr.companions || []).forEach(c => {
        if (!c || !c.name) return;
        rows.push({ tripId: tr.id, engineerId: c.id, name: c.name, role: 'companion', site: tr.site, projectName: tr.projectName, days: tr._days, departureDate: tr.departureDate, returnDate: tr.returnDate, companions: [{ id: tr.engineerId, name: mainName }, ...(tr.companions || []).filter(x => x.id !== c.id)] });
      });
    });
    return rows;
  }, [tripsInPeriod, engineers]);

  // 인력별 집계
  const byEngineer = useMemo(() => {
    const map = new Map();
    participations.forEach(r => {
      const key = r.engineerId || r.name;
      if (!map.has(key)) {
        map.set(key, { name: r.name, trips: 0, days: 0, sites: new Map(), companions: new Map() });
      }
      const agg = map.get(key);
      agg.trips += 1;
      agg.days += r.days;
      const site = r.site || t('미지정', 'Unspecified');
      agg.sites.set(site, (agg.sites.get(site) || 0) + 1);
      (r.companions || []).forEach(c => {
        if (!c.name) return;
        agg.companions.set(c.name, (agg.companions.get(c.name) || 0) + 1);
      });
    });
    const arr = Array.from(map.values()).map(a => ({
      ...a,
      topSite: [...a.sites.entries()].sort((x, y) => y[1] - x[1])[0],
      topCompanion: [...a.companions.entries()].sort((x, y) => y[1] - x[1])[0]
    }));
    arr.sort((a, b) => b.days - a.days || b.trips - a.trips);
    return arr;
  }, [participations, t]);

  // 사이트별 집계
  const bySite = useMemo(() => {
    const map = new Map();
    participations.forEach(r => {
      const site = r.site || t('미지정', 'Unspecified');
      if (!map.has(site)) map.set(site, { site, count: 0, names: new Map(), totalDays: 0 });
      const agg = map.get(site);
      agg.count += 1;
      agg.totalDays += r.days;
      agg.names.set(r.name, (agg.names.get(r.name) || 0) + 1);
    });
    const arr = Array.from(map.values()).map(a => ({
      ...a,
      uniqueCount: a.names.size,
      nameList: [...a.names.entries()].sort((x, y) => y[1] - x[1]).map(([name, n]) => `${name}${n > 1 ? `(×${n})` : ''}`)
    }));
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [participations, t]);

  // 요약 수치
  const summary = useMemo(() => {
    const totalTrips = tripsInPeriod.length;
    const totalParticipations = participations.length;
    const totalDays = participations.reduce((sum, r) => sum + r.days, 0);
    const uniquePeople = new Set(participations.map(r => r.engineerId || r.name)).size;
    const topPerson = byEngineer[0];
    const topSite = bySite[0];
    return { totalTrips, totalParticipations, totalDays, uniquePeople, topPerson, topSite };
  }, [tripsInPeriod, participations, byEngineer, bySite]);

  return (
    <div className="space-y-4">
      {/* 기간/관점 필터 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('기간 프리셋', 'Preset')}</label>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden text-xs">
              {[
                { v: 'this_month',   ko: '이번 달', en: 'This Month' },
                { v: 'this_quarter', ko: '이번 분기', en: 'This Quarter' },
                { v: 'this_year',    ko: '올해', en: 'This Year' },
                { v: 'custom',       ko: '직접 지정', en: 'Custom' }
              ].map(opt => (
                <button key={opt.v} type="button" onClick={() => setPresetAndRange(opt.v)} className={`px-3 py-1.5 font-bold ${preset === opt.v ? 'bg-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {t(opt.ko, opt.en)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('시작', 'From')}</label>
            <input type="date" max="9999-12-31" value={from} onChange={e => { setPreset('custom'); setFrom(e.target.value); }} className="text-xs p-1.5 border border-slate-300 rounded-md" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('종료', 'To')}</label>
            <input type="date" max="9999-12-31" value={to} onChange={e => { setPreset('custom'); setTo(e.target.value); }} className="text-xs p-1.5 border border-slate-300 rounded-md" />
          </div>
          <div className="ml-auto">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">{t('관점', 'View')}</label>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white overflow-hidden text-xs">
              {[
                { v: 'all',    ko: '전체 목록', en: 'All Trips' },
                { v: 'person', ko: '인력별',    en: 'By Person' },
                { v: 'site',   ko: '사이트별',  en: 'By Site' }
              ].map(opt => (
                <button key={opt.v} type="button" onClick={() => setPerspective(opt.v)} className={`px-3 py-1.5 font-bold ${perspective === opt.v ? 'bg-purple-600 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                  {t(opt.ko, opt.en)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title={t('총 출장 건수', 'Trips')} value={summary.totalTrips} icon={<Plane size={22} className="text-purple-500" />} />
        <StatCard title={t('연인원', 'Participations')} value={summary.totalParticipations} icon={<Users size={22} className="text-blue-500" />} />
        <StatCard title={t('연인일', 'Person-Days')} value={summary.totalDays} icon={<Clock size={22} className="text-indigo-500" />} />
        <StatCard title={t('최다 출장자', 'Top Person')} value={summary.topPerson ? summary.topPerson.name : '-'} icon={<UserCheck size={22} className="text-emerald-500" />} />
        <StatCard title={t('최다 사이트', 'Top Site')} value={summary.topSite ? summary.topSite.site : '-'} icon={<MapPin size={22} className="text-amber-500" />} />
      </div>

      {/* 상세 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center">
            <TrendingUp size={14} className="mr-1.5 text-purple-500" />
            {perspective === 'all' && t('기간 내 전체 출장 목록', 'All Trips in Period')}
            {perspective === 'person' && t('인력별 출장 통계', 'By Person')}
            {perspective === 'site' && t('사이트별 출장 통계', 'By Site')}
          </h3>
          <span className="text-[11px] text-slate-400">{from} ~ {to}</span>
        </div>

        {tripsInPeriod.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400 italic">
            <Calendar size={32} className="mx-auto mb-2 text-slate-300" />
            {t('해당 기간에 출장이 없습니다.', 'No trips in this period.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {perspective === 'all' && (
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('출발', 'Departure')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('복귀', 'Return')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('일수', 'Days')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('주담당', 'Main')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('동행자', 'Companions')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('사이트', 'Site')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('프로젝트', 'Project')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tripsInPeriod.map(tr => (
                    <tr key={tr.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono">{tr.departureDate}</td>
                      <td className="px-3 py-2 font-mono">{tr.returnDate}</td>
                      <td className="px-3 py-2"><span className="font-bold text-purple-700">{tr._days}</span></td>
                      <td className="px-3 py-2 font-bold text-slate-800">{tr.engineerName || '-'}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {Array.isArray(tr.companions) && tr.companions.length > 0
                          ? tr.companions.map(c => c.name).filter(Boolean).join(', ')
                          : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{tr.site || '-'}</td>
                      <td className="px-3 py-2 text-slate-500">{tr.projectName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {perspective === 'person' && (
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('엔지니어', 'Engineer')}</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">{t('출장 횟수', 'Trips')}</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">{t('총 일수', 'Days')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('자주 간 사이트', 'Top Site')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('자주 동행', 'Top Companion')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byEngineer.map((row) => (
                    <tr key={row.name} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800">{row.name}</td>
                      <td className="px-3 py-2 text-right">{row.trips}</td>
                      <td className="px-3 py-2 text-right"><span className="font-bold text-purple-700">{row.days}</span></td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.topSite ? `${row.topSite[0]} (${row.topSite[1]})` : <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-3 py-2 text-slate-600">
                        {row.topCompanion ? `${row.topCompanion[0]} (${row.topCompanion[1]}회)` : <span className="text-slate-300">-</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {perspective === 'site' && (
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('사이트', 'Site')}</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">{t('연인원', 'Participations')}</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">{t('총 일수', 'Days')}</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-500 uppercase">{t('실인원', 'Unique')}</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-500 uppercase">{t('다녀간 사람', 'Visitors')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bySite.map((row) => (
                    <tr key={row.site} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-bold text-slate-800">{row.site}</td>
                      <td className="px-3 py-2 text-right">{row.count}</td>
                      <td className="px-3 py-2 text-right"><span className="font-bold text-purple-700">{row.totalDays}</span></td>
                      <td className="px-3 py-2 text-right">{row.uniqueCount}</td>
                      <td className="px-3 py-2 text-slate-600">{row.nameList.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default TripStatsSection;
