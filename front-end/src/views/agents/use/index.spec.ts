// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { shallowMount, flushPromises, type VueWrapper } from '@vue/test-utils'
import Workbench from './index.vue'
import InputBar from '@/components/agents/workbench/AgentInputBar.vue'
import Conversation from '@/components/agents/workbench/AgentConversationPanel.vue'
import { i18n } from '@/i18n'
import type { PipelineMode } from '@/api/task'

const mocks = vi.hoisted(() => ({ run: vi.fn(), resume: vi.fn(), preflight: vi.fn(), error: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '9' }, query: {} }) }))
vi.mock('@/stores/user', () => ({ useUserStore: () => ({ userInfo: { id: 2, username: 'user' } }) }))
vi.mock('@/api/agent', () => ({ getAgentDetail: async () => ({ data: { id: 9, authorId: 2, agentName: 'Agent', sourceType: 'platform', status: 2 } }) }))
vi.mock('element-plus', async original => ({ ...await original<typeof import('element-plus')>(), ElMessage: { error: mocks.error, info: vi.fn(), success: vi.fn() } }))
vi.mock('@/api/llm', async original => ({ ...await original<typeof import('@/api/llm')>(), preflightLlm: mocks.preflight, getAvailableModels: async () => ({ data: [] }) }))
vi.mock('@/api/task', async original => ({
  ...await original<typeof import('@/api/task')>(),
  runTaskStreamCompat: mocks.run, resumeTaskStreamCompat: mocks.resume,
  getTaskHistory: async () => ({ data: [] }), getTaskFiles: async () => ({ data: [] }),
}))

const ready = () => ({ data: { mode: 'owner', ready: true, locked: false, resumable: false, llmBindings: { assistant: '1' }, requirements: {}, issues: {} } })
let wrapper: VueWrapper
async function send(text: string, mode: PipelineMode = 'qa_dialog') {
  wrapper.findComponent(InputBar).vm.$emit('send', text, mode)
  await flushPromises()
}
beforeEach(async () => {
  vi.clearAllMocks()
  mocks.preflight.mockResolvedValue(ready())
  mocks.run.mockImplementation(async (request, options) => {
    const runId = `run-${mocks.run.mock.calls.length}`
    options.onEvent({ event: 'run_context', data: { thread_id: request.taskId, session_id: 7, run_id: runId } })
    const message = `answer:${request.userRequirement}`
    options.onEvent({ event: 'llm_chunk', data: { node: 'qa_dialog', token: message } })
    return { data: { success: true, message, sessionId: 7, runId, thread_id: request.taskId, deliverables: [] } }
  })
  wrapper = shallowMount(Workbench, { global: { plugins: [i18n] } })
  await flushPromises()
})
afterEach(() => wrapper?.unmount())

describe('conversation request routing', () => {
  it('sends three ordinary turns as new runs in the same conversation', async () => {
    for (const message of ['你好', '什么是 AUC', '它与准确率有什么区别']) await send(message)
    expect(mocks.error).not.toHaveBeenCalled()
    expect(mocks.run).toHaveBeenCalledTimes(3)
    expect(mocks.resume).not.toHaveBeenCalled()
    const requests = mocks.run.mock.calls.map(([request]) => request)
    expect(new Set(requests.map(request => request.taskId)).size).toBe(1)
    expect(requests.slice(1).map(request => request.sessionId)).toEqual([7, 7])
    expect(requests.map(request => request.userRequirement)).toEqual(['你好', '什么是 AUC', '它与准确率有什么区别'])
    const replies = wrapper.findComponent(Conversation).props('messages').filter((m: { type: string }) => m.type === 'agent')
    expect(replies.map((m: { content: string }) => m.content)).toEqual(['answer:你好', 'answer:什么是 AUC', 'answer:它与准确率有什么区别'])
  })

  it('keeps professional requests on the run endpoint and permits later ordinary turns', async () => {
    await send('生成建模代码', 'codegen_pipeline')
    await send('解释结果')
    expect(mocks.run.mock.calls.map(([request]) => request.pipelineMode)).toEqual(['codegen_pipeline', 'qa_dialog'])
    expect(mocks.resume).not.toHaveBeenCalled()
  })

  it('resumes a real approval and starts a new run after it finishes', async () => {
    mocks.run.mockResolvedValueOnce({ data: { success: true, message: '请审批', thread_id: 'paused', sessionId: 7,
      runId: 'professional-run', interrupt_type: 'capability_approval', interrupt: { message: '请审批' }, deliverables: [] } })
    await send('运行任务', 'automl_task')
    mocks.preflight.mockResolvedValue({ data: { ...ready().data, locked: true, resumable: true, resumeThreadId: 'paused' } })
    mocks.resume.mockResolvedValueOnce({ data: { success: true, message: 'done', thread_id: 'paused', sessionId: 7,
      runId: 'professional-run', deployment_zip_path: 'deployment.zip', deliverables: [{ key: 'deployment_zip', name: 'deployment.zip' }] } })
    await send('approve', 'automl_task')
    expect(mocks.resume).toHaveBeenCalledWith('paused', 'approve', expect.any(Object))
    mocks.preflight.mockResolvedValue(ready())
    await send('解释刚才的结果')
    expect(mocks.run).toHaveBeenCalledTimes(2)
    expect(mocks.resume).toHaveBeenCalledTimes(1)
    expect(mocks.run.mock.calls[1]![0]).toMatchObject({ taskId: 'paused', sessionId: 7, userRequirement: '解释刚才的结果' })
  })

  it('does not submit a second request while the backend reports an executing run', async () => {
    mocks.preflight.mockResolvedValue({ data: { ...ready().data, locked: true, resumable: false } })
    await send('下一条问题')
    expect(mocks.run).not.toHaveBeenCalled()
    expect(mocks.resume).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalled()
  })
})
