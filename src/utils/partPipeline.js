import { PART_PIPELINE_PHASES, PART_QC_INDEX } from '../constants';

export const getNextStage = (currentStage) => {
  const idx = PART_PIPELINE_PHASES.indexOf(currentStage);
  if (idx < 0 || idx >= PART_PIPELINE_PHASES.length - 1) return null;
  return PART_PIPELINE_PHASES[idx + 1];
};

// QC 게이트: QC 이후 단계(제조, 납품)는 QC 합격 기록 필수
export const canAdvanceStage = (fromStage, toStage, partEvents, partId) => {
  const toIdx = PART_PIPELINE_PHASES.indexOf(toStage);
  if (toIdx > PART_QC_INDEX) {
    const qcPassed = partEvents.some(
      (e) => e.partId === partId && e.stage === 'QC' && e.status === '합격'
    );
    if (!qcPassed) return false;
  }
  return true;
};

export const createStageRecord = (partId, stage, actor, checklistResults = {}, status = '완료', notes = '', photoUrls = '', attachments = []) => ({
  id: `EVT-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  partId,
  stage,
  status,
  actor,
  completedAt: new Date().toISOString(),
  checklistResults,
  notes,
  photoUrls,
  attachments,
  aiDocUrl: '',
});

export const getStageCompletion = (partId, partEvents) =>
  partEvents
    .filter((e) => e.partId === partId && (e.status === '완료' || e.status === '합격'))
    .map((e) => e.stage);

export const isPipelineComplete = (partId, partEvents) =>
  partEvents.some((e) => e.partId === partId && e.stage === '납품' && (e.status === '완료' || e.status === '합격'));
