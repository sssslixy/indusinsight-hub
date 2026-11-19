<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

const props = withDefaults(
  defineProps<{
    original?: string
    modified?: string
    visible?: boolean
  }>(),
  { original: '', modified: '', visible: false }
)

const containerRef = ref<HTMLDivElement | null>(null)
let diffEditor: import('monaco-editor').editor.IStandaloneDiffEditor | null = null
let monaco: typeof import('monaco-editor') | null = null

const noDiff = ref(false)
const { t } = useI18n()

const initEditor = async () => {
  if (!containerRef.value || !props.visible) return
  monaco = await import('monaco-editor')
  if (!containerRef.value) return
  diffEditor = monaco.editor.createDiffEditor(containerRef.value, {
    readOnly: true,
    renderSideBySide: true,
    enableSplitViewResizing: true,
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, Menlo, Monaco, 'Source Code Pro', ui-monospace, monospace",
    lineNumbers: 'on',
    minimap: { enabled: false },
    folding: true,
    wordWrap: 'on',
    automaticLayout: true,
    theme: 'vs',
    renderOverviewRuler: true,
  })
  diffEditor.setModel({
    original: monaco.editor.createModel(props.original, 'python'),
    modified: monaco.editor.createModel(props.modified, 'python'),
  })
}

const setModels = () => {
  if (!monaco || !diffEditor) return
  diffEditor.setModel({
    original: monaco.editor.createModel(props.original || '', 'python'),
    modified: monaco.editor.createModel(props.modified || '', 'python'),
  })
}

const destroyEditor = () => {
  if (diffEditor) {
    diffEditor.getModel()?.original?.dispose()
    diffEditor.getModel()?.modified?.dispose()
    diffEditor.dispose()
    diffEditor = null
  }
  monaco = null
}

watch(
  () => [props.visible, props.original, props.modified] as const,
  ([visible, orig, mod]) => {
    if (visible && orig === mod) {
      noDiff.value = true
      destroyEditor()
      return
    }
    noDiff.value = false
    if (visible) {
      if (diffEditor) setModels()
      else nextTick(() => initEditor())
    } else {
      destroyEditor()
    }
  }
)

onMounted(() => {
  if (props.visible && props.original !== props.modified && containerRef.value) {
    noDiff.value = false
    initEditor()
  } else if (props.visible && props.original === props.modified) {
    noDiff.value = true
  }
})

onBeforeUnmount(() => {
  destroyEditor()
})
</script>

<template>
  <div class="code-diff-viewer">
    <div v-if="visible && noDiff" class="diff-empty">
      {{ t('create.editor.noCodeDiff') }}
    </div>
    <div
      v-else-if="visible"
      ref="containerRef"
      class="diff-editor-container"
    />
  </div>
</template>

<style scoped>
.code-diff-viewer {
  min-height: 240px;
  background: #fafafa;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 8px;
  overflow: hidden;
}

.diff-empty {
  padding: 48px 16px;
  text-align: center;
  font-size: 14px;
  color: #6b7280;
}

.diff-editor-container {
  height: 320px;
  width: 100%;
}
</style>
