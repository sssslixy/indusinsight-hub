<script setup lang="ts">
import PluginBasicInfoPanel from '@/components/plugins/create/PluginBasicInfoPanel.vue'
import type { SkillBasicInfo } from '@/types/modules/pluginSkill'

interface Props {
  modelValue: SkillBasicInfo
  readonly?: boolean
  uploadingIcon?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: SkillBasicInfo]
  'upload-icon': [file: File]
}>()
</script>

<template>
  <PluginBasicInfoPanel
    v-bind="props"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @upload-icon="(file) => emit('upload-icon', file)"
  />
</template>
