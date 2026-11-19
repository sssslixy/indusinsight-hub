// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createI18n } from 'vue-i18n'
import EvaluationPage from './index.vue'
import SubmissionDateFilter from '@/components/evaluation/SubmissionDateFilter.vue'
import { evaluationEn, evaluationZh } from '@/i18n/messages/evaluation'
import {
  downloadEvaluationDataset,
  getEvaluationCases,
  getEvaluationBoard,
  submitEvaluation,
} from '@/api/evaluation'
import type { EvaluationBoard, EvaluationCase } from '@/api/evaluation'

vi.mock('@/api/evaluation', () => ({
  getEvaluationCases: vi.fn(),
  getEvaluationBoard: vi.fn(),
  submitEvaluation: vi.fn(),
  downloadEvaluationDataset: vi.fn(),
}))
vi.mock('@/components/dashboard/DashboardHeader.vue', () => ({
  default: { template: '<header />' },
}))
const response = <T>(data: T) => ({ code: 0, message: 'success', data })
const cases: EvaluationCase[] = [
  {
    id: 'case1',
    name: '故障',
    metric: 'binary_f1',
    direction: 'desc',
    testRows: 1500,
    datasetVersion: 'v1',
    canSubmit: true,
    maxSubmissions: 0,
  },
  {
    id: 'case2',
    name: '能耗',
    metric: 'mae',
    direction: 'asc',
    testRows: 7008,
    datasetVersion: 'v1',
    canSubmit: true,
    maxSubmissions: 0,
  },
  {
    id: 'case3',
    name: '缺陷',
    metric: 'macro_f1',
    direction: 'desc',
    testRows: 388,
    datasetVersion: 'v1',
    canSubmit: true,
    maxSubmissions: 0,
  },
]
const empty: EvaluationBoard = {
  list: [],
  total: 0,
  pageNum: 1,
  pageSize: 20,
  mySubmissionCount: 0,
}
const mine = {
  rank: 2,
  userId: 1,
  username: 'Student',
  metricValue: 0.75,
  submissionCount: 3,
  submittedAt: '2026-10-12T08:00:00Z',
  currentUser: true,
}
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}
async function setup(query = '', locale = 'zh-CN') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/evaluation', component: EvaluationPage }],
  })
  await router.push('/evaluation' + query)
  await router.isReady()
  const wrapper = mount(EvaluationPage, {
    global: {
      plugins: [
        router,
        createI18n({
          legacy: false,
          locale,
          messages: {
            'zh-CN': { evaluation: evaluationZh },
            'en-US': { evaluation: evaluationEn },
          },
        }),
      ],
    },
  })
  await flushPromises()
  return { wrapper, router }
}
async function select(
  wrapper: Awaited<ReturnType<typeof setup>>['wrapper'],
  file = new File(['sample_id,prediction\na,1\n'], 'p.csv'),
) {
  const input = wrapper.get('input[type=file]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
}
const uploadButton = (wrapper: Awaited<ReturnType<typeof setup>>['wrapper']) =>
  wrapper.findAll('button').find((b) => /提交预测|正在评测/.test(b.text()))!

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  vi.mocked(getEvaluationCases).mockResolvedValue(response(cases))
  vi.mocked(getEvaluationBoard).mockResolvedValue(response(empty))
  vi.mocked(downloadEvaluationDataset).mockResolvedValue(
    new Blob(['zip'], { type: 'application/zip' }),
  )
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:dataset')
      static revokeObjectURL = vi.fn()
    },
  )
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('evaluation dataset downloads', () => {
  it('downloads the selected case without changing the CSV, board or submission state', async () => {
    const { wrapper, router } = await setup('?case=case2')
    await select(wrapper)
    const createLink = vi.spyOn(document.body, 'append')
    const boardCalls = vi.mocked(getEvaluationBoard).mock.calls.length
    await wrapper.get('.dataset-button').trigger('click')
    await flushPromises()
    expect(downloadEvaluationDataset).toHaveBeenCalledWith('case2', expect.any(AbortSignal))
    expect(wrapper.get('.selected-file').text()).toBe('p.csv')
    expect(uploadButton(wrapper).attributes('disabled')).toBeUndefined()
    expect(router.currentRoute.value.query.case).toBe('case2')
    expect(getEvaluationBoard).toHaveBeenCalledTimes(boardCalls)
    expect(submitEvaluation).not.toHaveBeenCalled()
    const link = createLink.mock.calls[0]![0] as HTMLAnchorElement
    expect(link.download).toBe('case2.zip')
    expect(link.isConnected).toBe(false)
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1000)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:dataset')
    wrapper.unmount()
  })

  it('allows downloads when submissions are disabled or exhausted', async () => {
    vi.mocked(getEvaluationCases).mockResolvedValue(
      response(cases.map((c) => ({ ...c, canSubmit: false, maxSubmissions: 1 }))),
    )
    vi.mocked(getEvaluationBoard).mockResolvedValue(response({ ...empty, mine }))
    const { wrapper } = await setup()
    expect(uploadButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.get('.dataset-button').attributes('disabled')).toBeUndefined()
    await wrapper.get('.dataset-button').trigger('click')
    await flushPromises()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('prevents duplicate downloads and allows retry after an inline error', async () => {
    const pending = deferred<Blob>()
    vi.mocked(downloadEvaluationDataset).mockReturnValueOnce(pending.promise)
    const { wrapper } = await setup()
    await wrapper.get('.dataset-button').trigger('click')
    await wrapper.get('.dataset-button').trigger('click')
    expect(downloadEvaluationDataset).toHaveBeenCalledTimes(1)
    expect(wrapper.get('.dataset-button').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('.dataset-button').text()).toContain('下载中…')
    pending.resolve(new Blob(['zip']))
    await flushPromises()
    vi.mocked(downloadEvaluationDataset).mockRejectedValueOnce(new Error('数据集暂不可下载'))
    await wrapper.get('.dataset-button').trigger('click')
    await flushPromises()
    expect(wrapper.get('.download-error').text()).toBe('数据集暂不可下载')
    expect(wrapper.get('.dataset-button').attributes('disabled')).toBeUndefined()
    await wrapper.get('.dataset-button').trigger('click')
    await flushPromises()
    expect(wrapper.find('.download-error').exists()).toBe(false)
    wrapper.unmount()
  })

  it('aborts on case changes and ignores a late response without resetting the next download', async () => {
    const first = deferred<Blob>(),
      next = deferred<Blob>()
    vi.mocked(downloadEvaluationDataset)
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(next.promise)
    const { wrapper, router } = await setup()
    await wrapper.get('.dataset-button').trigger('click')
    const signal = vi.mocked(downloadEvaluationDataset).mock.calls[0]![1]!
    await router.replace('?case=case3')
    await flushPromises()
    expect(signal.aborted).toBe(true)
    expect(wrapper.get('.dataset-button').text()).toContain('case3.zip')
    await wrapper.get('.dataset-button').trigger('click')
    first.resolve(new Blob(['old']))
    await flushPromises()
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled()
    expect(wrapper.get('.dataset-button').attributes('aria-busy')).toBe('true')
    next.resolve(new Blob(['new']))
    await flushPromises()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('aborts on unmount and never saves a late response', async () => {
    const pending = deferred<Blob>()
    vi.mocked(downloadEvaluationDataset).mockReturnValueOnce(pending.promise)
    const { wrapper } = await setup()
    await wrapper.get('.dataset-button').trigger('click')
    const signal = vi.mocked(downloadEvaluationDataset).mock.calls[0]![1]!
    wrapper.unmount()
    expect(signal.aborted).toBe(true)
    pending.resolve(new Blob(['late']))
    await flushPromises()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('provides English download text and an accessible case-specific label', async () => {
    const { wrapper } = await setup('?case=case3', 'en-US')
    expect(wrapper.get('.dataset-download h3').text()).toBe('Dataset')
    expect(wrapper.get('.dataset-button').text()).toContain('Download')
    expect(wrapper.get('.dataset-button').attributes('aria-label')).toBe(
      'Download dataset case3.zip',
    )
    wrapper.unmount()
  })
})
describe('evaluation leaderboard', () => {
  it('shows exactly five table columns, an empty board, and query-selected case', async () => {
    const { wrapper } = await setup('?case=case2')
    expect(getEvaluationBoard).toHaveBeenCalledWith('case2')
    expect(wrapper.text()).toContain('MAE（kWh）')
    expect(wrapper.text()).toContain('你还没有有效提交')
    expect(wrapper.findAll('thead th')).toHaveLength(5)
    expect(uploadButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('renders the entire board without pagination or footer and uses a custom file picker', async () => {
    const list = Array.from({ length: 125 }, (_, i) => ({
      ...mine,
      userId: i + 1,
      rank: i + 1,
      username: `Student ${i + 1}`,
    }))
    vi.mocked(getEvaluationBoard).mockResolvedValue(
      response({ ...empty, list, total: list.length }),
    )
    const { wrapper } = await setup()
    expect(wrapper.findAll('tbody tr')).toHaveLength(125)
    expect(wrapper.text()).toContain('Student 125')
    expect(wrapper.find('footer').exists()).toBe(false)
    expect(wrapper.find('.el-pagination').exists()).toBe(false)
    const picker = vi.spyOn(wrapper.get<HTMLInputElement>('input[type=file]').element, 'click')
    await wrapper.get('.file-button').trigger('click')
    expect(picker).toHaveBeenCalledOnce()
    await select(wrapper, new File(['x'], 'predictions.csv'))
    expect(wrapper.get('.selected-file').text()).toBe('predictions.csv')
    wrapper.unmount()
  })
  it('preserves existing results after a failed upload and rejects invalid files locally', async () => {
    vi.mocked(getEvaluationBoard).mockResolvedValue(
      response({ ...empty, list: [mine], total: 1, mine }),
    )
    vi.mocked(submitEvaluation).mockRejectedValue(
      Object.assign(new Error('预测类别不合法'), { code: 4201 }),
    )
    const { wrapper } = await setup()
    await select(wrapper, new File(['x'], 'wrong.xlsx'))
    expect(wrapper.text()).toContain('请选择不超过')
    await select(wrapper)
    await uploadButton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('预测类别不合法')
    expect(wrapper.text()).toContain('0.7500')
    expect(wrapper.text()).toContain('2026/10/12 16:00:00')
    wrapper.unmount()
  })
  it('prevents double click and refreshes after successful submission', async () => {
    const waiting =
      deferred<ReturnType<typeof response<import('@/api/evaluation').SubmissionResult>>>()
    vi.mocked(submitEvaluation).mockReturnValue(waiting.promise)
    const { wrapper } = await setup()
    await select(wrapper)
    await uploadButton(wrapper).trigger('click')
    await uploadButton(wrapper).trigger('click')
    expect(submitEvaluation).toHaveBeenCalledTimes(1)
    waiting.resolve(
      response({
        submissionId: 1,
        requestId: 'id',
        caseId: 'case1',
        metricValue: 1,
        submittedAt: mine.submittedAt,
      }),
    )
    await flushPromises()
    expect(wrapper.text()).toContain('提交成功，本次指标：1.0000')
    expect(getEvaluationBoard).toHaveBeenCalledTimes(2)
    expect(uploadButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('reuses request ID after ambiguous network failure', async () => {
    vi.mocked(submitEvaluation).mockRejectedValue(
      Object.assign(new Error('network'), { code: 5000 }),
    )
    const { wrapper } = await setup()
    await select(wrapper)
    await uploadButton(wrapper).trigger('click')
    await flushPromises()
    await uploadButton(wrapper).trigger('click')
    await flushPromises()
    const calls = vi.mocked(submitEvaluation).mock.calls
    expect(calls[0]?.[2]).toMatch(/^[a-f0-9-]{36}$/)
    expect(calls[0]?.[2]).toBe(calls[1]?.[2])
    wrapper.unmount()
  })
  it('clears the selected file and ignores stale board responses after switching cases', async () => {
    const waiting = deferred<ReturnType<typeof response<EvaluationBoard>>>()
    vi.mocked(getEvaluationBoard)
      .mockReturnValueOnce(waiting.promise)
      .mockResolvedValue(response(empty))
    const { wrapper, router } = await setup()
    await router.replace('/evaluation?case=case2')
    await flushPromises()
    waiting.resolve(response({ ...empty, mine, list: [mine], total: 1 }))
    await flushPromises()
    expect(wrapper.text()).toContain('MAE（kWh）')
    expect(wrapper.text()).not.toContain('0.7500')
    await select(wrapper)
    await router.replace('/evaluation?case=case3')
    await flushPromises()
    expect(uploadButton(wrapper).attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('shows unavailable labels while keeping the existing leaderboard accessible', async () => {
    vi.mocked(getEvaluationCases).mockResolvedValue(
      response(
        cases.map((c) => ({ ...c, canSubmit: false, unavailableReason: '评测数据暂不可用' })),
      ),
    )
    vi.mocked(getEvaluationBoard).mockResolvedValue(
      response({ ...empty, mine, list: [mine], total: 1 }),
    )
    const { wrapper } = await setup()
    expect(wrapper.text()).toContain('评测数据暂不可用')
    expect(wrapper.text()).toContain('0.7500')
    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
  it('shows cached results immediately on return and replaces them after background refresh', async () => {
    vi.mocked(getEvaluationBoard).mockResolvedValueOnce(
      response({ ...empty, list: [mine], total: 1, mine }),
    )
    const { wrapper, router } = await setup()
    await router.replace('/evaluation?case=case2')
    await flushPromises()
    const waiting = deferred<ReturnType<typeof response<EvaluationBoard>>>()
    vi.mocked(getEvaluationBoard).mockReturnValueOnce(waiting.promise)
    await router.replace('/evaluation?case=case1')
    await flushPromises()
    expect(wrapper.get('.board-scroll').attributes('aria-busy')).toBe('true')
    expect(wrapper.get('tbody').text()).toContain('0.7500')
    expect(wrapper.get('.own-result').text()).toContain('0.7500')
    expect(wrapper.text()).not.toContain('正在加载')
    const updated = { ...mine, metricValue: 0.9, submissionCount: 4 }
    waiting.resolve(response({ ...empty, list: [updated], total: 1, mine: updated }))
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('0.9000')
    expect(wrapper.get('.board-scroll').attributes('aria-busy')).toBe('false')
    wrapper.unmount()
  })
  it('preserves cached empty states while refreshing and ignores responses from an earlier visit', async () => {
    const { wrapper, router } = await setup()
    const stale = deferred<ReturnType<typeof response<EvaluationBoard>>>()
    vi.mocked(getEvaluationBoard).mockReturnValueOnce(stale.promise)
    await wrapper.get('.refresh-button').trigger('click')
    await router.replace('/evaluation?case=case2')
    await flushPromises()
    const latest = deferred<ReturnType<typeof response<EvaluationBoard>>>()
    vi.mocked(getEvaluationBoard).mockReturnValueOnce(latest.promise)
    await router.replace('/evaluation?case=case1')
    await flushPromises()
    expect(wrapper.text()).toContain('暂无有效提交')
    expect(wrapper.text()).toContain('你还没有有效提交')
    expect(wrapper.text()).not.toContain('正在加载')
    stale.resolve(response({ ...empty, list: [mine], total: 1, mine }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('0.7500')
    latest.resolve(response(empty))
    await flushPromises()
    wrapper.unmount()
  })
  it('keeps cached results and case details when background refresh fails', async () => {
    vi.mocked(getEvaluationBoard).mockResolvedValueOnce(
      response({ ...empty, list: [mine], total: 1, mine }),
    )
    const { wrapper, router } = await setup()
    await router.replace('/evaluation?case=case2')
    await flushPromises()
    vi.mocked(getEvaluationCases).mockRejectedValueOnce(new Error('配置获取失败'))
    vi.mocked(getEvaluationBoard).mockRejectedValueOnce(new Error('榜单获取失败'))
    await router.replace('/evaluation?case=case1')
    await flushPromises()
    expect(wrapper.text()).toContain('榜单获取失败')
    expect(wrapper.get('tbody').text()).toContain('0.7500')
    expect(wrapper.get('.metric-summary').text()).toContain('故障类 F1')
    expect(wrapper.get('.refresh-button').attributes('disabled')).toBeUndefined()
    wrapper.unmount()
  })
  it('only shows deadline information when a deadline is configured', async () => {
    const { wrapper } = await setup('?case=case3')
    expect(wrapper.get('.case-meta').text()).not.toContain('截止时间')
    expect(wrapper.get('.case-tabs button.active').text()).toContain('质量缺陷分类')
    expect(wrapper.get('.board-heading h2').text()).toBe('产品质量缺陷分类')
    vi.mocked(getEvaluationCases).mockResolvedValueOnce(
      response(cases.map((c) => ({ ...c, deadline: '2026-10-20T08:00:00Z' }))),
    )
    await wrapper.get('.refresh-button').trigger('click')
    await flushPromises()
    expect(wrapper.get('.case-meta').text()).toContain('截止时间：2026/10/20 16:00:00')
    wrapper.unmount()
  })
})

describe('evaluation date filtering', () => {
  const october = { startDate: '2026-10-01', endDate: '2026-10-31' }
  const octoberQuery = '?startDate=2026-10-01&endDate=2026-10-31'

  it('preserves a submission error and retry identity when changing dates', async () => {
    vi.mocked(submitEvaluation).mockRejectedValue(
      Object.assign(new Error('network retry needed'), { code: 5000 }),
    )
    const { wrapper, router } = await setup()
    await select(wrapper)
    await uploadButton(wrapper).trigger('click')
    await flushPromises()
    await router.push(octoberQuery)
    await flushPromises()
    expect(wrapper.text()).toContain('network retry needed')
    await uploadButton(wrapper).trigger('click')
    await flushPromises()
    expect(vi.mocked(submitEvaluation).mock.calls[0]![2]).toBe(
      vi.mocked(submitEvaluation).mock.calls[1]![2],
    )
    wrapper.unmount()
  })

  it('restores the URL range, retains it across cases, and resets through browser history', async () => {
    const { wrapper, router } = await setup(octoberQuery)
    expect(getEvaluationBoard).toHaveBeenLastCalledWith('case1', october)
    expect(wrapper.findComponent(SubmissionDateFilter).props('modelValue')).toEqual(
      Object.values(october),
    )
    await wrapper.get('.case-tabs button:nth-child(2)').trigger('click')
    await flushPromises()
    expect(getEvaluationBoard).toHaveBeenLastCalledWith('case2', october)
    await wrapper.get('.date-filter-reset').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ case: 'case2' })
    expect(getEvaluationBoard).toHaveBeenLastCalledWith('case2')
    router.back()
    await flushPromises()
    expect(getEvaluationBoard).toHaveBeenLastCalledWith('case2', october)
    router.forward()
    await flushPromises()
    expect(wrapper.findComponent(SubmissionDateFilter).props('modelValue')).toBeNull()
    wrapper.unmount()
  })

  it('changes only the board, preserving a CSV and an ongoing download', async () => {
    const pending = deferred<Blob>()
    vi.mocked(downloadEvaluationDataset).mockReturnValueOnce(pending.promise)
    const { wrapper } = await setup()
    await select(wrapper)
    await wrapper.get('.dataset-button').trigger('click')
    const signal = vi.mocked(downloadEvaluationDataset).mock.calls[0]![1]!
    wrapper.get('.board-scroll').element.scrollTop = 200
    wrapper.findComponent(SubmissionDateFilter).vm.$emit('change', Object.values(october))
    await flushPromises()
    expect(getEvaluationBoard).toHaveBeenLastCalledWith('case1', october)
    expect(getEvaluationCases).toHaveBeenCalledOnce()
    expect(wrapper.get('.selected-file').text()).toBe('p.csv')
    expect(wrapper.get('.board-scroll').element.scrollTop).toBe(0)
    expect(signal.aborted).toBe(false)
    expect(wrapper.get('.dataset-button').attributes('aria-busy')).toBe('true')
    pending.resolve(new Blob(['zip']))
    await flushPromises()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('retains an ongoing submission across a date change and invalidates other cached ranges', async () => {
    vi.mocked(getEvaluationBoard).mockResolvedValueOnce(
      response({ ...empty, list: [mine], total: 1 }),
    )
    const submission = deferred<Awaited<ReturnType<typeof submitEvaluation>>>()
    vi.mocked(submitEvaluation).mockReturnValueOnce(submission.promise)
    const { wrapper, router } = await setup()
    await select(wrapper)
    await uploadButton(wrapper).trigger('click')
    await router.push(octoberQuery)
    await flushPromises()
    expect(uploadButton(wrapper).text()).toContain('正在评测')
    expect(wrapper.get('.selected-file').text()).toBe('p.csv')
    submission.resolve(
      response({
        submissionId: 1,
        requestId: 'id',
        caseId: 'case1',
        metricValue: 1,
        submittedAt: mine.submittedAt,
      }),
    )
    await flushPromises()
    expect(wrapper.text()).toContain('提交成功')
    expect(getEvaluationBoard).toHaveBeenLastCalledWith('case1', october)
    const loading = deferred<Awaited<ReturnType<typeof getEvaluationBoard>>>()
    vi.mocked(getEvaluationBoard).mockReturnValueOnce(loading.promise)
    await wrapper.get('.date-filter-reset').trigger('click')
    await flushPromises()
    expect(wrapper.text()).not.toContain('0.7500')
    expect(wrapper.text()).toContain('正在加载')
    loading.resolve(response(empty))
    await flushPromises()
    wrapper.unmount()
  })

  it('does not mix range caches or let an older response overwrite a newer range', async () => {
    vi.mocked(getEvaluationBoard).mockResolvedValueOnce(
      response({ ...empty, list: [mine], total: 1 }),
    )
    const { wrapper, router } = await setup()
    const stale = deferred<Awaited<ReturnType<typeof getEvaluationBoard>>>()
    vi.mocked(getEvaluationBoard).mockReturnValueOnce(stale.promise)
    await router.push(octoberQuery)
    await flushPromises()
    expect(wrapper.text()).not.toContain('0.7500')
    await router.push('?startDate=2026-09-01&endDate=2026-09-30')
    await flushPromises()
    stale.resolve(response({ ...empty, list: [mine], total: 1 }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('0.7500')
    const waiting = deferred<Awaited<ReturnType<typeof getEvaluationBoard>>>()
    vi.mocked(getEvaluationBoard).mockReturnValueOnce(waiting.promise)
    await router.push('/evaluation')
    await flushPromises()
    expect(wrapper.get('tbody').text()).toContain('0.7500')
    waiting.resolve(response(empty))
    await flushPromises()
    wrapper.unmount()
  })

  it('keeps the submission limit when the current user is outside the filtered board', async () => {
    vi.mocked(getEvaluationCases).mockResolvedValue(
      response(cases.map((c) => ({ ...c, maxSubmissions: 3 }))),
    )
    vi.mocked(getEvaluationBoard).mockResolvedValue(response({ ...empty, mySubmissionCount: 3 }))
    const { wrapper } = await setup(octoberQuery)
    await select(wrapper)
    expect(wrapper.get('.own-result').text()).toContain('我的最终提交不在当前日期范围内')
    expect(uploadButton(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('所选日期范围内暂无最终提交')
    await wrapper.get('.clear-dates').trigger('click')
    await flushPromises()
    expect(getEvaluationBoard).toHaveBeenLastCalledWith('case1')
    wrapper.unmount()
  })

  it('blocks malformed URL filters until reset instead of silently showing all time', async () => {
    const { wrapper } = await setup('?startDate=2026-02-30')
    expect(getEvaluationBoard).not.toHaveBeenCalled()
    expect(wrapper.get('.date-filter-hint').attributes('role')).toBe('alert')
    await wrapper.get('.date-filter-reset').trigger('click')
    await flushPromises()
    expect(getEvaluationBoard).toHaveBeenCalledWith('case1')
    wrapper.unmount()
  })
})
