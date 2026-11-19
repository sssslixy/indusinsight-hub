<script setup lang="ts">
interface StatItem {
  label: string
  value: number | string
  iconKey: 'total' | 'favoriteAgents' | 'favoritePlugins' | 'favoriteKbs' | 'recent7d'
  suffix?: string
}

const props = defineProps<{ stats: StatItem[] }>()

const fmt = (n: number | string) => {
  if (typeof n === 'string') return n
  return n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n)
}
</script>

<template>
  <div class="stats-row">
    <div v-for="item in stats" :key="item.label" class="stat-card">
      <div class="stat-icon-wrap">
        <!-- 收藏总数：星？-->
        <svg
          v-if="item.iconKey === 'total'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 4.5L13.9 8.3L18 8.9L15 11.7L15.7 15.8L12 13.8L8.3 15.8L9 11.7L6 8.9L10.1 8.3L12 4.5Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <!-- 收藏智能体：机器人ご閮?-->
        <svg
          v-else-if="item.iconKey === 'favoriteAgents'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="6"
            y="9"
            width="12"
            height="8"
            rx="2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M9 9V7.5C9 6.67 9.67 6 10.5 6H13.5C14.33 6 15 6.67 15 7.5V9"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="9.5" cy="12.5" r="0.9" fill="currentColor" />
          <circle cx="14.5" cy="12.5" r="0.9" fill="currentColor" />
          <path
            d="M10 14.5C10 14.5 11.2 15.5 12.5 15.5C13.8 15.5 15 14.5 15 14.5"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
          />
        </svg>
        <!-- 收藏插件：插件 -->
        <svg
          v-else-if="item.iconKey === 'favoritePlugins'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M10 4V8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M14 4V8"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M8 9H16C17.105 9 18 9.895 18 11V12.5C18 14.433 16.433 16 14.5 16H13V19H11V16H9.5C7.567 16 6 14.433 6 12.5V11C6 9.895 6.895 9 8 9Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <!-- 收藏知识库 -->
        <svg
          v-else-if="item.iconKey === 'favoriteKbs'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M6 4.5H18C18.83 4.5 19.5 5.17 19.5 6V19.5C19.5 20.33 18.83 21 18 21H6C5.17 21 4.5 20.33 4.5 19.5V6C4.5 5.17 5.17 4.5 6 4.5Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path d="M8 8H16M8 12H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
        <!-- 7天新增：日历 -->
        <svg
          v-else-if="item.iconKey === 'recent7d'"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="5"
            y="7"
            width="14"
            height="12"
            rx="2"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M9 5V7M15 5V7"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M9 11H15"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
          <path
            d="M11 15L13.5 12.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </div>
      <div class="stat-body">
        <span class="stat-value">{{ fmt(item.value) }}{{ item.suffix || '' }}</span>
        <span class="stat-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 14px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.07);
  border-radius: 12px;
  transition: box-shadow 0.2s ease;
}

.stat-card:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.stat-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #f1f5f9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon-wrap svg {
  display: block;
  width: 26px;
  height: 26px;
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.2;
}

.stat-label {
  font-size: 12px;
  color: #737373;
  white-space: nowrap;
}

@media (max-width: 1200px) {
  .stats-row { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 480px) {
  .stats-row { grid-template-columns: 1fr 1fr; }
}
</style>
