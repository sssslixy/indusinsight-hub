<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

/**
 * 历史会话重命名：布局与 DeleteSessionDialog / DeleteAgentDialog 一致，表单区为输入框。
 */
const props = defineProps<{
  visible: boolean
  initialTitle: string
  confirmLoading?: boolean
}>()

const emit = defineEmits<{
  confirm: [value: string]
  cancel: []
}>()

const { t } = useI18n()

const titleInput = ref('')
const inputEl = ref<HTMLInputElement | null>(null)
const errorHint = ref('')

watch(
  () => [props.visible, props.initialTitle] as const,
  ([open, initial]) => {
    if (open) {
      titleInput.value = initial || ''
      errorHint.value = ''
      void nextTick(() => {
        inputEl.value?.focus()
        inputEl.value?.select()
      })
    }
  },
  { immediate: true }
)

function handleConfirm() {
  const trimmedTitle = titleInput.value.trim()
  if (!trimmedTitle) {
    errorHint.value = t('workbench.session.titleRequired')
    return
  }
  if (trimmedTitle.length > 200) {
    errorHint.value = t('workbench.session.titleMax')
    return
  }
  errorHint.value = ''
  emit('confirm', trimmedTitle)
}

function handleCancel() {
  errorHint.value = ''
  emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div v-if="visible" class="dialog-overlay" @click.self="handleCancel">
        <div class="dialog-box">
          <div class="dialog-icon dialog-icon--rename">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                stroke="#2563eb"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
          <div class="dialog-body">
            <h3 class="dialog-title">{{ t('workbench.session.renameTitle') }}</h3>
            <p class="dialog-desc">{{ t('workbench.session.renameDesc') }}</p>
            <div class="dialog-field">
              <input
                ref="inputEl"
                v-model="titleInput"
                type="text"
                class="dialog-input"
                maxlength="200"
                :placeholder="t('workbench.session.titlePlaceholder')"
                :disabled="props.confirmLoading"
                @keydown.enter.prevent="handleConfirm"
              />
              <p v-if="errorHint" class="dialog-error">{{ errorHint }}</p>
            </div>
          </div>
          <div class="dialog-actions">
            <button type="button" class="btn-cancel" :disabled="props.confirmLoading" @click="handleCancel">
              {{ t('common.cancel') }}
            </button>
            <button type="button" class="btn-confirm" :disabled="props.confirmLoading" @click="handleConfirm">
              {{ props.confirmLoading ? t('workbench.session.saving') : t('workbench.session.confirm') }}
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-icon--rename {
  background: rgba(59, 130, 246, 0.12);
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.dialog-desc {
  font-size: 14px;
  color: #737373;
  margin: 0;
  line-height: 1.5;
}

.dialog-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialog-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.45;
  color: #1a1a1a;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  font-family: inherit;
}

.dialog-input::placeholder {
  color: #a3a3a3;
}

.dialog-input:hover:not(:disabled) {
  border-color: rgba(0, 0, 0, 0.2);
}

.dialog-input:focus {
  border-color: rgba(15, 23, 42, 0.2);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.dialog-input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.dialog-error {
  font-size: 12px;
  color: #dc2626;
  margin: 0;
  line-height: 1.4;
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

/* 与历史侧栏「新建会话」等主按钮一致：黑底白字 */
.btn-confirm {
  padding: 8px 18px;
  background: #111827;
  border: 1px solid #111827;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
  font-family: inherit;
}

.btn-confirm:hover:not(:disabled) {
  background: #020617;
  border-color: #020617;
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
