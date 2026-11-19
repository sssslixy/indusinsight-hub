import type { SkillCategoryCode } from '@/constants/skillCategoryCodes'

/** 后端 skill.status 映射：draft=0, pending_review=1, published=2, disabled=3, validation_failed=4 */
export type SkillWorkflowStatus = 'draft' | 'pending_review' | 'published' | 'disabled' | 'validation_failed'

export interface SkillBasicFormState {
  name: string
  description: string
  categoryCode: SkillCategoryCode | ''
  isPublic: boolean
  /** PluginIconPicker：system-* 或上传后的 https URL */
  icon: string
}

export interface SkillArtifactFormState {
  skillFile: File | null
}

export interface SkillManifestFormState {
  inputSchemaText: string
  outputSchemaText: string
}

export type SkillSaveIntent = 'draft' | 'publish'
