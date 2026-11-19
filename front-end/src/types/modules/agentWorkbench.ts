/** 步骤执行状态 */
export type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled'

export interface WorkbenchStep {
  id: string
  name: string
  shortName: string
  status: StepStatus
  /** 可选：失败时的简要原因 */
  errorMessage?: string
}

/** 会话消息类型 */
export type MessageType =
  | 'user'
  | 'agent'
  | 'system'
  | 'step'
  | 'file'
  | 'error'
  | 'status'
  | 'interrupt_action'

/** 人机中断内联按钮 */
export interface InterruptActionButton {
  label: string
  value: string
  type?: 'primary' | 'default' | 'danger'
}

export interface WorkbenchMessage {
  id: string
  type: MessageType
  content: string
  timestamp: string
  /** 关联步骤 id，仅 type 为 step 时使用 */
  stepId?: string
  /** 文件相关：文件名等，仅 type 为 file 时使用 */
  fileName?: string
  fileSize?: string
  /** 任务文件表主键，用于历史附件点击下载（仅服务端已落库时有值） */
  fileId?: number
  /** status 消息的运行状态：running / done / info */
  statusType?: 'running' | 'done' | 'info'
  /** status 消息关联的节点名 */
  nodeName?: string
  /** interrupt_action 的中断类型 */
  interruptType?: string
  /** interrupt_action 的中断载荷 */
  interruptData?: Record<string, unknown>
  /** interrupt_action 的操作按钮 */
  actions?: InterruptActionButton[]
  /** 系统产出文件（仅 agent），展示在气泡下方并可下载 */
  outputFiles?: { id: number; name: string }[]
}

/** 当前使用的智能体信息（顶部） */
export interface WorkbenchAgentInfo {
  id: number
  authorId?: number
  name: string
  description: string
  /** 与列表/详情一致：system-* 或图片 URL */
  agentIcon?: string
  versionNo: number
  status: 'published' | 'draft' | 'pending'
  statusLabel: string
  /** 智能体来源字段 */
  sourceType?: string
  /** 与后端 snake_case 对齐（详情接口可能只返回此字段） */
  source_type?: string
}

/** 结果摘要 */
export interface ResultSummary {
  conclusion: string
  recommendedModel: string
  keyFindings: string[]
  nextSteps: string[]
}

/** 文件产物项 */
export interface ArtifactFile {
  id: string
  name: string
  size: string
  createdAt: string
  stepId?: string
}

/** 图表/指标卡片 */
export interface ChartOrMetricCard {
  id: string
  title: string
  type: 'metric' | 'chart' | 'leaderboard'
  value?: string
  subValue?: string
  description?: string
}

/** 执行日志条目 */
export interface ExecutionLogEntry {
  id: string
  stepId: string
  stepName: string
  action: string
  stageGoal?: string
  actionType?: string
  skillName?: string
  skillId?: number
  skillVersionId?: number
  skillType?: string
  runtimeType?: string
  durationMs?: number
  status: 'success' | 'failed' | 'running'
  detail?: string
  timestamp: string
}

// 五步流程定义（与创建页一致，用于步骤导航）
export const WORKBENCH_STEP_IDS = [
  'data-processor',
  'feature-engineer',
  'model-selector',
  'hyperparameter-optimizer',
  'result-analyzer',
] as const

export const WORKBENCH_STEP_NAME_KEYS: Record<string, string> = {
  'data-processor': 'workbench.steps.dataProcessor',
  'feature-engineer': 'workbench.steps.featureEngineer',
  'model-selector': 'workbench.steps.modelSelector',
  'hyperparameter-optimizer': 'workbench.steps.hyperparameterOptimizer',
  'result-analyzer': 'workbench.steps.resultAnalyzer',
}

/**
 * 智能体运行时状态（便于 WebSocket/SSE/轮询接口对接）
 * 后端传入该结构，前端据此更新步骤高亮与状态展示
 */
export interface AgentRuntimeStatePayload {
  /** 当前正在运行的步骤 id */
  currentAgentId: string
  /** 各步骤状态映射，key 为步骤 id，value 为状态 */
  stepStatusMap: Record<string, StepStatus>
}
