export type NotificationType = 'success' | 'error' | 'warning'

/** Shared durations for toasts and inline status hints. */
export const NOTIFICATION_DURATION_MS = {
  success: 2400,
  error: 3200,
  warning: 3600,
} as const

export interface NotificationItem {
  id: string
  type: NotificationType
  message: string
  duration: number
  createdAt: number
}
