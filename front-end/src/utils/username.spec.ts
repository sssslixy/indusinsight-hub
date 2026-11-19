import { describe, expect, it } from 'vitest'
import { normalizeUsername, usernameError } from './username'

describe('display name validation', () => {
  it('trims Unicode spaces and preserves internal spaces and emoji joiners', () => {
    expect(normalizeUsername('\u3000 开发 👩‍💻 \u00a0\ufeff')).toBe('开发 👩‍💻')
    expect(usernameError('开发 👩‍💻')).toBe('')
  })
  it('counts code points rather than UTF-16 code units', () => {
    expect(usernameError('😀'.repeat(50))).toBe('')
    expect(usernameError('😀'.repeat(51))).toBe('profile.usernameTooLong')
  })
  it.each(['', ' ', '\u3000\u00a0\ufeff'])('rejects empty names: %j', raw => {
    expect(usernameError(raw)).toBe('profile.usernameRequired')
  })
  it.each(['name\n', '\tname', 'a\0b', 'a\u007fb', 'a\u0085b', 'a\u2028b', 'a\u2029b', '\ud800'])('rejects controls before trimming: %j', raw => {
    expect(usernameError(raw)).toBe('profile.usernameInvalidCharacters')
  })
})
