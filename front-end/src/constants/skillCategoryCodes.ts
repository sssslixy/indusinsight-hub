export const SKILL_CATEGORY_CODES = [
  'data_processing',
  'feature_engineering',
  'model_selection',
  'hyperparameter_tuning',
  'result_analysis',
  'other',
] as const

export type SkillCategoryCode = (typeof SKILL_CATEGORY_CODES)[number]

export const SKILL_CATEGORY_LABEL_KEYS: Record<SkillCategoryCode, string> = {
  data_processing: 'category.dataProcessing',
  feature_engineering: 'category.featureEngineering',
  model_selection: 'category.modelSelection',
  hyperparameter_tuning: 'category.hyperparameterTuning',
  result_analysis: 'category.resultAnalysis',
  other: 'category.other',
}

export const SKILL_CATEGORY_OPTIONS: ReadonlyArray<{
  value: SkillCategoryCode
  label: string
  labelKey: string
}> = SKILL_CATEGORY_CODES.map((value) => ({
  value,
  label: value,
  labelKey: SKILL_CATEGORY_LABEL_KEYS[value],
}))

const CATEGORY_ALIASES: Record<string, SkillCategoryCode> = {
  dp: 'data_processing',
  fe: 'feature_engineering',
  ms: 'model_selection',
  hd: 'hyperparameter_tuning',
  ra: 'result_analysis',
  '1': 'data_processing',
  '2': 'feature_engineering',
  '3': 'model_selection',
  '4': 'hyperparameter_tuning',
  '5': 'result_analysis',
  '6': 'other',
}

export function normalizeSkillCategoryCode(code: string | undefined | null): SkillCategoryCode | undefined {
  const key = String(code ?? '').trim().toLowerCase()
  if (!key) return undefined
  if (SKILL_CATEGORY_CODES.includes(key as SkillCategoryCode)) return key as SkillCategoryCode
  return CATEGORY_ALIASES[key]
}

export function skillCategoryLabelKey(code: string | undefined | null): string {
  const normalized = normalizeSkillCategoryCode(code)
  return normalized ? SKILL_CATEGORY_LABEL_KEYS[normalized] : 'category.uncategorized'
}

export function skillCategoryLabel(code: string): string {
  return normalizeSkillCategoryCode(code) ?? code
}

export function categoryCodeCardLabel(code: string | undefined | null): string {
  const raw = String(code ?? '').trim()
  return normalizeSkillCategoryCode(raw) ?? (raw || 'uncategorized')
}

export function skillCategoryZhCardLabel(code: string | undefined | null): string {
  return skillCategoryLabelKey(code)
}

export function toolCategoryZhCardLabel(code: string | undefined | null): string {
  return skillCategoryLabelKey(code)
}
