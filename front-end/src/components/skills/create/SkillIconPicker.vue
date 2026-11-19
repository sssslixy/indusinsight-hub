<script setup lang="ts">
import PluginIconPicker from '@/components/plugins/create/PluginIconPicker.vue'

interface Props {
  modelValue: string
  readonly?: boolean
  label?: string
  systemIcons?: string[]
  uploadingIcon?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'upload-icon': [file: File]
}>()
</script>

<template>
  <PluginIconPicker
    v-bind="props"
    @update:model-value="(value) => emit('update:modelValue', value)"
    @upload-icon="(file) => emit('upload-icon', file)"
  />
</template>
