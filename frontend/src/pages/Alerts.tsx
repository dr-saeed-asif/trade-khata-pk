import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, RefreshCcw } from 'lucide-react'
import { alertsService } from '@/services/alerts.service'
import type { Alert, AlertSummary } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { ScrollableList } from '@/components/ui/scrollable-list'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/store/auth-store'

const severityStyles: Record<Alert['severity'], string> = {
  INFO: 'border-sky-200 bg-sky-50 text-sky-900',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-900',
  CRITICAL: 'border-red-200 bg-red-50 text-red-900',
}

export const AlertsPage = () => {
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const canReadAlerts = hasPermission(user?.role, 'alerts.read', user?.permissions)
  const canManageAlerts = hasPermission(user?.role, 'alerts.manage', user?.permissions)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<AlertSummary>({ total: 0, unread: 0, critical: 0, warning: 0, info: 0, lowStock: 0, expiry: 0, overstock: 0 })
  const [alerts, setAlerts] = useState<Alert[]>([])

  const load = async () => {
    if (!canReadAlerts) {
      setAlerts([])
      setSummary({ total: 0, unread: 0, critical: 0, warning: 0, info: 0, lowStock: 0, expiry: 0, overstock: 0 })
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [summaryData, alertData] = await Promise.all([alertsService.summary(), alertsService.list()])
      setSummary(summaryData)
      setAlerts(alertData)
    } catch (error) {
      toast({ title: 'Unable to load alerts', description: error instanceof Error ? error.message : 'Please try again.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [canReadAlerts])

  const unreadAlerts = useMemo(() => alerts.filter((alert) => !alert.isRead), [alerts])
  const refreshAlerts = async () => {
    if (!canManageAlerts) return
    setRefreshing(true)
    try {
      await alertsService.refresh()
      await load()
      toast({ title: 'Alerts refreshed', description: 'Inventory rules were re-evaluated.' })
    } finally {
      setRefreshing(false)
    }
  }

  const markRead = async (id: string) => {
    if (!canManageAlerts) return
    await alertsService.markRead(id)
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, isRead: true, readAt: new Date().toISOString() } : alert)))
    setSummary((current) => ({ ...current, unread: Math.max(0, current.unread - 1) }))
  }

  if (!canReadAlerts) return <EmptyState title="Access denied" subtitle="You do not have permission to view alerts." />
  if (loading) return <Card className="p-6 text-sm text-slate-500">Loading alerts...</Card>

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white"><Bell className="h-5 w-5" /></div>
          <div><p className="text-sm uppercase tracking-[0.2em] text-slate-500">Alerts</p><h1 className="text-2xl font-semibold text-slate-900">Inventory notifications</h1></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageAlerts ? (
            <>
              <Button variant="outline" onClick={refreshAlerts} disabled={refreshing}><RefreshCcw className={cn('h-4 w-4', refreshing && 'animate-spin')} />{refreshing ? 'Refreshing...' : 'Refresh rules'}</Button>
              <Button variant="outline" onClick={() => alertsService.markAllRead()} disabled={summary.unread === 0}><CheckCheck className="h-4 w-4" />Mark all read</Button>
            </>
          ) : null}
        </div>
      </div>
      {alerts.length === 0 ? <EmptyState title="No active alerts" subtitle="When inventory crosses a threshold, alerts appear here." /> : (
        <ScrollableList className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className={cn('border-l-4', severityStyles[alert.severity])}>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="text-lg font-semibold text-slate-900">{alert.title}</h3><p className="text-sm text-slate-600">{alert.message}</p></div>
                {canManageAlerts && !alert.isRead ? <Button variant="outline" onClick={() => void markRead(alert.id)}>Mark read</Button> : null}
              </div>
            </Card>
          ))}
        </ScrollableList>
      )}
      {unreadAlerts.length > 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">{unreadAlerts.length} unread alert(s).</div> : null}
    </div>
  )
}

