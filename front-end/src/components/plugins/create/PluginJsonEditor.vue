<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const DEFAULT_JSON = '{\n  "params": []\n}'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    readonly?: boolean
    fileName?: string
    placeholder?: string
    defaultJson?: string
    minHeight?: number
    autoResize?: boolean
  }>(),
  {
    modelValue: () => DEFAULT_JSON,
    readonly: false,
    fileName: 'data.json',
    placeholder: '{"params": []}',
    defaultJson: DEFAULT_JSON,
    minHeight: 140,
    autoResize: true,
  }
)
const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const { t } = useI18n()
const jsonError = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const dynamicHeight = ref(0)

function syncTextareaHeight() {
  if (!props.autoResize) return
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  const min = Number(props.minHeight) || 0
  const next = Math.max(min, el.scrollHeight)
  dynamicHeight.value = next
  el.style.height = `${next}px`
}

function validateJson(str: string): boolean {
  if (!str || !str.trim()) {
    jsonError.value = ''
    return true
  }
  try {
    JSON.parse(str)
    jsonError.value = ''
    return true
  } catch (e: any) {
    jsonError.value = e?.message || t('create.editor.jsonFormatError')
    return false
  }
}

const onInput = (e: Event) => {
  const val = (e.target as HTMLTextAreaElement).value
  emit('update:modelValue', val)
  validateJson(val)
  syncTextareaHeight()
}

const onBlur = () => {
  validateJson(props.modelValue || '')
}

function formatJson() {
  const raw = props.modelValue || ''
  if (!raw.trim()) {
    emit('update:modelValue', props.defaultJson || DEFAULT_JSON)
    jsonError.value = ''
    return
  }
  try {
    const parsed = JSON.parse(raw)
    const formatted = JSON.stringify(parsed, null, 2)
    emit('update:modelValue', formatted)
    jsonError.value = ''
  } catch {
    jsonError.value = t('create.editor.jsonFormatCannotFormat')
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val != null) validateJson(val)
    nextTick(syncTextareaHeight)
  },
  { immediate: true }
)

watch(
  () => props.minHeight,
  () => nextTick(syncTextareaHeight)
)

onMounted(() => {
  nextTick(syncTextareaHeight)
})
</script>

<template>
  <div class="json-editor-wrap">
    <header class="editor-header">
      <span class="editor-label">{{ fileName }}</span>
      <button v-if="!readonly" type="button" class="format-btn" @click="formatJson">{{ t('create.editor.format') }}</button>
    </header>
    <div class="editor-body">
      <textarea
        ref="textareaRef"
        class="json-textarea"
        :class="{ 'json-textarea--error': jsonError }"
        :value="modelValue"
        spellcheck="false"
        :placeholder="placeholder"
        :readonly="readonly"
        :style="{
          minHeight: `${minHeight}px`,
          height: autoResize ? `${Math.max(minHeight, dynamicHeight || 0)}px` : undefined,
        }"
        @input="onInput"
        @blur="onBlur"
      />
      <p v-if="jsonError" class="json-error">{{ jsonError }}</p>
    </div>
  </div>
</template>

<style scoped>
.json-editor-wrap {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  background: #f9fafb;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 13px;
}

.format-btn {
  padding: 4px 10px;
  font-size: 12px;
  color: #374151;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
}
.format-btn:hover {
  background: #f3f4f6;
}

.editor-label {
  font-weight: 500;
  color: #374151;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
}

.editor-body {
  flex: 1;
  min-height: 0;
}

.json-textarea {
  width: 100%;
  min-height: 0;
  padding: 14px 16px;
  margin: 0;
  border: none;
  resize: vertical;
  font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, monospace;
  font-size: 14px;
  line-height: 1.55;
  color: #111827;
  background: #fafafa;
  outline: none;
  box-sizing: border-box;
}

.json-textarea::placeholder {
  color: #9ca3af;
}

.json-textarea--error {
  border: 1px solid #dc2626;
  background: #fef2f2;
}

.json-error {
  margin: 0;
  padding: 6px 16px 10px;
  font-size: 12px;
  color: #dc2626;
  background: #fef2f2;
}
</style>
