import type { ButtonHTMLAttributes, ReactNode } from 'react'

export interface ToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'role'> {
  checked: boolean
  label: ReactNode
  helperText?: ReactNode
  onChange(checked: boolean): void
}

export function Toggle({ checked, label, helperText, className = '', disabled, onChange, ...props }: ToggleProps) {
  return (
    <button
      {...props}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={`group flex items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      onClick={() => onChange(!checked)}
    >
      <span className={`relative h-6 w-11 shrink-0 rounded-full border transition ${checked ? 'border-app-accent bg-app-accent' : 'border-app-border bg-app-surface'}`}>
        <span
          className={`absolute top-0.5 h-[1.125rem] w-[1.125rem] rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[1.25rem]' : 'translate-x-0.5'}`}
        />
      </span>
      <span>
        <span className="block text-xs font-semibold text-app-ink">{label}</span>
        {helperText ? <span className="mt-0.5 block text-[0.62rem] text-app-muted">{helperText}</span> : null}
      </span>
    </button>
  )
}
