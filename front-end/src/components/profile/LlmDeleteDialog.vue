<script setup lang="ts">
import { ElButton, ElDialog } from 'element-plus'
import { useI18n } from 'vue-i18n'

defineProps<{ visible: boolean; title: string; message: string; loading: boolean; error: string }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()
const { t } = useI18n()
</script>

<template>
  <ElDialog :model-value="visible" class="llm-delete-dialog" :title="title" width="min(400px, calc(100vw - 32px))"
    align-center append-to-body destroy-on-close :show-close="false" :close-on-click-modal="false"
    :close-on-press-escape="!loading" @update:model-value="value => { if (!value && !loading) emit('cancel') }">
    <template #header>
      <div class="llm-delete-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 9V13M12 17H12.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M10.29 3.86L1.82 18A2 2 0 003.54 21H20.46A2 2 0 0022.18 18L13.71 3.86A2 2 0 0010.29 3.86Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
        </svg>
      </div>
      <h3 class="llm-delete-title">{{ title }}</h3>
    </template>
    <p class="llm-delete-message">{{ message }}</p>
    <p v-if="error" class="llm-delete-error" role="alert">{{ error }}</p>
    <template #footer>
      <ElButton :disabled="loading" @click="emit('cancel')">{{ t('llm.cancel') }}</ElButton>
      <ElButton type="danger" :loading="loading" :disabled="loading" @click="emit('confirm')">{{ t('llm.delete') }}</ElButton>
    </template>
  </ElDialog>
</template>

<!-- Match the site's DeleteAgentDialog, retaining Element Plus focus trapping/restoration. -->
<style>
.llm-delete-dialog.el-dialog { padding: 28px; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.18); }
.llm-delete-dialog .el-dialog__header { padding: 0 0 8px; margin: 0; }
.llm-delete-dialog .llm-delete-icon { width: 48px; height: 48px; display: grid; place-items: center; margin-bottom: 20px; border-radius: 12px; background: rgba(239,68,68,.08); color: #dc2626; }
.llm-delete-dialog .llm-delete-title { font-size: 16px; font-weight: 600; line-height: 1.5; color: #1a1a1a; margin: 0; }
.llm-delete-dialog .llm-delete-message { margin: 0; color: #525252; font-size: 14px; line-height: 1.6; overflow-wrap: anywhere; }
.llm-delete-dialog .llm-delete-error { margin: 12px 0 0; color: #b91c1c; font-size: 13px; line-height: 1.6; }
.llm-delete-dialog .el-dialog__footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; padding-top: 20px; }
.llm-delete-dialog .el-button { height: 36px; margin: 0; padding: 0 18px; border-radius: 7px; font-family: inherit; font-size: 14px; font-weight: 500; }
.llm-delete-dialog .el-button--danger { --el-button-bg-color: #dc2626; --el-button-border-color: #dc2626; --el-button-hover-bg-color: #b91c1c; --el-button-hover-border-color: #b91c1c; --el-button-active-bg-color: #991b1b; --el-button-active-border-color: #991b1b; }
.llm-delete-dialog .el-button:focus-visible { outline: 2px solid #525252; outline-offset: 3px; }
</style>
