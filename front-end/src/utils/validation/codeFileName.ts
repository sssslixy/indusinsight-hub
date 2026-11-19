/**
 * 创建插件：代码文件名校验（当前仅支持 .py）
 */
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/

export function validateCodeFileName(name: string): { valid: boolean; messageKey?: string } {
  const t = (name || '').trim()
  if (!t) return { valid: false, messageKey: 'common.fileNameRequired' }
  if (ILLEGAL_FILENAME_CHARS.test(t)) return { valid: false, messageKey: 'common.fileNameIllegalChars' }
  if (!t.toLowerCase().endsWith('.py')) return { valid: false, messageKey: 'common.fileNameMustEndPy' }
  return { valid: true }
}
