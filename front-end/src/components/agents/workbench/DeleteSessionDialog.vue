<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * 历史会话删除确认：布局与样式对齐 DeleteAgentDialog / DeleteKnowledgeBaseDialog。
 */
const props = defineProps<{
  visible: boolean
  sessionTitle: string
  confirmLoading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="emit('cancel')">
        <div class="dialog-box">
          <div class="dialog-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 9V13M12 17H12.01" stroke="#dc2626" stroke-width="2" stroke-linecap="round" />
              <path
                d="M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
                stroke="#dc2626"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="dialog-body">
            <h3 class="dialog-title">{{ t('workbench.session.deleteTitle') }}</h3>
            <p class="dialog-desc">
              {{ t('workbench.session.deleteDesc', { title: sessionTitle }) }}
            </p>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn-cancel" :disabled="props.confirmLoading" @click="emit('cancel')">
              {{ t('common.cancel') }}
            </button>
            <button type="button" class="btn-confirm" :disabled="props.confirmLoading" @click="emit('confirm')">
              {{ props.confirmLoading ? t('workbench.session.deleting') : t('workbench.session.confirmDelete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 24px;
}

.dialog-box {
  background: #ffffff;
  border-radius: 14px;
  padding: 28px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.dialog-desc {
  font-size: 14px;
  color: #525252;
  margin: 0;
  line-height: 1.6;
}

.dialog-desc strong {
  color: #1a1a1a;
  font-weight: 500;
  word-break: break-all;
}

.dialog-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.btn-cancel {
  padding: 8px 18px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.btn-confirm {
  padding: 8px 18px;
  background: #dc2626;
  border: 1px solid #dc2626;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.btn-confirm:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-box,
.dialog-leave-active .dialog-box {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-box,
.dialog-leave-to .dialog-box {
  transform: scale(0.95) translateY(8px);
  opacity: 0;
}
</style>
