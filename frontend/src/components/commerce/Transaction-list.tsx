import { Receipt, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommerceLineItemRow } from '@/components/commerce/commerce-line-item-row'
import { CommerceTransactionMeta } from '@/components/commerce/commerce-transaction-meta'
import { ListEmptyMessage, ListRow } from '@/components/ui/list-row'
import type { PurchaseRecord, SaleRecord } from '@/types'

type Record = SaleRecord | PurchaseRecord

interface TransactionListProps {
  mode: 'sale' | 'purchase'
  records: Record[]
  canDelete: boolean
  onDelete: (record: Record) => void
}

export const TransactionList = ({ mode, records, canDelete, onDelete }: TransactionListProps) => (
  <div className="space-y-3">
    {records.length === 0 ? (
      <ListEmptyMessage>
        No {mode === 'sale' ? 'sales' : 'purchases'} match the current filters.
      </ListEmptyMessage>
    ) : null}
    {records.map((record) => {
      const date = mode === 'sale' ? (record as SaleRecord).saleDate : (record as PurchaseRecord).purchaseDate
      return (
        <ListRow key={record.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Receipt className="h-4 w-4 text-slate-400" />
                <p className="font-semibold text-slate-900">{record.invoiceNo}</p>
                <Badge variant={mode === 'sale' ? 'customer' : 'supplier'}>
                  {mode === 'sale' ? 'Sale' : 'Purchase'}
                </Badge>
              </div>
              <CommerceTransactionMeta
                date={date}
                partyName={
                  record.party?.name ??
                  (mode === 'sale' ? 'Walk-in Customer' : 'Walk-in Supplier')
                }
              />
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">Rs {record.total.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{record.lines.length} item(s)</p>
            </div>
          </div>
          <ul className="mt-3 rounded-lg bg-slate-50/80 px-3 py-2 text-xs text-slate-600">
            {record.lines.map((line, index) => (
              <CommerceLineItemRow
                key={line.id ?? `${line.itemId}-${line.quantity}`}
                lineNumber={index + 1}
                itemName={line.itemName ?? 'Item'}
                itemSku={line.itemSku}
                quantity={line.quantity}
                unitPrice={line.unitPrice}
                lineTotal={line.lineTotal}
              />
            ))}
          </ul>
          {canDelete ? (
            <Button variant="destructive" className="mt-3 gap-1.5" onClick={() => onDelete(record)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </ListRow>
      )
    })}
  </div>
)
