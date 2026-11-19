/**
 * 上传任务数据文件（需要 agentId 以便落库 agent_task_file）
 */
export interface UploadTaskFileResponse {
  /** MinIO 访问 URL，作为 RunTaskRequest.dataPath / agent-service origin_data_path */
  path: string
  /** 与 path 相同（后端兼容字段） */
  url?: string
  sessionId?: string | number
  taskId: string
  /** 占位用户消息 id（mixed），后续同轮上传与 run 时携带 */
  userMessageId?: number
  /** agent_message_attachment 主键，用于按 id 下载 */
  fileId?: number
}

/**
 * 平台智能体附件：与 agent-service 对话 RAG 可解析类型一致（见 dialog_rag._parse_file_text）
 */
export const TASK_DATA_FILE_ACCEPT =
  '.csv,.txt,.md,.markdown,.json,.jsonl,.pdf,.docx,.py,.log,' +
  'text/csv,application/csv,text/plain,text/markdown,text/x-markdown,' +
  'application/json,application/pdf,' +
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document,' +
  'text/x-python,application/x-python-code'

/**
 * 运行任务请求/响应（与后端、Python 协议对齐）
 */
export type PipelineMode = 'automl_task' | 'qa_dialog' | 'codegen_pipeline'

export interface RunTaskRequest {
  llmBindings?: import('@/api/llm').LlmBindings
  taskId: string
  sessionId?: number
  agentId: number
  userRequirement: string
  dataPath?: string
  /** 与上传返回的 userMessageId 一致，将需求写入同一条 mixed 消息 */
  draftUserMessageId?: number
  /** 执行模式 automl_task / 对话模式 qa_dialog / 代码生成模式 codegen_pipeline；不传时 Java 默认 qa_dialog */
  pipelineMode?: PipelineMode
}

export interface DeliverableItem {
  key: string
  name: string
  path?: string
}

import { i18n } from '@/i18n'

/** 任务失败时对用户展示的固定文案（不含内部 stage / pipeline 错误码） */
export const getUserFacingTaskFailureMessage = () =>
  i18n.global.t('workbench.messages.userFacingTaskFailure')

/** 与后端/Python 一致，字段使用 snake_case */
export interface RunTaskResponse {
  success: boolean
  message: string
  sessionId?: number
  runId?: string
  thread_id?: string
  pipeline_error?: string
  failure_class?: string
  user_actionable_hint?: string
  final_report_path?: string
  deployment_zip_path?: string
  deliverables: DeliverableItem[]
  interrupt_type?: string
  interrupt?: Record<string, unknown>
  result?: Record<string, unknown>
}

/**
 * /run/stream 与 /resume/stream SSE 事件定义
 */
export type TaskStreamEventType =
  | 'run_context'
  | 'pipeline_start'
  | 'node_start'
  | 'node_end'
  | 'node_progress'
  | 'llm_start'
  | 'llm_chunk'
  | 'deep_chunk'
  | 'message'
  | 'llm_end'
  | 'agent_status'
  | 'skill_start'
  | 'skill_end'
  | 'tool_start'
  | 'tool_end'
  | 'capability_start'
  | 'capability_end'
  | 'capability_invalid'
  | 'kb_retrieval_start'
  | 'kb_retrieval'
  | 'kb_retrieval_end'
  | 'kb_retrieval_skipped'
  | 'kb_context_attached'
  | 'codegen_profile_start'
  | 'codegen_profile_end'
  | 'codegen_stage_start'
  | 'codegen_stage_plan'
  | 'codegen_stage_skipped'
  | 'codegen_skill_read'
  | 'codegen_kb_retrieved'
  | 'codegen_stage_code_generated'
  | 'codegen_pipeline_compose_start'
  | 'codegen_pipeline_composed'
  | 'codegen_quality_check_start'
  | 'codegen_quality_check_completed'
  | 'codegen_quality_repair_start'
  | 'codegen_quality_repair_end'
  | 'codegen_validation_sample_start'
  | 'codegen_validation_sample_created'
  | 'codegen_pipeline_validation_start'
  | 'codegen_pipeline_validation_end'
  | 'codegen_pipeline_validation_final_failed'
  | 'codegen_pipeline_repair_start'
  | 'codegen_pipeline_repair_end'
  | 'codegen_llm_review_start'
  | 'codegen_llm_review_completed'
  | 'codegen_llm_review_repair_start'
  | 'codegen_llm_review_repair_end'
  | 'codegen_report_start'
  | 'codegen_report_generated'
  | 'codegen_zip_start'
  | 'codegen_zip_generated'
  | 'artifact_ready'
  | 'interrupt'
  | 'complete'
  | 'error'
  | 'heartbeat'

