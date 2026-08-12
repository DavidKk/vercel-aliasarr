'use client'

import { FiHelpCircle } from 'react-icons/fi'

import { Tooltip } from './Tooltip'

export function FieldHint({ content }: { content: string }) {
  return (
    <Tooltip content={content} placement="top">
      <button
        type="button"
        className="inline-grid h-4 w-4 place-items-center rounded-sm text-app-muted transition hover:text-app-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-app-accent"
        aria-label="More information"
      >
        <FiHelpCircle className="h-3.5 w-3.5" aria-hidden />
      </button>
    </Tooltip>
  )
}
