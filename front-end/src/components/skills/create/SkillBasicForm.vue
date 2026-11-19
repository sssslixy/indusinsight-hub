<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PluginIconPicker from '@/components/plugins/create/PluginIconPicker.vue'
import { SKILL_CATEGORY_OPTIONS } from '@/constants/skillCategoryCodes'
import type { SkillBasicFormState } from '@/types/skills/skillCreate'

const props = withDefaults(
  defineProps<{
    modelValue: SkillBasicFormState
    readonly?: boolean
    uploadingIcon?: boolean
  }>(),
  { readonly: false, uploadingIcon: false },
)

const emit = defineEmits<{
  'update:modelValue': [val: SkillBasicFormState]
  'upload-icon': [file: File]
}>()

const { t } = useI18n()

function patch(p: Partial<SkillBasicFormState>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}
</script>

<template>
  <div class="card">
    <header class="hd">
      <h2 class="hd__title">{{ t('create.common.basicInfo') }}</h2>
      <p class="hd__sub">{{ t('create.common.basicInfoSubtitle') }}</p>
    </header>

    <div class="body">
      <PluginIconPicker
        :model-value="modelValue.icon || 'system-1'"
        :readonly="readonly"
        :uploading-icon="uploadingIcon"
        @update:model-value="patch({ icon: $event })"
        @upload-icon="emit('upload-icon', $event)"
      />

      <div class="field">
        <label class="label label--req">{{ t('create.basic.skillName') }}</label>
        <input
          class="input"
          type="text"
          maxlength="100"
          :placeholder="t('create.basic.namePlaceholder')"
          :value="modelValue.name"
          :readonly="readonly"
          :disabled="readonly"
          @input="patch({ name: ($event.target as HTMLInputElement).value })"
        />
      </div>

      <div class="field">
        <label class="label">{{ t('create.common.description') }}</label>
        <textarea
          class="textarea"
          rows="3"
          maxlength="500"
          :placeholder="t('create.basic.skillDescriptionPlaceholder')"
          :value="modelValue.description"
          :readonly="readonly"
          :disabled="readonly"
          @input="patch({ description: ($event.target as HTMLTextAreaElement).value })"
        />
      </div>

      <div class="field">
        <label class="label label--req">{{ t('create.common.category') }}</label>
        <select
          class="select"
          :value="modelValue.categoryCode"
          :disabled="readonly"
          @change="patch({ categoryCode: ($event.target as HTMLSelectElement).value as SkillBasicFormState['categoryCode'] })"
        >
          <option value="" disabled>{{ t('create.common.selectCategory') }}</option>
          <option v-for="opt in SKILL_CATEGORY_OPTIONS" :key="opt.value" :value="opt.value">
            {{ t(opt.labelKey) }}
          </option>
        </select>
      </div>

      <div v-if="!readonly" class="field field--row">
        <label class="label">{{ t('create.common.visibility') }}</label>
        <label class="switch">
          <input
            type="checkbox"
            :checked="modelValue.isPublic"
            @change="patch({ isPublic: ($event.target as HTMLInputElement).checked })"
          />
          <span class="slider" />
        </label>
        <span class="hint">{{ modelValue.isPublic ? t('create.common.publicVisible') : t('create.common.privateVisible') }}</span>
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
.body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field--row {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.label {
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
}
.label--req::after {
  content: ' *';
  color: #dc2626;
}
.input,
.textarea,
.select {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.11);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  background: #fafafa;
  font-family: inherit;
}
.textarea {
  resize: vertical;
  min-height: 72px;
  line-height: 1.5;
}
.select {
  height: 40px;
  cursor: pointer;
}
.input:focus,
.textarea:focus,
.select:focus {
  outline: none;
  border-color: #374151;
  background: #fff;
}
.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 21px;
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
  background: rgba(0, 0, 0, 0.12);
  border-radius: 21px;
  transition: 0.2s;
}
.slider::before {
  position: absolute;
  content: '';
  height: 15px;
  width: 15px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.switch input:checked + .slider {
  background: #1e40af;
}
.switch input:checked + .slider::before {
  transform: translateX(17px);
}
.hint {
  font-size: 13px;
  color: #6b7280;
}
</style>