export interface TaskStreamEventMap {
  run_context: {
    event_id?: number | string
    ts?: string
    thread_id?: string
    task_id?: string
    run_id?: string
    session_id?: number
  }
  pipeline_start: {
    event_id?: number | string
    ts?: string
    thread_id?: string
    task_id?: string
    run_id?: string
    session_id?: number
  }
  node_start: {
    event_id?: number | string
    node?: string
    agent_name?: string
    success?: boolean
    thread_id?: string
    run_id?: string
    session_id?: number
  }
  node_progress: {
    event_id?: number | string
    node?: string
    success?: boolean
  }
  node_end: {
    event_id?: number | string
    node?: string
    agent_name?: string
    success?: boolean
    thread_id?: string
    run_id?: string
    session_id?: number
  }
  llm_start: {
    event_id?: number | string
    node?: string
    stage?: string
    model?: string
    iteration?: number
    next_action?: string
    kb_plan?: Record<string, unknown>
  }
  llm_chunk: {
    event_id?: number | string
    token?: string
    text?: string
    content?: string
    chunk?: string
    delta?: string
    message?: string
    role?: string
    visibility?: 'user' | 'internal'
    channel?: 'answer' | 'planner' | 'critic' | 'summary'
    task_id?: string
    node?: string
    thread_id?: string
    run_id?: string
    session_id?: number
  }
  deep_chunk: {
    event_id?: number | string
    token?: string
    text?: string
    content?: string
    chunk?: string
    delta?: string
    message?: string
    role?: string
    visibility?: 'user' | 'internal'
    channel?: 'answer' | 'planner' | 'critic' | 'summary'
    task_id?: string
    node?: string
    thread_id?: string
    run_id?: string
    session_id?: number
  }
  message: {
    event_id?: number | string
    token?: string
    text?: string
    content?: string
    chunk?: string
    delta?: string
    role?: string
    message?: string
    visibility?: 'user' | 'internal'
    channel?: 'answer' | 'planner' | 'critic' | 'summary'
    thread_id?: string
    run_id?: string
    session_id?: number
  }
  llm_end: {
    event_id?: number | string
    node?: string
  }
  agent_status: {
    event_id?: number | string
    task_id?: string
    thread_id?: string
    run_id?: string
    session_id?: number
    node?: string
    phase?: string
    status?: string
    status_label?: string
    message?: string
    doc_count?: number
  }
  skill_start: {
    event_id?: number | string
    stage?: string
    skill_id?: number
    skill_name?: string
  }
  skill_end: {
    event_id?: number | string
    stage?: string
    skill_id?: number
    skill_name?: string
    status?: string
    duration_ms?: number
    error_message?: string
  }
  tool_start: {
    event_id?: number | string
    stage?: string
    tool_id?: number
    tool_name?: string
    runtime_type?: string
  }
  tool_end: {
    event_id?: number | string
    stage?: string
    tool_id?: number
    tool_name?: string
    runtime_type?: string
    status?: string
    duration_ms?: number
    error_message?: string
    error_code?: string
    error_phase?: string
    resolved_artifact_path?: string
    selection_trace?: Record<string, any>
  }
  capability_start: {
    event_id?: number | string
    task_id?: string
    thread_id?: string
    run_id?: string
    session_id?: number
    stage?: string
    node?: string
    capability_type?: 'skill' | 'tool' | 'kb' | string
    capability_id?: number
    capability_name?: string
    query?: string
  }
  capability_end: {
    event_id?: number | string
    task_id?: string
    thread_id?: string
    run_id?: string
    session_id?: number
    stage?: string
    node?: string
    capability_type?: 'skill' | 'tool' | 'kb' | string
    capability_id?: number
    capability_name?: string
    status?: string
    duration_ms?: number
    error_message?: string
    doc_count?: number
  }
  capability_invalid: {
    event_id?: number | string
    task_id?: string
    thread_id?: string
    run_id?: string
    session_id?: number
    stage?: string
    capability_type?: 'skill' | 'tool' | 'kb' | string
    capability_id?: number
    capability_name?: string
    error_message?: string
  }
  kb_retrieval: {
    event_id?: number | string
    kb_id?: number
    kb_name?: string
    query?: string
    status?: string
    doc_count?: number
  }
  kb_retrieval_start: {
    event_id?: number | string
    kb_id?: number
    kb_name?: string
    query?: string
  }
  kb_retrieval_end: {
    event_id?: number | string
    kb_id?: number
    kb_name?: string
    query?: string
    status?: string
    doc_count?: number
    latency_ms?: number
    error_message?: string
  }
  kb_retrieval_skipped: {
    event_id?: number | string
    query?: string
    reason?: string
    kb_count?: number
  }
  kb_context_attached: {
    event_id?: number | string
    stage?: string
    query?: string
    chars?: number
  }
  codegen_profile_start: {
    event_id?: number | string
    node?: string
    agent_name?: string
  }
  codegen_profile_end: {
    event_id?: number | string
    node?: string
    agent_name?: string
    dataset_profile?: Record<string, unknown>
  }
  codegen_stage_start: {
    event_id?: number | string
    node?: string
    stage?: string
  }
  codegen_stage_plan: {
    event_id?: number | string
    node?: string
    stage?: string
    mode?: string
    skill_names?: string[]
    need_kb?: boolean
  }
  codegen_stage_skipped: {
    event_id?: number | string
    node?: string
    stage?: string
    reason?: string
  }
  codegen_skill_read: {
    event_id?: number | string
    node?: string
    stage?: string
    skill_name?: string
    files?: string[]
    error?: string
  }
  codegen_kb_retrieved: {
    event_id?: number | string
    node?: string
    stage?: string
    kb_count?: number
  }
  codegen_stage_code_generated: {
    event_id?: number | string
    node?: string
    stage?: string
    selected_skill_names?: string[]
  }
  codegen_pipeline_compose_start: {
    event_id?: number | string
    node?: string
  }
  codegen_pipeline_composed: {
    event_id?: number | string
    node?: string
    path?: string
  }
  codegen_quality_check_start: {
    event_id?: number | string
    node?: string
    quality_gate?: string
  }
  codegen_quality_check_completed: {
    event_id?: number | string
    node?: string
    quality_gate?: string
    fatal_count?: number
    warning_count?: number
  }
  codegen_quality_repair_start: {
    event_id?: number | string
    node?: string
    quality_gate?: string
    findings?: unknown[]
  }
  codegen_quality_repair_end: {
    event_id?: number | string
    node?: string
    repaired?: boolean
    path?: string
    char_count?: number
  }
  codegen_validation_sample_start: {
    event_id?: number | string
    node?: string
  }
  codegen_validation_sample_created: {
    event_id?: number | string
    node?: string
    path?: string
    sample_rows?: number
    original_rows?: number
    strategy?: string
    target_col?: string | null
  }
  codegen_pipeline_validation_start: {
    event_id?: number | string
    node?: string
    attempt?: number
    repaired_code?: boolean
    function_name?: string
    requires_gpu?: boolean
    timeout_ms?: number
    sample_rows?: number
    target_col?: string | null
  }
  codegen_pipeline_validation_end: {
    event_id?: number | string
    node?: string
    attempt?: number
    status?: string
    duration_ms?: number
    error_code?: string
    error_kind?: string
    normalized_reason?: string
    error_phase?: string
    safe_summary?: string
    sandbox_metrics?: Record<string, unknown>
  }
  codegen_pipeline_validation_final_failed: {
    event_id?: number | string
    node?: string
    status?: string
    summary?: string
  }
  codegen_pipeline_repair_start: {
    event_id?: number | string
    node?: string
    attempt?: number
    reason?: string
  }
  codegen_pipeline_repair_end: {
    event_id?: number | string
    node?: string
    attempt?: number
    repaired?: boolean
    path?: string
    char_count?: number
  }
  codegen_llm_review_start: {
    event_id?: number | string
    node?: string
    model?: string
  }
  codegen_llm_review_completed: {
    event_id?: number | string
    node?: string
    model?: string
    status?: string
    verdict?: string
    fatal_count?: number
    warning_count?: number
  }
  codegen_llm_review_repair_start: {
    event_id?: number | string
    node?: string
    model?: string
    findings?: unknown[]
  }
  codegen_llm_review_repair_end: {
    event_id?: number | string
    node?: string
    model?: string
    repaired?: boolean
    path?: string
    char_count?: number
  }
  codegen_report_start: {
    event_id?: number | string
    node?: string
  }
  codegen_report_generated: {
    event_id?: number | string
    node?: string
    path?: string
    char_count?: number
  }
  codegen_zip_start: {
    event_id?: number | string
    node?: string
  }
  codegen_zip_generated: {
    event_id?: number | string
    node?: string
    path?: string
    files?: string[]
  }
  artifact_ready: {
    event_id?: number | string
    artifact_type?: string
    artifact_key?: string
    name?: string
    path?: string
  }
  interrupt: {
    event_id?: number | string
    thread_id?: string
    task_id?: string
    run_id?: string
    session_id?: number
    interrupt_type?: string
    interrupt?: Record<string, unknown>
  }
  complete: {
    event_id?: number | string
    thread_id?: string
    task_id?: string
    run_id?: string
    session_id?: number
    success?: boolean
    message?: string
    deliverables?: DeliverableItem[]
    pipeline_error?: string
    failure_class?: string
    user_actionable_hint?: string
    final_report_path?: string
    deployment_zip_path?: string
  }
  error: {
    event_id?: number | string
    thread_id?: string
    task_id?: string
    run_id?: string
    session_id?: number
    message?: string
    /** 内部诊断用，不应直接展示给用户 */
    pipeline_error?: string
    /** @deprecated 使用 message + pipeline_error，勿将 error 字段当作用户文案 */
    error?: string
    failure_class?: string
    user_actionable_hint?: string
  }
  heartbeat: {
    event_id?: number | string
    timestamp?: string
  }
}

