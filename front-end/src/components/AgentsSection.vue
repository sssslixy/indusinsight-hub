<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const usageModes = computed(() => [
  {
    name: t('home.normalMode'),
    role: t('home.normalModeRole'),
    description: t('home.normalModeDesc'),
    badge: t('home.normalModeBadge')
  },
  {
    name: t('home.professionalMode'),
    role: t('home.professionalModeRole'),
    description: t('home.professionalModeDesc'),
    badge: t('home.professionalModeBadge')
  }
])

const analysisStages = computed(() => [
  {
    name: t('home.dataProcessing'),
    role: t('home.dataPreparation'),
    description: t('home.dataProcessingDesc')
  },
  {
    name: t('home.featureEngineering'),
    role: t('home.featureConstruction'),
    description: t('home.featureEngineeringDesc')
  },
  {
    name: t('home.modelSelection'),
    role: t('home.modelDecision'),
    description: t('home.modelSelectionDesc')
  },
  {
    name: t('home.hyperparameterOptimization'),
    role: t('home.parameterTuning'),
    description: t('home.hyperparameterOptimizationDesc')
  },
  {
    name: t('home.resultAnalysis'),
    role: t('home.resultInterpretation'),
    description: t('home.resultAnalysisDesc')
  }
])

const firstFourStages = computed(() => analysisStages.value.slice(0, 4))
const lastStage = computed(() => analysisStages.value[4])
</script>

<template>
  <section class="agents-section">
    <div class="agents-container">
      <div class="section-header">
        <span class="section-tag">{{ t('home.analysisTag') }}</span>
        <h2 class="section-title">{{ t('home.analysisTitle') }}</h2>
        <p class="section-description">
          {{ t('home.analysisDescription') }}
        </p>
      </div>
      <div class="agents-layout">
        <!-- 两种使用模式 -->
        <div class="usage-modes-wrapper">
          <div class="usage-modes-header">
            <span class="header-label">{{ t('home.modesHeader') }}</span>
            <span class="header-note">{{ t('home.modesNote') }}</span>
          </div>
          <div class="usage-modes-grid">
            <div
              v-for="(agent, index) in usageModes"
              :key="index"
              class="mode-card"
            >
              <div class="core-card-header">
                <div class="core-badge">{{ agent.badge }}</div>
                <span class="core-role-tag">{{ agent.role }}</span>
              </div>
              <h3 class="agent-name">{{ agent.name }}</h3>
              <p class="agent-description">{{ agent.description }}</p>
            </div>
          </div>
        </div>

        <!-- 协作指示器 -->
        <div class="collaboration-indicator">
          <div class="indicator-line"></div>
          <div class="indicator-label">{{ t('home.stagesDivider') }}</div>
          <div class="indicator-line"></div>
        </div>

        <!-- 五个可配置分析阶段 -->
        <div class="analysis-stages-wrapper">
          <div class="analysis-stages-header">
            <span class="header-label">{{ t('home.stagesHeader') }}</span>
            <span class="header-note">{{ t('home.stagesNote') }}</span>
          </div>
          <div class="analysis-stages-grid">
            <!-- 前四个阶段 2x2 网格 -->
            <div
              v-for="(agent, index) in firstFourStages"
              :key="index"
              class="agent-card"
            >
              <div class="agent-header">
                <h3 class="agent-name">{{ agent.name }}</h3>
                <span class="agent-role">{{ agent.role }}</span>
              </div>
              <p class="agent-description">{{ agent.description }}</p>
              <div class="config-indicator">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ t('home.stageConfigHint') }}</span>
              </div>
            </div>

            <!-- 最后一个阶段占满整行 -->
            <div v-if="lastStage" class="agent-card agent-card-full">
              <div class="agent-header">
                <h3 class="agent-name">{{ lastStage.name }}</h3>
                <span class="agent-role">{{ lastStage.role }}</span>
              </div>
              <p class="agent-description">{{ lastStage.description }}</p>
              <div class="config-indicator">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1V13M1 7H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ t('home.stageConfigHint') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.agents-section {
  padding: 100px 0;
  background: #fafafa;
}

.agents-container {
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

.agents-layout {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* 使用模式区域 */
.usage-modes-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.usage-modes-header,
.analysis-stages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4px;
  gap: 8px 16px;
  flex-wrap: wrap;
}

.header-label {
  font-size: 13px;
  font-weight: 500;
  color: #525252;
  letter-spacing: -0.01em;
}

.header-note {
  font-size: 11px;
  font-weight: 500;
  color: #a3a3a3;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.usage-modes-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

/* 使用模式卡片 - 改为深灰而非纯黑 */
.mode-card {
  background: #2d2d2d;  /* 深灰而非纯黑 */
  border: 1px solid rgba(255, 255, 255, 0.1);  /* 添加细边框 */
  border-radius: 12px;
  padding: 32px;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.25s ease;
}

.mode-card:hover {
  background: #353535;  /* hover 时略微变亮 */
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 核心卡片头部 */
.core-card-header {
  flex-wrap: wrap;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.core-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.12);  /* 略微增加透明度 */
  border-radius: 4px;
  flex-shrink: 0;
}

/* 核心角色标签 */
.core-role-tag {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);  /* 提高对比度 */
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.mode-card .agent-name {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
  color: #ffffff;
}

.mode-card .agent-description {
  font-size: 15px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

/* 协作指示器 */
.collaboration-indicator {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 4px;
}

.indicator-line {
  flex: 1;
  height: 1px;
  background: rgba(0, 0, 0, 0.1);
}

.indicator-label {
  font-size: 12px;
  font-weight: 500;
  color: #a3a3a3;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-align: center;
}

/* 可配置分析阶段区域 */
.analysis-stages-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.analysis-stages-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.agent-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 28px;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  min-height: 180px;
}

.agent-card:hover {
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

/* 最后一个阶段占满整行 */
.agent-card-full {
  grid-column: 1 / -1;
}

.agent-header {
  flex-wrap: wrap;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 12px;
}

.agent-card .agent-name {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.01em;
  flex: 1;
}

.agent-role {
  font-size: 11px;
  font-weight: 500;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.agent-card .agent-description {
  font-size: 14px;
  line-height: 1.6;
  color: #525252;
  margin: 0 0 auto;
  flex: 1;
}

.config-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #737373;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  margin-top: 16px;
}

.config-indicator svg {
  color: #a3a3a3;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .usage-modes-grid {
    grid-template-columns: 1fr;
  }

  .analysis-stages-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .agents-section {
    padding: 80px 0;
  }

  .agents-container {
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

  .agents-layout {
    gap: 24px;
  }

  .usage-modes-wrapper,
  .analysis-stages-wrapper {
    gap: 12px;
  }

  .mode-card {
    padding: 24px;
  }

  .mode-card .agent-name {
    font-size: 18px;
  }

  .collaboration-indicator {
    padding: 0;
  }

  .agent-card {
    padding: 24px;
    min-height: auto;
  }

  .agent-card .agent-name {
    font-size: 16px;
  }
}
</style>
