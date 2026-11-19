<script setup lang="ts">
import DashboardHeader from '@/components/dashboard/DashboardHeader.vue'
import {
  WelcomeBanner,
  QuickAccessGrid,
  AnnouncementSection,
  HotAgentSection,
  HotSkillSection,
  HotKnowledgeSection,
} from './dashboard/components'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="dashboard-page">
    <DashboardHeader />
    
    <main class="dashboard-main">
      <!-- ӭ -->
      <WelcomeBanner />
      
      <!-- 快捷功能入口区 -->
      <section class="section quick-access-section">
        <div class="container">
          <QuickAccessGrid />
        </div>
      </section>
      
      <!-- 主内容区 -->
      <section class="section main-content-section">
        <div class="container">
          <div class="content-layout">
            <AnnouncementSection />
            <HotAgentSection />
            <HotSkillSection />
            <HotKnowledgeSection />
          </div>
        </div>
      </section>
    </main>
    
    <AppFooter />
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: var(--app-color-bg-page);
  display: flex;
  flex-direction: column;
}

.dashboard-main {
  --dashboard-content-max-width: 1040px;
  flex: 1;
  padding-top: var(--app-page-top-desktop);
  background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
}

.section {
  padding: 48px 0;
}

.quick-access-section {
  padding-top: 0;
}

.main-content-section {
  background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.container {
  max-width: var(--dashboard-content-max-width);
  margin: 0 auto;
  padding: 0 48px;
}

.content-layout {
  display: flex;
  flex-direction: column;
  gap: 48px;
}

@media (max-width: 768px) {
  .dashboard-main {
    padding-top: var(--app-page-top-mobile);
  }
  
  .section {
    padding: 32px 0;
  }
  
  .container {
    padding: 0 24px;
  }
  
  .content-layout {
    gap: 32px;
  }
}
</style>
