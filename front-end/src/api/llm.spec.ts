import { describe, it, expect } from 'vitest'
import { matchPersonalModel, type UserLlmModel } from './llm'

describe('personal model matching', () => {
  const model = (id: string, providerCode = 'deepseek') => ({ id, providerCode, modelCode: 'same-model' } as UserLlmModel)
  it('does not choose arbitrarily between connections', () => {
    expect(matchPersonalModel([model('1'), model('2')], 'same-model', 'deepseek')).toBe('')
  })
  it('matches model and provider without changing case or namespace', () => {
    expect(matchPersonalModel([model('1'), model('2', 'other')], 'same-model', 'other')).toBe('2')
    expect(matchPersonalModel([model('1')], 'SAME-MODEL')).toBe('')
  })
})
