<script setup lang="ts">
import { useI18n } from 'vue-i18n'

export interface CodeIssue {
  severity: 'error' | 'warning'
  line: number
  column: number
  message: string
}

defineProps<{
  issues?: CodeIssue[]
}>()

const emit = defineEmits<{
  gotoLine: [line: number]
}>()

const { t } = useI18n()

const handleClick = (line: number) => {
  emit('gotoLine', line)
}
</script>

<template>
  <div class="code-issue-panel">
    <template v-if="issues && issues.length > 0">
      <button
        v-for="(item, idx) in issues"
        :key="idx"
        type="button"
        class="issue-row"
        :class="{ 'issue-row--error': item.severity === 'error', 'issue-row--warning': item.severity === 'warning' }"
        @click="handleClick(item.line)"
      >
        <span class="issue-type" :class="'issue-type--' + item.severity">
          {{ item.severity === 'error' ? t('create.editor.error') : t('create.editor.warning') }}
        </span>
        <span class="issue-loc">L{{ item.line }}:{{ item.column }}</span>
        <span class="issue-msg">{{ item.message }}</span>
      </button>
    </template>
    <div v-else class="issue-empty">{{ t('create.editor.noIssues') }}</div>
  </div>
</template>

<style scoped>
.code-issue-panel {
  padding: 8px 0;
  max-height: 200px;
  overflow-y: auto;
}

.issue-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 6px 12px;
  text-align: left;
  font-size: 13px;
  color: #374151;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s ease;
}
.issue-row:hover {
  background: rgba(0, 0, 0, 0.04);
}
.issue-row--error {
  border-left: 3px solid #b91c1c;
}
.issue-row--warning {
  border-left: 3px solid #b45309;
}

.issue-type {
  flex-shrink: 0;
  font-weight: 500;
  font-size: 12px;
}
.issue-type--error {
  color: #b91c1c;
}
.issue-type--warning {
  color: #b45309;
}

.issue-loc {
  flex-shrink: 0;
  color: #6b7280;
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.issue-msg {
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.issue-empty {
  padding: 16px 12px;
  font-size: 13px;
  color: #9ca3af;
  text-align: center;
}
</style>
