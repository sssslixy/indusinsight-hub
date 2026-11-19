<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PluginItem } from '@/types/modules/agentCreate'

const props = withDefaults(
  defineProps<{
    modelValue: string[]
    plugins: PluginItem[]
    /** 已选技能展示信息缓存（后端真实插件） */
    metaMap?: Record<string, { name: string; icon?: string }>
    /** 列表上方标题，默认「技能选择」 */
    selectorTitle?: string
    /** 空状态与添加按钮文案中的资源名，如「技能」「工具」「知识库」 */
    emptyResourceLabel?: string
    /**
     * 内置图标 id（system-1 …）→ 静态资源 URL。技能/工具用 PLUGIN_SYSTEM_ICON_MAP，知识库用 KNOWLEDGE_BASE_SYSTEM_ICON_MAP。
     */
    systemIconMap?: Record<string, string>
  }>(),
  { emptyResourceLabel: '' },
)

const { t } = useI18n()
const resourceLabel = computed(() => props.emptyResourceLabel || t('dashboard.entity.skill'))
const addButtonTitle = computed(() => t('agentCreate.config.addResource', { resource: resourceLabel.value }))

const emit = defineEmits<{
  'update:modelValue': [val: string[]]
  'open-selector': []
}>()

type RenderPlugin = { id: string; name: string; icon?: string }

const selectedPluginItems = computed<RenderPlugin[]>(() =>
  props.modelValue
    .map((id) => {
      const key = String(id)
      const meta = props.metaMap?.[key]
      if (meta?.name) return { id: key, name: meta.name, icon: meta.icon }
      const p = props.plugins.find((x) => x.id === key)
      if (p) return { id: p.id, name: p.name, icon: p.icon }
      // 未知 id：仍展示占位名称，避免列表空白但计数存在
      return { id: key, name: `#${key}`, icon: '' }
    }),
)

const removePlugin = (id: string) => {
  emit('update:modelValue', props.modelValue.filter((i) => i !== id))
}

/** 与技能选择浮层一致：仅判断是否有“有效 icon 字符串” */
const hasValidIcon = (icon: string | null | undefined) => {
  return icon != null && icon.trim() !== ''
}

/** 图片 URL / 路径：可 `<img src>` 加载 */
const isImageIcon = (icon: string | null | undefined) => {
  if (!hasValidIcon(icon)) return false
  const v = icon!.trim()
  // 兼容：
  // - 绝对 URL：http(s)
  // - data:image
  // - 站内相对路径：/icons/xx.png
  // - 相对文件：./a.png ../a.png
  // - 常见图片扩展名
  const looksLikePath =
    v.startsWith('/') || v.startsWith('./') || v.startsWith('../')
  const looksLikeUrl =
    /^https?:\/\//.test(v) || v.startsWith('data:image/')
  const looksLikeImageFile =
    /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(v)
  return looksLikeUrl || looksLikePath || looksLikeImageFile
}

/** 标签区：先解析 system-* 内置图，再尝试网络/路径图，否则作文本（emoji 等） */
const tagIconSrc = (icon: string | null | undefined): string | undefined => {
  if (!hasValidIcon(icon)) return undefined
  const v = icon!.trim()
  const mapped = props.systemIconMap?.[v]
  if (mapped) return mapped
  if (isImageIcon(icon)) return v
  return undefined
}

/** 图片图标加载失败回退（按 pluginId 记录） */
const imgErrorMap = ref<Record<string, boolean>>({})
const markImgError = (id: string) => {
  imgErrorMap.value = { ...imgErrorMap.value, [id]: true }
}
</script>

<template>
  <div class="plugin-selector">
    <div class="selector-header">
      <label class="field-label">{{ selectorTitle || t('agentCreate.config.skillSelector') }}</label>
      <div class="header-right">
        <span v-if="modelValue.length > 0" class="selected-count">{{ t('agentCreate.config.selectedCount', { count: modelValue.length }) }}</span>
        <button
          class="add-btn"
          type="button"
          :title="addButtonTitle"
          :aria-label="addButtonTitle"
          @click="emit('open-selector')"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5V11.5M1.5 6.5H11.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="selectedPluginItems.length > 0" class="selected-tags">
      <span v-for="p in selectedPluginItems" :key="p.id" class="plugin-tag">
        <span class="tag-icon">
          <img
            v-if="tagIconSrc(p.icon) && !imgErrorMap[p.id]"
            :src="tagIconSrc(p.icon)!"
            :alt="p.name"
            class="tag-icon-img"
            @error="markImgError(p.id)"
          />
          <span v-else-if="hasValidIcon(p.icon) && !tagIconSrc(p.icon)">{{ p.icon }}</span>
          <!-- 与插件选择浮层默认占位一致 -->
          <span v-else class="tag-icon-placeholder" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <rect x="10" y="14" width="12" height="10" rx="2" stroke="currentColor" stroke-width="2"/>
              <path d="M13 14V11C13 10.4477 13.4477 10 14 10H18C18.5523 10 19 10.4477 19 11V14" stroke="currentColor" stroke-width="2"/>
              <circle cx="14" cy="18" r="1.5" fill="currentColor"/>
              <circle cx="18" cy="18" r="1.5" fill="currentColor"/>
              <path d="M16 21V24" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M12 24H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </span>
        </span>
        <span class="tag-name" :title="p.name">{{ p.name }}</span>
        <button
          class="tag-remove"
          type="button"
          :aria-label="t('agentCreate.config.removeResource', { resource: resourceLabel })"
          @click="removePlugin(p.id)"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
          </svg>
        </button>
      </span>
    </div>

    <div v-else class="no-selection">
      {{ t('agentCreate.config.noResourceSelected', { resource: resourceLabel }) }}
      <button
        class="inline-add"
        type="button"
        :title="addButtonTitle"
        :aria-label="addButtonTitle"
        @click="emit('open-selector')"
      >
        +
      </button>
      {{ t('agentCreate.config.add') }}
    </div>
  </div>
</template>

<style scoped>
.plugin-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-label {
  font-size: 15px;
  font-weight: 500;
  color: #525252;
}

.selected-count {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}

.add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.13);
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.15s ease;
  font-family: inherit;
  flex-shrink: 0;
}
.add-btn:hover {
  background: #1e40af;
  border-color: #1e40af;
  color: #ffffff;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.plugin-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px 3px 6px;
  background: #f3f4f6;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
}
.tag-icon { font-size: 12px; line-height: 1; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; }
.tag-icon-img { width: 16px; height: 16px; border-radius: 4px; object-fit: cover; display: block; }
.tag-icon-placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 4px;
  color: #9ca3af;
  background: #f3f4f6;
  border: 1px solid rgba(0, 0, 0, 0.08);
}
.tag-name { font-weight: 500; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  background: none;
  border: none;
  cursor: pointer;
  color: #93c5fd;
  padding: 0;
  border-radius: 3px;
  transition: color 0.15s ease;
  font-family: inherit;
  margin-left: 1px;
}
.tag-remove:hover { color: #dc2626; }

.no-selection {
  font-size: 12px;
  color: #9ca3af;
  display: flex;
  align-items: center;
  gap: 4px;
}

.inline-add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  background: rgba(0, 0, 0, 0.07);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  line-height: 1;
  padding: 0;
  transition: all 0.15s ease;
  font-family: inherit;
}
.inline-add:hover { background: #1e40af; color: #ffffff; }
</style>
