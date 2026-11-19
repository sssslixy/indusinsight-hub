<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElButton, ElDialog, ElSelect, ElOption } from 'element-plus'
import { LLM_SLOTS, type LlmBindings, type LlmPreflight, type UserLlmModel } from '@/api/llm'
const props = defineProps<{ agentId: string | number; result?: LlmPreflight | null; applicationResult?: LlmPreflight | null; applicationError?: string; models?: UserLlmModel[]; error?: string; modelsError?: string; checking?: boolean; refreshing?: boolean; applying?: boolean; disabled?: boolean; open?: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; check: []; refresh: []; apply: [value: LlmBindings] }>()
const { t } = useI18n()
const draft = ref<LlmBindings>({})
const readonly = computed(() => props.result?.mode === 'owner' || props.result?.locked || props.disabled)
const status = computed(() => props.checking ? 'loading' : props.result?.locked ? 'locked' : props.result?.mode === 'owner' ? props.result.ready ? 'ownerReady' : 'ownerInvalid' : props.result?.ready ? 'publicReady' : 'notReady')
const action = computed(() => readonly.value ? 'view' : props.result?.ready ? 'adjust' : 'configure')
const issues = computed(() => props.applicationResult?.issues || props.result?.issues || {})
const needsEdit = computed(() => Object.values(props.result?.issues || {}).some(i => ['missing', 'ambiguous', 'model_missing', 'owner_override'].includes(i.code)))
watch(() => props.open, open => { if (open) draft.value = { ...props.result?.llmBindings } }, { immediate: true })
const allSame = computed(() => LLM_SLOTS.every(s => draft.value[s] && draft.value[s] === draft.value.dp) ? draft.value.dp : '')
function useAll(id: string) { draft.value = Object.fromEntries(LLM_SLOTS.map(s => [s, id])) }
function label(id?: string) { const m = props.models?.find(m => m.id === id); return m ? `${m.displayName} · ${m.connectionName}` : id ? `#${id}` : t('llm.selection.unselected') }
function close() { if (!props.applying) emit('update:open', false) }
</script>
<template>
  <button type="button" class="model-trigger" :class="{ 'needs-attention': !!error || (!!result && !result.ready), 'is-checking': checking }" :title="error || t(`llm.selection.${status}`)" :aria-label="`${t(`llm.selection.${action}`)} · ${error || t(`llm.selection.${status}`)}`" :aria-busy="checking" aria-haspopup="dialog" :aria-expanded="!!open" :disabled="checking || applying" @click="emit('update:open', true)">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M6 1.5V3.5M10 1.5V3.5M6 12.5V14.5M10 12.5V14.5M1.5 6H3.5M1.5 10H3.5M12.5 6H14.5M12.5 10H14.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
    <span>{{ t(`llm.selection.${action}`) }}</span>
    <span class="status-dot" :class="{ ready: result?.ready && !error && !checking, warning: !!error || (!!result && !result.ready) }" aria-hidden="true" />
  </button>
  <ElDialog :model-value="open" :title="t(`llm.selection.${readonly ? 'readonlyTitle' : 'title'}`)" width="720px" class="runtime-model-dialog" append-to-body destroy-on-close :close-on-click-modal="false" :close-on-press-escape="!applying" :show-close="!applying" @update:model-value="close">
    <div class="dialog-status" aria-live="polite">
      <p class="status-copy"><span class="status-dot" :class="{ ready: result?.ready && !error }" />{{ error || t(`llm.selection.${status}`) }}</p>
      <div v-if="error || !result?.ready" class="status-actions">
      <template v-if="result?.mode === 'owner' && !result.ready">
        <a v-if="needsEdit" :href="`/my/agents/${agentId}/edit`" target="_blank" rel="noopener noreferrer">{{ t('llm.selection.edit') }} ↗</a>
        <a v-else href="/profile/llm" target="_blank" rel="noopener noreferrer">{{ t('llm.selection.manage') }} ↗</a>
      </template>
      <button v-if="error || !result?.ready" type="button" :disabled="checking || applying || disabled" @click="emit('check')">{{ t('llm.selection.recheck') }}</button>
      </div>
      <ul v-if="result?.mode === 'owner' && !result.ready" class="issues"><li v-for="(issue, slot) in result.issues" :key="slot">{{ t(`llm.slots.${slot}`) }}：{{ t(`llm.issues.${issue.code}`) }}</li></ul>
    </div>
    <p class="dialog-note">{{ t(`llm.selection.${readonly ? 'fixed' : 'cost'}`) }}</p>
    <p v-if="applicationError" role="alert">{{ applicationError }}</p>
    <div v-if="!readonly" class="dialog-tools">
      <a href="/profile/llm" target="_blank" rel="noopener noreferrer">{{ t('llm.selection.manage') }} ↗</a>
      <ElButton :loading="refreshing" :disabled="applying" @click="emit('refresh')">{{ t('llm.selection.refresh') }}</ElButton>
    </div>
    <p v-if="modelsError" role="alert">{{ modelsError }}</p>
    <p v-if="!readonly && !models?.length">{{ t(`llm.selection.${refreshing ? 'loading' : 'empty'}`) }}</p>
    <template v-else>
      <label v-if="!readonly" class="bulk-model" for="runtime-model-all">{{ t('llm.selection.all') }}
        <ElSelect id="runtime-model-all" :model-value="allSame" :placeholder="t('llm.selection.choose')" :disabled="applying" popper-class="runtime-model-options" @change="useAll"><ElOption v-for="m in models" :key="m.id" :value="m.id" :label="`${m.displayName} · ${m.connectionName}`" /></ElSelect>
      </label>
      <div class="model-grid">
        <div v-for="slot in LLM_SLOTS" :key="slot" class="model-position">
          <label :for="`runtime-model-${slot}`">{{ t(`llm.slots.${slot}`) }}</label>
          <p class="requirement">{{ t('llm.selection.requirement') }}：{{ result?.requirements[slot]?.provider }} · {{ result?.requirements[slot]?.model || '—' }}</p>
          <p v-if="readonly" class="selected-model">{{ label(result?.llmBindings[slot]) }}</p>
          <ElSelect v-else :id="`runtime-model-${slot}`" v-model="draft[slot]" :placeholder="t('llm.selection.choose')" :disabled="applying" popper-class="runtime-model-options">
            <ElOption v-if="draft[slot] && !models?.some(m => m.id === draft[slot])" :value="draft[slot]!" :label="`${label(draft[slot])} · ${t('llm.selection.unavailable')}`" disabled />
            <ElOption v-for="m in models" :key="m.id" :value="m.id" :label="`${m.displayName} · ${m.connectionName}`" />
          </ElSelect>
          <small v-if="issues[slot] && (readonly || draft[slot] === (applicationResult || result)?.llmBindings[slot])" class="issue">{{ t(`llm.issues.${issues[slot]!.code}`) }}</small>
        </div>
      </div>
    </template>
    <template #footer>
      <ElButton :disabled="applying" @click="close">{{ t(`llm.selection.${readonly ? 'close' : 'cancel'}`) }}</ElButton>
      <ElButton v-if="!readonly" class="apply-models" :loading="applying" :disabled="checking || !models?.length" @click="emit('apply', { ...draft })">{{ t('llm.selection.apply') }}</ElButton>
    </template>
  </ElDialog>
