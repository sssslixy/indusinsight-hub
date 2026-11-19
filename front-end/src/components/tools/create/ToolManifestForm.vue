<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PluginJsonEditor from '@/components/plugins/create/PluginJsonEditor.vue'
import type { ToolManifestFormState } from '@/types/tools/toolCreate'
import { DEFAULT_INPUT_SCHEMA_TEXT, DEFAULT_OUTPUT_SCHEMA_TEXT } from '@/utils/skills/skillManifestBuilder'

const props = withDefaults(
  defineProps<{
    modelValue: ToolManifestFormState
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [val: ToolManifestFormState]
}>()

const { t } = useI18n()

function patch(p: Partial<ToolManifestFormState>) {
  emit('update:modelValue', { ...props.modelValue, ...p })
}
</script>

<template>
  <div class="card">
    <header class="hd">
      <h2 class="hd__title">{{ t('create.manifest.ioTitle') }}</h2>
    </header>

    <section class="sec">
      <h3 class="sec__t">{{ t('create.manifest.inputSchema') }}</h3>
      <PluginJsonEditor
        :model-value="modelValue.inputSchemaText"
        file-name="input_schema.json"
        :readonly="readonly"
        :default-json="DEFAULT_INPUT_SCHEMA_TEXT"
        :placeholder="DEFAULT_INPUT_SCHEMA_TEXT"
        :min-height="160"
        @update:model-value="patch({ inputSchemaText: $event })"
      />
    </section>

    <section class="sec">
      <h3 class="sec__t">{{ t('create.manifest.outputSchema') }}</h3>
      <PluginJsonEditor
        :model-value="modelValue.outputSchemaText"
        file-name="output_schema.json"
        :readonly="readonly"
        :default-json="DEFAULT_OUTPUT_SCHEMA_TEXT"
        :placeholder="DEFAULT_OUTPUT_SCHEMA_TEXT"
        :min-height="160"
        @update:model-value="patch({ outputSchemaText: $event })"
      />
    </section>
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
  margin: 0 0 16px;
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
.sec {
  margin-bottom: 20px;
}
.sec:last-child {
  margin-bottom: 0;
}
.sec__t {
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
</style>
