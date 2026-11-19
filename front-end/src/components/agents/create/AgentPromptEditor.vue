<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  modelValue: string
  defaultPrompt: string
  agentName: string
}>()

const emit = defineEmits<{ 'update:modelValue': [val: string] }>()
const { t } = useI18n()

const handleReset = () => emit('update:modelValue', props.defaultPrompt)
const handleClear = () => emit('update:modelValue', '')
</script>

<template>
  <div class="prompt-editor">
    <div class="editor-card">
      <div class="editor-toolbar">
        <div class="toolbar-left">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1.5" y="1.5" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.2" />
            <path d="M4 5H9M4 7.5H7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
          <span class="toolbar-title">{{ t('agentCreate.page.systemPrompt') }}</span>
          <span class="toolbar-required">*</span>
        </div>
        <div class="toolbar-actions">
          <button class="action-btn" type="button" @click="handleReset">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M10 6C10 8.21 8.21 10 6 10C3.79 10 2 8.21 2 6C2 3.79 3.79 2 6 2C7.3 2 8.46 2.6 9.24 3.52" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
              <path d="M9 1V4H6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            {{ t('agentCreate.config.restoreDefault') }}
          </button>
          <span class="sep" />
          <button class="action-btn action-btn--danger" type="button" @click="handleClear">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            </svg>
            {{ t('agentCreate.config.clear') }}
          </button>
        </div>
      </div>

      <textarea
        class="prompt-textarea"
        :placeholder="t('agentCreate.config.promptPlaceholder', { agentName })"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
      />

      <div class="editor-footer">
        <span class="char-count">{{ t('agentCreate.config.charCount', { count: modelValue.length }) }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prompt-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-card {
  border: 1px solid rgba(0, 0, 0, 0.11);
  border-radius: 10px;
  overflow: hidden;
  background: #ffffff;
  transition: border-color 0.2s ease;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 260px;
}
.editor-card:focus-within { border-color: #374151; box-shadow: 0 0 0 3px rgba(55,65,81,0.06); }

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 13px;
  background: #f9fafb;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6b7280;
}
.toolbar-title { font-size: 15px; font-weight: 500; color: #111827; }
.toolbar-required { font-size: 15px; color: #dc2626; line-height: 1; }

.toolbar-actions { display: flex; align-items: center; gap: 3px; }

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #6b7280;
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 7px;
  border-radius: 5px;
  transition: all 0.15s ease;
  font-family: inherit;
}
.action-btn:hover { color: #111827; background: rgba(0,0,0,0.06); }
.action-btn--danger:hover { color: #dc2626; background: rgba(239,68,68,0.07); }

.sep {
  display: inline-block;
  width: 1px;
  height: 12px;
  background: rgba(0,0,0,0.1);
  margin: 0 2px;
}

.prompt-textarea {
  width: 100%;
  min-height: 220px;
  padding: 14px 16px;
  background: #ffffff;
  border: none;
  outline: none;
  font-size: 15px;
  color: #111827;
  font-family: inherit;
  resize: none;
  line-height: 1.8;
  letter-spacing: 0.01em;
  box-sizing: border-box;
  display: block;
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.prompt-textarea::placeholder { color: #c3c3c3; font-family: inherit; }
.prompt-textarea::-webkit-scrollbar { width: 4px; }
.prompt-textarea::-webkit-scrollbar-track { background: transparent; }
.prompt-textarea::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 5px 13px;
  background: #f9fafb;
  border-top: 1px solid rgba(0,0,0,0.06);
}
.char-count { font-size: 13px; color: #c3c3c3; }
</style>
