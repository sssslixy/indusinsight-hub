// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AgentModelSelector from './AgentModelSelector.vue'
import { i18n } from '@/i18n'

describe('shared personal model selector', () => {
  it('keeps the existing required Agent behavior by default', () => {
    const wrapper = mount(AgentModelSelector, { props: { modelValue: '', options: [] }, global: { plugins: [i18n] } })
    expect(wrapper.get('label').text()).toContain('*')
    expect(wrapper.get('option').attributes('disabled')).toBeDefined()
    expect(wrapper.get('label').text()).toContain(i18n.global.t('agentCreate.config.modelSelect'))
    wrapper.unmount()
  })
  it('allows an optional empty choice and disables both edits and refresh while busy', async () => {
    const wrapper = mount(AgentModelSelector, { props: { modelValue: '101', options: [{ value: '101', label: 'One', provider: 'provider', description: 'model' }], label: 'Scoring model', placeholder: 'Check spec only', required: false, clearable: true }, global: { plugins: [i18n] } })
    expect(wrapper.get('label').text()).toBe('Scoring model')
    expect(wrapper.get('option').attributes('disabled')).toBeUndefined()
    await wrapper.get('select').setValue('')
    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
