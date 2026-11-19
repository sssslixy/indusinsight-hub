<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import icon1 from '@/assets/icon/插件图标1.png'
import icon2 from '@/assets/icon/插件图标2.png'
import icon3 from '@/assets/icon/插件图标3.png'
import icon4 from '@/assets/icon/插件图标4.png'

const ACCEPT_IMAGE = '.png,.jpg,.jpeg,.webp'
const ACCEPT_MIME = ['image/png', 'image/jpeg', 'image/webp']

const DEFAULT_SYSTEM_ICONS = [
  { id: 'system-1', src: icon1 },
  { id: 'system-2', src: icon2 },
  { id: 'system-3', src: icon3 },
  { id: 'system-4', src: icon4 },
] as const

const props = withDefaults(
  defineProps<{
    modelValue: string
    readonly?: boolean
    label?: string
    systemIcons?: string[]
    uploadingIcon?: boolean
  }>(),
  { readonly: false, label: '', systemIcons: () => [], uploadingIcon: false },
)

const emit = defineEmits<{
  'update:modelValue': [val: string]
  'upload-icon': [file: File]
}>()

const { t } = useI18n()
const fileInputRef = ref<HTMLInputElement | null>(null)
const cropDialogVisible = ref(false)
const selectedImageUrl = ref('')
const selectedImageFile = ref<File | null>(null)
const cropZoom = ref(1)
const cropOffsetX = ref(0)
const cropOffsetY = ref(0)
const cropImageRef = ref<HTMLImageElement | null>(null)
const dragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragOriginOffsetX = ref(0)
const dragOriginOffsetY = ref(0)
const cropBoxSize = 240
const cropExportSize = 512
const minZoom = 1
const maxZoom = 3

const systemIcons = computed(() => {
  if (props.systemIcons.length > 0) {
    return props.systemIcons.map((src, index) => ({ id: `system-${index + 1}`, src }))
  }
  return DEFAULT_SYSTEM_ICONS
})

const isSystemIcon = (id: string) => id.startsWith('system-')
const isCustomIcon = (icon: string) => icon.startsWith('http://') || icon.startsWith('https://')

const displayIconUrl = computed(() => {
  const icon = props.modelValue
  if (isCustomIcon(icon)) return icon
  if (isSystemIcon(icon)) {
    const n = parseInt(icon.replace('system-', ''), 10)
    if (n >= 1 && n <= systemIcons.value.length) return systemIcons.value[n - 1]!.src
  }
  return systemIcons.value[0]?.src || DEFAULT_SYSTEM_ICONS[0].src
})

const previewTransform = computed(() => {
  return `translate(calc(-50% + ${cropOffsetX.value}px), calc(-50% + ${cropOffsetY.value}px)) scale(${cropZoom.value})`
})

const isSelected = (id: string) => props.modelValue === id

const handleIconUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!ACCEPT_MIME.includes(file.type)) {
    ElMessage({ message: t('create.icon.invalidImage'), type: 'warning' })
    return
  }
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
  }
  selectedImageFile.value = file
  selectedImageUrl.value = URL.createObjectURL(file)
  cropZoom.value = 1
  cropOffsetX.value = 0
  cropOffsetY.value = 0
  cropDialogVisible.value = true
  ;(e.target as HTMLInputElement).value = ''
}

const triggerUpload = () => {
  if (props.readonly) return
  if (props.uploadingIcon) return
  fileInputRef.value?.click()
}

const selectSystemIcon = (id: string) => {
  if (props.readonly) return
  emit('update:modelValue', id)
}

const closeCropDialog = () => {
  cropDialogVisible.value = false
  selectedImageFile.value = null
  cropZoom.value = 1
  cropOffsetX.value = 0
  cropOffsetY.value = 0
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
    selectedImageUrl.value = ''
  }
}

