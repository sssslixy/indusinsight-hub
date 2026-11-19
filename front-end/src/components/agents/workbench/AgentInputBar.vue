<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { TASK_DATA_FILE_ACCEPT, type PipelineMode } from '@/api/taskTypes'

const props = withDefaults(
  defineProps<{
    disabled?: boolean
    placeholder?: string
    exampleQuestions?: string[]
    /** 已上传文件列表（展示用） */
    uploadedFiles?: { name: string; size: string; path?: string }[]
    /** 隐藏域 file input 的 accept */
    uploadAccept?: string
    /** 上传按钮文案 */
    uploadButtonLabel?: string
    /** 仅有附件、输入框为空时发送的默认文案（平台流程 vs 通用外部服务） */
    sendFallbackWithFilesOnly?: string
    /** 是否显示运行模式选择（平台智能体）；外部接入可关闭 */
    showPipelineModeSwitch?: boolean
  }>(),
  {
    disabled: false,
    placeholder: '',
    exampleQuestions: () => [],
    uploadedFiles: () => [],
    uploadAccept: TASK_DATA_FILE_ACCEPT,
    uploadButtonLabel: '',
    sendFallbackWithFilesOnly: '',
    showPipelineModeSwitch: true,
  }
)

const emit = defineEmits<{
  send: [text: string, pipelineMode: PipelineMode | undefined]
  uploadCsv: []
  /** 用户选择了文件，由父组件调用上传接口并加入 uploadedFiles */
  uploadFile: [file: File]
  removeFile: [index: number]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const { t } = useI18n()

const inputText = ref('')
/** false：普通模式（对话 qa_dialog）；true：专业模式（代码生成 codegen_pipeline） */
const professionalMode = ref(false)

const toggleProfessionalMode = () => {
  if (props.disabled) return
  professionalMode.value = !professionalMode.value
}

const handleSend = () => {
  const text = inputText.value.trim()
  if (!text && !props.uploadedFiles?.length) return
  const mode: PipelineMode | undefined = props.showPipelineModeSwitch
    ? professionalMode.value
      ? 'codegen_pipeline'
      : 'qa_dialog'
    : undefined
  emit('send', text || resolvedFileOnlyFallback.value, mode)
  // 不在此处清空，由父组件在确认发送成功后再调用 clearInput()，避免校验失败时误清输入
}

const resolvedPlaceholder = computed(() => props.placeholder || t('workbench.input.placeholder'))
const resolvedUploadButtonLabel = computed(() => props.uploadButtonLabel || t('workbench.input.uploadFile'))
const resolvedFileOnlyFallback = computed(() => props.sendFallbackWithFilesOnly || t('workbench.input.fileOnlyFallback'))

/** 由父组件在发送已提交后调用，用于清空输入框 */
function clearInput() {
  inputText.value = ''
}

defineExpose({ clearInput })

/** Enter 发送；Alt+Enter 换行（Shift+Enter 亦换行，避免误触发送） */
const insertNewlineAtCursor = (ta: HTMLTextAreaElement) => {
  const start = ta.selectionStart
  const end = ta.selectionEnd
  const v = inputText.value
  inputText.value = `${v.slice(0, start)}\n${v.slice(end)}`
  nextTick(() => {
    ta.selectionStart = ta.selectionEnd = start + 1
  })
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Enter') return
  if (e.altKey || e.shiftKey) {
    e.preventDefault()
    insertNewlineAtCursor(e.target as HTMLTextAreaElement)
    return
  }
  e.preventDefault()
  handleSend()
}

const handleExample = (q: string) => {
  inputText.value = q
}

const triggerUpload = () => {
  if (props.disabled) return
  fileInputRef.value?.click()
}

const onFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    emit('uploadFile', file)
    input.value = ''
  }
}
</script>

