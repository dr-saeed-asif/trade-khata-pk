import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { barcodeToDataUrl } from '@/lib/barcode'
import { inventoryService } from '@/services/inventory.service'
import type { InventoryItem } from '@/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/hooks/use-toast'
import { InventoryForm } from '@/components/inventory/Inventory-form'
import { InventoryTable } from '@/components/inventory/Inventory-table'
import useDebounce from '@/hooks/use-debounce'
import axios from 'axios'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { inventoryItemToLabel } from '@/lib/item-label'
import { ItemCodeSticker } from '@/components/Item/item-code-sticker'

const INVENTORY_PAGE_SIZE = 10

export const InventoryListPage = () => {
  const [codePreview, setCodePreview] = useState<{
    type: 'qr' | 'barcode'
    title: string
    sku: string
    value: string
    imageUrl: string
    label: ReturnType<typeof inventoryItemToLabel>
  } | null>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expiredOnly, setExpiredOnly] = useState(false)
  const [sortBy] = useState('name')
  const [sortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null)
  const [editItem, setEditItem] = useState<InventoryItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const user = useAuthStore((state) => state.user)
  const canCreateItem = hasPermission(user?.role, 'items.create', user?.permissions)
  const canImportItem = hasPermission(user?.role, 'items.import', user?.permissions)
  const canUpdateItem = hasPermission(user?.role, 'items.update', user?.permissions)
  const canDeleteItem = hasPermission(user?.role, 'items.delete', user?.permissions)
  const canReadQr = hasPermission(user?.role, 'qr.read', user?.permissions)
  const canExportQr = hasPermission(user?.role, 'qr.export', user?.permissions)
  const canExportInventory = hasPermission(user?.role, 'reports.export', user?.permissions)

  const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : '-')
  const loadItemsSeq = useRef(0)

  const loadItems = (overrides?: Partial<{ search: string; category: string; location: string; sortBy: string; sortOrder: 'asc' | 'desc'; page: number; lowStockOnly: boolean; expiredOnly: boolean }>) => {
    const requestSeq = ++loadItemsSeq.current
    const qSearch = overrides?.search ?? search
    const qCategory = overrides?.category ?? category
    const qLocation = overrides?.location ?? location
    const qSortBy = overrides?.sortBy ?? sortBy
    const qSortOrder = overrides?.sortOrder ?? sortOrder
    const qPage = overrides?.page ?? page
    const qLowStock = overrides?.lowStockOnly ?? lowStockOnly
    const qExpired = overrides?.expiredOnly ?? expiredOnly

    return inventoryService
      .list({
        search: qSearch,
        category: qCategory,
        location: qLocation,
        lowStock: qLowStock,
        expired: qExpired,
        sortBy: qSortBy,
        sortOrder: qSortOrder,
        page: qPage,
        pageSize: INVENTORY_PAGE_SIZE,
      })
      .then((res) => {
        if (requestSeq !== loadItemsSeq.current) return
        setItems(res.data)
        setTotal(res.total)
      })
  }

  const debouncedSearch = useDebounce(search, 300)
  const debouncedCategory = useDebounce(category, 300)
  const debouncedLocation = useDebounce(location, 300)

  useEffect(() => {
    if (searchParams.get('lowStock') === '1') setLowStockOnly(true)
    if (searchParams.get('expired') === '1') setExpiredOnly(true)
  }, [searchParams])

  useEffect(() => {
    void loadItems({
      search: debouncedSearch,
      category: debouncedCategory,
      location: debouncedLocation,
      lowStockOnly,
      expiredOnly,
    })
  }, [debouncedSearch, debouncedCategory, debouncedLocation, lowStockOnly, expiredOnly, page, sortBy, sortOrder])

  const downloadQr = async (value: string, sku: string) => {
    const dataUrl = await QRCode.toDataURL(value)
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${sku}.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  }

  const downloadBarcode = async (value: string, sku: string) => {
    const dataUrl = barcodeToDataUrl(value)
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `${sku}-barcode.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(objectUrl)
  }

  const showQr = async (item: InventoryItem) => {
    try {
      const imageUrl = await QRCode.toDataURL(item.qrValue)
      setCodePreview({
        type: 'qr',
        title: `${item.name} QR Code`,
        sku: item.sku,
        value: item.qrValue,
        imageUrl,
        label: inventoryItemToLabel(item),
      })
    } catch (error) {
      toast({
        title: 'Unable to render QR',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  const showBarcode = (item: InventoryItem) => {
    try {
      const imageUrl = barcodeToDataUrl(item.barcodeValue)
      setCodePreview({
        type: 'barcode',
        title: `${item.name} Barcode`,
        sku: item.sku,
        value: item.barcodeValue,
        imageUrl,
        label: inventoryItemToLabel(item),
      })
    } catch (error) {
      toast({
        title: 'Unable to render barcode',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    const item = itemToDelete
    const deletedId = item.id
    const wasLastItemOnPage = items.length === 1

    setDeleting(true)
    try {
      await inventoryService.delete(deletedId)
      setItems((current) => current.filter((row) => row.id !== deletedId))
      setTotal((current) => Math.max(0, current - 1))
      if (wasLastItemOnPage && page > 1) {
        setPage((current) => current - 1)
      }
      setItemToDelete(null)
      toast({ title: 'Item deleted successfully' })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        setItems((current) => current.filter((row) => row.id !== deletedId))
        setTotal((current) => Math.max(0, current - 1))
        setItemToDelete(null)
        toast({ title: 'Item not found', description: 'This item may already be deleted. List has been refreshed.', variant: 'error' })
      } else {
        toast({ title: 'Delete failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'error' })
      }
      await loadItems()
    } finally {
      setDeleting(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      toast({ title: 'Please choose a CSV/XLSX file', variant: 'error' })
      return
    }
    setImporting(true)
    try {
      const result = await inventoryService.importFile(importFile)
      setImportFile(null)
      setPage(1)
      await loadItems({ page: 1 })
      toast({
        title: 'Import completed',
        description: `${result.created} added, ${result.updated} updated (${result.total} rows in file).`,
      })
    } catch (error) {
      toast({ title: 'Import failed', description: error instanceof Error ? error.message : 'Please check your file format', variant: 'error' })
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await inventoryService.exportExcelFromApi()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'inventory-export.xlsx'
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setExporting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editItem) return
    setSavingEdit(true)
    try {
      await inventoryService.update(editItem.id, {
        name: editItem.name,
        sku: editItem.sku,
        quantity: editItem.quantity,
        price: editItem.price,
        supplier: editItem.supplier,
        location: editItem.location,
        description: editItem.description,
      })
      toast({ title: 'Item updated successfully' })
      setEditItem(null)
      await loadItems()
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      })
    } finally {
      setSavingEdit(false)
    }
  }

  if (items.length === 0) {
    return (
      <Card className="space-y-4">
        <InventoryForm
          importFile={importFile}
          importing={importing}
          exporting={exporting}
          canCreate={canCreateItem}
          canImport={canImportItem}
          canExport={canExportInventory}
          search={search}
          category={category}
          location={location}
          lowStockOnly={lowStockOnly}
          expiredOnly={expiredOnly}
          onImportFileChange={setImportFile}
          onImport={() => void handleImport()}
          onExport={() => void handleExport()}
          onAddItem={() => navigate('/admin/add-item')}
          onSearchChange={setSearch}
          onCategoryChange={setCategory}
          onLocationChange={setLocation}
          onLowStockOnlyChange={setLowStockOnly}
          onExpiredOnlyChange={setExpiredOnly}
        />
        <EmptyState title="No inventory found" subtitle="Add your first item or import CSV/Excel to get started." />
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <InventoryForm
        importFile={importFile}
        importing={importing}
        exporting={exporting}
        canCreate={canCreateItem}
        canImport={canImportItem}
        canExport={canExportInventory}
        search={search}
        category={category}
        location={location}
        lowStockOnly={lowStockOnly}
        expiredOnly={expiredOnly}
        onImportFileChange={setImportFile}
        onImport={() => void handleImport()}
        onExport={() => void handleExport()}
        onAddItem={() => navigate('/admin/add-item')}
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
        onLocationChange={setLocation}
        onLowStockOnlyChange={setLowStockOnly}
        onExpiredOnlyChange={setExpiredOnly}
      />
      <InventoryTable
        items={items}
        canQrRead={canReadQr}
        canQrExport={canExportQr || canReadQr}
        canUpdate={canUpdateItem}
        canDelete={canDeleteItem}
        page={page}
        pageSize={INVENTORY_PAGE_SIZE}
        total={total}
        onPageChange={setPage}
        onShowQr={(item) => void showQr(item)}
        onShowBarcode={(item) => void showBarcode(item)}
        onDownloadQr={(item) => void downloadQr(item.qrValue, item.sku)}
        onDownloadBarcode={(item) => void downloadBarcode(item.barcodeValue, item.sku)}
        onView={(item) => setViewItem(item)}
        onEdit={(item) => setEditItem({ ...item })}
        onDelete={setItemToDelete}
      />
      <Modal
        open={Boolean(itemToDelete)}
        title="Delete item"
        onClose={() => {
          if (!deleting) setItemToDelete(null)
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={deleting} onClick={() => setItemToDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">Are you sure you want to delete this item?</p>
        {itemToDelete ? (
          <p className="mt-2 text-base font-semibold text-slate-900">
            {itemToDelete.name}
            <span className="mt-1 block text-sm font-normal text-slate-500">SKU: {itemToDelete.sku}</span>
          </p>
        ) : null}
        <p className="mt-3 text-sm text-red-600">This action cannot be undone.</p>
      </Modal>
      {viewItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">{viewItem.name}</p>
                <p className="text-sm text-slate-600">SKU: {viewItem.sku}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setViewItem(null)}>
                Close
              </Button>
            </div>
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <p><span className="font-medium">Category:</span> {viewItem.category}</p>
              <p><span className="font-medium">Location:</span> {viewItem.location}</p>
              <p><span className="font-medium">On Hand:</span> {viewItem.quantity}</p>
              <p><span className="font-medium">Reserved:</span> {viewItem.reservedQty}</p>
              <p><span className="font-medium">Available:</span> {viewItem.availableQty}</p>
              <p><span className="font-medium">Price:</span> {viewItem.price}</p>
              <p><span className="font-medium">Created At:</span> {formatDateTime(viewItem.createdAt)}</p>
              <p><span className="font-medium">Updated At:</span> {formatDateTime(viewItem.updatedAt)}</p>
              <p className="md:col-span-2"><span className="font-medium">Description:</span> {viewItem.description || '-'}</p>
            </div>
          </div>
        </div>
      ) : null}
      {editItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">Edit Item</p>
                <p className="text-sm text-slate-600">ID: {editItem.id}</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                Close
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={editItem.name} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, name: e.target.value } : prev))} placeholder="Name" />
              <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={editItem.sku} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, sku: e.target.value } : prev))} placeholder="SKU" />
              <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" type="number" value={editItem.quantity} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, quantity: Number(e.target.value || 0) } : prev))} placeholder="Quantity" />
              <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" type="number" step="0.01" value={editItem.price} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, price: Number(e.target.value || 0) } : prev))} placeholder="Price" />
              <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={editItem.supplier} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, supplier: e.target.value } : prev))} placeholder="Supplier" />
              <input className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={editItem.location} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, location: e.target.value } : prev))} placeholder="Location" />
              <textarea className="min-h-24 rounded-md border border-slate-300 p-3 text-sm md:col-span-2" value={editItem.description ?? ''} onChange={(e) => setEditItem((prev) => (prev ? { ...prev, description: e.target.value } : prev))} placeholder="Description" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>
                Cancel
              </Button>
              <Button type="button" disabled={savingEdit} onClick={() => void handleSaveEdit()}>
                {savingEdit ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {codePreview ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-lg font-semibold text-slate-900">{codePreview.title}</p>
              <Button type="button" variant="outline" onClick={() => setCodePreview(null)}>
                Close
              </Button>
            </div>
            <ItemCodeSticker
              label={codePreview.label}
              imageUrl={codePreview.imageUrl}
              codeType={codePreview.type}
            />
            <p className="mt-3 text-center text-xs text-slate-500">SKU: {codePreview.sku}</p>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
