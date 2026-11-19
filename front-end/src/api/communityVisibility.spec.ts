import { beforeEach, expect, it, vi } from 'vitest'
import { get } from '@/utils/request'
import { getAgentCommunityList, getHotAgents } from './agent'
import { getSkillCommunityList } from './skill'
import { getKnowledgeBaseCommunityList } from './knowledgeBase'

vi.mock('@/utils/request', () => ({
  get: vi.fn(), post: vi.fn(), del: vi.fn(), put: vi.fn(), postFormData: vi.fn(),
  buildAuthHeaders: vi.fn(), handleUnauthorizedResponse: vi.fn(),
}))
beforeEach(() => { vi.clearAllMocks() })

const lists = [
  ['/api/agents', getAgentCommunityList],
  ['/api/skills/community', getSkillCommunityList],
  ['/api/knowledge-base/community', getKnowledgeBaseCommunityList],
] as const

it.each(lists)('%s serializes both inclusion modes and preserves the omitted default', async (url, list) => {
  for (const includeMine of [true, false, undefined]) {
    await list({ includeMine, keyword: ' mine ', pageNum: 2, pageSize: 8 })
    const [path, query] = vi.mocked(get).mock.lastCall!
    expect(path).toBe(url)
    expect(query?.keyword).toBe('mine')
    expect(String(query?.pageNum)).toBe('2')
    expect(String(query?.pageSize)).toBe('8')
    if (includeMine === undefined) expect(query).not.toHaveProperty('includeMine')
    else expect(query?.includeMine).toBe(String(includeMine))
  }
})

it('keeps the hot agent default and explicitly includes mine when requested', async () => {
  await getHotAgents()
  expect(get).toHaveBeenLastCalledWith('/api/agents/hot', { limit: 6, includeMine: 'false' })
  await getHotAgents(3, true)
  expect(get).toHaveBeenLastCalledWith('/api/agents/hot', { limit: 3, includeMine: 'true' })
  await getHotAgents(4, false)
  expect(get).toHaveBeenLastCalledWith('/api/agents/hot', { limit: 4, includeMine: 'false' })
})