<template>
  <div class="input-bar">
    <input
      ref="fileInputRef"
      type="file"
      :accept="uploadAccept"
      class="hidden-file-input"
      @change="onFileChange"
    />
    <div v-if="uploadedFiles?.length" class="uploaded-files">
      <div
        v-for="(f, i) in uploadedFiles"
        :key="i"
        class="file-item"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <rect
            x="2"
            y="1"
            width="9"
            height="11"
            rx="2"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <path
            d="M4 4.5H9M4 6.5H9M4 8.5H7"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
          />
        </svg>
        <span class="file-item-name">{{ f.name }}</span>
        <span class="file-item-size">{{ f.size }}</span>
        <button
          type="button"
          class="file-item-remove"
          :disabled="disabled"
          :aria-label="t('workbench.input.remove')"
          @click="emit('removeFile', i)"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <textarea
      v-model="inputText"
      class="input-textarea"
      :placeholder="resolvedPlaceholder"
      :disabled="disabled"
      rows="3"
      @keydown="handleKeydown"
    />

    <div class="action-row">
      <div class="action-left">
        <button
          type="button"
          class="btn-tool"
          :disabled="disabled"
          :title="resolvedUploadButtonLabel"
          @click="triggerUpload"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5V9M4.5 4L7 1.5L9.5 4"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M2 10.5V12H12V10.5"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ resolvedUploadButtonLabel }}
        </button>
        <div
          v-if="showPipelineModeSwitch"
          class="mode-toggle-wrap"
          :title="t('workbench.input.modeTitle')"
        >
          <button
            type="button"
            class="mode-toggle"
            role="switch"
            :aria-checked="professionalMode"
            aria-labelledby="mode-toggle-visible-label"
            :disabled="disabled"
            @click="toggleProfessionalMode"
          >
            <span class="mode-toggle-track" :class="{ 'is-on': professionalMode }">
              <span class="mode-toggle-thumb" />
            </span>
          </button>
          <span id="mode-toggle-visible-label" class="mode-toggle-label">{{ professionalMode ? t('workbench.input.professionalMode') : t('workbench.input.normalMode') }}</span>
        </div>
      </div>
      <div class="action-right">
        <slot name="before-send" />
        <button
        type="button"
        class="btn-send"
        :disabled="disabled"
        @click="handleSend"
      >
        <template v-if="disabled">
          <span class="thinking-dots">
            <span class="dot" />
            <span class="dot" />
            <span class="dot" />
          </span>
          {{ t('workbench.input.processing') }}
        </template>
        <template v-else>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1.5 1.5L12.5 7L1.5 12.5V8L8 7L1.5 6V1.5Z"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
          </svg>
          {{ t('workbench.input.send') }}
        </template>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-bar {
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding: 12px 16px;
  background: #fafafa;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
}

.uploaded-files {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f3f4f6;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  font-size: 13px;
  color: #374151;
}

.file-item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.file-item-size {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
}

.file-item-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  background: none;
  border-radius: 4px;
  color: #9ca3af;
  cursor: pointer;
  transition: color 0.15s;
  flex-shrink: 0;
}

.file-item-remove:hover:not(:disabled) {
  color: #dc2626;
}

.file-item-remove:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.input-textarea {
  width: 100%;
  padding: 10px 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.11);
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  font-family: inherit;
  resize: none;
  line-height: 1.6;
  transition: border-color 0.18s;
  box-sizing: border-box;
}

.input-textarea:focus {
  outline: none;
  border-color: #374151;
  box-shadow: 0 0 0 3px rgba(55, 65, 81, 0.06);
}

.input-textarea::placeholder {
  color: #9ca3af;
}

.input-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.action-left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.action-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.hidden-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.btn-tool {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-tool:hover:not(:disabled) {
  border-color: #374151;
  color: #111827;
}

.btn-tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mode-toggle-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  padding: 0 2px;
  box-sizing: border-box;
}

.mode-toggle-label {
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  line-height: 20px;
  height: 20px;
  font-weight: 500;
  color: #374151;
  white-space: nowrap;
}

.mode-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 20px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.mode-toggle:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.mode-toggle:focus-visible .mode-toggle-track {
  outline: 2px solid #111827;
  outline-offset: 2px;
}

.mode-toggle-track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #d1d5db;
  transition: background 0.18s ease;
}

.mode-toggle-track.is-on {
  background: #111827;
}

.mode-toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: transform 0.18s ease;
}

.mode-toggle-track.is-on .mode-toggle-thumb {
  transform: translateX(16px);
}

.btn-send {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 18px;
  background: #111827;
  border: 1px solid #111827;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
}

.btn-send:hover:not(:disabled) {
  background: #020617;
  border-color: #020617;
}

.btn-send:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.thinking-dots {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  animation: dot-pulse 1s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.15s;
}

.dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes dot-pulse {
  0%,
  80%,
  100% {
    transform: scale(0.7);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
