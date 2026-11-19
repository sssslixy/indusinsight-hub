<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import EditorToolbar from './EditorToolbar.vue'
import CodeIssuePanel from './CodeIssuePanel.vue'
import type { CodeIssue } from './CodeIssuePanel.vue'
import CodeDiffViewer from './CodeDiffViewer.vue'
import { validatePluginCode, formatPluginCode } from '@/api/plugin'

const MONACO_FONT = "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, Monaco, 'Source Code Pro', ui-monospace, monospace"

const props = withDefaults(
  defineProps<{
    modelValue?: string
    savedCode?: string
    codeFileName?: string
    pluginClass?: number
    showPlaceholder?: boolean
    placeholderMessage?: string
    templateLabel?: string
    readonly?: boolean
  }>(),
  {
    modelValue: '',
    savedCode: '',
    codeFileName: 'main.py',
    pluginClass: 1,
    showPlaceholder: false,
    placeholderMessage: '',
    templateLabel: '',
    readonly: false,
  },
)

const emit = defineEmits<{
  'update:modelValue': [val: string]
  'update:codeFileName': [val: string]
  'validation-change': [
    val: { status: 'pending' | 'passed' | 'failed'; errorCount: number; message?: string },
  ]
}>()

const { t } = useI18n()
const defaultTemplate = computed(() => t('create.editor.defaultTemplate'))
const editorCode = computed(() => props.modelValue || defaultTemplate.value)
const savedEditorCode = computed(() => props.savedCode || defaultTemplate.value)
const resolvedPlaceholderMessage = computed(() => props.placeholderMessage || t('create.editor.placeholderSelectSkillCategory'))

const editorContainerRef = ref<HTMLDivElement | null>(null)
let editor: import('monaco-editor').editor.IStandaloneCodeEditor | null = null
let monaco: typeof import('monaco-editor') | null = null

const isDirty = computed(() => editorCode.value !== savedEditorCode.value)
const draftStatus = computed<'unsaved' | 'saved'>(() => (isDirty.value ? 'unsaved' : 'saved'))

const validateStatus = ref<'' | 'success' | 'fail'>('')
const validateErrorCount = ref(0)
const issues = ref<CodeIssue[]>([])
const activeTab = ref<'issues' | 'diff'>('issues')
const showDiffView = ref(false)
const fullscreen = ref(false)
const validating = ref(false)
const formatting = ref(false)

const baselineCode = computed(() => savedEditorCode.value)

const initEditor = async () => {
  if (!editorContainerRef.value || props.showPlaceholder) return
  monaco = await import('monaco-editor')
  if (!editorContainerRef.value || props.showPlaceholder) return
  editor = monaco.editor.create(editorContainerRef.value, {
    value: editorCode.value,
    language: 'python',
    lineNumbers: 'on',
    minimap: { enabled: false },
    folding: true,
    wordWrap: 'on',
    fontSize: 14,
    lineHeight: 22,
    fontFamily: MONACO_FONT,
    fontWeight: '400',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    theme: 'vs',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    tabSize: 4,
    insertSpaces: true,
    padding: { top: 10 },
    glyphMargin: true,
    lineDecorationsWidth: 10,
    readOnly: props.readonly,
  })
  editor.getModel()?.onDidChangeContent(() => {
    const val = editor?.getValue() || ''
    emit('update:modelValue', val)
  })
  if (props.readonly && editor) {
    editor.onDidFocusEditorText(() => {
      const el = document.activeElement as HTMLElement | null
      if (el?.blur) el.blur()
    })
  }
}

interface IssueWithRange extends CodeIssue {
  endLine?: number
  endColumn?: number
}

const setMarkers = (list: IssueWithRange[]) => {
  if (!monaco || !editor) return
  const model = editor.getModel()
  if (!model) return
  const markers: import('monaco-editor').editor.IMarkerData[] = list.map((i) => ({
    severity: i.severity === 'error' ? monaco!.MarkerSeverity.Error : monaco!.MarkerSeverity.Warning,
    startLineNumber: i.line,
    startColumn: i.column,
    endLineNumber: i.endLine || i.line,
    endColumn: i.endColumn || i.column + 1,
    message: i.message,
  }))
  monaco.editor.setModelMarkers(model, 'validator', markers)
}

const clearMarkers = () => {
  if (!monaco || !editor) return
  const model = editor.getModel()
  if (model) monaco.editor.setModelMarkers(model, 'validator', [])
}

