import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getSkillPublishLeaderboard } from './skill'
import { get } from '@/utils/request'

vi.mock('@/utils/request', () => ({
  get: vi.fn(),
  buildAuthHeaders: vi.fn(),
  del: vi.fn(),
  handleUnauthorizedResponse: vi.fn(),
  post: vi.fn(),
  postFormData: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())
describe('Skill leaderboard API', () => {
  it('requests the first 100 creators by default from the independent authenticated endpoint', () => {
    getSkillPublishLeaderboard()
    expect(get).toHaveBeenCalledWith('/api/skills/community/publish-leaderboard', {
      pageNum: '1',
      pageSize: '100',
    })
  })
  it('sends pagination without adding any community search filters', () => {
    getSkillPublishLeaderboard({ pageNum: 3, pageSize: 20 })
    expect(get).toHaveBeenCalledWith('/api/skills/community/publish-leaderboard', {
      pageNum: '3',
      pageSize: '20',
    })
  })
})
