import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, RefreshCcw } from 'lucide-react'
import { alertsService } from '@/services/alerts.service'
import type { Alert, AlertSummary } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const severityStyles: Record<Alert['severity'], string> = {
  INFO: 'border-sky-200 bg-sky-50 text-sky-900',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-900',
  CRITICAL: 'border-red-200 bg-red-50 text-red-900',
}

export const AlertsPage = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<AlertSummary>({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0,
    info: 0,
    lowStock: 0,
    expiry: 0,
    overstock: 0,
  })
  const [alerts, setAlerts] = useState<Alert[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [summaryData, alertData] = await Promise.all([alertsService.summary(), alertsService.list()])
      setSummary(summaryData)
      setAlerts(alertData)
    } catch (error) {
      toast({
        title: 'Unable to load alerts',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const unreadAlerts = useMemo(() => alerts.filter((alert) => !alert.isRead), [alerts])

  const refreshAlerts = async () => {
    setRefreshing(true)
    try {
      await alertsService.refresh()
      await load()
      toast({ title: 'Alerts refreshed', description: 'Inventory rules were re-evaluated.' })
    } catch (error) {
      toast({
        title: 'Refresh failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setRefreshing(false)
    }
  }

  const markRead = async (id: string) => {
    try {
      await alertsService.markRead(id)
      setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, isRead: true, readAt: new Date().toISOString() } : alert)))
      setSummary((current) => ({ ...current, unread: Math.max(0, current.unread - 1) }))
    } catch (error) {
      toast({
        title: 'Unable to update alert',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  const markAllRead = async () => {
    try {
      await alertsService.markAllRead()
      setAlerts((current) => current.map((alert) => ({ ...alert, isRead: true, readAt: new Date().toISOString() })))
      setSummary((current) => ({ ...current, unread: 0 }))
      toast({ title: 'All alerts marked read' })
    } catch (error) {
      toast({
        title: 'Unable to update alerts',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  if (loading) {
    return <Card className="p-6 text-sm text-slate-500">Loading alerts...</Card>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Alerts</p>
              <h1 className="text-2xl font-semibold text-slate-900">Inventory notifications</h1>
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm text-slate-600">
            Low-stock, expiry, and overstock rules are evaluated from live inventory data and surfaced here.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshAlerts} disabled={refreshing}>
            <RefreshCcw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            {refreshing ? 'Refreshing...' : 'Refresh rules'}
          </Button>
          <Button variant="outline" onClick={markAllRead} disabled={summary.unread === 0}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Unread</p><p className="text-3xl font-semibold text-slate-900">{summary.unread}</p></Card>
        <Card><p className="text-sm text-slate-500">Critical</p><p className="text-3xl font-semibold text-red-600">{summary.critical}</p></Card>
        <Card><p className="text-sm text-slate-500">Warnings</p><p className="text-3xl font-semibold text-amber-600">{summary.warning}</p></Card>
        <Card><p className="text-sm text-slate-500">Resolved</p><p className="text-3xl font-semibold text-slate-900">{Math.max(0, summary.total - alerts.length)}</p></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm text-slate-500">Low stock</p><p className="text-2xl font-semibold">{summary.lowStock}</p></Card>
        <Card><p className="text-sm text-slate-500">Expiry</p><p className="text-2xl font-semibold">{summary.expiry}</p></Card>
        <Card><p className="text-sm text-slate-500">Overstock</p><p className="text-2xl font-semibold">{summary.overstock}</p></Card>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          title="No active alerts"
          subtitle="When inventory crosses a threshold, the alert inbox will populate here."
        />
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card key={alert.id} className={cn('border-l-4', severityStyles[alert.severity])}>
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                      {alert.type.replaceAll('_', ' ')}
                    </span>
                    {!alert.isRead ? (
                      <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">
                        New
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900">{alert.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{alert.message}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!alert.isRead ? <Button variant="outline" onClick={() => markRead(alert.id)}>Mark read</Button> : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {unreadAlerts.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {unreadAlerts.length} unread alert{unreadAlerts.length === 1 ? '' : 's'} require attention.
        </div>
      ) : null}
    </div>
  )
}