const doValidate = async () => {
  const pluginClass = Math.min(5, Math.max(1, props.pluginClass || 1))
  const codeFileName = (props.codeFileName || 'main.py').trim() || 'main.py'
  const codeContent = editorCode.value
  validating.value = true
  clearMarkers()
  try {
    const res = await validatePluginCode({
      pluginClass,
      codeFileName,
      codeContent,
    })
    const data = res.data
    if (!data) {
      const message = t('create.editor.validationNoData')
      validateStatus.value = 'fail'
      validateErrorCount.value = 1
      emit('validation-change', { status: 'failed', errorCount: 1, message })
      issues.value = [{ severity: 'error', line: 1, column: 1, message }]
      setMarkers(issues.value)
      activeTab.value = 'issues'
      return
    }
    const list: IssueWithRange[] = (data.issues || []).map((i) => ({
      severity: (i.severity === 'warning' ? 'warning' : 'error') as 'error' | 'warning',
      line: i.line || 1,
      column: i.column || 1,
      message: i.message || '',
      endLine: i.endLine,
      endColumn: i.endColumn,
    }))
    issues.value = list
    validateStatus.value = data.passed ? 'success' : 'fail'
    validateErrorCount.value = data.summary?.errorCount || list.filter((x) => x.severity === 'error').length
    const firstErr = list.find((x) => x.severity === 'error')
    const warnN = data.summary?.warningCount ?? list.filter((x) => x.severity === 'warning').length
    const message = data.passed
      ? ''
      : firstErr?.message ||
        t('create.editor.staticCheckFailed', {
          errors: validateErrorCount.value,
          warnings: warnN,
        })
    emit('validation-change', {
      status: data.passed ? 'passed' : 'failed',
      errorCount: validateErrorCount.value,
      message,
    })
    if (list.length > 0) setMarkers(list)
    else clearMarkers()
    activeTab.value = 'issues'
  } catch (e: any) {
    const msg = e?.message || t('create.editor.validationRequestFailed')
    validateStatus.value = 'fail'
    validateErrorCount.value = 1
    emit('validation-change', { status: 'failed', errorCount: 1, message: msg })
    issues.value = [{ severity: 'error', line: 1, column: 1, message: msg }]
    setMarkers(issues.value)
    activeTab.value = 'issues'
    ElMessage({ message: msg, type: 'error', duration: 3000 })
  } finally {
    validating.value = false
  }
}

const doFormat = async () => {
  if (props.showPlaceholder || !editor) {
    ElMessage({ message: t('create.editor.formatSelectCategoryFirst'), type: 'warning', duration: 2500 })
    return
  }
  const codeFileName = (props.codeFileName || 'main.py').trim() || 'main.py'
  if (!codeFileName.toLowerCase().endsWith('.py')) {
    ElMessage({ message: t('create.editor.onlyPySupported'), type: 'warning', duration: 2500 })
    return
  }
  const originalCode = editorCode.value
  formatting.value = true
  try {
    const res = await formatPluginCode({ codeFileName, codeContent: originalCode })
    const formatted = res?.data?.formattedCode
    const isValidFormatted = typeof formatted === 'string' && formatted.length > 0
    if (res && res.code === 0 && isValidFormatted) {
      const changed = formatted !== originalCode
      editor.setValue(formatted)
      emit('update:modelValue', formatted)
      if (changed) {
        ElMessage({ message: t('create.editor.formatSuccess'), type: 'success', duration: 2000, customClass: 'create-plugin-format-message' })
      } else {
        ElMessage({ message: t('create.editor.formatNoChange'), type: 'info', duration: 2000, customClass: 'create-plugin-format-message' })
      }
    } else if (!isValidFormatted && res?.code === 0) {
      ElMessage({ message: t('create.editor.formatNoCode'), type: 'error', duration: 3000 })
    } else {
      ElMessage({ message: (res as any)?.message || t('create.editor.formatFailed'), type: 'error', duration: 3000 })
    }
  } catch (e: any) {
    ElMessage({ message: e?.message || t('create.editor.formatRequestFailed'), type: 'error', duration: 3000 })
  } finally {
    formatting.value = false
  }
}

const gotoLine = (line: number) => {
  if (!editor) return
  editor.revealLineInCenter(line)
  editor.setPosition({ lineNumber: line, column: 1 })
  editor.focus()
}

