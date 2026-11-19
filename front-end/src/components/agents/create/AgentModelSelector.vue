<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ModelOption } from '@/types/modules/agentCreate'
const props = withDefaults(defineProps<{
  modelValue: string
  options: ModelOption[]
  loading?: boolean
  error?: string
  previousModel?: string
  unavailableHint?: string
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  clearable?: boolean
}>(), { required: true, disabled: false, clearable: false })
const emit = defineEmits<{ 'update:modelValue': [val: string]; refresh: [] }>()
const { t } = useI18n()
const id = useId()
const selected = computed(() => props.options.find(o => o.value === props.modelValue))
// Native selects may retain :focus-visible after a mouse choice on Windows.
// Keep focus for keyboard navigation, but only paint the ring for keyboard use.
const pointerFocus = ref(false)
</script>
<template>
  <div class="model-selector">
    <label :for="id" class="field-label">{{ label || t('agentCreate.config.modelSelect') }} <span v-if="required">*</span></label>
    <select :id="id" :value="modelValue" :disabled="loading || disabled"
      :class="{ 'pointer-focus': pointerFocus }"
      @pointerdown="pointerFocus = true" @keydown="pointerFocus = false" @blur="pointerFocus = false"
      @change="emit('update:modelValue', ($event.target as HTMLSelectElement).value)">
      <option value="" :disabled="!clearable">{{ placeholder || t('agentCreate.config.selectModel') }}</option>
      <option v-if="modelValue && !selected" :value="modelValue" disabled>{{ previousModel || modelValue }} · {{ t('llm.selection.unavailable') }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <small v-if="selected">{{ selected.provider }} · {{ selected.description }}</small>
    <p v-if="loading" role="status">{{ t('llm.selection.loading') }}</p>
    <p v-else-if="error" role="alert">{{ error }}</p>
    <p v-else-if="(modelValue && !selected) || (!modelValue && previousModel)" role="alert">{{ unavailableHint || `${previousModel || modelValue} · ${t('llm.selection.invalidSelection')}` }}</p>
    <p v-else-if="!options.length">{{ t('llm.selection.empty') }}</p>
    <div class="model-actions">
      <a href="/profile/llm" target="_blank" rel="noopener noreferrer">{{ t('llm.selection.manage') }} ↗</a>
      <button type="button" :disabled="loading || disabled" @click="emit('refresh')">↻ {{ t('llm.selection.refresh') }}</button>
    </div>
  </div>
</template>
<style scoped>
.model-selector { display:grid; gap:8px; min-width:0; }
.field-label { font-size:15px; font-weight:500; color:#525252; }.field-label span { color:#dc2626; }
select { width:100%; min-width:0; height:40px; padding:0 11px; background:#fafafa; border:1px solid #dedede; border-radius:8px; font:inherit; font-size:14px; color:#374151; transition:border-color .15s ease, background-color .15s ease, box-shadow .15s ease; }
select:focus { outline:none; }
select:focus-visible:not(.pointer-focus) { border-color:#64748b; box-shadow:0 0 0 2px rgba(55,65,81,.08); }
small,p { margin:0; font-size:12px; color:#737373; overflow-wrap:anywhere; line-height:1.6; }p[role="alert"] { color:#9a3412; }
.model-actions { display:flex; gap:8px; flex-wrap:wrap; }
.model-actions a,.model-actions button { border:1px solid #e5e7eb; border-radius:6px; background:#fff; color:#525252; padding:5px 9px; font:inherit; font-size:12px; text-decoration:none; cursor:pointer; }
:where(a,button):focus-visible { outline:2px solid #64748b; outline-offset:2px; }button:disabled { opacity:.5; cursor:wait; }
</style>
