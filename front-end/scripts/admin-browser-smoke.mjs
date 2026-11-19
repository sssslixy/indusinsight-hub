// This harness serves static build output and mocks every API; it never connects to a backend.
import { fileURLToPath } from 'node:url'
const { chromium } = await import(process.env.ADMIN_QA_PLAYWRIGHT_MODULE || 'playwright-core')
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('../../', import.meta.url))
const dist = path.join(root, 'front-end/dist')
const output = path.join(root, 'front-end/test-results/admin')
await mkdir(output, { recursive: true })
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}
const unexpected = [],
  errors = [],
  requests = []
let typography
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname
  if (pathname.startsWith('/api/')) {
    unexpected.push(pathname)
    res.writeHead(500)
    res.end('NO API BACKEND IN THIS TEST')
    return
  }
  try {
    const filename = path.resolve(dist, '.' + decodeURIComponent(pathname))
    if (!filename.startsWith(dist)) throw Error('Invalid path')
    let data,
      extension = path.extname(filename)
    try {
      data = await readFile(filename)
    } catch {
      data = await readFile(path.join(dist, 'index.html'))
      extension = '.html'
    }
    res.setHeader('Content-Type', mime[extension] || 'application/octet-stream')
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({
  headless: true,
  ...(process.env.ADMIN_QA_CHROME
    ? { executablePath: process.env.ADMIN_QA_CHROME }
    : { channel: 'chrome' }),
})
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  locale: 'zh-CN',
})
let access = 'admin',
  failSave = false,
  empty = false
let rows = [
  {
    id: 1,
    title: '平台功能更新：更清晰的分析体验',
    content:
      '我们对平台工作流程进行了优化，让数据分析更加清晰、顺畅。\n感谢大家的持续反馈，欢迎体验最新功能。',
    status: 1,
    isImportant: true,
    publishTime: '2026-11-06T09:30:00',
    createdAt: '2026-11-06T09:00:00',
    updatedAt: '2026-11-06T10:15:00',
  },
  {
    id: 2,
    title: '系统维护时间安排',
    content: '本周末将进行例行维护。\n请提前保存正在编辑的内容。',
    status: 0,
    isImportant: false,
    publishTime: null,
    createdAt: '2026-11-05T14:00:00',
    updatedAt: '2026-11-05T16:20:00',
  },
  {
    id: 3,
    title: '历史版本说明',
    content: '上一版本的更新说明。',
    status: 2,
    isImportant: false,
    publishTime: '2026-10-22T10:00:00',
    createdAt: '2026-10-22T09:00:00',
    updatedAt: '2026-11-01T11:00:00',
  },
]
await context.addInitScript(() => {
  localStorage.setItem('appLocale', 'zh-CN')
  if (!sessionStorage.getItem('qa-init')) {
    localStorage.setItem('token', 'qa-token')
    localStorage.setItem(
      'userInfo',
      JSON.stringify({
        id: 1,
        account: 'admin',
        username: '管理员',
        phone: null,
        avatar: '/default-avatar.svg',
      }),
    )
    sessionStorage.setItem('qa-init', '1')
  }
})
await context.route('**/api/**', async (route) => {
  const req = route.request(),
    url = new URL(req.url()),
    pathname = url.pathname
  requests.push(`${req.method()} ${pathname}`)
  const respond = (data, status = 200, code = 0, message = 'success') =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ code, message, data }),
    })
  if (pathname.startsWith('/api/admin') && access !== 'admin')
    return respond(null, access === 'expired' ? 401 : 403)
  if (pathname === '/api/admin/account')
    return respond({
      id: 1,
      account: 'admin',
      username: '管理员',
      passwordUpdatedAt: '2026-11-06T09:00:00',
    })
  if (pathname === '/api/admin/account/password' || pathname === '/api/admin/logout')
    return respond(null)
  if (pathname === '/api/admin/announcements' && req.method() === 'GET') {
    const filtered = empty
      ? []
      : rows.filter(
          (row) =>
            row.title.includes(url.searchParams.get('keyword') || '') &&
            (!url.searchParams.has('status') ||
              String(row.status) === url.searchParams.get('status')),
        )
    return respond({
      list: filtered.map((row) => ({ ...row, contentSummary: row.content })),
      total: filtered.length,
      pageNum: 1,
      pageSize: 10,
      totalPages: Math.ceil(filtered.length / 10),
    })
  }
  const match = pathname.match(/^\/api\/admin\/announcements\/(\d+)(?:\/(publish|offline))?$/)
  if (match && req.method() === 'GET')
    return respond(rows.find((row) => row.id === Number(match[1])))
  if (pathname === '/api/admin/announcements' && req.method() === 'POST') {
    if (failSave) return respond(null, 200, 5000, '模拟保存失败')
    const input = req.postDataJSON()
    const id = Math.max(...rows.map((row) => row.id)) + 1
    rows.unshift({
      ...input,
      id,
      isImportant: !!input.isImportant,
      publishTime: input.status === 1 ? '2026-11-06T12:00:00' : null,
      createdAt: '2026-11-06T12:00:00',
      updatedAt: '2026-11-06T12:00:00',
    })
    return respond(id)
  }
  if (match && req.method() === 'PUT') {
    const row = rows.find((row) => row.id === Number(match[1]))
    if (match[2]) row.status = match[2] === 'publish' ? 1 : 2
    else {
      const input = req.postDataJSON()
      Object.assign(row, input, { isImportant: !!input.isImportant })
    }
    return respond(null)
  }
  if (match && req.method() === 'DELETE') {
    rows = rows.filter((row) => row.id !== Number(match[1]))
    return respond(null)
  }
  if (pathname === '/api/dashboard/stats') return respond({})
  return respond([])
})
const page = await context.newPage()
page.on('pageerror', (error) => errors.push(error.message))
const screenshot = async (name) => {
  await page.waitForFunction(() => document.querySelectorAll('.el-message').length === 0)
  await page.screenshot({
    path: path.join(output, `${name}.png`),
    fullPage: !(await page.locator('.el-dialog:visible, .el-message-box:visible').count()),
    animations: 'disabled',
  })
}
const noOverflow = async () =>
  assert(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    'Page must not overflow viewport',
  )
