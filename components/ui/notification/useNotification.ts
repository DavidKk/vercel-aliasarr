'use client'

import { useCallback, useMemo } from 'react'

import { useNotificationContext } from './NotificationProvider'
import { NOTIFICATION_DURATION_MS } from './types'

export function useNotification() {
  const { notify } = useNotificationContext()

  const success = useCallback((message: string, duration = NOTIFICATION_DURATION_MS.success) => notify('success', message, duration), [notify])
  const error = useCallback((message: string, duration = NOTIFICATION_DURATION_MS.error) => notify('error', message, duration), [notify])
  const warning = useCallback((message: string, duration = NOTIFICATION_DURATION_MS.warning) => notify('warning', message, duration), [notify])

  return useMemo(() => ({ success, error, warning }), [success, error, warning])
}
