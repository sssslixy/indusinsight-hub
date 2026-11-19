<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ToolArtifactFormState } from '@/types/tools/toolCreate'

const props = withDefaults(
  defineProps<{
    modelValue: ToolArtifactFormState
    readonly?: boolean
    serverFileName?: string
    downloadEnabled?: boolean
    downloading?: boolean
  }>(),
  {
    readonly: false,
    serverFileName: '',
    downloadEnabled: false,
    downloading: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [val: ToolArtifactFormState]
  download: []
}>()

const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

function patch(p: Partial<ToolArtifactFormState>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}

function onPyChange(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  patch({ pyFile: f })
}

function clearPy() {
  patch({ pyFile: null })
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function onDragOver() {
  if (!props.readonly) isDragging.value = true
}

function onDragLeave() {
  isDragging.value = false
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  if (props.readonly) return
  const f = e.dataTransfer?.files?.[0]
  if (!f) return
  if (!f.name.toLowerCase().endsWith('.py')) return
  patch({ pyFile: f })
}

const canDownloadServerFile = computed(() => {
  return props.readonly && props.downloadEnabled && !!props.serverFileName && !props.modelValue.pyFile
})

function handleToolFileAreaDownload() {
  if (!canDownloadServerFile.value || props.downloading) return
  emit('download')
}
</script>

<template>
  <div class="card">
    <header class="hd">
      <h2 class="hd__title">{{ t('create.artifact.uploadTool') }}</h2>
    </header>

    <div class="field">
      <label class="label label--req">{{ t('create.artifact.entryFunction') }}</label>
      <input
        class="input"
        type="text"
        :placeholder="t('create.artifact.entryFunctionPlaceholder')"
        :value="modelValue.entryFunction"
        :readonly="readonly"
        :disabled="readonly"
        @input="patch({ entryFunction: ($event.target as HTMLInputElement).value })"
      />
    </div>

    <div class="zip-wrap">
      <label class="label">{{ t('create.artifact.pythonFile') }}</label>
      <div
        class="drop"
        :class="{
          'drop--drag': isDragging,
          'drop--readonly': readonly && !canDownloadServerFile,
          'drop--downloadable': canDownloadServerFile,
        }"
        :role="canDownloadServerFile ? 'button' : undefined"
        :tabindex="canDownloadServerFile ? 0 : undefined"
        :aria-label="canDownloadServerFile ? t('create.artifact.downloadToolFile') : undefined"
        :title="canDownloadServerFile ? t('create.artifact.clickToDownloadToolFile') : undefined"
        @click="handleToolFileAreaDownload"
        @keydown.enter.prevent="handleToolFileAreaDownload"
        @keydown.space.prevent="handleToolFileAreaDownload"
        @dragover.prevent="onDragOver"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input
          ref="fileInputRef"
          type="file"
          class="file-input-hidden"
          accept=".py"
          :disabled="readonly"
          @change="onPyChange"
        />
        <div v-if="modelValue.pyFile" class="file-picked">
          <span class="file-name">{{ modelValue.pyFile.name }}</span>
          <span class="file-size">{{ formatSize(modelValue.pyFile.size) }}</span>
          <button v-if="!readonly" type="button" class="link-btn" @click="clearPy">{{ t('create.common.remove') }}</button>
        </div>
        <div v-else class="file-hint">
          <template v-if="serverFileName">
            <span class="muted">{{ t('create.common.uploaded') }}</span>
            <span class="file-name">{{ serverFileName }}</span>
            <span v-if="!readonly" class="muted">{{ t('create.common.replaceWithNewFile') }}</span>
          </template>
          <template v-else>{{ t('create.artifact.dragPyHereOrChoose') }}</template>
        </div>
        <button v-if="!readonly" type="button" class="browse-btn" @click="fileInputRef?.click()">{{ t('create.common.chooseFile') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 18px 20px 20px;
}
.hd {
  margin: 0 0 14px;
}
.hd__title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  color: #111827;
}
.hd__sub {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}
.field {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}
.label--req::after {
  content: ' *';
  color: #ef4444;
}
.input {
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
}
.zip-wrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.drop {
  position: relative;
  border: 1px dashed #cbd5e1;
  border-radius: 10px;
  padding: 16px;
  min-height: 96px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #fafafa;
}
.drop--drag {
  border-color: #3b82f6;
  background: #eff6ff;
}
.drop--readonly {
  opacity: 0.85;
}
.drop--downloadable {
  cursor: pointer;
}
.drop--downloadable:hover {
  border-color: #94a3b8;
  background: #f1f5f9;
}
.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.file-picked {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}
.file-name {
  font-weight: 600;
  color: #111827;
}
.file-size {
  color: #6b7280;
  font-size: 13px;
}
.file-hint {
  font-size: 14px;
  color: #6b7280;
  text-align: center;
  gap: 6px;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}
.muted {
  color: #9ca3af;
  font-size: 13px;
}
.link-btn {
  border: none;
  background: none;
  color: #2563eb;
  cursor: pointer;
  font-size: 13px;
}
.browse-btn {
  position: relative;
  z-index: 1;
  margin-top: 4px;
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
</style>
