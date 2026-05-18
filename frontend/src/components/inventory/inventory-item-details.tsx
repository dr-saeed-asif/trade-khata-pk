import type { InventoryItem } from '@/types'
import { formatItemExpiryLabel } from '@/lib/item-label'
import { currency } from '@/lib/utils'

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '-')

interface InventoryItemDetailsProps {
  item: InventoryItem
}

export const InventoryItemDetails = ({ item }: InventoryItemDetailsProps) => {
  const expiryLabel = formatItemExpiryLabel(item)

  return (
    <div className="space-y-3">
      <div>
        <p className="text-lg font-semibold text-slate-900">{item.name}</p>
        <p className="text-sm text-slate-600">SKU: {item.sku}</p>
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-2">
        <p><span className="font-medium">Category:</span> {item.category}</p>
        <p><span className="font-medium">Location:</span> {item.location || '-'}</p>
        <p><span className="font-medium">On Hand:</span> {item.quantity}</p>
        <p><span className="font-medium">Reserved:</span> {item.reservedQty}</p>
        <p><span className="font-medium">Available:</span> {item.availableQty}</p>
        <p><span className="font-medium">Price:</span> {currency(item.price)}</p>
        <p><span className="font-medium">Supplier:</span> {item.supplier || '-'}</p>
        <p><span className="font-medium">Weight:</span> {item.weight || '-'}</p>
        <p><span className="font-medium">Expiry:</span> {expiryLabel || '-'}</p>
        {item.tags?.length ? (
          <p className="md:col-span-2"><span className="font-medium">Tags:</span> {item.tags.join(', ')}</p>
        ) : null}
        <p><span className="font-medium">Created At:</span> {formatDateTime(item.createdAt)}</p>
        <p><span className="font-medium">Updated At:</span> {formatDateTime(item.updatedAt)}</p>
        <p className="md:col-span-2"><span className="font-medium">Description:</span> {item.description || '-'}</p>
      </div>
    </div>
  )
}
