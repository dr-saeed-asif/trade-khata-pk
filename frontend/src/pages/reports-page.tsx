import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { inventoryService } from '@/services/inventory.service'
import type {
  MoversReport,
  MovementTrendReport,
  ProfitLossReport,
} from '@/services/inventory.service'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { currency } from '@/lib/utils'

export const ReportsPage = () => {
  const { toast } = useToast()
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
      const dataUrl = await QRCode.toDataURL(item.qrValue)
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
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Reports</h2>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-slate-600" htmlFor="days-window">
              Window
            </label>
            <select
              id="days-window"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            >
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={180}>Last 180 days</option>
            </select>
            <Button variant="outline" onClick={() => void loadAnalytics(days)} disabled={reportLoading}>
              {reportLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={exportCsv} disabled={loading}>{loading ? 'Exporting...' : 'Export Inventory CSV'}</Button>
          <Button variant="outline" onClick={exportExcel} disabled={loading}>Export Inventory Excel</Button>
          <Button variant="outline" onClick={exportQrs}>Export QR Codes</Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <p className="text-sm text-slate-500">Stock In</p>
          <p className="text-2xl font-semibold text-emerald-600">{trend?.totals.in ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Stock Out</p>
          <p className="text-2xl font-semibold text-amber-600">{trend?.totals.out ?? 0}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Gross Profit (Proxy)</p>
          <p className="text-2xl font-semibold text-slate-900">{currency(profitLoss?.grossProfit ?? 0)}</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500">Margin</p>
          <p className="text-2xl font-semibold text-sky-700">{profitLoss?.marginPct ?? 0}%</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h3 className="text-base font-semibold">Stock Movement Trend</h3>
        <p className="text-sm text-slate-600">{trend?.series.length ?? 0} day(s) with movement in selected window.</p>
        <p className="font-mono text-lg tracking-wide text-slate-700">{trendSparkline || 'No movement data yet'}</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h3 className="text-base font-semibold">Fast-Moving Items</h3>
          <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Sold</th>
                  <th className="px-3 py-2">On Hand</th>
                </tr>
              </thead>
              <tbody>
                {(movers?.fastMoving ?? []).map((row) => (
                  <tr key={row.itemId} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.name} ({row.sku})</td>
                    <td className="px-3 py-2 font-semibold text-emerald-700">{row.soldQty}</td>
                    <td className="px-3 py-2">{row.onHandQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="space-y-3">
          <h3 className="text-base font-semibold">Slow-Moving Items</h3>
          <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Sold</th>
                  <th className="px-3 py-2">On Hand</th>
                </tr>
              </thead>
              <tbody>
                {(movers?.slowMoving ?? []).map((row) => (
                  <tr key={row.itemId} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.name} ({row.sku})</td>
                    <td className="px-3 py-2 font-semibold text-amber-700">{row.soldQty}</td>
                    <td className="px-3 py-2">{row.onHandQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card className="space-y-2">
        <h3 className="text-base font-semibold">Profit / Loss Report</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm text-slate-500">Revenue (proxy)</p>
            <p className="text-xl font-semibold text-emerald-700">{currency(profitLoss?.revenue ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm text-slate-500">Expense (proxy)</p>
            <p className="text-xl font-semibold text-rose-700">{currency(profitLoss?.expense ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm text-slate-500">Gross Profit</p>
            <p className="text-xl font-semibold text-slate-900">{currency(profitLoss?.grossProfit ?? 0)}</p>
          </div>
        </div>
        <p className="text-xs text-slate-500">{profitLoss?.note}</p>
      </Card>
    </div>
  )
}
