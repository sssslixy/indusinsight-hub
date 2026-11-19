<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElConfigProvider, ElDatePicker } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import { readDateRange, recentDates } from '@/views/evaluation/dateRange'

const props = defineProps<{ modelValue: [string, string] | null; invalid?: boolean }>()
const emit = defineEmits<{ change: [value: [string, string] | null] }>()
// The picker commits its internal model before emitting change. Keep this local
// so incomplete selections never reach the URL, and browser history can restore it.
const draft = ref<[string, string] | null>(props.modelValue)
watch(
  () => props.modelValue,
  (value) => {
    draft.value = value
  },
)
const { t, locale } = useI18n()
const shortcuts = computed(() =>
  [7, 30, 90, 365].map((days) => ({
    text: t(days === 365 ? 'evaluation.lastYear' : 'evaluation.lastDays', { days }),
    value: () => recentDates(days).map((date) => new Date(`${date}T00:00:00`)),
  })),
)
function change(value: unknown) {
  if (value == null) emit('change', null)
  else if (Array.isArray(value) && value.length === 2 && readDateRange(value[0], value[1]).valid)
    emit('change', value as [string, string])
}
</script>

<template>
  <section
    class="submission-date-filter"
    :class="{ 'is-invalid': invalid }"
    :aria-label="t('evaluation.dateFilter')"
  >
    <div class="date-filter-controls">
      <label for="evaluation-start-date">{{ t('evaluation.dateFilter') }}</label>
      <ElConfigProvider :locale="locale === 'zh-CN' ? zhCn : en">
        <ElDatePicker
          :id="['evaluation-start-date', 'evaluation-end-date']"
          class="submission-date-input"
          v-model="draft"
          type="daterange"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          :start-placeholder="t('evaluation.startDate')"
          :end-placeholder="t('evaluation.endDate')"
          :aria-label="t('evaluation.dateFilter')"
          range-separator="—"
          :shortcuts="shortcuts"
          popper-class="evaluation-date-popper"
          :popper-options="{
            modifiers: [
              { name: 'preventOverflow', options: { padding: 12, altAxis: true, tether: false } },
            ],
          }"
          unlink-panels
          clearable
          @change="change"
        />
      </ElConfigProvider>
      <button
        v-if="modelValue || invalid"
        type="button"
        class="date-filter-reset"
        @click="emit('change', null)"
      >
        {{ t('evaluation.resetDates') }}
      </button>
    </div>
    <p class="date-filter-hint" :role="invalid ? 'alert' : undefined">
      {{ t(invalid ? 'evaluation.invalidDates' : 'evaluation.dateFilterHint') }}
    </p>
  </section>
</template>

<style>
.submission-date-filter,
.evaluation-date-popper {
  --el-color-primary: #262626;
  --el-color-primary-light-3: #525252;
  --el-color-primary-light-5: #737373;
  --el-color-primary-light-7: #d4d4d4;
  --el-color-primary-light-8: #e5e5e5;
  --el-color-primary-light-9: #f5f5f5;
  --el-color-primary-dark-2: #171717;
  --el-border-radius-base: 8px;
  --el-font-size-base: 13px;
}
.submission-date-filter {
  padding: 0 24px 16px;
  flex-shrink: 0;
}
.date-filter-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 12px;
}
.date-filter-controls label {
  font-size: 13px;
  color: var(--app-color-text-secondary);
}
.submission-date-filter .submission-date-input {
  width: 300px;
  max-width: 100%;
  min-height: 36px;
  flex: 0 1 300px;
  box-shadow: 0 0 0 1px var(--app-color-border-soft) inset;
}
.submission-date-filter .el-range-editor.is-active {
  box-shadow: 0 0 0 1px #525252 inset;
}
.submission-date-filter .el-range-input {
  font-size: 13px;
}
.date-filter-reset {
  min-height: 36px;
  border: 0;
  padding: 0 4px;
  background: transparent;
  color: #525252;
  cursor: pointer;
  font-size: 13px;
}
.date-filter-reset:hover {
  color: #171717;
}
.date-filter-reset:focus-visible {
  outline: 2px solid #525252;
  outline-offset: 2px;
  border-radius: 4px;
}
.submission-date-filter .date-filter-hint {
  margin-top: 7px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--app-color-text-secondary);
}
.submission-date-filter.is-invalid .date-filter-hint {
  color: var(--el-color-danger, #b91c1c);
}
.evaluation-date-popper {
  max-width: calc(100vw - 24px);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
}
.evaluation-date-popper .el-picker-panel {
  max-height: calc(100dvh - 32px);
  overflow: auto;
}
.evaluation-date-popper .el-date-range-picker {
  --el-datepicker-inrange-bg-color: #f5f5f5;
  --el-datepicker-inrange-hover-bg-color: #e5e5e5;
  --el-datepicker-inner-border-color: #e5e5e5;
  --el-datepicker-border-color: #e5e5e5;
}
@media (max-width: 768px) {
  .submission-date-filter {
    padding-inline: 16px;
  }
  .date-filter-controls label {
    width: 100%;
  }
  .submission-date-filter .submission-date-input {
    min-height: 44px;
    flex: 1 1 240px;
  }
  .date-filter-reset {
    min-height: 44px;
  }
  .evaluation-date-popper .el-date-range-picker {
    width: min(360px, calc(100vw - 24px));
  }
  .evaluation-date-popper .el-picker-panel__sidebar {
    position: static;
    width: auto;
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
    display: flex;
    flex-wrap: wrap;
    padding: 4px 8px;
  }
  .evaluation-date-popper .el-picker-panel__shortcut {
    width: auto;
    min-height: 44px;
    padding-inline: 8px;
  }
  .evaluation-date-popper .el-picker-panel__sidebar + .el-picker-panel__body {
    margin-left: 0;
  }
  .evaluation-date-popper .el-picker-panel__body {
    min-width: 0;
  }
  .evaluation-date-popper .el-date-range-picker__content {
    display: block;
    float: none;
    width: 100%;
    padding: 12px;
  }
  .evaluation-date-popper .el-date-range-picker__content.is-left {
    border-right: 0;
    border-bottom: 1px solid var(--el-border-color-light);
  }
}
@media (prefers-reduced-motion: reduce) {
  .evaluation-date-popper {
    transition: none !important;
  }
}
</style>
