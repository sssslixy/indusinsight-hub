// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { evaluationZh } from '@/i18n/messages/evaluation'
import { recentDates } from '@/views/evaluation/dateRange'
import SubmissionDateFilter from './SubmissionDateFilter.vue'

enableAutoUnmount(afterEach)
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

async function open() {
  const wrapper = mount(SubmissionDateFilter, {
    props: { modelValue: null },
    attachTo: document.body,
    global: {
      plugins: [
        createI18n({
          legacy: false,
          locale: 'zh-CN',
          messages: { 'zh-CN': { evaluation: evaluationZh } },
        }),
      ],
    },
  })
  await flushPromises()
  await wrapper.get('#evaluation-start-date').trigger('focus')
  await wrapper.get('#evaluation-start-date').trigger('click')
  await flushPromises()
  return wrapper
}

it('commits a real picker shortcut through its internal model and emits the completed range', async () => {
  const wrapper = await open()
  const shortcut = document.querySelector<HTMLButtonElement>(
    '.evaluation-date-popper .el-picker-panel__shortcut',
  )!
  expect(shortcut.textContent).toContain('近 7 天')
  shortcut.click()
  await flushPromises()
  expect(wrapper.emitted('change')).toEqual([[recentDates(7)]])
  expect(wrapper.get<HTMLInputElement>('#evaluation-start-date').element.value).toBe(
    recentDates(7)[0],
  )
  await wrapper.setProps({ modelValue: ['2026-10-01', '2026-10-31'] })
  expect(wrapper.get<HTMLInputElement>('#evaluation-start-date').element.value).toBe('2026-10-01')
  await wrapper.setProps({ modelValue: null })
  expect(wrapper.get<HTMLInputElement>('#evaluation-start-date').element.value).toBe('')
})

it('waits for the second calendar day before emitting any change', async () => {
  const wrapper = await open()
  const days = document.querySelectorAll<HTMLElement>(
    '.evaluation-date-popper .el-date-range-picker__content.is-left td.available',
  )
  days[5]!.click()
  await flushPromises()
  expect(wrapper.emitted('change')).toBeUndefined()
  days[8]!.click()
  await flushPromises()
  const changes = wrapper.emitted('change')!
  expect(changes).toHaveLength(1)
  expect(changes[0]![0]).toEqual([
    expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
  ])
})