export interface TaskStreamEvent<T extends TaskStreamEventType = TaskStreamEventType> {
  event: T
  id?: string
  data: TaskStreamEventMap[T]
}

export interface TaskStreamHandlers {
  onEvent?: <T extends TaskStreamEventType>(evt: TaskStreamEvent<T>) => void
  onError?: (error: Error) => void
  onDone?: () => void
  signal?: AbortSignal
}

export interface TaskStreamCompatOptions {
  onEvent?: <T extends TaskStreamEventType>(evt: TaskStreamEvent<T>) => void
  signal?: AbortSignal
}

/**
 * 进度事件 payload（Python 回调格式）
 */
export interface TaskProgressEvent {
  type: 'node_start' | 'node_end' | 'step' | 'phase'
  node?: string
  agent_name?: string
  success?: boolean
  step_number?: number
  stage?: string
  stage_goal?: string
  action_type?: string
  skill_name?: string
  skill_id?: number
  skill_version_id?: number
  skill_type?: string
  runtime_type?: string
  current_stage_goal?: string
  current_subgoal?: string
  next_action?: string
  skill_requirement?: string | Record<string, unknown>
  candidate_skills_summary?: string
  selected_skill_name?: string
  selected_skill_id?: number
  selected_skill_version_id?: number
  llm_decision_reason?: string
  evaluation_reason?: string
  uncertainty_score?: number
  stage_stop_reason?: string
  latest_stage_summary?: string
  phase_type?: string
  purpose?: string
  error_message?: string
}

