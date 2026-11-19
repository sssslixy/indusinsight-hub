export const AGENT_CREATE_LLM_MODEL = 'deepseek-v4-pro'

export const AGENT_CREATE_LLM_MODELS = [
  AGENT_CREATE_LLM_MODEL,
  'deepseek-v4-flash',
  'qwen3-max',
  'qwen3.7-max',
  'kimi-k2.6',
  'zai-org/GLM-5.2',
  'glm-5.2',
] as const

export type AgentCreateLlmModel = (typeof AGENT_CREATE_LLM_MODELS)[number]

export function isAgentCreateLlmModel(value: string): value is AgentCreateLlmModel {
  return AGENT_CREATE_LLM_MODELS.includes(value as AgentCreateLlmModel)
}
