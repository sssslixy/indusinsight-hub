export interface ModelOption {
  value: string
  label: string
  provider: string
  description: string
}

export interface SkillItem {
  id: string
  name: string
  description: string
  icon: string
  category: string
  /** 与后端 PluginCategory 一致：1 数据处理 2 特征工程 3 模型选型 4 超参数搜索 5 结果分析 6 其他 */
  categoryId: number
  /** 用于选择浮层展示，可选 */
  authorName?: string
  favoriteCount?: number
  likeCount?: number
  viewCount?: number
  isHot?: boolean
  isLatest?: boolean
}

/** @deprecated 历史命名，后续统一使用 SkillItem */
export type PluginItem = SkillItem

export interface AgentConfig {
  id: string
  name: string
  model: string
  systemPrompt: string
  selectedSkills: string[]
  selectedTools: string[]
  selectedKbIds: string[]
  /** 已选技能展示信息缓存（用于后端真实技能 id 不在当前列表时仍可渲染） */
  selectedSkillMeta?: Record<string, { name: string; icon?: string }>
  selectedKbMeta?: Record<string, { name: string; icon?: string }>
  selectedToolMeta?: Record<string, { name: string; icon?: string }>
  /** @deprecated 后端无对应持久化字段，保存时固定为 false */
  isAutoGenerateSkill?: boolean
  lockSkillScope: boolean
  /** 是否允许在 Skill 无法覆盖需求时自主补充流程或临时代码 */
  allowSkillGapActions: boolean
  /** @deprecated 创建页已移除对应开关；保存时固定为 false */
  allowAutoGenerateTool?: boolean
  /** @deprecated 创建页已移除对应开关；保存时固定为 false */
  lockToolScope?: boolean

  /**
   * 兼容旧命名字段：
   * - selectedPlugins -> selectedSkills
   * - selectedPluginMeta -> selectedSkillMeta
   * - autoGeneratePlugin（已废弃）
   * - useOnlySelectedPlugins -> lockSkillScope
   */
  selectedPlugins?: string[]
  selectedPluginMeta?: Record<string, { name: string; icon?: string }>
  autoGeneratePlugin?: boolean
  useOnlySelectedPlugins?: boolean
}

export interface AgentDefinition {
  id: string
  name: string
  shortName: string
  icon: string
  defaultPlugins: string[]
}
