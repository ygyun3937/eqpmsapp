import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, Kanban, Building, MessageSquare, Search, User, CheckCircle, 
  AlertCircle, Clock, Plus, X, ListTodo, Filter, CalendarDays, AlignJustify, 
  MessageCircle, Send, Monitor, Cpu, Edit, HardDrive, GitCommit, FileText, Tag, 
  Download, Copy, Trash, ChevronRight, ChevronDown, ChevronUp, Camera, 
  CheckSquare, AlertTriangle, Users, Link as LinkIcon, HardHat, UserCircle, MapPin, 
  Image as ImageIcon, Info, PenTool, Images, Smartphone, XCircle, ShieldCheck,
  Wrench, Package, ShoppingCart, WifiOff, Database, PieChart, BarChart3, Globe, LogOut
} from 'lucide-react';

if (typeof document !== 'undefined' && !document.getElementById('tailwind-script')) {
  const script = document.createElement('script');
  script.id = 'tailwind-script';
  script.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(script);
}

// ==============================================
// 1. 전역 상수 및 더미 데이터
// ==============================================

const PROJECT_PHASES = ['영업/수주', '설계', '구매/자재', '제조/조립', '출하', '현장 셋업', '완료'];
const ISSUE_PHASES = ['이슈 확인', '조치 진행 중', '조치 완료'];
const PART_PHASES = ['청구', '발주', '입고', '교체완료'];
const DOMAINS = ['반도체', '디스플레이', '2차전지 사이클러', '2차전지 EOL'];

const MOCK_USERS = [
  { id: 'admin', pw: '1234', name: '본사 관리자', role: 'ADMIN', dept: '운영팀' },
  { id: 'pm', pw: '1234', name: '김철수 PM', role: 'PM', dept: '제조기술팀' },
  { id: 'eng', pw: '1234', name: '이셋업 선임', role: 'ENGINEER', dept: 'CS팀' },
  { id: 'client', pw: '1234', name: 'A전자 담당자', role: 'CUSTOMER', customer: 'A전자' },
];

const DOMAIN_TASKS = {
  '반도체': [
    { id: 1, name: '장비 반입, 도킹 및 Leveling', isCompleted: false, delayReason: '' },
    { id: 2, name: '유틸리티 (PCW, Power, Gas, Vacuum) 훅업', isCompleted: false, delayReason: '' },
    { id: 3, name: '전원 인가 및 I/O, Interlock 체크', isCompleted: false, delayReason: '' },
    { id: 4, name: '소프트웨어 셋업 및 SECS/GEM 통신 연동', isCompleted: false, delayReason: '' },
    { id: 5, name: '웨이퍼 로봇 티칭 및 이송 테스트', isCompleted: false, delayReason: '' },
    { id: 6, name: '공정(Process) 테스트 및 수율 확보', isCompleted: false, delayReason: '' },
    { id: 7, name: '최종 검수 (Buy-off) 및 인수인계', isCompleted: false, delayReason: '' },
  ],
  '디스플레이': [
    { id: 1, name: '챔버/모듈 반입 및 프레임 조립', isCompleted: false, delayReason: '' },
    { id: 2, name: '유틸리티 (Power, PCW, CDA) 훅업', isCompleted: false, delayReason: '' },
    { id: 3, name: '전원 인가 및 System Alarm Clear', isCompleted: false, delayReason: '' },
    { id: 4, name: '글라스 이송 로봇 및 스테이지 얼라인먼트', isCompleted: false, delayReason: '' },
    { id: 5, name: '진공/플라즈마 테스트 및 Tact Time 최적화', isCompleted: false, delayReason: '' },
    { id: 6, name: '최종 양산 평가 (Buy-off) 및 인수인계', isCompleted: false, delayReason: '' },
  ],
  '2차전지 사이클러': [
    { id: 1, name: '랙(Rack) 및 채널 유닛 반입/조립', isCompleted: false, delayReason: '' },
    { id: 2, name: '대전류 케이블 및 통신 케이블 포설', isCompleted: false, delayReason: '' },
    { id: 3, name: '전원 인가 및 BMS 네트워크 훅업', isCompleted: false, delayReason: '' },
    { id: 4, name: '채널별 전압/전류(V/I) 캘리브레이션', isCompleted: false, delayReason: '' },
    { id: 5, name: '충방전 프로파일 구동 및 발열 테스트', isCompleted: false, delayReason: '' },
    { id: 6, name: '화재/온도 보호 인터락 동작 테스트', isCompleted: false, delayReason: '' },
    { id: 7, name: '최종 검수 (Buy-off) 및 고객 인수인계', isCompleted: false, delayReason: '' },
  ],
  '2차전지 EOL': [
    { id: 1, name: '라인 반입 및 컨베이어/스토퍼 도킹', isCompleted: false, delayReason: '' },
    { id: 2, name: '전원, 공압 훅업 및 I/O 테스트', isCompleted: false, delayReason: '' },
    { id: 3, name: '계측기 (IR/OCV, 헬륨 리크 디텍터) 셋업', isCompleted: false, delayReason: '' },
    { id: 4, name: '바코드/비전 스캐너 연동 및 상위 MES 통신', isCompleted: false, delayReason: '' },
    { id: 5, name: '마스터 샘플 검증 (Gauge R&R, Cpk 확보)', isCompleted: false, delayReason: '' },
    { id: 6, name: '최종 검수 (Buy-off) 및 양산 이관', isCompleted: false, delayReason: '' },
  ],
};

const DOMAIN_CHECKLIST = {
  '반도체': [
    { category: '기구/반입', task: '장비 Leveling (±0.05도) 및 내진 고정 확인', status: 'Pending', note: '' },
    { category: '유틸리티', task: 'PCW 수압, Leak 여부 및 Vacuum 도달 압력 확인', status: 'Pending', note: '' },
    { category: '소프트웨어', task: '초기 부팅 Error 및 SECS/GEM Online 상태', status: 'Pending', note: '' },
    { category: '로봇/이송', task: 'Wafer 핸들링 간섭 및 긁힘(Scratch) 여부', status: 'Pending', note: '' },
    { category: '안전/환경', task: 'EMO 동작 및 Door Interlock, 파티클 기준치 달성', status: 'Pending', note: '' },
  ],
  '디스플레이': [
    { category: '기구/반입', task: '모듈간 도킹 단차 및 프레임 Leveling 확인', status: 'Pending', note: '' },
    { category: '유틸리티', task: 'CDA 압력, PCW 누수 및 Main Power 상 확인', status: 'Pending', note: '' },
    { category: '제어/로봇', task: 'Glass 이송 스테이지 Alignment 및 간섭 확인', status: 'Pending', note: '' },
    { category: '공정', task: '진공 도달 시간 및 플라즈마 방전 안정성 확인', status: 'Pending', note: '' },
    { category: '안전/환경', task: '안전 펜스 센서, EMO 및 배기(Exhaust) 정상 작동', status: 'Pending', note: '' },
  ],
  '2차전지 사이클러': [
    { category: '기구/전장', task: '랙(Rack) 하중 고정 및 절연/접지 저항 규격 확인', status: 'Pending', note: '' },
    { category: '전장', task: '채널별 대전류 단자 체결 토크 및 케이블 마감', status: 'Pending', note: '' },
    { category: '소프트웨어', task: '채널 인식 상태 및 BMS 연동 통신 에러 확인', status: 'Pending', note: '' },
    { category: '계측/공정', task: 'V/I Calibration 후 편차 기준치 이내 확인', status: 'Pending', note: '' },
    { category: '안전/환경', task: '과전압/과전류 알람 및 화재 감지/소화 연동 테스트', status: 'Pending', note: '' },
  ],
  '2차전지 EOL': [
    { category: '기구/반입', task: '컨베이어 수평, 롤러 상태 및 스토퍼 위치 확인', status: 'Pending', note: '' },
    { category: '전장/유틸', task: 'I/O 센서 동작, 공압 실린더 구동 및 Power 확인', status: 'Pending', note: '' },
    { category: '계측', task: 'IR/OCV 측정 영점 세팅 및 리크 디텍터 감도 확인', status: 'Pending', note: '' },
    { category: '통신/제어', task: '바코드 리딩률, PLC 및 MES(상위) 데이터 매핑', status: 'Pending', note: '' },
    { category: '안전/환경', task: 'Area Sensor(광센서) 동작 및 EMO 비상정지 확인', status: 'Pending', note: '' },
  ],
};


// ==============================================
// 2. 전역 유틸리티 함수
// ==============================================

const TODAY = new Date('2026-04-03');

const getStatusColor = (status) => {
  if (['완료', '조치 완료', 'Low', '교체완료', '본사 복귀'].includes(status)) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (['진행중', '조치 진행 중', '발주'].includes(status)) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (['마감임박', '이슈 확인', 'Medium', '입고'].includes(status)) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (['High', '청구'].includes(status)) return 'bg-red-100 text-red-800 border-red-200';
  if (['현장 파견'].includes(status)) return 'bg-purple-100 text-purple-800 border-purple-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

const calcExp = (startDate, dueDate) => {
  const start = new Date(startDate);
  const due = new Date(dueDate);
  if (TODAY < start) return 0;
  if (TODAY > due) return 100;
  return Math.round(((TODAY.getTime() - start.getTime()) / (due.getTime() - start.getTime())) * 100);
};

const calcAct = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.isCompleted).length / tasks.length) * 100);
};

const downloadICS = (prj) => {
  const start = prj.startDate.replace(/-/g, '') + 'T000000Z';
  const due = prj.dueDate.replace(/-/g, '') + 'T235959Z';
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:[Setup] ${prj.name}\nDTSTART:${start}\nDTEND:${due}\nLOCATION:${prj.site}\nDESCRIPTION:Customer: ${prj.customer} \\nManager: ${prj.manager}\nEND:VEVENT\nEND:VCALENDAR`;
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${prj.name}_schedule.ics`;
  a.click();
};

