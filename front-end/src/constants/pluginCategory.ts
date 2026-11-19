/**
 * Category constants aligned with backend PluginCategory / PluginFilterBar grouping.
 */
const PLUGIN_CATEGORY_BASE_OPTIONS = [
  { labelKey: 'category.skillType', categoryLabelKey: 'category.dataProcessing', value: '1' },
  { labelKey: 'category.skillType', categoryLabelKey: 'category.featureEngineering', value: '2' },
  { labelKey: 'category.skillType', categoryLabelKey: 'category.modelSelection', value: '3' },
  { labelKey: 'category.skillType', categoryLabelKey: 'category.hyperparameterTuning', value: '4' },
  { labelKey: 'category.skillType', categoryLabelKey: 'category.resultAnalysis', value: '5' },
  { labelKey: 'category.skillType', categoryLabelKey: 'category.other', value: '6' },
] as const

export type PluginCategoryOption = {
  labelKey: string
  categoryLabelKey: string
  value: string
}

export const PLUGIN_CATEGORY_OPTIONS_WITH_PLACEHOLDER: ReadonlyArray<PluginCategoryOption> = [
  { labelKey: 'create.pluginBasic.selectSkillCategory', categoryLabelKey: '', value: '' },
  ...PLUGIN_CATEGORY_BASE_OPTIONS,
]

export function getPluginCategoryLabelKey(categoryId: string): PluginCategoryOption {
  return PLUGIN_CATEGORY_BASE_OPTIONS.find((o) => o.value === categoryId) || PLUGIN_CATEGORY_BASE_OPTIONS[5]
}

export function getPluginCategoryLabel(categoryId: string): string {
  return getPluginCategoryLabelKey(categoryId).labelKey
}

export const AGENT_ID_TO_PLUGIN_CATEGORY_ID: Record<string, string> = {
  'data-processor': '1',
  'feature-engineer': '2',
  'model-selector': '3',
  'hyperparameter-optimizer': '4',
  'result-analyzer': '5',
}
