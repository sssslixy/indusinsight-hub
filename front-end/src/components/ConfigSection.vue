<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const configItems = computed(() => [
  {
    title: t('home.modelChoice'),
    description: t('home.modelChoiceDesc'),
    icon: '🤖'
  },
  {
    title: t('home.promptCustomization'),
    description: t('home.promptCustomizationDesc'),
    icon: '📝'
  },
  {
    title: t('home.skillReferenceTitle'),
    description: t('home.skillReferenceDesc'),
    icon: '🔌'
  },
  {
    title: t('home.knowledgeBinding'),
    description: t('home.knowledgeBindingDesc'),
    icon: '📚'
  }
])
</script>

<template>
  <section class="config-section">
    <div class="config-container">
      <div class="section-header">
        <span class="section-tag">{{ t('home.configTag') }}</span>
        <h2 class="section-title">{{ t('home.configTitle') }}</h2>
        <p class="section-description">
          {{ t('home.configDescription') }}
        </p>
      </div>
      <div class="config-layout">
        <!-- 前四个配置项 2x2 网格 -->
        <div class="config-grid">
          <div
            v-for="(item, index) in configItems"
            :key="index"
            class="config-card"
          >
            <div class="config-icon">{{ item.icon }}</div>
            <div class="config-content">
              <h3 class="config-title">{{ item.title }}</h3>
              <p class="config-description">{{ item.description }}</p>
            </div>
          </div>
        </div>

        <!-- 最后一个配置项作为横向总结卡片 -->
        <div class="config-summary-card">
          <div class="summary-icon">⚙️</div>
          <div class="summary-content">
            <h3 class="summary-title">{{ t('home.behaviorSettings') }}</h3>
            <p class="summary-description">
              <strong>{{ t('home.selectedSkillsOnly') }}</strong> {{ t('home.selectedSkillsOnlyDesc') }}
            </p>
            <p class="summary-description">
              <strong>{{ t('home.autonomousPlanning') }}</strong> {{ t('home.autonomousPlanningDesc') }}
            </p>
          </div>
          <div class="summary-badge">{{ t('home.behaviorBadge') }}</div>
        </div>

        <!-- 底部说明 -->
        <div class="config-note">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 4V8L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <span>{{ t('home.modelPrerequisite') }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.config-section {
  padding: 100px 0;
  background: #ffffff;
}

.config-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
}

.section-header {
  margin-bottom: 56px;
  max-width: 720px;
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
  margin: 0 0 16px;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.section-description {
  font-size: 16px;
  line-height: 1.6;
  color: #525252;
  margin: 0;
}

.config-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 前四个配置项网格 */
.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.config-card {
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 28px;
  display: flex;
  gap: 20px;
  transition: all 0.25s ease;
  min-height: 140px;
}

.config-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.config-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.config-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.config-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.config-description {
  font-size: 14px;
  line-height: 1.6;
  color: #525252;
  margin: 0;
}

/* 横向总结卡片 */
.config-summary-card {
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 28px;
  display: flex;
  gap: 20px;
  align-items: center;
  transition: all 0.25s ease;
}

.config-summary-card:hover {
  background: #ffffff;
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.summary-icon {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.summary-content {
  min-width: 0;
  flex: 1;
}

.summary-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.summary-description {
  font-size: 14px;
  line-height: 1.6;
  color: #525252;
  margin: 0;
}

.summary-description + .summary-description { margin-top: 10px; }

.summary-badge {
  font-size: 11px;
  font-weight: 500;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* 底部说明 */
.config-note {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 28px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  font-size: 14px;
  color: #525252;
}

.config-note svg {
  color: #737373;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .config-grid {
    grid-template-columns: 1fr;
  }

  .config-summary-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .summary-badge {
    align-self: flex-start;
  }
}

@media (max-width: 768px) {
  .config-section {
    padding: 80px 0;
  }

  .config-container {
    padding: 0 24px;
  }

  .section-header {
    margin-bottom: 40px;
  }

  .section-title {
    font-size: 26px;
  }

  .section-description {
    font-size: 15px;
  }

  .config-card {
    padding: 24px;
    gap: 16px;
    min-height: auto;
  }

  .config-icon {
    font-size: 28px;
  }

  .config-title {
    font-size: 16px;
  }

  .config-description {
    font-size: 13px;
  }

  .config-summary-card {
    padding: 24px;
    gap: 16px;
  }

  .summary-icon {
    font-size: 28px;
  }

  .summary-title {
    font-size: 16px;
  }

  .summary-description {
    font-size: 13px;
  }

  .config-note {
    padding: 16px 20px;
    font-size: 13px;
  }
}
</style>
