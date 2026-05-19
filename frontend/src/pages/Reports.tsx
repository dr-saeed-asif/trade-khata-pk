import { useEffect, useMemo, useState } from 'react'
import { qrCodeToDataUrl } from '@/lib/qr-code'
import { inventoryService } from '@/services/inventory.service'
import type { MoversReport, MovementTrendReport, ProfitLossReport } from '@/services/inventory.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/ui/filter-bar'
import { selectClass } from '@/lib/form-styles'
import { useToast } from '@/hooks/use-toast'
import { currency } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'

export const ReportsPage = () => {
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const canExport = hasPermission(user?.role, 'reports.export', user?.permissions)
  const [loading, setLoading] = useState(false)
  const [days, setDays] = useState(30)
  const [reportLoading, setReportLoading] = useState(false)
  const [trend, setTrend] = useState<MovementTrendReport | null>(null)
  const [movers, setMovers] = useState<MoversReport | null>(null)
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null)

  const loadAnalytics = async (windowDays: number) => {
    setReportLoading(true)
    try {
      const [trendData, moversData, profitLossData] = await Promise.all([
        inventoryService.movementTrendReport(windowDays),
        inventoryService.moversReport(windowDays),
        inventoryService.profitLossReport(windowDays),
      ])
      setTrend(trendData)
      setMovers(moversData)
      setProfitLoss(profitLossData)
    } catch (error) {
      toast({
        title: 'Report load failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setReportLoading(false)
    }
  }

  useEffect(() => {
    void loadAnalytics(days)
  }, [days])

  const exportCsv = async () => {
    setLoading(true)
    try {
      const blob = await inventoryService.exportCsvFromApi()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'inventory-report.csv'
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = async () => {
    setLoading(true)
    try {
      const blob = await inventoryService.exportExcelFromApi()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'inventory-report.xlsx'
      anchor.click()
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  const exportQrs = async () => {
    const response = await inventoryService.list({ page: 1, pageSize: 50 })
    for (const item of response.data) {
      const dataUrl = await qrCodeToDataUrl(item.qrValue)
      const anchor = document.createElement('a')
      anchor.href = dataUrl
      anchor.download = `${item.sku}.png`
      anchor.click()
    }
  }

  const trendSparkline = useMemo(() => {
    if (!trend?.series.length) return ''
    const values = trend.series.map((row) => row.total)
    const max = Math.max(...values, 1)
    return values.map((value) => '▁▂▃▄▅▆▇█'[Math.min(7, Math.floor((value / max) * 7))]).join('')
  }, [trend])

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Reports</h2>
            <p className="mt-0.5 text-sm text-slate-500">Analytics and inventory exports</p>
          </div>
          <FilterBar className="w-full max-w-md border-0 bg-transparent p-0 shadow-none sm:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-sm font-medium text-slate-600" htmlFor="days-window">
                Window
              </label>
              <select
                id="days-window"
                value={days}
                onChange={(event) => setDays(Number(event.target.value))}
                className={selectClass}
              >
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={180}>Last 180 days</option>
              </select>
              <Button variant="outline" className="h-11" onClick={() => void loadAnalytics(days)} disabled={reportLoading}>
                {reportLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </FilterBar>
        </div>
        {canExport ? (
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportCsv} disabled={loading}>
              {loading ? 'Exporting...' : 'Export Inventory CSV'}
            </Button>
            <Button variant="outline" onClick={exportExcel} disabled={loading}>
              Export Inventory Excel
            </Button>
            <Button variant="outline" onClick={exportQrs}>
              Export QR Codes
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4 p-5">
        <h3 className="text-base font-semibold text-slate-900">Stock Movement Trend</h3>
        <p className="text-sm text-slate-600">
          {trend?.series.length ?? 0} day(s) with movement in selected window.
        </p>
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-6 text-center">
          <p className="font-mono text-2xl tracking-wide text-slate-600">{trendSparkline || '—'}</p>
          {!trendSparkline ? (
            <p className="mt-2 text-sm text-slate-500">No movement data yet</p>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Profit</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              {currency(profitLoss?.grossProfit ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Fast movers</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{movers?.fastMoving.length ?? 0}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
