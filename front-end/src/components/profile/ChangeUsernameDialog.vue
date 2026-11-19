<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { normalizeUsername, usernameError } from '@/utils/username'

const props = defineProps<{
  visible: boolean
  username: string
  saving: boolean
  error: string
}>()
const emit = defineEmits<{
  confirm: [username: string]
  cancel: []
  edit: []
}>()
const { t } = useI18n()
const dialog = ref<HTMLDialogElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const draft = ref('')
const composing = ref(false)
const validationKey = computed(() => usernameError(draft.value))
const count = computed(() => Array.from(normalizeUsername(draft.value)).length)
const unchanged = computed(() => normalizeUsername(draft.value) === props.username)
let returnFocus: HTMLElement | null = null

watch(() => props.visible, async (visible) => {
  if (visible) {
    returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    draft.value = props.username
    composing.value = false
    await nextTick()
    if (!props.visible || !dialog.value) return
    dialog.value.showModal()
    input.value?.focus()
    input.value?.select()
  } else {
    dialog.value?.close()
    returnFocus?.focus()
  }
}, { immediate: true })

function cancel() {
  if (!props.saving) emit('cancel')
}

function confirm(event?: KeyboardEvent) {
  if (composing.value || event?.isComposing || event?.keyCode === 229) return
  if (props.saving || unchanged.value || validationKey.value) return
  emit('confirm', normalizeUsername(draft.value))
}

onBeforeUnmount(() => dialog.value?.close())
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="username-dialog" aria-labelledby="username-dialog-title" aria-describedby="username-dialog-description" @cancel.prevent="cancel">
      <div class="dialog-heading">
        <h3 id="username-dialog-title">{{ t('profile.changeUsername') }}</h3>
        <button class="close-btn" type="button" :aria-label="t('common.cancel')" :disabled="saving" @click="cancel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <p id="username-dialog-description" class="description">{{ t('profile.usernameDescription') }}</p>
      <div class="field-heading">
        <label for="profile-username">{{ t('profile.username') }}</label>
        <span id="username-count" class="count">{{ t('profile.usernameCount', { count }) }}</span>
      </div>
      <input
        id="profile-username"
        ref="input"
        v-model="draft"
        type="text"
        autocomplete="off"
        :disabled="saving"
        :aria-invalid="!!validationKey"
        aria-describedby="username-count username-error"
        @input="emit('edit')"
        @compositionstart="composing = true"
        @compositionend="composing = false"
        @keydown.enter.prevent="confirm($event)"
      />
      <p id="username-error" class="error" role="alert">{{ validationKey ? t(validationKey) : error }}</p>
      <div class="actions">
        <button type="button" :disabled="saving" @click="cancel">{{ t('common.cancel') }}</button>
        <button type="button" class="primary" :disabled="saving || unchanged || !!validationKey" @click="confirm()">
          {{ t(saving ? 'profile.usernameSaving' : 'profile.usernameSave') }}
        </button>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.username-dialog {
  box-sizing: border-box;
  margin: auto;
  width: min(440px, calc(100% - 32px));
  max-height: calc(100dvh - 32px);
  overflow: auto;
  padding: 28px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 18px;
  background: var(--app-color-bg-card, #fff);
  color: var(--app-color-text-primary, #1a1a1a);
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.14), 0 4px 16px rgba(15, 23, 42, 0.04);
}
.username-dialog::backdrop { background: rgba(20, 28, 40, 0.28); }
.dialog-heading, .field-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
h3 { margin: 0; font-size: 18px; font-weight: 600; }
.description { margin: 8px 0 24px; font-size: 13px; line-height: 1.7; color: #818791; }
.field-heading { margin-bottom: 9px; }
label { font-size: 13px; font-weight: 500; color: #4b5360; }
input {
  box-sizing: border-box;
  width: 100%;
  height: 44px;
  padding: 10px 14px;
  border: 1px solid #e0e4e9;
  border-radius: 10px;
  background: #fcfcfd;
  color: #303846;
  font: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}
input:hover:not(:disabled) { border-color: #c6cdd6; }
input:focus { border-color: #a6b7cb; background: #fff; box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12); }
input[aria-invalid="true"] { border-color: #e3a5a5; }
input[aria-invalid="true"]:focus { box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.06); }
button:focus-visible { outline: 2px solid #a6b7cb; outline-offset: 2px; }
.count { flex-shrink: 0; font-size: 12px; color: #9299a3; font-variant-numeric: tabular-nums; }
.error { min-height: 18px; margin: 8px 0 18px; color: #dc2626; font-size: 12px; overflow-wrap: anywhere; }
.actions { display: flex; justify-content: flex-end; gap: 10px; }
button { min-height: 38px; padding: 8px 20px; border: 1px solid #e4e7ec; border-radius: 8px; background: #fff; color: #596170; font: inherit; font-size: 13px; cursor: pointer; transition: background 0.15s ease; }
button:hover:not(:disabled) { background: #f5f6f8; }
button.primary { background: #303846; border-color: #303846; color: #fff; }
button.primary:hover:not(:disabled) { background: #1f2937; }
button.primary:disabled { background: #eff1f4; border-color: #eff1f4; color: #9ca3af; }
button:disabled, input:disabled { cursor: not-allowed; }
.close-btn { display: grid; place-items: center; min-height: 28px; width: 28px; padding: 0; margin-right: -6px; border: 0; color: #9299a3; background: transparent; }
@media (prefers-reduced-motion: reduce) { input, button { transition: none; } }
</style>
