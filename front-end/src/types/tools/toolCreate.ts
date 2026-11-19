import type { SkillCategoryCode } from '@/constants/skillCategoryCodes'
import type { SkillManifestFormState } from '@/types/skills/skillCreate'

/** 与 Skill manifest 同形：仅 input_schema / output_schema 写入 tool_metadata */
export type ToolManifestFormState = SkillManifestFormState

export interface ToolBasicFormState {
  name: string
  description: string
  categoryCode: SkillCategoryCode | ''
  isPublic: boolean
  /** PluginIconPicker 值：内置 key 或 http(s) 图标 URL */
  icon: string
}

export interface ToolArtifactFormState {
  pyFile: File | null
  entryFunction: string
}

export interface ToolRuntimeFormState {
  timeoutMs: number
  retryTimes: number
  requiresGpu: boolean
}

export type ToolSaveIntent = 'draft' | 'publish'
