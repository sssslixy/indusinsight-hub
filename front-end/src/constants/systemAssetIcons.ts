/**
 * 后端/表单里用字符串 id（system-1 …）表示内置图标，需映射为打包后的静态资源 URL。
 * 插件/技能/tool 与知识库使用不同素材，不可混用。
 */
import pluginIcon1 from '@/assets/icon/插件图标1.png'
import pluginIcon2 from '@/assets/icon/插件图标2.png'
import pluginIcon3 from '@/assets/icon/插件图标3.png'
import pluginIcon4 from '@/assets/icon/插件图标4.png'

import kbIcon1 from '@/assets/icon/知识库图标1.png'
import kbIcon2 from '@/assets/icon/知识库图标2.png'
import kbIcon3 from '@/assets/icon/知识库图标3.png'
import kbIcon4 from '@/assets/icon/知识库图标4.png'

import agentIcon1 from '@/assets/icon/智能体图标1.png'
import agentIcon2 from '@/assets/icon/智能体图标2.png'
import agentIcon3 from '@/assets/icon/智能体图标3.png'
import agentIcon4 from '@/assets/icon/智能体图标4.png'

/** 与 PluginIconPicker / 技能、tool 创建页一致 */
export const PLUGIN_SYSTEM_ICON_MAP: Record<string, string> = {
  'system-1': pluginIcon1,
  'system-2': pluginIcon2,
  'system-3': pluginIcon3,
  'system-4': pluginIcon4,
}

/** 与 KnowledgeBaseCard / 知识库创建页一致 */
export const KNOWLEDGE_BASE_SYSTEM_ICON_MAP: Record<string, string> = {
  'system-1': kbIcon1,
  'system-2': kbIcon2,
  'system-3': kbIcon3,
  'system-4': kbIcon4,
}

/** 与智能体创建页 / AgentIcon 一致（智能体图标素材独立） */
export const AGENT_SYSTEM_ICON_MAP: Record<string, string> = {
  'system-1': agentIcon1,
  'system-2': agentIcon2,
  'system-3': agentIcon3,
  'system-4': agentIcon4,
}

/** 我的智能体 / 社区卡片 / AgentIcon：存库的 system-1…system-4 或 http(s) / 相对路径 */
export function resolveAgentSystemIconSrc(iconUrl: string | null | undefined): string | undefined {
  const v = iconUrl?.trim()
  if (!v) return undefined
  const m = v.match(/^system-([1-4])$/i)
  if (m) return AGENT_SYSTEM_ICON_MAP[`system-${m[1]}`]
  return v
}

/** Skill/tool 列表与卡片：将存库的 system-1…system-4（忽略大小写）或 http(s) 转为 <img src> 可用地址 */
export function resolvePluginSystemIconSrc(iconUrl: string | null | undefined): string | undefined {
  const v = iconUrl?.trim()
  if (!v) return undefined
  const m = v.match(/^system-([1-4])$/i)
  if (m) return PLUGIN_SYSTEM_ICON_MAP[`system-${m[1]}`]
  return v
}
