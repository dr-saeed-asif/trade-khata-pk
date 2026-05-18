import { Fragment } from 'react'
import { Button } from '@/components/ui/button'
import { ListPagination } from '@/components/ui/list-pagination'
import { InventoryItemNameCell } from '@/components/inventory/inventory-item-name-cell'
import { currency } from '@/lib/utils'
import type { InventoryItem } from '@/types'

interface InventoryTableProps {
  items: InventoryItem[]
  canQrRead: boolean
  canQrExport: boolean
  canUpdate: boolean
  canDelete: boolean
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onShowQr: (item: InventoryItem) => void
  onShowBarcode: (item: InventoryItem) => void
  onDownloadQr: (item: InventoryItem) => void
  onDownloadBarcode: (item: InventoryItem) => void
  onView: (item: InventoryItem) => void
  onEdit: (item: InventoryItem) => void
  onDelete: (item: InventoryItem) => void
}

export const InventoryTable = ({
  items,
  canQrRead,
  canQrExport,
  canUpdate,
  canDelete,
  page,
  pageSize,
  total,
  onPageChange,
  onShowQr,
  onShowBarcode,
  onDownloadQr,
  onDownloadBarcode,
  onView,
  onEdit,
  onDelete,
}: InventoryTableProps) => {
  const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '-')

  return (
  <>
    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto pb-2 pr-1">
      <table className="min-w-[1950px] table-fixed text-left text-sm">
        <thead>
          <tr className="border-b">
            <th className="sticky top-0 z-10 w-[200px] whitespace-nowrap bg-white px-3 py-2">Name (EN / اردو)</th>
            <th className="sticky top-0 z-10 w-[150px] whitespace-nowrap bg-white px-3 py-2">SKU</th>
            <th className="sticky top-0 z-10 w-[140px] whitespace-nowrap bg-white px-3 py-2">Category</th>
            <th className="sticky top-0 z-10 w-[100px] whitespace-nowrap bg-white px-3 py-2">Price</th>
            <th className="sticky top-0 z-10 w-[90px] whitespace-nowrap bg-white px-3 py-2">Weight</th>
            <th className="sticky top-0 z-10 w-[90px] whitespace-nowrap bg-white px-3 py-2">On Hand</th>
            <th className="sticky top-0 z-10 w-[90px] whitespace-nowrap bg-white px-3 py-2">Reserved</th>
            <th className="sticky top-0 z-10 w-[100px] whitespace-nowrap bg-white px-3 py-2">Available</th>
            <th className="sticky top-0 z-10 w-[130px] whitespace-nowrap bg-white px-3 py-2">Expiry</th>
            <th className="sticky top-0 z-10 w-[160px] whitespace-nowrap bg-white px-3 py-2">Location</th>
            <th className="sticky top-0 z-10 w-[160px] whitespace-nowrap bg-white px-3 py-2">Created At</th>
            <th className="sticky top-0 z-10 w-[160px] whitespace-nowrap bg-white px-3 py-2">Updated At</th>
            <th className="sticky top-0 z-10 w-[220px] whitespace-nowrap bg-white px-3 py-2">Codes</th>
            <th className="sticky top-0 z-10 w-[340px] whitespace-nowrap bg-white px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <Fragment key={item.id}>
              <tr className="border-b">
                <td className="px-3 py-3">
                  <InventoryItemNameCell name={item.name} />
                </td>
                <td className="px-3 py-3">{item.sku}</td>
                <td className="px-3 py-3">{item.category}</td>
                <td className="px-3 py-3">{currency(item.price)}</td>
                <td className="px-3 py-3">{item.weight?.trim() || '—'}</td>
                <td className="px-3 py-3">{item.quantity}</td>
                <td className="px-3 py-3">{item.reservedQty}</td>
                <td className="px-3 py-3">{item.availableQty}</td>
                <td className="px-3 py-3">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                <td className="px-3 py-3">{item.location}</td>
                <td className="px-3 py-3">{formatDateTime(item.createdAt)}</td>
                <td className="px-3 py-3">{formatDateTime(item.updatedAt)}</td>
                <td className="space-x-1 whitespace-nowrap px-3 py-3">
                  {canQrRead ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => onShowQr(item)}>Show QR</Button>
                      <Button type="button" variant="outline" onClick={() => onShowBarcode(item)}>Show Barcode</Button>
                    </>
                  ) : null}
                </td>
                <td className="space-x-1 whitespace-nowrap px-3 py-3">
                  {canQrExport ? (
                    <>
                      <Button type="button" variant="outline" onClick={() => onDownloadQr(item)}>Download QR</Button>
                      <Button type="button" variant="outline" onClick={() => onDownloadBarcode(item)}>Download Barcode</Button>
                    </>
                  ) : null}
                  <Button type="button" variant="default" onClick={() => onView(item)}>View</Button>
                  {canUpdate ? <Button type="button" variant="contained" onClick={() => onEdit(item)}>Edit</Button> : null}
                  {canDelete ? <Button type="button" variant="destructive" onClick={() => onDelete(item)}>Delete</Button> : null}
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
    <ListPagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
  </>
  )
}
