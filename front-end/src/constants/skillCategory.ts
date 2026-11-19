export const SKILL_CATEGORY_LABEL_MAP: Record<string, string> = {
  '1': 'category.dataProcessing',
  '2': 'category.featureEngineering',
  '3': 'category.modelSelection',
  '4': 'category.hyperparameterTuning',
  '5': 'category.resultAnalysis',
  '6': 'category.other',
  dp: 'category.dataProcessing',
  fe: 'category.featureEngineering',
  ms: 'category.modelSelection',
  hd: 'category.hyperparameterTuning',
  ra: 'category.resultAnalysis',
}

export function getSkillCategoryLabel(categoryCode?: string): string {
  const key = String(categoryCode || '').trim().toLowerCase()
  if (!key) return 'category.uncategorized'
  return SKILL_CATEGORY_LABEL_MAP[key] || categoryCode || 'category.uncategorized'
}
