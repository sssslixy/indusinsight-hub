<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  visible: boolean
  knowledgeBaseName: string
  uploading?: boolean
}>()

const emit = defineEmits<{
  cancel: []
  upload: [files: File[]]
}>()

const { t } = useI18n()

type FileCheckStatus = 'valid' | 'invalid_type' | 'invalid_size' | 'empty'

type UploadItem = {
  id: string
  file: File
  status: FileCheckStatus
  error?: string
}

const ACCEPT_EXTS = ['pdf', 'doc', 'docx', 'txt', 'md', 'csv', 'xls', 'xlsx', 'json'] as const
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024 // 20MB：前端兜底校验，尽量避免明显冲突

const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedFiles = ref<UploadItem[]>([])

const formatBytes = (value: number) => {
  const num = Number(value)
  if (!Number.isFinite(num) || num < 0) return '--'
  const units = ['B', 'KB', 'MB', 'GB']
  let idx = 0
  let v = num
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024
    idx += 1
  }
  const fixed = idx === 0 ? 0 : 1
  return `${v.toFixed(fixed)} ${units[idx]}`
}

const getExt = (fileName: string) => {
  const parts = fileName.split('.')
  if (parts.length < 2) return ''
  const last = parts[parts.length - 1]
  return String(last || '').toLowerCase()
}

const checkFile = (file: File): UploadItem => {
  const id = `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`

  if (!file || file.size <= 0) {
    return { id, file, status: 'empty', error: t('knowledgeBase.documents.upload.emptyFile') }
  }

  const ext = getExt(file.name)
  if (!ext || !ACCEPT_EXTS.includes(ext as (typeof ACCEPT_EXTS)[number])) {
    return { id, file, status: 'invalid_type', error: t('knowledgeBase.documents.upload.unsupportedType', { type: ext || 'unknown' }) }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { id, file, status: 'invalid_size', error: t('knowledgeBase.documents.upload.sizeExceeded', { size: formatBytes(MAX_FILE_SIZE_BYTES) }) }
  }

  return { id, file, status: 'valid' }
}

const validFiles = computed(() => selectedFiles.value.filter((i) => i.status === 'valid').map((i) => i.file))
const hasInvalid = computed(() => selectedFiles.value.some((i) => i.status !== 'valid'))
const canStartUpload = computed(() => !props.uploading && validFiles.value.length > 0 && !hasInvalid.value)
const totalCount = computed(() => selectedFiles.value.length)
const validCount = computed(() => validFiles.value.length)

watch(
  () => props.visible,
  (v) => {
    if (!v) {
      selectedFiles.value = []
      if (fileInputRef.value) fileInputRef.value.value = ''
    }
  },
)

const addFiles = (files: File[]) => {
  const next = [...selectedFiles.value]
  for (const f of files) {
    const exists = next.some((it) => it.file.name === f.name && it.file.size === f.size && it.file.lastModified === f.lastModified)
    if (exists) continue
    next.push(checkFile(f))
  }
  selectedFiles.value = next
}

const handlePick = (e: Event) => {
  const el = e.target as HTMLInputElement
  const list = Array.from(el.files || [])
  if (!list.length) return
  addFiles(list)
  // 清空 input：同名文件重复选择也能触发 change
  if (fileInputRef.value) fileInputRef.value.value = ''
}

const removeFile = (idx: number) => {
  selectedFiles.value.splice(idx, 1)
}