const uploadCroppedIcon = async () => {
  if (!selectedImageFile.value || !cropImageRef.value) return
  const canvas = document.createElement('canvas')
  canvas.width = cropExportSize
  canvas.height = cropExportSize
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    ElMessage.error(t('create.icon.processFailed'))
    return
  }
  const img = cropImageRef.value
  const baseScale = Math.max(cropBoxSize / img.naturalWidth, cropBoxSize / img.naturalHeight)
  const finalScale = baseScale * cropZoom.value
  const drawWidth = img.naturalWidth * finalScale * (cropExportSize / cropBoxSize)
  const drawHeight = img.naturalHeight * finalScale * (cropExportSize / cropBoxSize)
  const drawX = cropExportSize / 2 - drawWidth / 2 + cropOffsetX.value * (cropExportSize / cropBoxSize)
  const drawY = cropExportSize / 2 - drawHeight / 2 + cropOffsetY.value * (cropExportSize / cropBoxSize)
  ctx.clearRect(0, 0, cropExportSize, cropExportSize)
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  })
  if (!blob) {
    ElMessage.error(t('create.icon.processFailed'))
    return
  }
  const croppedFile = new File([blob], `skill-icon-${Date.now()}.jpg`, { type: 'image/jpeg' })
  emit('upload-icon', croppedFile)
  closeCropDialog()
}

const startDrag = (clientX: number, clientY: number) => {
  dragging.value = true
  dragStartX.value = clientX
  dragStartY.value = clientY
  dragOriginOffsetX.value = cropOffsetX.value
  dragOriginOffsetY.value = cropOffsetY.value
}

const moveDrag = (clientX: number, clientY: number) => {
  if (!dragging.value) return
  cropOffsetX.value = dragOriginOffsetX.value + (clientX - dragStartX.value)
  cropOffsetY.value = dragOriginOffsetY.value + (clientY - dragStartY.value)
}

const endDrag = () => {
  dragging.value = false
}

const handleMouseDown = (event: MouseEvent) => startDrag(event.clientX, event.clientY)
const handleMouseMove = (event: MouseEvent) => moveDrag(event.clientX, event.clientY)
const handleTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  startDrag(touch.clientX, touch.clientY)
}
const handleTouchMove = (event: TouchEvent) => {
  const touch = event.touches[0]
  if (!touch) return
  moveDrag(touch.clientX, touch.clientY)
}
const handleCropWheel = (event: WheelEvent) => {
  event.preventDefault()
  const delta = event.deltaY > 0 ? -0.05 : 0.05
  const next = Math.max(minZoom, Math.min(maxZoom, cropZoom.value + delta))
  cropZoom.value = Number(next.toFixed(2))
}

onBeforeUnmount(() => {
  endDrag()
  if (selectedImageUrl.value) {
    URL.revokeObjectURL(selectedImageUrl.value)
  }
})
</script>

