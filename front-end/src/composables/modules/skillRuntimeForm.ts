/**
 * 技能「运行配置」：各运行方式的独立状态、与 __runtimeBinding 的回填 / 组装。
 * runtimeConfig / authConfig 的归并与拆分集中在此，避免模板里散落 if-else。
 */

export const RUNTIME_TYPE_VALUES = ['python', 'http', 'workflow', 'kb'] as const
export type RuntimeTypeValue = (typeof RUNTIME_TYPE_VALUES)[number]

export const RUNTIME_TYPE_OPTIONS: { value: RuntimeTypeValue; labelKey: string }[] = [
  { value: 'python', labelKey: 'common.runtimePython' },
  { value: 'http', labelKey: 'common.runtimeHttp' },
  { value: 'workflow', labelKey: 'common.runtimeWorkflow' },
  { value: 'kb', labelKey: 'common.runtimeKnowledgeBase' },
]

export type HttpRequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
export type HttpAuthType = 'none' | 'api_key' | 'bearer' | 'custom'
export type WorkflowExecutionMode = 'sync' | 'async'
export type KbRetrievalMode = 'vector' | 'hybrid'

export const REQUEST_METHOD_OPTIONS: { value: HttpRequestMethod; label: string }[] = [
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
]

export const AUTH_TYPE_OPTIONS: { value: HttpAuthType; labelKey?: string; label?: string }[] = [
  { value: 'none', labelKey: 'common.noAuth' },
  { value: 'api_key', label: 'API Key' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'custom', labelKey: 'common.custom' },
]

export const EXECUTION_MODE_OPTIONS: { value: WorkflowExecutionMode; labelKey: string }[] = [
  { value: 'sync', labelKey: 'common.sync' },
  { value: 'async', labelKey: 'common.async' },
]

export const RETRIEVAL_MODE_OPTIONS: { value: KbRetrievalMode; labelKey: string }[] = [
  { value: 'vector', labelKey: 'common.vectorRetrieval' },
  { value: 'hybrid', labelKey: 'common.hybridRetrieval' },
]

export const defaultResourceConfigJson = '{\n  "cpu": "500m",\n  "memory": "512Mi"\n}'
export const defaultEnvConfigJson = '{\n  "PYTHONUNBUFFERED": "1"\n}'

export interface PythonRuntimeSlice {
  entrypoint: string
  resourceConfigText: string
  envConfigText: string
}

export interface HttpRuntimeSlice {
  serviceUrl: string
  requestMethod: HttpRequestMethod
  authType: HttpAuthType
  secretRef: string
  /** 可选：接口路径 / 路由补充 */
  entrypoint: string
  apiKeyLocation: 'header' | 'query'
  apiKeyParamName: string
  bearerHeaderName: string
  bearerPrefix: string
  authConfigText: string
}

export interface WorkflowRuntimeSlice {
  workflowKey: string
  workflowVersion: string
  /** 对应提交时顶层 entrypoint（入口节点） */
  entrypointNode: string
  executionMode: WorkflowExecutionMode
}

export interface KbRuntimeSlice {
  kbId: string
  topK: number
  enableRerank: boolean
  retrievalMode: KbRetrievalMode
  /** 表单字符串，提交时转数字或省略 */
  scoreThreshold: string
  namespace: string
  serviceUrl: string
}

export interface RuntimeCommonFields {
  runtimeType: RuntimeTypeValue
  timeoutMs: number
  retryTimes: number
}

export interface RuntimeSlices {
  python: PythonRuntimeSlice
  http: HttpRuntimeSlice
  workflow: WorkflowRuntimeSlice
  kb: KbRuntimeSlice
}

export function createDefaultRuntimeSlices(): RuntimeSlices {
  return {
    python: {
      entrypoint: 'run',
      resourceConfigText: defaultResourceConfigJson,
      envConfigText: defaultEnvConfigJson,
    },
    http: {
      serviceUrl: '',
      requestMethod: 'POST',
      authType: 'none',
      secretRef: '',
      entrypoint: '',
      apiKeyLocation: 'header',
      apiKeyParamName: 'X-API-Key',
      bearerHeaderName: 'Authorization',
      bearerPrefix: 'Bearer',
      authConfigText: '{\n}',
    },
    workflow: {
      workflowKey: '',
      workflowVersion: '',
      entrypointNode: '',
      executionMode: 'sync',
    },
    kb: {
      kbId: '',
      topK: 5,
      enableRerank: true,
      retrievalMode: 'hybrid',
      scoreThreshold: '',
      namespace: '',
      serviceUrl: '',
    },
  }
}

function parseRuntimeType(raw: unknown): RuntimeTypeValue {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (s === 'service') return 'http'
  if ((RUNTIME_TYPE_VALUES as readonly string[]).includes(s)) return s as RuntimeTypeValue
  return 'python'
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v)
}

