import { useEffect, useState } from 'react'
import { Bell, TriangleAlert, Warehouse } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { inventoryService } from '@/services/inventory.service'
import { alertsService } from '@/services/alerts.service'
import type { AlertSummary } from '@/types'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

export const DashboardPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalItems: 0,
    categories: 0,
    lowStockItems: 0,
    recentItems: 0,
  })
  const [alerts, setAlerts] = useState<AlertSummary>({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0,
    info: 0,
    lowStock: 0,
    expiry: 0,
    overstock: 0,
  })

  useEffect(() => {
    Promise.all([inventoryService.summary(), alertsService.summary()])
      .then(([inventorySummary, alertSummary]) => {
        setSummary(inventorySummary)
        setAlerts(alertSummary)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><p className="text-sm text-slate-500">Total Items</p><p className="text-3xl font-semibold text-slate-900">{summary.totalItems}</p></Card>
        <Card><p className="text-sm text-slate-500">Categories</p><p className="text-3xl font-semibold text-slate-900">{summary.categories}</p></Card>
        <Card><p className="text-sm text-slate-500">Low Stock Items</p><p className="text-3xl font-semibold text-amber-600">{summary.lowStockItems}</p></Card>
        <Card><p className="text-sm text-slate-500">Recent Items</p><p className="text-3xl font-semibold text-slate-900">{summary.recentItems}</p></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Alerts</p>
              <h2 className="text-lg font-semibold text-slate-900">Operational risk snapshot</h2>
            </div>
            <Button variant="outline" onClick={() => navigate('/admin/alerts')}>
              <Bell className="h-4 w-4" />
              Open alerts
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Unread</p>
              <p className="text-2xl font-semibold text-slate-900">{alerts.unread}</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="flex items-center gap-2 text-sm text-red-700"><TriangleAlert className="h-4 w-4" />Critical</p>
              <p className="text-2xl font-semibold text-red-700">{alerts.critical}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm text-emerald-700"><Warehouse className="h-4 w-4" />Overstock</p>
              <p className="text-2xl font-semibold text-emerald-700">{alerts.overstock}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Rule mix</p>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-center justify-between">
              <span>Low stock</span>
              <span className="font-semibold">{alerts.lowStock}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Expiry</span>
              <span className="font-semibold">{alerts.expiry}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Warnings</span>
              <span className="font-semibold">{alerts.warning}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active alerts</span>
              <span className="font-semibold">{alerts.total}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
