import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runTaskStreamCompat, localizeLlmFailure } from '@/api/taskStream'
import { i18n } from '@/i18n'

const { fetchTaskSseMock } = vi.hoisted(() => ({
  fetchTaskSseMock: vi.fn(),
}))

vi.mock('@/api/taskShared', () => ({
  fetchTaskSse: fetchTaskSseMock,
  fetchTaskApi: vi.fn(),
}))

function makeSseResponse(frames: string): Response {
  return new Response(frames, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

describe('taskStream SSE compatibility', () => {
  it('localizes non-thinking and incomplete-output failures without changing existing text chunks', () => {
    i18n.global.locale.value = 'en-US'
    expect(localizeLlmFailure({ failure_class: 'llm_thinking_not_disabled', message: '原提示' }).message).toContain('did not honor disabled thinking')
    expect(localizeLlmFailure({ pipeline_error: 'llm_output_truncated', message: '' }).message).toContain('incomplete')
    expect(localizeLlmFailure({ token: 'partial' })).toEqual({ token: 'partial' })
    i18n.global.locale.value = 'zh-CN'
  })
  beforeEach(() => {
    fetchTaskSseMock.mockReset()
    if (!globalThis.requestAnimationFrame) {
      globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
        cb(performance.now())
        return 0
      }) as typeof requestAnimationFrame
    }
  })

  it('maps data-only frames to llm_chunk for incremental rendering', async () => {
    fetchTaskSseMock.mockResolvedValueOnce(makeSseResponse(
      [
        'data: {"token":"你"}',
        '',
        'event: complete',
        'data: {"success":true,"message":"done"}',
        '',
        '',
      ].join('\n')
    ))

    const events: string[] = []
    const res = await runTaskStreamCompat(
      {
        taskId: 'task-1',
        agentId: 1,
        userRequirement: 'hello',
      },
      { onEvent: (evt) => events.push(evt.event) }
    )

    expect(events[0]).toBe('llm_chunk')
    expect(events).toContain('complete')
    expect(res.data.success).toBe(true)
  })

  it('accepts llm_chunk text/content payload fields', async () => {
    fetchTaskSseMock.mockResolvedValueOnce(makeSseResponse(
      [
        'event: llm_chunk',
        'data: {"text":"A"}',
        '',
        'event: llm_chunk',
        'data: {"content":"B"}',
        '',
        'event: complete',
        'data: {"success":true,"message":"done"}',
        '',
        '',
      ].join('\n')
    ))

    const llmPayloads: Array<Record<string, unknown>> = []
    await runTaskStreamCompat(
      {
        taskId: 'task-2',
        agentId: 1,
        userRequirement: 'hello',
      },
      {
        onEvent: (evt) => {
          if (evt.event === 'llm_chunk') {
            llmPayloads.push(evt.data as Record<string, unknown>)
          }
        },
      }
    )

    expect(llmPayloads).toHaveLength(2)
    expect(llmPayloads[0]?.text).toBe('A')
    expect(llmPayloads[1]?.content).toBe('B')
  })

  it('maps data-only message/chunk/delta payloads to llm_chunk', async () => {
    fetchTaskSseMock.mockResolvedValueOnce(makeSseResponse(
      [
        'data: {"message":"M"}',
        '',
        'data: {"chunk":"C"}',
        '',
        'data: {"delta":"D"}',
        '',
        'event: complete',
        'data: {"success":true,"message":"done"}',
        '',
        '',
      ].join('\n')
    ))

    const chunks: Array<Record<string, unknown>> = []
    await runTaskStreamCompat(
      {
        taskId: 'task-3',
        agentId: 1,
        userRequirement: 'hello',
      },
      {
        onEvent: (evt) => {
          if (evt.event === 'llm_chunk') chunks.push(evt.data as Record<string, unknown>)
        },
      }
    )

    expect(chunks).toHaveLength(3)
    expect(chunks[0]?.message).toBe('M')
    expect(chunks[1]?.chunk).toBe('C')
    expect(chunks[2]?.delta).toBe('D')
  })

  it('preserves codegen post-processing event types', async () => {
    const eventNames = [
      'codegen_quality_check_start',
      'codegen_quality_check_completed',
      'codegen_quality_repair_start',
      'codegen_quality_repair_end',
      'codegen_validation_sample_start',
      'codegen_validation_sample_created',
      'codegen_pipeline_validation_start',
      'codegen_pipeline_validation_end',
      'codegen_pipeline_validation_final_failed',
      'codegen_pipeline_repair_start',
      'codegen_pipeline_repair_end',
      'codegen_llm_review_start',
      'codegen_llm_review_completed',
      'codegen_llm_review_repair_start',
      'codegen_llm_review_repair_end',
      'codegen_zip_start',
      'codegen_zip_generated',
    ]
    const frames = eventNames.flatMap((event) => [
      `event: ${event}`,
      `data: {"node":"${event}"}`,
      '',
    ])
    frames.push('event: complete', 'data: {"success":true,"message":"done"}', '', '')
    fetchTaskSseMock.mockResolvedValueOnce(makeSseResponse(frames.join('\n')))

    const events: string[] = []
    await runTaskStreamCompat(
      {
        taskId: 'task-codegen-events',
        agentId: 1,
        userRequirement: 'hello',
      },
      { onEvent: (evt) => events.push(evt.event) }
    )

    expect(events.slice(0, eventNames.length)).toEqual(eventNames)
    expect(events.slice(0, eventNames.length)).not.toContain('message')
  })
})
