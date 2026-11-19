<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { AgentDefinition } from '@/types/modules/agentCreate'

export interface NavItem extends AgentDefinition {
  isConfigured: boolean
}

defineProps<{
  items: NavItem[]
  activeId: string
}>()

const emit = defineEmits<{ select: [id: string] }>()
const { t } = useI18n()
</script>

<template>
  <div class="workflow-nav">
    <div class="nav-head">
      <span class="nav-title">{{ t('agentCreate.page.workflowNavTitle') }}</span>
      <span class="nav-sub">{{ t('agentCreate.page.workflowNavSubtitle') }}</span>
    </div>
    <div class="nav-list">
      <button
        v-for="(item, index) in items"
        :key="item.id"
        class="nav-item"
        :class="{
          'nav-item--active': item.id === activeId,
          'nav-item--done': item.isConfigured && item.id !== activeId,
        }"
        type="button"
        @click="emit('select', item.id)"
      >
        <div class="item-body">
          <!-- 步骤圆圈 -->
          <div class="step-badge">
            <svg
              v-if="item.isConfigured && item.id !== activeId"
              width="11" height="11" viewBox="0 0 11 11" fill="none"
            >
              <path d="M2 5.5L4.5 8L9 3" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span v-else class="step-num">{{ index + 1 }}</span>
          </div>

          <!-- 文字区域 -->
          <div class="item-content">
            <div class="item-text">
              <span class="item-name">{{ t('agentCreate.page.agentNameSuffix', { name: item.shortName }) }}</span>
              <span
                class="item-status"
                :class="{
                  'item-status--active': item.id === activeId,
                  'item-status--done': item.isConfigured && item.id !== activeId,
                }"
              >
                {{
                  item.id === activeId
                    ? t('agentCreate.page.editingCurrent')
                    : item.isConfigured
                    ? t('agentCreate.page.configured')
                    : t('agentCreate.page.notConfigured')
                }}
              </span>
            </div>
          </div>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.workflow-nav {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.nav-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 4px 4px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
}
.nav-title { font-size: 15px; font-weight: 600; color: #111827; }
.nav-sub { font-size: 13px; color: #9ca3af; margin-top: 1px; }

.nav-list {
  display: flex;
  flex-direction: column;
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.nav-item {
  position: relative;
  background: none;
  border: 1px solid transparent;
  border-radius: 9px;
  display: block;
  padding: 2px 2px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: all 0.17s ease;
  margin-top: 0;
}
.nav-item + .nav-item {
  margin-top: 4px;
}
.nav-item:hover {
  background: rgba(0,0,0,0.025);
}
.nav-item--active {
  background: #f3f4f6;
  border-color: rgba(15, 23, 42, 0.2);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.04);
}
.nav-item--done .step-badge { background: rgba(16,185,129,0.12); color: #059669; }

.item-body {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 10px;
  border-radius: 9px;
  transition: background 0.17s ease;
}

.step-badge {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #6b7280;
  transition: all 0.17s ease;
}
.nav-item--active .step-badge {
  background: #111827;
  color: #ffffff;
}

.step-num {
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1;
}

.item-content {
  display: flex;
  align-items: center;
  gap: 7px;
  flex: 1;
  min-width: 0;
}

.item-icon {
  font-size: 15px;
  line-height: 1;
  flex-shrink: 0;
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-status {
  font-size: 13px;
  color: #9ca3af;
  white-space: nowrap;
}
.item-status--active { color: #111827; }
.item-status--done { color: #059669; font-weight: 500; }
</style>