/** 节点名 -> 前端步骤 id */
export const NODE_TO_STEP_ID: Record<string, string> = {
  run_dp_agent: 'data-processor',
  run_fe_agent: 'feature-engineer',
  run_ms_agent: 'model-selector',
  run_hd_agent: 'hyperparameter-optimizer',
  run_ra_agent: 'result-analyzer',
}

/**
 * 将节点名转为前端友好的中文描述（优先使用 SSE 返回的 agent_name，兜底映射）。
 * 子图节点按关键词模糊匹配。
 */
const NODE_FRIENDLY_NAMES: Record<string, string> = {
  truncate_requirement: 'workbench.nodes.truncateRequirement',
  get_data_info: 'workbench.nodes.getDataInfo',
  judge_task_type: 'workbench.nodes.judgeTaskType',
  confirm_target_column: 'workbench.nodes.confirmTargetColumn',
  confirm_scoring_metric: 'workbench.nodes.confirmScoringMetric',
  run_dp_agent: 'workbench.nodes.dataProcessing',
  run_fe_agent: 'workbench.nodes.featureEngineering',
  run_ms_agent: 'workbench.nodes.modelSelection',
  confirm_champion_model: 'workbench.nodes.confirmChampionModel',
  run_hd_agent: 'workbench.nodes.hyperparameterOptimization',
  run_ra_agent: 'workbench.nodes.resultAnalysis',
}

