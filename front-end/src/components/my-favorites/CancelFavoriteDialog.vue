<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  visible: boolean
  itemName: string
  itemType: 'agent' | 'plugin' | 'tool' | 'knowledge-base'
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

const entityName = computed(() => {
  if (props.itemType === 'agent') return t('dashboard.entity.agent')
  if (props.itemType === 'tool') return t('dashboard.entity.tool')
  if (props.itemType === 'knowledge-base') return t('dashboard.entity.knowledgeBase')
  return t('dashboard.entity.skill')
})
</script>

<template>
  <div v-if="visible" class="dialog-overlay" @click.self="emit('cancel')">
    <div class="dialog-box">
      <div class="dialog-icon">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="12" stroke="#f59e0b" stroke-width="1.8"/>
          <path d="M14 9V15" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
          <circle cx="14" cy="19" r="1.2" fill="#f59e0b"/>
        </svg>
      </div>
      <h3 class="dialog-title">
        {{ t('common.confirmUnfavoriteTitle', { entity: entityName }) }}
      </h3>
      <p class="dialog-desc">
        {{ t('common.confirmUnfavoriteDesc', { name: itemName }) }}
      </p>
      <div class="dialog-actions">
        <button class="cancel-btn" @click="emit('cancel')">{{ t('common.cancel') }}</button>
        <button class="confirm-btn" @click="emit('confirm')">
          {{ t('common.confirmUnfavorite') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
  backdrop-filter: blur(2px);
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.dialog-box {
  background: #ffffff;
  border-radius: 14px;
  padding: 36px 32px 28px;
  max-width: 420px;
  width: calc(100% - 40px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.14);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  animation: slideUp 0.18s ease;
}

@keyframes slideUp {
  from { transform: translateY(12px); opacity: 0; }
  to   { transform: translateY(0); opacity: 1; }
}

.dialog-icon { margin-bottom: 2px; }

.dialog-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  text-align: center;
  line-height: 1.4;
}

.dialog-desc {
  font-size: 14px;
  color: #525252;
  margin: 0;
  text-align: center;
  line-height: 1.6;
}

.dialog-desc strong {
  color: #1a1a1a;
  font-weight: 600;
}

.dialog-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.cancel-btn {
  flex: 1;
  height: 40px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.confirm-btn {
  flex: 1;
  height: 40px;
  background: #dc2626;
  border: 1px solid #dc2626;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-btn:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
</style>
