import { useCallback, useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { stockService, type StockMovement } from '@/services/stock.service'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'

type OperationType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'

const OPERATIONS: OperationType[] = ['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT']

export const StockOperationsPage = () => {
  const user = useAuthStore((state) => state.user)
  const canWriteStock = hasPermission(user?.role, 'stock.write', user?.permissions)
  const [activeOperation, setActiveOperation] = useState<OperationType>('IN')
  const [itemId, setItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [history, setHistory] = useState<StockMovement[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const loadHistory = useCallback(async (type: OperationType) => {
    setLoadingHistory(true)
    try {
      setHistory(await stockService.history({ type }))
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory(activeOperation)
  }, [activeOperation, loadHistory])

  const execute = async () => {
    if (!itemId || quantity <= 0) {
      toast({ title: 'Item ID and quantity are required', variant: 'error' })
      return
    }
    setSubmitting(true)
    try {
      if (activeOperation === 'IN') await stockService.in({ itemId, quantity })
      if (activeOperation === 'OUT') await stockService.out({ itemId, quantity })
      if (activeOperation === 'TRANSFER')
        await stockService.transfer({
          itemId,
          quantity,
          sourceWarehouse: 'WH-A',
          destinationWarehouse: 'WH-B',
        })
      if (activeOperation === 'ADJUSTMENT')
        await stockService.adjustment({ itemId, quantity, reason: 'MANUAL' })
      toast({ title: `${activeOperation} operation completed` })
      await loadHistory(activeOperation)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Stock Operations</h2>
        <div className="flex flex-wrap gap-2">
          {OPERATIONS.map((operation) => (
            <Button
              key={operation}
              type="button"
              variant={activeOperation === operation ? 'default' : 'outline'}
              onClick={() => setActiveOperation(operation)}
            >
              {operation}
            </Button>
          ))}
        </div>
        {canWriteStock ? (
          <>
            <div className="grid gap-2 md:grid-cols-2">
              <Input
                placeholder={formPlaceholders.stock.itemId}
                value={itemId}
                onChange={(event) => setItemId(event.target.value)}
              />
              <Input
                type="number"
                placeholder={formPlaceholders.stock.quantity}
                value={String(quantity)}
                onChange={(event) => setQuantity(Number(event.target.value || 0))}
              />
            </div>
            <Button type="button" disabled={submitting} onClick={() => void execute()}>
              {submitting ? 'Processing...' : `Run ${activeOperation}`}
            </Button>
          </>
        ) : null}
      </Card>
      <Card className="space-y-3">
        <h3 className="text-base font-semibold">Stock History</h3>
        <p className="text-sm text-slate-500">Showing {activeOperation} movements only</p>
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          {loadingHistory ? (
            <Spinner />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2">Type</th>
                  <th className="py-2">Item</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No {activeOperation} records found
                    </td>
                  </tr>
                ) : (
                  history.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="py-2">{entry.type}</td>
                      <td className="py-2">{entry.item?.name ?? entry.itemId}</td>
                      <td className="py-2">{entry.quantity}</td>
                      <td className="py-2">{new Date(entry.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  )
}
