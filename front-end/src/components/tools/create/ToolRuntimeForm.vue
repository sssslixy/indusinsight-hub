<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { ToolRuntimeFormState } from '@/types/tools/toolCreate'

const props = withDefaults(
  defineProps<{
    modelValue: ToolRuntimeFormState
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [val: ToolRuntimeFormState]
}>()

const { t } = useI18n()

function patch(p: Partial<ToolRuntimeFormState>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}
</script>

<template>
  <div class="card">
    <header class="hd">
      <h2 class="hd__title">{{ t('create.runtime.title') }}</h2>
      <p class="hd__sub">{{ t('create.runtime.subtitle') }}</p>
    </header>

    <div class="runtime-grid">
      <div class="field">
        <label class="label" for="tool-timeout-ms">{{ t('create.runtime.timeoutMs') }}</label>
        <input
          id="tool-timeout-ms"
          class="input"
          type="number"
          min="1"
          step="1"
          :value="modelValue.timeoutMs"
          :readonly="readonly"
          :disabled="readonly"
          @input="patch({ timeoutMs: Number(($event.target as HTMLInputElement).value) || 0 })"
        />
      </div>
      <div class="field">
        <label class="label" for="tool-retry-times">{{ t('create.runtime.retryTimes') }}</label>
        <input
          id="tool-retry-times"
          class="input"
          type="number"
          min="0"
          step="1"
          :value="modelValue.retryTimes"
          :readonly="readonly"
          :disabled="readonly"
          @input="patch({ retryTimes: Number(($event.target as HTMLInputElement).value) || 0 })"
        />
      </div>
      <div class="field">
        <span class="label">{{ t('create.runtime.requiresGpu') }}</span>
        <div class="toggle-row">
          <label class="switch">
            <input
              type="checkbox"
              :checked="modelValue.requiresGpu"
              :disabled="readonly"
              @change="patch({ requiresGpu: ($event.target as HTMLInputElement).checked })"
            />
            <span class="slider" />
          </label>
          <span class="toggle-text" :class="{ 'toggle-text--on': modelValue.requiresGpu }">
            {{ modelValue.requiresGpu ? t('create.common.enabled') : t('create.common.disabled') }}
          </span>
        </div>
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

.runtime-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

@media (max-width: 900px) {
  .runtime-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #64748b;
  line-height: 1.3;
}

.input {
  width: 100%;
  box-sizing: border-box;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #111827;
  background: #fff;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}
.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}
.input:disabled {
  background: #f1f5f9;
  color: #64748b;
  cursor: not-allowed;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 2px;
  box-sizing: border-box;
}

.toggle-text {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}
.toggle-text--on {
  color: #1d4ed8;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: #e2e8f0;
  border-radius: 24px;
  transition: background 0.2s ease;
  border: 1px solid #cbd5e1;
}
.slider::before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 2px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s ease;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}
.switch input:checked + .slider {
  background: #2563eb;
  border-color: #1d4ed8;
}
.switch input:checked + .slider::before {
  transform: translateX(20px);
}
.switch input:disabled + .slider {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
