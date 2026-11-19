<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { resolveAgentSourceType } from '@/api/myContent'

const props = defineProps<{
  agent: { sourceType?: string; source_type?: string }
}>()

const show = computed(() => resolveAgentSourceType(props.agent) === 'external_service')
const { t } = useI18n()
</script>

<template>
  <span v-if="show" class="agent-external-access-tag">{{ t('common.externalAccess') }}</span>
</template>

<style scoped>
/* 与 MyAgentCard .status-tag + .source-type-tag 视觉一致（独立类名避免与其它页面 status-tag 冲突） */
.agent-external-access-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
  background: rgba(14, 165, 233, 0.1);
  color: #0284c7;
}
</style>