const SUBGRAPH_KEYWORD_NAMES: [string, string][] = [
  ['plan_', 'workbench.nodes.plan'],
  ['execute_', 'workbench.nodes.execute'],
  ['evaluate', 'workbench.nodes.evaluate'],
  ['dynamic_', 'workbench.nodes.dynamic'],
  ['review_', 'workbench.nodes.review'],
  ['decide', 'workbench.nodes.decide'],
  ['observe', 'workbench.nodes.observe'],
  ['resolve', 'workbench.nodes.resolve'],
  ['generate_system_report', 'workbench.nodes.generateSystemReport'],
]

export function getNodeFriendlyName(node: string, agentName?: string): string {
  if (agentName && agentName !== node) return agentName
  const labelKey = NODE_FRIENDLY_NAMES[node]
  if (labelKey) return i18n.global.t(labelKey)
  for (const [keyword, key] of SUBGRAPH_KEYWORD_NAMES) {
    if (node.includes(keyword)) return i18n.global.t(key)
  }
  return node
}

/** 历史任务列表 */
export interface TaskHistoryItem {
  sessionId: number
  taskId: string
  threadId?: string | null
  runId?: string | null
  sessionTitle: string
  sessionStatus?: string
  taskStatus: string
  lastMessageAt: string | null
  startedAt: string | null
  endedAt: string | null
}

/** 历史消息 */
export interface TaskMessageItem {
  id: number
  sessionId: number
  taskId: string
  role: string
  messageType: string
  content: string
  contentExtra: string | null
  sequenceNo: number
  createdAt: string
}

export interface TaskFileItem {
  id: number
  sessionId: number
  taskId: string
  messageId: number | null
  fileSource: string
  fileRole: string
  originFileName: string
  fileUrl: string | null
  fileExt: string | null
  fileSize: number
  status: string
  createdAt: string
}

/** 历史任务详情：消息与文件 */
export interface TaskHistoryDetail {
  task: TaskHistoryItem
  messages: TaskMessageItem[]
  files: TaskFileItem[]
}