const boundedPreview = async () => {
  const dialog = page.locator('.adm-preview-dialog')
  await dialog.waitFor()
  // Wait for the open animation so the geometry represents the finished layout.
  await page.waitForFunction(() => {
    const dialog = document.querySelector('.adm-preview-dialog')
    return dialog && dialog.getBoundingClientRect().top >= 23
  })
  const box = await dialog.boundingBox()
  assert(box.y <= 32, 'Preview must open near the top of the viewport')
  assert(box.y + box.height <= page.viewportSize().height - 20, 'Preview must fit in the viewport')
}
try {
  await page.goto(base + '/admin/announcements')
  await page.getByRole('heading', { name: '系统公告', exact: true }).waitFor()
  await page.getByRole('link', { name: rows[0].title }).waitFor()
  const cdp = await context.newCDPSession(page)
  await cdp.send('DOM.enable')
  await cdp.send('CSS.enable')
  const { root: documentRoot } = await cdp.send('DOM.getDocument')
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: documentRoot.nodeId,
    selector: '.adm-title-cell a',
  })
  typography = {
    fonts: (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts,
    styles: await page
      .locator('.adm-title-cell a')
      .first()
      .evaluate((element) => ({
        fontFamily: getComputedStyle(element).fontFamily,
        fontSize: getComputedStyle(element).fontSize,
      })),
  }
  await writeFile(path.join(output, 'typography.json'), JSON.stringify(typography, null, 2))
  await screenshot('01-announcements-desktop')
  await noOverflow()
  const statusFilter = page.getByRole('combobox', { name: '状态', exact: true })
  const statusTrigger = page.locator('.adm-status-select .el-select__wrapper')
  await statusTrigger.click()
  await page.getByRole('option', { name: '全部状态', exact: true }).waitFor()
  assert.equal(
    await statusTrigger.evaluate((element) => getComputedStyle(element).outlineStyle),
    'none',
    'Pointer click must not add an outer focus ring',
  )
  await screenshot('15-status-filter-desktop')
  for (const [label, title] of [
    ['草稿', rows[1].title],
    ['已发布', rows[0].title],
    ['已下线', rows[2].title],
    ['全部状态', rows[0].title],
  ]) {
    if ((await statusFilter.getAttribute('aria-expanded')) !== 'true') {
      await statusTrigger.click()
    }
    await page.getByRole('option', { name: label, exact: true }).click()
    await page.getByRole('option', { name: label, exact: true }).waitFor({ state: 'hidden' })
    await page.getByRole('link', { name: title, exact: true }).waitFor()
    assert.equal(await page.locator('tbody tr').count(), label === '全部状态' ? 3 : 1)
  }
  await page.getByRole('button', { name: '搜索', exact: true }).focus()
  await page.keyboard.press('Tab')
  assert(await statusFilter.evaluate((element) => element === document.activeElement))
  assert.equal(
    await statusTrigger.evaluate((element) => getComputedStyle(element).outlineStyle),
    'solid',
    'Tab focus must remain visible',
  )
  await statusFilter.press('Enter')
  await page.getByRole('option', { name: '全部状态', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.getByRole('option', { name: '全部状态', exact: true }).waitFor({ state: 'hidden' })
  await page.reload()
  await page.getByRole('link', { name: rows[0].title }).waitFor()
  await page.getByRole('link', { name: rows[0].title }).click()
  await page.getByLabel('公告标题').waitFor()
  await screenshot('02-editor-desktop')
  await page.getByRole('button', { name: '预览', exact: true }).click()
  await page.locator('.el-dialog').waitFor()
  await boundedPreview()
  await screenshot('03-preview')
  await page.keyboard.press('Escape')
  await page
    .getByLabel('公告正文')
    .fill('修改后立即公开的正文\n<script>alert("safe text")</script>')
  await page.getByRole('button', { name: '保存并更新' }).click()
  await page.getByRole('heading', { name: '系统公告', exact: true }).waitFor()
  assert(rows.find((row) => row.id === 1).content.includes('修改后立即公开'))
  await page.getByRole('link', { name: '新建公告', exact: true }).click()
  await page.getByLabel('公告标题').fill('新增草稿测试')
  await page.getByLabel('公告正文').fill('草稿内容\n第二段')
  failSave = true
  await page.getByRole('button', { name: '保存草稿' }).click()
  await page.getByText('模拟保存失败').waitFor()
  assert.equal(await page.getByLabel('公告正文').inputValue(), '草稿内容\n第二段')
  failSave = false
  await page.getByRole('button', { name: '返回公告列表', exact: false }).click()
  await page.locator('.el-message-box').waitFor()
  await page.getByRole('button', { name: '继续编辑', exact: true }).click()
  assert(page.url().endsWith('/new'))
  await page.getByRole('button', { name: '保存草稿' }).click()
  await page.getByRole('heading', { name: '系统公告', exact: true }).waitFor()
  assert(rows.some((row) => row.title === '新增草稿测试' && row.status === 0))
  const first = page.locator('tbody tr').first()
  await first.getByRole('button', { name: '发布', exact: true }).click()
  await first.getByText('已发布', { exact: true }).waitFor()
  await first.getByRole('button', { name: '下线', exact: true }).click()
  await page.locator('.el-message-box').waitFor()
  await screenshot('04-confirmation')
  const offlineRequestsBeforeCancel = requests.filter((request) =>
    request.endsWith('/offline'),
  ).length
  await page.getByRole('button', { name: '取消', exact: true }).click()
  assert.equal(
    requests.filter((request) => request.endsWith('/offline')).length,
    offlineRequestsBeforeCancel,
  )
  await first.getByRole('button', { name: '下线', exact: true }).click()
  await page.getByRole('button', { name: '确认下线', exact: true }).click()
  await first.getByText('已下线', { exact: true }).waitFor()
  await first.getByRole('button', { name: '删除', exact: true }).click()
  await screenshot('11-delete-confirmation')
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot('12-confirmation-mobile')
  await noOverflow()
  await page.keyboard.press('Escape')
  assert(rows.some((row) => row.title === '新增草稿测试'))
  await first.getByRole('button', { name: '删除', exact: true }).click()
  await page.getByRole('button', { name: '确认删除', exact: true }).click()
  await page.getByRole('link', { name: '平台功能更新：更清晰的分析体验' }).waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  await screenshot('05-announcements-mobile')
  await noOverflow()
  await statusTrigger.click()
  await page.getByRole('option', { name: '全部状态', exact: true }).waitFor()
  await screenshot('16-status-filter-mobile')
  await noOverflow()
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: '账号安全', exact: true }).click()
  await page.getByLabel('当前密码', { exact: true }).waitFor()
  await screenshot('06-security-mobile')
  await noOverflow()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await screenshot('07-security-desktop')
  await page.getByLabel('当前密码', { exact: true }).fill('old-test-password')
  await page.getByLabel('新密码', { exact: true }).fill('new-test-password')
  await page.getByLabel('确认新密码', { exact: true }).fill('wrong')
  assert(await page.getByRole('button', { name: '确认修改', exact: true }).isDisabled())
  await page.getByLabel('确认新密码', { exact: true }).fill('new-test-password')
  await page.getByRole('button', { name: '确认修改', exact: true }).click()
  await page.waitForURL('**/login')
  assert.equal(await page.evaluate(() => localStorage.getItem('token')), null)
  await page.evaluate(() => {
    localStorage.setItem('token', 'qa-token')
    localStorage.setItem(
      'userInfo',
      JSON.stringify({ id: 1, account: 'admin', username: '管理员', phone: null, avatar: '' }),
    )
  })
  await page.goto(base + '/admin/announcements')
  await page.getByRole('heading', { name: '系统公告', exact: true }).waitFor()
  empty = true
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await page.getByRole('heading', { name: '还没有公告' }).waitFor()
  await screenshot('08-empty-state')
  empty = false
  await page.locator('.language-toggle').click()
  await screenshot('09-english')
  for (const width of [320, 768, 1000]) {
    await page.setViewportSize({ width, height: 900 })
    await noOverflow()
  }
  rows[0].title = '平台更新'.repeat(50)
  rows[0].content = '长正文与分段阅读验证。\n'.repeat(40)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await page.getByRole('link', { name: rows[0].title, exact: true }).waitFor()
  await noOverflow()
  await screenshot('10-long-title-mobile')
  await page.getByRole('link', { name: rows[0].title, exact: true }).click()
  await page.getByLabel('公告正文').waitFor()
  await page.getByRole('button', { name: '预览', exact: true }).click()
  await page.locator('.el-dialog').waitFor()
  await boundedPreview()
  await screenshot('13-long-preview-mobile')
  await noOverflow()
  const previewBody = page.locator('.adm-preview-dialog .el-dialog__body')
  assert(
    await previewBody.evaluate((body) => body.scrollHeight > body.clientHeight),
    'Long preview must scroll inside its body',
  )
  await previewBody.evaluate((body) => {
    body.scrollTop = body.scrollHeight
  })
  assert(await previewBody.evaluate((body) => body.scrollTop > 0))
  await page.setViewportSize({ width: 1440, height: 900 })
  await previewBody.evaluate((body) => {
    body.scrollTop = 0
  })
  await boundedPreview()
  await screenshot('14-long-preview-desktop')
  await page.keyboard.press('Escape')
  assert(
    !requests.some((request) => request.includes('/api/dashboard/visit')),
    'Admin views must not report ordinary-user page visits',
  )
  access = 'user'
  await page.reload()
  await page.waitForURL('**/dashboard')
  assert.equal(await page.evaluate(() => localStorage.getItem('token')), 'qa-token')
  access = 'expired'
  await page.goto(base + '/admin/announcements')
  await page.waitForURL('**/login')
  assert.equal(await page.evaluate(() => localStorage.getItem('token')), null)
  assert.deepEqual(unexpected, [])
  assert.deepEqual(errors, [])
  await writeFile(
    path.join(output, 'result.json'),
    JSON.stringify(
      {
        passed: true,
        checks: [
          'desktop/mobile',
          'all four status filters and keyboard dismissal',
          'refresh verification',
          'preview',
          'live edit',
          'save failure retention',
          'unsaved cancellation',
          'draft/publish/offline/delete',
          'password change',
          'empty/English',
          'long title and body',
          '403 session preservation',
          '401 session cleanup',
        ],
        apiRequests: requests.length,
        unexpectedBackendRequests: unexpected,
        consoleErrors: errors,
        typography,
      },
      null,
      2,
    ),
  )
  console.log('Admin browser checks passed. Screenshots:', output)
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
