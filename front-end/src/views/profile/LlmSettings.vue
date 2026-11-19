<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElButton, ElDialog, ElForm, ElFormItem, ElInput, ElSelect, ElOption, ElMessage, ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import ProfilePageHeader from '@/components/profile/ProfilePageHeader.vue'
import BackButton from '@/components/common/BackButton.vue'
import LlmDeleteDialog from '@/components/profile/LlmDeleteDialog.vue'
import InferenceConfigForm from '@/components/profile/InferenceConfigForm.vue'
import type { InferenceConfig } from '@/api/llm'
import { returnToProfile } from '@/router/profileNavigation'
import { discoverLlmModels, type DiscoveredModel, type ModelDiscovery } from '@/api/llm'
import { getLlmProviders, getLlmConnections, createLlmConnection, updateLlmConnection, deleteLlmConnection, addLlmModel, updateLlmModel, deleteLlmModel, validateLlmModel, llmErrorMessage, llmRequestError, type LlmConnection, type LlmProvider, type UserLlmModel } from '@/api/llm'

const { t, locale } = useI18n()
const router = useRouter()
const connections = ref<LlmConnection[]>([])
const providers = ref<LlmProvider[]>([])
const loading = ref(true)
const loaded = ref(false)
const loadError = ref(false)
const providerLoading = ref(true)
const providerError = ref(false)
const connectionSaving = ref(false)
const modelSaving = ref(false)
const connectionBusy = reactive(new Set<string>())
const modelBusy = reactive(new Set<string>())
const validating = reactive(new Set<string>())
const dialog = ref(false)
const modelDialog = ref(false)
const editing = ref('')
const originalUrl = ref('')
const formErrors = reactive<Record<string, string>>({})
const modelErrors = reactive<Record<string, string>>({})
const form = reactive({ name: '', providerCode: '', baseUrl: '', apiKey: '' })
const modelForm = reactive({ connectionId: '', modelCode: '', displayName: '' })
const inferenceConfig = ref<InferenceConfig>({ profile: 'auto' })
const editingModel = ref<UserLlmModel>()
const connectionError = ref('')
const modelError = ref('')
const deletion = ref<{ connection: LlmConnection; model?: UserLlmModel }>()
const deletionSaving = ref(false)
const deletionError = ref('')
function requestDelete(connection: LlmConnection, model?: UserLlmModel) {
  if (isConnectionBusy(connection) || deletionSaving.value) return
  deletionError.value = ''
  deletion.value = { connection, model }
}
async function confirmDelete() {
  const selected = deletion.value
  if (!selected || deletionSaving.value) return
  deletionSaving.value = true
  deletionError.value = ''
  const { connection, model } = selected
  const busy = model ? modelBusy : connectionBusy
  const id = model?.id || connection.id
  busy.add(id)
  try {
    if (model) await deleteLlmModel(id)
    else await deleteLlmConnection(id)
    if (!active) return
    deletion.value = undefined
    ElMessage.success(t('llm.deleted'))
    await load()
  } catch (e) { if (active) deletionError.value = llmRequestError(e) }
  finally { busy.delete(id); deletionSaving.value = false }
}
const modelConnection = ref<LlmConnection>()
const expectedVersion = ref<string>()
const manualModel = ref(false)
const discoveryLoading = ref(false)
const discoveryStatus = ref<ModelDiscovery['status']>()
const discoveryError = ref('')
const discoveredModels = ref<DiscoveredModel[]>([])
const discoveryLoaded = ref(false)
const discoveryStale = ref(false)
const nameEdited = ref(false)
let discoveryRequest = 0
const discoveryNotice = computed(() => {
  if (discoveryLoading.value) return t('llm.discovery.loading')
  const message = discoveryError.value ? llmErrorMessage(discoveryError.value) : ''
  if (discoveryStatus.value === 'partial') return t('llm.discovery.partial') + ' ' + message
  if (discoveryStatus.value === 'failed' || discoveryStatus.value === 'unsupported')
    return (discoveryLoaded.value ? t('llm.discovery.refreshFailed') + ' ' : '') + message
  return discoveryLoaded.value && !discoveredModels.value.length ? t('llm.discovery.empty') : ''
})
async function discover() {
  if (discoveryLoading.value || !modelDialog.value) return
  const generation = ++discoveryRequest
  const id = modelForm.connectionId
  discoveryLoading.value = true
  try {
    const { data } = await discoverLlmModels(id)
    if (!active || generation !== discoveryRequest || !modelDialog.value) return
    if (data.connectionId !== id) throw new Error('llm_invalid_response')
    if (expectedVersion.value && expectedVersion.value !== data.configVersion) {
      discoveryStale.value = true
      throw new Error('llm_connection_changed')
    }
    expectedVersion.value = data.configVersion
    discoveryStatus.value = data.status
    discoveryError.value = data.errorCode || ''
    if (data.errorCode === 'llm_connection_changed' || data.errorCode === 'llm_connection_disabled') discoveryStale.value = true
    if (data.status === 'success' || data.status === 'partial') {
      discoveredModels.value = data.models
      discoveryLoaded.value = true
    }
  } catch (e) {
    if (!active || generation !== discoveryRequest) return
    discoveryStatus.value = 'failed'
    discoveryError.value = e instanceof Error ? e.message : 'default'
  } finally {
    if (generation === discoveryRequest) discoveryLoading.value = false
  }
}
function selectModel(code: string) {
  if (!nameEdited.value) modelForm.displayName = discoveredModels.value.find(m => m.modelCode === code)?.displayName || code.slice(0, 200)
}
function switchModelMode() {
  manualModel.value = !manualModel.value
  clearErrors(modelErrors)
}
const urlChanged = computed(() => !!editing.value && form.baseUrl.trim() !== originalUrl.value)
const errorMessage = (e: unknown) => ElMessage.error(llmRequestError(e))
function clearErrors(errors: Record<string, string>) {
  Object.keys(errors).forEach(key => delete errors[key])
}
function validateConnection() {
  clearErrors(formErrors)
  if (!form.name.trim()) formErrors.name = t('llm.required')
  else if (form.name.length > 100) formErrors.name = t('llm.tooLong', { max: 100 })
  if (!form.providerCode) formErrors.providerCode = t('llm.required')
  try {
    const u = new URL(form.baseUrl.trim())
    if (u.protocol !== 'https:' || !u.hostname || u.username || u.password || /[?#\s\\]/.test(form.baseUrl.trim())) throw new Error()
    if (form.baseUrl.length > 2048) formErrors.baseUrl = t('llm.tooLong', { max: 2048 })
  } catch { formErrors.baseUrl = t('llm.invalidUrl') }
  if ((!editing.value || urlChanged.value) && !form.apiKey.trim()) formErrors.apiKey = t('llm.keyRequired')
  else if (form.apiKey && (!form.apiKey.trim() || /[*\r\n]/.test(form.apiKey))) formErrors.apiKey = t('llm.invalidKey')
  return !Object.keys(formErrors).length
}
function validateModel() {
  clearErrors(modelErrors)
  if (discoveryStale.value) modelErrors.modelCode = t('llm.errors.llm_connection_changed')
  if (modelConnection.value?.models.some(m => m.modelCode === modelForm.modelCode.trim()) || discoveredModels.value.some(m => m.modelCode === modelForm.modelCode.trim() && m.alreadyAdded)) modelErrors.modelCode = t('llm.errors.llm_model_already_added')
  if (!modelForm.modelCode.trim()) modelErrors.modelCode = t('llm.required')
  else if (modelForm.modelCode.length > 256) modelErrors.modelCode = t('llm.tooLong', { max: 256 })
  if (modelForm.displayName.length > 200) modelErrors.displayName = t('llm.tooLong', { max: 200 })
  return !Object.keys(modelErrors).length
}

// A later refresh wins if independent operations complete out of order.
let requestVersion = 0
let active = true
async function load() {
  const version = ++requestVersion
  loading.value = true
  loadError.value = false
  try {
    const response = await getLlmConnections()
    if (!active || version !== requestVersion) return
    connections.value = response.data || []
    loaded.value = true
  } catch {
    if (active && version === requestVersion) loadError.value = true
  } finally {
    if (active && version === requestVersion) loading.value = false
  }
}
async function loadProviders() {
  if (!active) return
  providerLoading.value = true
  providerError.value = false
  try { const response = await getLlmProviders(); if (active) providers.value = response.data || [] }
  catch { if (active) providerError.value = true }
  finally { if (active) providerLoading.value = false }
}
function open(c?: LlmConnection) {
  editing.value = c?.id || ''
  originalUrl.value = c?.baseUrl || ''
  const preset = providers.value.find(p => p.code === 'deepseek') || providers.value[0]
  Object.assign(form, { name: c?.name || '', providerCode: c?.providerCode || preset?.code || '', baseUrl: c?.baseUrl || preset?.baseUrl || '', apiKey: '' })
  connectionError.value = ''
  clearErrors(formErrors)
  dialog.value = true
}
function providerChanged() { form.baseUrl = providers.value.find(p => p.code === form.providerCode)?.baseUrl || '' }
function openModel(c: LlmConnection, model?: UserLlmModel) {
  editingModel.value = model
  inferenceConfig.value = { ...(model?.inferenceConfig || { profile: 'auto' }) }
  ++discoveryRequest
  modelConnection.value = c
  expectedVersion.value = c.configVersion
  manualModel.value = !!model
  discoveryLoading.value = false
  discoveryStatus.value = undefined
  discoveryError.value = ''
  discoveredModels.value = []
  discoveryLoaded.value = false
  discoveryStale.value = false
  nameEdited.value = false
  Object.assign(modelForm, { connectionId: c.id, modelCode: model?.modelCode || '', displayName: model?.displayName || '' })
  modelError.value = ''
  clearErrors(modelErrors)
  modelDialog.value = true
  if (!model) void discover()
}
async function save() {
  if (connectionSaving.value) return
  connectionSaving.value = true
  connectionError.value = ''
  try {
    if (!validateConnection()) return
    if (editing.value) connectionBusy.add(editing.value)
    const body = { name: form.name.trim(), providerCode: form.providerCode, baseUrl: form.baseUrl.trim(), ...(form.apiKey ? { apiKey: form.apiKey.trim() } : {}) }
    // Clear the component secret as soon as the request owns its payload.
    form.apiKey = ''
    if (editing.value) await updateLlmConnection(editing.value, body)
    else await createLlmConnection(body)
    if (!active) return
    dialog.value = false
    ElMessage.success(t('llm.saved'))
    await load()
  } catch (e) { if (active) connectionError.value = llmRequestError(e) }
  finally { connectionBusy.delete(editing.value); form.apiKey = ''; connectionSaving.value = false }
}
async function saveModel() {
  if (modelSaving.value) return
  const connectionId = modelForm.connectionId
  modelSaving.value = true
  modelError.value = ''
  try {
    if (!editingModel.value && !validateModel()) return
    if (inferenceConfig.value.profile !== 'auto') {
      const cfg = inferenceConfig.value
      if (!cfg.confirmed || !cfg.documentationUrl?.startsWith('https://') || !cfg.maxOutputTokens || (cfg.temperatureMode === 'fixed' && cfg.temperature == null)) {
        modelError.value = llmErrorMessage('llm_invalid_inference_config'); return
      }
    }
    connectionBusy.add(modelForm.connectionId)
    const code = modelForm.modelCode.trim()
    const body = { displayName: modelForm.displayName.trim() || code.slice(0, 200), inferenceConfig: inferenceConfig.value }
    if (editingModel.value) await updateLlmModel(editingModel.value.id, { ...body, expectedModelConfigVersion: editingModel.value.modelConfigVersion })
    else await addLlmModel(modelForm.connectionId, { ...body, modelCode: code, expectedConfigVersion: expectedVersion.value })
    if (!active) return
    modelDialog.value = false
    ElMessage.success(t('llm.modelSaved'))
    await load()
  } catch (e) { if (active) modelError.value = llmRequestError(e) }
  finally { connectionBusy.delete(connectionId); modelSaving.value = false }
}
async function connectionAction(c: LlmConnection) {
  if (isConnectionBusy(c)) return
  connectionBusy.add(c.id)
  try {
    await updateLlmConnection(c.id, { enabled: !c.enabled })
    if (!active) return
    ElMessage.success(t('llm.updated'))
    await load()
  } catch (e) { if (active && e !== 'cancel' && e !== 'close') errorMessage(e) }
  finally { connectionBusy.delete(c.id) }
}
function isConnectionBusy(c: LlmConnection) { return connectionBusy.has(c.id) || c.models.some(m => modelBusy.has(m.id)) }
async function modelAction(c: LlmConnection, m: UserLlmModel, action: 'validate' | 'toggle') {
  if (modelBusy.has(m.id) || connectionBusy.has(c.id)) return
  modelBusy.add(m.id)
  try {
    if (action === 'validate') {
      validating.add(m.id)
      const result = await validateLlmModel(m.id)
      if (active) result.data?.valid ? ElMessage.success(t('llm.verified')) : ElMessage.error(llmErrorMessage(result.data?.errorCode))
    } else {
      await updateLlmModel(m.id, { enabled: !m.enabled })
      if (active) ElMessage.success(t('llm.updated'))
    }
    if (active) await load()
  } catch (e) { if (active && e !== 'cancel' && e !== 'close') errorMessage(e) }
  finally { modelBusy.delete(m.id); validating.delete(m.id) }
}
function modelStatus(c: LlmConnection, m: UserLlmModel) {
  if (!c.enabled || !m.enabled) return 'disabled'
  if (validating.has(m.id)) return 'validating'
  if (m.needsPolicyValidation && m.validationStatus !== 'invalid') return 'revalidate'
  if (m.available) return 'available'
  if (m.validationStatus === 'invalid') return 'invalid'
  return m.validationStatus === 'valid' ? 'revalidate' : 'unverified'
}
function providerName(code: string) {
  const key = `llm.providers.${code}`
  return ['deepseek', 'qwen', 'kimi', 'glm', 'zhipu', 'openai_compatible'].includes(code)
    ? t(key) : providers.value.find(p => p.code === code)?.name || code
}
watch(dialog, value => { if (!value) form.apiKey = '' })
watch(modelDialog, value => {
  if (!value) {
    ++discoveryRequest
    discoveryLoading.value = false
    discoveredModels.value = []
    Object.assign(modelForm, { connectionId: '', modelCode: '', displayName: '' })
  }
})
watch(locale, () => { if (Object.keys(formErrors).length) validateConnection(); if (Object.keys(modelErrors).length) validateModel(); connectionError.value = ''; modelError.value = '' })
onMounted(() => { void load(); void loadProviders() })
onBeforeUnmount(() => { active = false; form.apiKey = '' })
</script>

<template>
  <ElConfigProvider :locale="locale === 'zh-CN' ? zhCn : en">
    <div class="llm-page">
      <ProfilePageHeader />
      <main class="llm-settings">
        <header class="page-heading">
          <div><h1>{{ t('llm.title') }}</h1><p>{{ t('llm.subtitle') }}</p></div>
          <div class="heading-actions">
            <BackButton :label="t('llm.back')" :navigate="() => returnToProfile(router)" />
            <ElButton type="primary" :disabled="providerLoading || providerError || !providers.length" @click="open()"><span aria-hidden="true">＋</span> {{ t('llm.addConnection') }}</ElButton>
          </div>
        </header>
        <p class="notice"><svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="7.5" stroke="currentColor"/><path d="M10 9v5M10 6v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>{{ t('llm.notice') }}</p>
        <div v-if="providerError" class="feedback" role="alert">{{ t('llm.providersFailed') }}<ElButton :loading="providerLoading" @click="loadProviders">{{ t('llm.retry') }}</ElButton></div>
        <div v-if="loadError" class="feedback" role="alert">{{ t(loaded ? 'llm.refreshFailed' : 'llm.loadFailed') }}<ElButton :loading="loading" @click="load">{{ t('llm.retry') }}</ElButton></div>
        <section v-if="!loaded && loading" class="state-card" role="status" aria-busy="true"><div class="skeleton"/><div class="skeleton short"/><p>{{ t('llm.loading') }}</p></section>
        <section v-else-if="loaded && !connections.length" class="state-card empty-state">
          <div class="empty-icon" aria-hidden="true"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect x="5" y="5" width="22" height="9" rx="3" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="18" width="22" height="9" rx="3" stroke="currentColor" stroke-width="1.5"/><path d="M10 9.5h.01M10 22.5h.01M16 9.5h6M16 22.5h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></div>
          <h2>{{ t('llm.emptyTitle') }}</h2><p>{{ t('llm.emptyDescription') }}</p>
          <ElButton type="primary" :disabled="providerLoading || providerError || !providers.length" @click="open()">＋ {{ t('llm.addConnection') }}</ElButton>
        </section>
        <template v-else-if="connections.length">
          <div class="list-toolbar"><span>{{ t('llm.title') }} · {{ connections.length }}</span><ElButton :loading="loading" @click="load">{{ t('llm.refresh') }}</ElButton></div>
          <article v-for="c in connections" :key="c.id" class="connection-card" :aria-label="c.name">
            <div class="connection-heading">
              <div class="connection-title"><h2>{{ c.name }}</h2><span class="provider">{{ providerName(c.providerCode) }}</span><span class="status" :class="c.enabled ? 'enabled' : 'disabled'">{{ t(c.enabled ? 'llm.enabled' : 'llm.disabled') }}</span></div>
              <div class="row-actions"><ElButton :disabled="isConnectionBusy(c)" @click="open(c)">{{ t('llm.edit') }}</ElButton><ElButton :disabled="isConnectionBusy(c)" @click="connectionAction(c)">{{ t(c.enabled ? 'llm.disable' : 'llm.enable') }}</ElButton><ElButton class="danger-action" :disabled="isConnectionBusy(c)" @click="requestDelete(c)">{{ t('llm.delete') }}</ElButton></div>
            </div>
            <dl class="connection-meta"><div><dt>{{ t('llm.baseUrl') }}</dt><dd>{{ c.baseUrl }}</dd></div><div><dt>API Key</dt><dd class="masked-key">{{ c.apiKeyMasked }}</dd></div></dl>
            <div v-if="c.models.length" class="model-list">
              <div class="model-columns" aria-hidden="true"><span>{{ t('llm.modelName') }}</span><span>{{ t('llm.status') }}</span><span>{{ t('llm.actions') }}</span></div>
              <div v-for="m in c.models" :key="m.id" class="model-row">
                <div class="model-identity"><h3>{{ m.displayName }}</h3><code>{{ m.modelCode }}</code></div>
                <div class="model-status" aria-live="polite">
                  <span class="status" :class="modelStatus(c, m)">{{ t(`llm.${modelStatus(c, m)}`) }}</span>
                  <p v-if="m.lastErrorCode && m.validationStatus === 'invalid'" class="status-detail--error"><span v-if="m.inferenceCapabilities?.failedStep">{{ t(`llm.inference.steps.${m.inferenceCapabilities.failedStep}`) }}： </span>{{ llmErrorMessage(m.lastErrorCode) }}</p>
                  <p v-if="m.inferencePolicy" :class="{ 'status-detail--error': !!m.inferencePolicy.errorCode, 'status-detail--success': !m.inferencePolicy.errorCode && m.available }">{{ m.inferencePolicy.errorCode ? llmErrorMessage(m.inferencePolicy.errorCode) : t(m.available ? (m.inferencePolicy.userDeclared ? 'llm.inference.declaredReady' : 'llm.inference.ready') : 'llm.inference.pending') }}</p>
                </div>
                <div class="row-actions model-actions">
                  <ElButton :disabled="isConnectionBusy(c)" @click="openModel(c, m)">{{ t('llm.inference.settings') }}</ElButton>
                  <ElButton :loading="validating.has(m.id)" :disabled="modelBusy.has(m.id) || connectionBusy.has(c.id) || !c.enabled || !m.enabled" :aria-label="`${t('llm.validate')} ${m.displayName}`" @click="modelAction(c, m, 'validate')">{{ t('llm.validate') }}</ElButton>
                  <ElButton :disabled="modelBusy.has(m.id) || connectionBusy.has(c.id)" :aria-label="`${t(m.enabled ? 'llm.disable' : 'llm.enable')} ${m.displayName}`" @click="modelAction(c, m, 'toggle')">{{ t(m.enabled ? 'llm.disable' : 'llm.enable') }}</ElButton>
                  <ElButton class="danger-action" :disabled="modelBusy.has(m.id) || connectionBusy.has(c.id)" :aria-label="`${t('llm.delete')} ${m.displayName}`" @click="requestDelete(c, m)">{{ t('llm.delete') }}</ElButton>
                </div>
              </div>
            </div>
            <div v-else class="no-models"><h3>{{ t('llm.noModels') }}</h3><p>{{ t('llm.noModelsHint') }}</p></div>
            <div class="card-footer"><ElButton :disabled="isConnectionBusy(c)" @click="openModel(c)">＋ {{ t('llm.addModel') }}</ElButton></div>
          </article>
        </template>
      </main>
    </div>
    <ElDialog v-model="dialog" class="llm-dialog" :title="t(editing ? 'llm.editConnection' : 'llm.addConnection')" width="min(560px, calc(100vw - 32px))" append-to-body destroy-on-close :close-on-click-modal="false" :close-on-press-escape="!connectionSaving" :show-close="!connectionSaving" @close="form.apiKey = ''">
      <ElForm v-if="dialog" :model="form" label-position="top" :disabled="connectionSaving" @submit.prevent="save">
        <p v-if="connectionError" class="form-feedback" role="alert">{{ connectionError }}</p>
        <ElFormItem :label="t('llm.connectionName')" :error="formErrors.name"><ElInput v-model="form.name" maxlength="100" :placeholder="t('llm.namePlaceholder')" /></ElFormItem>
        <ElFormItem :label="t('llm.provider')" :error="formErrors.providerCode"><ElSelect popper-class="llm-select-popper" v-model="form.providerCode" :disabled="!!editing" @change="providerChanged"><ElOption v-for="p in providers" :key="p.code" :value="p.code" :label="providerName(p.code)"/><ElOption v-if="editing && !providers.some(p => p.code === form.providerCode)" :value="form.providerCode" :label="providerName(form.providerCode)"/></ElSelect></ElFormItem>
        <ElFormItem :label="t('llm.baseUrl')" :error="formErrors.baseUrl"><ElInput v-model="form.baseUrl" maxlength="2048" placeholder="https://api.example.com/v1" aria-describedby="llm-url-hint"/><p id="llm-url-hint" class="field-hint">{{ t('llm.urlHint') }}</p></ElFormItem>
        <ElFormItem :label="t(editing ? 'llm.keyEdit' : 'llm.key')" :error="formErrors.apiKey"><ElInput v-model="form.apiKey" type="password" show-password autocomplete="new-password" aria-describedby="llm-key-hint"/><p id="llm-key-hint" class="field-hint" :class="{ warning: urlChanged }">{{ t(urlChanged ? 'llm.keyChanged' : 'llm.keyHint') }}</p></ElFormItem>
      </ElForm>
      <template #footer><ElButton :disabled="connectionSaving" @click="dialog = false">{{ t('llm.cancel') }}</ElButton><ElButton type="primary" :loading="connectionSaving" @click="save">{{ t('llm.save') }}</ElButton></template>
    </ElDialog>
    <ElDialog v-model="modelDialog" class="llm-dialog llm-model-dialog" :title="t(editingModel ? 'llm.inference.editModel' : 'llm.addModel')" width="min(560px, calc(100vw - 32px))" append-to-body destroy-on-close :close-on-click-modal="false" :close-on-press-escape="!modelSaving" :show-close="!modelSaving">
      <ElForm v-if="modelDialog" :model="modelForm" label-position="top" :disabled="modelSaving" @submit.prevent="saveModel">
        <p class="discovery-connection">{{ t('llm.discovery.connection') }}：{{ modelConnection?.name }} · {{ providerName(modelConnection?.providerCode || '') }}</p>
        <p v-if="modelError" class="form-feedback" role="alert">{{ modelError }}</p>
        <div v-if="!editingModel" class="discovery-toolbar"><ElButton :aria-pressed="manualModel" @click="switchModelMode">{{ t(manualModel ? 'llm.discovery.useList' : 'llm.discovery.manual') }}</ElButton><ElButton :loading="discoveryLoading" :disabled="discoveryStale" @click="discover">{{ t('llm.discovery.refresh') }}</ElButton></div>
        <p v-if="discoveryNotice" class="discovery-notice" role="status" :aria-busy="discoveryLoading" :class="{ warning: !discoveryLoading && discoveryStatus !== 'success' }">{{ discoveryNotice }}</p>
        <ElFormItem :label="t(manualModel ? 'llm.modelCode' : 'llm.discovery.model')" :error="modelErrors.modelCode">
          <ElInput v-if="manualModel" v-model="modelForm.modelCode" :disabled="!!editingModel" maxlength="256" :placeholder="t('llm.modelPlaceholder')" />
          <ElSelect v-else v-model="modelForm.modelCode" filterable :loading="discoveryLoading" :placeholder="t('llm.discovery.search')" popper-class="llm-select-popper llm-discovery-popper" @change="selectModel">
            <ElOption v-for="m in discoveredModels" :key="m.modelCode" :value="m.modelCode" :label="`${m.displayName} · ${m.modelCode}`" :disabled="m.alreadyAdded || m.inferencePolicy?.state === 'thinking_only'">
              <span class="discovery-option-name">{{ m.displayName }}<small v-if="m.alreadyAdded">{{ t('llm.discovery.added') }}</small></span><code>{{ m.modelCode }}</code><small v-if="m.inferencePolicy?.errorCode">{{ llmErrorMessage(m.inferencePolicy.errorCode) }}</small>
            </ElOption>
          </ElSelect>
        </ElFormItem>
        <ElFormItem :label="t('llm.displayName')" :error="modelErrors.displayName"><ElInput v-model="modelForm.displayName" maxlength="200" :placeholder="t('llm.discovery.nameHint')" @input="nameEdited = true" /></ElFormItem>
        <InferenceConfigForm v-model="inferenceConfig" />
        <p class="field-hint">{{ t('llm.modelHint') }}</p>
      </ElForm>
      <template #footer><ElButton :disabled="modelSaving" @click="modelDialog = false">{{ t('llm.cancel') }}</ElButton><ElButton type="primary" :loading="modelSaving" @click="saveModel">{{ t('llm.saveModel') }}</ElButton></template>
    </ElDialog>
    <LlmDeleteDialog :visible="!!deletion" :loading="deletionSaving" :error="deletionError"
      :title="t(deletion?.model ? 'llm.deleteModelTitle' : 'llm.deleteConnectionTitle')"
      :message="deletion ? t(deletion.model ? 'llm.deleteModel' : 'llm.deleteConnection', { name: deletion.model?.displayName || deletion.connection.name }) : ''"
      @cancel="deletion = undefined" @confirm="confirmDelete" />
  </ElConfigProvider>
</template>

<style scoped>
.llm-page { min-height: 100vh; display: flex; flex-direction: column; padding-top: var(--app-page-top-desktop); background: var(--app-color-bg-page); color: var(--app-color-text-primary); }
.llm-settings { width: 100%; max-width: 1280px; margin: 0 auto; padding: 48px 48px 64px; flex: 1; }
.page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 28px; border-bottom: 1px solid var(--app-color-border-soft); }
h1 { font-size: 32px; line-height: 1.3; font-weight: 600; }
.page-heading p { margin-top: 10px; font-size: 15px; color: var(--app-color-text-secondary); line-height: 1.7; }
.heading-actions, .row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.heading-actions { padding-top: 4px; flex-shrink: 0; }
.notice { display: flex; align-items: flex-start; gap: 10px; margin: 24px 0; padding: 16px 18px; border-radius: 10px; background: #f1f2f4; color: #555e6b; font-size: 14px; line-height: 1.8; }
.notice svg { flex-shrink: 0; margin-top: 3px; }
.feedback { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin: 16px 0; padding: 16px; border: 1px solid #ecd8b5; border-radius: 10px; background: #fffaf0; color: #80612f; font-size: 14px; line-height: 1.7; }
.state-card, .connection-card { background: #fff; border: 1px solid rgba(0,0,0,.06); border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.state-card { padding: 56px 24px; text-align: center; }
.empty-icon { width: 68px; height: 68px; margin: 0 auto 24px; border: 1px solid #e8e9ec; border-radius: 18px; display: grid; place-items: center; background: #fafafa; color: #555d68; }
.state-card h2 { font-size: 21px; font-weight: 600; }
.state-card p { color: #737373; font-size: 14px; line-height: 1.8; margin: 12px 0 24px; }
.skeleton { width: 65%; height: 20px; margin: 0 auto 16px; background: #f2f3f5; border-radius: 6px; }
.skeleton.short { width: 40%; }
.list-toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; font-size: 13px; color: #737373; }
.connection-card { margin-bottom: 24px; overflow: hidden; }
.connection-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; padding: 24px 28px 20px; }
.connection-title { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; min-width: 0; }
.connection-title h2 { font-size: 19px; font-weight: 600; overflow-wrap: anywhere; }
.provider { color: #737373; font-size: 13px; overflow-wrap: anywhere; }
.status { display: inline-block; font-size: 13px; line-height: 1.6; padding: 3px 9px; border-radius: 6px; color: #667085; background: #f2f3f5; }
.status.enabled, .status.available { color: #28744b; background: #eef7f1; }
.status.invalid { color: #a13c3c; background: #fff0ef; }
.status.revalidate, .status.validating { color: #8b642e; background: #fff7e8; }
.connection-meta { display: grid; grid-template-columns: minmax(0, 1fr) minmax(120px, .35fr); gap: 24px; padding: 0 28px 24px; }
.connection-meta dt { color: #667085; font-size: 13px; margin-bottom: 6px; }
.connection-meta dd { font-size: 14px; color: #555e6b; line-height: 1.7; overflow-wrap: anywhere; }
.masked-key { font-family: Consolas, 'SFMono-Regular', monospace; }
.model-columns, .model-row { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) minmax(220px, auto); align-items: start; gap: 20px; padding: 16px 28px; }
.model-columns { background: #fafafa; color: #667085; font-size: 13px; border-top: 1px solid #f0f0f0; }
.model-row { border-top: 1px solid #f0f0f0; align-items: center; }
.model-identity { min-width: 0; }
.model-identity h3, .no-models h3 { font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
.model-identity code { display: block; font-family: var(--llm-font-family); font-size: 14px; margin-top: 6px; color: #555e6b; overflow-wrap: anywhere; }
.model-status p { font-size: 13px; line-height: 1.7; color: #667085; margin-top: 6px; overflow-wrap: anywhere; }
.model-status .status-detail--error { color: #a13c3c; }
.model-status .status-detail--success { color: #28744b; }
.no-models { padding: 24px 28px; background: #fcfcfc; border-top: 1px solid #f0f0f0; }
.no-models p { font-size: 14px; color: #667085; margin-top: 8px; line-height: 1.7; }
.card-footer { border-top: 1px solid #f0f0f0; padding: 16px 28px; }
@media (max-width: 1024px) { .page-heading { flex-direction: column; } .connection-heading { flex-wrap: wrap; } .model-columns, .model-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); } .model-columns span:last-child { display: none; } .model-actions { grid-column: 1 / -1; } }
@media (max-width: 768px) { .llm-page { padding-top: var(--app-page-top-mobile); } .llm-settings { padding: 32px 24px 48px; } h1 { font-size: 28px; } .heading-actions { flex-shrink: 1; } .connection-heading, .model-row { padding: 20px; } .connection-meta { padding: 0 20px 20px; grid-template-columns: 1fr; gap: 14px; } .model-columns { display: none; } .model-row { grid-template-columns: 1fr; gap: 14px; } .model-actions { grid-column: auto; } .card-footer, .no-models { padding: 20px; } .feedback { align-items: flex-start; } }
</style>

<!-- Teleported dialogs use an explicit namespace; no global Element Plus override. -->
<style>
.llm-page, .llm-dialog, .llm-delete-dialog, .llm-select-popper { --el-color-primary: #252a34; --el-color-primary-light-3: #505763; --el-color-primary-light-5: #818792; --el-color-primary-light-7: #b7bbc1; --el-color-primary-light-8: #d8dade; --el-color-primary-light-9: #f4f5f7; --el-color-primary-dark-2: #111827; --el-border-radius-base: 8px; --llm-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei UI', 'Microsoft YaHei', 'PingFang SC', 'Hiragino Sans GB', 'Noto Sans CJK SC', Arial, sans-serif; --el-font-family: var(--llm-font-family); font-family: var(--llm-font-family); }
.llm-page .el-button, .llm-dialog .el-button, .llm-delete-dialog .el-button { height: 38px; padding: 0 16px; font-weight: 500; }
.llm-page .el-button + .el-button { margin-left: 0; }
.llm-page .danger-action:not(:disabled) { color: #a13c3c; }
.llm-page .el-button:focus-visible, .llm-dialog .el-button:focus-visible { outline: 2px solid #505763; outline-offset: 3px; }
.llm-dialog.el-dialog { padding: 28px; border-radius: 16px; }
.llm-dialog .el-dialog__header { padding-bottom: 24px; }
.llm-dialog .el-dialog__title { font-weight: 600; font-size: 21px; line-height: 1.4; }
.llm-dialog .el-dialog__footer { padding-top: 24px; display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.llm-dialog .el-dialog__footer .el-button { margin-left: 0; }
.llm-dialog .el-form-item { margin-bottom: 24px; }
.llm-dialog .el-form-item__label { line-height: 1.6; height: auto; color: #505763; }
.llm-dialog .el-select { width: 100%; }
.llm-page .el-button, .llm-dialog .el-button, .llm-delete-dialog .el-button,
.llm-dialog .el-input__inner, .llm-dialog .el-select__input,
.llm-dialog .el-select__selected-item { font-family: var(--llm-font-family); font-size: 14px; }
.llm-dialog .el-input__wrapper, .llm-dialog .el-select__wrapper { min-height: 40px; }
.llm-dialog .field-hint { font-size: 13px; line-height: 1.8; color: #667085; margin-top: 8px; }
.llm-dialog .warning { color: #8b642e; }
.llm-dialog .form-feedback { color: #a13c3c; background: #fff0ef; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 13px; line-height: 1.7; }
.llm-model-dialog .discovery-connection { margin: -8px 0 18px; font-size: 13px; color: #737b87; line-height: 1.7; overflow-wrap: anywhere; }
.llm-model-dialog .discovery-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.llm-model-dialog .discovery-toolbar .el-button { margin-left: 0; height: 32px; font-size: 13px; padding: 0 12px; }
.llm-model-dialog .discovery-notice { padding: 12px; margin-bottom: 16px; border-radius: 8px; background: #f5f6f8; font-size: 13px; line-height: 1.7; }
.llm-discovery-popper { max-width: calc(100vw - 48px); }
.llm-discovery-popper .el-select-dropdown__item { height: auto; line-height: 1.6; padding: 10px 16px; white-space: normal; overflow-wrap: anywhere; }
.llm-discovery-popper .discovery-option-name { display: flex; gap: 10px; justify-content: space-between; }
.llm-discovery-popper small { flex-shrink: 0; font-weight: 400; }
.llm-discovery-popper code { display: block; font-family: var(--llm-font-family); font-size: 13px; color: #667085; font-weight: 400; }
@media (max-width: 480px) { .llm-dialog.el-dialog { padding: 22px; margin-top: 8vh; } .llm-page .el-button { padding: 0 12px; } }
.llm-model-dialog.el-dialog { display: flex; flex-direction: column; margin: 24px auto; max-height: calc(100dvh - 48px); }
.llm-model-dialog .el-dialog__body { overflow-y: auto; min-height: 0; padding-right: 4px; }
.llm-model-dialog .el-dialog__header, .llm-model-dialog .el-dialog__footer { flex-shrink: 0; }
.llm-model-dialog .el-dialog__footer { padding-top: 16px; }
.llm-select-popper { max-width: calc(100vw - 48px); }
.llm-select-popper .el-select-dropdown__item { height: auto; min-height: 34px; line-height: 1.6; white-space: normal; overflow-wrap: anywhere; padding-top: 6px; padding-bottom: 6px; }
</style>
