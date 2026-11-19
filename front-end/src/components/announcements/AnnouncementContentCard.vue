<script setup lang="ts">
import AnnouncementMetaBar from './AnnouncementMetaBar.vue'

interface Props {
  title: string
  content: string
  publishTime: string
  isLatest: boolean
  isImportant: boolean
}

defineProps<Props>()

// 将纯文本按换行符拆成段落，保留排版
const toParagraphs = (text: string): string[] => {
  if (!text) return []
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
}
</script>

<template>
  <div class="content-card">
    <!-- 标题 -->
    <h2 class="announcement-title">{{ title }}</h2>

    <!-- 元信息 -->
    <AnnouncementMetaBar
      :publish-time="publishTime"
      :is-latest="isLatest"
      :is-important="isImportant"
    />

    <!-- 分隔线 -->
    <div class="divider" />

    <!-- 正文 -->
    <div class="announcement-content">
      <p
        v-for="(para, index) in toParagraphs(content)"
        :key="index"
        class="content-paragraph"
      >
        {{ para }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.content-card {
  padding: 40px 48px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.announcement-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a1a;
  margin: 0;
  line-height: 1.35;
  letter-spacing: -0.02em;
}

.divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.07);
  margin: 4px 0;
}

.announcement-content {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.content-paragraph {
  font-size: 16px;
  color: #404040;
  margin: 0;
  line-height: 1.85;
  word-break: break-word;
}

@media (max-width: 768px) {
  .content-card {
    padding: 28px 24px;
    gap: 16px;
  }

  .announcement-title {
    font-size: 22px;
  }

  .content-paragraph {
    font-size: 15px;
  }
}
</style>
