import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { downloadEvaluationDataset, getEvaluationBoard } from './evaluation'
import { get, buildAuthHeaders, handleUnauthorizedResponse } from '@/utils/request'

vi.mock('@/utils/request', () => ({
  get: vi.fn(),
  postFormData: vi.fn(),
  buildAuthHeaders: vi.fn(),
  handleUnauthorizedResponse: vi.fn(),
}))
vi.mock('@/i18n', () => ({ i18n: { global: { t: (key: string) => key } } }))

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', fetchMock)
  vi.mocked(buildAuthHeaders).mockReturnValue({ satoken: 'test-token' })
  vi.mocked(handleUnauthorizedResponse).mockImplementation(
    ({ status }) => status === 401 || status === 403,
  )
})
afterEach(() => vi.unstubAllGlobals())

it('includes paired date parameters only for a filtered leaderboard', async () => {
  await getEvaluationBoard('case1')
  expect(get).toHaveBeenLastCalledWith('/api/evaluation/cases/case1/leaderboard', { all: true })
  const range = { startDate: '2026-10-01', endDate: '2026-10-31' }
  await getEvaluationBoard('case2', range)
  expect(get).toHaveBeenLastCalledWith('/api/evaluation/cases/case2/leaderboard', {
    all: true,
    ...range,
  })
})

describe('evaluation dataset downloads', () => {
  it('sends the session and abort signal and returns ZIP bytes', async () => {
    const bytes = new Uint8Array([80, 75, 3, 4, 42])
    fetchMock.mockResolvedValue(
      new Response(bytes, { headers: { 'Content-Type': 'application/zip' } }),
    )
    const controller = new AbortController()
    const blob = await downloadEvaluationDataset('case2', controller.signal)
    expect(fetchMock).toHaveBeenCalledWith('/api/evaluation/cases/case2/dataset', {
      method: 'GET',
      headers: { satoken: 'test-token' },
      signal: controller.signal,
    })
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(bytes)
  })

  it('rejects HTTP 200 business errors instead of saving them as ZIPs', async () => {
    fetchMock.mockResolvedValue(Response.json({ code: 4207, message: 'unavailable' }))
    await expect(downloadEvaluationDataset('case1')).rejects.toThrow(
      'evaluation.datasetUnavailable',
    )
  })

  it.each([401, 403])('handles HTTP %i through the existing login flow', async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }))
    await expect(downloadEvaluationDataset('case1')).rejects.toThrow('common.authExpired')
    expect(handleUnauthorizedResponse).toHaveBeenCalledWith(expect.objectContaining({ status }))
  })

  it('also handles expired-login JSON with HTTP 200', async () => {
    fetchMock.mockResolvedValue(Response.json({ code: 4030 }))
    await expect(downloadEvaluationDataset('case1')).rejects.toThrow('common.authExpired')
    expect(handleUnauthorizedResponse).toHaveBeenCalledWith({ status: 401 })
  })

  it.each([
    [502, 'text/html', '<html>Bad gateway</html>'],
    [200, 'text/html', '<html>Login</html>'],
    [200, 'application/json', '{broken'],
    [200, 'application/json', '{"code":4200}'],
  ])('rejects non-ZIP response %i %s', async (status, type, body) => {
    fetchMock.mockResolvedValue(new Response(body, { status, headers: { 'Content-Type': type } }))
    await expect(downloadEvaluationDataset('case1')).rejects.toThrow('evaluation.downloadFailed')
  })

  it('rejects empty archives', async () => {
    fetchMock.mockResolvedValue(
      new Response('', { headers: { 'Content-Type': 'application/zip' } }),
    )
    await expect(downloadEvaluationDataset('case1')).rejects.toThrow(
      'evaluation.datasetUnavailable',
    )
  })

  it('preserves request cancellation', async () => {
    const cancellation = new DOMException('Aborted', 'AbortError')
    fetchMock.mockRejectedValue(cancellation)
    await expect(downloadEvaluationDataset('case1')).rejects.toBe(cancellation)
  })

  it('localizes network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(downloadEvaluationDataset('case1')).rejects.toThrow('evaluation.downloadFailed')
  })
})