const submit = () => {
  if (!canStartUpload.value) return
  emit('upload', validFiles.value)
}
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog">
      <div
        v-if="visible"
        class="dialog-overlay"
        role="dialog"
        aria-modal="true"
        @click.self="emit('cancel')"
      >
        <div class="dialog-box">
          <div class="dialog-body">
            <h3 class="dialog-title">{{ t('knowledgeBase.documents.upload.title') }}</h3>
            <p class="dialog-desc">
              {{ t('knowledgeBase.documents.upload.description', { name: knowledgeBaseName }) }}
            </p>

            <div class="upload-card">
              <input
                ref="fileInputRef"
                class="file-input"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx,.json"
                @change="handlePick"
              />
              <div class="upload-placeholder">
                <div class="upload-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 16V4"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                    <path
                      d="M7 9L12 4L17 9"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M20 16.5C20 18.9853 17.7614 21 15.25 21H8.75C6.23858 21 4 18.9853 4 16.5V15"
                      stroke="currentColor"
                      stroke-width="1.8"
                      stroke-linecap="round"
                    />
                  </svg>
                </div>

                <div class="upload-text">
                  <div class="upload-title">{{ totalCount ? t('knowledgeBase.documents.upload.selectedFilesTitle') : t('knowledgeBase.documents.upload.chooseFilesTitle') }}</div>
                  <div class="upload-sub">
                    {{
                      totalCount
                        ? t('knowledgeBase.documents.upload.selectedSummary', { total: totalCount, valid: validCount })
                        : t('knowledgeBase.documents.upload.supportedTypes')
                    }}
                  </div>
                </div>

                <button class="pick-btn" type="button" @click="fileInputRef?.click()">
                  {{ t('knowledgeBase.documents.upload.chooseFiles') }}
                </button>
              </div>

              <div v-if="selectedFiles.length" class="selected-list" :aria-label="t('knowledgeBase.documents.upload.selectedListAria')">
                <div
                  v-for="(it, idx) in selectedFiles"
                  :key="it.id"
                  class="selected-row"
                  :class="{ 'selected-row--invalid': it.status !== 'valid' }"
                >
                  <div class="row-main">
                    <div class="row-name" :title="it.file.name">{{ it.file.name }}</div>
                    <div class="row-sub">
                      {{ formatBytes(it.file.size) }}
                      <span v-if="it.status === 'valid'" class="row-badge row-badge--ok">{{ t('knowledgeBase.documents.upload.uploadable') }}</span>
                      <span v-else class="row-badge row-badge--error">{{ it.error || t('knowledgeBase.documents.upload.notUploadable') }}</span>
                    </div>
                  </div>

                  <button
                    class="remove-btn"
                    type="button"
                    :disabled="props.uploading"
                    :title="t('knowledgeBase.documents.upload.removeTitle')"
                    @click="removeFile(idx)"
                  >
                    {{ t('knowledgeBase.documents.upload.remove') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="dialog-actions">
            <button class="btn-cancel" :disabled="props.uploading" @click="emit('cancel')">{{ t('common.cancel') }}</button>
            <button class="btn-confirm" :disabled="!canStartUpload" @click="submit">
              {{ props.uploading ? t('knowledgeBase.documents.upload.uploading') : t('knowledgeBase.documents.upload.startUpload') }}
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
  z-index: 1000;
  padding: 24px;
}

.dialog-box {
  background: #ffffff;
  border-radius: 14px;
  padding: 28px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 20px;
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
  margin: 10px 0 0;
  line-height: 1.6;
}

.dialog-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.btn-confirm {
  padding: 8px 18px;
  background: #2d2d2d;
  border: 1px solid #2d2d2d;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm:hover {
  background: #1a1a1a;
  border-color: #1a1a1a;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 上传卡片 */
.upload-card {
  border-radius: 12px;
  border: 1px dashed rgba(0, 0, 0, 0.18);
  background: rgba(250, 250, 250, 0.7);
  padding: 16px;
}

.file-input {
  display: none;
}

.upload-placeholder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.upload-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #525252;
}

.upload-text {
  flex: 1;
  min-width: 0;
}

.upload-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a1a;
}

.upload-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pick-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #ffffff;
  color: #525252;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pick-btn:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.selected-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selected-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #ffffff;
}

.selected-row--invalid {
  background: rgba(239, 68, 68, 0.06);
  border-color: rgba(239, 68, 68, 0.22);
}

.row-main {
  min-width: 0;
  flex: 1;
}

.row-name {
  font-weight: 900;
  color: #1a1a1a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 320px;
}

.row-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #737373;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.row-badge {
  font-size: 12px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 999px;
}

.row-badge--ok {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  border: 1px solid rgba(34, 197, 94, 0.18);
}

.row-badge--error {
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.22);
}

.remove-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: transparent;
  color: #525252;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  border-color: #2d2d2d;
  color: #1a1a1a;
}

.remove-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-box,
.dialog-leave-active .dialog-box {
  transition: transform 0.2s ease, opacity 0.2s ease;
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

@media (max-width: 520px) {
  .dialog-box {
    padding: 18px;
    max-width: 100%;
  }
  .upload-placeholder {
    flex-direction: column;
    align-items: flex-start;
  }
  .pick-btn {
    width: 100%;
  }
}
</style>

