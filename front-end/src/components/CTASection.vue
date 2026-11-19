<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const { t } = useI18n()
const isLoggedIn = computed(() => userStore.isLoggedIn)

const handleCta = () => {
  if (isLoggedIn.value) {
    router.push('/dashboard')
  } else {
    router.push('/login')
  }
}
</script>

<template>
  <section class="cta-section">
    <div class="cta-container">
      <div class="cta-wrapper">
        <div class="cta-content">
          <h2 class="cta-title">{{ t('home.ctaTitle') }}</h2>
          <p class="cta-description">
            {{ t('home.ctaDescription') }}
          </p>
          <button class="cta-btn" @click="handleCta">
            {{ isLoggedIn ? t('home.startUsing') : t('home.loginSystem') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cta-section {
  padding: 100px 0;
  background: #fafafa;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.cta-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
}

.cta-wrapper {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  padding: 64px 48px;
}

.cta-content {
  max-width: 1088px;
  margin: 0 auto;
  text-align: center;
}

.cta-title {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 16px;
  letter-spacing: -0.01em;
  line-height: 1.3;
}

.cta-description {
  font-size: 16px;
  line-height: 1.6;
  color: #737373;
  margin: 0 0 32px;
}

/* CTA 按钮改为深灰而非纯黑 */
.cta-btn {
  padding: 15px 40px;
  background: #2d2d2d;  /* 深灰而非纯黑 */
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.01em;
}

.cta-btn:hover {
  background: #3a3a3a;  /* hover 时略微变亮 */
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);  /* 阴影略微减轻 */
}

.cta-btn:active {
  transform: translateY(0);
}

@media (max-width: 768px) {
  .cta-section {
    padding: 80px 0;
  }

  .cta-container {
    padding: 0 24px;
  }

  .cta-wrapper {
    padding: 48px 32px;
  }

  .cta-title {
    font-size: 26px;
  }

  .cta-description {
    font-size: 15px;
  }

  .cta-btn {
    padding: 13px 36px;
    font-size: 15px;
  }
}
</style>