</template>
<style scoped>
.model-trigger { display:inline-flex; align-items:center; justify-content:center; gap:6px; height:32px; padding:0 12px; border:1px solid rgba(0,0,0,.12); border-radius:6px; background:#fff; color:#6b7280; font:inherit; font-size:13px; font-weight:500; white-space:nowrap; cursor:pointer; transition:border-color .15s,color .15s; }
.model-trigger:hover:not(:disabled) { border-color:#374151; color:#111827; }.model-trigger:disabled { opacity:.5; cursor:wait; }.model-trigger.needs-attention { border-color:#dfcbaa; color:#8b642e; }
.dialog-status { display:flex; flex-wrap:wrap; align-items:center; gap:8px 16px; padding:12px 14px; margin-bottom:16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; font-size:13px; color:#525252; }
.status-copy { display:flex; align-items:center; gap:8px; flex:1; min-width:160px; margin:0; overflow-wrap:anywhere; }.status-dot { display:inline-block; width:6px; height:6px; flex-shrink:0; background:#a3a3a3; border-radius:50%; }.status-dot.ready { background:#38916d; }.status-dot.warning { background:#b8863b; }
.status-actions { display:flex; flex-wrap:wrap; gap:12px; }.status-actions button,.status-actions a { border:0; background:none; color:#374151; font:inherit; cursor:pointer; padding:3px 0; text-decoration:none; }.status-actions button:disabled { opacity:.5; cursor:wait; }
.issues { margin:0; padding-left:16px; width:100%; font-size:12px; color:#9a3412; }
button:focus-visible,a:focus-visible { outline:2px solid #64748b; outline-offset:3px; }
</style>
<style>
.runtime-model-dialog { max-width:calc(100vw - 32px); border-radius:14px; --el-color-primary:#111827; --el-color-primary-light-3:#4b5563; }
.runtime-model-dialog .el-dialog__body { max-height:65vh; overflow-y:auto; }.runtime-model-dialog .dialog-note { color:#737373; line-height:1.7; font-size:12px; margin:0 0 16px; }
.runtime-model-dialog .dialog-tools { display:flex; gap:12px; align-items:center; margin-bottom:16px; }.runtime-model-dialog .dialog-tools a { color:#525252; text-decoration:none; font-size:13px; }
.runtime-model-dialog .bulk-model { display:grid; gap:8px; font-weight:500; margin-bottom:18px; }.runtime-model-dialog .model-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
.runtime-model-dialog .model-position { border:1px solid #e5e7eb; background:#fafafa; padding:14px; border-radius:10px; min-width:0; }.runtime-model-dialog .model-position label { font-size:13px; color:#262626; font-weight:500; }
.runtime-model-dialog .requirement { font-size:12px; color:#737373; overflow-wrap:anywhere; line-height:1.5; margin:6px 0 12px; }.runtime-model-dialog .selected-model { font-size:13px; overflow-wrap:anywhere; }.runtime-model-dialog .issue { display:block; color:#9a3412; font-size:12px; margin-top:6px; }.runtime-model-dialog .el-select { width:100%; }.runtime-model-dialog .apply-models { background:#111827; color:#fff; border-color:#111827; }.runtime-model-options .el-select-dropdown__item { height:auto; min-height:34px; white-space:normal; overflow-wrap:anywhere; max-width:650px; }
@media(max-width:600px) { .runtime-model-dialog .model-grid { grid-template-columns:1fr; }.runtime-model-dialog { margin-top:5vh; }.runtime-model-options { max-width:calc(100vw - 32px); } }
</style>
