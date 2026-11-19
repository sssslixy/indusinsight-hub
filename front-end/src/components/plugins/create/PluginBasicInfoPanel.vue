<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PLUGIN_CATEGORY_OPTIONS_WITH_PLACEHOLDER } from '@/constants/pluginCategory'
import PluginIconPicker from './PluginIconPicker.vue'
import type { PluginBasicInfo, SkillType } from '@/types/modules/pluginSkill'
import { SKILL_TYPE_OPTIONS } from '@/types/modules/pluginSkill'

const props = withDefaults(
  defineProps<{ modelValue: PluginBasicInfo; readonly?: boolean; uploadingIcon?: boolean }>(),
  { readonly: false, uploadingIcon: false },
)

const emit = defineEmits<{
  'update:modelValue': [val: PluginBasicInfo]
  'upload-icon': [file: File]
}>()

const { t } = useI18n()

const update = (field: keyof PluginBasicInfo, value: unknown) => {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

const displayCategoryOptions = computed(() =>
  PLUGIN_CATEGORY_OPTIONS_WITH_PLACEHOLDER.map((opt) => ({
    ...opt,
    label:
      opt.value === ''
        ? t(opt.labelKey)
        : t(opt.labelKey, { category: t(opt.categoryLabelKey) }),
  })),
)
</script>

<template>
  <div class="basic-config-card">
    <header class="module-header">
      <h2 class="module-header__title">{{ t('create.pluginBasic.title') }}</h2>
      <p class="module-header__subtitle">{{ t('create.pluginBasic.subtitle') }}</p>
    </header>

    <div class="form-body">
      <PluginIconPicker
        :model-value="modelValue.icon"
        :readonly="readonly"
        :uploading-icon="uploadingIcon"
        @update:model-value="update('icon', $event)"
        @upload-icon="emit('upload-icon', $event)"
      />

      <div class="form-item">
        <label class="field-label" :class="{ 'field-label--required': !readonly }">{{ t('create.pluginBasic.skillType') }}</label>
        <div class="select-wrapper">
          <select
            :value="modelValue.skillType"
            class="field-select"
            :disabled="readonly"
            @change="update('skillType', ($event.target as HTMLSelectElement).value as SkillType)"
          >
            <option v-for="opt in SKILL_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
              {{ t(opt.labelKey) }}
            </option>
          </select>
        </div>
      </div>

      <div class="form-item">
        <label class="field-label" :class="{ 'field-label--required': !readonly }">{{ t('create.pluginBasic.skillName') }}</label>
        <input
          class="field-input"
          type="text"
          :placeholder="t('create.pluginBasic.skillNamePlaceholder')"
          maxlength="50"
          :value="modelValue.name"
          :readonly="readonly"
          :disabled="readonly"
          @input="update('name', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="form-item">
        <label class="field-label">{{ t('create.pluginBasic.skillDescription') }}</label>
        <input
          class="field-input"
          type="text"
          :placeholder="t('create.pluginBasic.skillDescriptionPlaceholder')"
          maxlength="120"
          :value="modelValue.description"
          :readonly="readonly"
          :disabled="readonly"
          @input="update('description', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div class="form-item">
        <label class="field-label" :class="{ 'field-label--required': !readonly }">{{ t('create.pluginBasic.skillCategory') }}</label>
        <div class="select-wrapper">
          <select
            :value="modelValue.categoryId"
            class="field-select"
            :disabled="readonly"
            @change="update('categoryId', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="opt in displayCategoryOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="!readonly" class="form-item">
        <label class="field-label">{{ t('create.pluginBasic.isPublic') }}</label>
        <div class="toggle-row">
          <label class="switch">
            <input
              type="checkbox"
              :checked="modelValue.isPublic"
              @change="update('isPublic', ($event.target as HTMLInputElement).checked)"
            />
            <span class="slider" />
          </label>
          <span class="toggle-text">{{ modelValue.isPublic ? t('create.pluginBasic.publicPublish') : t('create.common.privateVisible') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-config-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 16px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.module-header {
  flex-shrink: 0;
  padding: 0;
  margin: 0;
}

.module-header__title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.25;
  color: #111827;
}

.module-header__subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.4;
  color: #6b7280;
}

.form-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 100%;
}

.field-label {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  line-height: 1;
}
.field-label--required::after { content: ' *'; color: #dc2626; }

.field-input {
  height: 40px;
  padding: 0 11px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.11);
  border-radius: 7px;
  font-size: 15px;
  color: #111827;
  font-family: inherit;
  transition: all 0.18s ease;
  width: 100%;
  box-sizing: border-box;
}
.field-input:focus {
  outline: none;
  border-color: #374151;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(55, 65, 81, 0.06);
}
.field-input::placeholder { color: #9ca3af; }

.select-wrapper {
  width: 100%;
}

.field-select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 12px;
  font-size: 14px;
  line-height: 1.5;
  color: #111827;
  background-color: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 10px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12' fill='none'%3E%3Cpath d='M2.5 4.5L6 8L9.5 4.5' stroke='%236b7280' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  font-family: inherit;
  box-sizing: border-box;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.field-select:hover {
  border-color: rgba(0, 0, 0, 0.2);
}
.field-select:focus {
  outline: none;
  border-color: #374151;
  box-shadow: 0 0 0 2px rgba(55, 65, 81, 0.08);
}

.toggle-row { display: flex; align-items: center; gap: 8px; height: 36px; }

.switch {
  position: relative;
  display: inline-block;
  width: 38px;
  height: 21px;
  flex-shrink: 0;
}
.switch input { opacity: 0; width: 0; height: 0; }
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
  background: #ffffff;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}
.switch input:checked + .slider { background: #1e40af; }
.switch input:checked + .slider::before { transform: translateX(17px); }

.toggle-text { font-size: 13px; color: #6b7280; white-space: nowrap; }
</style>
