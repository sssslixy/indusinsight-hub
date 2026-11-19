<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const capabilities = computed(() => [
  {
    title: t('home.agentCommunity'),
    description: t('home.agentCommunityDesc'),
    tag: t('home.agentCommunityTag')
  },
  {
    title: t('home.skillCommunity'),
    description: t('home.skillCommunityDesc'),
    tag: t('home.skillCommunityTag')
  },
  {
    title: t('home.knowledgeCommunity'),
    description: t('home.knowledgeCommunityDesc'),
    tag: t('home.knowledgeCommunityTag')
  }
])
</script>

<template>
  <section class="capability-section">
    <div class="capability-container">
      <div class="section-header">
        <span class="section-tag">{{ t('home.resourcesTag') }}</span>
        <h2 class="section-title">{{ t('home.resourcesTitle') }}</h2>
      </div>
      <div class="capabilities-grid">
        <div
          v-for="(capability, index) in capabilities"
          :key="index"
          class="capability-card"
        >
          <div class="card-tag">{{ capability.tag }}</div>
          <h3 class="card-title">{{ capability.title }}</h3>
          <p class="card-description">{{ capability.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.capability-section {
  padding: 100px 0;
  background: #fafafa;
}

.capability-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
}

.section-header {
  margin-bottom: 56px;
  max-width: 640px;
}

.section-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 12px;
}

.section-title {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.capabilities-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.capability-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 32px;
  transition: all 0.25s ease;
}

.capability-card:hover {
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.card-tag {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 20px;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}

.card-description {
  font-size: 15px;
  line-height: 1.65;
  color: #525252;
  margin: 0;
}

@media (max-width: 1024px) {
  .capabilities-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@media (max-width: 768px) {
  .capability-section {
    padding: 80px 0;
  }

  .capability-container {
    padding: 0 24px;
  }

  .section-header {
    margin-bottom: 40px;
  }

  .section-title {
    font-size: 26px;
  }

  .capability-card {
    padding: 28px;
  }

  .card-title {
    font-size: 18px;
  }

  .card-description {
    font-size: 14px;
  }
}
</style>