const toggleDiff = () => {
  showDiffView.value = !showDiffView.value
  if (showDiffView.value) activeTab.value = 'diff'
}

const toggleFullscreen = () => {
  fullscreen.value = !fullscreen.value
}

watch(
  () => props.modelValue,
  (val) => {
    if (editor && editor.getValue() !== (val || defaultTemplate.value)) {
      editor.setValue(val || defaultTemplate.value)
    }
  },
)

watch(
  () => props.readonly,
  (readOnly) => {
    if (editor) editor.updateOptions({ readOnly: !!readOnly })
  },
)

onMounted(() => {
  nextTick(() => {
    if (props.showPlaceholder) return
    initEditor().then(() => {
      if (editor && editor.getValue() !== editorCode.value) editor.setValue(editorCode.value)
    })
  })
})

watch(
  () => props.showPlaceholder,
  (show) => {
    if (show && editor) {
      editor.dispose()
      editor = null
    } else if (!show && !editor) {
      nextTick(() => {
        initEditor().then(() => {
          if (editor && editor.getValue() !== editorCode.value) editor.setValue(editorCode.value)
        })
      })
    }
  },
)

onBeforeUnmount(() => {
  if (editor) {
    editor.dispose()
    editor = null
  }
  monaco = null
})
</script>

<template>
  <div class="code-editor-panel" :class="{ 'code-editor-panel--fullscreen': fullscreen }">
    <div v-if="!readonly" class="panel-toolbar">
      <EditorToolbar
        :filename="codeFileName"
        language-tag="Python"
        :draft-status="draftStatus"
        :validate-status="validateStatus"
        :validate-error-count="validateErrorCount"
        :diff-visible="showDiffView"
        :fullscreen="fullscreen"
        :template-label="templateLabel"
        :format-loading="formatting || validating"
        @update:filename="emit('update:codeFileName', $event)"
        @format="doFormat"
        @validate="doValidate"
        @toggle-diff="toggleDiff"
        @fullscreen="toggleFullscreen"
      />
    </div>
    <div class="panel-editor-wrap">
      <div v-if="showPlaceholder" class="panel-editor-placeholder">
        {{ resolvedPlaceholderMessage }}
      </div>
      <div v-else ref="editorContainerRef" class="panel-editor" />
    </div>
    <div v-if="!readonly" class="panel-tabs">
      <div class="tabs-header">
        <button
          type="button"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'issues' }"
          @click="activeTab = 'issues'"
        >
          {{ t('create.editor.issues') }}
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'tab-btn--active': activeTab === 'diff' }"
          @click="showDiffView = true; activeTab = 'diff'"
        >
          {{ t('create.editor.codeDiff') }}
        </button>
      </div>
      <div class="tabs-body">
        <div v-show="activeTab === 'issues'" class="tab-pane">
          <CodeIssuePanel :issues="issues" @goto-line="gotoLine" />
        </div>
        <div v-show="activeTab === 'diff'" class="tab-pane">
          <CodeDiffViewer
            :original="baselineCode"
            :modified="editorCode"
            :visible="activeTab === 'diff'"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code-editor-panel {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.code-editor-panel--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 9999;
  border-radius: 0;
  border: none;
}

.panel-toolbar {
  flex-shrink: 0;
}

.panel-editor-wrap {
  flex: 0 0 auto;
  min-height: 480px;
  height: 480px;
  overflow: hidden;
}

.code-editor-panel--fullscreen .panel-editor-wrap {
  min-height: 50vh;
  height: 50vh;
}

.panel-editor,
.panel-editor-placeholder {
  width: 100%;
  height: 100%;
  min-height: 480px;
}

.panel-editor-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 14px;
  background: #fafafa;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

.panel-tabs {
  flex-shrink: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tabs-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 40px;
  background: #f9fafb;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.tab-btn {
  height: 32px;
  padding: 0 14px;
  font-size: 13px;
  color: #6b7280;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.18s ease;
}
.tab-btn:hover {
  color: #374151;
  background: rgba(0, 0, 0, 0.04);
}
.tab-btn--active {
  color: #111827;
  font-weight: 500;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.tabs-body {
  min-height: 180px;
  max-height: 280px;
  overflow: auto;
  background: #fafafa;
}

.tab-pane {
  padding: 0 12px 12px;
}
</style>
