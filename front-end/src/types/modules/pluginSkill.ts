/** 与库表 skill.skill_type 及创建页提交 __skillMeta.skillType 对齐 */
export const SKILL_TYPE_VALUES = ['code', 'api', 'workflow', 'kb'] as const
export type SkillType = (typeof SKILL_TYPE_VALUES)[number]

export const SKILL_TYPE_OPTIONS: { value: SkillType; labelKey: string }[] = [
  { value: 'code', labelKey: 'create.pluginBasic.skillTypeCode' },
  { value: 'api', labelKey: 'create.pluginBasic.skillTypeApi' },
  { value: 'workflow', labelKey: 'create.pluginBasic.skillTypeWorkflow' },
  { value: 'kb', labelKey: 'create.pluginBasic.skillTypeKb' },
]

export interface SkillBasicInfo {
  name: string
  description: string
  icon: string
  categoryId: string
  isPublic: boolean
  skillType: SkillType
}

/** @deprecated 历史命名，后续统一使用 SkillBasicInfo */
export type PluginBasicInfo = SkillBasicInfo
