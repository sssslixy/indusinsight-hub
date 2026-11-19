// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, DOMWrapper, type VueWrapper } from '@vue/test-utils'
import Picker from './LlmBindingPicker.vue'
import InputBar from './workbench/AgentInputBar.vue'
import { h } from 'vue'
import { i18n } from '@/i18n'
import type { LlmPreflight, UserLlmModel } from '@/api/llm'
let wrapper: VueWrapper
const body = () => new DOMWrapper(document.body)
const result: LlmPreflight = { mode:'public', ready:true, locked:false, llmBindings:{dp:'101'}, requirements:{dp:{provider:'p',model:'Org/Model'}}, issues:{} }
const models: UserLlmModel[] = [{id:'101',connectionId:'1',connectionName:'First',providerCode:'p',modelCode:'Org/Model',displayName:'Model',enabled:true,available:true,validationStatus:'valid'}, {id:'102',connectionId:'2',connectionName:'Second',providerCode:'p',modelCode:'Org/Model',displayName:'Model',enabled:true,available:true,validationStatus:'valid'}]
async function render(r = result, open = true) { wrapper = mount(Picker,{attachTo:document.body, props:{agentId:'9',result:r,models,open},global:{plugins:[i18n]}}); await flushPromises() }
beforeEach(() => { i18n.global.locale.value='zh-CN'; vi.stubGlobal('ResizeObserver',class { observe(){} unobserve(){} disconnect(){} }) })
afterEach(() => {wrapper?.unmount();document.body.innerHTML='';vi.unstubAllGlobals()})
describe('model status and dialog', () => {
  it('keeps the page compact with no controls until requested',async () => {
    await render(result,false); expect(body().find('.el-dialog').exists()).toBe(false);expect(wrapper.findAll('select,.el-select')).toHaveLength(0)
    await wrapper.find('.model-trigger').trigger('click');expect(wrapper.emitted('update:open')?.[0]).toEqual([true])
  })
  it('renders six readonly positions for own and locked tasks',async () => {
    await render({...result,mode:'owner'});expect(body().findAll('.model-position')).toHaveLength(6);expect(body().findAll('.el-select')).toHaveLength(0)
    await wrapper.setProps({result:{...result,locked:true}});expect(body().findAll('.el-select')).toHaveLength(0)
  })
  it('uses real registered selectors and keeps cancelling separate from applying',async () => {
    await render();expect(body().findAll('.el-select')).toHaveLength(7)
    expect(document.querySelector('el-dialog,el-select,el-option,el-button')).toBeNull()
    await body().findAll('button').find(b=>b.text()==='取消')!.trigger('click')
    expect(wrapper.emitted('apply')).toBeUndefined();expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })
  it('shows repair links for invalid own bindings and translates the modal',async () => {
    await render({...result,mode:'owner',ready:false,issues:{dp:{code:'model_missing'}}})
    expect(body().find('a').attributes('href')).toBe('/my/agents/9/edit');expect(body().find('a').attributes('target')).toBe('_blank')
    i18n.global.locale.value='en-US';await flushPromises();expect(body().text()).toContain('Agent model configuration');expect(body().text()).toContain('Data processing')
  })
  it('shows a useful empty state instead of six blank controls',async () => {
    await render();await wrapper.setProps({models:[]});expect(body().findAll('.el-select')).toHaveLength(0);expect(body().text()).toContain('暂无可用模型')
  })
  it('places the configuration trigger immediately before send and preserves typed input',async () => {
    wrapper = mount(InputBar, { attachTo:document.body, global:{plugins:[i18n]}, slots:{'before-send':()=>h(Picker,{agentId:'9',result,models})} })
    await flushPromises()
    expect(wrapper.find('.action-right').findAll('button').map(b=>b.classes()[0])).toEqual(['model-trigger','btn-send'])
    await wrapper.find('textarea').setValue('Keep this draft')
    await wrapper.find('.model-trigger').trigger('click')
    expect(wrapper.findComponent(Picker).emitted('update:open')?.[0]).toEqual([true])
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('Keep this draft')
    expect(wrapper.emitted('send')).toBeUndefined()
  })
})