const openGoogleCalendar = (prj) => {
  const start = prj.startDate.replace(/-/g, '') + 'T000000Z';
  const due = prj.dueDate.replace(/-/g, '') + 'T235959Z';
  const text = encodeURIComponent(`[Setup] ${prj.name}`);
  const details = encodeURIComponent(`Customer: ${prj.customer}\nManager: ${prj.manager}`);
  const location = encodeURIComponent(prj.site);
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${due}&details=${details}&location=${location}`, '_blank');
};

const generatePDF = (project, projectIssues) => {
  const printWin = window.open('', '', 'width=800,height=900');
  const html = `
    <html>
      <head>
        <title>Buy-off Report: ${project.name}</title>
        <style>
          body{font-family:'Segoe UI', sans-serif; padding:40px; color:#333; line-height:1.5;} 
          table{width:100%; border-collapse:collapse; margin-top:20px; font-size:14px;} 
          th,td{border:1px solid #ddd; padding:10px; text-align:left;} 
          th{background:#f8fafc; color:#1e293b;}
          h1{color:#1e40af; border-bottom:2px solid #e2e8f0; padding-bottom:10px;}
          .header-box{background:#f1f5f9; padding:20px; border-radius:8px; margin-bottom:30px;}
          .signature-box{border:1px dashed #cbd5e1; padding:20px; width:300px; text-align:center; float:right;}
        </style>
      </head>
      <body>
        <h1>Project Final Buy-off Report</h1>
        <div class="header-box">
          <h2>${project.name} (${project.domain})</h2>
          <p><strong>Customer:</strong> ${project.customer}</p>
          <p><strong>Site Location:</strong> ${project.site}</p>
          <p><strong>Setup Period:</strong> ${project.startDate} ~ ${project.signOff.date}</p>
          <p><strong>Manager:</strong> ${project.manager}</p>
          <p><strong>Version:</strong> HW: ${project.hwVersion||'-'} | SW: ${project.swVersion||'-'} | FW: ${project.fwVersion||'-'}</p>
        </div>
        
        <h3>Checklist Results</h3>
        <table>
          <tr><th>Category</th><th>Task</th><th>Status</th><th>Note</th></tr>
          ${project.checklist.map(c => `<tr><td>${c.category}</td><td>${c.task}</td><td><strong>${c.status}</strong></td><td>${c.note||'-'}</td></tr>`).join('')}
        </table>
        
        <h3 style="margin-top:40px;">Resolved Issues History</h3>
        <table>
          <tr><th>Issue Title</th><th>Severity</th><th>Author</th><th>Date</th></tr>
          ${projectIssues.length > 0 ? projectIssues.map(i => `<tr><td>${i.title}</td><td>${i.severity}</td><td>${i.author}</td><td>${i.date}</td></tr>`).join('') : '<tr><td colspan="4">No issues recorded.</td></tr>'}
        </table>

        <div style="margin-top:50px;">
          <div class="signature-box">
            <p><strong>Approved by (Customer):</strong> ${project.signOff.customerName}</p>
            <img src="${project.signOff.signatureData}" style="max-height:80px; margin:10px 0;"/>
            <p><strong>Date:</strong> ${project.signOff.date}</p>
          </div>
        </div>
      </body>
    </html>
  `;
  printWin.document.write(html);
  printWin.document.close();
  setTimeout(() => { printWin.print(); }, 500); 
};


// ==============================================
// 3. 공통 UI 요소 컴포넌트
// ==============================================

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
      {icon}<span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function StatCard({ title, value, icon, color = 'bg-white border-slate-200' }) {
  return (
    <div className={`rounded-xl border shadow-sm p-6 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-slate-600 text-sm font-bold">{title}</h3>
        <div className="p-2 bg-white/50 rounded-lg">{icon}</div>
      </div>
      <div className="text-3xl font-black text-slate-800">{value}</div>
    </div>
  );
}

function SimpleDonutChart({ data, t }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentOffset = 0;

  if (total === 0) {
    return <div className="h-32 flex items-center justify-center text-sm text-slate-400">{t('데이터가 없습니다.', 'No Data')}</div>;
  }

  return (
    <div className="flex items-center justify-center h-full w-full">
      <svg viewBox="0 0 36 36" className="w-32 h-32 transform -rotate-90">
        <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
        {data.map((d, i) => {
          if (d.value === 0) return null;
          const percentage = (d.value / total) * 100;
          const strokeDasharray = `${percentage} ${100 - percentage}`;
          const offset = 100 - currentOffset;
          currentOffset += percentage;
          return (
            <circle key={i} cx="18" cy="18" r="15.915" fill="transparent" stroke={d.svgColor} strokeWidth="4" strokeDasharray={strokeDasharray} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
          );
        })}
      </svg>
      <div className="ml-6 space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center text-xs">
            <span className={`w-3 h-3 rounded-full mr-2 ${d.color}`}></span>
            <span className="text-slate-600 w-12">{d.label}</span>
            <span className="font-bold text-slate-800">{d.value}{t('건', '')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleBarChart({ data }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end h-36 space-x-4 w-full px-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group h-full">
          <div className="h-6 w-full flex items-end justify-center pb-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold text-slate-700">{d.value}</div>
          <div className="w-full flex-1 flex items-end">
            <div className={`w-full ${d.color} rounded-t-md transition-all duration-700 hover:opacity-80`} style={{ height: `${(d.value / max) * 100}%`, minHeight: '4px' }}></div>
          </div>
          <div className="text-[10px] text-slate-500 mt-2 h-4 truncate w-full text-center shrink-0 leading-none">{d.label}</div>
        </div>
      ))}
    </div>
  );
}

function ProjectPipelineStepper({ currentPhase, onUpdatePhase, projectId, role }) {
  return (
    <div className="flex items-center flex-wrap gap-y-1 mt-3">
      {PROJECT_PHASES.map((step, idx) => (
        <div key={step} className="flex items-center">
          <button 
            disabled={role === 'CUSTOMER'} 
            onClick={(e) => { e.stopPropagation(); onUpdatePhase(projectId, idx); }} 
            className={`text-[10px] px-2 py-1 rounded border transition-all disabled:opacity-80 ${idx < currentPhase ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm hover:bg-indigo-600' : idx === currentPhase ? 'bg-indigo-100 text-indigo-800 border-indigo-400 font-black shadow-sm ring-1 ring-indigo-400' : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200 hover:text-slate-600'}`}>
            {step}
          </button>
          {idx < PROJECT_PHASES.length - 1 && <ChevronRight size={12} className={`mx-0.5 ${idx < currentPhase ? 'text-indigo-500' : 'text-slate-300'}`} />}
        </div>
      ))}
    </div>
  );
}

function ProjectIssueBadge({ prjId, projectIssues, openIssueDropdownId, setOpenIssueDropdownId, onIssueClick, isGanttView = false, t }) {
  if (projectIssues.length === 0) return null;
  const isOpen = openIssueDropdownId === prjId;
  const toggleDropdown = (e) => { e.stopPropagation(); setOpenIssueDropdownId(isOpen ? null : prjId); };
  
  const btnClass = isGanttView
    ? "text-[10px] text-red-600 bg-red-50 inline-flex items-center px-1.5 py-0.5 rounded font-bold border border-red-100 hover:bg-red-100 cursor-pointer relative z-10"
    : "px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full flex items-center animate-pulse hover:bg-red-200 transition-colors cursor-pointer relative z-10";

  return (
    <div className="relative">
      <button onClick={toggleDropdown} className={btnClass} title={t("클릭하여 미해결 이슈 목록 보기", "Click to view unresolved issues")}>
        <AlertCircle size={10} className="mr-1" />
        {isGanttView ? `${t('이슈', 'Issues')} ${projectIssues.length}${t('건', '')}` : `${t('미해결 이슈', 'Unresolved Issues')} ${projectIssues.length}${t('건', '')}`}
      </button>

      {isOpen && (
        <React.Fragment>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenIssueDropdownId(null); }}></div>
          <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 py-1 overflow-hidden" style={{minWidth: '250px'}}>
            <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="text-xs font-bold text-slate-700 flex items-center">
                <AlertTriangle size={12} className="text-red-500 mr-1.5" /> {t('연관 미해결 이슈', 'Related Unresolved Issues')}
              </span>
              <X size={14} className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={(e) => { e.stopPropagation(); setOpenIssueDropdownId(null); }} />
            </div>
            <div className="max-h-48 overflow-y-auto">
              {projectIssues.map((issue, idx) => (
                <div
                  key={`${issue.id}-${idx}`} 
                  onClick={(e) => { e.stopPropagation(); onIssueClick(issue); setOpenIssueDropdownId(null); }}
                  className="px-3 py-2 border-b border-slate-50 hover:bg-blue-50 cursor-pointer text-xs group transition-colors"
                >
                  <div className="font-bold text-slate-800 group-hover:text-blue-600 truncate mb-1">{issue.title}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px] flex items-center">
                      <User size={10} className="mr-0.5"/>{issue.author}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

function SignaturePad({ onSign, t }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e293b'; 
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
  }, []);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e) => { e.preventDefault(); const { x, y } = getCoordinates(e); const ctx = canvasRef.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); };
  const draw = (e) => { if (!isDrawing) return; e.preventDefault(); const { x, y } = getCoordinates(e); const ctx = canvasRef.current.getContext('2d'); ctx.lineTo(x, y); ctx.stroke(); };
  const stopDrawing = () => { setIsDrawing(false); };
  const clear = () => { const canvas = canvasRef.current; const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); };

  return (
    <div className="mt-6 border-t-2 border-slate-200 pt-5 animate-[fadeIn_0.3s_ease-in-out]">
      <h4 className="font-bold text-sm text-slate-800 mb-3 flex items-center"><PenTool size={16} className="mr-1.5 text-indigo-600" /> {t('고객사 최종 검수 서명', 'Customer Final Buy-off Signature')}</h4>
      <input type="text" placeholder={t('고객사 담당자 성명 입력', 'Enter Customer Name')} className="w-full p-2.5 mb-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 font-bold" value={name} onChange={e => setName(e.target.value)} />
      <div className="border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 relative overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-36 cursor-crosshair touch-none" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
        <button onClick={clear} className="absolute top-2 right-2 text-[10px] bg-white border border-slate-200 px-2 py-1 rounded shadow-sm hover:bg-slate-50 font-bold text-slate-500 transition-colors">{t('지우기', 'Clear')}</button>
      </div>
      <button disabled={!name.trim()} onClick={() => onSign(name, canvasRef.current.toDataURL('image/png'))} className="w-full mt-4 bg-indigo-600 text-white py-3 rounded-lg font-bold text-sm disabled:bg-slate-300 hover:bg-indigo-700 shadow-md transition-colors flex items-center justify-center"><ShieldCheck size={18} className="mr-2" /> {t('서명 완료 및 프로젝트 종료', 'Complete Sign-off & Close Project')}</button>
    </div>
  );
}

// ==============================================
// 4. 모달 공통 래퍼 컴포넌트
// ==============================================

function ModalWrapper({ title, onClose, onSubmit, children, submitText, icon, color = 'blue', t = (ko, en) => ko }) {
  const colors = {
    blue: { bg: 'bg-blue-600 hover:bg-blue-700', header: 'bg-slate-50 text-slate-800' },
    red: { bg: 'bg-red-600 hover:bg-red-700', header: 'bg-red-500 text-white' },
    amber: { bg: 'bg-amber-500 hover:bg-amber-600', header: 'bg-amber-500 text-white' },
    indigo: { bg: 'bg-indigo-600 hover:bg-indigo-700', header: 'bg-indigo-50 text-indigo-900' }
  };
  const theme = colors[color] || colors.blue;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh]">
        <div className={`px-6 py-4 flex justify-between items-center shrink-0 ${theme.header}`}>
          <h2 className="text-lg font-bold flex items-center">
            {icon && <span className="mr-2">{icon}</span>}
            {title}
          </h2>
          <button type="button" onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity"><X size={24} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {children}
          {submitText && (
            <div className="pt-4 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">{t('취소', 'Cancel')}</button>
              <button type="submit" className={`px-4 py-2.5 text-sm font-medium text-white rounded-lg shadow-sm transition-colors flex items-center ${theme.bg}`}>{submitText}</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// ==============================================
// 5. 개별 모달 컴포넌트들
// ==============================================

function ProjectModal({ onClose, onSubmit, t }) {
  const [data, setData] = useState({ domain: '반도체', name: '', customer: '', site: '', startDate: '', dueDate: '', status: '진행중', manager: '', hwVersion: '', swVersion: '', fwVersion: '', phaseIndex: 0 });
  return (
    <ModalWrapper title={t('새 프로젝트 생성', 'New Project')} onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('생성하기', 'Create')}>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('산업군', 'Domain')}</label>
        <select className="w-full p-2.5 border rounded-lg text-sm bg-indigo-50 text-indigo-700 font-bold" value={data.domain} onChange={e=>setData({...data, domain:e.target.value})}>
          {DOMAINS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">{t('프로젝트명', 'Project Name')}</label>
        <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.name} onChange={e=>setData({...data, name:e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('고객사', 'Customer')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.customer} onChange={e=>setData({...data, customer:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('사이트(지역)', 'Site Location')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.site} onChange={e=>setData({...data, site:e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('시작일', 'Start Date')}</label>
          <input required type="date" className="w-full p-2.5 border rounded-lg text-sm" value={data.startDate} onChange={e=>setData({...data, startDate:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('납기일', 'Due Date')}</label>
          <input required type="date" className="w-full p-2.5 border rounded-lg text-sm" value={data.dueDate} onChange={e=>setData({...data, dueDate:e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('담당자(PM)', 'Manager')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.manager} onChange={e=>setData({...data, manager:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t('초기 상태', 'Status')}</label>
          <select className="w-full p-2.5 border rounded-lg text-sm" value={data.status} onChange={e=>setData({...data, status:e.target.value})}>
            <option value="진행중">진행중</option>
            <option value="이슈발생">이슈발생</option>
          </select>
        </div>
      </div>
    </ModalWrapper>
  );
}

function SiteModal({ site, onClose, onSubmit, t }) {
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
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Power</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.power} onChange={e=>setData({...data, power:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">PCW</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.pcw} onChange={e=>setData({...data, pcw:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">Gas/CDA</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.gas} onChange={e=>setData({...data, gas:e.target.value})} />
        </div>
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
}

function IssueModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({ projectId: projects[0]?.id || '', title: '', severity: 'Medium', author: '', alertEmail: '' });
  const [preview, setPreview] = useState(null);
  
  return (
    <ModalWrapper title={t('현장 이슈 등록', 'Register Issue')} icon={<AlertTriangle size={18}/>} color="red" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit({...data, photo:preview});}} submitText={t('이슈 전송', 'Submit Issue')}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">{t('현장 사진 첨부 (선택)', 'Attach Photo (Optional)')}</label>
        {preview ? (
          <div className="relative bg-slate-100 rounded-xl p-2 border border-slate-200">
            <img src={preview} className="w-full h-40 object-contain rounded-lg" alt="Preview" />
            <button type="button" onClick={()=>setPreview(null)} className="absolute top-4 right-4 bg-slate-900/70 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-900"><X size={16}/></button>
          </div>
        ) : (
          <div className="flex space-x-3 w-full">
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-red-500 transition-colors">
              <Camera size={28} className="mb-2"/>
              <span className="font-bold text-sm">{t('사진 촬영', 'Camera')}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>setPreview(URL.createObjectURL(e.target.files[0]))}/>
            </label>
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-blue-500 transition-colors">
              <Images size={28} className="mb-2"/>
              <span className="font-bold text-sm">{t('앨범 선택', 'Gallery')}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e=>setPreview(URL.createObjectURL(e.target.files[0]))}/>
            </label>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('관련 프로젝트', 'Project')}</label>
        <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e=>setData({...data, projectId:e.target.value})}>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
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
          <select className="w-full p-2.5 border rounded-lg text-sm font-bold text-red-600 bg-red-50" value={data.severity} onChange={e=>setData({...data, severity:e.target.value})}>
            <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('작성자', 'Author')}</label>
          <input required type="text" className="w-full p-2.5 border rounded-lg text-sm" value={data.author} onChange={e=>setData({...data, author:e.target.value})} />
        </div>
      </div>
    </ModalWrapper>
  );
}

function PartModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({ projectId: projects[0]?.id || '', partName: '', partNumber: '', quantity: 1, urgency: 'Medium', author: '' });
  const [preview, setPreview] = useState(null);
  
  return (
    <ModalWrapper title={t('자재/스페어 파트 청구', 'Part Request')} icon={<Package size={18}/>} color="amber" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit({...data, photo:preview});}} submitText={t('발주 요청', 'Request')}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-2">{t('파트 사진 첨부', 'Attach Photo')}</label>
        {preview ? (
          <div className="relative bg-slate-100 rounded-xl p-2 border border-slate-200">
            <img src={preview} className="w-full h-40 object-contain rounded-lg" alt="Preview" />
            <button type="button" onClick={()=>setPreview(null)} className="absolute top-4 right-4 bg-slate-900/70 text-white w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-900"><X size={16}/></button>
          </div>
        ) : (
          <div className="flex space-x-3 w-full">
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-amber-500 transition-colors">
              <Camera size={28} className="mb-2"/><span className="font-bold text-sm">{t('사진 촬영', 'Camera')}</span>
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e=>setPreview(URL.createObjectURL(e.target.files[0]))}/>
            </label>
            <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-blue-500 transition-colors">
              <Images size={28} className="mb-2"/><span className="font-bold text-sm">{t('앨범 선택', 'Gallery')}</span>
              <input type="file" accept="image/*" className="hidden" onChange={e=>setPreview(URL.createObjectURL(e.target.files[0]))}/>
            </label>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('관련 프로젝트', 'Project')}</label>
        <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e=>setData({...data, projectId:e.target.value})}>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('파트명 (품명)', 'Part Name')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.partName} onChange={e=>setData({...data, partName:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('필요 수량', 'Quantity')}</label>
          <input required type="number" min="1" className="w-full p-2.5 border rounded-lg text-sm text-blue-600 font-bold" value={data.quantity} onChange={e=>setData({...data, quantity:parseInt(e.target.value)})} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('도면번호 (Part Number)', 'Part Number')}</label>
        <input className="w-full p-2.5 border rounded-lg text-sm font-mono" value={data.partNumber} onChange={e=>setData({...data, partNumber:e.target.value})} placeholder={t('모를 경우 생략 가능', 'Optional')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('긴급도', 'Urgency')}</label>
          <select className="w-full p-2.5 border rounded-lg text-sm" value={data.urgency} onChange={e=>setData({...data, urgency:e.target.value})}>
            <option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1">{t('작성자', 'Author')}</label>
          <input required className="w-full p-2.5 border rounded-lg text-sm" value={data.author} onChange={e=>setData({...data, author:e.target.value})} />
        </div>
      </div>
    </ModalWrapper>
  );
}

function DailyReportModal({ projects, onClose, onSubmit, t }) {
  const [data, setData] = useState({ projectId: projects[0]?.id || '', date: new Date().toISOString().split('T')[0], todayWork: '', tomorrowPlan: '', issues: '' });
  return (
    <ModalWrapper title={t('일일 현장 보고서', 'Daily Report')} icon={<CheckSquare size={18}/>} color="blue" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('보고서 제출', 'Submit')}>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('프로젝트', 'Project')}</label>
        <select required className="w-full p-2.5 border rounded-lg text-sm" value={data.projectId} onChange={e=>setData({...data, projectId:e.target.value})}>
          {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('작업 일자', 'Date')}</label>
        <input required type="date" className="w-full p-2.5 border rounded-lg text-sm" value={data.date} onChange={e=>setData({...data, date:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('금일 작업 내용', 'Today\'s Work')}</label>
        <textarea required rows="3" className="w-full p-2.5 border rounded-lg text-sm resize-none" value={data.todayWork} onChange={e=>setData({...data, todayWork:e.target.value})}></textarea>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('명일 작업 계획', 'Tomorrow\'s Plan')}</label>
        <textarea required rows="2" className="w-full p-2.5 border rounded-lg text-sm resize-none" value={data.tomorrowPlan} onChange={e=>setData({...data, tomorrowPlan:e.target.value})}></textarea>
      </div>
      <div>
        <label className="block text-sm font-bold text-slate-700 mb-1">{t('특이사항 및 요청사항', 'Notes')}</label>
        <textarea rows="2" className="w-full p-2.5 border rounded-lg text-sm resize-none" value={data.issues} onChange={e=>setData({...data, issues:e.target.value})}></textarea>
      </div>
    </ModalWrapper>
  );
}

function VersionModal({ project, onClose, onSubmit, t }) {
  const [data, setData] = useState({ hw: project?.hwVersion||'', sw: project?.swVersion||'', fw: project?.fwVersion||'' });
  if (!project) return null;
  return (
    <ModalWrapper title={t('버전 업데이트', 'Update Version')} onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(project.id, data.hw, data.sw, data.fw);}} submitText={t('업데이트', 'Update')}>
      <div>
        <label className="block text-sm font-medium mb-1">HW 리비전</label>
        <input className="w-full p-2.5 border rounded-lg" value={data.hw} onChange={e=>setData({...data, hw:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">SW 버전</label>
        <input className="w-full p-2.5 border rounded-lg" value={data.sw} onChange={e=>setData({...data, sw:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">FW 버전</label>
        <input className="w-full p-2.5 border rounded-lg" value={data.fw} onChange={e=>setData({...data, fw:e.target.value})} />
      </div>
    </ModalWrapper>
  );
}

function ReleaseModal({ onClose, onSubmit, t }) {
  const [data, setData] = useState({ type: 'SW', version: '', author: '', description: '' });
  return (
    <ModalWrapper title={t('새 버전 배포 등록', 'New Release')} color="indigo" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('공유하기', 'Share')}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">{t('분류', 'Type')}</label>
          <select className="w-full p-2.5 border rounded-lg" value={data.type} onChange={e=>setData({...data, type:e.target.value})}>
            <option value="SW">SW</option><option value="FW">FW</option><option value="HW">HW</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">{t('버전 정보', 'Version')}</label>
          <input required className="w-full p-2.5 border rounded-lg font-bold" value={data.version} onChange={e=>setData({...data, version:e.target.value})} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">{t('작성자', 'Author')}</label>
        <input required className="w-full p-2.5 border rounded-lg" value={data.author} onChange={e=>setData({...data, author:e.target.value})} />
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">{t('릴리즈 노트', 'Release Notes')}</label>
        <textarea required rows="5" className="w-full p-2.5 border rounded-lg resize-none" value={data.description} onChange={e=>setData({...data, description:e.target.value})}></textarea>
      </div>
    </ModalWrapper>
  );
}

function EngineerModal({ engineer, onClose, onSubmit, t }) {
  const [data, setData] = useState(engineer || { name: '', dept: '', role: '', currentSite: '', status: '본사 대기', accessExpiry: '' });
  return (
    <ModalWrapper title={engineer ? t('인력 정보 수정', 'Edit Engineer') : t('새 엔지니어 추가', 'Add Engineer')} color="indigo" onClose={onClose} onSubmit={(e)=>{e.preventDefault();onSubmit(data);}} submitText={t('저장하기', 'Save')}>
      <div>
        <label className="block text-sm font-bold mb-1">{t('이름', 'Name')}</label>
        <input required className="w-full p-2.5 border rounded-lg" value={data.name} onChange={e=>setData({...data, name:e.target.value})} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">{t('부서', 'Department')}</label>
          <input required className="w-full p-2.5 border rounded-lg" value={data.dept} onChange={e=>setData({...data, dept:e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">{t('역할', 'Role')}</label>
          <input required className="w-full p-2.5 border rounded-lg" value={data.role} onChange={e=>setData({...data, role:e.target.value})} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold mb-1">{t('상태', 'Status')}</label>
          <select className="w-full p-2.5 border rounded-lg" value={data.status} onChange={e=>setData({...data, status:e.target.value})}>
            <option value="본사 대기">본사 대기</option><option value="현장 파견">현장 파견</option><option value="본사 복귀">본사 복귀</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold mb-1">{t('현재 위치', 'Location')}</label>
          <input required className="w-full p-2.5 border rounded-lg" value={data.currentSite} onChange={e=>setData({...data, currentSite:e.target.value})} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-bold mb-1">{t('출입증 만료일', 'Badge Expiry Date')}</label>
        <input required type="date" className="w-full p-2.5 border rounded-lg" value={data.accessExpiry} onChange={e=>setData({...data, accessExpiry:e.target.value})} />
      </div>
    </ModalWrapper>
  );
}

// ==============================================
// 6. 메인 컴포넌트 및 페이지 뷰
// ==============================================

function DashboardView({ projects, issues, engineers, getStatusColor, calcExp, calcAct, t }) {
  const activeProjectsCount = projects.filter(p => p.status !== '완료').length;
  const unresolvedIssuesCount = issues.filter(i => i.status !== '조치 완료').length;

  const projectStats = [
    { label: t('진행중', 'In Progress'), value: projects.filter(p => p.status === '진행중').length, color: 'bg-blue-500' },
    { label: t('마감임박', 'Due Soon'), value: projects.filter(p => p.status === '마감임박').length, color: 'bg-amber-500' },
    { label: t('완료', 'Completed'), value: projects.filter(p => p.status === '완료').length, color: 'bg-emerald-500' },
  ];

  const issueStats = [
    { label: 'High', value: issues.filter(i => i.severity === 'High' && i.status !== '조치 완료').length, color: 'bg-red-500', svgColor: '#ef4444' },
    { label: 'Medium', value: issues.filter(i => i.severity === 'Medium' && i.status !== '조치 완료').length, color: 'bg-amber-500', svgColor: '#f59e0b' },
    { label: 'Low', value: issues.filter(i => i.severity === 'Low' && i.status !== '조치 완료').length, color: 'bg-emerald-500', svgColor: '#10b981' },
  ];

  const completedPrjs = projects.filter(p => p.status === '완료' && p.signOff);
  const avgLeadTime = completedPrjs.length 
    ? (completedPrjs.reduce((acc, p) => acc + (new Date(p.signOff.date) - new Date(p.startDate)), 0) / completedPrjs.length / (1000*60*60*24)).toFixed(1) 
    : 0;
  const resolvedIssues = issues.filter(i => i.status === '조치 완료');
  const avgMttr = resolvedIssues.length ? (resolvedIssues.length * 1.5).toFixed(1) : 0; 

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{t('대시보드 종합 현황', 'Dashboard Overview')}</h1>
        <p className="text-slate-500 mt-1">{t('프로젝트 및 이슈의 전체적인 현황을 차트로 분석합니다.', 'Analyze the overall status of projects and issues.')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title={t('진행중 프로젝트', 'Active Projects')} value={activeProjectsCount} icon={<Kanban size={24} className="text-blue-500" />} />
        <StatCard title={t('미해결 이슈', 'Unresolved Issues')} value={unresolvedIssuesCount} icon={<AlertCircle size={24} className="text-amber-500" />} color="border-amber-200 bg-amber-50" />
        <StatCard title={t('전체 프로젝트', 'Total Projects')} value={projects.length} icon={<CheckCircle size={24} className="text-emerald-500" />} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><PieChart size={18} className="mr-2 text-indigo-500"/> {t('고급 분석 (Analytics)', 'Advanced Analytics')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">{t('평균 셋업 소요 시간 (Lead Time)', 'Avg. Setup Lead Time')}</span>
              <div className="text-2xl font-black text-slate-800">{avgLeadTime} <span className="text-sm font-medium text-slate-500">Days</span></div>
            </div>
            <Clock size={32} className="text-indigo-200" />
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
            <div>
              <span className="text-xs font-bold text-slate-500 block mb-1">{t('이슈 평균 해결 시간 (MTTR)', 'Mean Time To Recovery (MTTR)')}</span>
              <div className="text-2xl font-black text-slate-800">{avgMttr} <span className="text-sm font-medium text-slate-500">Days</span></div>
            </div>
            <Wrench size={32} className="text-indigo-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><AlertTriangle size={18} className="mr-2 text-red-500"/> {t('미해결 이슈 중요도 분포', 'Issue Severity Distribution')}</h2>
          <div className="flex-1 flex items-center justify-center">
            <SimpleDonutChart data={issueStats} t={t} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center"><BarChart3 size={18} className="mr-2 text-blue-500"/> {t('프로젝트 상태별 현황', 'Project Status')}</h2>
          <div className="flex-1 flex items-end">
             <SimpleBarChart data={projectStats} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('주요 프로젝트 진척도 (계획 vs 실적)', 'Project Progress')}</h2>
          <div className="space-y-6">
            {projects.slice(0, 4).map(prj => {
              const expected = calcExp(prj.startDate, prj.dueDate);
              const actual = calcAct(prj.tasks);
              const isDelayed = actual < expected;

              return (
                <div key={prj.id}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-bold text-slate-700 truncate pr-2">
                      {prj.name} <span className="text-xs font-normal text-slate-500 ml-1">[{prj.domain}]</span> 
                      <span className="text-xs font-normal text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded ml-1 hidden sm:inline-block">{PROJECT_PHASES[prj.phaseIndex || 0]} {t('단계', '')}</span>
                    </span>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500 mr-2">{t('계획', 'Exp')}: {expected}%</span>
                      <span className={`text-xs font-bold ${isDelayed ? 'text-red-600' : 'text-blue-600'}`}>{t('실적', 'Act')}: {actual}%</span>
                    </div>
                  </div>
                  <div className="relative w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="absolute top-0 left-0 h-3 bg-slate-300 opacity-50" style={{ width: `${expected}%` }}></div>
                    <div className={`absolute top-0 left-0 h-3 rounded-full transition-all duration-500 ${prj.status === '완료' ? 'bg-emerald-500' : (isDelayed ? 'bg-red-500' : 'bg-blue-600')}`} style={{ width: `${actual}%` }}></div>
                  </div>
                  {isDelayed && prj.status !== '완료' && (
                    <p className="text-[10px] text-red-500 mt-1 flex items-center"><AlertCircle size={10} className="mr-1" /> {t('계획 대비 지연 중입니다.', 'Delayed against schedule.')}</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 mb-4">{t('최근 등록된 이슈', 'Recent Issues')}</h2>
          <div className="space-y-4">
            {issues.slice(0, 4).map(issue => (
              <div key={issue.id} className="p-3 border border-slate-100 bg-slate-50 rounded-lg flex items-center hover:bg-slate-100 transition-colors cursor-pointer">
                {issue.photo ? (
                  <div className="w-12 h-12 bg-slate-200 rounded-lg mr-3 shrink-0 overflow-hidden"><img src={issue.photo} className="w-full h-full object-cover" alt="이슈사진" /></div>
                ) : (
                  <div className="w-12 h-12 bg-slate-200 rounded-lg mr-3 shrink-0 flex items-center justify-center text-slate-400"><ImageIcon size={20} /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                    <div className="flex items-center text-[10px] text-slate-400"><MessageCircle size={10} className="mr-1" />{issue.comments?.length || 0}</div>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mb-0.5 truncate">{issue.title}</p>
                  <p className="text-[10px] text-slate-500 truncate">{issue.projectName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectListView({ projects, issues, getStatusColor, onAddClick, onManageTasks, onEditVersion, onDeleteProject, onUpdatePhase, onIssueClick, calcExp, calcAct, currentUser, t }) {
  const [viewMode, setViewMode] = useState('list'); 
  const [filterManager, setFilterManager] = useState('all');
  const [openIssueDropdownId, setOpenIssueDropdownId] = useState(null);

  const managers = ['all', ...new Set(projects.map(p => p.manager).filter(Boolean))];

  const filteredProjects = useMemo(() => {
    let result = projects;
    if (currentUser.role === 'CUSTOMER') {
      result = result.filter(p => p.customer === currentUser.customer);
    }
    if (filterManager !== 'all') {
      result = result.filter(p => p.manager === filterManager);
    }
    return result;
  }, [projects, filterManager, currentUser]);

  const ganttRange = useMemo(() => {
    if (filteredProjects.length === 0) return { minDate: new Date(), maxDate: new Date(), totalDays: 1 };
    const minDate = new Date(Math.min(...filteredProjects.map(p => new Date(p.startDate))));
    const maxDate = new Date(Math.max(...filteredProjects.map(p => new Date(p.dueDate))));
    minDate.setDate(minDate.getDate() - 15);
    maxDate.setDate(maxDate.getDate() + 15);
    const totalDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
    return { minDate, maxDate, totalDays };
  }, [filteredProjects]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">{t('프로젝트 관리', 'Projects')}</h1>
        </div>
        <div className="flex items-center space-x-3">
          {currentUser.role !== 'CUSTOMER' && (
            <div className="flex items-center bg-white rounded-lg px-3 py-1.5 shadow-sm border border-slate-200">
              <Filter size={16} className="text-slate-400 mr-2" />
              <select 
                className="text-sm border-none outline-none bg-transparent text-slate-700 font-medium cursor-pointer"
                value={filterManager}
                onChange={(e) => setFilterManager(e.target.value)}
              >
                <option value="all">{t('전체 담당자', 'All Managers')}</option>
                {managers.filter(m => m !== 'all').map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button onClick={() => setViewMode('list')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <AlignJustify size={16} className="mr-1.5" /> {t('리스트', 'List')}
            </button>
            <button onClick={() => setViewMode('gantt')} className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'gantt' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
              <CalendarDays size={16} className="mr-1.5" /> {t('간트차트', 'Gantt')}
            </button>
          </div>

          {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
            <button onClick={onAddClick} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm">
              <Plus size={16} className="mr-1" /> {t('새 프로젝트', 'New Project')}
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[250px]">{t('프로젝트명 / 진행 단계', 'Project / Phase')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[150px]">{t('고객사/사이트', 'Client/Site')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[120px]">{t('담당자', 'Manager')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[150px]">{t('버전 (HW/SW/FW)', 'Versions')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase min-w-[200px]">{t('진척도 (계획 / 실적)', 'Progress')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase min-w-[180px]">{t('일정관리', 'Manage')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredProjects.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-10 text-slate-400">{t('프로젝트가 없습니다.', 'No projects found.')}</td></tr>
                ) : filteredProjects.map((prj) => {
                  const expected = calcExp(prj.startDate, prj.dueDate);
                  const actual = calcAct(prj.tasks);
                  const isDelayed = actual < expected;
                  const projectIssues = issues.filter(i => i.projectId === prj.id && i.status !== '조치 완료');

                  return (
                  <tr key={prj.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                      <ProjectIssueBadge prjId={prj.id} projectIssues={projectIssues} openIssueDropdownId={openIssueDropdownId} setOpenIssueDropdownId={setOpenIssueDropdownId} onIssueClick={onIssueClick} getStatusColor={getStatusColor} t={t} />
                      {prj.notionLink && (
                        <a href={prj.notionLink} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 rounded-full text-slate-700 hover:bg-slate-100 transition-colors flex items-center shadow-sm" title="Notion" onClick={e => e.stopPropagation()}>
                          <LinkIcon size={10} className="mr-1 text-slate-400" /> Notion
                        </a>
                      )}
                    </div>
                    <div className="text-sm font-bold text-slate-900 mt-1.5 flex items-center">
                      {prj.name}
                      <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">{prj.domain}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center mt-1">
                      <Clock size={12} className="mr-1" /> {prj.startDate} ~ {prj.dueDate}
                    </div>
                    <ProjectPipelineStepper currentPhase={prj.phaseIndex || 0} onUpdatePhase={onUpdatePhase} projectId={prj.id} role={currentUser.role} />
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm text-slate-900">{prj.customer}</div>
                    <div className="text-xs text-slate-500">{prj.site}</div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-sm text-slate-700 flex items-center">
                      <User size={14} className="mr-1.5 text-slate-400" />
                      {prj.manager || t('미지정', 'Unassigned')}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex flex-col space-y-1.5 text-xs text-slate-700">
                      <div className="flex items-center"><HardDrive size={14} className="mr-1.5 text-amber-500" /> <span className="font-medium">HW:</span> <span className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{prj.hwVersion || '-'}</span></div>
                      <div className="flex items-center"><Monitor size={14} className="mr-1.5 text-blue-500" /> <span className="font-medium">SW:</span> <span className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{prj.swVersion || '-'}</span></div>
                      <div className="flex items-center"><Cpu size={14} className="mr-1.5 text-emerald-500" /> <span className="font-medium">FW:</span> <span className="ml-1 bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{prj.fwVersion || '-'}</span></div>
                    </div>
                    {currentUser.role !== 'CUSTOMER' && (
                      <button onClick={() => onEditVersion(prj)} className="mt-2 flex items-center text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 px-2 py-1 rounded transition-all opacity-0 group-hover:opacity-100">
                        <Edit size={10} className="mr-1" /> {t('버전 변경', 'Edit Version')}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap min-w-[150px]">
                    <div className="flex flex-col space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{t('계획', 'Exp')}: {expected}%</span>
                        <span className={`font-bold ${isDelayed && prj.status !== '완료' ? 'text-red-600' : 'text-blue-600'}`}>{t('실적', 'Act')}: {actual}%</span>
                      </div>
                      <div className="relative w-full bg-slate-100 rounded-full h-2.5">
                        <div className="absolute top-0 left-0 h-2.5 bg-slate-300 opacity-50 rounded-full" style={{ width: `${expected}%` }}></div>
                        <div className={`absolute top-0 left-0 h-2.5 rounded-full ${prj.status === '완료' ? 'bg-emerald-500' : (isDelayed ? 'bg-red-500' : 'bg-blue-600')}`} style={{ width: `${actual}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500 text-right">
                    <div className="flex justify-end items-center space-x-1.5">
                      <button onClick={() => downloadICS(prj, t)} className="flex items-center text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2 py-1.5 rounded-md border border-slate-200 transition-colors shadow-sm" title={t('MS Outlook 캘린더 등록 (.ics)', 'Add to MS Outlook')}>
                        <CalendarDays size={14} className="md:mr-1"/> <span className="hidden md:inline text-xs font-bold">MS</span>
                      </button>
                      <button onClick={() => openGoogleCalendar(prj)} className="flex items-center text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 px-2 py-1.5 rounded-md border border-slate-200 transition-colors shadow-sm" title={t('Google 캘린더 바로 열기', 'Open in Google Calendar')}>
                        <CalendarDays size={14} className="md:mr-1"/> <span className="hidden md:inline text-xs font-bold">Google</span>
                      </button>
                      <button onClick={() => onManageTasks(prj.id)} className="flex items-center text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 transition-colors shadow-sm">
                        <ListTodo size={14} className="mr-1"/> {currentUser.role === 'CUSTOMER' ? t('상세 보기', 'View') : t('관리', 'Manage')}
                      </button>
                      {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                        <button onClick={() => onDeleteProject(prj)} className="flex items-center text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 px-2 py-1.5 rounded-md border border-transparent hover:border-red-100 transition-colors" title={t('프로젝트 삭제', 'Delete Project')}>
                          <Trash size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        ) : (
          <div className="p-6 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="flex border-b border-slate-200 pb-2 mb-4 relative h-6">
                <div className="absolute left-0 text-xs font-bold text-slate-400">{ganttRange.minDate.toISOString().split('T')[0]}</div>
                <div className="absolute right-0 text-xs font-bold text-slate-400">{ganttRange.maxDate.toISOString().split('T')[0]}</div>
                <div className="absolute left-1/2 -translate-x-1/2 text-xs font-bold text-slate-400 bg-white px-2">{t('프로젝트 일정 타임라인', 'Project Timeline')}</div>
              </div>
              <div className="space-y-4">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">{t('표시할 프로젝트가 없습니다.', 'No projects to display.')}</div>
                ) : (
                  filteredProjects.map((prj) => {
                    const pStart = new Date(prj.startDate);
                    const pDue = new Date(prj.dueDate);
                    const leftPercent = ((pStart - ganttRange.minDate) / (1000 * 60 * 60 * 24) / ganttRange.totalDays) * 100;
                    const widthPercent = ((pDue - pStart) / (1000 * 60 * 60 * 24) / ganttRange.totalDays) * 100;
                    const actual = calcAct(prj.tasks);
                    const projectIssues = issues.filter(i => i.projectId === prj.id && i.status !== '조치 완료');

                    return (
                      <div key={prj.id} className="relative h-14 flex items-center group">
                        <div className="w-1/4 pr-4 border-r border-slate-200 flex flex-col justify-center relative">
                          <div className="flex justify-between items-start pr-2">
                            <div className="text-sm font-bold text-slate-800 truncate flex-1" title={prj.name}>{prj.name}</div>
                            {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                              <button onClick={(e) => { e.stopPropagation(); onDeleteProject(prj); }} className="text-slate-300 hover:text-red-500 transition-colors ml-2">
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <div className="text-[10px] text-indigo-600 bg-indigo-50 inline-block px-1.5 py-0.5 rounded font-bold">
                              {PROJECT_PHASES[prj.phaseIndex || 0]} {t('단계', '')}
                            </div>
                            <ProjectIssueBadge prjId={prj.id} projectIssues={projectIssues} openIssueDropdownId={openIssueDropdownId} setOpenIssueDropdownId={setOpenIssueDropdownId} onIssueClick={onIssueClick} getStatusColor={getStatusColor} isGanttView={true} t={t} />
                          </div>
                          <div className="text-xs text-slate-500 flex justify-between mt-1 pr-2">
                            <span>{prj.manager || t('미지정', 'Unassigned')}</span>
                            <span className="text-blue-600 font-bold">{actual}%</span>
                          </div>
                        </div>
                        <div className="w-3/4 relative h-full flex items-center mx-4">
                          <div className="absolute w-full h-px bg-slate-200"></div>
                          <div className="absolute h-7 bg-slate-100 border border-slate-300 rounded-md overflow-hidden cursor-pointer hover:border-blue-400 hover:shadow-md transition-all" style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }} onClick={() => onManageTasks(prj.id)}>
                            <div className={`h-full ${prj.status === '완료' ? 'bg-emerald-400' : 'bg-blue-400'}`} style={{ width: `${actual}%` }}></div>
                          </div>
                          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-1.5 px-3 rounded-lg -top-3 z-10 pointer-events-none whitespace-nowrap shadow-lg" style={{ left: `${leftPercent}%` }}>
                            {prj.startDate} ~ {prj.dueDate}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SiteListView({ sites, onAddClick, onEditClick, onDeleteClick, currentUser, t }) {
  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('사이트/유틸리티 환경 정보 마스터', 'Site & Utility Master')}</h1>
          <p className="text-slate-500 mt-1">{t('고객사 팹(Fab)별 인프라 환경 스펙 및 반입 제약사항을 관리합니다.', 'Manage infrastructure specs and restrictions per Fab.')}</p>
        </div>
        {currentUser.role === 'ADMIN' && (
          <button onClick={onAddClick} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors">
            <Plus size={16} className="mr-1" /> {t('새 사이트 등록', 'New Site')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {sites.length === 0 ? (
           <div className="text-center py-10 bg-white rounded-xl border border-slate-200 text-slate-400">{t('등록된 정보가 없습니다.', 'No data available.')}</div>
        ) : sites.map(site => (
          <div key={site.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-indigo-300 transition-colors">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded mr-2">{site.customer}</span>
                <span className="text-lg font-bold text-slate-800">{site.fab}</span>
                <span className="text-sm text-slate-500 ml-2">({site.line})</span>
              </div>
              {currentUser.role === 'ADMIN' && (
                <div className="flex space-x-2">
                  <button onClick={() => onEditClick(site)} className="text-slate-400 hover:text-indigo-600 p-1 transition-colors"><Edit size={16} /></button>
                  <button onClick={() => onDeleteClick(site)} className="text-slate-400 hover:text-red-600 p-1 transition-colors"><Trash size={16} /></button>
                </div>
              )}
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-500 flex items-center mb-1"><Cpu size={14} className="mr-1 text-slate-400"/> Power</span>
                <p className="text-sm font-bold text-slate-800">{site.power}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-500 flex items-center mb-1"><Database size={14} className="mr-1 text-blue-400"/> PCW</span>
                <p className="text-sm font-bold text-slate-800">{site.pcw}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs font-bold text-slate-500 flex items-center mb-1"><HardDrive size={14} className="mr-1 text-amber-400"/> Gas / CDA</span>
                <p className="text-sm font-bold text-slate-800">{site.gas}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                <span className="text-xs font-bold text-amber-700 flex items-center mb-1"><AlertTriangle size={14} className="mr-1"/> {t('반입/하중 제한', 'Restrictions')}</span>
                <p className="text-sm font-bold text-amber-900">{site.limit}</p>
              </div>
            </div>
            {site.note && (
              <div className="px-5 pb-5">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <span className="text-xs font-bold text-blue-700 flex items-center mb-1"><Info size={14} className="mr-1"/> {t('기타 특이사항', 'Notes')}</span>
                  <p className="text-sm text-blue-900 whitespace-pre-wrap">{site.note}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function IssueListView({ issues, getStatusColor, onAddClick, onIssueClick, onDeleteIssue, currentUser, t }) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold">{t('이슈 및 펀치 관리', 'Issues & Punches')}</h1>
        </div>
        {currentUser.role !== 'CUSTOMER' && (
          <button onClick={onAddClick} className="flex items-center bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
            <Plus size={16} className="mr-1" /> {t('현장 이슈 등록', 'Report Issue')}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-4">
        {issues.map((issue) => (
          <div key={issue.id} onClick={() => onIssueClick(issue)} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between cursor-pointer group hover:border-blue-300 transition-colors">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-xs font-bold text-slate-500">{issue.id}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(issue.status)}`}>{issue.status}</span>
              </div>
              <div className="flex items-center">
                {issue.photo && <img src={issue.photo} className="w-10 h-10 rounded mr-3 object-cover border border-slate-200" alt="이슈" />}
                <h3 className="text-lg font-bold group-hover:text-blue-600 transition-colors">{issue.title}</h3>
              </div>
              <p className="text-sm text-slate-500 mt-1 flex items-center">
                <Kanban size={14} className="mr-1.5" /> {issue.projectName}
              </p>
            </div>
            <div className="flex flex-col items-end mt-4 md:mt-0">
              <div className="text-sm mb-1 flex items-center justify-end">
                {t('작성자', 'Author')}: {issue.author} 
                {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                  <button onClick={(e) => { e.stopPropagation(); onDeleteIssue(issue); }} className="text-slate-300 hover:text-red-500 ml-4 transition-colors">
                    <Trash size={16} />
                  </button>
                )}
              </div>
              <div className="text-sm text-slate-500 mt-1 flex items-center">
                {issue.date}
                <div className="flex items-center ml-3 text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                  <MessageCircle size={14} className="mr-1" />
                  <span className="font-bold">{issue.comments?.length || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartsListView({ parts, getStatusColor, onUpdateStatus, onDeletePart, onAddClick, currentUser, t }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const filteredParts = useMemo(() => filterStatus === 'all' ? parts : parts.filter(p => p.status === filterStatus), [parts, filterStatus]);
  
  const getStepClass = (currentStatus, step) => {
    const statusIndex = PART_PHASES.indexOf(currentStatus);
    const stepIndex = PART_PHASES.indexOf(step);
    if (stepIndex < statusIndex) return "bg-indigo-500 text-white border-indigo-600";
    if (stepIndex === statusIndex) return "bg-indigo-100 text-indigo-800 border-indigo-400 font-bold ring-1 ring-indigo-400";
    return "bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200";
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('자재 및 스페어 파트 관리', 'Parts Management')}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-white rounded-lg px-3 py-1.5 border border-slate-200 items-center">
            <Filter size={16} className="text-slate-400 mr-2" />
            <select className="text-sm border-none outline-none font-bold text-slate-700" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">{t('전체 상태 보기', 'All Status')}</option>
              {PART_PHASES.map(phase => <option key={phase} value={phase}>{phase}</option>)}
            </select>
          </div>
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={onAddClick} className="flex items-center bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors">
              <Plus size={16} className="mr-1.5" /> {t('자재 청구', 'Request Part')}
            </button>
          )}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('파트 정보', 'Part Info')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('프로젝트 / 청구자', 'Project / Author')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('수량 및 중요도', 'Qty / Urgency')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('처리 단계', 'Status Phase')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500">{t('관리', 'Manage')}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {filteredParts.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-10 text-slate-400">{t('내역이 없습니다.', 'No parts requested.')}</td></tr>
            ) : (
              filteredParts.map(part => (
                <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {part.photo ? (
                        <img src={part.photo} className="w-12 h-12 rounded-lg mr-4 object-cover border border-slate-200" alt="part" />
                      ) : (
                        <div className="w-12 h-12 bg-slate-100 rounded-lg mr-4 flex items-center justify-center border border-slate-200"><Package size={24} className="text-slate-300"/></div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-900">{part.partName}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">P/N: {part.partNumber}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-800">{part.projectName}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center"><User size={12} className="mr-1" /> {part.author} ({part.date})</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-start space-y-1.5">
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{part.quantity} EA</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusColor(part.urgency)}`}>{part.urgency}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center flex-wrap gap-y-1">
                      {PART_PHASES.map((step, idx) => (
                        <div key={step} className="flex items-center">
                          <button disabled={currentUser.role === 'ENGINEER'} onClick={() => onUpdateStatus(part.id, step)} className={`text-[10px] px-2 py-1 rounded border transition-colors disabled:opacity-80 ${getStepClass(part.status, step)}`}>{step}</button>
                          {idx < PART_PHASES.length - 1 && <ChevronRight size={12} className="mx-0.5 text-slate-300" />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
                      <button onClick={() => onDeletePart(part)} className="text-slate-400 hover:text-red-600 transition-colors p-2"><Trash size={18} /></button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResourceListView({ engineers, projects, getStatusColor, TODAY, onAddClick, onEditClick, onDeleteClick, currentUser, t }) {
  const warningCount = engineers.filter(eng => { const expDate = new Date(eng.accessExpiry); return TODAY > expDate || (expDate - TODAY) / (1000 * 60 * 60 * 24) <= 30; }).length;
  
  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold text-slate-800">{t('인력 및 리소스 관리', 'Resource Management')}</h1></div>
        {currentUser.role === 'ADMIN' && (
          <button onClick={onAddClick} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center transition-colors"><User className="mr-2" size={16}/> {t('엔지니어 추가', 'Add Engineer')}</button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title={t('전체 엔지니어', 'Total Engineers')} value={engineers.length} icon={<Users size={24} className="text-blue-500"/>} />
        <StatCard title={t('현장 파견 인원', 'Dispatched')} value={engineers.filter(e => e.status === '현장 파견').length} icon={<HardHat size={24} className="text-purple-500"/>} />
        <StatCard title={t('본사 대기/복귀', 'At Office')} value={engineers.filter(e => e.status.includes('본사')).length} icon={<Building size={24} className="text-emerald-500"/>} />
        <StatCard title={t('출입증 만료 위험', 'Expiring Badges')} value={warningCount} icon={<UserCircle size={24} className="text-red-500"/>} color="border-red-200 bg-red-50" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-6">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('이름 / 소속', 'Name/Dept')}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('현재 상태 / 위치', 'Status/Location')}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('진행중인 배정 프로젝트', 'Assigned Projects')}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">{t('안전교육/출입증 만료일', 'Badge Expiry')}</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">{t('관리', 'Manage')}</th></tr></thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {engineers.map((eng) => {
              const assignedPrjs = projects.filter(p => p.manager.includes(eng.name.split(' ')[0]) && p.status !== '완료'); 
              const expDate = new Date(eng.accessExpiry); const isExpired = TODAY > expDate; const isWarning = !isExpired && (expDate - TODAY) / (1000 * 60 * 60 * 24) <= 30;
              return (
                <tr key={eng.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold mr-3">{eng.name.charAt(0)}</div><div><div className="text-sm font-bold text-slate-900">{eng.name}</div><div className="text-xs text-slate-500">{eng.dept} | {eng.role}</div></div></div></td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex flex-col items-start space-y-1.5"><span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-5 font-bold rounded-full ${getStatusColor(eng.status)}`}>{eng.status}</span><span className="text-xs font-medium text-slate-700 flex items-center"><MapPin size={12} className="text-slate-400 mr-1.5" /> {eng.currentSite}</span></div></td>
                  <td className="px-6 py-4">{assignedPrjs.length === 0 ? <span className="text-xs text-slate-400">-</span> : <div className="space-y-1">{assignedPrjs.map(p => <div key={p.id} className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-1 rounded">{p.name}</div>)}</div>}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`px-3 py-1.5 rounded-lg border ${isExpired ? 'bg-red-50 border-red-200 text-red-700' : isWarning ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'} flex items-center`}>
                        {isExpired ? <XCircle size={16} className="text-red-500 mr-2"/> : isWarning ? <AlertTriangle size={16} className="text-amber-500 mr-2"/> : <UserCircle size={16} className="text-slate-400 mr-2"/>}
                        <div className="flex flex-col"><span className="text-[10px] uppercase font-bold opacity-70 mb-0.5">Expiry Date</span><span className="text-sm font-bold">{eng.accessExpiry}</span></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {currentUser.role === 'ADMIN' && (
                      <>
                        <button onClick={() => onEditClick(eng)} className="text-slate-400 hover:text-indigo-600 transition-colors p-2"><Edit size={18} /></button>
                        <button onClick={() => onDeleteClick(eng)} className="text-slate-400 hover:text-red-600 transition-colors p-2"><Trash size={18} /></button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VersionHistoryView({ releases, onAddClick, onDeleteRelease, currentUser, t }) {
  const [filterType, setFilterType] = useState('ALL');
  const filteredReleases = useMemo(() => filterType === 'ALL' ? releases : releases.filter(r => r.type === filterType), [releases, filterType]);
  
  return (
    <div className="space-y-6 max-w-5xl mx-auto relative animate-[fadeIn_0.3s_ease-in-out]">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-bold text-slate-800">{t('버전 릴리즈 관리', 'Releases')}</h1></div>
        <div className="flex items-center space-x-2">
          {(currentUser.role === 'ADMIN' || currentUser.role === 'PM') && (
            <button onClick={onAddClick} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"><Plus size={16} className="mr-1" /> {t('새 버전 배포', 'New Release')}</button>
          )}
        </div>
      </div>
      <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200 inline-flex shadow-sm">
        {['ALL', 'HW', 'SW', 'FW'].map(type => <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${filterType === type ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}>{type === 'ALL' ? t('전체 보기', 'All') : `${type}`}</button>)}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 relative">
        <div className="absolute left-10 top-6 bottom-6 w-0.5 bg-slate-200 z-0"></div>
        <div className="space-y-6 relative z-10">
          {filteredReleases.length === 0 ? <div className="text-center py-10 text-slate-500">등록된 내역이 없습니다.</div> : filteredReleases.map(release => (
            <div key={release.id} className="flex items-start group">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 bg-white ${release.type === 'HW' ? 'border-amber-200 text-amber-500 bg-amber-50' : release.type === 'SW' ? 'border-blue-200 text-blue-500 bg-blue-50' : 'border-emerald-200 text-emerald-500 bg-emerald-50'}`}>
                 {release.type === 'HW' ? <HardDrive size={18}/> : release.type === 'SW' ? <Monitor size={18}/> : <Cpu size={18}/>}
              </div>
              <div className="ml-6 flex-1"><div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow"><div className="flex justify-between items-start mb-3"><div className="flex items-center space-x-3"><span className={`px-2.5 py-1 rounded text-xs font-black border ${release.type === 'HW' ? 'bg-amber-50 border-amber-200 text-amber-700' : release.type === 'SW' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{release.type}</span><h3 className="text-lg font-black text-slate-800">{release.version}</h3></div><div className="flex items-center space-x-4"><div className="text-right"><div className="text-sm font-bold text-slate-600 flex items-center justify-end"><CalendarDays size={14} className="mr-1.5 text-slate-400" /> {release.date}</div><div className="text-xs text-slate-500 mt-1 flex items-center justify-end"><User size={12} className="mr-1" /> {release.author}</div></div>
                {(currentUser.role === 'ADMIN') && <button onClick={() => onDeleteRelease(release)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash size={18} /></button>}
              </div></div><div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mt-2"><h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center"><FileText size={12} className="mr-1" /> Update Notes</h4><p className="text-sm text-slate-700 whitespace-pre-wrap">{release.description}</p></div></div></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TaskModal({ project, projectIssues, getStatusColor, onClose, onToggleTask, onAddTask, onEditTaskName, onDeleteTask, onUpdateDelayReason, onUpdateChecklistItem, onLoadDefaultChecklist, onAddChecklistItem, onDeleteChecklistItem, onUpdatePhase, onSignOff, calcAct, currentUser, t }) {
  const [activeModalTab, setActiveModalTab] = useState('tasks'); 
  const [newTaskName, setNewTaskName] = useState(''); 
  const [editingTaskId, setEditingTaskId] = useState(null); 
  const [editingTaskName, setEditingTaskName] = useState(''); 
  const [newChecklistCategory, setNewChecklistCategory] = useState('일반'); 
  const [newChecklistTask, setNewChecklistTask] = useState('');
  
  if (!project) return null;
  
  const actualProgress = calcAct(project.tasks); 
  const checklistCount = project.checklist ? project.checklist.length : 0; 
  const checklistCompleted = project.checklist ? project.checklist.filter(c => c.status === 'OK').length : 0; 
  const isReadyToSign = checklistCount > 0 && checklistCompleted === checklistCount;

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-2 md:p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-blue-50 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-lg font-bold text-blue-800 truncate">{project.name}</h2>
            <p className="text-xs text-blue-600 mt-1">{t('상세 관리', 'Details')}</p>
          </div>
          <button onClick={onClose} className="text-blue-400 hover:text-blue-600 p-2 shrink-0"><X size={20} /></button>
        </div>
        <div className="flex border-b border-slate-200 bg-white shrink-0 px-4 pt-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveModalTab('tasks')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center ${activeModalTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><ListTodo size={16} className="mr-1.5" /> {t('세부 일정', 'Tasks')}</button>
          <button onClick={() => setActiveModalTab('checklist')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center ${activeModalTab === 'checklist' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><CheckSquare size={16} className="mr-1.5" /> {t('디지털 검수표', 'Checklist')} ({checklistCompleted}/{checklistCount})</button>
          <button onClick={() => setActiveModalTab('issues')} className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap flex items-center ${activeModalTab === 'issues' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><AlertTriangle size={16} className="mr-1.5" /> {t('연관 이슈', 'Issues')} ({projectIssues.length})</button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-1 scroll-smooth bg-slate-50">
          {activeModalTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2"><span className="text-sm font-bold text-slate-700">{t('현재 실적 진척도', 'Actual Progress')}</span><span className="text-2xl font-black text-blue-600">{actualProgress}%</span></div>
              <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <span className="text-xs font-bold text-slate-500 mb-2 flex items-center">{t('현재 업무 단계:', 'Current Phase:')} <span className="ml-1 text-indigo-600 bg-white px-1.5 py-0.5 border border-indigo-200 rounded">{PROJECT_PHASES[project.phaseIndex || 0]}</span></span>
                <div className="overflow-x-auto pb-1 scroll-smooth"><ProjectPipelineStepper currentPhase={project.phaseIndex || 0} onUpdatePhase={onUpdatePhase} projectId={project.id} role={currentUser.role} /></div>
              </div>
              <div className="space-y-3">
                {project.tasks.map((task, index) => (
                  <div key={task.id} className={`flex items-start p-3 rounded-lg border shadow-sm ${task.isCompleted ? 'bg-slate-100 border-slate-200' : 'bg-white border-blue-100 hover:border-blue-300'} transition-colors ${currentUser.role !== 'CUSTOMER' ? 'cursor-pointer' : ''} group`} onClick={() => { if(currentUser.role !== 'CUSTOMER') onToggleTask(project.id, task.id)}}>
                    <div className="mr-3 md:mr-4 flex-shrink-0 mt-0.5">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.isCompleted ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                        {task.isCompleted && <CheckCircle size={16} className="text-white" />}
                      </div>
                    </div>
                    <div className="flex-1 w-full min-w-0">
                      {editingTaskId === task.id ? (
                        <div className="flex items-center space-x-2 mb-1" onClick={(e) => e.stopPropagation()}>
                          <input type="text" value={editingTaskName} onChange={(e) => setEditingTaskName(e.target.value)} className="flex-1 text-xs md:text-sm p-1.5 border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0" autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { onEditTaskName(project.id, task.id, editingTaskName); setEditingTaskId(null); } else if (e.key === 'Escape') setEditingTaskId(null); }} />
                          <button onClick={() => { onEditTaskName(project.id, task.id, editingTaskName); setEditingTaskId(null); }} className="text-[10px] md:text-xs bg-blue-600 text-white px-2 py-1.5 rounded font-bold shrink-0">{t('저장','Save')}</button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <p className={`text-xs md:text-sm font-bold pr-2 ${task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'}`}>Step {index + 1}. {task.name}</p>
                          {currentUser.role !== 'CUSTOMER' && (
                            <div className="opacity-100 md:opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0">
                              {!task.isCompleted && <button onClick={(e) => { e.stopPropagation(); setEditingTaskId(task.id); setEditingTaskName(task.name); }} className="text-slate-400 hover:text-blue-500 transition-colors p-1.5"><Edit size={14}/></button>}
                              <button onClick={(e) => { e.stopPropagation(); onDeleteTask(project.id, task.id); }} className="text-slate-400 hover:text-red-500 transition-colors p-1.5"><Trash size={14}/></button>
                            </div>
                          )}
                        </div>
                      )}
                      {!task.isCompleted && currentUser.role !== 'CUSTOMER' && <input type="text" placeholder={t("지연 사유 등 메모 (선택)", "Delay Reason/Notes (Optional)")} className="mt-2 w-full text-[10px] md:text-xs p-1.5 border border-slate-200 rounded bg-slate-50 text-slate-600 focus:outline-none focus:border-blue-400 focus:bg-white transition-colors" value={task.delayReason || ''} onChange={(e) => onUpdateDelayReason(project.id, task.id, e.target.value)} onClick={(e) => e.stopPropagation()} />}
                      {task.delayReason && <p className="mt-1 text-[10px] md:text-xs text-slate-400">{t('메모:', 'Note:')} {task.delayReason}</p>}
                    </div>
                  </div>
                ))}
              </div>
              {currentUser.role !== 'CUSTOMER' && (
                <div className="mt-4 flex gap-2 items-center">
                  <input type="text" placeholder={t("새로운 업무 입력...", "New task...")} className="flex-1 text-xs md:text-sm p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTaskName.trim()) { onAddTask(project.id, newTaskName.trim()); setNewTaskName(''); } }} />
                  <button onClick={() => { if(newTaskName.trim()) { onAddTask(project.id, newTaskName.trim()); setNewTaskName(''); } }} className="px-3 md:px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs md:text-sm font-bold rounded-lg transition-colors whitespace-nowrap shadow-sm">{t('추가', 'Add')}</button>
                </div>
              )}
            </div>
          )}
          {activeModalTab === 'checklist' && (
            <div className="space-y-4">
              <div className="bg-indigo-100 text-indigo-800 p-3 rounded-lg text-xs md:text-sm font-bold border border-indigo-200 mb-4 shadow-sm flex items-center justify-between"><span className="flex items-center"><Info size={16} className="mr-1.5" /> {t('현장 셋업 완료 전 필수 점검 항목입니다.', 'Mandatory checklist before sign-off.')}</span><span>{t('진행률', 'Progress')}: {Math.round((checklistCompleted/checklistCount)*100 || 0)}%</span></div>
              {(!project.checklist || project.checklist.length === 0) && (<div className="text-center py-8 bg-white rounded-xl border border-slate-200 shadow-sm"><p className="text-slate-500 text-sm mb-3">{t('등록된 검수 항목이 없습니다.', 'No checklist items.')}</p>
                {currentUser.role !== 'CUSTOMER' && <button onClick={() => onLoadDefaultChecklist(project.id)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm">{t('기본 검수표 불러오기', 'Load Default Checklist')}</button>}
              </div>)}
              <div className="space-y-3">
                {project.checklist && project.checklist.map(item => (
                  <div key={item.id} className={`bg-white p-3 rounded-xl border shadow-sm ${item.status === 'OK' ? 'border-emerald-200 bg-emerald-50/30' : item.status === 'NG' ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="inline-block bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1">{item.category}</span>
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-bold text-slate-800">{item.task}</p>
                          {!project.signOff?.signed && currentUser.role !== 'CUSTOMER' && (<button onClick={() => onDeleteChecklistItem(project.id, item.id)} className="text-slate-300 hover:text-red-500 p-1 ml-2 transition-colors shrink-0"><Trash size={14} /></button>)}
                        </div>
                      </div>
                      <div className="flex space-x-1 shrink-0 mt-2 md:mt-0">
                        <button disabled={project.signOff?.signed || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'Pending')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'Pending' ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'} disabled:opacity-50`}>{t('대기', 'Wait')}</button>
                        <button disabled={project.signOff?.signed || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'OK')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'OK' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-400 shadow-sm' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50'} disabled:opacity-50`}>OK</button>
                        <button disabled={project.signOff?.signed || currentUser.role === 'CUSTOMER'} onClick={() => onUpdateChecklistItem(project.id, item.id, 'NG')} className={`px-2 py-1 text-xs font-bold rounded border transition-colors ${item.status === 'NG' ? 'bg-red-50 text-red-700 border-red-300 ring-1 ring-red-400 shadow-sm' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'} disabled:opacity-50`}>NG</button>
                      </div>
                    </div>
                    {item.status !== 'OK' && !project.signOff?.signed && currentUser.role !== 'CUSTOMER' && (<input type="text" placeholder={t("점검 결과 특이사항 입력...", "Result note...")} className="mt-2 w-full text-xs p-1.5 border border-slate-200 rounded bg-white text-slate-700 focus:outline-none focus:border-indigo-400" value={item.note || ''} onChange={(e) => onUpdateChecklistItem(project.id, item.id, item.status, e.target.value)} />)}
                    {item.note && (<p className="mt-1.5 text-xs text-slate-500 bg-slate-100 p-1.5 rounded flex items-center"><PenTool size={12} className="mr-1" /> {item.note}</p>)}
                  </div>
                ))}
              </div>
              {!project.signOff?.signed && currentUser.role !== 'CUSTOMER' && (
                <div className="mt-4 flex gap-2 items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                  <select className="w-24 text-xs md:text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500" value={newChecklistCategory} onChange={(e) => setNewChecklistCategory(e.target.value)}>
                    <option value="일반">일반</option><option value="기구/반입">기구</option><option value="유틸리티">유틸</option><option value="소프트웨어">S/W</option><option value="공정/통신">공정</option>
                  </select>
                  <input type="text" placeholder={t("항목 직접 입력...", "New item...")} className="flex-1 text-xs md:text-sm p-2 border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500 min-w-0" value={newChecklistTask} onChange={(e) => setNewChecklistTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { onAddChecklistItem(project.id, newChecklistCategory, newChecklistTask); setNewChecklistTask(''); } }} />
                  <button onClick={() => { onAddChecklistItem(project.id, newChecklistCategory, newChecklistTask); setNewChecklistTask(''); }} className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs md:text-sm font-bold rounded-lg transition-colors whitespace-nowrap border border-indigo-200 shadow-sm">{t('추가', 'Add')}</button>
                </div>
              )}
              {project.signOff?.signed ? (
                <div className="mt-6 border-t-2 border-emerald-200 pt-5 animate-[fadeIn_0.3s_ease-in-out]">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                    <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                    <h4 className="font-bold text-emerald-800 mb-1">{t('고객사 검수 및 최종 승인 완료', 'Buy-off Completed & Signed')}</h4>
                    <p className="text-xs text-emerald-600 mb-3">{t('검수자:', 'By:')} <strong>{project.signOff.customerName}</strong> | {t('승인일자:', 'Date:')} {project.signOff.date}</p>
                    <div className="bg-white border border-slate-200 rounded-lg p-2 inline-block mb-4"><img src={project.signOff.signatureData} alt="전자서명" className="h-16 object-contain" /></div>
                    <div><button onClick={() => generatePDF(project, projectIssues, t)} className="inline-flex items-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg shadow-md transition-colors"><FileText size={16} className="mr-2"/> {t('최종 완료 보고서 (PDF) 인쇄/저장', 'Print/Save Buy-off Report (PDF)')}</button></div>
                  </div>
                </div>
              ) : isReadyToSign && (currentUser.role === 'CUSTOMER' || currentUser.role === 'ADMIN') ? (
                <SignaturePad onSign={(name, data) => onSignOff(project.id, name, data)} t={t} />
              ) : (
                <div className="mt-6 border-t-2 border-slate-200 pt-5 text-center p-4 bg-slate-100 rounded-xl"><p className="text-sm font-bold text-slate-500 flex items-center justify-center"><ShieldCheck size={16} className="mr-1.5 text-slate-400" />{currentUser.role === 'CUSTOMER' ? t('모든 검수 항목이 확인(OK)된 후 서명할 수 있습니다.', 'Sign-off available after all items are OK.') : t('고객사 계정으로 접속 시 전자 서명이 가능합니다.', 'Sign-off is available via Customer account.')}</p></div>
              )}
            </div>
          )}
          {activeModalTab === 'issues' && (
            <div className="space-y-4">
              {projectIssues.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl bg-white">{t('발생한 이슈가 없습니다.', 'No issues recorded.')}</div>
              ) : (
                <div className="space-y-3">
                  {projectIssues.map(issue => (
                    <div key={issue.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center">
                      {issue.photo && <div className="w-12 h-12 bg-slate-200 rounded-lg mr-3 shrink-0 overflow-hidden"><img src={issue.photo} className="w-full h-full object-cover" alt="이슈" /></div>}
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 mb-1.5">
                          <span className="text-[10px] font-bold text-slate-400">{issue.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(issue.severity)}`}>{issue.severity}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getStatusColor(issue.status)}`}>{issue.status}</span>
                        </div>
                        <span className="text-sm font-bold text-slate-800 truncate">{issue.title}</span>
                        <div className="text-xs text-slate-500 mt-1 flex justify-between"><span className="flex items-center"><User size={10} className="mr-1"/>{issue.author}</span><span>{issue.date}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="px-4 md:px-6 py-3 md:py-4 border-t border-slate-100 flex justify-end bg-white flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">{t('닫기', 'Close')}</button>
        </div>
      </div>
    </div>
  );
}

function IssueDetailModal({ issue, issuesList, onClose, onAddComment, onUpdateIssueStatus, getStatusColor, t }) {
  const [newComment, setNewComment] = useState('');
  const currentIssue = issuesList.find(i => i.id === issue?.id) || issue;
  if (!currentIssue) return null;
  const handleSubmit = (e) => { e.preventDefault(); if (newComment.trim()) { onAddComment(currentIssue.id, newComment.trim()); setNewComment(''); } };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-2 md:p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-4 md:px-6 py-4 md:py-5 border-b border-slate-200 flex justify-between items-start bg-slate-50 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center space-x-2 mb-2 md:mb-3">
              <span className="text-[10px] md:text-xs font-bold text-slate-500">{currentIssue.id}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] md:text-xs font-bold ${getStatusColor(currentIssue.severity)}`}>{currentIssue.severity}</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-slate-800 break-words leading-tight">{currentIssue.title}</h2>
            <p className="text-[10px] md:text-sm text-slate-500 mt-1.5 flex flex-wrap items-center gap-y-1">
              <span className="flex items-center"><Kanban size={14} className="mr-1" /> <span className="truncate max-w-[150px] md:max-w-none">{currentIssue.projectName}</span></span>
              <span className="mx-1 md:mx-2">|</span>
              <span className="flex items-center"><User size={14} className="mr-1" /> {currentIssue.author}</span>
              <span className="mx-1 md:mx-2">|</span>
              <span>{currentIssue.date}</span>
            </p>
            <div className="mt-4 pt-4 border-t border-slate-200 overflow-x-auto pb-1">
              <h3 className="text-[10px] md:text-xs font-bold text-slate-500 mb-2">{t('이슈 처리 단계', 'Issue Phase')}</h3>
              <div className="flex items-center space-x-1 bg-slate-200/50 p-1 rounded-lg inline-flex border border-slate-200 min-w-max">
                {ISSUE_PHASES.map((status) => (
                  <button key={status} onClick={() => onUpdateIssueStatus(currentIssue.id, status)} className={`px-3 md:px-4 py-1.5 text-[10px] md:text-sm font-bold rounded-md transition-all ${currentIssue.status === status ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/80'}`}>
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 shrink-0"><X size={24} /></button>
        </div>
        <div className="p-4 md:p-6 overflow-y-auto flex-1 bg-slate-100/50">
          {currentIssue.photo && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center"><ImageIcon size={16} className="text-slate-400 mr-2" /> {t('첨부 사진', 'Attached Photo')}</h3>
              <img src={currentIssue.photo} className="max-h-64 rounded-lg shadow-sm border border-slate-200 object-contain" alt="현장 첨부 이미지" />
            </div>
          )}

          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center"><MessageCircle size={18} className="text-blue-500 mr-2" /> {t('진행 상황 및 코멘트', 'Progress & Comments')} ({currentIssue.comments?.length || 0})</h3>
          <div className="space-y-4">
            {(!currentIssue.comments || currentIssue.comments.length === 0) ? (
              <div className="text-center py-10 text-slate-400 text-xs md:text-sm border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">{t('아직 등록된 진행 상황이 없습니다.', 'No comments registered yet.')}</div>
            ) : (
              currentIssue.comments.map(comment => (
                <div key={comment.id} className="bg-white p-3 md:p-4 rounded-xl border border-slate-200 shadow-sm relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-xs md:text-sm text-slate-800 flex items-center">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] md:text-xs mr-2">{comment.author.charAt(0)}</div>{comment.author}
                    </span>
                    <span className="text-[10px] md:text-xs text-slate-400">{comment.date}</span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 whitespace-pre-wrap ml-7 md:ml-8 leading-relaxed">{comment.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="p-3 md:p-4 border-t border-slate-200 bg-white flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input type="text" placeholder={t("해결 상황 입력...", "Enter update...")} className="flex-1 text-xs md:text-sm p-2.5 md:p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
            <button type="submit" disabled={!newComment.trim()} className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs md:text-sm font-bold rounded-lg transition-colors flex items-center shrink-0">
              <Send size={16} className="md:mr-1.5" /> <span className="hidden md:inline">{t('등록', 'Submit')}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ==============================================
// 6. 메인 컴포넌트
// ==============================================
function LoginScreen({ onLogin, lang, setLang, t }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    const user = MOCK_USERS.find(u => u.id === id && u.pw === pw);
    if (user) onLogin(user);
    else setError(t('아이디 또는 비밀번호가 올바르지 않습니다.', 'Invalid ID or Password.'));
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4">
        <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="flex items-center text-white bg-slate-800 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-slate-700 transition-colors">
          <Globe size={14} className="mr-1.5"/> {lang === 'ko' ? 'EN' : 'KO'}
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10 animate-[fadeIn_0.3s_ease-out]">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white text-2xl shadow-lg shadow-blue-500/30">E</div>
        </div>
        <h1 className="text-2xl font-black text-center text-slate-800 mb-2">EQ-PMS</h1>
        <p className="text-center text-slate-500 text-sm mb-8">{t('장비 프로젝트 셋업 관리 시스템', 'Equipment Project Management System')}</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">ID</label>
            <input type="text" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" value={id} onChange={e => setId(e.target.value)} placeholder="admin / pm / eng / client" required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Password</label>
            <input type="password" className="w-full p-3 border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" value={pw} onChange={e => setPw(e.target.value)} placeholder="1234" required />
          </div>
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold text-base shadow-lg hover:bg-blue-700 transition-transform active:scale-[0.98] mt-2">
            {t('로그인', 'Sign In')}
          </button>
        </form>

        <div className="mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p className="text-xs font-bold text-slate-500 mb-2">{t('테스트 계정 안내', 'Test Accounts')}</p>
          <ul className="text-[10px] space-y-1 text-slate-600">
            <li><strong className="text-slate-800">admin / 1234</strong> : {t('본사 관리자 (전체 권한)', 'Admin (Full Access)')}</li>
            <li><strong className="text-slate-800">pm / 1234</strong> : {t('현장 PM (프로젝트 관리)', 'Project Manager')}</li>
            <li><strong className="text-slate-800">eng / 1234</strong> : {t('엔지니어 (업무 확인/이슈 등록)', 'Setup Engineer')}</li>
            <li><strong className="text-slate-800">client / 1234</strong> : {t('고객사 (A전자 열람/서명 전용)', 'Client (Read/Sign only)')}</li>
          </ul>
        </div>
      </div>
      <div className="absolute w-full h-full inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900 z-0"></div>
    </div>
  );
}

function MobileIssueModal({ projects, onClose, onSubmit, t }) {
  const [formData, setFormData] = useState({ projectId: projects[0]?.id || '', title: '', severity: 'High', author: '박현장(본인)', alertEmail: '' });
  const [previewUrl, setPreviewUrl] = useState(null);
  const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { setPreviewUrl(URL.createObjectURL(file)); } };
  const handleSubmit = (e) => { e.preventDefault(); const submissionData = { ...formData }; if (previewUrl) submissionData.photo = previewUrl; onSubmit(submissionData); };

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
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('진행 중인 프로젝트', 'Project')}</label>
          <select required className="w-full p-3.5 border border-slate-300 rounded-xl bg-white text-base focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('이슈 내용 (상세)', 'Issue Details')}</label>
          <textarea required rows={4} className="w-full p-3.5 border border-slate-300 rounded-xl text-base resize-none focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}></textarea>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('알림 수신 이메일 (선택)', 'Alert Email (Optional)')}</label>
          <input type="email" className="w-full p-3.5 border border-slate-300 rounded-xl text-base focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" value={formData.alertEmail} onChange={e => setFormData({...formData, alertEmail: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('중요도 (본사 알림용)', 'Severity')}</label>
          <div className="flex space-x-2">
            {['High', 'Medium', 'Low'].map(level => (
              <button type="button" key={level} onClick={() => setFormData({...formData, severity: level})} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors shadow-sm ${formData.severity === level ? (level==='High'?'bg-red-500 text-white border-red-600':level==='Medium'?'bg-amber-500 text-white border-amber-600':'bg-emerald-500 text-white border-emerald-600') : 'bg-white text-slate-500 border-slate-300'}`}>{level}</button>
            ))}
          </div>
        </div>
        <div className="mt-6 pt-2">
          <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center">
            <Send size={18} className="mr-2" />{t('본사로 이슈 전송', 'Submit Issue')}
          </button>
        </div>
      </form>
    </div>
  );
}

function MobilePartModal({ projects, onClose, onSubmit, t }) {
  const [formData, setFormData] = useState({ projectId: projects[0]?.id || '', partName: '', partNumber: '', quantity: 1, urgency: 'Medium', author: '박현장(본인)' });
  const [previewUrl, setPreviewUrl] = useState(null);
  const handleImageChange = (e) => { const file = e.target.files[0]; if (file) { setPreviewUrl(URL.createObjectURL(file)); } };
  const handleSubmit = (e) => { e.preventDefault(); const submissionData = { ...formData }; if (previewUrl) submissionData.photo = previewUrl; onSubmit(submissionData); };

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-amber-500 text-white p-4 flex justify-between items-center shadow-md shrink-0">
        <h2 className="text-lg font-bold flex items-center"><Package size={18} className="mr-2" />{t('현장 자재/부품 청구', 'Part Request')}</h2>
        <button type="button" onClick={onClose}><X size={24} /></button>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col space-y-5 pb-20">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">{t('불량/필요 파트 사진 첨부', 'Attach Photo')}</label>
          {previewUrl ? (
            <div className="relative bg-slate-100 rounded-xl p-2 border border-slate-200">
              <img src={previewUrl} alt="Preview" className="w-full h-40 object-contain rounded-lg shadow-sm" />
              <button type="button" onClick={() => setPreviewUrl(null)} className="absolute top-4 right-4 bg-slate-900/70 text-white w-8 h-8 rounded-full shadow-md backdrop-blur-sm flex items-center justify-center"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex space-x-3 w-full">
              <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-amber-500 shadow-sm transition-colors active:bg-slate-50">
                <Camera size={28} className="mb-2 text-slate-400" /><span className="font-bold text-sm">{t('사진 촬영', 'Camera')}</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
              </label>
              <label className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-slate-300 rounded-xl cursor-pointer text-slate-500 hover:text-blue-500 shadow-sm transition-colors active:bg-slate-50">
                <Images size={28} className="mb-2 text-slate-400" /><span className="font-bold text-sm">{t('앨범 선택', 'Gallery')}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('진행 중인 프로젝트', 'Project')}</label>
          <select required className="w-full p-3.5 border border-slate-300 rounded-xl bg-white text-base focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none" value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('파트명 (품명)', 'Part Name')}</label>
            <input required type="text" className="w-full p-3.5 border border-slate-300 rounded-xl text-base focus:border-amber-500 focus:outline-none" value={formData.partName} onChange={e => setFormData({...formData, partName: e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('필요 수량', 'Quantity')}</label>
            <input required type="number" min="1" className="w-full p-3.5 border border-slate-300 rounded-xl text-base focus:border-amber-500 focus:outline-none font-bold text-blue-600" value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('도면번호 (Part Number)', 'Part Number')}</label>
          <input type="text" className="w-full p-3.5 border border-slate-300 rounded-xl text-base focus:border-amber-500 focus:outline-none font-mono" value={formData.partNumber} onChange={e => setFormData({...formData, partNumber: e.target.value})} />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('긴급도 (Urgency)', 'Urgency')}</label>
          <div className="flex space-x-2">
            {['High', 'Medium', 'Low'].map(level => (
              <button type="button" key={level} onClick={() => setFormData({...formData, urgency: level})} className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors shadow-sm ${formData.urgency === level ? (level==='High'?'bg-red-500 text-white border-red-600':level==='Medium'?'bg-amber-500 text-white border-amber-600':'bg-emerald-500 text-white border-emerald-600') : 'bg-white text-slate-500 border-slate-300'}`}>{level}</button>
            ))}
          </div>
        </div>
        <div className="mt-6 pt-2">
          <button type="submit" className="w-full bg-amber-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-transform flex items-center justify-center">
            <Send size={18} className="mr-2" />{t('본사로 발주 요청', 'Submit Request')}
          </button>
        </div>
      </form>
    </div>
  );
}

function DeleteConfirmModal({ type, item, onClose, onConfirm, t }) {
  if (!item) return null;
  let title = '', itemName = '', desc = '';
  if (type === 'project') { title = t('프로젝트 삭제', 'Delete Project'); itemName = item.name; desc = t('모든 이슈 내역이 함께 영구 삭제', 'All related issues will be permanently deleted'); } 
  else if (type === 'issue') { title = t('이슈 삭제', 'Delete Issue'); itemName = item.title; desc = t('코멘트가 영구 삭제', 'Comments and history will be permanently deleted'); } 
  else if (type === 'release') { title = t('버전 삭제', 'Delete Release'); itemName = item.version; desc = t('릴리즈 내역이 영구 삭제', 'The release note will be permanently deleted'); } 
  else if (type === 'engineer') { title = t('엔지니어 삭제', 'Delete Engineer'); itemName = item.name; desc = t('엔지니어 정보가 영구 삭제', 'Engineer information will be permanently deleted'); }
  else if (type === 'part') { title = t('자재 청구 삭제', 'Delete Part'); itemName = item.partName; desc = t('청구 기록이 영구 삭제', 'Part request history will be deleted'); }
  else if (type === 'site') { title = t('사이트 삭제', 'Delete Site'); itemName = item.fab; desc = t('제약사항 데이터가 영구 삭제', 'Infrastructure info will be permanently deleted'); }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center border border-slate-200">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100">
          <AlertTriangle size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {t('선택하신', 'Selected item')} <strong className="text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{itemName}</strong> 데이터와 <br/>
          <span className="text-red-500">{desc}</span>{t('됩니다.', 'will be deleted.')}<br/>
          {t('이 작업은 되돌릴 수 없습니다.', 'This action cannot be undone.')}
        </p>
        <div className="flex space-x-3">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl">{t('취소', 'Cancel')}</button>
          <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-sm">{t('삭제합니다', 'Delete')}</button>
        </div>
      </div>
    </div>
  );
}
export default function App() {
  const [tailwindReady, setTailwindReady] = useState(() => typeof window !== 'undefined' && !!window.tailwind);
  const [currentUser, setCurrentUser] = useState(null);
  const [lang, setLang] = useState('ko');
  const t = (ko, en) => lang === 'ko' ? ko : en;

  useEffect(() => {
    if (tailwindReady) return;
    const checkTailwind = setInterval(() => { if (window.tailwind) { setTailwindReady(true); clearInterval(checkTailwind); } }, 50);
    return () => clearInterval(checkTailwind);
  }, [tailwindReady]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMode, setIsMobileMode] = useState(false);
  
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [isSiteModalOpen, setIsSiteModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [isIssueDetailModalOpen, setIsIssueDetailModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionEditProject, setVersionEditProject] = useState(null);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isDailyReportOpen, setIsDailyReportOpen] = useState(false);
  const [isEngineerModalOpen, setIsEngineerModalOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);

  const [engineerToDelete, setEngineerToDelete] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [issueToDelete, setIssueToDelete] = useState(null);
  const [releaseToDelete, setReleaseToDelete] = useState(null);
  const [partToDelete, setPartToDelete] = useState(null);
  const [siteToDelete, setSiteToDelete] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [projects, setProjects] = useState([
    { id: 'PRJ-2026-001', domain: '반도체', name: 'A사 텍사스 Fab 신규 셋업', customer: 'A전자', site: 'US-Texas Fab2', startDate: '2026-03-01', dueDate: '2026-06-30', status: '진행중', manager: '김철수 PM', hwVersion: 'Rev.A', swVersion: 'v2.1.0', fwVersion: '1.05.00', phaseIndex: 5, notionLink: 'https://www.notion.so/', tasks: [...DOMAIN_TASKS['반도체'].map((t, i) => i < 3 ? {...t, isCompleted: true} : t)], checklist: [...DOMAIN_CHECKLIST['반도체'].map((c, i) => i < 3 ? {...c, id: Date.now()+i, status: 'OK'} : {...c, id: Date.now()+i})], signOff: null },
    { id: 'PRJ-2026-002', domain: '디스플레이', name: 'B사 평택 라인 장비 개조', customer: 'B반도체', site: 'KR-Pyeongtaek P3', startDate: '2026-01-15', dueDate: '2026-04-15', status: '마감임박', manager: '이영희 책임', hwVersion: 'Rev.B (Mod)', swVersion: 'v1.8.4', fwVersion: '1.04.12', phaseIndex: 5, notionLink: '', tasks: [...DOMAIN_TASKS['디스플레이'].map((t, i) => i < 5 ? {...t, isCompleted: true} : t)], checklist: [...DOMAIN_CHECKLIST['디스플레이'].map((c, i) => i < 4 ? {...c, id: Date.now()+10+i, status: 'OK'} : {...c, id: Date.now()+10+i})], signOff: null }
  ]);

  const [issues, setIssues] = useState([
    { id: 'ISS-001', projectId: 'PRJ-2026-001', projectName: 'A사 텍사스 Fab 신규 셋업', title: '파워 케이블 스펙 변경 필요', severity: 'Medium', status: '조치 진행 중', date: '2026-04-02', author: '이셋업 선임', alertEmail: '', comments: [{ id: 1, author: '박구매 책임', text: '대체 케이블 스펙 확인하여 현지 발주 넣었습니다.', date: '2026-04-03 09:30' }], photo: null },
    { id: 'ISS-002', projectId: 'PRJ-2026-002', projectName: 'B사 평택 라인 장비 개조', title: '소프트웨어 통신 에러 (SECS/GEM)', severity: 'High', status: '조치 완료', date: '2026-03-28', author: '박제어 책임', alertEmail: '', comments: [] },
  ]);

  const [releases, setReleases] = useState([{ id: 'REL-001', type: 'SW', version: 'v2.1.0', date: '2026-04-01', author: '최개발 선임', description: '에러 수정' }]);
  const [engineers, setEngineers] = useState([{ id: 'ENG-001', name: '김철수 PM', dept: '제조기술팀', role: 'Project Manager', currentSite: 'US-Texas Fab2', status: '현장 파견', accessExpiry: '2026-12-31' }, { id: 'ENG-002', name: '이영희 책임', dept: 'CS팀', role: '제어 엔지니어', currentSite: 'KR-Pyeongtaek P3', status: '현장 파견', accessExpiry: '2026-04-15' }, { id: 'ENG-003', name: '박지성 선임', dept: 'CS팀', role: '셋업 엔지니어', currentSite: 'KR-Gumi L8', status: '본사 복귀', accessExpiry: '2026-08-20' }]);
  const [parts, setParts] = useState([{ id: 'PRT-001', projectId: 'PRJ-2026-001', projectName: 'A사 텍사스 Fab 신규 셋업', partName: 'O-Ring', partNumber: 'OR-V-050', quantity: 10, urgency: 'High', status: '발주', date: '2026-04-02', author: '이셋업 선임', photo: null }]);
  const [sites, setSites] = useState([{ id: 'SIT-001', customer: 'A전자', fab: 'US-Texas Fab2', line: 'Ph 1 Cleanroom', power: '208V', pcw: '수압 4.0 kgf/cm2', gas: 'CDA 6kgf', limit: '최대 2.5T', note: '', date: '2026-04-01' }]);

  if (!tailwindReady) return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>Loading UI Framework...</div>;
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} lang={lang} setLang={setLang} t={t} />;

  const handleLogout = () => { setCurrentUser(null); setActiveTab('dashboard'); };
  const generateUniqueId = (prefix) => `${prefix}-${Date.now().toString().slice(-6)}`;
  const showToast = (msg) => { setToastMessage(msg); setTimeout(() => setToastMessage(''), 3000); };

  // 0. 에러 방지용 웹훅 주소 직접 선언
  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwVargrc_T8Gw-GJeqv1WtsmiRv5i62lhqJ60ut8aOjhAkBtDR8Ztl7cVfoHtmn4mfh3g/exec";

  // 1. 웹훅/알림 전송 함수
  const notifyWebhook = async (message, type = 'INFO') => {
    if(!WEBHOOK_URL) return;
    try { 
      await fetch(WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ text: `[EQ-PMS 알림: ${type}]\n${message}` }) }); 
    } catch (error) { 
      console.error('Webhook failed', error); 
    }
  };

  // 2. 이메일 알림창 및 웹훅 쏘게 복구된 이슈 등록 함수
  const handleAddIssue = async (newIssue) => {
    const selectedProject = projects.find(p => p.id === newIssue.projectId);
    const issueWithDetails = { ...newIssue, id: generateUniqueId('ISS'), projectName: selectedProject ? selectedProject.name : '알 수 없는 프로젝트', date: TODAY.toISOString().split('T')[0], status: '이슈 확인', comments: [] };
    
    setIssues([issueWithDetails, ...issues]); 
    setIsIssueModalOpen(false); 
    
    // 이메일 파라미터 확인 및 알림/웹훅 전송
    const targetEmail = newIssue.alertEmail ? newIssue.alertEmail : '기본 담당자(default@company.com)';
    notifyWebhook(`🚨 신규 이슈 등록: [${issueWithDetails.projectName}] ${issueWithDetails.title} (수신자: ${targetEmail})`, 'ISSUE');
    showToast(`이슈 등록 완료. [${targetEmail}]로 알림이 전송되었습니다.`);
  };

  const handleAddProject = async (newProject) => {
    const domainTasks = DOMAIN_TASKS[newProject.domain] || DOMAIN_TASKS['반도체'];
    const domainChecklist = DOMAIN_CHECKLIST[newProject.domain] || DOMAIN_CHECKLIST['반도체'];
    const tasks = JSON.parse(JSON.stringify(domainTasks));
    const checklist = domainChecklist.map((item, idx) => ({ ...item, id: Date.now() + idx }));
    const newData = [{ ...newProject, id: generateUniqueId('PRJ'), tasks, checklist, signOff: null }, ...projects];
    setProjects(newData); setIsProjectModalOpen(false); showToast('프로젝트가 추가되었습니다.');
  };

  const handleUpdatePhase = async (projectId, newPhaseIndex) => { setProjects(projects.map(p => p.id === projectId ? { ...p, phaseIndex: newPhaseIndex, status: newPhaseIndex === 6 ? '완료' : '진행중' } : p)); };
  const handleDeleteProject = async () => { if (!projectToDelete) return; setProjects(projects.filter(p => p.id !== projectToDelete.id)); setProjectToDelete(null); showToast('프로젝트가 삭제되었습니다.'); };
  
  const toggleTaskCompletion = (projectId, taskId) => { setProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted } : t) } : p)); };
  const handleAddTask = (projectId, taskName) => { setProjects(projects.map(p => p.id === projectId ? { ...p, tasks: [...p.tasks, { id: Date.now(), name: taskName, isCompleted: false, delayReason: '' }] } : p)); };
  const handleEditTaskName = (projectId, taskId, newName) => { if (!newName.trim()) return; setProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, name: newName.trim() } : t) } : p)); };
  const handleDeleteTask = (projectId, taskId) => { setProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p)); };
  const handleUpdateDelayReason = (projectId, taskId, reason) => { setProjects(projects.map(p => p.id === projectId ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, delayReason: reason } : t) } : p)); };
  const handleUpdateChecklistItem = (projectId, itemId, newStatus, newNote) => { setProjects(projects.map(p => p.id === projectId ? { ...p, checklist: p.checklist.map(c => c.id === itemId ? { ...c, status: newStatus, note: newNote !== undefined ? newNote : c.note } : c) } : p)); };
  const handleLoadDefaultChecklist = (projectId) => { setProjects(projects.map(p => { if (p.id !== projectId) return p; const domainChecklist = DOMAIN_CHECKLIST[p.domain] || DOMAIN_CHECKLIST['반도체']; return { ...p, checklist: domainChecklist.map((item, idx) => ({ ...item, id: Date.now() + idx })) }; })); showToast('기본 검수표가 불러와졌습니다.'); };
  const handleAddChecklistItem = (projectId, category, taskName) => { if (!taskName.trim()) return; setProjects(projects.map(p => p.id === projectId ? { ...p, checklist: [...(p.checklist || []), { id: Date.now(), category: category || '일반', task: taskName.trim(), status: 'Pending', note: '' }] } : p)); };
  const handleDeleteChecklistItem = (projectId, itemId) => { setProjects(projects.map(p => p.id === projectId ? { ...p, checklist: (p.checklist || []).filter(c => c.id !== itemId) } : p)); };
  const handleSignOff = async (projectId, customerName, signatureData) => { setProjects(projects.map(p => p.id === projectId ? { ...p, status: '완료', phaseIndex: 6, signOff: { signed: true, customerName, signatureData, date: new Date().toISOString().split('T')[0] } } : p)); showToast('✅ 최종 검수 및 서명이 완료되었습니다!'); };

  const handleAddPart = async (newPart) => { const selectedProject = projects.find(p => p.id === newPart.projectId); const partWithDetails = { ...newPart, id: generateUniqueId('PRT'), projectName: selectedProject ? selectedProject.name : t('알 수 없는 프로젝트', 'Unknown Project'), date: TODAY.toISOString().split('T')[0], status: '청구' }; setParts([partWithDetails, ...parts]); setIsPartModalOpen(false); showToast(t('자재 청구가 접수되었습니다.')); };
  const handleDeletePart = async () => { if (!partToDelete) return; setParts(parts.filter(p => p.id !== partToDelete.id)); setPartToDelete(null); showToast(t('자재 청구 내역이 삭제되었습니다.')); };
  const handleUpdatePartStatus = async (partId, newStatus) => { setParts(parts.map(p => p.id === partId ? { ...p, status: newStatus } : p)); };
  
  const handleAddSite = async (newSite) => { setSites(selectedSite ? sites.map(s => s.id === selectedSite.id ? { ...newSite, id: s.id, date: s.date } : s) : [{ ...newSite, id: generateUniqueId('SIT'), date: TODAY.toISOString().split('T')[0] }, ...sites]); setIsSiteModalOpen(false); showToast(t('사이트가 업데이트되었습니다.')); };
  const handleDeleteSite = async () => { if (!siteToDelete) return; setSites(sites.filter(s => s.id !== siteToDelete.id)); setSiteToDelete(null); showToast(t('사이트 환경 정보가 삭제되었습니다.')); };
  
  const handleAddRelease = async (newRelease) => { setReleases([{ ...newRelease, id: generateUniqueId('REL'), date: TODAY.toISOString().split('T')[0] }, ...releases]); setIsReleaseModalOpen(false); showToast(t('릴리즈 정보가 등록되었습니다.')); };
  const handleDeleteRelease = async () => { if (!releaseToDelete) return; setReleases(releases.filter(r => r.id !== releaseToDelete.id)); setReleaseToDelete(null); showToast(t('버전 이력이 삭제되었습니다.')); };
  
  const handleAddEngineer = async (engineerData) => { setEngineers(selectedEngineer ? engineers.map(e => e.id === selectedEngineer.id ? { ...engineerData, id: e.id } : e) : [{ ...engineerData, id: generateUniqueId('ENG') }, ...engineers]); setIsEngineerModalOpen(false); showToast(t('엔지니어 정보가 업데이트되었습니다.')); };
  const handleDeleteEngineer = async () => { if (!engineerToDelete) return; setEngineers(engineers.filter(e => e.id !== engineerToDelete.id)); setEngineerToDelete(null); showToast(t('엔지니어 정보가 삭제되었습니다.')); };
  
  const handleUpdateVersion = async (projectId, hwVersion, swVersion, fwVersion) => { setProjects(projects.map(p => p.id === projectId ? { ...p, hwVersion, swVersion, fwVersion } : p)); setIsVersionModalOpen(false); showToast(t('버전이 업데이트되었습니다.')); };
  const handleAddDailyReport = async (reportData) => { setIsDailyReportOpen(false); showToast(t('일일 보고서가 제출되었습니다.')); };
  
  const handleAddComment = async (issueId, text) => { setIssues(issues.map(issue => issue.id === issueId ? { ...issue, comments: [...(issue.comments || []), { id: Date.now(), author: currentUser.name, text, date: new Date().toLocaleString() }] } : issue)); };
  const handleUpdateIssueStatus = async (issueId, newStatus) => { setIssues(issues.map(i => i.id === issueId ? { ...i, status: newStatus } : i)); };
  const handleDeleteIssue = async () => { if (!issueToDelete) return; setIssues(issues.filter(i => i.id !== issueToDelete.id)); setIssueToDelete(null); showToast(t('이슈가 삭제되었습니다.')); };

  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-[300] flex items-center animate-[fadeIn_0.3s_ease-in-out] w-max font-bold text-sm">
        <CheckCircle size={18} className="mr-2 text-emerald-400" />{toastMessage}
      </div>
    );
  };

  if (isMobileMode) {
    return (
      <div className="flex flex-col h-screen bg-slate-100 font-sans text-slate-800 animate-[fadeIn_0.3s_ease-in-out]">
        {renderToast()}
        <div className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-20 shrink-0">
          <div className="flex items-center space-x-2"><div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-bold text-lg">E</div><div><h1 className="font-bold text-sm leading-tight">EQ-PMS</h1><p className="text-[10px] text-blue-300">{t('모바일 모드', 'Mobile Mode')}</p></div></div>
          <button onClick={() => setIsMobileMode(false)} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-full border border-slate-600 transition-colors shadow-sm flex items-center"><Monitor size={14} className="mr-1" /> PC화면</button>
        </div>

        <div className="flex-1 overflow-y-auto scroll-smooth p-4 pb-24 space-y-4">
          {activeTab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={() => setIsIssueModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Camera size={24} className="mb-2" /><span className="font-bold text-sm">{t('이슈 등록', 'Add Issue')}</span></button>
                <button onClick={() => setIsDailyReportOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><CheckSquare size={24} className="mb-2" /><span className="font-bold text-sm">{t('일일 보고', 'Daily Report')}</span></button>
                <button onClick={() => setIsPartModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Package size={24} className="mb-2" /><span className="font-bold text-sm">{t('자재 청구', 'Part Request')}</span></button>
                <button onClick={() => setActiveTab('sites')} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-md active:scale-95"><Database size={24} className="mb-2" /><span className="font-bold text-sm">{t('환경 정보', 'Site Info')}</span></button>
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-500 mb-3 ml-1">{t('나의 배정 현장 요약', 'My Assigned Projects')}</h2>
                <div className="space-y-3">
                  {projects.filter(p => p.status !== '완료').slice(0, 3).map(prj => (
                    <div key={prj.id} onClick={() => { setActiveTab('projects'); setSelectedProjectId(prj.id); }} className="bg-white p-4 rounded-xl shadow-sm border active:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(prj.status)}`}>{prj.status}</span><span className="text-[10px] text-slate-400 flex items-center"><Building size={12} className="mr-1" />{prj.customer}</span></div>
                      <h3 className="font-bold text-slate-800 text-base leading-tight mb-1">{prj.name}</h3>
                      <div className="flex justify-between items-center text-xs mt-3"><span className="font-medium text-slate-500">{t('셋업 진척도', 'Progress')}</span><span className="font-bold text-blue-600">{calcAct(prj.tasks)}%</span></div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${calcAct(prj.tasks)}%` }}></div></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
          {activeTab === 'issues' && <IssueListView issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsIssueModalOpen(true)} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onDeleteIssue={(issue) => setIssueToDelete(issue)} currentUser={currentUser} t={t} />}
          {activeTab === 'sites' && <SiteListView sites={sites} onAddClick={() => { setSelectedSite(null); setIsSiteModalOpen(true); }} onEditClick={(site) => { setSelectedSite(site); setIsSiteModalOpen(true); }} onDeleteClick={(site) => setSiteToDelete(site)} currentUser={currentUser} t={t} />}
        </div>

        <div className="bg-white border-t border-slate-200 flex justify-around p-2.5 fixed bottom-0 w-full z-20 pb-safe shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><LayoutDashboard size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('홈', 'Home')}</span></button>
          <button onClick={() => setActiveTab('projects')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'projects' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Kanban size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('프로젝트', 'Projects')}</span></button>
          <button onClick={() => setActiveTab('issues')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'issues' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><AlertTriangle size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('이슈', 'Issues')}</span></button>
          {currentUser.role !== 'CUSTOMER' && (
            <button onClick={() => setActiveTab('sites')} className={`flex flex-col items-center flex-1 py-1 transition-colors ${activeTab === 'sites' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}><Database size={20} className="mb-1" /><span className="text-[9px] font-bold">{t('인프라', 'Sites')}</span></button>
          )}
        </div>

        {/* Modals */}
        {isProjectModalOpen && <ProjectModal onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
        {isIssueModalOpen && <MobileIssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
        {isPartModalOpen && <MobilePartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
        {isDailyReportOpen && <DailyReportModal projects={projects} onClose={() => setIsDailyReportOpen(false)} onSubmit={handleAddDailyReport} t={t} />}
        {isSiteModalOpen && <SiteModal site={selectedSite} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
        {isTaskModalOpen && (
          <TaskModal project={projects.find(p => p.id === selectedProjectId)} projectIssues={issues.filter(i => i.projectId === selectedProjectId)} getStatusColor={getStatusColor} onClose={() => setIsTaskModalOpen(false)} onToggleTask={toggleTaskCompletion} onAddTask={handleAddTask} onEditTaskName={handleEditTaskName} onDeleteTask={handleDeleteTask} onUpdateDelayReason={handleUpdateDelayReason} onUpdateChecklistItem={handleUpdateChecklistItem} onLoadDefaultChecklist={handleLoadDefaultChecklist} onAddChecklistItem={handleAddChecklistItem} onDeleteChecklistItem={handleDeleteChecklistItem} onUpdatePhase={handleUpdatePhase} onSignOff={handleSignOff} calcAct={calcAct} currentUser={currentUser} t={t} />
        )}
        {isIssueDetailModalOpen && <IssueDetailModal issue={selectedIssue} issuesList={issues} onClose={() => setIsIssueDetailModalOpen(false)} onAddComment={handleAddComment} onUpdateIssueStatus={handleUpdateIssueStatus} getStatusColor={getStatusColor} t={t} />}
        {siteToDelete && <DeleteConfirmModal type="site" item={siteToDelete} onClose={() => setSiteToDelete(null)} onConfirm={handleDeleteSite} t={t} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen font-sans relative animate-[fadeIn_0.3s_ease-in-out] bg-slate-50">
      {renderToast()}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-slate-800 shrink-0"><div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3"><span className="text-white font-bold text-lg">E</span></div><span className="text-white font-bold text-lg tracking-wider">EQ-PMS</span></div>
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            <NavItem icon={<LayoutDashboard size={20} />} label={t('대시보드', 'Dashboard')} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavItem icon={<Kanban size={20} />} label={t('프로젝트 관리', 'Projects')} active={activeTab === 'projects'} onClick={() => setActiveTab('projects')} />
            <NavItem icon={<AlertTriangle size={20} />} label={t('이슈/펀치 관리', 'Issues')} active={activeTab === 'issues'} onClick={() => setActiveTab('issues')} />
            {currentUser.role !== 'CUSTOMER' && (
              <>
                <NavItem icon={<Wrench size={20} />} label={t('자재/스페어 파트', 'Parts')} active={activeTab === 'parts'} onClick={() => setActiveTab('parts')} />
                <NavItem icon={<Database size={20} />} label={t('사이트/유틸 마스터', 'Site Master')} active={activeTab === 'sites'} onClick={() => setActiveTab('sites')} />
                <NavItem icon={<Users size={20} />} label={t('인력/리소스 관리', 'Resources')} active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} />
                <NavItem icon={<GitCommit size={20} />} label={t('버전 릴리즈 관리', 'Releases')} active={activeTab === 'versions'} onClick={() => setActiveTab('versions')} />
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative min-w-0">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shadow-sm shrink-0">
            <div className="flex items-center text-slate-500 bg-slate-100 px-4 py-2 rounded-lg w-96"><Search size={18} className="mr-2" /><input type="text" placeholder={t("검색...", "Search...")} className="bg-transparent border-none outline-none w-full text-sm" /></div>
            <div className="flex items-center space-x-4">
              <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full text-xs font-bold transition-colors flex items-center shadow-sm hover:bg-slate-200"><Globe size={14} className="mr-1.5" /> {lang === 'ko' ? 'EN' : 'KO'}</button>
              <button onClick={() => setIsMobileMode(true)} className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-4 py-2 rounded-lg font-bold transition-colors flex items-center shadow-sm"><Smartphone size={16} className="mr-2" /> {t('모바일 현장 모드', 'Mobile Mode')}</button>
              <div className="flex items-center space-x-3 border-l border-slate-200 pl-4 ml-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">{currentUser.name.charAt(0)}</div>
                <div className="text-sm pr-2"><p className="font-semibold text-slate-700">{currentUser.name}</p><p className="text-[10px] text-slate-400">{currentUser.role}</p></div>
                <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 p-1"><LogOut size={18}/></button>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-8">
            {activeTab === 'dashboard' && <DashboardView projects={projects} issues={issues} engineers={engineers} getStatusColor={getStatusColor} calcExp={calcExp} calcAct={calcAct} t={t} />}
            {activeTab === 'projects' && <ProjectListView projects={projects} issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsProjectModalOpen(true)} onManageTasks={(id) => { setSelectedProjectId(id); setIsTaskModalOpen(true); }} onEditVersion={(prj) => { setVersionEditProject(prj); setIsVersionModalOpen(true); }} onDeleteProject={(prj) => setProjectToDelete(prj)} onUpdatePhase={handleUpdatePhase} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} calcExp={calcExp} calcAct={calcAct} currentUser={currentUser} t={t} />}
            {activeTab === 'issues' && <IssueListView issues={issues} getStatusColor={getStatusColor} onAddClick={() => setIsIssueModalOpen(true)} onIssueClick={(issue) => { setSelectedIssue(issue); setIsIssueDetailModalOpen(true); }} onDeleteIssue={(issue) => setIssueToDelete(issue)} currentUser={currentUser} t={t} />}
            {activeTab === 'parts' && <PartsListView parts={parts} getStatusColor={getStatusColor} onUpdateStatus={handleUpdatePartStatus} onDeletePart={(part) => setPartToDelete(part)} onAddClick={() => setIsPartModalOpen(true)} currentUser={currentUser} t={t} />}
            {activeTab === 'sites' && <SiteListView sites={sites} onAddClick={() => { setSelectedSite(null); setIsSiteModalOpen(true); }} onEditClick={(site) => { setSelectedSite(site); setIsSiteModalOpen(true); }} onDeleteClick={(site) => setSiteToDelete(site)} currentUser={currentUser} t={t} />}
            {activeTab === 'resources' && <ResourceListView engineers={engineers} projects={projects} getStatusColor={getStatusColor} TODAY={TODAY} onAddClick={() => { setSelectedEngineer(null); setIsEngineerModalOpen(true); }} onEditClick={(eng) => { setSelectedEngineer(eng); setIsEngineerModalOpen(true); }} onDeleteClick={(eng) => setEngineerToDelete(eng)} currentUser={currentUser} t={t} />}
            {activeTab === 'versions' && <VersionHistoryView releases={releases} onAddClick={() => setIsReleaseModalOpen(true)} onDeleteRelease={(release) => setReleaseToDelete(release)} currentUser={currentUser} t={t} />}
          </div>

          {/* Modals */}
          {isProjectModalOpen && <ProjectModal onClose={() => setIsProjectModalOpen(false)} onSubmit={handleAddProject} t={t} />}
          {isIssueModalOpen && <IssueModal projects={projects} onClose={() => setIsIssueModalOpen(false)} onSubmit={handleAddIssue} t={t} />}
          {isPartModalOpen && <PartModal projects={projects} onClose={() => setIsPartModalOpen(false)} onSubmit={handleAddPart} t={t} />}
          {isSiteModalOpen && <SiteModal site={selectedSite} onClose={() => setIsSiteModalOpen(false)} onSubmit={handleAddSite} t={t} />}
          {isTaskModalOpen && (
            <TaskModal project={projects.find(p => p.id === selectedProjectId)} projectIssues={issues.filter(i => i.projectId === selectedProjectId)} getStatusColor={getStatusColor} onClose={() => setIsTaskModalOpen(false)} onToggleTask={toggleTaskCompletion} onAddTask={handleAddTask} onEditTaskName={handleEditTaskName} onDeleteTask={handleDeleteTask} onUpdateDelayReason={handleUpdateDelayReason} onUpdateChecklistItem={handleUpdateChecklistItem} onLoadDefaultChecklist={handleLoadDefaultChecklist} onAddChecklistItem={handleAddChecklistItem} onDeleteChecklistItem={handleDeleteChecklistItem} onUpdatePhase={handleUpdatePhase} onSignOff={handleSignOff} calcAct={calcAct} currentUser={currentUser} t={t} />
          )}
          {isIssueDetailModalOpen && <IssueDetailModal issue={selectedIssue} issuesList={issues} onClose={() => setIsIssueDetailModalOpen(false)} onAddComment={handleAddComment} onUpdateIssueStatus={handleUpdateIssueStatus} getStatusColor={getStatusColor} t={t} />}
          {isVersionModalOpen && <VersionModal project={versionEditProject} onClose={() => setIsVersionModalOpen(false)} onSubmit={handleUpdateVersion} t={t} />}
          {isReleaseModalOpen && <ReleaseModal onClose={() => setIsReleaseModalOpen(false)} onSubmit={handleAddRelease} t={t} />}
          {isEngineerModalOpen && <EngineerModal engineer={selectedEngineer} onClose={() => setIsEngineerModalOpen(false)} onSubmit={handleAddEngineer} t={t} />}
          
          {projectToDelete && <DeleteConfirmModal type="project" item={projectToDelete} onClose={() => setProjectToDelete(null)} onConfirm={handleDeleteProject} t={t} />}
          {issueToDelete && <DeleteConfirmModal type="issue" item={issueToDelete} onClose={() => setIssueToDelete(null)} onConfirm={handleDeleteIssue} t={t} />}
          {releaseToDelete && <DeleteConfirmModal type="release" item={releaseToDelete} onClose={() => setReleaseToDelete(null)} onConfirm={handleDeleteRelease} t={t} />}
          {engineerToDelete && <DeleteConfirmModal type="engineer" item={engineerToDelete} onClose={() => setEngineerToDelete(null)} onConfirm={handleDeleteEngineer} t={t} />}
          {partToDelete && <DeleteConfirmModal type="part" item={partToDelete} onClose={() => setPartToDelete(null)} onConfirm={handleDeletePart} t={t} />}
          {siteToDelete && <DeleteConfirmModal type="site" item={siteToDelete} onClose={() => setSiteToDelete(null)} onConfirm={handleDeleteSite} t={t} />}
        </main>
      </div>
    </div>
  );
}