/** 将 HTTP 鉴权 UI 合成为 authConfig 对象（custom 分支在外部直接 parse JSON） */
export function buildHttpAuthConfigFromSlice(http: HttpRuntimeSlice): Record<string, unknown> | null {
  if (http.authType === 'none') return null
  if (http.authType === 'api_key') {
    return {
      location: http.apiKeyLocation,
      paramName: http.apiKeyParamName.trim() || (http.apiKeyLocation === 'header' ? 'X-API-Key' : 'api_key'),
    }
  }
  if (http.authType === 'bearer') {
    return {
      headerName: http.bearerHeaderName.trim() || 'Authorization',
      prefix: http.bearerPrefix.trim() || 'Bearer',
    }
  }
  return null
}

/** 从已有 authConfig + authType 尽量还原 HTTP 子表单（无法识别时落到 custom） */
export function applyAuthConfigToHttpSlice(
  http: HttpRuntimeSlice,
  authTypeRaw: unknown,
  authConfigRaw: unknown,
): void {
  const at = typeof authTypeRaw === 'string' ? authTypeRaw.trim().toLowerCase() : ''
  if (at === 'api_key' || at === 'bearer' || at === 'custom' || at === 'none') {
    http.authType = at as HttpAuthType
  } else if (isPlainObject(authConfigRaw)) {
    if ('location' in authConfigRaw && 'paramName' in authConfigRaw) http.authType = 'api_key'
    else if ('headerName' in authConfigRaw || 'prefix' in authConfigRaw) http.authType = 'bearer'
    else http.authType = 'custom'
  } else {
    http.authType = 'none'
  }

  if (!isPlainObject(authConfigRaw)) {
    if (http.authType === 'custom' && typeof authConfigRaw === 'string' && authConfigRaw.trim()) {
      try {
        const p = JSON.parse(authConfigRaw)
        http.authConfigText = JSON.stringify(p, null, 2)
      } catch {
        http.authConfigText = authConfigRaw
      }
    }
    return
  }

  if (http.authType === 'api_key') {
    const loc = authConfigRaw.location === 'query' ? 'query' : 'header'
    http.apiKeyLocation = loc
    const pn = authConfigRaw.paramName
    http.apiKeyParamName = typeof pn === 'string' && pn.trim() ? pn : loc === 'header' ? 'X-API-Key' : 'api_key'
  } else if (http.authType === 'bearer') {
    const hn = authConfigRaw.headerName
    http.bearerHeaderName = typeof hn === 'string' && hn.trim() ? hn : 'Authorization'
    const px = authConfigRaw.prefix
    http.bearerPrefix = typeof px === 'string' ? px : 'Bearer'
  } else if (http.authType === 'custom') {
    http.authConfigText = JSON.stringify(authConfigRaw, null, 2)
  }
}

/**
 * 从后端 __runtimeBinding 风格的 meta 同步到 common + slices（编辑态回填）。
 */
export function hydrateRuntimeFromMeta(
  common: RuntimeCommonFields,
  slices: RuntimeSlices,
  meta: Record<string, unknown> | null | undefined,
): void {
  if (!meta || !isPlainObject(meta)) return

  common.runtimeType = parseRuntimeType(meta.runtimeType)
  const timeout = Number(meta.timeoutMs)
  common.timeoutMs = Number.isFinite(timeout) && timeout > 0 ? timeout : 300000
  const retry = Number(meta.retryTimes)
  common.retryTimes = Number.isFinite(retry) && retry >= 0 ? retry : 0

  const rt = common.runtimeType

  // —— Python ——（仅回填到 python 分片，避免其它运行方式的元数据串味）
  if (rt === 'python') {
    if (typeof meta.entrypoint === 'string') {
      slices.python.entrypoint = meta.entrypoint.trim() || 'run'
    }
    if (meta.resourceConfig != null && isPlainObject(meta.resourceConfig)) {
      slices.python.resourceConfigText = JSON.stringify(meta.resourceConfig, null, 2)
    }
    if (meta.envConfig != null && isPlainObject(meta.envConfig)) {
      slices.python.envConfigText = JSON.stringify(meta.envConfig, null, 2)
    }
  }

  if (rt === 'http') {
    if (typeof meta.serviceUrl === 'string') slices.http.serviceUrl = meta.serviceUrl
    const rm0 = meta.requestMethod
    if (typeof rm0 === 'string') {
      const u = rm0.toUpperCase()
      if (u === 'GET' || u === 'POST' || u === 'PUT' || u === 'DELETE') {
        slices.http.requestMethod = u as HttpRequestMethod
      }
    }
    if (typeof meta.entrypoint === 'string') {
      slices.http.entrypoint = meta.entrypoint
    }
    if (typeof meta.secretRef === 'string') slices.http.secretRef = meta.secretRef
    applyAuthConfigToHttpSlice(slices.http, meta.authType, meta.authConfig)
  }

  // —— workflow / kb：优先读 runtimeConfig 对象 ——
  let rc = meta.runtimeConfig
  if (typeof rc === 'string' && rc.trim()) {
    try {
      rc = JSON.parse(rc)
    } catch {
      rc = null
    }
  }

  if (rt === 'workflow') {
    if (typeof meta.entrypoint === 'string') {
      slices.workflow.entrypointNode = meta.entrypoint
    }
    if (isPlainObject(rc)) {
      const wk = rc.workflowKey
      if (typeof wk === 'string') slices.workflow.workflowKey = wk
      const wv = rc.workflowVersion
      if (typeof wv === 'string') slices.workflow.workflowVersion = wv
      const em = rc.executionMode
      if (em === 'async' || em === 'sync') slices.workflow.executionMode = em
    }
    const topWk = meta.workflowKey
    if (!slices.workflow.workflowKey.trim() && typeof topWk === 'string' && topWk.trim()) {
      slices.workflow.workflowKey = topWk.trim()
    }
  }

  if (rt === 'kb') {
    if (typeof meta.serviceUrl === 'string') slices.kb.serviceUrl = meta.serviceUrl
    if (isPlainObject(rc)) {
      const id = rc.kbId
      if (id != null) slices.kb.kbId = String(id)
      const tk = Number(rc.topK)
      if (Number.isFinite(tk) && tk > 0) slices.kb.topK = Math.floor(tk)
      if (typeof rc.enableRerank === 'boolean') slices.kb.enableRerank = rc.enableRerank
      const rm = rc.retrievalMode
      if (rm === 'vector' || rm === 'hybrid') slices.kb.retrievalMode = rm
      if (rc.scoreThreshold != null && rc.scoreThreshold !== '') {
        slices.kb.scoreThreshold = String(rc.scoreThreshold)
      }
      const ns = rc.namespace
      if (typeof ns === 'string') slices.kb.namespace = ns
    }
    const topKb = meta.kbId
    if (!slices.kb.kbId.trim() && topKb != null && String(topKb).trim()) {
      slices.kb.kbId = String(topKb).trim()
    }
  }
}

