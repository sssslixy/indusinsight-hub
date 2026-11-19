<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const currentYear = new Date().getFullYear()
const { t } = useI18n()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-container">
      <div class="footer-content">
        <p class="footer-text">
          {{ t('profile.systemName') }}
        </p>
        <p class="footer-copyright">
          © {{ currentYear }} {{ t('common.copyrightOwner') }}
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  padding: 56px 0;
  background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 48px;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-text {
  font-size: 14px;
  color: #737373;
  margin: 0;
  font-weight: 500;
}

.footer-copyright {
  font-size: 14px;
  color: #a3a3a3;
  margin: 0;
}

@media (max-width: 768px) {
  .app-footer {
    padding: 40px 0;
  }

  .footer-container {
    padding: 0 24px;
  }

  .footer-content {
    flex-direction: column;
    gap: 8px;
    text-align: center;
  }

  .footer-text,
  .footer-copyright {
    font-size: 13px;
  }
}
</style>
