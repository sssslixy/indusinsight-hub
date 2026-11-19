<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { FavoriteKnowledgeBaseItem } from '@/api/myContent'

import kbIcon1 from '@/assets/icon/知识库图标1.png'
import kbIcon2 from '@/assets/icon/知识库图标2.png'
import kbIcon3 from '@/assets/icon/知识库图标3.png'
import kbIcon4 from '@/assets/icon/知识库图标4.png'

const props = defineProps<{ item: FavoriteKnowledgeBaseItem }>()
const emit = defineEmits<{ cancelFavorite: [id: number] }>()
const router = useRouter()
const { t } = useI18n()

const SYSTEM_ICON_MAP: Record<string, string> = {
  'system-1': kbIcon1,
  'system-2': kbIcon2,
  'system-3': kbIcon3,
  'system-4': kbIcon4,
}

const iconLoadFailed = ref(false)
watch(
  () => props.item.kbIcon,
  () => {
    iconLoadFailed.value = false
  },
)

const resolvedIconUrl = computed(() => {
  const value = props.item.kbIcon
  if (!value) return undefined
  if (value in SYSTEM_ICON_MAP) return SYSTEM_ICON_MAP[value]
  return value
})

const fmt = (n?: number | null) => {
  const value = n ?? 0
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(value)
}

const fmtDate = (value?: string | null) => (value ? value.slice(0, 10) : '--')

const goCommunity = () => {
  router.push('/community/knowledge')
}
</script>

<template>
  <div class="kb-fav-card">
    <div class="card-header">
      <div class="kb-icon">
        <img
          v-if="resolvedIconUrl && !iconLoadFailed"
          :src="resolvedIconUrl"
          alt=""
          class="icon-img"
          @error="iconLoadFailed = true"
        />
        <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 7.5C4 6.67 4.67 6 5.5 6h5c.83 0 1.5.67 1.5 1.5v10c0-.83-.67-1.5-1.5-1.5h-5C4.67 16 4 16.67 4 17.5v-10z"
            stroke="currentColor"
            stroke-width="1.6"
          />
        </svg>
      </div>
      <div class="kb-meta">
        <div class="name-row">
          <h3 class="kb-name" :title="item.kbName">{{ item.kbName }}</h3>
          <span class="tag">{{ item.statusLabel }}</span>
        </div>
        <div class="sub-row">
          <span class="author">@{{ item.ownerName || t('common.unknownAuthor') }}</span>
        </div>
      </div>
    </div>

    <p class="kb-desc">{{ item.kbDescription || t('common.noDescription') }}</p>

    <div class="card-stats">
      <span class="stat-item">{{ t('common.document') }} {{ item.documentCount }}</span>
      <span class="stat-item">{{ t('common.favorite') }} {{ fmt(item.favoriteCount) }}</span>
      <span class="stat-item">{{ t('common.update') }} {{ fmtDate(item.updatedAt) }}</span>
    </div>

    <div class="card-actions">
      <button type="button" class="detail-btn" @click="goCommunity">{{ t('common.browseInCommunity') }}</button>
      <button type="button" class="unfav-btn" @click="emit('cancelFavorite', item.id)">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M7 1.5L8.5 5.2L12.5 5.5L9.5 8.2L10.5 12L7 9.8L3.5 12L4.5 8.2L1.5 5.5L5.5 5.2Z"
            fill="#f59e0b"
          />
        </svg>
        {{ t('common.unfavorite') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.kb-fav-card {
  display: flex;
  flex-direction: column;
  padding: 24px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  transition: all 0.22s ease;
}
.kb-fav-card:hover {
  background: #fff;
  border-color: rgba(0, 0, 0, 0.13);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.07);
}
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 12px;
}
.kb-icon {
  width: 54px;
  height: 54px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #8a8a8a;
  flex-shrink: 0;
}
.icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.kb-meta {
  flex: 1;
  min-width: 0;
}
.name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.kb-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sub-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
}
.tag {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  box-sizing: border-box;
}
.author {
  color: #737373;
}
.kb-desc {
  margin: 0;
  min-height: 44px;
  font-size: 14px;
  line-height: 1.55;
  color: #525252;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
}
.stat-item {
  font-size: 13px;
  color: #737373;
}
.card-actions {
  margin-top: 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.detail-btn {
  flex: 1;
  min-width: 120px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  cursor: pointer;
}
.detail-btn:hover {
  border-color: #2d2d2d;
  color: #1a1a1a;
}
.unfav-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: rgba(245, 158, 11, 0.06);
  font-size: 13px;
  font-weight: 500;
  color: #b45309;
  cursor: pointer;
}
.unfav-btn:hover {
  background: rgba(245, 158, 11, 0.12);
}
</style>
