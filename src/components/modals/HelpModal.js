import React, { useState, memo } from 'react';
import { HelpCircle, Kanban, Users, AlertTriangle, LifeBuoy, GitCommit, ShieldCheck, Sparkles, Plane, FileText, X, ChevronRight, Info } from 'lucide-react';

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
  { key: 'checklist', label: '검수표/Buy-off', icon: ShieldCheck },
  { key: 'extras', label: '추가 대응', icon: Sparkles },
  { key: 'resource', label: '인력/리소스', icon: Users },
  { key: 'issue', label: '이슈/AS', icon: AlertTriangle },
  { key: 'version', label: '버전 관리', icon: GitCommit },
  { key: 'export', label: '보고서/Excel', icon: FileText },
  { key: 'roles', label: '권한별 기능', icon: LifeBuoy },
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
              <p className="text-xs text-indigo-600 mt-0.5">{t('EQ-PMS 주요 기능 사용 안내', 'EQ-PMS feature guide')}</p>
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
                <Section title="대시보드 미해결 이슈 카드 클릭">
                  <p>대시보드 상단 <strong>"미해결 이슈"</strong> 카드를 클릭하면 전체 이슈 목록 팝업이 열립니다 (심각도 순).</p>
                  <p>· 다른 페이지로 이동하지 않고도 즉시 확인 가능, 항목 클릭 시 상세 모달로 진입합니다.</p>
                </Section>
                <Section title="공유 노트 가시성">
                  <p>· 대시보드에 <strong>"최근 공유 노트"</strong> 섹션이 추가되어 전사 직원이 빠뜨리지 않고 확인할 수 있습니다.</p>
                  <p>· 검색바 + 프로젝트/작성자 필터 제공 — 카드에는 노트 전체 내용이 표시됩니다.</p>
                  <p>· 카드 클릭 시 해당 프로젝트의 <strong>노트 탭으로 직접 진입</strong>합니다.</p>
                  <p>· 프로젝트 리스트에도 노트 건수 배지(노란색)가 표시됩니다.</p>
                  <p>· 신규 노트는 알림 센터에도 자동으로 올라갑니다.</p>
                </Section>
                <Section title="참고 자료 (Google Drive 첨부)">
                  <p>프로젝트 상세 → <strong>"참고 자료"</strong> 탭에서 회의록·PDF·도면을 직접 업로드할 수 있습니다.</p>
                  <p>· 드래그&드롭 또는 클릭 → 자동으로 <code className="bg-slate-100 px-1 rounded text-[11px]">[루트]/[고객사]/[프로젝트]</code> Drive 폴더에 저장</p>
                  <p>· 단일 파일 최대 18MB (GAS 한도). 큰 파일은 Drive에 직접 올리고 링크를 공유하세요.</p>
                  <p>· 신규 첨부는 알림 센터에 자동 표시되고, 클릭 시 참고 자료 탭으로 직접 진입합니다.</p>
                  <p>· <strong>관리자 전 사전 작업</strong>: [시스템 설정 → Google Drive 연동]에서 루트 폴더 ID/URL 등록 + 연결 테스트 필수.</p>
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
                <Section title="단계 자유 편집 (PM 이상)">
                  <p>프로젝트마다 단계 구성을 자유롭게 편집할 수 있습니다.</p>
                  <p>· 셋업 일정 탭의 단계 칩 옆 <strong>"단계 편집"</strong> 버튼 → 모달</p>
                  <p>· 이름 변경, 단계 추가/삭제, 위/아래 순서 변경 가능</p>
                  <p>· 표준 8단계로 초기화 버튼 제공</p>
                  <p>· 마지막 단계 = 자동 "완료" 처리 단계로 인식</p>
                </Section>
                <Section title="프로젝트 정보 수정">
                  <p>리스트의 <strong>프로젝트명 또는 고객사/사이트 셀</strong>을 클릭하면 수정 모달이 열립니다 (ADMIN/PM만 가능).</p>
                  <p>이름·고객사·사이트·일정·담당자·Notion 링크 모두 수정 가능합니다.</p>
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
                  <Step n={2}>출발일/복귀일/메모(예: 셋업 1차, Buy-off 입회) 입력</Step>
                  <Step n={3}>한 사람이 같은 프로젝트에 <strong>여러 번 출장</strong> 등록 가능</Step>
                </Section>
                <Note>출장 일정은 인력/리소스 화면과 대시보드에 자동으로 출장 상태(현장 파견 / 출장 예정 / 복귀 N일 전 등)로 반영됩니다.</Note>
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
                <Section title="자격 정보 관리 (출입증/안전교육/비자)">
                  <Step n={1}>리스트의 <strong>"자격/만료" 셀</strong> 클릭 → 자격 관리 모달</Step>
                  <Step n={2}>3 탭(출입증/안전교육/비자)에서 각각 추가/삭제</Step>
                  <Step n={3}>한 사람이 여러 출입증 / 여러 안전교육 / 여러 비자를 가질 수 있습니다 (예: A사 출입증, B사 출입증)</Step>
                </Section>
                <Section title="자동 알림 (만료/임박)">
                  <p>· 만료된 항목은 <strong>빨간 배지</strong>, 30일 이내 임박은 <strong>노란 배지</strong>로 자동 표시</p>
                  <p>· 대시보드 인력/리소스 요약 카드에서 위험 인력을 한눈에 확인</p>
                  <p>· 비자 상태가 "필요" 또는 "만료"면 비자 이슈로 카운트</p>
                </Section>
                <Section title="출장 일정 = 자동 반영">
                  <p>프로젝트에서 등록한 출장 일정이 인력 화면에 <strong>현장 파견 / 출장 예정</strong>으로 자동 반영됩니다 (D-Day 표시).</p>
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
                <Section title="AS 통합 관리 (신규)">
                  <p>좌측 메뉴 <strong>"AS 통합 관리"</strong> — 전체 프로젝트의 AS 내역을 한 화면에서 조회 (AS 부서용).</p>
                  <p>· 검색 + 프로젝트/유형/상태 3중 필터</p>
                  <p>· 카드에서 프로젝트명 클릭 시 해당 프로젝트로 점프</p>
                  <p>· 상태(접수→출동→완료) 직접 변경</p>
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
                  <p>· <strong>대시보드 → 종합 리포트</strong>: 10개 시트 (기본통계/도메인/프로젝트/지연/이슈/요청/AS/담당자변경/엔지니어/활동이력)</p>
                  <p>· <strong>프로젝트 관리 → 리스트</strong>: 간단 리스트 1시트</p>
                  <p>· <strong>프로젝트 관리 → 상세</strong>: 프로젝트별 시트 분리, 모든 정보 (출장/추가 대응/버전 등) 포함</p>
                  <p>· 각 메뉴(이슈·자재·사이트·엔지니어·AS·버전)에 단독 Excel 버튼</p>
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
                        ['이슈 삭제', '✅', '✅', '❌', '❌'],
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
