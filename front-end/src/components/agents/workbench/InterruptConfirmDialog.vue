<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElDialog } from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  visible: boolean
  interruptType: string | null
  interrupt: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  confirm: [userChoice: string]
  cancel: []
}>()

const userChoice = ref('')
const { t } = useI18n()

watch(
  () => [props.visible, props.interruptType],
  () => {
    userChoice.value = ''
  }
)

const message = () => (props.interrupt?.message as string)

const options = () => (props.interrupt?.options as string[]) 
const llmGuess = () => props.interrupt?.llm_guess as string | undefined
const suggestedMetric = () => (props.interrupt?.suggested_metric as string)
const alternatives = () => (props.interrupt?.alternatives as Array<{ metric?: string; reason?: string }>) 
const leaderboardTop = () => (props.interrupt?.leaderboard_top as Array<{ model_name?: string; score?: number; std?: number }>) 
const topN = () => (props.interrupt?.top_n as number)
const decisionTrace = () => (props.interrupt?.decision_trace as Array<{ action?: string; reason?: string }>) 
const uncertaintyScore = () => {
  const raw = props.interrupt?.uncertainty_score
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string' && raw.trim()) {
    const n = Number(raw)
    return Number.isNaN(n) ? undefined : n
  }
  return undefined
}

function submit() {
  const choice = userChoice.value.trim()
  if (props.interruptType === 'target_column' && !choice) return
  emit('confirm', choice || 'yes')
}

function cancel() {
  emit('cancel')
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    :title="t('workbench.interrupt.title')"
    width="480px"
    :close-on-click-modal="false"
    @close="cancel"
  >
    <div class="interrupt-body">
      <p class="interrupt-message">{{ message() }}</p>

      <!-- 目标列确认 -->
      <template v-if="interruptType === 'target_column'">
        <div class="options-list">
          <label v-for="(opt, i) in options()" :key="i" class="option-row">
            <input v-model="userChoice" type="radio" :value="opt" />
            <span>{{ opt }}</span>
            <span v-if="opt === llmGuess()" class="tag">{{ t('workbench.interrupt.recommended') }}</span>
          </label>
        </div>
        <p class="hint">{{ t('workbench.interrupt.targetHint') }}</p>
      </template>

      <!-- 评估指标确认 -->
      <template v-else-if="interruptType === 'scoring_metric'">
        <p v-if="suggestedMetric()" class="suggested">
          {{ t('workbench.interrupt.preferredMetric', { metric: suggestedMetric() }) }}
        </p>
        <ul v-if="alternatives().length" class="alt-list">
          <li v-for="(a, i) in alternatives()" :key="i">{{ a.metric }}：{{ a.reason }}</li>
        </ul>
        <input v-model="userChoice" type="text" class="input-text" :placeholder="t('workbench.interrupt.scoringPlaceholder')" />
      </template>

      <!-- 模型冠军拍板 -->
      <template v-else-if="interruptType === 'champion_model'">
        <div class="leaderboard">
          <div
            v-for="(e, i) in leaderboardTop().slice(0, topN())"
            :key="i"
            class="leader-row"
          >
            <span>#{{ i + 1 }}</span>
            <span>{{ e.model_name }}</span>
            <span>score={{ e.score?.toFixed(4) }} ± {{ e.std?.toFixed(4) }}</span>
          </div>
        </div>
        <input v-model="userChoice" type="text" class="input-text" :placeholder="t('workbench.interrupt.championPlaceholder')" />
      </template>

      <template
        v-else-if="
          interruptType === 'strategy_review' ||
          interruptType === 'action_review' ||
          interruptType === 'allow_generate_skill' ||
          interruptType === 'ambiguous_skill_selection' ||
          interruptType === 'high_uncertainty_review'
        "
      >
        <p v-if="interruptType === 'allow_generate_skill'" class="suggested">
          {{ t('workbench.interrupt.allowGenerateSkillHint') }}
        </p>
        <p v-if="interruptType === 'high_uncertainty_review'" class="suggested">
          {{
            t('workbench.interrupt.highUncertaintyHint', {
              score: uncertaintyScore() == null ? '-' : uncertaintyScore()?.toFixed(2),
            })
          }}
        </p>
        <ul v-if="decisionTrace().length" class="alt-list">
          <li v-for="(d, i) in decisionTrace().slice(-5)" :key="i">{{ d.action }}：{{ d.reason }}</li>
        </ul>
        <input
          v-model="userChoice"
          type="text"
          class="input-text"
          :placeholder="
            interruptType === 'allow_generate_skill'
              ? t('workbench.interrupt.allowGenerateSkillPlaceholder')
              : interruptType === 'high_uncertainty_review'
                ? t('workbench.interrupt.highUncertaintyPlaceholder')
                : t('workbench.interrupt.strategyPlaceholder')
          "
        />
      </template>

      <!-- 施工图审批 -->
      <template v-else-if="interruptType === 'dp_plan_review' || interruptType === 'fe_plan_review'">
        <input v-model="userChoice" type="text" class="input-text" :placeholder="t('workbench.interrupt.planReviewPlaceholder')" />
      </template>

      <template v-else>
        <input v-model="userChoice" type="text" class="input-text" :placeholder="t('workbench.interrupt.defaultPlaceholder')" />
      </template>
    </div>

    <template #footer>
      <button type="button" class="btn btn-secondary" @click="cancel">{{ t('common.cancel') }}</button>
      <button type="button" class="btn btn-primary" @click="submit">{{ t('workbench.interrupt.confirm') }}</button>
    </template>
  </ElDialog>
</template>

<style scoped>
.interrupt-body {
  padding: 8px 0;
}
.interrupt-message {
  margin: 0 0 14px;
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
}
.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}
.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
}
.option-row input {
  margin: 0;
}
.tag {
  font-size: 11px;
  color: #059669;
  margin-left: 4px;
}
.hint,
.suggested {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 10px;
}
.alt-list {
  margin: 0 0 10px;
  padding-left: 18px;
  font-size: 13px;
  color: #374151;
}
.input-text {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-sizing: border-box;
}
.leaderboard {
  margin-bottom: 10px;
  font-size: 13px;
}
.leader-row {
  display: flex;
  gap: 12px;
  padding: 4px 0;
}
.btn {
  padding: 6px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid #d1d5db;
  background: #fff;
}
.btn-primary {
  background: #111827;
  color: #fff;
  border-color: #111827;
}
.btn-secondary {
  margin-right: 8px;
}
</style>
