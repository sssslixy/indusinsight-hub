<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { skillCategoryLabelKey } from '@/constants/skillCategoryCodes'
import type { SkillWorkflowStatus } from '@/types/skills/skillCreate'

defineProps<{
  name: string
  categoryCode: string
  workflowStatus: SkillWorkflowStatus
  isPublic: boolean
  requiresGpu: boolean
}>()

const { t } = useI18n()

const STATUS_LABEL_KEYS: Record<SkillWorkflowStatus, string> = {
  draft: 'create.status.draft',
  pending_review: 'create.status.pendingReview',
  published: 'create.status.published',
  disabled: 'create.status.disabled',
  validation_failed: 'create.status.validationFailed',
}
</script>

<template>
  <aside class="aside">
    <div class="card">
      <h3 class="t">{{ t('create.sidebar.summary') }}</h3>
      <dl class="dl">
        <div class="row">
          <dt>{{ t('create.common.name') }}</dt>
          <dd>{{ name || t('create.common.unnamed') }}</dd>
        </div>
        <div class="row">
          <dt>{{ t('create.common.category') }}</dt>
          <dd>{{ categoryCode ? t(skillCategoryLabelKey(categoryCode)) : t('create.sidebar.dash') }}</dd>
        </div>
        <div class="row">
          <dt>{{ t('create.sidebar.status') }}</dt>
          <dd>
            <span class="pill">{{ t(STATUS_LABEL_KEYS[workflowStatus]) }}</span>
          </dd>
        </div>
        <div class="row">
          <dt>{{ t('create.common.visibility') }}</dt>
          <dd>{{ isPublic ? t('create.common.yes') : t('create.common.no') }}</dd>
        </div>
        <div class="row">
          <dt>{{ t('create.sidebar.gpu') }}</dt>
          <dd>{{ requiresGpu ? t('create.common.required') : t('create.common.notRequired') }}</dd>
        </div>
      </dl>
    </div>
  </aside>
</template>

<style scoped>
.aside {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.card {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 16px 18px;
}
.t {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #111827;
}
.dl {
  margin: 0;
}
.row {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 8px;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
.row:last-child {
  border-bottom: none;
}
dt {
  color: #9ca3af;
  margin: 0;
}
dd {
  margin: 0;
  color: #374151;
  word-break: break-word;
}
.pill {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f3f4f6;
  font-size: 12px;
  color: #374151;
}
</style>
