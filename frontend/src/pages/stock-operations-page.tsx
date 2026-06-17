import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { stockService, type StockMovement } from '@/services/stock.service'
import { useToast } from '@/hooks/use-toast'

type OperationType = 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'

interface StockFormState {
  itemId: string
  quantity: number
  note: string
  reference: string
  sourceWarehouse: string
  destinationWarehouse: string
  reason: 'DAMAGE' | 'LOSS' | 'RECOUNT' | 'MANUAL'
}

const initialForm: StockFormState = {
  itemId: '',
  quantity: 1,
  note: '',
  reference: '',
  sourceWarehouse: '',
  destinationWarehouse: '',
  reason: 'MANUAL',
}

export const StockOperationsPage = () => {
  const [activeOperation, setActiveOperation] = useState<OperationType>('IN')
  const [form, setForm] = useState<StockFormState>(initialForm)
  const [history, setHistory] = useState<StockMovement[]>([])
  const [historyItemId, setHistoryItemId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const loadHistory = async (itemId?: string) => {
    setHistory(await stockService.history(itemId ? { itemId } : undefined))
  }

  useEffect(() => {
    void loadHistory()
  }, [])

  const execute = async () => {
    if (!form.itemId || form.quantity <= 0) {
      toast({ title: 'Item ID and quantity are required', variant: 'error' })
      return
    }

    setSubmitting(true)
    try {
      if (activeOperation === 'IN') {
        await stockService.in({
          itemId: form.itemId,
          quantity: form.quantity,
          note: form.note || undefined,
          reference: form.reference || undefined,
          destinationWarehouse: form.destinationWarehouse || undefined,
        })
      } else if (activeOperation === 'OUT') {
        await stockService.out({
          itemId: form.itemId,
          quantity: form.quantity,
          note: form.note || undefined,
          reference: form.reference || undefined,
          sourceWarehouse: form.sourceWarehouse || undefined,
        })
      } else if (activeOperation === 'TRANSFER') {
        if (!form.sourceWarehouse || !form.destinationWarehouse) {
          toast({ title: 'Source and destination warehouses are required', variant: 'error' })
          return
        }
        await stockService.transfer({
          itemId: form.itemId,
          quantity: form.quantity,
          note: form.note || undefined,
          reference: form.reference || undefined,
          sourceWarehouse: form.sourceWarehouse,
          destinationWarehouse: form.destinationWarehouse,
        })
      } else {
        await stockService.adjustment({
          itemId: form.itemId,
          quantity: form.quantity,
          note: form.note || undefined,
          reference: form.reference || undefined,
          reason: form.reason,
        })
      }

      toast({ title: `${activeOperation} operation completed` })
      setForm(initialForm)
      await loadHistory(historyItemId || undefined)
    } catch (error) {
      toast({
        title: 'Operation failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold">Stock Operations</h2>
        <div className="flex flex-wrap gap-2">
          {(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'] as const).map((operation) => (
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

        <div className="grid gap-2 md:grid-cols-2">
          <Input
            placeholder="Item ID"
            value={form.itemId}
            onChange={(event) => setForm((prev) => ({ ...prev, itemId: event.target.value }))}
          />
          <Input
            type="number"
            placeholder="Quantity"
            value={String(form.quantity)}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, quantity: Number(event.target.value || 0) }))
            }
          />
          <Input
            placeholder="Reference (optional)"
            value={form.reference}
            onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
          />
          <Input
            placeholder="Note (optional)"
            value={form.note}
            onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
          />

          {(activeOperation === 'OUT' || activeOperation === 'TRANSFER') && (
            <Input
              placeholder="Source warehouse"
              value={form.sourceWarehouse}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, sourceWarehouse: event.target.value }))
              }
            />
          )}

          {(activeOperation === 'IN' || activeOperation === 'TRANSFER') && (
            <Input
              placeholder="Destination warehouse"
              value={form.destinationWarehouse}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, destinationWarehouse: event.target.value }))
              }
            />
          )}

          {activeOperation === 'ADJUSTMENT' && (
            <select
              className="h-10 rounded-md border border-slate-300 px-3 text-sm"
              value={form.reason}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  reason: event.target.value as StockFormState['reason'],
                }))
              }
            >
              <option value="MANUAL">Manual</option>
              <option value="RECOUNT">Recount</option>
              <option value="DAMAGE">Damage</option>
              <option value="LOSS">Loss</option>
            </select>
          )}
        </div>

        <Button type="button" disabled={submitting} onClick={() => void execute()}>
          {submitting ? 'Processing...' : `Run ${activeOperation}`}
        </Button>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">Stock History</h3>
          <Input
            placeholder="Filter by Item ID (optional)"
            value={historyItemId}
            onChange={(event) => setHistoryItemId(event.target.value)}
          />
          <Button type="button" variant="outline" onClick={() => void loadHistory(historyItemId)}>
            Filter
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setHistoryItemId('')
              void loadHistory()
            }}
          >
            Reset
          </Button>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th>Type</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Before</th>
                <th>After</th>
                <th>Warehouse</th>
                <th>Reason</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id} className="border-b">
                  <td>{entry.type}</td>
                  <td>{entry.item?.name ?? entry.itemId}</td>
                  <td>{entry.quantity}</td>
                  <td>{entry.beforeQty}</td>
                  <td>{entry.afterQty}</td>
                  <td>
                    {entry.sourceWarehouse || '-'} {entry.destinationWarehouse ? `-> ${entry.destinationWarehouse}` : ''}
                  </td>
                  <td>{entry.adjustmentReason ?? '-'}</td>
                  <td>{new Date(entry.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={8}>
                    No stock history found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
