<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FavoritePluginItem } from '@/api/myContent'
import { resolvePluginSystemIconSrc } from '@/constants/systemAssetIcons'

defineProps<{ plugins: FavoritePluginItem[] }>()
const emit = defineEmits<{ cancelFavorite: [id: number] }>()

const router = useRouter()
const { t } = useI18n()
const imgErrors = ref<Record<number, boolean>>({})

const handleImgError = (id: number) => {
  imgErrors.value[id] = true
}
const resolvedIcon = (icon: string) => resolvePluginSystemIconSrc(icon) ?? ''
const hasIcon = (icon: string) => {
  const resolved = resolvedIcon(icon)
  return resolved && resolved.trim() !== ''
}
const fmt = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n))
const handleViewDetail = (id: number) =>
  router.push({ path: '/skills/create', query: { id: String(id), from: 'community' } })
</script>

<template>
  <div class="card-grid">
    <div v-for="plugin in plugins" :key="plugin.id" class="plugin-card">
      <div class="card-header">
        <div class="plugin-icon">
          <img
            v-if="hasIcon(plugin.pluginIcon) && !imgErrors[plugin.id]"
            :src="resolvedIcon(plugin.pluginIcon)"
            :alt="plugin.pluginName"
            class="icon-img"
            @error="handleImgError(plugin.id)"
          />
          <div v-else class="icon-placeholder">
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <rect x="8" y="11" width="10" height="9" rx="2" stroke="currentColor" stroke-width="1.8"/>
              <path d="M11 11V9C11 8.44772 11.4477 8 12 8H14C14.5523 8 15 8.44772 15 9V11" stroke="currentColor" stroke-width="1.8"/>
              <circle cx="11.5" cy="15" r="1" fill="currentColor"/>
              <circle cx="14.5" cy="15" r="1" fill="currentColor"/>
              <path d="M13 17V19M11 19H15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
        <div class="plugin-meta">
          <div class="title-block">
            <div class="name-row">
              <h3 class="plugin-name">{{ plugin.pluginName }}</h3>
              <span v-if="plugin.isHot" class="badge badge-hot">{{ t('common.hot') }}</span>
              <span v-if="plugin.isLatest" class="badge badge-latest">{{ t('common.latest') }}</span>
            </div>
            <span class="category-tag">{{ plugin.pluginCategoryLabel }}</span>
          </div>
          <div class="sub-row">
            <span class="plugin-author">@{{ plugin.authorName }}</span>
          </div>
        </div>
      </div>

      <p class="plugin-description">{{ plugin.pluginDescription }}</p>

      <div class="card-stats">
        <span class="stat-item">{{ t('common.favorite') }} {{ fmt(plugin.favoriteCount) }}</span>
        <span class="stat-item">{{ t('common.views') }} {{ fmt(plugin.viewCount) }}</span>
      </div>

      <div class="card-actions">
        <button class="detail-btn" @click="handleViewDetail(plugin.id)">
          {{ t('common.viewDetails') }}
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M4.5 2.5L8.5 6.5L4.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="unfav-btn" @click="emit('cancelFavorite', plugin.id)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1.5L8.5 5.2L12.5 5.5L9.5 8.2L10.5 12L7 9.8L3.5 12L4.5 8.2L1.5 5.5L5.5 5.2Z" fill="#f59e0b" stroke-width="0"/>
          </svg>
          {{ t('common.unfavorite') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.plugin-card { display: flex; flex-direction: column; gap: 14px; padding: 24px; background: #fafafa; border: 1px solid rgba(0, 0, 0, 0.07); border-radius: 12px; transition: all 0.22s ease; }
.plugin-card:hover { background: #ffffff; border-color: rgba(0, 0, 0, 0.13); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07); transform: translateY(-2px); }
.card-header { display: flex; align-items: flex-start; gap: 14px; }
.plugin-icon { width: 54px; height: 54px; border-radius: 10px; background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.icon-img { width: 100%; height: 100%; object-fit: cover; }
.icon-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #a3a3a3; }
.plugin-meta { flex: 1; min-width: 0; }
.title-block { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin-bottom: 5px; min-width: 0; width: 100%; }
.name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; min-width: 0; width: 100%; }
.plugin-name { font-size: 17px; font-weight: 600; color: #1a1a1a; margin: 0; line-height: 1.3; min-width: 0; flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge { flex-shrink: 0; padding: 2px 7px; border-radius: 4px; font-size: 12px; font-weight: 600; letter-spacing: 0.02em; }
.badge-hot { background: rgba(249,115,22,0.1); color: #ea580c; }
.badge-latest { background: rgba(59,130,246,0.1); color: #3b82f6; }
.sub-row { display: flex; align-items: center; gap: 8px; }
.category-tag { flex-shrink: 0; align-self: flex-start; padding: 3px 8px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 4px; font-size: 12px; font-weight: 500; line-height: 1.25; box-sizing: border-box; max-width: 100%; }
.plugin-author { font-size: 13px; color: #737373; }
.plugin-description { font-size: 14px; color: #525252; margin: 0; line-height: 1.55; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-stats { display: flex; align-items: center; gap: 14px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.06); flex-wrap: wrap; }
.stat-item { font-size: 13px; color: #737373; }
.card-actions { display: flex; gap: 8px; }
.detail-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; padding: 9px 14px; background: #ffffff; border: 1px solid rgba(0, 0, 0, 0.12); border-radius: 7px; font-size: 13px; font-weight: 500; color: #525252; cursor: pointer; transition: all 0.2s ease; }
.detail-btn:hover, .plugin-card:hover .detail-btn { background: #2d2d2d; border-color: #2d2d2d; color: #ffffff; }
.unfav-btn { display: flex; align-items: center; justify-content: center; gap: 5px; padding: 9px 14px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); border-radius: 7px; font-size: 13px; font-weight: 500; color: #92400e; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
.unfav-btn:hover { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.4); }
@media (max-width: 768px) { .card-grid { grid-template-columns: 1fr; } }
</style>
