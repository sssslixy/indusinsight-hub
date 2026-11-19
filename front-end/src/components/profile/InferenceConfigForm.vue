<script setup lang="ts">
import { ElFormItem, ElSelect, ElOption, ElInput, ElInputNumber, ElCheckbox } from 'element-plus'
import { useI18n } from 'vue-i18n'
import type { InferenceConfig } from '@/api/llm'
const value = defineModel<InferenceConfig>({ required: true })
const { t } = useI18n()
const profiles = ['auto','native_off','thinking_disabled','enable_thinking_false','reasoning_none','template_enable_false','template_thinking_false']
function profileChanged(profile: string) {
  value.value = profile === 'auto' ? { profile } : { profile, temperatureMode: 'default', maxOutputTokens: 4096, documentationUrl: '', confirmed: false }
}
</script>
<template>
  <fieldset class="inference-config">
    <legend>{{ t('llm.inference.title') }}</legend>
    <ElFormItem :label="t('llm.inference.profile')">
      <ElSelect :model-value="value.profile || 'auto'" @change="profileChanged" popper-class="llm-select-popper">
        <ElOption v-for="profile in profiles" :key="profile" :value="profile" :label="t(`llm.inference.profiles.${profile}`)" />
      </ElSelect>
    </ElFormItem>
    <p class="field-hint">{{ t('llm.inference.notice') }}</p>
    <template v-if="value.profile && value.profile !== 'auto'">
      <ElFormItem :label="t('llm.inference.temperatureMode')"><ElSelect v-model="value.temperatureMode" popper-class="llm-select-popper"><ElOption value="default" :label="t('llm.inference.defaultTemperature')"/><ElOption value="fixed" :label="t('llm.inference.fixedTemperature')"/></ElSelect></ElFormItem>
      <ElFormItem v-if="value.temperatureMode === 'fixed'" :label="t('llm.inference.temperature')"><ElInputNumber v-model="value.temperature" :min="0" :max="2" :step="0.1"/></ElFormItem>
      <ElFormItem :label="t('llm.inference.maxOutput')"><ElInputNumber v-model="value.maxOutputTokens" :min="1" :max="1048576" :step="256"/></ElFormItem>
      <ElFormItem :label="t('llm.inference.documentation')"><ElInput v-model="value.documentationUrl" placeholder="https://" maxlength="2048"/></ElFormItem>
      <ElCheckbox v-model="value.confirmed">{{ t('llm.inference.confirmed') }}</ElCheckbox>
    </template>
  </fieldset>
</template>
<style scoped>
.inference-config { min-width:0; border:1px solid #e5e7eb; border-radius:10px; padding:16px; margin:16px 0; }
legend { font-size:14px; color:#374151; padding:0 6px; }
.field-hint { margin-bottom:16px; }
:deep(.el-checkbox) { white-space:normal; height:auto; align-items:flex-start; }
:deep(.el-checkbox__label) { white-space:normal; line-height:1.6; }
</style>
