export const CONTROL_LABEL_CLASS = 'font-mono text-[0.66rem] font-medium uppercase tracking-[0.16em] text-app-muted'
export const CONTROL_HELPER_CLASS = 'text-xs text-app-muted'
export const CONTROL_ERROR_CLASS = 'text-xs text-app-danger'

export const CONTROL_CLASS = [
  'w-full',
  'min-h-12',
  'border',
  'border-app-border',
  'bg-app-bg/60',
  'px-3.5',
  'py-3',
  'text-sm',
  'text-app-text',
  'outline-none',
  'transition',
  'placeholder:text-app-muted/50',
  'hover:border-app-muted/70',
  'focus:border-app-accent',
  'focus:ring-4',
  'focus:ring-app-accent/10',
  'disabled:cursor-not-allowed',
  'disabled:opacity-60',
].join(' ')

export const CONTROL_RADIUS = 'rounded-xl'
/** Square control mark (checkbox). Avoid CONTROL_RADIUS — xl on 16px looks circular. */
export const CONTROL_MARK_RADIUS = 'rounded-sm'

/** Menu radius biased away from the trigger edge. */
export function dropdownMenuRadius(placement: 'bottom' | 'top'): string {
  return placement === 'top' ? 'rounded-t-xl rounded-b-md' : 'rounded-b-xl rounded-t-md'
}
