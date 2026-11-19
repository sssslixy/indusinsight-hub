<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { WorkbenchStep } from '@/types/modules/agentWorkbench'

const props = defineProps<{
  steps: WorkbenchStep[]
  /** 当前运行中的步骤 id（由系统状态驱动，用于高亮） */
  currentStepId: string | null
  runtime?: {
    currentStageGoal?: string
    currentSubgoal?: string
    nextAction?: string
    skillRequirement?: string
    candidateSkillsSummary?: string
    selectedSkillName?: string
    selectedSkillId?: number
    selectedSkillVersionId?: number
    runtimeType?: string
    llmDecisionReason?: string
    evaluationReason?: string
    uncertaintyScore?: number
    stageStopReason?: string
    latestStageSummary?: string
    phaseLabel?: string
    status?: string
  } | null
}>()

const { t } = useI18n()

const statusLabel = (status: WorkbenchStep['status']) => {
  const map: Record<WorkbenchStep['status'], string> = {
    pending: 'workbench.steps.pending',
    running: 'workbench.steps.running',
    done: 'workbench.steps.done',
    failed: 'workbench.steps.failed',
    cancelled: 'workbench.steps.cancelled',
  }
  return t(map[status])
}
</script>

<template>
  <div class="step-sidebar">
    <div class="sidebar-head">
      <span class="sidebar-title">{{ t('workbench.steps.title') }}</span>
    </div>
    <nav class="step-list">
      <div
        v-for="(item, index) in steps"
        :key="item.id"
        class="step-item"
        :class="{
          'step-item--active': item.id === currentStepId && item.status === 'running',
          'step-item--done': item.status === 'done',
          'step-item--running': item.status === 'running',
          'step-item--failed': item.status === 'failed',
          'step-item--cancelled': item.status === 'cancelled',
        }"
      >
        <div class="step-badge" :class="`step-badge--${item.status}`">
          <svg
            v-if="item.status === 'done'"
            width="11"
            height="11"
            viewBox="0 0 11 11"
            fill="none"
          >
            <path
              d="M2 5.5L4.5 8L9 3"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span v-else class="step-num">{{ index + 1 }}</span>
        </div>
        <div class="step-content">
          <span class="step-name">{{ item.name }}</span>
          <span class="step-status" :class="`step-status--${item.status}`">
            {{ statusLabel(item.status) }}
            <template v-if="item.errorMessage"> · {{ item.errorMessage }}</template>
          </span>
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.step-sidebar {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.sidebar-head {
  padding: 0 4px 4px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  scrollbar-gutter: stable;
}

.step-list::-webkit-scrollbar {
  width: 4px;
}

.step-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.08);
  border-radius: 2px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 10px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: none;
  font-family: inherit;
  text-align: left;
  transition: background 0.17s ease;
}

.step-item--active {
  background: #f3f4f6;
  border-color: rgba(15, 23, 42, 0.2);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.step-item--done .step-badge--done {
  background: rgba(16, 185, 129, 0.12);
  color: #059669;
}

.step-item--running .step-badge--running {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.step-item--failed .step-badge--failed {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

/* 已终止：红色 */
.step-item--cancelled .step-badge--cancelled {
  background: rgba(239, 68, 68, 0.12);
  color: #dc2626;
}
.step-item--cancelled .step-status--cancelled {
  color: #dc2626;
}

.step-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #6b7280;
  transition: all 0.17s ease;
}

.step-item--active .step-badge {
  background: #111827;
  color: #ffffff;
}

.step-num {
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.step-name {
  font-size: 14px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.step-status {
  font-size: 12px;
  color: #9ca3af;
}

.step-status--running {
  color: #2563eb;
  font-weight: 500;
}

.step-status--done {
  color: #059669;
  font-weight: 500;
}

.step-status--failed {
  color: #dc2626;
  font-weight: 500;
}

.step-status--cancelled {
  color: #dc2626;
  font-weight: 500;
}

</style>
