<script setup lang="ts">
import { useI18n } from 'vue-i18n'

/**
 * 文档启用/停用确认：布局与样式与智能体删除确认（DeleteAgentDialog）、文档删除（DeleteDocumentDialog）一致。
 * 停用：红色警示图标 + 红色主按钮；启用：同套白底圆角与排版，主按钮为深色主色（与表格主操作一致）。
 */
const props = defineProps<{
  visible: boolean
  documentName: string
  /** true = 即将执行「启用」，false = 即将执行「停用」 */
  targetEnabled: boolean
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
        <div class="dialog-box" role="dialog" aria-modal="true">
          <div
            class="dialog-icon"
            :class="props.targetEnabled ? 'dialog-icon-enable' : 'dialog-icon-danger'"
          >
            <svg
              v-if="!props.targetEnabled"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 9V13M12 17H12.01"
                stroke="#dc2626"
                stroke-width="2"
                stroke-linecap="round"
              />
              <path
                d="M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z"
                stroke="#dc2626"
                stroke-width="1.8"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                stroke="#16a34a"
                stroke-width="1.8"
              />
              <path
                d="M8 12L11 15L16 9"
                stroke="#16a34a"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>

          <div class="dialog-body">
            <h3 class="dialog-title">
              {{ props.targetEnabled ? t('knowledgeBase.documents.toggleDialog.enableTitle') : t('knowledgeBase.documents.toggleDialog.disableTitle') }}
            </h3>
            <p v-if="!props.targetEnabled" class="dialog-desc">
              {{ t('knowledgeBase.documents.toggleDialog.disableDescription', { name: documentName }) }}
            </p>
            <p v-else class="dialog-desc">
              {{ t('knowledgeBase.documents.toggleDialog.enableDescription', { name: documentName }) }}
            </p>
          </div>

          <div class="dialog-actions">
            <button
              type="button"
              class="btn-cancel"
              :disabled="props.confirmLoading"
              @click="emit('cancel')"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              v-if="!props.targetEnabled"
              type="button"
              class="btn-confirm btn-confirm-danger"
              :disabled="props.confirmLoading"
              @click="emit('confirm')"
            >
              {{ props.confirmLoading ? t('knowledgeBase.documents.toggleDialog.submitting') : t('knowledgeBase.documents.toggleDialog.confirmDisable') }}
            </button>
            <button
              v-else
              type="button"
              class="btn-confirm btn-confirm-primary"
              :disabled="props.confirmLoading"
              @click="emit('confirm')"
            >
              {{ props.confirmLoading ? t('knowledgeBase.documents.toggleDialog.submitting') : t('knowledgeBase.documents.toggleDialog.confirmEnable') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* 与 DeleteAgentDialog / DeleteDocumentDialog 对齐 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.dialog-box {
  background: #ffffff;
  border-radius: 14px;
  padding: 28px;
  width: 100%;
  max-width: min(400px, calc(100vw - 48px));
  min-width: 0;
  box-sizing: border-box;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dialog-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-icon-danger {
  background: rgba(239, 68, 68, 0.08);
}

.dialog-icon-enable {
  background: rgba(34, 197, 94, 0.1);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  width: 100%;
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
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.dialog-desc .dialog-doc-name {
  color: #1a1a1a;
  font-weight: 600;
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
}

.btn-cancel:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.btn-confirm {
  padding: 8px 18px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-confirm-danger {
  background: #dc2626;
  border-color: #dc2626;
}

.btn-confirm-danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.btn-confirm-primary {
  background: #2d2d2d;
  border-color: #2d2d2d;
}

.btn-confirm-primary:hover:not(:disabled) {
  background: #1a1a1a;
  border-color: #1a1a1a;
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
