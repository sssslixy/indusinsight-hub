<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { validateCodeFileName } from '@/utils/validation/codeFileName'

const props = withDefaults(
  defineProps<{
    filename?: string
    languageTag?: string
    draftStatus?: 'unsaved' | 'saved'
    validateStatus?: '' | 'success' | 'fail'
    validateErrorCount?: number
    diffVisible?: boolean
    fullscreen?: boolean
    /** 已加载的模板标签，如「已加载 DP 默认模板」 */
    templateLabel?: string
    /** 格式化请求进行中，用于禁用按钮 */
    formatLoading?: boolean
  }>(),
  { filename: 'main.py', languageTag: 'Python', templateLabel: '', formatLoading: false }
)

const emit = defineEmits<{
  'update:filename': [val: string]
  format: []
  validate: []
  toggleDiff: []
  fullscreen: []
}>()

const { t } = useI18n()

const filenameError = computed(() => {
  const r = validateCodeFileName(props.filename || '')
  return r.valid || !r.messageKey ? '' : t(r.messageKey)
})

const onFilenameInput = (e: Event) => {
  const val = (e.target as HTMLInputElement).value
  emit('update:filename', val)
}
</script>

<template>
  <div class="editor-toolbar">
    <div class="toolbar-left">
      <div class="toolbar-filename-wrap">
        <input
          type="text"
          class="toolbar-filename-input"
          :class="{ 'toolbar-filename-input--error': filenameError }"
          :value="filename"
          placeholder="main.py"
          @input="onFilenameInput"
        />
        <span v-if="filenameError" class="toolbar-filename-error">{{ filenameError }}</span>
      </div>
      <span class="toolbar-lang">{{ languageTag }}</span>
      <span
        class="toolbar-draft"
        :class="{ 'toolbar-draft--unsaved': draftStatus === 'unsaved' }"
      >
        {{ draftStatus === 'unsaved' ? t('create.editor.unsaved') : t('create.editor.saved') }}
      </span>
      <span
        v-if="validateStatus === 'fail' && validateErrorCount != null"
        class="toolbar-validate-fail"
      >
        {{ t('create.editor.validationFailedCount', { count: validateErrorCount }) }}
      </span>
      <span v-else-if="validateStatus === 'success'" class="toolbar-validate-ok">
        {{ t('create.editor.validationPassed') }}
      </span>
      <span v-if="templateLabel" class="toolbar-template-label">{{ templateLabel }}</span>
    </div>
    <div class="toolbar-right">
      <button
        type="button"
        class="toolbar-btn"
        :disabled="formatLoading"
        @click="emit('format')"
      >
        {{ formatLoading ? t('create.editor.formatting') : t('create.editor.formatCode') }}
      </button>
      <button
        type="button"
        class="toolbar-btn toolbar-btn--primary"
        @click="emit('validate')"
      >
        {{ t('create.editor.validateCode') }}
      </button>
      <button
        type="button"
        class="toolbar-btn"
        :class="{ 'toolbar-btn--active': diffVisible }"
        @click="emit('toggleDiff')"
      >
        {{ t('create.editor.codeDiff') }}
      </button>
      <button type="button" class="toolbar-btn" @click="emit('fullscreen')">
        {{ t('create.editor.fullscreenEdit') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: 40px;
  padding: 0 14px;
  background: #f9fafb;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 13px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.toolbar-filename-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  min-width: 0;
  max-width: 200px;
}

.toolbar-filename-input {
  width: 100%;
  min-width: 72px;
  height: 26px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 5px;
  font-family: ui-monospace, 'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, Monaco, 'Source Code Pro', monospace;
  outline: none;
  transition: border-color 0.18s ease;
}
.toolbar-filename-input::placeholder {
  color: #9ca3af;
}
.toolbar-filename-input:hover {
  border-color: rgba(0, 0, 0, 0.2);
}
.toolbar-filename-input:focus {
  border-color: #374151;
  box-shadow: 0 0 0 2px rgba(55, 65, 81, 0.08);
}
.toolbar-filename-input--error {
  border-color: #b91c1c;
}
.toolbar-filename-input--error:focus {
  box-shadow: 0 0 0 2px rgba(185, 28, 28, 0.15);
}

.toolbar-filename-error {
  flex-shrink: 0;
  font-size: 11px;
  color: #b91c1c;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-lang {
  color: #6b7280;
  font-size: 12px;
  flex-shrink: 0;
}

.toolbar-draft {
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}
.toolbar-draft--unsaved {
  color: #b45309;
}

.toolbar-validate-fail {
  font-size: 12px;
  color: #b91c1c;
  flex-shrink: 0;
}
.toolbar-validate-ok {
  font-size: 12px;
  color: #047857;
  flex-shrink: 0;
}

.toolbar-template-label {
  font-size: 12px;
  color: #6b7280;
  flex-shrink: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.toolbar-btn {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  color: #374151;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: inherit;
  white-space: nowrap;
}
.toolbar-btn:hover {
  background: #f3f4f6;
  border-color: rgba(0, 0, 0, 0.18);
}
.toolbar-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.toolbar-btn--primary {
  background: #374151;
  border-color: #374151;
  color: #ffffff;
}
.toolbar-btn--primary:hover {
  background: #1f2937;
  border-color: #1f2937;
}
.toolbar-btn--active {
  background: #f3f4f6;
  border-color: #374151;
  color: #111827;
}
</style>