<template>
  <div class="icon-section">
    <label class="field-label">{{ props.label || t('create.icon.label') }}</label>
    <div class="icon-row">
      <div class="icon-preview-wrap">
        <div class="icon-preview">
          <img :src="displayIconUrl" :alt="t('create.icon.iconAlt')" class="icon-img" />
        </div>
      </div>
      <div v-if="!readonly" class="icon-right">
        <div class="system-icons-row">
          <span class="system-icons-label">{{ t('create.icon.systemIcons') }}</span>
          <div class="system-icons-grid">
            <button
              v-for="item in systemIcons"
              :key="item.id"
              type="button"
              class="system-icon-btn"
              :class="{ 'system-icon-btn--active': isSelected(item.id) }"
              @click="selectSystemIcon(item.id)"
            >
              <img :src="item.src" :alt="item.id" class="system-icon-img" />
            </button>
          </div>
        </div>
        <div class="upload-row">
          <input
            ref="fileInputRef"
            type="file"
            :accept="ACCEPT_IMAGE"
            class="upload-input"
            @change="handleIconUpload"
          />
          <button type="button" class="upload-btn" :disabled="props.uploadingIcon" @click="triggerUpload">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5V12.5M1.5 7H12.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
            </svg>
            {{ props.uploadingIcon ? t('create.common.uploading') : t('create.icon.uploadIcon') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="cropDialogVisible" class="icon-crop-modal-mask" @click.self="closeCropDialog">
      <div class="icon-crop-modal">
        <div class="icon-crop-modal-header">
          <h3>{{ t('create.icon.adjustIcon') }}</h3>
          <button class="crop-close-btn" @click="closeCropDialog">x</button>
        </div>
        <div class="icon-crop-container">
          <div class="icon-crop-box" @wheel.prevent="handleCropWheel">
            <img
              v-if="selectedImageUrl"
              ref="cropImageRef"
              :src="selectedImageUrl"
              :alt="t('create.icon.iconPreview')"
              class="icon-crop-image"
              :class="{ dragging }"
              :style="{ transform: previewTransform }"
              @mousedown.prevent="handleMouseDown"
              @mousemove.prevent="handleMouseMove"
              @mouseup="endDrag"
              @mouseleave="endDrag"
              @touchstart.prevent="handleTouchStart"
              @touchmove.prevent="handleTouchMove"
              @touchend="endDrag"
              @touchcancel="endDrag"
            />
          </div>
          <div class="icon-crop-tips">{{ t('create.icon.cropTips') }}</div>
        </div>
        <div class="crop-dialog-footer">
          <button class="crop-btn plain" @click="closeCropDialog">{{ t('common.cancel') }}</button>
          <button class="crop-btn primary" :disabled="props.uploadingIcon" @click="uploadCroppedIcon">
            {{ props.uploadingIcon ? t('create.common.uploading') : t('create.common.saveAndUpload') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-row {
  display: flex;
  flex-direction: row;
  align-items: flex-end;
  gap: 14px;
}

.icon-preview-wrap {
  flex-shrink: 0;
}

.icon-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.icon-preview {
  width: 76px;
  height: 76px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 10px;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  line-height: 1;
}

.system-icons-row {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.system-icons-label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}
.system-icons-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.system-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fafafa;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.18s ease;
  overflow: hidden;
  font-family: inherit;
}
.system-icon-btn:hover {
  background: #f3f4f6;
  border-color: rgba(0, 0, 0, 0.14);
}
.system-icon-btn--active {
  border-color: #374151;
  background: #f3f4f6;
  box-shadow: 0 0 0 1.5px rgba(55, 65, 81, 0.15);
}
.system-icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-row {
  display: flex;
  align-items: center;
}
.upload-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 10px;
  font-size: 12px;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.18s ease;
  font-family: inherit;
}
.upload-btn:hover {
  background: #f3f4f6;
  border-color: rgba(0, 0, 0, 0.14);
  color: #374151;
}
.upload-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.icon-crop-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.icon-crop-box {
  width: 240px;
  height: 240px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #f5f5f5;
  position: relative;
}
.icon-crop-image {
  position: absolute;
  left: 50%;
  top: 50%;
  transform-origin: center center;
  user-select: none;
  -webkit-user-drag: none;
  cursor: grab;
}
.icon-crop-image.dragging {
  cursor: grabbing;
}
.icon-crop-tips {
  text-align: center;
  color: #737373;
  font-size: 12px;
}
.crop-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 16px 16px;
}
.icon-crop-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.icon-crop-modal {
  width: 420px;
  max-width: 100%;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
}
.icon-crop-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}
.icon-crop-modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
}
.crop-close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: #737373;
  cursor: pointer;
}
.crop-close-btn:hover {
  background: #f5f5f5;
}
.crop-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  color: #404040;
  cursor: pointer;
}
.crop-btn.primary {
  background: #2d2d2d;
  border-color: #2d2d2d;
  color: #fff;
}
.crop-btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