/** 提交层 runtimeBinding（写入 __runtimeBinding） */
export interface SkillRuntimeBindingPayload {
  runtimeType: string
  entrypoint?: string
  serviceUrl?: string
  requestMethod?: string
  timeoutMs?: number
  retryTimes?: number
  resourceConfig?: Record<string, unknown> | null
  envConfig?: Record<string, unknown> | null
  authType?: string
  secretRef?: string
  authConfig?: Record<string, unknown> | null
  runtimeConfig?: Record<string, unknown> | null
}

export function buildRuntimeBindingPayload(
  common: RuntimeCommonFields,
  slices: RuntimeSlices,
  parsed: {
    resourceConfigObj: Record<string, unknown> | null
    envConfigObj: Record<string, unknown> | null
    authConfigObj: Record<string, unknown> | null
  },
): SkillRuntimeBindingPayload {
  const rt = common.runtimeType
  const base: SkillRuntimeBindingPayload = {
    runtimeType: rt,
    timeoutMs: Number(common.timeoutMs),
    retryTimes: Number(common.retryTimes),
  }

  if (rt === 'python') {
    return {
      ...base,
      entrypoint: slices.python.entrypoint.trim(),
      resourceConfig: parsed.resourceConfigObj ?? {},
      envConfig: parsed.envConfigObj ?? {},
      runtimeConfig: null,
    }
  }

  if (rt === 'http') {
    const authConfig =
      slices.http.authType === 'custom'
        ? (parsed.authConfigObj ?? {})
        : slices.http.authType === 'none'
          ? null
          : buildHttpAuthConfigFromSlice(slices.http)
    return {
      ...base,
      serviceUrl: slices.http.serviceUrl.trim(),
      requestMethod: slices.http.requestMethod,
      authType: slices.http.authType,
      secretRef:
        slices.http.authType !== 'none' ? slices.http.secretRef.trim() : undefined,
      authConfig: authConfig ?? null,
      entrypoint: slices.http.entrypoint.trim() || undefined,
      runtimeConfig: null,
    }
  }

  if (rt === 'workflow') {
    const wfKey = slices.workflow.workflowKey.trim()
    const wfVer = slices.workflow.workflowVersion.trim()
    const epNode = slices.workflow.entrypointNode.trim()
    return {
      ...base,
      ...(epNode ? { entrypoint: epNode } : {}),
      runtimeConfig: {
        workflowKey: wfKey,
        ...(wfVer ? { workflowVersion: wfVer } : {}),
        executionMode: slices.workflow.executionMode,
      },
    }
  }

  if (rt === 'kb') {
    const rc: Record<string, unknown> = {
      kbId: slices.kb.kbId.trim(),
      topK: Number(slices.kb.topK),
      enableRerank: slices.kb.enableRerank,
      retrievalMode: slices.kb.retrievalMode,
    }
    const st = slices.kb.scoreThreshold.trim()
    if (st !== '') {
      const n = Number(st)
      if (Number.isFinite(n)) rc.scoreThreshold = n
    }
    const ns = slices.kb.namespace.trim()
    if (ns) rc.namespace = ns

    return {
      ...base,
      serviceUrl: slices.kb.serviceUrl.trim() || undefined,
      runtimeConfig: rc,
    }
  }

  return {
    ...base,
    entrypoint: slices.python.entrypoint.trim(),
    resourceConfig: parsed.resourceConfigObj,
    envConfig: parsed.envConfigObj,
    runtimeConfig: null,
  }
}
