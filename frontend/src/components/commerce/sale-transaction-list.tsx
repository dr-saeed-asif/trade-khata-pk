import { Download, Eye, Pencil, Receipt, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CommerceLineItemRow } from '@/components/commerce/commerce-line-item-row'
import { CommerceTransactionMeta } from '@/components/commerce/commerce-transaction-meta'
import { ListEmptyMessage, ListRow } from '@/components/ui/list-row'
import type { SaleRecord } from '@/types'

interface SaleTransactionListProps {
  records: SaleRecord[]
  canEdit: boolean
  canDelete: boolean
  onPreview: (record: SaleRecord) => void
  onEdit: (record: SaleRecord) => void
  onDownload: (record: SaleRecord) => void
  onDelete: (record: SaleRecord) => void
}

export const SaleTransactionList = ({
  records,
  canEdit,
  canDelete,
  onPreview,
  onEdit,
  onDownload,
  onDelete,
}: SaleTransactionListProps) => (
  <div className="space-y-3">
    {records.length === 0 ? (
      <ListEmptyMessage>No sales match the current filters.</ListEmptyMessage>
    ) : null}
    {records.map((record) => (
      <ListRow key={record.id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Receipt className="h-4 w-4 text-slate-400" />
              <p className="font-semibold text-slate-900">{record.invoiceNo}</p>
              <Badge variant="customer">Sale</Badge>
            </div>
            <CommerceTransactionMeta
              date={record.saleDate}
              partyName={record.party?.name ?? 'Walk-in Customer'}
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
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" className="gap-1.5" onClick={() => onPreview(record)}>
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          {canEdit ? (
            <Button variant="outline" className="gap-1.5" onClick={() => onEdit(record)}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          ) : null}
          <Button variant="outline" className="gap-1.5" onClick={() => onDownload(record)}>
            <Download className="h-3.5 w-3.5" />
            Download bill
          </Button>
          {canDelete ? (
            <Button variant="destructive" className="gap-1.5" onClick={() => onDelete(record)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      </ListRow>
    ))}
  </div>
)
