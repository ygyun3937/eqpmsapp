import React, { useState, memo } from 'react';
import { HelpCircle, Kanban, Users, AlertTriangle, LifeBuoy, GitCommit, ShieldCheck, Sparkles, Plane, FileText, X, ChevronRight, Info, Bell, ClipboardList, Building2, Mail } from 'lucide-react';

const Section = ({ title, children }) => (
  <div className="mb-5 last:mb-0">
    <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center"><ChevronRight size={14} className="text-indigo-500 mr-1" />{title}</h3>
    <div className="ml-5 space-y-1.5 text-[13px] text-slate-700 leading-relaxed">{children}</div>
  </div>
);

const Step = ({ n, children }) => (
  <div className="flex items-start">
    <span className="shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center mr-2 mt-0.5">{n}</span>
    <span className="flex-1">{children}</span>
  </div>
);

const Note = ({ children }) => (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 my-2 text-xs text-amber-800 flex items-start">
    <Info size={13} className="mr-1.5 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

const TABS = [
  { key: 'start', label: '시작하기', icon: HelpCircle },
  { key: 'project', label: '프로젝트', icon: Kanban },
  { key: 'team', label: '담당자/팀/출장', icon: Plane },
  { key: 'customer', label: '고객사/명함', icon: Building2 },
  { key: 'checklist', label: '검수표/Buy-off', icon: ShieldCheck },
  { key: 'extras', label: '추가 대응', icon: Sparkles },
  { key: 'resource', label: '인력/리소스', icon: Users },
  { key: 'issue', label: '이슈/AS', icon: AlertTriangle },
  { key: 'version', label: '버전 관리', icon: GitCommit },
  { key: 'weekly', label: '주간 업무 보고', icon: ClipboardList },
  { key: 'email', label: '메일 송부', icon: Mail },
  { key: 'export', label: '보고서/Excel', icon: FileText },
  { key: 'roles', label: '권한별 기능', icon: LifeBuoy },
  { key: 'changelog', label: '업데이트 내역', icon: Bell },
];

const HelpModal = memo(function HelpModal({ onClose, t }) {
  const [tab, setTab] = useState('start');

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-in-out]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-indigo-50 flex-shrink-0">
          <div className="flex items-center">
            <HelpCircle size={20} className="text-indigo-600 mr-2" />
            <div>
              <h2 className="text-lg font-bold text-indigo-800">{t('사용자 가이드', 'User Guide')}</h2>
              <p className="text-xs text-indigo-600 mt-0.5">{t('MAK-PMS 주요 기능 사용 안내', 'MAK-PMS feature guide')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2"><X size={20} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측 탭 */}
          <aside className="w-44 border-r border-slate-200 bg-slate-50 overflow-y-auto shrink-0">
            <nav className="p-2 space-y-0.5">
              {TABS.map(tb => {
                const Icon = tb.icon;
                const active = tab === tb.key;
                return (
                  <button key={tb.key} onClick={() => setTab(tb.key)} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center transition-colors ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                    <Icon size={14} className="mr-1.5 shrink-0" />
                    {tb.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* 본문 */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {tab === 'start' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('시작하기', 'Getting Started')}</h2>

                <button
                  type="button"
                  onClick={() => setTab('changelog')}
                  className="mb-5 w-full text-left bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg p-3 flex items-center gap-2 transition-colors"
                >
                  <Bell size={14} className="text-indigo-600 shrink-0" />
                  <span className="text-xs text-indigo-800">
                    <strong>{t('업데이트 내역', "What's New")}</strong> — {t('v1.0 베타 이후 추가/개선된 기능 모아보기', 'Recently added & improved features')}
                  </span>
                  <ChevronRight size={14} className="ml-auto text-indigo-600 shrink-0" />
                </button>

                <Section title="로그인">
                  <Step n={1}>관리자가 발급한 ID/비밀번호로 로그인합니다.</Step>
                  <Step n={2}>최초 로그인 시 비밀번호 변경이 강제될 수 있습니다.</Step>
                  <Step n={3}>로그인 후 우측 상단 키 아이콘으로 비밀번호를 변경할 수 있습니다.</Step>
                </Section>
                <Section title="권한 종류">
                  <p>· <strong>본사 관리자(ADMIN)</strong>: 모든 기능 + 사용자 관리 + 검수 사인 취소</p>
                  <p>· <strong>현장 PM(PM)</strong>: 프로젝트/이슈/자재/AS 전반 + 담당자 변경</p>
                  <p>· <strong>엔지니어(ENGINEER)</strong>: 본인 배정 프로젝트의 진행 상황 입력</p>
                  <p>· <strong>고객사(CUSTOMER)</strong>: 본인 회사 프로젝트 조회 + 요청 등록 + 검수 서명</p>
                </Section>
                <Section title="사용자 직급 (관리자)">
                  <p>사용자 추가/수정 시 <strong>직급</strong> 필드 입력 가능 (선택).</p>
                  <p>· 사원 / 주임 / 대리 / 과장 / 차장 / 부장 / 이사 / 상무 / 전무 / 대표 자동완성</p>
                  <p>· 자유 입력도 가능 (예: 책임 매니저)</p>
                  <p>· 사용자 관리 테이블에 이름 옆에 자동 표시되어 호칭 식별이 쉬워집니다</p>
                </Section>
                <Section title="모바일/PC 모드">
                  <p>화면 폭 768px 미만은 자동으로 모바일 모드. 헤더의 모드 전환 버튼으로 수동 변경도 가능합니다.</p>
                </Section>
                <Section title="사이드바 펼치기/접기">
                  <p>좌측 사이드바 하단의 <strong>"메뉴 접기"</strong> 버튼으로 메뉴를 아이콘만 보이게 축소할 수 있습니다.</p>
                  <p>· 컨텐츠 영역이 넓어져 가로 스크롤이 줄어듭니다 (특히 프로젝트 관리 등 표가 큰 페이지).</p>
                  <p>· 접힌 상태에서 아이콘에 마우스를 올리면 메뉴 이름이 툴팁으로 표시됩니다.</p>
                  <p>· 설정은 브라우저에 저장되어 다음 접속 시에도 유지됩니다.</p>
                </Section>
                <Section title="알림 센터 (헤더의 종 아이콘)">
                  <p>우측 상단의 <strong>🔔 종 아이콘</strong>에서 회사 전체의 신규 등록 활동을 한눈에 볼 수 있습니다.</p>
                  <p>· 포함 항목: <strong>공유 노트 / 신규 이슈 / 고객 요청 / AS / 버전 업데이트 / 출장 / 추가 작업</strong></p>
                  <p>· 미확인 건수가 빨간 뱃지로 표시되고, 항목 클릭 시 해당 프로젝트/이슈로 바로 이동합니다.</p>
                  <p>· "모두 읽음" 버튼으로 일괄 처리 가능하며, 마지막 본 시각은 사용자별로 저장됩니다.</p>
                  <p>· 필터 칩(전체/미확인/공유노트/이슈/고객요청/AS/버전)으로 필요한 종류만 빠르게 볼 수 있습니다.</p>
                </Section>
                <Section title="대시보드 KPI 카드 5개 — 모두 클릭 가능">
                  <p>대시보드 상단 카드 5장은 모두 클릭하여 전용 팝업으로 전체 리스트 확인:</p>
                  <p>· <strong>미해결 이슈</strong> (orange) — 심각도순 이슈 팝업</p>
                  <p>· <strong>지연·위험</strong> (rose) — 위험 점수순 프로젝트 팝업</p>
                  <p>· <strong>임박 마일스톤 (30일)</strong> (amber) — D-day 순 마일스톤 팝업</p>
                  <p>· <strong>고객 요청 미처리</strong> (cyan) — 긴급도순(High/Medium/Low) 팝업, 클릭 시 해당 프로젝트의 고객요청 탭으로</p>
                  <p>· <strong>평균 진척률 (진행중)</strong> (emerald) — 실적/계획 delta + 4버킷 분포(0-25/25-50/50-75/75-100) + 계획 위치 마커. 클릭 시 진행중 프로젝트 전체 리스트</p>
                </Section>
                <Section title="대시보드 — 이슈 / AS 통합 위젯 (우측)">
                  <p>대시보드 우측 위젯은 상하 2단 분할:</p>
                  <p>· <strong>상단 — 미해결 이슈</strong>: severity 가로 스택 막대 + 최근 3건 (헤더 행 클릭 시 전체 이슈 팝업)</p>
                  <p>· <strong>하단 — AS 미완료</strong>: 유형(긴급출동/정기점검/부품교체/불량수리/보증수리) 막대 + 최근 3건 (헤더 행 클릭 시 긴급출동 우선 정렬 팝업)</p>
                  <p>· <strong>AS는 KPI 카드가 아닌 이 위젯에서 추적</strong> — 회사 입장의 critical 지표지만 KPI 카드 자리는 5개로 한정</p>
                </Section>
                <Section title="대시보드 간트 — 색상 / 마일스톤 ◆ 의미">
                  <p>대시보드 "전체 프로젝트 일정" 간트의 색·기호는 다음과 같이 읽으세요. 차트 상단 <strong>범례 줄</strong>에 항상 동일한 안내가 표시됩니다.</p>
                  <p><strong>막대 (프로젝트 상태)</strong></p>
                  <p className="ml-4">· <span className="inline-block w-3 h-2 align-middle rounded-sm bg-blue-500 mx-0.5"></span> 파랑 = <strong>진행중</strong> (정상)</p>
                  <p className="ml-4">· <span className="inline-block w-3 h-2 align-middle rounded-sm bg-amber-500 mx-0.5"></span> 노랑 = <strong>마감임박</strong> 상태인 프로젝트 (납기까지 여유가 적음)</p>
                  <p className="ml-4">· <span className="inline-block w-3 h-2 align-middle rounded-sm bg-red-500 mx-0.5"></span> 빨강 = <strong>이슈발생</strong> 상태</p>
                  <p className="ml-4">· <span className="inline-block w-3 h-2 align-middle rounded-sm bg-emerald-500 mx-0.5"></span> 초록 = <strong>완료</strong></p>
                  <p className="ml-4">· 한 막대의 좌측(진한 색)은 <strong>지금까지 경과한 기간</strong>, 우측(60% 투명)은 <strong>남은 예정 기간</strong>을 의미합니다.</p>
                  <p><strong>마일스톤 ◆ 다이아몬드</strong></p>
                  <p className="ml-4">· <strong>긴급도 우선 색상 (D-day가 종류 색상보다 우선)</strong></p>
                  <p className="ml-8">- 빨간 ◆ = <strong>D-7 이내 임박</strong> (긴급)</p>
                  <p className="ml-8">- 노란 ◆ = <strong>D-30 이내 임박</strong> (주의)</p>
                  <p className="ml-4">· <strong>D-30 초과 + 미래</strong>는 종류별 색상으로 표시</p>
                  <p className="ml-8">- 핑크 ◆ = <strong>단계(Phase)</strong> 마일스톤 (단계 편집에서 별 토글)</p>
                  <p className="ml-8">- 보라 ◆ = <strong>셋업 작업</strong> 마일스톤</p>
                  <p className="ml-8">- 파랑 ◆ = <strong>프로젝트 납기일(due date)</strong></p>
                  <p className="ml-4">· <strong>지난 마일스톤은 40% 흐림</strong> 처리 — 한눈에 미래/과거 구분</p>
                  <p className="ml-4">· 다이아몬드에 <strong>마우스를 올리면(hover)</strong> 이름·종류·날짜·D-N이 툴팁으로 표시됩니다.</p>
                </Section>
                <Section title="회의록 — 빠른 / 상세 모드 + 다중 파일">
                  <p>· 프로젝트 상세 → <strong>"회의록"</strong> 탭. 평소엔 <strong>"+ 새 회의록 작성"</strong> 버튼만 노출 (리스트 즉시 보기). 클릭 시 폼 펼침, 등록 후 자동 접힘.</p>
                  <p>· <strong>빠른 모드</strong>: 본문 + 한줄 요약 + 첨부 — 미팅 메모 빨리 남길 때</p>
                  <p>· <strong>상세 모드</strong>: 회의 일시(datetime) + 참석자(쉼표 구분) + 논의 내용 + <strong>결정사항</strong> + <strong>액션 아이템</strong> + 한줄 요약 + 첨부 — 정식 회의록 양식</p>
                  <p>· <strong>다중 파일 업로드</strong>: 드래그앤드롭/클릭으로 여러 개 한 번에. 파일별 인덱스/진행률 표시 (`2/3 · 45%`)</p>
                  <p>· 첨부 파일은 Drive의 <code className="bg-slate-100 px-1 rounded text-[11px]">[프로젝트]/회의록</code> 폴더에 자동 저장</p>
                  <p>· <strong>등록된 회의록 = 타임라인 브랜치</strong> — 좌측 amber 세로선 + 캘린더 스타일 날짜 노드(월/일/요일, 신선도 색상). 데시보드의 회의록 모달도 동일 패턴.</p>
                </Section>
                <Section title="대시보드 — 회의록 모달 (분석/회의록 분리)">
                  <p>대시보드 헤더에서 <strong>고급 분석 / 회의록 버튼 분리</strong>. 회의록 모달은 <strong>프로젝트별 그룹</strong>으로 묶여 표시:</p>
                  <p>· 프로젝트 헤더 (인디고 strip) + 그 안의 회의록 = amber 타임라인 브랜치</p>
                  <p>· <strong>프로젝트별 접기/펴기</strong> — 기본은 모두 접힘. 헤더 클릭으로 펼침. 우측 ↗ 버튼은 해당 프로젝트 회의록 탭으로 점프.</p>
                  <p>· 우측 상단 "전체 펼치기 / 전체 접기" 토글 (프로젝트 2개 이상일 때)</p>
                  <p>· 검색 / 프로젝트 / 작성자 필터 지원</p>
                </Section>
                <Section title="참고 자료 (명세서·도면 / 회의록 제외)">
                  <p>프로젝트 상세 → <strong>"참고 자료"</strong> 탭에서 명세서·도면·기타 자료를 업로드합니다 (<strong>회의록은 회의록 탭에서 별도 관리</strong>).</p>
                  <p>· 업로드 전 <strong>카테고리 선택</strong>(명세서 / 도면 / 기타) → Drive의 <code className="bg-slate-100 px-1 rounded text-[11px]">[루트]/[고객사]/[프로젝트]/[카테고리]</code> 하위 폴더로 자동 분류</p>
                  <p>· 목록 화면에서 카테고리 필터 칩으로 그룹별 보기 가능</p>
                  <p>· 단일 파일 최대 18MB (GAS 한도). 큰 파일은 Drive에 직접 올리고 링크를 공유하세요.</p>
                  <p>· <strong>관리자 사전 작업</strong>: [시스템 설정 → Google Drive 연동]에서 루트 폴더 등록 + 연결 테스트 필수.</p>
                </Section>
                <Section title="사이트 추가 스펙 (케이블 두께/길이 등)">
                  <p>사이트/유틸리티 마스터는 <strong>Power + 특이사항</strong>을 기본으로 두고, 그 외 모든 항목은 <strong>"추가 스펙"</strong>에 자유롭게 등록합니다.</p>
                  <p>· 충방전기: 케이블 두께(SQ), 케이블 길이(m), 단상/3상, 차단기 용량 등</p>
                  <p>· 항목명에는 자주 쓰는 라벨이 자동완성(datalist)으로 추천됩니다.</p>
                  <p>· 등록 후에도 인라인 수정/삭제 가능 (사이트 수정 모달).</p>
                </Section>
                <Note>모든 변경 사항은 자동으로 Google Sheets DB에 저장됩니다. 일부 변경은 활동 이력에 자동으로 기록됩니다.</Note>
              </>
            )}

            {tab === 'project' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('프로젝트 관리', 'Projects')}</h2>
                <Section title="프로젝트 생성">
                  <Step n={1}><strong>좌측 메뉴 → 프로젝트 관리 → 새 프로젝트</strong> 클릭</Step>
                  <Step n={2}>도메인(반도체/디스플레이/2차전지)을 선택하면 셋업 일정과 검수표가 자동 세팅됩니다.</Step>
                  <Step n={3}>담당자(메인 PM)는 인력/리소스에 등록된 엔지니어 중에서 선택합니다.</Step>
                </Section>
                <Section title="단계(Phase)">
                  <p>기본 8단계: <strong>영업/수주 → 설계 → 구매/자재 → 제조/조립 → 출하 → 현장 셋업 → 워런티 → 완료</strong></p>
                  <p>· 검수 사인 시 자동으로 <strong>워런티</strong> 단계로 진입합니다.</p>
                  <p>· 마지막 단계(예: 완료)로 변경하면 진짜 완료 처리됩니다.</p>
                  <p>· 단계 칩을 클릭해 임의 단계로 이동할 수 있습니다.</p>
                </Section>
                <Section title="단계 자유 편집 + 단계별 일정 (PM 이상)">
                  <p>프로젝트마다 단계 구성과 <strong>단계별 시작/종료일</strong>을 자유롭게 편집할 수 있습니다.</p>
                  <p>· 셋업 일정 탭의 단계 칩 옆 <strong>"단계 편집"</strong> 버튼 → 모달</p>
                  <p>· 이름 변경, 단계 추가/삭제, 위/아래 순서 변경 가능</p>
                  <p>· <strong>단계마다 시작일/종료일 직접 지정</strong> (간트차트에 즉시 반영)</p>
                  <p>· <strong>"균등 분배"</strong> 버튼: 프로젝트 시작~종료를 단계 수로 자동 분배</p>
                  <p>· <strong>"일정 비우기"</strong>: 모든 단계 일정 초기화 → 간트차트는 균등 분배 폴백</p>
                  <p>· 표준 8단계로 초기화 버튼 제공</p>
                  <p>· 마지막 단계 = 자동 "완료" 처리 단계로 인식</p>
                  <p>· 간트차트에서 일정이 직접 지정된 단계는 "지정" 배지로 구분 표시</p>
                </Section>
                <Section title="프로젝트 정보 수정">
                  <p>리스트의 <strong>프로젝트명 또는 고객사/사이트 셀</strong>을 클릭하면 수정 모달이 열립니다 (ADMIN/PM만 가능).</p>
                  <p>이름·고객사·사이트·일정·담당자 모두 수정 가능합니다.</p>
                  <p>· <strong>산업군(도메인) 수정은 관리자(ADMIN) 전용</strong> — 잘못 입력했을 때 변경 가능 (활동 로그에 변경 이력 자동 기록)</p>
                </Section>
                <Section title="2차전지 장비 스펙 (사이클러 / EOL)">
                  <p>산업군이 <strong>2차전지 사이클러</strong> 또는 <strong>2차전지 EOL</strong>인 프로젝트는 추가 스펙 입력 가능:</p>
                  <p>· <strong>전압 / 전류 / 사양</strong> 3가지 필드 (예: 5V / 100A / 256ch 파우치셀)</p>
                  <p>· 프로젝트 생성 시점에 입력 가능, 이후 정보 수정에서도 변경 가능</p>
                  <p>· 프로젝트 리스트의 산업군 배지 옆에 보라색 배지로 자동 표시</p>
                </Section>
                <Section title="일정 미정 (TBD)">
                  <p>· 시작일/납기일 옆 <strong>"미정"</strong> 체크박스 → 일정 비워두고 등록 가능</p>
                  <p>· 산업군 특성상 납기 등 세부일정이 정해지지 않은 채 진행하는 케이스 지원</p>
                  <p>· 프로젝트 리스트에서는 "미정" 글자가 호박색 이탤릭으로 강조 표시됩니다</p>
                  <p>· 간트차트는 일정 미정 프로젝트를 안내 박스/배지로 표시하고 다른 프로젝트의 차트 범위 계산에서 자동 제외</p>
                  <p>· 추후 실제 일정이 확정되면 정보 수정에서 체크 해제 후 날짜 입력</p>
                </Section>
                <Section title="장비 코드 관리">
                  <p>프로젝트마다 포함된 <strong>장비 코드/모델/일련번호</strong>를 자유롭게 등록할 수 있습니다.</p>
                  <p>· 프로젝트 정보 수정 모달의 <strong>"장비 코드"</strong> 섹션에서 코드 + 장비명 + 비고로 추가/수정/삭제</p>
                  <p>· 장비 코드만 입력해도 등록 가능 (Enter로 빠르게 추가)</p>
                  <p>· 프로젝트 리스트에 파란 배지로 4개까지 노출, 그 이상은 "+N" 표시</p>
                  <p>· ADMIN/PM만 편집 가능</p>
                </Section>

                <Section title="프로젝트 리스트 셀 — 관계자 칩 (엔드유저/설비업체/사이트)">
                  <p>프로젝트명 셀 아래에 <strong>관계자 칩 3개</strong>가 표시됩니다 — 각 칩은 [아이콘 + 역할 라벨 + 이름 + 부가배지] 한 덩어리:</p>
                  <p>· <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded text-[10px] font-bold">🏢 엔드유저: 이름</span> (인디고) — 사이트 소유자 + 등록 담당자 수</p>
                  <p>· <span className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded text-[10px] font-bold">🏢 설비업체: 이름</span> (보라) — 장비 제조사 + 등록 담당자 수</p>
                  <p>· <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-bold">💾 사이트: 이름</span> (에메랄드) — Fab/Line + ⚡ Power 표시</p>
                  <p>각 칩 클릭 → 해당 popover로 상세 정보 + 담당자 명함 5개 + 상세 페이지 진입 버튼.</p>
                </Section>

                <Section title="프로젝트 리스트 필터 (통합)">
                  <p>리스트 상단 우측 <strong>"필터/검색"</strong> 버튼을 클릭하면 통합 패널이 열립니다.</p>
                  <p>· <strong>검색</strong> — 프로젝트명·고객사·엔드유저·설비업체·사이트·담당자·산업군·<strong>장비 코드 + 장비명</strong> 모두 한번에 검색</p>
                  <p>· <strong>산업군 / 담당자 필터</strong> — 드롭다운으로 선택</p>
                  <p>· 활성 필터 개수가 버튼에 뱃지로 표시. 패널 하단 [초기화] 버튼으로 모두 해제.</p>
                </Section>
                <Section title="간트차트 보기">
                  <p>프로젝트 관리 우측 상단의 <strong>리스트 / 간트차트</strong> 토글로 전환합니다.</p>
                  <p>· <strong>단계별 탭</strong>: 각 프로젝트가 한 행, 막대는 8단계 색 분할(완료 = 진하게 / 현재 = 70% opacity / 예정 = 흐림). 막대 외곽선이 프로젝트 색으로 식별</p>
                  <p>· <strong>셋업 일정 탭</strong>: 모든 프로젝트의 셋업 작업을 프로젝트별 그룹으로 묶어 표시. 그룹 헤더는 프로젝트 색상 배경 + 좌측 색상 띠</p>
                  <p>· <strong>오늘 표시</strong>: 빨간 점선 + "▼ 오늘" 알약 라벨, 헤더 위 별도 공간에 배치되어 날짜를 가리지 않음</p>
                  <p>· <strong>마일스톤(SOP)</strong>: 막대 대신 빨간 ◆ 다이아몬드 + 종료일 라벨</p>
                  <p>· <strong>출장 일정</strong>: 인라인 간트 상단에 인디고 막대로 자동 표시 (담당자 + 출장 일자)</p>
                </Section>
                <Section title="간트 줌 / 휠 / 자동 스크롤">
                  <p>· <strong>휠 = 줌</strong> (0.5x ~ 4x), <strong>Shift+휠 = 가로 이동</strong></p>
                  <p>· 우측 상단 ZoomIn/Out/오늘 버튼도 제공. "오늘" 버튼 클릭 시 today-1개월 위치로 점프</p>
                  <p>· 차트 진입 시 자동으로 today-1개월 위치로 스크롤되어 현재/근미래에 집중</p>
                  <p>· 좌측 단계명/작업명 칸은 가로 스크롤과 무관하게 항상 보이고, 월/일 헤더는 세로 스크롤 시 위에 고정(sticky-top)</p>
                </Section>
                <Section title="간트 프로젝트 다중 필터">
                  <p>간트 뷰 좌상단의 <strong>"프로젝트 필터"</strong> 버튼 클릭 → 체크박스 드롭다운</p>
                  <p>· 패널 안에 검색창(이름/고객/사이트/담당자), <strong>전체 선택 / 전체 해제</strong> 토글, 개별 체크박스</p>
                  <p>· 부분 선택 상태에서는 <strong>"전체 보기로 초기화"</strong> 버튼 표시</p>
                  <p>· 단계별/셋업 일정 양쪽에 동일하게 적용</p>
                </Section>
                <Section title="단계 편집에서 마일스톤 (SOP) 표시">
                  <p>단계 편집 모달의 단계 행에 <strong>"마일스톤"</strong> 별 토글 추가 (PM 이상)</p>
                  <p>· 켜면 간트차트에서 해당 단계가 일반 막대 대신 빨간 ◆ 다이아몬드 + 종료일 (SOP) 라벨로 표시됨</p>
                  <p>· 셋업 작업도 별도로 마일스톤 토글 가능 — 셋업 일정 탭의 작업 편집 영역에서</p>
                </Section>
              </>
            )}

            {tab === 'team' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('담당자/팀/출장 일정', 'Team & Trips')}</h2>
                <Section title="통합 모달 진입">
                  <p>프로젝트 리스트의 <strong>담당자 셀</strong>을 클릭하면 메인 PM 변경 / 추가 인력 / 출장 일정을 한 모달에서 모두 관리할 수 있습니다.</p>
                </Section>
                <Section title="① 메인 담당자">
                  <Step n={1}>현재 담당자 확인</Step>
                  <Step n={2}>인력 select에서 새 담당자 선택 + 사유 기록 → 담당자 변경</Step>
                  <Step n={3}>변경 이력은 모달 하단에서 확인</Step>
                </Section>
                <Section title="② 추가 인력 (멀티 배정)">
                  <p>한 프로젝트에 여러 엔지니어를 배정할 수 있습니다. 체크박스 토글로 즉시 반영됩니다.</p>
                  <p>여기서 배정된 엔지니어는 출장 일정 등록 시 인력 풀에 자동 포함됩니다.</p>
                </Section>
                <Section title="③ 출장 일정">
                  <Step n={1}>인력 풀 = 메인 PM + 추가 인력</Step>
                  <Step n={2}>주담당 엔지니어 선택 → <strong>동행 엔지니어(다중 체크박스)</strong> 선택 → 출발일/복귀일/메모 입력</Step>
                  <Step n={3}>한 사람이 같은 프로젝트에 <strong>여러 번 출장</strong> 등록 가능</Step>
                </Section>
                <Section title="④ 동행자 처리">
                  <p>주담당 외에 <strong>함께 출장 가는 엔지니어</strong>를 다중 선택할 수 있습니다.</p>
                  <p>· 주담당과 중복 선택 불가 (자동 제외)</p>
                  <p>· 메일(신청서·보고서)에 동행자 명단 자동 표시 — 제목에 "외 N명" 추가</p>
                  <p>· 동행으로 간 출장은 <strong>동행자 본인의 활동 이력</strong>에도 "(동행)" 태그로 표시</p>
                  <p>· HR 출장 통계에서 "자주 동행하는 사람" 페어링 분석에 활용</p>
                </Section>
                <Section title="⑤ 출장 등록 후 수정 (이력 자동 기록)">
                  <Step n={1}>등록된 출장 카드 우측의 <strong>연필 아이콘</strong> 클릭 → 인력 / 동행자 / 출발일 / 복귀일 / 메모 수정</Step>
                  <Step n={2}>변경 사유 입력 (선택)</Step>
                  <Step n={3}>저장 시 변경 전/후 값과 사유, 수정자, 일시가 <strong>수정 이력</strong>에 자동 기록됩니다 (동행자 변경도 추적)</Step>
                  <Step n={4}>카드의 <strong>"수정 이력 (N)"</strong> 토글로 전체 변경 내역 확인 가능</Step>
                </Section>
                <Note>출장 일정은 인력/리소스 화면과 대시보드에 자동으로 출장 상태(현장 파견 / 출장 예정 / 복귀 N일 전 등)로 반영됩니다. 수정 이력은 활동 로그(TRIP_UPDATE)에도 함께 남습니다.</Note>
              </>
            )}

            {tab === 'customer' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('고객사 정보 / 명함 관리', 'Customers & Business Cards')}</h2>
                <Section title="페이지 진입 — 사이드바 → 고객사 관리">
                  <p>고객사 마스터를 별도 페이지에서 관리합니다. <strong>한 담당자가 여러 사이트를 담당</strong>하는 케이스를 자연스럽게 처리하기 위해 사이트와 분리된 별도 엔티티로 운영합니다.</p>
                </Section>

                <Section title="① 고객사 등록 (관리자)">
                  <Step n={1}>우측 상단 <strong>"새 고객사 등록"</strong> 클릭</Step>
                  <Step n={2}>좌측 <strong>기본 정보</strong>: 고객사명 / 산업군 / 대표 전화 / 주소 / 메모</Step>
                  <Step n={3}>우측 <strong>"담당자 추가"</strong> 버튼으로 명함 정보 입력 → 카드 자동 렌더</Step>
                  <Step n={4}>저장 시 같은 이름의 미연결 프로젝트·사이트가 <strong>자동으로 연결</strong>됨</Step>
                </Section>

                <Section title="② 명함 카드 — 정보 입력만으로 자동 디자인">
                  <p>실물 명함 이미지를 올리는 대신, 정보를 입력하면 시스템이 명함 카드 디자인으로 렌더링합니다.</p>
                  <p>입력 필드:</p>
                  <p>· <strong>이름·직책·부서</strong> (이름 필수)</p>
                  <p>· <strong>이메일 / 사무실 전화 / 모바일</strong></p>
                  <p>· <strong>담당 사이트 (다중 선택)</strong> — 한 담당자가 여러 사이트 담당 가능</p>
                  <p>· <strong>메모</strong> (전결 권한, 보고 라인 등)</p>
                  <p>카드 hover 시 <strong>수정/삭제</strong> 아이콘이 우상단에 나타납니다.</p>
                </Section>

                <Section title="③ 자동 발견 — 미등록 고객사 일괄 등록">
                  <p>이미 프로젝트·사이트에 고객사명이 텍스트로 입력돼 있다면, 페이지 상단 amber 배너에 <strong>"X개의 미등록 고객사가 발견됐습니다"</strong>가 표시됩니다.</p>
                  <p><strong>"한 번에 등록"</strong> 버튼 클릭 시 모두 고객사로 등록되고, 동시에 프로젝트·사이트의 <code className="bg-slate-100 px-1 rounded text-[11px]">customerId</code>가 자동으로 채워집니다 — 기존 텍스트는 보존되므로 데이터 손실 없습니다.</p>
                </Section>

                <Section title="④ 프로젝트·사이트 모달 — 드롭다운 선택">
                  <p>고객사가 1개 이상 등록되면 프로젝트 생성/수정과 사이트 모달의 <strong>고객사 필드가 드롭다운으로 전환</strong>됩니다.</p>
                  <p>· 드롭다운에서 선택 시 자동으로 customerId 연결</p>
                  <p>· <strong>"-- 직접 입력 --"</strong> 옵션을 선택하면 기존처럼 텍스트 직접 입력 가능 (마스터에 없는 일회성 고객사 등)</p>
                  <p>· 직접 입력 상태에서 텍스트만 있는 경우 <strong>amber "미연결"</strong> 뱃지로 시각적 표시</p>
                </Section>

                <Section title="⑤ 엔드유저 / 설비업체 — 한 프로젝트에 두 역할 동시 연결">
                  <p>한 프로젝트가 <strong>엔드유저</strong>(예: SK하이닉스 — 사이트 소유자)와 <strong>설비업체</strong>(예: ASML — 장비 제조사) 모두에 동시에 속할 수 있습니다.</p>
                  <p>· 프로젝트 생성/수정 모달의 고객사 드롭다운이 <strong>엔드유저</strong> + <strong>설비업체</strong> 2개로 분리</p>
                  <p>· 고객사 카드에서 "엔드유저 프로젝트" / "설비업체 프로젝트" 섹션이 별도로 표시 — 한쪽 연결해도 다른쪽 풀리지 않음</p>
                  <p>· 기존 데이터(<code className="bg-slate-100 px-1 rounded text-[11px]">customerId</code>)는 자동으로 엔드유저로 마이그레이션됩니다</p>
                </Section>

                <Section title="⑥ 고객사 카드 정보 / 통계">
                  <p>각 고객사 카드는 다음 4가지 통계를 함께 보여줍니다:</p>
                  <p>· <strong>담당자 명함 수</strong> (회색)</p>
                  <p>· <strong>연관 사이트 수</strong> (초록)</p>
                  <p>· <strong>엔드유저 프로젝트 수</strong> (파랑)</p>
                  <p>· <strong>설비업체 프로젝트 수</strong> (보라)</p>
                  <p>주요 담당자(상위 2명)는 카드 하단에 미리보기로 표시되며, 검색은 고객사명·담당자명·이메일·전화 모두 가능합니다.</p>
                </Section>

                <Section title="⑦ 삭제 정책 — 안전한 연결 해제">
                  <p>고객사를 삭제해도 <strong>연결됐던 프로젝트·사이트는 사라지지 않습니다</strong>.</p>
                  <p>· customerId만 해제 → 기존 customer 텍스트만 남음 (미연결 상태)</p>
                  <p>· 명함(담당자) 정보는 함께 삭제됩니다</p>
                </Section>

                <Note>마이그레이션 정책: 기존에 텍스트로만 들어가 있던 고객사 정보는 <strong>그대로 보존</strong>되며, 같은 이름의 고객사가 신규 등록되거나 "한 번에 등록"으로 처리되면 자동으로 customerId가 채워집니다.</Note>
              </>
            )}

            {tab === 'checklist' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('검수표 / Buy-off', 'Checklist & Buy-off')}</h2>
                <Section title="검수표 작성">
                  <Step n={1}>프로젝트 상세 → <strong>검수표</strong> 탭</Step>
                  <Step n={2}>도메인별 기본 항목이 자동으로 들어갑니다 (없으면 "기본 검수표 불러오기")</Step>
                  <Step n={3}>각 항목을 OK / NG / 대기로 표시. NG 시 특이사항 입력</Step>
                  <Step n={4}>항목 자유롭게 추가/삭제 가능</Step>
                </Section>
                <Section title="고객사 서명 (Buy-off)">
                  <Step n={1}>모든 항목이 OK가 되면 서명 영역이 활성화됩니다</Step>
                  <Step n={2}>고객사 계정으로 로그인 또는 ADMIN으로 대리 서명</Step>
                  <Step n={3}>서명 후 자동으로 워런티 단계 진입</Step>
                </Section>
                <Section title="ADMIN 권한 — 사후 수정/사인 취소">
                  <p>· Buy-off 후에도 ADMIN은 검수 항목을 수정할 수 있습니다.</p>
                  <p>· 사인이 잘못된 경우 <strong>"사인 취소"</strong> 버튼으로 서명 데이터 삭제 가능 (단계는 "현장 셋업"으로 자동 롤백).</p>
                  <p>· 모든 변경은 활동 이력에 SIGN_CANCEL 등으로 기록됩니다.</p>
                </Section>
                <Section title="최종 보고서 PDF">
                  <p>Buy-off 완료 후 "최종 완료 보고서 (PDF) 인쇄/저장" 버튼으로 PDF 생성. 고객사 송부용으로 사용하세요.</p>
                </Section>
              </>
            )}

            {tab === 'extras' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('추가 대응 작업', 'Extras')}</h2>
                <Section title="언제 사용?">
                  <p>검수 완료 후 고객사 요청에 따라 <strong>기능 추가 / 개선 / 버그 수정 / UI 변경</strong> 등을 추적할 때 사용합니다.</p>
                  <p>셋업 일정과 분리되어 있어 워런티 단계의 변경사항을 명확하게 관리할 수 있습니다.</p>
                </Section>
                <Section title="등록 방법">
                  <Step n={1}>프로젝트 상세 → <strong>추가 대응</strong> 탭</Step>
                  <Step n={2}>유형(기능 추가/개선/버그/UI/공정 튜닝) + 요청자 + 작업 내용 + 예정일 입력</Step>
                  <Step n={3}>등록된 작업의 상태를 대기 → 검토중 → 진행중 → 완료/반려로 업데이트</Step>
                </Section>
                <Note>고객 요청 탭은 단순 요청 기록용, 추가 대응 탭은 실제 개발/구현 작업 추적용으로 구분됩니다.</Note>
              </>
            )}

            {tab === 'resource' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('인력/리소스 관리', 'Resources')}</h2>
                <Section title="엔지니어 등록">
                  <Step n={1}>좌측 메뉴 → 인력/리소스 관리 → "엔지니어 추가"</Step>
                  <Step n={2}>이름 / 직급 / 부서 / 현재 위치 / 수동 상태 입력</Step>
                  <Step n={3}>활성 프로젝트 체크박스로 배정</Step>
                </Section>
                <Section title="활동 이력 (담당자별 통합 타임라인)">
                  <Step n={1}>인력/리소스 리스트 우측 <strong>시계 아이콘</strong> 클릭 → 모달</Step>
                  <Step n={2}>출장 등록/수정, 이슈 등록/수정, 공유 노트, 버전 등록, AS 처리, 고객 요청, 메인 PM 변경 이력이 시간순으로 통합 집계</Step>
                  <Step n={3}>필터 칩으로 종류별 필터, 상단 검색창으로 내용/프로젝트 검색</Step>
                  <p className="mt-1 text-[11px] text-slate-500">매칭 기준은 엔지니어 이름. 본인 명의로 등록되었거나 본인이 수정한 항목, <strong>본인이 동행으로 간 출장 "(동행)"</strong>, <strong>본인이 공동 처리한 AS "(공동)"</strong>도 자동 집계됩니다.</p>
                </Section>
                <Section title="자격 정보 관리 (출입증/안전교육/비자)">
                  <Step n={1}>리스트의 <strong>"자격/만료" 셀</strong> 클릭 → 자격 관리 모달</Step>
                  <Step n={2}>3 탭(출입증/안전교육/비자)에서 각각 추가/삭제</Step>
                  <Step n={3}>한 사람이 여러 출입증 / 여러 안전교육 / 여러 비자를 가질 수 있습니다 (예: A사 출입증, B사 출입증)</Step>
                  <Step n={4}><strong>안전교육</strong>은 만료기간이 없는 상시 교육도 있어 <strong>만료일 비워두기</strong> 가능 (카드에 "상시 (만료없음)" 배지 표시)</Step>
                </Section>
                <Section title="자동 알림 (만료/임박)">
                  <p>· 만료된 항목은 <strong>빨간 배지</strong>, 30일 이내 임박은 <strong>노란 배지</strong>로 자동 표시</p>
                  <p>· 대시보드 인력/리소스 요약 카드에서 위험 인력을 한눈에 확인</p>
                  <p>· 비자 상태가 "필요" 또는 "만료"면 비자 이슈로 카운트</p>
                  <p>· 만료일이 비어 있는 안전교육(상시)은 만료/임박 카운트에서 자동으로 제외됩니다</p>
                </Section>
                <Section title="출장 일정 = 자동 반영">
                  <p>프로젝트에서 등록한 출장 일정이 인력 화면에 <strong>현장 파견 / 출장 예정</strong>으로 자동 반영됩니다 (D-Day 표시).</p>
                </Section>
                <Section title="페이지 한눈에 보기 — 3컬럼 + 알림 (대시보드 모달 동기화)">
                  <p>페이지 상단에 대시보드 인력/리소스 상세 모달과 <strong>같은 풍부한 레이아웃</strong>을 그대로 가져왔습니다:</p>
                  <p>· <strong>6장 통계</strong> — 전체 / 가용 / 현장 파견 / 출장 예정 / 자격 만료 / 비자 이슈</p>
                  <p>· <strong>3컬럼 그리드</strong></p>
                  <p className="ml-4">- <strong>현장별 인력 배치</strong>: 사이트별 그룹 카드(파견 인원 + 복귀 D-day)</p>
                  <p className="ml-4">- <strong>출장 일정</strong>: 출장 예정(D-7 우선 강조) + 복귀 임박(30일 이내)</p>
                  <p className="ml-4">- <strong>가용 인력 풀</strong>: 출장 일정 없는 엔지니어 (이름 + 직급 + 부서 + "대기" 배지)</p>
                  <p>· <strong>인력 알림 (풀 폭)</strong> — 출입증/안전교육 만료·임박 + 비자 이슈를 카드로 한눈에 (정상이면 emerald 안내)</p>
                </Section>
                <Section title="8주 가용성 히트맵 (모달)">
                  <p>· 페이지 헤더 우측 <strong>"8주 가용성"</strong> 버튼 → 모달로 8주 히트맵 열림</p>
                  <p>· 히트맵: 엔지니어×주차 격자, 셀에 일수 + 사이트 약어(예: <code className="bg-slate-100 px-1 rounded text-[11px]">5/1~5/5(5일) 사이트A</code>), 부하 적은 순으로 자동 정렬</p>
                  <p>· "다음달 셋업 누구 보낼까" 의사결정 시점에만 모달로 열어보면 됨</p>
                  <p>· Excel 추출 시에는 그대로 3시트(엔지니어 / 가용 풀 / 8주 히트맵)로 포함 — 정보 손실 없음</p>
                </Section>
                <Section title="★ 출장 통계 (HR) 탭 — 누가 어디로 얼마나 갔는지">
                  <p>페이지 상단 <strong>탭 토글</strong>로 "가용성·현황" ↔ <strong>"출장 통계 (HR)"</strong> 전환.</p>
                  <p><strong>기간 프리셋</strong>: 이번 달 / 이번 분기 / 올해 / 직접 지정 (시작·종료 날짜)</p>
                  <p><strong>관점 토글 3종</strong>:</p>
                  <p className="ml-4">- <strong>전체 목록</strong>: 기간 내 모든 출장 (출발/복귀/일수/주담당/동행자/사이트/프로젝트)</p>
                  <p className="ml-4">- <strong>인력별</strong>: 엔지니어별 출장 횟수·총 일수·자주 간 사이트·자주 동행한 사람</p>
                  <p className="ml-4">- <strong>사이트별</strong>: 사이트별 연인원·총 일수·실인원·다녀간 사람 명단</p>
                  <p><strong>요약 카드 5장</strong>: 총 출장 건수 / 연인원 / 연인일 / 최다 출장자 / 최다 사이트</p>
                  <p>· <strong>주담당 + 동행자 모두 집계</strong> — 동행 출장도 본인 인력 통계에 포함됨</p>
                  <p>· "이번 달 김PM 어디 갔나" "A전자 사이트에 누가 다녀갔나" "김PM은 주로 누구랑 가나" 같은 HR 의사결정 지원</p>
                </Section>
              </>
            )}

            {tab === 'issue' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('이슈 / AS 관리', 'Issues & AS')}</h2>
                <Section title="이슈 등록">
                  <Step n={1}>좌측 메뉴 → 이슈/펀치 관리 → "현장 이슈 등록"</Step>
                  <Step n={2}>또는 모바일 모드에서 사진 첨부와 함께 빠르게 등록 가능</Step>
                  <Step n={3}>중요도(High/Medium/Low) 별로 자동 색상 분류</Step>
                </Section>
                <Section title="이슈 제목/담당자 수정 (관리자 전용)">
                  <Step n={1}>이슈 상세 모달 우측 상단 <strong>"수정"</strong> 버튼 (ADMIN만 표시)</Step>
                  <Step n={2}>제목 / 담당자(작성자) 수정 + 변경 사유(선택) 입력</Step>
                  <Step n={3}>저장 시 변경 전/후 값과 사유, 수정자, 일시가 <strong>수정 이력</strong>에 자동 기록</Step>
                  <Step n={4}>제목 영역의 <strong>"수정 이력 (N)"</strong> 토글로 전체 변경 내역 확인</Step>
                  <p className="mt-1 text-[11px] text-slate-500">활동 로그(ISSUE_UPDATE)에도 함께 남아 프로젝트 이력에서 추적할 수 있습니다.</p>
                </Section>
                <Section title="AS 통합 관리 (신규)">
                  <p>좌측 메뉴 <strong>"AS 통합 관리"</strong> — 전체 프로젝트의 AS 내역을 한 화면에서 조회 (AS 부서용).</p>
                  <p>· 검색 + <strong>HW/SW 분류 토글</strong> + 프로젝트/유형/상태 4중 필터</p>
                  <p>· 카드에서 프로젝트명 클릭 시 해당 프로젝트로 점프</p>
                  <p>· 상태는 분류별로 단계가 다름 (HW: 접수→출동→조치→완료 / SW: 접수→분석→개발→적용→검증→완료)</p>
                </Section>
                <Section title="AS 분류 — HW(현장 출동형) / SW(원격 패치형) 분리">
                  <p>한 프로젝트에서도 <strong>장비 고장 출동</strong>과 <strong>SW 패치 요청</strong>은 처리 흐름이 완전히 다르기 때문에 분류를 나눠 단계를 분기시켰습니다.</p>
                  <p>· <strong>HW</strong> (인디고 배지) — 현장 출동형. 유형: 정기점검 / 긴급출동 / 부품교체 / 불량수리 / 보증수리. 단계: <strong>접수 → 출동 → 조치 → 완료</strong> (4단계)</p>
                  <p>· <strong>SW</strong> (시안 배지) — 원격 패치형. 유형: 버그 수정 / 기능 개선 / 성능 튜닝 / 설정 변경 / 데이터 복구 / 보안 패치. 단계: <strong>접수 → 분석 → 개발 → 적용 → 검증 → 완료</strong> (6단계)</p>
                  <p>· 등록 시 분류 선택 → 그에 맞는 유형 select와 상태 칩이 자동 적용됨</p>
                  <p>· SW는 증상 칸에 <strong>재현 절차/빈도/영향 범위/로그 위치</strong>를, 조치 칸에 <strong>원인 분석/패치 버전/적용 결과</strong>를 적도록 placeholder가 가이드합니다.</p>
                  <p>· 통합 관리 페이지의 stat 카드는 HW/SW 별도 집계, 통합 진행 중(접수·완료 외) 카운트를 보여줍니다.</p>
                  <p className="mt-1 text-[11px] text-slate-500">기존 레코드는 분류 미지정이지만 자동으로 HW로 간주됩니다.</p>
                </Section>
                <Section title="AS 등록 UX — 작성 버튼 펼침 + 첨부 + 타임라인 (회의록과 동일 테마)">
                  <p>회의록 탭과 동일한 흐름·스킨으로 통일했습니다.</p>
                  <p>· <strong>평소엔 폼이 접혀 있고</strong>, 상단의 <code className="bg-slate-100 px-1 rounded text-[10px]">[새 HW AS 작성]</code> / <code className="bg-slate-100 px-1 rounded text-[10px]">[새 SW AS 작성]</code> 큰 버튼을 누르면 펼쳐집니다.</p>
                  <p>· 펼친 폼 안에서도 HW/SW 토글이 가능 — 분류를 바꾸면 유형 select·placeholder·테마 색상이 즉시 따라옵니다.</p>
                  <p>· <strong>첨부 파일</strong>: HW는 현장 조치 사진/보고서/부품 사진, SW는 에러 스크린샷/로그 파일/패치 스니펫 등 다중 첨부. 드래그&드롭 + 클릭 모두 지원. (Drive 연동 필수, 파일당 18MB 한도)</p>
                  <p>· <strong>증상 칸에 Ctrl+V</strong>로 클립보드 이미지를 직접 붙여넣으면 자동으로 첨부 파일 목록에 추가됩니다 (스크린샷 캡처 워크플로 최적화).</p>
                  <p>· 등록 완료 후 폼은 자동으로 다시 접힙니다 — 카테고리는 유지되어 연속 등록이 가능합니다.</p>
                  <p>· <strong>리스트</strong>는 회의록과 같은 <strong>타임라인 브랜치</strong> 형태 — 좌측 보라색 세로 라인 위에 카테고리 색(HW=인디고 / SW=시안)으로 신선도가 진해지는 캘린더 노드(월/일/요일)가 박혀있고, 우측에 본문 카드가 들어옵니다.</p>
                  <p>· 카드 헤더에 담당자 아바타 · 카테고리 배지 · 유형 · 상태 · 시각(상대시간) 한 줄로 모이고, 본문은 증상 / 조치 / 첨부 / 상태 버튼 순서로 표시됩니다.</p>
                  <p>· 리스트 필터 칩 <code className="bg-slate-100 px-1 rounded text-[10px]">분류: 전체/HW/SW</code> + <code className="bg-slate-100 px-1 rounded text-[10px]">상태: 전체/처리중/완료</code> 두 줄로 자르기 가능.</p>
                </Section>
                <Section title="AS 풍부 필드 (V3 흡수) — 중요도·담당자·연락처·시리얼·부품·금액">
                  <p>V3 운영 양식에서 검증된 필드들을 흡수해 데이터 모델을 확장했습니다.</p>
                  <p>· <strong>중요도</strong>: 보통 / 긴급 — 긴급일 경우 카드에 빨간 ring + AlertTriangle 배지 + stat 카드(미완료 긴급) 집계</p>
                  <p>· <strong>고객사 담당자 + 연락처</strong>: 현장 출동·콜 응대 시 즉시 연락. 카드에 인라인 칩 노출.</p>
                  <p>· <strong>장비 시리얼 번호</strong>: 같은 장비 재발생 추적의 핵심. 검색에 포함되어 'SN-12345' 같은 코드로 빠르게 찾기.</p>
                  <p>· <strong>사용 부품 + 금액</strong>: HW에서만 노출 (SW는 의미 없음). 정산·재고 연계 추적용.</p>
                  <p>· 모든 필드는 <strong>선택 입력</strong> — 기존 레코드와 호환되며, 빈 값이면 카드에 칩이 안 나옵니다.</p>
                </Section>
                <Section title="AS 처리 코멘트 (답글) — 운영팀↔엔지니어 협업 이력">
                  <p>각 AS 카드 하단에 <strong>답글 입력란</strong> 추가 — 처리 중인 AS에 대해 진행 상황·확인 결과·고객 회신을 누적 기록.</p>
                  <p>· Enter 또는 [답글] 버튼으로 등록 → 자동으로 작성자/시각이 붙어 카드 안에 시간순 표시.</p>
                  <p>· 통합 페이지에서는 <strong>"처리 이력 N건 ▼"</strong> 토글로 접고 펼칠 수 있어 화면 정리.</p>
                  <p>· 완료된 AS에는 답글이 막힙니다 — 더 추가가 필요하면 완료 취소부터.</p>
                </Section>
                <Section title="완료 처리 모달 — 보고서 첨부 필수">
                  <p>완료 상태 칩을 누르면 곧바로 끝나지 않고 <strong>보고서 첨부 모달</strong>이 뜹니다.</p>
                  <p>· <strong>보고서 첨부</strong>: 작업 결과서 / 점검 보고서 / 패치 노트 등 (Drive 업로드)</p>
                  <p>· <strong>N/A 체크</strong>: 보고서가 불필요한 케이스(간단 응대, 원격 답변만)일 때 명시적으로 체크 — 그 자체가 기록</p>
                  <p>· 둘 중 하나는 반드시 선택해야 [완료 확정] 활성화 — 거버넌스 강화</p>
                  <p>· 완료된 AS 카드에는 보고서 파일명·완료 시각 또는 'N/A' 표시가 emerald 박스로 노출됩니다.</p>
                </Section>
                <Section title="완료 취소 — 사유 입력">
                  <p>실수로 완료 처리했거나 고객 재확인 요청·재발 발견 시 ADMIN/PM이 <strong>완료 취소</strong> 버튼으로 직전 단계로 되돌릴 수 있습니다.</p>
                  <p>· HW는 '조치', SW는 '검증' 단계로 자동 복귀</p>
                  <p>· <strong>사유 입력 필수</strong> — 사유는 처리 코멘트에 <code className="bg-slate-100 px-1 rounded text-[10px]">[완료 취소] ...</code>로 영구 기록</p>
                </Section>
                <Section title="AS 통합 관리 페이지 — 신규 접수 NEW 뱃지">
                  <p>페이지 진입 시점을 기준으로 그 이후 등록된 AS에 <code className="bg-red-500 text-white px-1 rounded text-[10px]">NEW</code> 배지가 붙고, 페이지 헤더에 <strong>"NEW N"</strong> 카운트가 표시됩니다.</p>
                  <p>· 새로고침 없이 실시간으로 새 접수 건수를 알 수 있어 운영팀이 놓치지 않습니다.</p>
                  <p>· 페이지를 나갔다 들어오면 그 시점이 새 기준점이 됩니다.</p>
                </Section>
                <Section title="AS 통합 페이지 — 직접 접수 (프로젝트 모달 진입 없이)">
                  <p>헤더 우측 <code className="bg-purple-600 text-white px-1 rounded text-[10px]">+ 새 AS 접수</code> 버튼을 누르면 프로젝트를 선택해서 곧바로 접수할 수 있는 모달이 열립니다.</p>
                  <p>· 프로젝트 select + HW/SW 토글 + 모든 풍부 필드(중요도/담당자/연락처/시리얼/희망일/방문/부품/금액) + 다중 첨부 + Ctrl+V 이미지 paste</p>
                  <p>· <strong>공동 처리자(다중 체크박스)</strong> — 주 담당 외에 함께 처리하는 사람을 사용자 관리 목록에서 선택</p>
                  <p>· AS 부서가 프로젝트 모달까지 안 들어가도 한 화면에서 접수 → 진행 → 완료까지 처리 가능</p>
                </Section>

                <Section title="공동 처리자 활용">
                  <p>· AS 카드에 "+ 공동: ..." 으로 공동 처리자 명단 자동 표시</p>
                  <p>· AS 보고서 메일 발송 시 본문에 공동 처리자 row 자동 포함</p>
                  <p>· 공동으로 처리한 AS는 <strong>공동 처리자 본인의 활동 이력</strong>에도 "(공동)" 태그로 노출 → 인력별 작업 부하 추적 가능</p>
                </Section>
                <Section title="AS 인라인 정보 수정 (V3 흡수)">
                  <p>각 AS 카드의 메타 칩 줄 끝에 <code className="bg-amber-50 text-amber-700 px-1 rounded text-[10px]">정보 수정</code> 버튼을 누르면 시리얼/담당자/연락처/희망일/방문/부품/금액/중요도를 카드 안에서 바로 편집할 수 있습니다.</p>
                  <p>· 모달이나 프로젝트 상세까지 들어가지 않고 빠르게 오타·누락 정정</p>
                  <p>· 완료된 AS는 인라인 편집이 막힘 — 완료 취소 → 수정 → 다시 완료 순서</p>
                </Section>
                <Section title="희망 처리일정 + 방문 필요사항 (HW 전용 추가 필드)">
                  <p>HW AS는 현장 출동이 본질이라 두 필드를 추가했습니다.</p>
                  <p>· <strong>희망 처리일정</strong>: 고객이 원하는 출동 일자. 카드에 amber 칩으로 노출 — 출동 일정 잡을 때 기준.</p>
                  <p>· <strong>방문 시 필요사항</strong>: 보안 절차, 안전화/헬멧, 출입증 등. 현장 도착 전 사전 준비 체크.</p>
                </Section>
                <Section title="공유 노트 미니 모달 — 타임라인 브랜치화">
                  <p>프로젝트 관리 페이지에서 "공유 노트 N건" 칩을 누르면 열리는 미니 모달도 회의록/노트 탭과 <strong>완전히 동일한 타임라인 브랜치 테마</strong>로 통일했습니다.</p>
                  <p>· 좌측 amber 세로 라인 + 캘린더 노드(월/일/요일, 신선도 색상)</p>
                  <p>· 회의록/노트 종류 배지, 회의 일시·참석자·결정사항·액션 아이템·첨부 모두 동일하게 표시</p>
                  <p>· 상단 필터 칩 <code className="bg-slate-100 px-1 rounded text-[10px]">전체 / 회의록 / 노트</code></p>
                </Section>
                <Section title="고객 요청">
                  <p>프로젝트 상세 → 고객요청 탭. 고객사 계정도 직접 요청을 등록할 수 있고 응답 댓글이 누적됩니다.</p>
                  <p>"반영 완료/반려" 시 처리 결과(메일 회신, 차기 패치 반영 등)를 명시 입력해야 합니다.</p>
                </Section>
              </>
            )}

            {tab === 'version' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('버전 관리', 'Version Management')}</h2>
                <Section title="프로젝트별 버전 등록">
                  <Step n={1}>프로젝트 리스트의 <strong>버전 컬럼 셀</strong> 클릭 → 모달 열림</Step>
                  <Step n={2}>카테고리 선택(또는 자유 입력): HW / SW / 충방전기 FW / 인터페이스 FW 등 — 추천 칩 클릭으로 빠른 입력</Step>
                  <Step n={3}>버전 (예: v1.0.0) 입력</Step>
                  <Step n={4}>배포일 선택 (선택, 비우면 오늘 자동)</Step>
                  <Step n={5}><strong>변경 내용/이력 노트 (필수)</strong> 입력 — 무엇이 바뀌었는지 추적용</Step>
                  <Step n={6}>"버전 추가" 버튼 클릭 (카테고리/버전 칸에서 Enter, 노트 칸에서 Ctrl+Enter도 동일)</Step>
                  <Step n={7}>모달은 안 닫히고 카드 즉시 추가 — 카테고리는 유지되어 연속 등록 가능</Step>
                </Section>
                <Section title="카테고리 인덱스 통일 (도메인 표준 순서)">
                  <p>프로젝트마다 등록한 카테고리가 들쭉날쭉하지 않도록, 카테고리별 최신 버전과 프로젝트 리스트의 버전 표시 순서를 <strong>도메인 추천 순서로 통일</strong>합니다.</p>
                  <p>· 예: 2차전지 사이클러 → <code>HW → SW → 충방전기 FW → 인터페이스 FW</code> 순서로 항상 동일하게 표시</p>
                  <p>· 도메인 추천에 없는 자유 입력 카테고리는 추천 카테고리들 다음에 알파벳/한글 순으로 정렬됩니다.</p>
                </Section>
                <Section title="필수 항목 (* 표시)">
                  <p>· <strong>카테고리</strong>, <strong>버전</strong>, <strong>변경 내용 노트</strong>는 반드시 입력해야 추가됩니다.</p>
                  <p>· 변경 내용을 빈칸으로 두면 "이력을 입력하세요" 에러가 표시됩니다 (이력 추적을 위한 의도적 강제).</p>
                  <p>· 폼 우측 하단 <strong>"초기화"</strong> 버튼으로 입력값을 한번에 비울 수 있습니다.</p>
                </Section>
                <Section title="등록된 버전 수정/삭제">
                  <p>이력 카드 우측의 <strong>연필 아이콘 (수정)</strong> 또는 <strong>휴지통 아이콘 (삭제)</strong>을 사용합니다.</p>
                  <p>수정 모드에서는 카테고리/버전/배포일/노트를 인라인으로 변경 후 "저장".</p>
                </Section>
                <Section title="카테고리는 가변">
                  <p>도메인별 추천 카테고리(2차전지는 4종, 반도체/디스플레이는 3종)가 자동완성에 떠지만, 자유롭게 추가 입력 가능합니다 (예: BMS FW, MES 통신 FW).</p>
                </Section>
                <Section title="이력 누적">
                  <p>같은 카테고리 내에서 v1.0 → v1.1 → v2.0 같이 모든 버전 이력이 누적됩니다. 카테고리 필터로 좁혀서 볼 수 있습니다.</p>
                </Section>
                <Section title="전사 통합 뷰">
                  <p>좌측 메뉴 <strong>"버전 릴리즈 관리"</strong>는 모든 프로젝트의 버전 변경을 시간 역순으로 통합 표시합니다. 카테고리/도메인/프로젝트 필터로 좁혀 볼 수 있습니다.</p>
                </Section>
              </>
            )}

            {tab === 'weekly' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('주간 업무 보고', 'Weekly Reports')}</h2>
                <p className="text-xs text-slate-500 mb-4">{t('수기 작성 없이 시스템 활동 데이터로 자동 집계되는 주간 업무 보고. 팀장은 같은 부서원 보고를 받고 팀 종합 보고서까지 한 화면에서 작성합니다.', 'Auto-aggregated weekly reports from system activity. Team leads review same-dept submissions and write team consolidated reports in one place.')}</p>

                <Section title="개요 — 왜 이 기능을 쓰나">
                  <p>· 한 주 동안 시스템에 등록된 활동(이슈/회의록/AS/고객요청/버전/출장/추가 대응 등)을 <strong>자동 집계해서 보고서 초안 생성</strong></p>
                  <p>· 작성자는 검토·다듬기만 하면 되어 <strong>주간 보고 작성 시간을 90% 이상 단축</strong></p>
                  <p>· 팀장은 부서원 보고 상태를 한눈에 보고, 팀 종합 보고서도 자동 집계로 작성</p>
                  <p>· 별도 워드/엑셀 파일 없이 시스템 안에서 작성 → 제출 → 승인까지 일원화</p>
                </Section>

                <Section title="활성화 절차 (관리자 1회)">
                  <Step n={1}>[시스템 설정] → <strong>주간 업무 보고 기능</strong> 토글 ON → 하단 <strong>"전체 설정 저장"</strong></Step>
                  <Step n={2}>[사용자 관리] → 사용할 인원의 <strong>"주간 보고" 컬럼 토글</strong> ON</Step>
                  <Step n={3}>팀장(부서장)은 <strong>"팀장" 컬럼</strong>도 함께 ON — 같은 부서원 보고서 검토·승인 권한이 부여됨</Step>
                  <p className="mt-1 text-[11px] text-slate-500">기능을 끄면 사이드바 메뉴와 페이지 접근이 동시에 차단됩니다. 권한이 없는 사용자에게는 사이드바에 메뉴 자체가 노출되지 않습니다.</p>
                </Section>

                <Section title="권한 정리 (PM 권한과는 별도)">
                  <p>· <strong>일반 사용자(주간 보고 ON)</strong> — 본인 보고서만 작성/제출/조회</p>
                  <p>· <strong>팀장</strong> — 본인 보고 + <strong>같은 부서(dept)</strong> 부서원 보고 검토/승인/반려, 팀 종합 보고서 작성</p>
                  <p>· <strong>ADMIN</strong> — 전사 모든 보고서 조회/검토/승인, 모든 부서의 팀 종합 보고서 작성 가능</p>
                  <p className="mt-1 text-[11px] text-slate-500">팀장은 PM과 무관하게 <strong>독립된 부가 권한</strong>입니다. PM이 아닌 사람도 팀장이 될 수 있고, 반대도 가능합니다.</p>
                </Section>

                <Section title="자동 집계 — 어떤 활동이 어디로 들어가나">
                  <p>주차(월~일) 동안 본인 명의로 등록·수정된 활동을 다음 3개 섹션으로 자동 분류합니다:</p>
                  <p>· <strong>금주 실적</strong> — 완료/처리된 항목 (회의록 작성, 이슈 등록·처리, 셋업 작업 완료, AS 처리, 검수 사인, 버전 릴리즈, 출장 등)</p>
                  <p>· <strong>차주 계획</strong> — 진행중/예정 항목 (다음 주에 시작하는 셋업 작업, 임박 마일스톤, 반려된 고객 요청 후속 등)</p>
                  <p>· <strong>이슈/리스크</strong> — 위험 신호 (High 이슈, 지연 프로젝트, 임박 자격 만료, 중대 AS 등)</p>
                  <p className="mt-1 text-[11px] text-slate-500">매칭 기준은 사용자 이름. 다른 사람 명의로 등록된 항목은 본인 보고서에 포함되지 않습니다.</p>
                </Section>

                <Section title="작성 워크플로우 (1분이면 끝)">
                  <Step n={1}>좌측 메뉴 <strong>"주간 업무 보고"</strong> → 주차 선택 (기본 = 이번 주)</Step>
                  <Step n={2}><strong>"100% 자동 작성"</strong> 버튼 클릭 — 3개 섹션이 시스템 활동으로 자동 채워짐</Step>
                  <Step n={3}>필요 시 텍스트 영역에서 가감/수정 (마크다운 비슷한 자유 형식)</Step>
                  <Step n={4}><strong>"임시 저장"</strong> 또는 <strong>"제출"</strong></Step>
                  <Step n={5}>제출 후 팀장이 검토 → 승인 / 반려. 반려 시 사유와 함께 <strong>붉은 배너</strong>로 안내, 수정 후 재제출</Step>
                  <p className="mt-1 text-[11px] text-slate-500">상단 <strong>"자동 + Excel"</strong> / <strong>"자동 + PDF"</strong> 버튼은 자동 작성 → 즉시 추출까지 1번에 처리하는 단축 액션입니다.</p>
                </Section>

                <Section title="팀장 — 부서원 보고 검토 (탭 이동 없이)">
                  <p>· "팀원 보기" 탭 → 부서원 카드 클릭 시 <strong>같은 화면 모달</strong>에서 보고서 전체 + 활동 근거를 함께 확인</p>
                  <p>· 모달 안에서 직접 <strong>승인 / 반려(사유 입력)</strong>. 반려 사유는 작성자 화면 상단에 강조 배너로 자동 표시됨</p>
                  <p>· 반려 시 사유를 입력하지 않으면 확인 다이얼로그로 한 번 더 검토하도록 안내</p>
                </Section>

                <Section title="팀 종합 보고서 (팀장 전용)">
                  <p>· "팀원 보기" 탭 상단의 <strong>인디고 카드 "팀 종합 보고서"</strong> 클릭 → 모달</p>
                  <p>· 부서원 제출 보고서를 자동 통합 — <code className="bg-slate-100 px-1 rounded text-[11px]">【 김팀장 】 ... 【 홍길동 】 ...</code> 형태로 사람별 그룹</p>
                  <p>· 4개 통계 박스(부서원 수/제출/승인/미제출) + 팀장 종합 코멘트 + 3개 섹션(금주 실적·차주 계획·이슈) 자동 채움</p>
                  <p>· 임시 저장 / 제출 / Excel·PDF 추출 — 일반 보고서와 동일</p>
                  <p>· 부서원 보고가 추가/수정될 때마다 팀 종합 보고서를 다시 열면 자동 재집계</p>
                </Section>

                <Section title="샘플 + 가이드 모달">
                  <p>주간 업무 보고 페이지 우측 상단 <strong>"샘플 + 사용 가이드"</strong> 버튼 — 페이지 내장 가이드(6개 섹션):</p>
                  <p>· 30초 사용법 / 샘플 보고서 / 자동 집계 데이터 / 권한별 접근 / 워크플로우 / 팀 종합 보고서 + 팀장 종합 보고서 시각 샘플</p>
                </Section>

                <Section title="추출 — Excel / PDF">
                  <p>· <strong>본인 보고</strong>: 1시트 (요약/금주실적/차주계획/이슈) — 사번/직급/부서/제출일 헤더 포함</p>
                  <p>· <strong>팀 종합</strong>: 헤더 시트 + 부서원별 시트 통합. PDF는 인쇄용 단일 페이지 양식</p>
                  <p>· 모든 추출은 사내 보고용 스타일(블루 헤더/얼룩말/자동 필터) 적용</p>
                </Section>

                <Note>관리자가 시스템 설정에서 기능을 OFF로 돌리면, 진행 중이던 주간 보고도 즉시 사이드바에서 사라집니다. 데이터는 보존되며 재활성화 시 복구됩니다.</Note>
              </>
            )}

            {tab === 'email' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('메일 송부', 'Email Reports')}</h2>
                <p className="text-xs text-slate-500 mb-4">{t('출장 신청서·보고서·AS 보고서를 HTML 양식으로 송부합니다. 본인 Gmail 계정 발송과 시스템 계정 발송 2가지 모드를 지원합니다.', 'Send Trip Request/Report and AS Report emails in HTML format. Supports both user-account and system-account sending modes.')}</p>

                <Section title={t('양식 3종', 'Three Templates')}>
                  <p>· <strong>출장 신청서</strong> — 프로젝트 팀 모달의 출장 카드에서 "신청" 버튼. 신청자/프로젝트/출장지/기간/예상비용/목적/추가코멘트 입력</p>
                  <p>· <strong>출장 보고서</strong> — 동일 위치 "보고" 버튼. 주요 성과 / 발견 이슈 / 후속 조치 3개 텍스트 박스</p>
                  <p>· <strong>AS 보고서</strong> — AS 통합 관리 페이지 카드의 "메일 송부" 버튼. 구분(HW/SW)/프로젝트/시리얼/증상/조치 + 처리 이력 타임라인</p>
                  <p>· 모든 양식에 <strong>iframe 미리보기</strong> 버튼 — 발송 전 실제 메일 모양 그대로 확인 가능</p>
                </Section>

                <Section title={t('수신/참조 입력 — 주소록 통합', 'Recipients — Address Book')}>
                  <p>· <strong>이름·이메일·부서·회사로 타이핑하면 자동완성 드롭다운</strong>이 뜹니다 — ↑↓ 키로 이동, Enter로 선택</p>
                  <p>· 입력 칸 우측 <strong>📒 주소록 버튼</strong> → 검색·필터 모달 (내부 직원 / 고객사 담당자 그룹 분리, 다중 체크박스 선택, To/Cc 토글)</p>
                  <p>· 주소록 데이터 출처 (자동 통합):</p>
                  <p className="ml-4">- <strong>내부 직원</strong>: 사용자 관리에 등록된 사용자 중 이메일이 입력된 사람</p>
                  <p className="ml-4">- <strong>고객사 담당자</strong>: 고객사 모달의 명함(contacts)에 등록된 사람</p>
                  <p>· 직접 이메일 타이핑 후 Enter/쉼표로 즉시 추가도 가능 (주소록에 없는 사람)</p>
                  <p>· 잘못된 이메일 형식은 자동 거부 · 중복 자동 차단 · 이미 추가된 사람은 주소록 모달에서 회색 처리</p>
                  <p>· 발송 후 시스템에 송신 기록 자동 저장</p>
                </Section>

                <Section title={t('동행자·공동 처리자 자동 표시', 'Companions & Co-handlers')}>
                  <p>· 출장 신청서·보고서에 <strong>동행 엔지니어</strong>가 자동 포함됨 — 제목에 "외 N명", 본문에 명단 row</p>
                  <p>· AS 보고서에 <strong>공동 처리자</strong>가 자동 포함됨</p>
                  <p>· 메일 양식 미리보기로 발송 전 확인 가능</p>
                </Section>

                <Section title={t('★ 발송 모드 1 — 시스템 계정 (기본)', 'Mode 1 — System Account (default)')}>
                  <p>· 시스템 설정에서 별다른 설정 없으면 <strong>GAS 배포자 계정</strong>으로 발송</p>
                  <p>· 보낸이 표시: <code className="bg-slate-100 px-1 rounded text-[10px]">김철수 (MAK-PMS) &lt;mak-pms@회사.co.kr&gt;</code></p>
                  <p>· <strong>답장(reply-to)은 작성자 본인 메일</strong>로 자동 설정 — 수신자가 답장하면 작성자에게 도착</p>
                  <p>· 장점: 추가 설정 불필요. 단점: 보낸이가 시스템 계정으로 표시</p>
                </Section>

                <Section title={t('★ 발송 모드 2 — 본인 Gmail 계정 (권장)', 'Mode 2 — User\'s Own Gmail (recommended)')}>
                  <p>· 작성자 본인 Gmail 계정으로 직접 발송 + <strong>본인 "보낸편지함"에 자동 저장</strong></p>
                  <p>· 활성화 방법:</p>
                  <Step n={1}>관리자가 메인 GAS 코드와 동일하게 <strong>새 Apps Script 프로젝트(또는 새 배포)</strong> 만들기</Step>
                  <Step n={2}>[배포 → 새 배포] → 유형: 웹 앱 → <strong>다음 사용자로 실행: 웹 앱에 접근하는 사용자</strong> 선택 (중요)</Step>
                  <Step n={3}>액세스 권한: Google Workspace 도메인 내 사용자 또는 모든 사용자 (정책에 맞게)</Step>
                  <Step n={4}>생성된 URL을 시스템 설정의 <strong>"메일 발송 GAS URL"</strong> 필드에 등록 → 저장</Step>
                  <Step n={5}>사용자가 처음 메일 발송 시도 시 → <strong>Google OAuth 동의 화면 1회</strong> → "허용" 클릭</Step>
                  <Step n={6}>이후로는 본인 Gmail 계정으로 자동 발송 (재인증 불필요)</Step>
                  <p className="mt-2">· 각 사용자가 <strong>1회만 권한 동의</strong>하면 영구. 재인증 X</p>
                  <p>· 사용자가 회사 Workspace 계정에 브라우저 로그인되어 있어야 작동</p>
                  <Note>모드 1↔2는 시스템 설정에서 자유롭게 전환 가능. URL을 비우면 즉시 시스템 계정 모드로 폴백.</Note>
                </Section>

                <Section title={t('★ 관리자 — 메일 발송 이력 (히든 메뉴)', 'Admin — Mail History (hidden menu)')}>
                  <p>· ADMIN 사이드바에 <strong>"메일 발송 이력"</strong> 메뉴 (다른 권한자는 안 보임)</p>
                  <p>· 전사 발송 기록 추적: <strong>발송시각 / 종류 / 수신·참조 / 제목 / 작성자 / 발송계정(실제 Gmail) / 프로젝트</strong></p>
                  <p>· 필터: 기간(7일/30일/90일/1년/전체) · 종류(출장신청/보고·AS보고) · 검색 키워드</p>
                  <p>· 통계 카드 6개: 전체/오늘/7일/종류별</p>
                  <p>· <strong>Excel 추출</strong> 지원 — 감사 보관용</p>
                  <p>· 데이터 출처: GAS 백엔드의 <code className="bg-slate-100 px-1 rounded text-[10px]">MAIL_LOG</code> 시트 (자동 생성·기록)</p>
                </Section>
              </>
            )}

            {tab === 'export' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('보고서 / Excel 추출', 'Reports & Excel')}</h2>
                <Section title="보고용 스타일링">
                  <p>모든 Excel 추출이 <strong>대시보드형 스타일</strong>로 출력됩니다.</p>
                  <p>· 헤더: 진한 블루 + 흰색 굵은 글씨, 헤더 행 고정</p>
                  <p>· 자동 필터, 한글 가중치 컬럼 너비, 얼룩말 행</p>
                  <p>· 상태별 자동 컬러 (완료=초록, 지연/NG=빨강, 대기=노랑)</p>
                  <p>· 진행률(%) 자동 컬러, ISO 날짜 → YYYY-MM-DD 정규화</p>
                </Section>
                <Section title="추출 종류">
                  <p>· <strong>대시보드 → 종합 리포트</strong>: <strong>차트 + 14개 시트</strong> (기본통계/도메인/프로젝트별/지연/이슈/요청/AS/담당자변경/엔지니어/활동이력/마일스톤(60일)/임박이벤트(30일)/8주 가용성 히트맵/<strong>최근 회의록 50건</strong>)</p>
                  <p>· <strong>대시보드 → PDF</strong>: KPI 5장 카드(고객 요청 미처리 포함) + 임박 마일스톤 + 인력 임박 이벤트 + 도메인별 진척률 등 보고서 양식</p>
                  <p>· <strong>프로젝트 관리 → 리스트</strong>: 간단 리스트 1시트 (계획/실적 — 실적은 종합 진척률)</p>
                  <p>· <strong>프로젝트 관리 → 상세</strong>: 프로젝트별 시트 분리, 모든 정보 (출장/추가 대응/버전/<strong>회의록(회의 일시·참석자·결정·액션·첨부)</strong>/AS/고객요청/체크리스트/활동 이력 등)</p>
                  <p>· <strong>인력/리소스 관리</strong>: 엔지니어 리스트 + 가용 인력 풀 + 8주 가용성 히트맵 (3시트)</p>
                  <p>· 각 메뉴(이슈·자재·사이트·AS·버전)에 단독 Excel 버튼</p>
                </Section>
                <Section title="이력 탭 — 항목 클릭으로 점프">
                  <p>프로젝트 상세 → 이력 탭의 각 활동 항목은 <strong>클릭하여 해당 탭으로 이동</strong>:</p>
                  <p>· TASK_*/PHASE_*/MANAGER/SIGN_OFF/VERSION_*/TRIP_* → 일정 탭</p>
                  <p>· EXTRA_* → 추가 대응 / CHECKLIST → 검수표 / ISSUE_ADD → 이슈</p>
                  <p>· REQUEST_* → 고객요청 / AS_* → AS 관리 / NOTE_ADD → 회의록</p>
                  <p>· hover 시 인디고 border + ↗ 아이콘으로 클릭 가능 표시</p>
                </Section>
                <Section title="AS 통합관리 — AS 항목 클릭 시 AS 탭으로 자동 이동">
                  <p>좌측 메뉴 "AS 통합 관리" 페이지에서 항목 클릭 시:</p>
                  <p>· 프로젝트 상세 모달이 <strong>AS 탭이 활성화된 상태로</strong> 열림 (기존엔 일정 탭으로 열려 한번 더 이동 필요)</p>
                  <p>· 모달 닫으면 AS 페이지에 그대로 남음 — 기존엔 프로젝트 페이지로 강제 전환되던 것 수정</p>
                </Section>
                <Section title="PDF (Buy-off 보고서)">
                  <p>검수 완료 프로젝트 → 검수표 탭의 "최종 완료 보고서 (PDF)" 버튼으로 인쇄/PDF 저장. 고객사 인수인계용으로 사용하세요.</p>
                </Section>
              </>
            )}

            {tab === 'roles' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('권한별 기능', 'By Role')}</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold border-b border-slate-200">기능</th>
                        <th className="px-3 py-2 text-center font-bold border-b border-slate-200 bg-rose-50">ADMIN</th>
                        <th className="px-3 py-2 text-center font-bold border-b border-slate-200 bg-blue-50">PM</th>
                        <th className="px-3 py-2 text-center font-bold border-b border-slate-200 bg-emerald-50">ENGINEER</th>
                        <th className="px-3 py-2 text-center font-bold border-b border-slate-200 bg-amber-50">CUSTOMER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        ['대시보드 조회', '✅', '✅', '✅', '✅(자기 회사)'],
                        ['프로젝트 생성/삭제', '✅', '✅', '❌', '❌'],
                        ['프로젝트 정보 수정 (이름/사이트/일정)', '✅', '✅', '❌', '❌'],
                        ['단계(Phase) 변경', '✅', '✅', '✅', '❌'],
                        ['단계 정의 편집 (이름/추가/삭제)', '✅', '✅', '❌', '❌'],
                        ['셋업 일정 진행', '✅', '✅', '✅', '❌'],
                        ['검수표 OK/NG 입력', '✅', '✅', '✅', '❌'],
                        ['검수 사인 (전자 서명)', '✅(대리)', '❌', '❌', '✅'],
                        ['사인 취소', '✅', '❌', '❌', '❌'],
                        ['Buy-off 후 검수표 수정', '✅', '❌', '❌', '❌'],
                        ['담당자 변경 / 추가 인력 / 출장 일정', '✅', '✅', '❌', '❌'],
                        ['추가 대응 작업', '✅', '✅', '✅', '❌'],
                        ['이슈 등록', '✅', '✅', '✅', '❌'],
                        ['이슈 제목/담당자 수정 (이력 기록)', '✅', '❌', '❌', '❌'],
                        ['이슈 삭제', '✅', '✅', '❌', '❌'],
                        ['프로젝트 산업군(도메인) 수정', '✅', '❌', '❌', '❌'],
                        ['2차전지 스펙(전압/전류/사양) 입력·수정', '✅', '✅', '❌', '❌'],
                        ['장비 코드 추가/수정/삭제', '✅', '✅', '❌', '❌'],
                        ['단계 마일스톤(SOP) 토글', '✅', '✅', '❌', '❌'],
                        ['간트차트 보기/줌/필터', '✅', '✅', '✅', '✅'],
                        ['고객 요청 등록', '✅', '✅', '✅', '✅'],
                        ['고객 요청 처리', '✅', '✅', '✅', '❌'],
                        ['AS 등록/처리', '✅', '✅', '✅', '❌'],
                        ['AS 통합 관리 메뉴', '✅', '✅', '✅', '❌'],
                        ['자재/스페어 파트', '✅', '✅', '✅', '❌'],
                        ['사이트/유틸 마스터', '✅(전체)', '✅(조회)', '✅(조회)', '❌'],
                        ['인력/리소스 관리', '✅(전체)', '✅(조회)', '✅(조회)', '❌'],
                        ['자격 정보 (출입증/안전/비자) 추가', '✅', '✅', '❌', '❌'],
                        ['버전 등록/관리', '✅', '✅', '✅', '❌'],
                        ['참고자료 업로드/삭제 (Drive)', '✅', '✅', '✅', '❌(조회)'],
                        ['Excel 추출', '✅', '✅', '✅', '✅(자기 회사)'],
                        ['사용자 관리', '✅', '❌', '❌', '❌'],
                        ['시스템 설정 (Drive 폴더 등)', '✅', '❌', '❌', '❌'],
                        ['주간 업무 보고 — 본인 작성/제출', '✅', '✅¹', '✅¹', '❌'],
                        ['주간 보고 검토/승인/반려', '✅(전체)', '✅²(같은 부서)', '✅²(같은 부서)', '❌'],
                        ['팀 종합 보고서 작성', '✅(전체 부서)', '✅²', '✅²', '❌'],
                        ['주간 업무 보고 기능 ON/OFF', '✅', '❌', '❌', '❌'],
                        ['주간 보고 권한 부여 / 팀장 지정', '✅', '❌', '❌', '❌'],
                      ].map(([feat, a, p, e, c], i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-medium text-slate-700">{feat}</td>
                          <td className="px-3 py-1.5 text-center">{a}</td>
                          <td className="px-3 py-1.5 text-center">{p}</td>
                          <td className="px-3 py-1.5 text-center">{e}</td>
                          <td className="px-3 py-1.5 text-center">{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 text-[11px] text-slate-500 space-y-0.5">
                  <p>¹ 사용자 관리에서 <strong>"주간 보고" 토글이 ON</strong>인 사용자만 작성·제출 가능 (시스템 설정에서 기능 자체를 활성화한 후).</p>
                  <p>² <strong>팀장</strong>은 PM과 별도의 부가 권한입니다. 사용자 관리에서 <strong>"팀장" 토글</strong>을 켜면 같은 부서(dept) 부서원의 보고를 검토·승인·반려하고 팀 종합 보고서를 작성할 수 있습니다.</p>
                </div>
              </>
            )}

            {tab === 'changelog' && (
              <>
                <h2 className="text-base font-bold text-slate-800 mb-3">{t('업데이트 내역', "What's New")}</h2>
                <p className="text-xs text-slate-500 mb-4">{t('v1.0 베타 출시 이후 추가/개선된 기능을 시간 역순으로 정리합니다.', 'Recent improvements since v1.0 beta release.')}</p>

                <Section title={t('★ HR 출장 통계 탭 — 동행자 데이터 기반 (NEW)', 'HR Trip Stats Tab — Powered by Companion Data (NEW)')}>
                  <p>· <strong>인력/리소스 관리</strong>에 "가용성·현황" / "<strong>출장 통계 (HR)</strong>" 탭 토글 추가</p>
                  <p>· <strong>기간 프리셋</strong>: 이번 달 / 이번 분기 / 올해 / 직접 지정</p>
                  <p>· <strong>관점 3종</strong>: 전체 목록 / 인력별 / 사이트별 — HR 의사결정 시나리오별로 즉시 전환</p>
                  <p>· <strong>요약 카드 5장</strong>: 총 출장 건수 / 연인원 / 연인일 / 최다 출장자 / 최다 사이트</p>
                  <p>· 인력별: 출장 횟수·총 일수·자주 간 사이트·<strong>자주 동행하는 사람</strong></p>
                  <p>· 사이트별: 연인원·총 일수·실인원·다녀간 사람 명단</p>
                  <p>· "이번 달 김PM 어디 갔나" / "A전자 사이트 누가 다녀갔나" / "김PM 주로 누구랑 가나" 같은 HR 분석 한 화면에서 해결</p>
                </Section>

                <Section title={t('★ 출장 동행자 + AS 공동 처리자 (NEW)', 'Trip Companions + AS Co-handlers (NEW)')}>
                  <p>· <strong>출장 신규/편집 폼</strong>에 동행 엔지니어 다중 체크박스 — 주담당 + 동행 엔지니어 개념. 동행자 변경도 출장 수정 이력에 자동 추적</p>
                  <p>· <strong>AS 신규 접수 모달</strong>에 공동 처리자 다중 체크박스 — 사용자 관리에서 ENGINEER/PM/ADMIN 권한자 중 선택</p>
                  <p>· <strong>이메일 양식 3종 자동 반영</strong>: 출장 신청서/보고서/AS 보고서에 동행자·공동 처리자 row + 제목에 "외 N명"</p>
                  <p>· <strong>활동 이력 자동 노출</strong>: 동행으로 간 출장은 "(동행)" 태그, 공동 처리한 AS는 "(공동)" 태그로 본인 활동 모달에도 표시</p>
                </Section>

                <Section title={t('★ 메일 주소록 통합 — 자동완성 + 📒 모달 (NEW)', 'Mail Address Book — Autocomplete + 📒 Modal (NEW)')}>
                  <p>· 메일 송부 모달의 수신/참조 입력칸이 <strong>주소록과 통합</strong>됨</p>
                  <p>· <strong>타이핑 자동완성</strong>: 이름·이메일·부서·회사로 검색 → 드롭다운 추천 (최대 6명, ↑↓ 키 + Enter 선택)</p>
                  <p>· <strong>📒 주소록 버튼</strong>: 검색·필터(소스/회사/부서) 모달 → 다중 체크박스 → To/Cc 토글 후 추가</p>
                  <p>· 주소록 소스: <strong>사용자 관리(이메일 있는 사람)</strong> + <strong>고객사 담당자(명함)</strong> 통합 — 별도 등록 불필요</p>
                  <p>· 사용자 관리에 <strong>이메일 필드 추가</strong> — 사용자 추가/수정 시 입력. 미입력은 주소록에서 자동 제외</p>
                </Section>

                <Section title={t('★ 메일 첨부 파일명 + 페이지 헤더 정리', 'Mail Attachment Name + Page Header')}>
                  <p>· <strong>메일 첨부 HTML 파일명에 담당 엔지니어 이름 포함</strong></p>
                  <p className="ml-4">└ 출장 신청서: <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS-출장신청서-홍길동-2026-05-13.html</code></p>
                  <p className="ml-4">└ 출장 보고서: <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS-출장보고서-홍길동-2026-05-13.html</code></p>
                  <p className="ml-4">└ AS 보고서: <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS-AS보고서-SW-홍길동-2026-05-13.html</code></p>
                  <p>· GAS 첨부 처리 — <strong>한국어 파일명 보존</strong>(GmailApp 자동 RFC2231 인코딩). 위험문자(<code>/\:*?"&lt;&gt;|</code>)만 제거</p>
                  <p>· <strong>탭 wrapper sub view 헤더 정리</strong>: H1만 제거하고 부제목은 유지. 부제목 좌측 / 액션 버튼(추가·새로고침·Excel) 우측 같은 줄 정렬 → 탭 헤더와의 시각 충돌 해소</p>
                </Section>

                <Section title={t('★ 사이드바 메뉴 그룹화 — 14개 → 10개', 'Sidebar Grouping — 14 → 10')}>
                  <p>· 관련 메뉴들을 페이지 내 탭으로 묶어 사이드바 항목 축소</p>
                  <p>· <strong>고객사·사이트</strong> (← 고객사 관리 + 사이트/유틸 마스터) — 페이지 상단 2탭</p>
                  <p>· <strong>관리자 페이지</strong> (← 사용자 관리 + 시스템 설정 + 메일 발송 이력 + 시스템 활동 이력) — ADMIN 전용, 페이지 상단 4탭</p>
                  <p>· 각 통합 메뉴 클릭 시 상단에 탭 헤더가 나타남. 외부에서 직접 진입(예: 프로젝트 카드 → 고객사 클릭, 또는 알림 → 메일 이력)할 때도 해당 탭이 자동 선택됨</p>
                  <p>· 기존 라우팅(<code className="bg-slate-100 px-1 rounded text-[10px]">customers</code> / <code className="bg-slate-100 px-1 rounded text-[10px]">sites</code> / <code className="bg-slate-100 px-1 rounded text-[10px]">settings</code> / <code className="bg-slate-100 px-1 rounded text-[10px]">users</code> / <code className="bg-slate-100 px-1 rounded text-[10px]">mail_log</code> / <code className="bg-slate-100 px-1 rounded text-[10px]">change_log</code>)은 모두 호환 유지 — 내부 점프 로직 변경 불필요</p>
                </Section>

                <Section title={t('★ 시스템 활동 이력 — 관리자 히든 메뉴 (NEW)', 'System Activity Log — Admin Hidden Menu (NEW)')}>
                  <p>· 사이드바에 <strong>ADMIN 전용 "시스템 활동 이력"</strong> 메뉴 추가 — 메일 발송 이력과 별개로 <strong>모든 데이터 변경(저장/수정/삭제)을 사용자/시각/액션/대상/이전→이후 로 추적</strong></p>
                  <p>· <strong>수집 대상</strong>: UPDATE_PROJECT_BY_ID, UPDATE_PROJECTS, UPDATE_ISSUES, UPDATE_ENGINEERS, UPDATE_CUSTOMERS, UPDATE_PARTS, UPDATE_SITES, UPDATE_USERS, UPDATE_SETTINGS, UPDATE_WEEKLY_REPORTS, UPDATE_RELEASES, DELETE_PROJECT — 모든 mutation</p>
                  <p>· <strong>필터</strong>: 기간(오늘/7일/30일/90일/전체), 액션 종류(드롭다운, 각 액션별 카운트 표시), 사용자·target·내용 검색</p>
                  <p>· <strong>통계 카드 4개</strong>: 전체 / 오늘 / 최근 7일 / 액션 종류 수</p>
                  <p>· <strong>각 행 펼침</strong>: ▶ 클릭 시 before / after 전체 JSON 펼침 (max-height 64로 스크롤). 변경 전→후를 한눈에 비교</p>
                  <p>· <strong>Excel 추출</strong>: 필터된 항목을 <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS_시스템활동이력_YYYY-MM-DD.xlsx</code>로 저장</p>
                  <p>· <strong>저장 위치</strong>: GAS 스프레드시트의 <code className="bg-slate-100 px-1 rounded text-[10px]">CHANGE_LOG</code> 시트. 10,000행 초과 시 오래된 절반 자동 정리 (감사 추적은 그 이전 백업 .xlsx에서 조회 가능)</p>
                  <p>· <strong>알림 센터와 다른 점</strong>: 알림 센터는 "실시간 새 이슈/AS 발생" 같은 사용자 액션 트리거. 활동 이력은 "데이터 행이 누구에 의해 어떻게 바뀌었나" 감사 추적용</p>
                </Section>

                <Section title={t('★ 메일 발송 — 양식 표시 정상화 + HTML 첨부 + 버튼 직관성 (NEW)', 'Email — Layout Fix + HTML Attachment + Clearer Buttons (NEW)')}>
                  <p>· <strong>메일 양식 표시 버그 수정</strong>: 받는 사람 메일함에서 헤더 색상·표 디자인이 깨지고 단순 표만 보이던 문제 해결. Gmail/Outlook이 <code className="bg-slate-100 px-1 rounded text-[10px]">&lt;style&gt;</code> 블록을 제거하는 동작 때문이었음 → 모든 스타일을 inline으로 재작성</p>
                  <p>· <strong>이모지 깨짐(<code className="bg-slate-100 px-1 rounded text-[10px]">������</code>) 수정</strong>: 헤더 이모지 제거하고 텍스트 뱃지로 대체 (<code className="bg-slate-100 px-1 rounded text-[10px]">[AS 보고 / SW]</code>, <code className="bg-slate-100 px-1 rounded text-[10px]">[출장 신청]</code>, <code className="bg-slate-100 px-1 rounded text-[10px]">[출장 보고]</code>)</p>
                  <p>· <strong>HTML 파일 자동 첨부</strong>: 메일에 <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS-AS-Report-2026-05-13.html</code> 같은 영문 파일명으로 양식 HTML이 함께 첨부됨. 받는 사람이 다운로드 → 브라우저로 열면 시스템 내 미리보기와 100% 동일</p>
                  <p>· <strong>발송 운영 방식 A로 확정</strong>: 시스템 설정의 "메일 발송 GAS URL" 칸은 <strong>비워두고 운영</strong>. 메인 GAS(소유자 권한)로 발송 + 답장 reply-to는 작성자 본인 메일로 자동 라우팅. 본인 Gmail 직접 발송(C안 Service Account 방식)은 추후 검토 (<code className="bg-slate-100 px-1 rounded text-[10px]">docs/메일-발송-추후계획.md</code>)</p>
                  <p>· <strong>메일 송부 버튼 직관성 강화</strong>:</p>
                  <p className="ml-4">└ 출장 카드: 작은 chip 2개("신청"/"보고") → 큰 컬러 버튼("신청서 메일"/"보고서 메일") indigo/emerald 구분</p>
                  <p className="ml-4">└ AS 카드: "메일 송부" → "AS 보고서 메일 발송" + 진한 indigo 버튼으로 시각적 강조</p>
                </Section>

                <Section title={t('★ 추가 대응 — 브랜치 스타일 + 날짜순 정렬 (NEW)', 'Extras — Branch Style + Date Sort (NEW)')}>
                  <p>· 추가 대응 탭이 <strong>회의록/노트 탭과 동일한 브랜치(타임라인) 스타일</strong>로 정리됨 — 좌측에 캘린더 타일(월/일/요일) + 세로 타임라인 라인, 우측에 카드</p>
                  <p>· 캘린더 타일은 <strong>신선도별 핑크 톤</strong>: 오늘/어제는 진한 핑크, 1주 이내 중간, 1개월 이내 옅음, 그 이전은 회색</p>
                  <p>· 카드 헤더에 상대 시간 표시 — "오늘", "어제", "3일 전", "2주 전" 등</p>
                  <p>· <strong>일괄등록(import) 항목은 Start Date 기준</strong> — 캘린더 타일과 정렬 모두 시작일로 표시 (호버 시 "시작일(일괄등록)" 안내). 일반 등록 항목은 등록 시각 기준</p>
                  <p>· <strong>날짜 내림차순 자동 정렬</strong> — 최신/미래 일정이 위, 오래된 항목이 아래</p>
                </Section>

                <Section title={t('★ 데이터 보호 4중 방어 — 1단계 (NEW)', 'Data Protection — Layer 1 (NEW)')}>
                  <p>· <strong>4중 방어 1단계 활성화</strong>: ① CHANGE_LOG 시트 자동 기록 ② Drive 일별 백업 (30일 일별 + 12개월 월별) ③ 삭제 단독 백업 (JSON, 30일 보관) ④ 클라이언트 localStorage 스냅샷 (부팅 시 원격 비교)</p>
                  <p>· <strong>CHANGE_LOG 시트</strong>: 모든 데이터 변경(UPDATE_PROJECT_BY_ID/UPDATE_PROJECTS/UPDATE_ISSUES 등)이 timestamp/user/action/target/before/after 컬럼으로 자동 기록 → "누가 무엇을 언제 어떻게 바꿨는지" 추적 가능</p>
                  <p>· <strong>일별 자동 백업</strong>: <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS_백업/YYYY-MM-DD_*.xlsx</code> 폴더에 매일 자정 전체 시트 백업. 30일은 일별, 매월 1일자는 12개월 월별 아카이브, 나머지는 자동 휴지통</p>
                  <p>· <strong>삭제 단독 백업</strong>: 프로젝트 삭제 시 자동으로 <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS_삭제백업/YYYY-MM-DD_HHmm_PRJxxx_프로젝트명.json</code> 생성 + localStorage에도 단독 보관 (30일) → 실수 삭제도 복구 가능</p>
                  <p>· <strong>부팅 시 비교</strong>: 페이지 진입 시 로컬 스냅샷과 GAS 데이터를 비교. 로컬엔 있는데 원격에 없는 항목이 발견되면 화면 상단에 amber 배너로 안내 ("복원 가능한 변경 N건이 있습니다")</p>
                  <p>· <strong>설치 — 단 한 번</strong>: GAS 편집기에서 <code className="bg-slate-100 px-1 rounded text-[10px]">installDailyBackupTrigger</code> 함수 [실행] 클릭 → DriveApp/UrlFetchApp 권한 허용 → 매일 자정 자동 백업 시작</p>
                  <p>· 신규 파일: <code className="bg-slate-100 px-1 rounded text-[10px]">src/utils/localBackup.js</code> / GAS의 <code className="bg-slate-100 px-1 rounded text-[10px]">dailyBackup</code>/<code className="bg-slate-100 px-1 rounded text-[10px]">logChange</code>/<code className="bg-slate-100 px-1 rounded text-[10px]">backupSingleProject</code> 추가</p>
                  <p>· <strong>기존 데이터 영향 0</strong> — 모든 작업은 추가/확장만, 기존 시트·데이터 손실 없음</p>
                </Section>

                <Section title={t('★ GAS 동기화 속도 개선 — Delta 저장', 'GAS Sync Speed — Delta Save')}>
                  <p>· <strong>단일 프로젝트 변경 → 한 행만 전송</strong> — 기존엔 모든 프로젝트 배열을 통째로 GAS에 덮어쓰기 → 50건 프로젝트일 때 50배 데이터 전송. 이제 <code className="bg-slate-100 px-1 rounded text-[10px]">UPDATE_PROJECT_BY_ID</code>로 해당 ID 행만 update/append/delete</p>
                  <p>· <strong>1.5초 debounce 코얼레싱</strong> — 같은 프로젝트의 연속 변경(태스크 토글 여러 번, 입력 중 etc.)은 마지막 한 번으로 합쳐서 전송 → 네트워크 호출 수 대폭 감소</p>
                  <p>· <strong>적용 핸들러</strong>: 태스크 토글/이름/일정·마일스톤/지연사유, 단계 변경·정의, 셋업 일괄편집, 검수표, 사인오프, 추가대응·댓글, 고객요청, AS·답글·완료, 출장, 담당자 변경, 회의록/노트 등록·수정·삭제, 첨부 업로드·삭제, 버전 이력, 프로젝트 수정 — 모든 단일 프로젝트 변경</p>
                  <p>· <strong>다중 프로젝트 일괄 작업</strong>(고객사 자동 매칭/해제 등)은 기존 전체 배열 저장 유지 — 일괄 변경 시 N개의 delta 호출보다 한 번에 보내는 게 더 효율적</p>
                  <p>· 영향 파일: <code className="bg-slate-100 px-1 rounded text-[10px]">docs/gas-backend.gs</code>(<code className="bg-slate-100 px-1 rounded text-[10px]">UPDATE_PROJECT_BY_ID</code> 추가), <code className="bg-slate-100 px-1 rounded text-[10px]">src/utils/api.js</code>(<code className="bg-slate-100 px-1 rounded text-[10px]">saveProjectDelta</code>), <code className="bg-slate-100 px-1 rounded text-[10px]">src/App.js</code> 약 25곳</p>
                  <p>· <strong>GAS 재배포 필수</strong> — <code className="bg-slate-100 px-1 rounded text-[10px]">docs/gas-backend.gs</code>를 Apps Script에 붙여넣고 "새 버전으로 배포"해야 delta 저장이 동작. 미반영 시 자동 polyfill 없이 실패하므로 반드시 재배포</p>
                </Section>

                <Section title={t('★ 동기화 보호 + UX 안정성 강화', 'Sync Protection + UX Stability')}>
                  <p>· <strong>서버 동기화 중 자동 차단 모달</strong>: 저장이 800ms 이상 걸리면 화면 가운데 큰 모달 "서버에 동기화 중" 자동 표시 + 뒤 화면 클릭 차단 → 사용자 실수 방지</p>
                  <p>· <strong>새로고침/탭 닫기 경고</strong>: 저장 진행 중 새로고침 시 브라우저 prompt 자동 표시. "저장됨" 표시가 뜬 후 새로고침해야 안전</p>
                  <p>· <strong>데이터 손실 방지 강화</strong>: 페이지 떠나도 <code className="bg-slate-100 px-1 rounded text-[10px]">sendBeacon</code> + <code className="bg-slate-100 px-1 rounded text-[10px]">keepalive: true</code>로 진행 중인 fetch 강제 완료</p>
                  <p>· 헤더 우측 <strong>"저장됨" 인디케이터</strong> — 모든 변경이 서버에 반영됐다는 신호 (안전하게 새로고침 가능)</p>
                </Section>

                <Section title={t('★ 추가 대응 필터 + 임포트 별칭 매핑 (NEW)', 'Extras Filter + Import Alias Mapping (NEW)')}>
                  <p>· <strong>추가 대응 탭 필터</strong>: 상태 칩(전체/대기/검토중/진행중/완료/반려 — 각 개수 표시) + 유형 드롭다운 + 작업명/요청자/메모 통합 검색 + × 초기화</p>
                  <p>· <strong>임포트 상태 별칭 자동 매핑</strong>: <code>미진행</code>·<code>진행안함</code>·<code>시작전</code> → 대기 / <code>진행</code>·<code>inprogress</code> → 진행중 / <code>완료됨</code>·<code>done</code>·<code>끝</code> → 완료 / <code>거절</code>·<code>보류</code> → 반려</p>
                  <p>· <strong>임포트 유형 별칭</strong>: <code>사용성 개선</code> → 기능 개선 / <code>버그</code> → 버그 수정 / <code>개발 요청</code> → 기타 등</p>
                  <p>· 별칭 매핑 안 되는 값도 <strong>원본 그대로 보존</strong> + 경고 표시 (강제 변환 X) — 데이터 손실 방지</p>
                  <p>· <strong>날짜 ISO 문자열 파싱</strong>: <code>"2026-03-12T14:59:08.000Z"</code> 같은 형식도 <code>2026-03-12</code>로 자동 정규화</p>
                </Section>

                <Section title={t('★ 초기 버전 이력 일괄 등록 + 날짜 입력 6자리 버그 (NEW)', 'Initial Version Bulk Import + Date 6-digit Year Fix (NEW)')}>
                  <p>· 버전 관리 모달 헤더에 <strong>"초기 이력 일괄 등록"</strong> 버튼 — 시스템 도입 전 누적된 HW/SW/FW 이력을 한 번에 등록</p>
                  <p>· 3가지 입력 모드: <strong>수기 입력 / 파일 업로드(.xlsx) / Excel·시트 붙여넣기</strong> + 템플릿 다운로드</p>
                  <p>· 도메인 추천 카테고리(HW/SW/FW 등) 자동 시드, 별칭 헤더(카테고리/버전/출시일/노트) 모두 인식</p>
                  <p>· <strong>날짜 입력 6자리 년도 버그 수정</strong>: 모든 <code>type=date</code> 입력에 <code>max="9999-12-31"</code> 적용 — 4자리 년도로 강제 제한</p>
                </Section>

                <Section title={t('★ 메일 발송 — 본인 계정 발송 + 관리자 이력', 'Email — Send-as-User + Admin History')}>
                  <p>· <strong>본인 Gmail 계정으로 발송</strong> 가능 — 출장 신청/보고, AS 보고 메일이 "시스템 계정"이 아닌 <strong>작성자 본인 Gmail 계정으로 발송</strong>되고 본인 보낸편지함에 자동 저장</p>
                  <p>· 활성화 방법: <strong>시스템 설정 → "메일 발송 GAS URL" 등록</strong> (별도 배포한 사용자 권한 실행 GAS의 웹앱 URL)</p>
                  <p>· 첫 발송 시 <strong>Google OAuth 동의 화면이 1회</strong> 떠서 권한 허용 → 이후로는 자동 발송</p>
                  <p>· 미설정 시: 기존대로 시스템 계정 발송 (보낸이 표시 "김철수 (MAK-PMS)" + reply-to)</p>
                  <p>· <strong>관리자 메일 발송 이력 (히든 메뉴)</strong>: ADMIN 사이드바에 <strong>"메일 발송 이력"</strong> 메뉴 추가 — 전사 메일 발송 기록을 종류/기간/검색으로 추적, Excel 추출 가능</p>
                  <p>· 기록 컬럼: 발송시각, 종류(출장신청/보고·AS보고), 수신/참조, 제목, 작성자, <strong>발송계정 (실제 Gmail)</strong>, 프로젝트</p>
                </Section>

                <Section title={t('★ 추가 기능 — 도메인 계층화 / 임포트 / 메일 양식 (NEW)', 'Features — Domain Hierarchy / Import / Email (NEW)')}>
                  <p>· <strong>도메인 계층화</strong>: 산업군이 <strong>대분류 + 중분류</strong> 구조로. 2차전지(EOL/ESS/사이클러), 반도체(플라즈마), 디스플레이. 시스템 설정 → "도메인 관리" 패널에서 중분류 자유 추가/삭제</p>
                  <p>· 기존 "2차전지 EOL" 같은 데이터는 부팅 시 <strong>자동 마이그레이션</strong> — 손실 없음</p>
                  <p>· 프로젝트 리스트 필터에 대분류 + 중분류 조합 모두 표시 ("2차전지" 선택 시 EOL/ESS/사이클러 다 포함, "2차전지 · EOL" 정확히 일치 필터)</p>
                  <p>· <strong>추가 대응 파일 임포트</strong>: 추가 대응 탭에 "파일로 일괄 등록" 버튼. <strong>Excel(.xlsx) 또는 시트 붙여넣기</strong>로 일괄 등록. 템플릿 다운로드 제공, 행별 검증/미리보기</p>
                  <p>· <strong>메일 송부 양식 3종</strong>: 출장 신청서 / 출장 보고서 / AS 보고서. HTML 양식 자동 생성 + 미리보기 + 수신/참조 입력</p>
                </Section>

                <Section title={t('★ 주간 보고 자동 집계 버그 수정 — 날짜 파싱', 'Weekly Report Aggregation Fix — Date Parsing')}>
                  <p>· 한국 로케일 <code className="bg-slate-100 px-1 rounded text-[10px]">toLocaleString()</code>으로 저장된 날짜(<code className="bg-slate-100 px-1 rounded text-[10px]">"2025. 5. 13. 오후 3:30:00"</code>)가 <code className="bg-slate-100 px-1 rounded text-[10px]">new Date(...)</code>로 파싱되지 않아 <strong>활동 이력/AS/회의록/노트/고객 요청 집계가 모두 0건</strong>으로 나오던 버그 수정</p>
                  <p>· 새로 저장되는 타임스탬프는 <code className="bg-slate-100 px-1 rounded text-[10px]">sv-SE</code> 로케일 형식(<code className="bg-slate-100 px-1 rounded text-[10px]">"2025-05-13 15:30:00"</code>)으로 통일 — 사람이 읽기 좋고 어디서나 파싱됨</p>
                  <p>· 기존 한국 로케일 데이터도 <strong>견고한 파서</strong>(<code className="bg-slate-100 px-1 rounded text-[10px]">parseAnyDate</code>)가 일자만 추출해 살림 — 기존 활동 이력 손실 없음</p>
                  <p>· 영향 파일: <code className="bg-slate-100 px-1 rounded text-[10px]">src/utils/dateUtils.js</code> 신규, <code className="bg-slate-100 px-1 rounded text-[10px]">src/App.js</code> 15곳, <code className="bg-slate-100 px-1 rounded text-[10px]">WeeklyReportView.js</code></p>
                </Section>

                <Section title={t('★ 엔지니어 드롭다운 "null" 표시 수정 (NEW)', 'Engineer Dropdown "null" Fix (NEW)')}>
                  <p>· 프로젝트/담당자 변경 모달의 엔지니어 드롭다운에서 일부 항목이 <code className="bg-slate-100 px-1 rounded text-[10px]">"신대선 · SW팀 · null"</code> 처럼 표시되던 문제</p>
                  <p>· 원인: 레거시 <code className="bg-slate-100 px-1 rounded text-[10px]">eng.role</code> 필드를 참조 — 일부 데이터에 문자열 <code className="bg-slate-100 px-1 rounded text-[10px]">"null"</code>이 들어가 있었음. 새 스키마는 <code className="bg-slate-100 px-1 rounded text-[10px]">eng.grade</code>(직급) 사용</p>
                  <p>· 해결: <code className="bg-slate-100 px-1 rounded text-[10px]">grade</code> 우선 표시 → 없으면 <code className="bg-slate-100 px-1 rounded text-[10px]">role</code> 폴백 + 문자열 <code className="bg-slate-100 px-1 rounded text-[10px]">"null"</code> 방어 필터</p>
                </Section>

                <Section title={t('★ 검토안 문서 추가 — 오프라인 큐잉 / Drive 권한 (NEW)', 'Design Docs — Offline Queue / Drive Permissions (NEW)')}>
                  <p>· <code className="bg-slate-100 px-1 rounded text-[10px]">docs/오프라인-큐잉-검토안.md</code> — 인터넷 끊긴 환경(공장 内)에서 작성한 데이터를 IndexedDB 큐에 적재하고 온라인 복귀 시 자동 전송하는 기능 검토안. 범위 옵션(A/B/C/D), 충돌 처리, 멱등성, 구현 일정 19h 등 의사결정 항목 정리</p>
                  <p>· <code className="bg-slate-100 px-1 rounded text-[10px]">docs/Drive-권한-협의안.md</code> — 회의록/노트/참고자료/AS 업로드 폴더의 접근 권한 정책 협의안. 접근 범위, 외부 공유, 카테고리 차등, 권한 갱신·회수, 감사 로깅 등 7개 의사결정 항목</p>
                  <p>· 두 문서 모두 <strong>업무 협의 후 범위 확정용</strong> — 단순 구현 전 정책 합의 필요</p>
                </Section>

                <Section title={t('★ 서비스명 변경 — EQ-PMS → MAK-PMS', 'Rebrand — EQ-PMS → MAK-PMS')}>
                  <p>· 사용자 노출 텍스트 전반(사이드바·로그인·도움말·브라우저 탭·Excel 내보내기 등) <strong>EQ-PMS → MAK-PMS</strong> 일괄 변경</p>
                  <p>· 로고 글자 <code className="bg-slate-100 px-1 rounded text-[10px]">E</code> → <code className="bg-blue-100 px-1 rounded text-[10px]">M</code></p>
                  <p>· <strong>Webhook 알림 메시지 prefix</strong>도 <code className="bg-slate-100 px-1 rounded text-[10px]">[MAK-PMS 알림: …]</code>로 변경 — GAS 백엔드도 같이 재배포해야 알림 메일이 정상 발송됨</p>
                  <p>· <strong>호환 유지</strong>: localStorage 키(<code className="bg-slate-100 px-1 rounded text-[10px]">eq_pms_*</code>)·비밀번호 SALT는 그대로 둠 — 기존 사용자 설정·로그인 정보 보존</p>
                  <p>· 사용자 교육 자료(슬라이드 md / pptx) 파일명도 <code className="bg-slate-100 px-1 rounded text-[10px]">MAK-PMS_사용자교육.*</code>로 변경</p>
                </Section>

                <Section title={t('★ 회의록 탭 — 회의록 / 노트 두 종류 + 필터 (NEW)', 'Notes Tab — Meeting / Note + Filter (NEW)')}>
                  <p>· 회의록 탭이 <strong>회의록 + 일반 노트</strong> 두 종류를 함께 관리하도록 확장</p>
                  <p>· "새 회의록 작성" / "새 노트 작성" 버튼이 분리되어 진입 즉시 종류 선택</p>
                  <p>· <strong>노트 모드</strong>: 회의 일시·참석자·결정·액션 필드 없이 본문 + 첨부만 — 회의가 아닌 중요 정보·결정 메모용</p>
                  <p>· <strong>리스트 상단 필터 칩</strong>: 전체 / 회의록 N / 노트 N — 필요한 종류만 빠르게 조회</p>
                  <p>· 카드에 <strong>종류 뱃지</strong>(<code className="bg-amber-100 text-amber-800 px-1 rounded text-[10px]">회의록</code> amber / <code className="bg-slate-200 text-slate-800 px-1 rounded text-[10px]">노트</code> slate) 표시</p>
                  <p>· 알림 센터·활동 이력에서는 그대로 <strong>"공유 노트"</strong>로 분류 (기존 호환)</p>
                </Section>

                <Section title={t('★ 고객사 정보 / 명함 관리 — 별도 마스터 페이지 신설 (NEW)', 'Customers & Business Cards — New Master Page (NEW)')}>
                  <p>· <strong>사이드바 새 메뉴 "고객사 관리"</strong> — 고객사 기본 정보(이름/산업군/전화/주소/홈페이지/메모)와 담당자(명함)를 한 곳에서 관리</p>
                  <p>· <strong>한 담당자가 여러 사이트를 담당</strong>하는 케이스 지원 — 담당자 명함에 사이트 다중 매핑 가능</p>
                  <p>· <strong>명함 카드 자동 렌더링</strong> — 이미지 첨부 대신 정보 입력(이름/직책/부서/이메일/전화/모바일/사이트) → 시스템이 명함 디자인으로 렌더. 카드 hover 시 수정/삭제 아이콘</p>
                  <p>· <strong>프로젝트·사이트 모달 → 드롭다운 전환</strong> — 등록된 고객사는 select로 선택, "직접 입력" 옵션도 유지. 미연결 시 amber 뱃지로 표시</p>
                  <p>· <strong>자동 발견 + 일괄 등록</strong> — 기존 텍스트 customer 중 customers에 없는 이름들을 상단 amber 배너로 안내하고 "한 번에 등록" 버튼 제공</p>
                  <p>· <strong>안전한 마이그레이션</strong> — customer 텍스트 필드는 보존, customerId만 신규 추가. 자동 매칭 실패 시에도 데이터 손실 없음</p>
                  <p>· <strong>안전한 삭제</strong> — 고객사 삭제 시 연관 프로젝트·사이트는 customerId만 해제, 텍스트 정보는 유지</p>
                </Section>

                <Section title={t('★ 주간 업무 보고 — 자동 집계 보고 + 팀 종합 보고서 (NEW)', 'Weekly Reports — Auto-aggregated + Team Consolidation (NEW)')}>
                  <p>· <strong>수기 작성 X, 자동 집계 O</strong> — 한 주간 시스템에 등록된 본인 활동(이슈/회의록/AS/고객요청/버전/출장/추가 대응 등)을 분석해 <strong>금주 실적 / 차주 계획 / 이슈·리스크</strong> 3개 섹션을 자동으로 채움</p>
                  <p>· <strong>"100% 자동 작성"</strong> 버튼 1번이면 끝. 필요 시 텍스트만 다듬으면 됨</p>
                  <p>· <strong>"자동 + Excel" / "자동 + PDF"</strong> 단축 버튼으로 자동 작성 → 추출까지 1번에</p>
                  <p>· 워크플로우: <strong>임시저장 → 제출 → 팀장 승인/반려</strong>. 반려 시 사유가 작성자 화면 상단에 강조 배너로 표시</p>
                  <p>· <strong>팀장 권한 (PM과 별도)</strong> — 사용자 관리의 "팀장" 토글로 부여. 같은 부서(dept) 부서원 보고만 조회/검토/승인 (ADMIN은 전사)</p>
                  <p>· <strong>팀원 카드 클릭 → 같은 화면 모달</strong>에서 보고 내용 + 활동 근거를 함께 보고 승인/반려. 탭 이동 없음</p>
                  <p>· <strong>팀 종합 보고서 (팀장 전용)</strong> — 부서원 보고를 사람별 그룹(<code className="bg-slate-100 px-1 rounded text-[11px]">【 김팀장 】 ... 【 홍길동 】 ...</code>)으로 자동 통합 + 팀장 종합 코멘트 + 4개 통계 박스</p>
                  <p>· <strong>샘플 + 사용 가이드</strong> — 페이지 우측 상단 버튼. 30초 사용법, 자동 작성 결과 샘플, 팀 종합 보고서 시각 샘플 포함 (6개 섹션)</p>
                  <p>· <strong>활성화</strong> — 시스템 설정에서 기능 ON → 사용자 관리에서 사용자별 "주간 보고" / "팀장" 토글</p>
                </Section>

                <Section title={t('시스템 설정 — 글로벌 저장 바 통합', 'System Settings — Global Save Bar')}>
                  <p>· 페이지 하단 <strong>sticky 저장 바</strong> 도입. Drive 연동, 주간 업무 보고 ON/OFF 등 <strong>모든 설정을 한 번에 저장</strong></p>
                  <p>· 기존엔 카드별 저장 버튼이 분산되어 있어 어떤 버튼을 눌러야 할지 헷갈리던 문제 해결</p>
                </Section>

                <Section title={t('사용자 관리 — 팀장 / 주간 보고 컬럼', 'User Management — Team Lead / Weekly Report Columns')}>
                  <p>· <strong>"팀장" 컬럼 (항상 표시)</strong> — 토글로 부서장(팀장) 권한 부여. PM과 무관한 독립 부가 권한</p>
                  <p>· <strong>"주간 보고" 컬럼 (기능 활성화 시 표시)</strong> — 사용자별로 주간 보고 작성 권한 부여</p>
                </Section>

                <Section title={t('대시보드 KPI 5장 재구성 + 평균 진척률 강화', 'Dashboard KPI Reshape')}>
                  <p>· KPI 카드: 미해결 이슈 / 지연·위험 / 임박 마일스톤 / <strong>고객 요청 미처리</strong> / 평균 진척률(진행중)</p>
                  <p>· <strong>평균 진척률 카드 강화</strong>: 큰 숫자 + delta 뱃지(실적-계획) + 막대(실적+계획 마커) + 4버킷 분포(0-25/25-50/50-75/75-100) + 진행중 건수</p>
                  <p>· <strong>AS 미완료</strong>는 카드 대신 우측 위젯에 통합 (이슈/AS 상하 2단). 위젯 헤더 행 클릭으로 전체 팝업.</p>
                  <p>· 기존 "신규 착수 (30일)" KPI는 제거 (분석 모달에서 시계열로 추적).</p>
                </Section>

                <Section title={t('회의록 — 빠른/상세 모드 + 다중 파일 + 타임라인', 'Meetings — Modes + Multi-file + Timeline')}>
                  <p>· <strong>등록 폼 접기/펴기</strong>: "+ 새 회의록 작성" 버튼 클릭 시 펼침, 등록 후 자동 접힘. 평소엔 회의록 리스트가 즉시 보임.</p>
                  <p>· <strong>빠른 모드</strong>: 본문 + 한줄 요약 + 첨부</p>
                  <p>· <strong>상세 모드</strong>: 회의 일시 / 참석자 / 결정사항 / 액션 아이템 추가</p>
                  <p>· <strong>다중 파일 업로드</strong>: 드래그/클릭으로 여러 개. 진행률 `2/3 · 45%`</p>
                  <p>· <strong>타임라인 브랜치 표시</strong>: 좌측 amber 세로선 + 캘린더 스타일 날짜 노드(월/일/요일, 신선도 색상). 작성자/시간/상대시간/요약/본문/결정/액션/첨부.</p>
                </Section>

                <Section title={t('대시보드 — 분석/회의록 모달 분리, 회의록 그룹 + 접기/펴기', 'Dashboard — Analytics/Meetings Split + Collapsible Groups')}>
                  <p>· 헤더 버튼 분리: <strong>고급 분석</strong> (Lead Time/MTTR/도메인/월별/AS/고객요청) / <strong>회의록</strong> (검색·필터·프로젝트별 그룹).</p>
                  <p>· <strong>회의록 모달은 프로젝트별 그룹</strong>: 인디고 헤더 + 내부 amber 타임라인 브랜치. <strong>기본 모두 접힘</strong>, 헤더 클릭 시 펼침. 우측 ↗ 버튼은 해당 프로젝트 회의록 탭으로.</p>
                  <p>· 우측 상단 "전체 펼치기/접기" 토글</p>
                  <p>· 대시보드 중복 위젯 제거 (이슈 도넛/상태 막대/지연 위험 — 메인 대시보드와 중복)</p>
                </Section>

                <Section title={t('이력 탭 — 항목 클릭 점프', 'History — Click to Jump')}>
                  <p>프로젝트 상세 → 이력 탭의 활동 카드를 <strong>클릭하면 해당 탭으로 이동</strong>:</p>
                  <p>· TASK/PHASE/MANAGER/SIGN/VERSION/TRIP → 일정 / EXTRA → 추가 대응 / CHECKLIST → 검수표 / ISSUE → 이슈 / REQUEST → 고객요청 / AS → AS / NOTE → 회의록</p>
                  <p>· hover 인디고 border + ↗ 아이콘으로 시각화</p>
                </Section>

                <Section title={t('AS 통합관리 — 클릭 시 AS 탭 자동 활성', 'AS Page — Auto-open AS Tab')}>
                  <p>· AS 페이지에서 항목 클릭 → 모달이 <strong>AS 탭 활성 상태</strong>로 열림 (기존: 일정 탭)</p>
                  <p>· 모달 닫으면 사용자가 보던 페이지(AS, 인력 등) 그대로 유지 — 기존: 프로젝트 페이지로 강제 전환되던 것 수정</p>
                </Section>

                <Section title={t('대시보드 간트 — 범례 줄 추가 (색·마일스톤 의미 명시)', 'Dashboard Gantt — Inline Legend')}>
                  <p>· 헤더에 한 줄 안내만 있던 것을 <strong>전체 범례 줄</strong>로 확장 — 차트 위에 상시 표시</p>
                  <p>· <strong>막대 색</strong>: 파랑(진행) / 노랑(마감임박) / 빨강(이슈발생) / 초록(완료) — 좌=경과(진함), 우=예정(60% 투명)</p>
                  <p>· <strong>마일스톤 ◆</strong>: 빨강=D-7 임박 / 노랑=D-30 임박 / 핑크=단계 / 보라=셋업 / 파랑=납기 — 지난 항목은 40% 흐림</p>
                  <p>· 도움말 시작하기 탭에 <strong>"대시보드 간트 — 색상 / 마일스톤 ◆ 의미"</strong> 섹션도 함께 추가</p>
                </Section>
                <Section title={t('인력/리소스 페이지 — 대시보드 모달 수준의 풍부 레이아웃 동기화', 'Resources Page — Dashboard-grade Layout')}>
                  <p>· 페이지가 단순 테이블 위주였는데, <strong>대시보드 인력/리소스 상세 모달의 풍부 레이아웃을 페이지 상단으로 그대로 이식</strong></p>
                  <p>· <strong>6장 통계</strong> + <strong>3컬럼 그리드</strong>(현장별 배치 / 출장 일정 / 가용 풀) + <strong>인력 알림(풀 폭)</strong> + 엔지니어 상세 테이블(상세 관리 그대로)</p>
                  <p>· 8주 가용성 히트맵은 헤더 <strong>"8주 가용성"</strong> 버튼으로 모달 토글 (평소 페이지 가볍게)</p>
                  <p>· 대시보드 모달은 빠른 미리보기용으로 그대로 유지 — 페이지로 이동하면 같은 레이아웃을 더 큰 폭에서 + CRUD까지</p>
                </Section>

                <Section title={t('간트 — 사이드바 (현장별/출장 일정) 반응형', 'Gantt — Responsive Sidebar')}>
                  <p>· 대시보드 "전체 프로젝트 일정 + 인력 배치" 영역에 좌측 260px 사이드바 (현장별 인력 배치 + 출장 일정)</p>
                  <p>· 간트 본체 row 수에 비례해서 사이드바 카드도 늘어남 (flex-1) — 두 카드 균등 분할 + 내부 스크롤</p>
                  <p>· 간트 본체에 PM 뱃지(인디고 PM|이름) + 마일스톤 다이아몬드(D-7 이내 펄스 애니메이션)</p>
                </Section>

                <Section title={t('일정 탭 — 단계별 / 셋업 두 모달 패턴 통일', 'Schedule Tab — Two Modal-Based Editors')}>
                  <p>· <strong>"셋업 일정" 탭 → "일정" 탭</strong>으로 변경. 내부에 [프로젝트 단계별 일정] / [셋업 일정] 두 서브탭.</p>
                  <p>· <strong>두 서브탭 모두 동일 패턴</strong>: 위쪽 보라/파랑 헤더 박스에 진척 정보 + <strong>[단계 편집] / [셋업 일정 편집]</strong> 버튼. 클릭 시 모달이 열려 일괄 추가·수정·삭제·순서·일정·마일스톤·완료 토글까지 한꺼번에 편집.</p>
                  <p>· <strong>표는 읽기 전용</strong> (양 탭 동일 컬럼: # / 이름 / 시작일 / 종료일 / 마일스톤 / 상태). 표에서 직접 수정하다가 의도치 않게 바뀌는 일 방지.</p>
                  <p>· <strong>SetupTaskEditModal 신규</strong>: 균등 분배 / 일정 비우기 / 위↑↓ 순서 / Enter로 빠른 추가 등 PhaseEditModal과 동일한 UX.</p>
                  <p>· <strong>모든 변경은 활동 이력 자동 기록</strong>: 단계 편집 → <code>PHASE_DEFINE</code>, 셋업 편집 → <code>SETUP_DEFINE</code> ("추가 N · 수정 M · 삭제 K" 요약). 이력 탭에서 각각 그룹 칩으로 모아보기 가능.</p>
                  <p>· 모달 폭 확대 (1280px) — 표·컬럼 가독성 확보.</p>
                </Section>

                <Section title={t('프로젝트 관리 — 산업 도메인 필터 추가', 'Projects — Domain Filter')}>
                  <p>· 프로젝트 관리 페이지 우측 상단에 <strong>도메인 필터</strong> 추가 (전체 도메인 / 반도체 / 디스플레이 / 2차전지 등). 등록된 도메인만 옵션으로 노출.</p>
                  <p>· 담당자 필터와 <strong>AND 조건</strong>으로 함께 동작. 리스트 뷰뿐 아니라 <strong>간트차트 뷰에도 자동 적용</strong>.</p>
                </Section>

                <Section title={t('회의록 / 참고자료 분리', 'Meetings / Files Split')}>
                  <p>· <strong>"노트" 탭 → "회의록" 탭으로 변경</strong> — 본문 + 요약 + 회의록 원본 파일을 한 항목에 통합 등록</p>
                  <p>· <strong>회의록 파일 첨부</strong> — Drive의 별도 <code className="bg-slate-100 px-1 rounded">[프로젝트]/회의록</code> 폴더에 자동 저장. 회의록 카드에서 바로 열기/다운로드</p>
                  <p>· <strong>참고자료 카테고리 폴더링</strong> — 업로드 시 <strong>명세서 / 도면 / 기타</strong> 선택. Drive에 카테고리별 하위 폴더 자동 생성, 목록은 카테고리 필터 칩으로 그룹 보기</p>
                  <p>· <strong>참고자료 ↔ 회의록 분리</strong> — 회의록은 회의록 탭에서만 표시되어 자료 탐색이 명확</p>
                </Section>

                <Section title={t('간트차트 / 일정 관리 개편', 'Gantt & Schedule Overhaul')}>
                  <p>· <strong>단계별 / 셋업 일정 탭 분리</strong> — 인라인 간트와 간트차트 보기 모두 동일한 탭 구조</p>
                  <p>· <strong>오늘 표시 통일</strong> — 빨간 점선 + "▼ 오늘" 알약. 헤더 위 별도 공간에 배치되어 날짜를 가리지 않음</p>
                  <p>· <strong>줌 (0.5x ~ 4x)</strong> — 휠로 줌, <strong>Shift+휠로 가로 이동</strong>. ZoomIn/Out/오늘 버튼 제공 (인라인 간트 + 간트차트 탭 모두)</p>
                  <p>· <strong>자동 초기 스크롤</strong> — 차트 진입 시 today-1개월 위치로 자동 이동, 현재 시점에 집중</p>
                  <p>· <strong>좌측 칸 / 헤더 고정</strong> — 작업명/단계명 칸은 가로 스크롤 무관하게 항상 보이고, 월/일 헤더는 sticky-top</p>
                  <p>· <strong>차트 범위 자동 확장</strong> — 프로젝트 + 셋업 작업 + 출장 일정을 모두 포함하도록 자동 계산. 일정 미정 안전 처리</p>
                  <p>· <strong>날짜 라벨 100% 채움</strong> — 우측 빈 영역 없이 마지막 날짜까지 항상 표시</p>
                  <p>· <strong>인라인 간트 폭 안전</strong> — 리스트 보기 시 차트가 페이지를 벗어나지 않도록 부모 폭 기반(%) 사이징, 줌 시에도 td 안에서만 스크롤</p>
                </Section>

                <Section title={t('간트차트 — 시각 강화', 'Gantt — Visual Enhancements')}>
                  <p>· <strong>프로젝트별 색상 자동 부여</strong> — 10가지 색 자동 회전, 좌측 칸/막대/그룹 헤더에 일관 적용</p>
                  <p>· <strong>단계별 탭 막대 분할</strong> — 8단계 색 분할(완료=진하게 / 현재=70% / 예정=흐림), 외곽선이 프로젝트 색</p>
                  <p>· <strong>셋업 일정 그룹 헤더 강화</strong> — 프로젝트 색상 배경/테두리/좌측 띠 + <strong>담당자/현재 단계/진행률/작업 수</strong>를 헤더에 함께 표시 (단계별 탭과 동등한 정보량)</p>
                  <p>· <strong>마일스톤 (SOP) 마커</strong> — 단계/셋업 작업에 별 토글 → 막대 대신 빨간 ◆ 다이아몬드 + 종료일 라벨</p>
                  <p>· <strong>출장 일정 자동 표시</strong> — 인라인 간트 상단에 인디고 막대 (담당자명 + 일자)</p>
                  <p>· <strong>프로젝트 다중 필터</strong> — 간트차트 탭 좌상단의 체크박스 드롭다운. 검색 + 전체 선택/해제 + 부분 선택 표시</p>
                  <p>· <strong>막대 라벨 우측 외부 표시</strong> — 셋업/출장 막대가 좁아도 작업명이 잘리지 않도록 막대 끝에 라벨 표시</p>
                </Section>

                <Section title={t('프로젝트 정보', 'Project Info')}>
                  <p>· <strong>장비 코드 관리</strong> — 코드/장비명/비고 자유 추가/수정/삭제, 프로젝트 리스트에 파란 배지 (4개까지 + 더보기)</p>
                  <p>· <strong>2차전지 장비 스펙</strong> — 사이클러/EOL 도메인은 전압/전류/사양 입력 (보라 배지)</p>
                  <p>· <strong>산업군(도메인) 수정 (관리자)</strong> — 잘못 입력한 도메인을 사후 변경, 활동 로그 기록</p>
                  <p>· <strong>일정 미정(TBD) 옵션</strong> — 시작일/납기일 비워두기 가능 (체크박스 토글)</p>
                </Section>

                <Section title={t('단계 / 일정 관리', 'Phase & Schedule')}>
                  <p>· <strong>단계 자유 편집</strong> — 이름/순서/추가/삭제, 단계마다 시작/종료일 직접 지정</p>
                  <p>· <strong>균등 분배 / 일정 비우기 버튼</strong> — 프로젝트 기간을 단계 수로 자동 분배 또는 일괄 초기화</p>
                  <p>· <strong>마일스톤 토글</strong> — 단계 행에 별 버튼, 켜면 간트에서 다이아몬드로 표시</p>
                </Section>

                <Section title={t('이슈 / 출장 / 활동', 'Issue / Trip / Activity')}>
                  <p>· <strong>출장 등록 후 수정</strong> — 인력/일정/메모 변경 + 사유 입력, 수정 이력 자동 누적</p>
                  <p>· <strong>이슈 제목·담당자 수정 (관리자 전용)</strong> — 변경 전/후 + 사유가 이력에 기록</p>
                  <p>· <strong>활동 이력 (담당자별 통합 타임라인)</strong> — 인력/리소스 페이지에서 시계 아이콘 클릭 → 출장/이슈/노트/버전/AS/요청/PM변경 시간순 모아보기</p>
                </Section>

                <Section title={t('자격 / 사용자', 'Qualifications / Users')}>
                  <p>· <strong>안전교육 만료없음 옵션</strong> — 상시 이수 교육은 만료일 비워두기 가능 (자동 만료 카운트 제외)</p>
                  <p>· <strong>사용자 직급 필드</strong> — 사원/주임/대리/과장/차장/부장/이사 자동완성, 자유 입력 가능. 사용자 관리 테이블 이름 옆에 자동 표시</p>
                </Section>

                <Section title={t('UI / 사용성', 'UI / Usability')}>
                  <p>· <strong>수정/삭제 버튼 칩 통일</strong> — 모든 페이지에서 색상 칩 + 라벨로 표시되어 hover 없이도 명확</p>
                  <p>· <strong>버전 카테고리 인덱스 통일</strong> — 도메인 표준 순서로 정렬</p>
                  <p>· <strong>알림 센터 / 공유 노트 가시성 / Drive 첨부</strong> — 이전 라운드의 주요 추가</p>
                </Section>

                <Note>{t('각 기능의 자세한 사용법은 좌측의 해당 탭(프로젝트/팀/검수표 등)에서 확인하세요.', 'See the corresponding tab on the left for detailed usage.')}</Note>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
            {t('닫기', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
});

export default HelpModal;
