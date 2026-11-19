import type { SkillManifestFormState } from '@/types/skills/skillCreate'

export const DEFAULT_INPUT_SCHEMA_TEXT = `{
  "type": "object",
  "properties": {},
  "required": []
}`

export const DEFAULT_OUTPUT_SCHEMA_TEXT = `{
  "type": "object",
  "properties": {}
}`

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

export function createDefaultManifestFormState(): SkillManifestFormState {
  return {
    inputSchemaText: DEFAULT_INPUT_SCHEMA_TEXT,
    outputSchemaText: DEFAULT_OUTPUT_SCHEMA_TEXT,
  }
}

function tryParseJsonObject(raw: string, fallback: Record<string, unknown>): Record<string, unknown> {
  const t = (raw || '').trim()
  if (!t) return { ...fallback }
  try {
    const v = JSON.parse(t) as unknown
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) return v as Record<string, unknown>
  } catch {
    /* ignore */
  }
  return { ...fallback }
}

/** 请求 manifestJson：仅 input_schema / output_schema（与库 manifest_json 一致）。 */
export function buildSkillManifestSchemasOnly(manifest: SkillManifestFormState): Record<string, unknown> {
  const input_schema = tryParseJsonObject(manifest.inputSchemaText, {
    type: 'object',
    properties: {},
    required: [],
  })
  const output_schema = tryParseJsonObject(manifest.outputSchemaText, {
    type: 'object',
    properties: {},
  })
  return { input_schema, output_schema }
}

export function stringifyManifest(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2)
}

/** 详情回填：优先从 manifest.runtime 读取入口信息，回退主表列。 */
export function hydrateManifestFormFromJson(
  raw: string | null | undefined,
  defaults: SkillManifestFormState,
): SkillManifestFormState {
  if (!raw || !String(raw).trim()) return deepClone(defaults)
  try {
    const root = JSON.parse(String(raw)) as Record<string, unknown>
    const next = deepClone(defaults)

    const inSch = root.input_schema
    const outSch = root.output_schema
    if (inSch && typeof inSch === 'object') {
      next.inputSchemaText = JSON.stringify(inSch, null, 2)
    }
    if (outSch && typeof outSch === 'object') {
      next.outputSchemaText = JSON.stringify(outSch, null, 2)
    }

    return next
  } catch {
    return deepClone(defaults)
  }
}
