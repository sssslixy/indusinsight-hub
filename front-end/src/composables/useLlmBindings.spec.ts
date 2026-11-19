// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { useLlmBindings } from './useLlmBindings'
import { preflightLlm, getAvailableModels, type LlmPreflight } from '@/api/llm'
vi.mock('@/api/llm', async original => ({ ...await original<typeof import('@/api/llm')>(), preflightLlm: vi.fn(), getAvailableModels: vi.fn() }))
const response = (data: LlmPreflight) => ({ data, code:0, message:'' })
const ready = (mode: 'owner' | 'public' = 'public', id = '1'): LlmPreflight => ({ mode, ready:true, locked:false, llmBindings:{dp:id}, requirements:{}, issues:{} })
const session = ref<string | null>(null), agent = ref('9'), thread = ref<string | null>(null)
let state: ReturnType<typeof useLlmBindings>
let wrapper: ReturnType<typeof mount>
async function setup() { wrapper = mount(defineComponent({ setup() { state = useLlmBindings(agent, session, thread, ref(true)); return () => null } })); await flushPromises() }
beforeEach(() => { vi.resetAllMocks(); session.value=null; agent.value='9'; thread.value=null; vi.mocked(getAvailableModels).mockResolvedValue({data:[],code:0,message:''}); vi.mocked(preflightLlm).mockResolvedValue(response(ready())) })
afterEach(() => wrapper?.unmount())
describe('runtime model authorization', () => {
  it('checks without mounting a picker and sends no own-agent overrides', async () => {
    vi.mocked(preflightLlm).mockResolvedValue(response(ready('owner'))); await setup()
    expect(await state.forSend()).toEqual({dp:'1'})
    expect(preflightLlm).toHaveBeenLastCalledWith('9',null,{},null,false)
    expect(state.dialogOpen.value).toBe(false)
  })
  it('opens a public dialog only on an unsuccessful send', async () => {
    vi.mocked(preflightLlm).mockResolvedValue(response({...ready(),ready:false,issues:{dp:{code:'missing'}}})); await setup()
    expect(state.dialogOpen.value).toBe(false)
    expect(await state.forSend()).toBeNull(); expect(state.dialogOpen.value).toBe(true)
  })
  it('never opens a replacement picker for invalid own models', async () => {
    vi.mocked(preflightLlm).mockResolvedValue(response({...ready('owner'),ready:false})); await setup()
    expect(await state.forSend()).toBeNull(); expect(state.dialogOpen.value).toBe(false)
  })
  it('discards stale results when switching session', async () => {
    let resolve!: (v: ReturnType<typeof response>) => void
    vi.mocked(preflightLlm).mockReturnValueOnce(new Promise(done => {resolve=done}))
    await setup(); session.value='7'; await flushPromises()
    resolve(response(ready('owner','old'))); await flushPromises()
    expect(state.result.value?.mode).toBe('public'); expect(state.result.value?.llmBindings.dp).toBe('1')
  })
  it('does not persist a new session and does persist an existing session', async () => {
    await setup(); await state.apply({dp:'2'})
    expect(preflightLlm).toHaveBeenLastCalledWith('9',null,{dp:'2'},null,false)
    session.value='7'; await flushPromises(); await state.apply({dp:'3'})
    expect(preflightLlm).toHaveBeenLastCalledWith('9','7',{dp:'3'},null,true)
  })
  it('failed applications and cancellation preserve the applied configuration', async () => {
    await setup(); state.dialogOpen.value=true; await flushPromises()
    vi.mocked(preflightLlm).mockResolvedValueOnce(response({...ready('public','2'),ready:false,issues:{dp:{code:'disabled'}}}))
    await state.apply({dp:'2'})
    expect(state.dialogOpen.value).toBe(true); expect(state.applicationResult.value?.issues.dp?.code).toBe('disabled')
    expect(state.result.value?.llmBindings.dp).toBe('1')
    state.dialogOpen.value=false; await flushPromises(); await state.forSend()
    expect(preflightLlm).toHaveBeenLastCalledWith('9',null,{dp:'1'},null,false)
  })
  it('does not close another session dialog when an old apply completes', async () => {
    await setup()
    let resolve!: (v: ReturnType<typeof response>) => void
    vi.mocked(preflightLlm).mockReturnValueOnce(new Promise(done => {resolve=done}))
    const pending = state.apply({dp:'2'}); session.value='8'; await flushPromises(); state.dialogOpen.value=true
    resolve(response(ready('public','2'))); await pending
    expect(state.dialogOpen.value).toBe(true);expect(state.result.value?.llmBindings.dp).toBe('1')
  })
  it('checks resume snapshots without resending replacement IDs', async () => {
    await setup(); thread.value='paused'; await flushPromises(); await state.forSend()
    expect(preflightLlm).toHaveBeenLastCalledWith('9',null,{},'paused',false)
  })
  it('blocks an executing run instead of treating a model lock as permission to resume', async () => {
    vi.mocked(preflightLlm).mockResolvedValue(response({...ready(),locked:true,resumable:false}))
    await setup()
    await expect(state.forSend()).rejects.toThrow()
    expect(state.dialogOpen.value).toBe(false)
  })
  it('allows an explicitly interrupted run to resume with its original bindings', async () => {
    vi.mocked(preflightLlm).mockResolvedValue(response({...ready(),locked:true,resumable:true,resumeThreadId:'paused'}))
    await setup()
    expect(await state.forSend()).toEqual({dp:'1'})
    expect(state.result.value?.resumeThreadId).toBe('paused')
  })
})
