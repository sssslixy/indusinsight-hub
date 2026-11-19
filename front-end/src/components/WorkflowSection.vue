<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const steps = computed(() => [
  {
    number: '01',
    title: t('home.workflowPrepareTitle'),
    description: t('home.workflowPrepareDesc')
  },
  {
    number: '02',
    title: t('home.workflowConfigureTitle'),
    description: t('home.workflowConfigureDesc')
  },
  {
    number: '03',
    title: t('home.workflowRunTitle'),
    description: t('home.workflowRunDesc')
  },
  {
    number: '04',
    title: t('home.workflowResultTitle'),
    description: t('home.workflowResultDesc')
  }
])
</script>

<template>
  <section class="workflow-section">
    <div class="workflow-container">
      <div class="section-header">
        <span class="section-tag">{{ t('home.workflowTag') }}</span>
        <h2 class="section-title">{{ t('home.workflowTitle') }}</h2>
      </div>
      <div class="workflow-wrapper">
        <div class="workflow-steps">
          <div
            v-for="(step, index) in steps"
            :key="index"
            class="step-item"
          >
            <div class="step-number">{{ step.number }}</div>
            <div class="step-content">
              <h3 class="step-title">{{ step.title }}</h3>
              <p class="step-description">{{ step.description }}</p>
            </div>
            <div v-if="index < steps.length - 1" class="step-arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.workflow-section {
  padding: 100px 0;
  background: #ffffff;
}

.workflow-container {
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

.workflow-wrapper {
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  padding: 48px;
}

.workflow-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 32px;
  position: relative;
}

.step-item {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.step-number {
  font-size: 40px;
  font-weight: 600;
  color: #e5e5e5;
  line-height: 1;
  letter-spacing: -0.02em;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
}

.step-description {
  font-size: 14px;
  line-height: 1.6;
  color: #737373;
  margin: 0;
}

.step-arrow {
  position: absolute;
  top: 20px;
  right: -28px;
  color: #d4d4d4;
  display: flex;
  align-items: center;
  justify-content: center;
}

.step-item:last-child .step-arrow {
  display: none;
}

@media (max-width: 1024px) {
  .workflow-steps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 40px;
  }

  .step-item:nth-child(2) .step-arrow,
  .step-item:nth-child(4) .step-arrow {
    display: none;
  }
}

@media (max-width: 768px) {
  .workflow-section {
    padding: 80px 0;
  }

  .workflow-container {
    padding: 0 24px;
  }

  .section-header {
    margin-bottom: 40px;
  }

  .section-title {
    font-size: 26px;
  }

  .workflow-wrapper {
    padding: 32px 24px;
  }

  .workflow-steps {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .step-arrow {
    display: none;
  }

  .step-number {
    font-size: 32px;
  }

  .step-title {
    font-size: 17px;
  }
}
</style>
