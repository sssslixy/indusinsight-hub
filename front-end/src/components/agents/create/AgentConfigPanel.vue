<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AgentModelSelector from './AgentModelSelector.vue'
import AgentPluginSelector from './AgentPluginSelector.vue'
import PluginSelectDialog from './PluginSelectDialog.vue'
import KbSelectDialog from './KbSelectDialog.vue'
import { getPluginCategoryLabel, getPluginCategoryLabelKey, AGENT_ID_TO_PLUGIN_CATEGORY_ID } from '@/constants/pluginCategory'
import {
  KNOWLEDGE_BASE_SYSTEM_ICON_MAP,
  PLUGIN_SYSTEM_ICON_MAP,
} from '@/constants/systemAssetIcons'
import type { AgentConfig, ModelOption, SkillItem } from '@/types/modules/agentCreate'

const props = defineProps<{
  config: AgentConfig
  agentName: string
  agentId: string
  modelsLoading?: boolean
  modelsError?: string
  previousModel?: string
  modelOptions: ModelOption[]
  skillOptions: SkillItem[]
}>()

const emit = defineEmits<{ 'update:config': [val: AgentConfig]; 'refresh-models': [] }>()

const pluginSelectVisible = ref(false)
const kbSelectVisible = ref(false)

const pluginCategoryId = computed(() => AGENT_ID_TO_PLUGIN_CATEGORY_ID[props.agentId] || '1')
/** 技能选择弹窗：与 pluginCategory / 阶段推荐类别一致，文案为 skill */
const { t } = useI18n()
const pluginCategoryLabel = computed(() => {
  const labelKey = getPluginCategoryLabel(pluginCategoryId.value)
  const option = getPluginCategoryLabelKey(pluginCategoryId.value)
  return t(labelKey, { category: t(option.categoryLabelKey) })
})
const update = (field: keyof AgentConfig, value: unknown) => {
  emit('update:config', { ...props.config, [field]: value })
}

const onUseOnlySelectedChange = (ev: Event) => {
  const checked = (ev.target as HTMLInputElement).checked
  if (checked) {
    emit('update:config', {
      ...props.config,
      lockSkillScope: true,
      useOnlySelectedPlugins: true,
    })
    return
  }
  emit('update:config', { ...props.config, lockSkillScope: false, useOnlySelectedPlugins: false })
}

const handleOpenPluginSelect = () => {
  pluginSelectVisible.value = true
}

const handlePluginSelectConfirm = (ids: string[], meta: Record<string, { name: string; icon?: string }>) => {
  // 必须一次性更新：避免连续 update 基于旧 props.config 展开导致前一次修改被覆盖
  emit('update:config', {
    ...props.config,
    selectedSkills: ids,
    selectedPlugins: ids,
    selectedSkillMeta: { ...props.config.selectedSkillMeta, ...meta },
    selectedPluginMeta: { ...props.config.selectedPluginMeta, ...meta },
  })
  pluginSelectVisible.value = false
}

const handleKbSelectConfirm = (
  ids: string[],
  meta: Record<string, { name: string; icon?: string }>,
) => {
  emit('update:config', {
    ...props.config,
    selectedKbIds: ids,
    selectedKbMeta: { ...props.config.selectedKbMeta, ...meta },
  })
  kbSelectVisible.value = false
}

</script>

<template>
  <div class="config-panel">
    <div class="panel-body">
      <div class="section section--fixed">
        <AgentModelSelector
          :model-value="config.model"
          :options="modelOptions"
          :loading="modelsLoading" :error="modelsError" :previous-model="previousModel" @refresh="emit('refresh-models')"
          @update:model-value="update('model', $event)"
        />
      </div>

      <div class="divider" />

      <div class="section section--fixed">
        <AgentPluginSelector
          :model-value="config.selectedSkills || config.selectedPlugins || []"
          :meta-map="config.selectedSkillMeta || config.selectedPluginMeta"
          :plugins="skillOptions"
          :system-icon-map="PLUGIN_SYSTEM_ICON_MAP"
          @update:model-value="
            emit('update:config', {
              ...config,
              selectedSkills: $event,
              selectedPlugins: $event,
            })
          "
          @open-selector="handleOpenPluginSelect"
        />
        <PluginSelectDialog
          :visible="pluginSelectVisible"
          :agent-name="agentName"
          :category-label="pluginCategoryLabel"
          :category-id="pluginCategoryId"
          :selected-ids="config.selectedSkills || config.selectedPlugins || []"
          @update:visible="pluginSelectVisible = $event"
          @confirm="handlePluginSelectConfirm"
        />
      </div>

      <div class="divider" />

      <div class="section section--fixed">
        <AgentPluginSelector
          :selector-title="t('agentCreate.config.knowledgeBase')"
          :empty-resource-label="t('agentCreate.config.knowledgeBase')"
          :model-value="config.selectedKbIds || []"
          :meta-map="config.selectedKbMeta"
          :plugins="[]"
          :system-icon-map="KNOWLEDGE_BASE_SYSTEM_ICON_MAP"
          @update:model-value="update('selectedKbIds', $event)"
          @open-selector="kbSelectVisible = true"
        />
        <KbSelectDialog
          :visible="kbSelectVisible"
          :agent-name="agentName"
          :selected-ids="config.selectedKbIds || []"
          @update:visible="kbSelectVisible = $event"
          @confirm="handleKbSelectConfirm"
        />
      </div>

      <div class="divider" />

      <div class="section section--fixed section--behavior">
        <div class="section-title">{{ t('agentCreate.config.behaviorConfig') }}</div>
        <div class="switch-group">
          <div class="switch-row">
            <div class="switch-info">
              <span class="switch-label">{{ t('agentCreate.config.useOnlySelectedSkills') }}</span>
              <span class="switch-desc">{{ t('agentCreate.config.useOnlySelectedSkillsDesc') }}</span>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="config.lockSkillScope || config.useOnlySelectedPlugins"
                @change="onUseOnlySelectedChange"
              />
              <span class="toggle-slider" />
            </label>
          </div>

          <div class="switch-row">
            <div class="switch-info">
              <span class="switch-label">{{ t('agentCreate.config.allowAutonomousPlanning') }}</span>
              <span class="switch-desc">{{ t('agentCreate.config.allowAutonomousPlanningDesc') }}</span>
            </div>
            <label class="toggle">
              <input
                type="checkbox"
                :checked="config.allowSkillGapActions"
                @change="update('allowSkillGapActions', ($event.target as HTMLInputElement).checked)"
              />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.config-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  flex: 1;
}

.panel-body {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  padding: 0 28px;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.section {
  padding: 20px 0;
  flex-shrink: 0;
}

.divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

.section--behavior {
  padding-bottom: 22px;
}

.section-title {
  font-size: 15px;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 10px;
}

.switch-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.switch-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  background: #f9fafb;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 8px;
}

.switch-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.switch-label {
  font-size: 15px;
  font-weight: 500;
  color: #111827;
}

.switch-desc {
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.toggle {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  margin-top: 1px;
}
.toggle input { opacity: 0; width: 0; height: 0; }

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 22px;
  transition: 0.2s;
}
.toggle-slider::before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background: #ffffff;
  border-radius: 50%;
  transition: 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.toggle input:checked + .toggle-slider { background: #1e40af; }
.toggle input:checked + .toggle-slider::before { transform: translateX(18px); }
.toggle input:disabled + .toggle-slider {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>
