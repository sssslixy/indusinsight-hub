<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const isLoggedIn = computed(() => userStore.isLoggedIn)
const stageKeys = [
  'dataProcessing',
  'featureEngineering',
  'modelSelection',
  'hyperparameterOptimization',
  'resultAnalysis',
] as const
const stageIcons = ['🧹', '🔎', '🧩', '⚙️', '📊'] as const

const handlePrimary = () => {
  if (isLoggedIn.value) {
    router.push('/dashboard')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <section class="hero-section">
    <div class="hero-container">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            {{ t('profile.systemName') }}
          </h1>
          <p class="hero-subtitle">
            {{ t('home.heroSubtitle') }}
          </p>
          <div class="hero-actions">
            <button class="primary-btn" @click="handlePrimary">
              {{ isLoggedIn ? t('home.startUsing') : t('home.loginSystem') }}
            </button>
            <div class="hero-meta">
              <span class="meta-item">{{ t('home.stageConfiguration') }}</span>
              <span class="meta-divider">·</span>
              <span class="meta-item">{{ t('home.conversationalAnalysis') }}</span>
              <span class="meta-divider">·</span>
              <span class="meta-item">{{ t('home.resourceReuse') }}</span>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="system-diagram">
            <div class="diagram-header">
              <div class="header-label">{{ t('home.analysisFlow') }}</div>
            </div>
            <div class="flow-input">
              <span class="flow-icon" aria-hidden="true">📂</span>
              <span>{{ t('home.taskInput') }}</span>
            </div>
            <div class="flow-arrow" aria-hidden="true">↓</div>
            <ul class="resource-chips">
              <li><span aria-hidden="true">🤖</span>{{ t('home.personalModels') }}</li>
              <li><span aria-hidden="true">🔌</span>{{ t('home.skillReference') }}</li>
              <li><span aria-hidden="true">📚</span>{{ t('home.knowledgeBase') }}</li>
            </ul>
            <div class="flow-arrow" aria-hidden="true">↓</div>
            <ol class="stage-flow" :aria-label="t('home.stagesHeader')">
              <li v-for="(key, index) in stageKeys" :key="key" class="stage-node">
                <span class="stage-number" aria-hidden="true">0{{ index + 1 }}</span>
                <span class="stage-icon" aria-hidden="true">{{ stageIcons[index] }}</span>
                <span>{{ t(`home.${key}`) }}</span>
              </li>
            </ol>
            <div class="flow-arrow" aria-hidden="true">↓</div>
            <div class="flow-output">
              <span class="flow-icon" aria-hidden="true">📄</span>
              <span>{{ t('home.taskOutput') }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-section {
  padding: 140px 0 100px;
  background: #ffffff;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.hero-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
}

.hero-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 480px;
  gap: 40px;
  align-items: center;
}

.hero-text {
  width: 100%;
  min-width: 0;
}

.hero-title {
  font-size: 44px;
  white-space: nowrap;
  font-weight: 600;
  line-height: 1.2;
  color: #1a1a1a;
  letter-spacing: -0.02em;
  margin: 0 0 24px;
}

.hero-subtitle {
  font-size: 17px;
  line-height: 1.65;
  color: #525252;
  margin: 0 0 36px;
  font-weight: 400;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 按钮改为深灰而非纯黑 */
.primary-btn {
  padding: 15px 36px;
  background: #2d2d2d; /* 深灰而非纯黑 */
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
  letter-spacing: 0.01em;
}

.primary-btn:hover {
  background: #3a3a3a; /* hover 时略微变亮 */
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12); /* 阴影略微减轻 */
}

.primary-btn:active {
  transform: translateY(0);
}

.hero-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #737373;
  flex-wrap: wrap;
}

.meta-item {
  font-weight: 400;
}

.meta-divider {
  color: #d4d4d4;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.system-diagram {
  width: 100%;
  max-width: 480px;
  padding: 32px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.diagram-header {
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-label {
  font-size: 12px;
  font-weight: 500;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.flow-input, .flow-output {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 8px;
  text-align: center;
  font-size: 14px;
  line-height: 1.6;
}
.flow-input { background: #2d2d2d; color: #fff; }
.flow-output { background: #fff; color: #525252; border: 1px solid rgba(0,0,0,.08); }
.flow-arrow { color: #a3a3a3; text-align: center; font-size: 18px; line-height: 1; }
.resource-chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; list-style: none; padding: 0; margin: 0; }
.resource-chips li { padding: 5px 9px; border: 1px solid rgba(0,0,0,.08); border-radius: 6px; font-size: 12px; color: #737373; background: #fff; text-align: center; }
.stage-flow { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; list-style: none; padding: 0; margin: 0; }
.stage-node { display: flex; align-items: center; gap: 10px; padding: 14px 12px; border: 1px solid rgba(0,0,0,.08); border-radius: 8px; background: #fff; font-size: 13px; line-height: 1.5; color: #333; }
.stage-node:last-child { grid-column: 1 / -1; }
.stage-number { font-size: 11px; color: #a3a3a3; font-variant-numeric: tabular-nums; flex-shrink: 0; }
.flow-icon, .stage-icon { font-size: 20px; line-height: 1; flex-shrink: 0; }
.resource-chips li { display: flex; align-items: center; gap: 6px; }
.resource-chips li span { font-size: 15px; line-height: 1; }

@media (max-width: 1199px) {
  .hero-content {
    grid-template-columns: 1fr;
    gap: 60px;
  }

  .hero-text { max-width: 720px; }

  .system-diagram {
    max-width: 100%;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 100px 0 60px;
  }

  .hero-container {
    padding: 0 24px;
  }

  .hero-title { font-size: clamp(18px, 5.5vw, 32px); }

  .hero-subtitle {
    font-size: 16px;
  }

  .primary-btn {
    padding: 13px 32px;
    font-size: 15px;
  }

  .system-diagram {
    padding: 24px;
  }

  .stage-flow { grid-template-columns: minmax(0, 1fr); }
}
</style>
