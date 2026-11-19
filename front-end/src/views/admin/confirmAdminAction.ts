import { defineComponent, h, markRaw } from 'vue'
import { ElMessageBox } from 'element-plus'

const WarningIcon = markRaw(
  defineComponent({
    render: () =>
      h('svg', { viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true' }, [
        h('path', {
          d: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18A2 2 0 0 0 3.54 21h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
          stroke: 'currentColor',
          'stroke-width': 1.8,
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
        }),
      ]),
  }),
)

// Keep Element Plus keyboard/focus handling, with the platform's confirmation styling.
export function confirmAdminAction(options: {
  title: string
  message: string
  confirmText: string
  cancelText: string
  subject?: string
  danger?: boolean
}) {
  return ElMessageBox.confirm(
    h('div', [
      options.subject
        ? h('p', { class: 'adm-confirm-subject', title: options.subject }, options.subject)
        : null,
      h('p', options.message),
    ]),
    options.title,
    {
      customClass: `adm-confirm-dialog${options.danger ? ' adm-confirm-danger' : ''}`,
      modalClass: 'adm-dialog-overlay',
      icon: WarningIcon,
      type: 'warning',
      showClose: false,
      confirmButtonText: options.confirmText,
      cancelButtonText: options.cancelText,
    },
  )
}
