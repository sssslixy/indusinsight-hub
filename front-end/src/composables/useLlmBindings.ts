import { ref, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { getAvailableModels, preflightLlm, llmRequestError, llmErrorMessage, type LlmBindings, type LlmPreflight, type UserLlmModel } from '@/api/llm'

/** Runtime authorization is independent of whether the configuration dialog is mounted. */
export function useLlmBindings(agentId: Ref<string>, sessionId: Ref<string | null>, threadId: Ref<string | null>, enabled: Ref<boolean>) {
  const result = ref<LlmPreflight | null>(null)
  const applicationResult = ref<LlmPreflight | null>(null)
  const applicationError = ref('')
  const models = ref<UserLlmModel[]>([])
  const error = ref('')
  const modelsError = ref('')
  const checking = ref(false)
  const refreshing = ref(false)
  const applying = ref(false)
  const dialogOpen = ref(false)
  let context = 0, request = 0, modelRequest = 0
  let applied: LlmBindings = {}
  async function refreshModels() {
    const ticket = ++modelRequest
    refreshing.value = true
    try { const r = await getAvailableModels(); if (ticket === modelRequest) { models.value = r.data || []; modelsError.value = '' } }
    catch (e) { if (ticket === modelRequest) modelsError.value = llmRequestError(e) }
    finally { if (ticket === modelRequest) refreshing.value = false }
  }
  async function check(bindings?: LlmBindings, persist = false, application = false): Promise<LlmPreflight | null> {
    if (!enabled.value || !agentId.value) return null
    const current = context, ticket = ++request
    checking.value = true
    try {
      const supplied = bindings ?? (result.value?.mode === 'owner' || threadId.value ? {} : applied)
      const r = await preflightLlm(agentId.value, sessionId.value, supplied, threadId.value, persist)
      if (current !== context || ticket !== request) return null
      if (!r.data) throw new Error('invalid_response')
      if (application) { applicationResult.value = r.data; applicationError.value = '' }
      if (!application || r.data.ready) { result.value = r.data; error.value = '' }
      if (r.data.ready) applied = { ...r.data.llmBindings }
      return r.data
    } catch (e) {
      if (current === context && ticket === request) {
        if (application) applicationError.value = llmRequestError(e)
        else { error.value = llmRequestError(e); result.value = null }
      }
      return null
    } finally { if (current === context && ticket === request) checking.value = false }
  }
  async function apply(bindings: LlmBindings) {
    if (applying.value) return
    const current = context
    applying.value = true
    const r = await check(bindings, !!sessionId.value && /^\d+$/.test(sessionId.value), true)
    if (current !== context) return
    applying.value = false
    if (r?.ready) dialogOpen.value = false
  }
  async function forSend(): Promise<LlmBindings | null> {
    const r = await check()
    if (r?.locked && !r.resumable) {
      throw new Error(llmErrorMessage('llm_thread_busy'))
    }
    if (!r?.ready) {
      if (r?.mode === 'public' && !r.locked) dialogOpen.value = true
      return null
    }
    return r.llmBindings
  }
  watch(dialogOpen, () => { applicationResult.value = null; applicationError.value = '' })
  const focus = () => { if (enabled.value && !applying.value) { void refreshModels(); void check() } }
  watch([agentId, sessionId, threadId, enabled], () => {
    context++; request++; modelRequest++; applied = {}; applicationResult.value = null; applicationError.value = ''; result.value = null; error.value = ''; modelsError.value = ''
    checking.value = false; refreshing.value = false; applying.value = false; dialogOpen.value = false
    if (enabled.value && agentId.value) { void check(); void refreshModels() }
  }, { immediate: true, flush: 'sync' })
  onMounted(() => window.addEventListener('focus', focus))
  onBeforeUnmount(() => { context++; request++; modelRequest++; window.removeEventListener('focus', focus) })
  return { result, applicationResult, applicationError, models, error, modelsError, checking, refreshing, applying, dialogOpen, check, refreshModels, apply, forSend }
}
