import { useEffect, useState, type KeyboardEvent } from 'react'
import { Bell, TriangleAlert, Warehouse } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { dashboardService } from '@/services/dashboard.service'
import type { AlertSummary } from '@/types'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { DashboardLinkRow, DashboardStatCard } from '@/components/dashboard/dashboard-stat-card'
import { cn } from '@/lib/utils'

export const DashboardPage = () => {
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const canViewItems = hasPermission(user?.role, 'items.read', user?.permissions)
  const canViewCategories = hasPermission(user?.role, 'categories.read', user?.permissions)
  const canViewAlerts = hasPermission(user?.role, 'alerts.read', user?.permissions)
  const canViewReports = hasPermission(user?.role, 'reports.read', user?.permissions)
  const canViewSales = hasPermission(user?.role, 'sales.read', user?.permissions)
  const canViewPurchases = hasPermission(user?.role, 'purchases.read', user?.permissions)
  const canViewParties = hasPermission(user?.role, 'parties.read', user?.permissions)

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalItems: 0,
    categories: 0,
    lowStockItems: 0,
    recentItems: 0,
  })
  const [commerce, setCommerce] = useState({
    sales: 0,
    purchases: 0,
    parties: 0,
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
    void dashboardService
      .load({
        includeSales: canViewSales,
        includePurchases: canViewPurchases,
        includeParties: canViewParties,
      })
      .then((data) => {
        setSummary(data.inventory)
        setAlerts(data.alerts)
        setCommerce(data.commerce)
      })
      .finally(() => setLoading(false))
  }, [canViewSales, canViewPurchases, canViewParties])

  const goInventory = (query?: string) => {
    if (!canViewItems) return
    navigate(query ? `/admin/inventory?${query}` : '/admin/inventory')
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Click a card to open the related module.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Total Items"
          value={summary.totalItems}
          hint={canViewItems ? 'Open inventory list' : undefined}
          onClick={() => goInventory()}
          disabled={!canViewItems}
        />
        <DashboardStatCard
          label="Categories"
          value={summary.categories}
          hint={canViewCategories ? 'Open categories' : undefined}
          onClick={() => navigate('/admin/categories')}
          disabled={!canViewCategories}
        />
        <DashboardStatCard
          label="Low Stock Items"
          value={summary.lowStockItems}
          valueClassName="text-amber-600"
          hint={canViewItems ? 'View low stock filter' : undefined}
          onClick={() => goInventory('lowStock=1')}
          disabled={!canViewItems}
        />
        <DashboardStatCard
          label="Recent Items"
          value={summary.recentItems}
          hint={canViewReports ? 'Open reports' : canViewItems ? 'Open inventory' : undefined}
          onClick={() => navigate(canViewReports ? '/admin/reports' : '/admin/inventory')}
          disabled={!canViewReports && !canViewItems}
        />
      </div>

      {(canViewSales || canViewPurchases || canViewParties) && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Commerce</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {canViewSales ? (
              <DashboardStatCard
                label="Sales"
                value={commerce.sales}
                hint="Open sales list"
                onClick={() => navigate('/admin/sales')}
              />
            ) : null}
            {canViewPurchases ? (
              <DashboardStatCard
                label="Purchases"
                value={commerce.purchases}
                hint="Open purchases list"
                onClick={() => navigate('/admin/purchases')}
              />
            ) : null}
            {canViewParties ? (
              <DashboardStatCard
                label="Parties"
                value={commerce.parties}
                hint="Open parties list"
                onClick={() => navigate('/admin/parties')}
              />
            ) : null}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card
          className={cn(
            'space-y-4 p-5 transition',
            canViewAlerts &&
              'cursor-pointer hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
          )}
          role={canViewAlerts ? 'button' : undefined}
          tabIndex={canViewAlerts ? 0 : undefined}
          onClick={canViewAlerts ? () => navigate('/admin/alerts') : undefined}
          onKeyDown={
            canViewAlerts
              ? (event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate('/admin/alerts')
                  }
                }
              : undefined
          }
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Alerts</p>
              <h2 className="text-lg font-semibold text-slate-900">Operational risk snapshot</h2>
            </div>
            <Button
              variant="outline"
              disabled={!canViewAlerts}
              onClick={(event) => {
                event.stopPropagation()
                navigate('/admin/alerts')
              }}
            >
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
              <p className="flex items-center gap-2 text-sm text-red-700">
                <TriangleAlert className="h-4 w-4" />
                Critical
              </p>
              <p className="text-2xl font-semibold text-red-700">{alerts.critical}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <Warehouse className="h-4 w-4" />
                Overstock
              </p>
              <p className="text-2xl font-semibold text-emerald-700">{alerts.overstock}</p>
            </div>
          </div>
        </Card>

        <Card className="space-y-3 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Rule mix</p>
          <div className="space-y-1">
            <DashboardLinkRow
              label="Low stock"
              value={alerts.lowStock}
              onClick={() => goInventory('lowStock=1')}
              disabled={!canViewItems}
            />
            <DashboardLinkRow
              label="Expiry"
              value={alerts.expiry}
              onClick={() => goInventory('expired=1')}
              disabled={!canViewItems}
            />
            <DashboardLinkRow
              label="Warnings"
              value={alerts.warning}
              onClick={() => navigate('/admin/alerts')}
              disabled={!canViewAlerts}
            />
            <DashboardLinkRow
              label="Active alerts"
              value={alerts.total}
              onClick={() => navigate('/admin/alerts')}
              disabled={!canViewAlerts}
            />
          </div>
        </Card>
      </div>
    </div>
  )
}
