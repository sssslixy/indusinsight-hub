// Keep these rules aligned with the backend UsernamePolicy.
export function normalizeUsername(raw: string): string {
  return raw.replace(/^[\p{Zs}\uFEFF]+|[\p{Zs}\uFEFF]+$/gu, '')
}

export function usernameError(raw: string): string {
  if (/[\p{Cc}\p{Cs}\p{Zl}\p{Zp}]/u.test(raw)) return 'profile.usernameInvalidCharacters'
  const length = Array.from(normalizeUsername(raw)).length
  if (!length) return 'profile.usernameRequired'
  if (length > 50) return 'profile.usernameTooLong'
  return ''
}
