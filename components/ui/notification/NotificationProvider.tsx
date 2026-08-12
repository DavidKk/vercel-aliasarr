'use client'

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FiAlertTriangle, FiCheckCircle, FiX, FiXCircle } from 'react-icons/fi'

import { CONTROL_RADIUS } from '../controlStyles'
import { NOTIFICATION_DURATION_MS, type NotificationItem, type NotificationType } from './types'

interface NotificationContextValue {
  notify: (type: NotificationType, message: string, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

const STACK_CLASS = 'pointer-events-none fixed inset-x-3 top-4 z-[1100] flex w-auto flex-col gap-2 sm:inset-x-auto sm:right-4 sm:top-5 sm:w-[min(calc(100vw-2rem),20rem)]'

const ITEM_CLASS = [
  'pointer-events-auto flex items-center gap-2.5 border border-app-border/80 bg-app-surface px-3 py-2.5',
  'shadow-[0_16px_40px_rgb(0_0_0/0.35)] transition duration-200 ease-out',
  CONTROL_RADIUS,
].join(' ')

const CLOSE_CLASS =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-app-muted transition hover:bg-app-subtle hover:text-app-ink'

function createNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function NotificationToast({ notification, onClose }: { notification: NotificationItem; onClose: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  const Icon = notification.type === 'success' ? FiCheckCircle : notification.type === 'warning' ? FiAlertTriangle : FiXCircle
  const iconClass = notification.type === 'success' ? 'text-app-success' : notification.type === 'warning' ? 'text-app-warning' : 'text-app-danger'

  return (
    <div className={[ITEM_CLASS, visible ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'].join(' ')} role="status" aria-live="polite">
      <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
      <span className="min-w-0 flex-1 text-sm text-app-text">{notification.message}</span>
      <button type="button" className={CLOSE_CLASS} onClick={onClose} aria-label="Dismiss notification">
        <FiX className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}

function NotificationHost({ notifications, onRemove }: { notifications: NotificationItem[]; onRemove: (id: string) => void }) {
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    notifications.forEach((notification) => {
      if (timeoutRefs.current.has(notification.id)) return

      const timeout = setTimeout(() => {
        onRemove(notification.id)
        timeoutRefs.current.delete(notification.id)
      }, notification.duration)

      timeoutRefs.current.set(notification.id, timeout)
    })

    const activeIds = new Set(notifications.map((item) => item.id))
    timeoutRefs.current.forEach((timeout, id) => {
      if (activeIds.has(id)) return
      clearTimeout(timeout)
      timeoutRefs.current.delete(id)
    })
  }, [notifications, onRemove])

  useEffect(
    () => () => {
      timeoutRefs.current.forEach((timeout) => clearTimeout(timeout))
      timeoutRefs.current.clear()
    },
    []
  )

  if (notifications.length === 0) return null

  return createPortal(
    <div className={STACK_CLASS}>
      {notifications.map((notification) => (
        <NotificationToast key={notification.id} notification={notification} onClose={() => onRemove(notification.id)} />
      ))}
    </div>,
    document.body
  )
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback((type: NotificationType, message: string, duration?: number) => {
    const resolvedDuration =
      duration ?? (type === 'error' ? NOTIFICATION_DURATION_MS.error : type === 'warning' ? NOTIFICATION_DURATION_MS.warning : NOTIFICATION_DURATION_MS.success)
    const item: NotificationItem = {
      id: createNotificationId(),
      type,
      message,
      duration: resolvedDuration,
      createdAt: Date.now(),
    }
    setNotifications((prev) => [...prev, item].slice(-4))
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {typeof document !== 'undefined' ? <NotificationHost notifications={notifications} onRemove={removeNotification} /> : null}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext)
  if (!context) throw new Error('useNotificationContext must be used within NotificationProvider')
  return context
}
