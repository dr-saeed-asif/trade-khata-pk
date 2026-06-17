import { Fragment, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { barcodeToDataUrl } from '@/lib/barcode'
import { inventoryService } from '@/services/inventory.service'
import { categoryService } from '@/services/category.service'
import type { InventoryItem } from '@/types'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { itemSchema, type ItemInput } from '@/lib/validators'
import type { Category } from '@/types'
import type { ItemTimelineEvent } from '@/types'
import { useToast } from '@/hooks/use-toast'
import { AddItemModal } from '@/components/modals/add-item-modal'
import { InventoryModal } from '@/components/modals/inventory-modal'
import useDebounce from '@/hooks/use-debounce'
import axios from 'axios'

export const InventoryListPage = () => {
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
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState<'qr' | 'barcode' | 'view' | 'edit' | 'delete' | null>(null)
  const [modalItem, setModalItem] = useState<InventoryItem | null>(null)
  const [modalQrImage, setModalQrImage] = useState<string | null>(null)
  const [modalBarcodeImage, setModalBarcodeImage] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<InventoryItem>>({})
  const [addItemModalOpen, setAddItemModalOpen] = useState(false)
  const [addItemForm, setAddItemForm] = useState<ItemInput>({
    name: '',
    sku: '',
    categoryId: '',
    categoryIds: [],
    tags: [],
    quantity: 0,
    reservedQty: 0,
    expiryDate: '',
    weight: '',
    expiryMessage: '',
    price: 0,
    supplier: '',
    location: '',
    description: '',
    batches: [],
    variants: [],
  })
  const [addItemErrors, setAddItemErrors] = useState<Partial<Record<keyof ItemInput, string>>>({})
  const [addItemSubmitting, setAddItemSubmitting] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [timelineEvents, setTimelineEvents] = useState<ItemTimelineEvent[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const { toast } = useToast()

  const loadItems = (overrides?: Partial<{ search: string; category: string; location: string; sortBy: string; sortOrder: 'asc' | 'desc'; page: number; lowStockOnly: boolean; expiredOnly: boolean }>) => {
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
        pageSize: 8,
      })
      .then((res) => {
        setItems(res.data)
        setTotal(res.total)
      })
  }

  const debouncedSearch = useDebounce(search, 300)
  const debouncedCategory = useDebounce(category, 300)
  const debouncedLocation = useDebounce(location, 300)

  useEffect(() => {
    void loadItems({
      search: debouncedSearch,
      category: debouncedCategory,
      location: debouncedLocation,
      lowStockOnly,
      expiredOnly,
    })
  }, [debouncedSearch, debouncedCategory, debouncedLocation, lowStockOnly, expiredOnly, page, sortBy, sortOrder])

  useEffect(() => {
    categoryService.list({ page: 1, pageSize: 500 }).then((res) => setCategories(res.data))
  }, [])

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

  const printImage = (imageUrl: string, title: string) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    printWindow.document.open()
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              margin: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              font-family: Arial, sans-serif;
            }
            img {
              max-width: 95vw;
              max-height: 95vh;
            }
          </style>
        </head>
        <body>
          <img src="${imageUrl}" alt="${title}" />
          <script>
            window.onload = function () {
              window.print();
              window.onafterprint = function () { window.close(); };
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  

  const onSaveEdit = async (id: string) => {
    await inventoryService.update(id, {
      name: editDraft.name ?? '',
      quantity: Number(editDraft.quantity ?? 0),
      location: editDraft.location ?? '',
      supplier: editDraft.supplier ?? '',
      description: editDraft.description ?? '',
    })
    setModalOpen(false)
    await loadItems()
  }

  const openQrModal = async (item: InventoryItem) => {
    setModalItem(item)
    setModalType('qr')
    setModalQrImage(await QRCode.toDataURL(item.qrValue))
    setModalOpen(true)
  }

  const openBarcodeModal = (item: InventoryItem) => {
    setModalItem(item)
    setModalType('barcode')
    setModalBarcodeImage(barcodeToDataUrl(item.barcodeValue))
    setModalOpen(true)
  }

  const openViewModal = (item: InventoryItem) => {
    setModalItem(item)
    setModalType('view')
    setModalOpen(true)
    setLoadingTimeline(true)
    void inventoryService
      .timeline(item.id)
      .then((timeline) => setTimelineEvents(timeline))
      .catch(() => setTimelineEvents([]))
      .finally(() => setLoadingTimeline(false))
  }

  const openEditModal = (item: InventoryItem) => {
    setEditDraft({
      name: item.name,
      quantity: item.quantity,
      location: item.location,
      supplier: item.supplier,
      description: item.description,
    })
    setModalItem(item)
    setModalType('edit')
    setModalOpen(true)
  }

  const openDeleteModal = (item: InventoryItem) => {
    setModalItem(item)
    setModalType('delete')
    setModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!modalItem) return
    try {
      await inventoryService.delete(modalItem.id)
      toast({ title: 'Item deleted successfully' })
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        toast({
          title: 'Item not found',
          description: 'This item may already be deleted. List has been refreshed.',
          variant: 'error',
        })
      } else {
        toast({
          title: 'Delete failed',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        })
      }
    } finally {
      setModalOpen(false)
      await loadItems()
    }
  }

  const handleAddItemSubmit = async () => {
    const normalizedForm: ItemInput = {
      ...addItemForm,
      expiryDate: addItemForm.expiryDate?.trim() ? addItemForm.expiryDate : undefined,
      categoryIds: addItemForm.categoryIds?.length ? addItemForm.categoryIds : undefined,
      tags: addItemForm.tags?.length ? addItemForm.tags : undefined,
      variants:
        addItemForm.variants?.filter((variant) => variant.sku?.trim()).map((variant) => ({
          ...variant,
          sku: variant.sku.trim(),
          quantity: variant.quantity ?? 0,
        })) ?? undefined,
      batches:
        addItemForm.batches?.filter((batch) => batch.batchNumber?.trim()).map((batch) => ({
          ...batch,
          batchNumber: batch.batchNumber.trim(),
          expiryDate: batch.expiryDate?.trim() ? batch.expiryDate : undefined,
          quantity: batch.quantity ?? addItemForm.quantity,
        })) ?? undefined,
    }
    const parsed = itemSchema.safeParse(normalizedForm)
    if (!parsed.success) {
      setAddItemErrors(
        parsed.error.issues.reduce<Partial<Record<keyof ItemInput, string>>>((acc, issue) => {
          const path = issue.path[0] as keyof ItemInput
          acc[path] = issue.message
          return acc
        }, {}),
      )
      return
    }
    setAddItemErrors({})
    setAddItemSubmitting(true)
    try {
      await inventoryService.create(parsed.data)
      toast({ title: 'Item created successfully' })
      setAddItemModalOpen(false)
      setAddItemForm({
        name: '',
        sku: '',
        categoryId: '',
        categoryIds: [],
        tags: [],
        quantity: 0,
        reservedQty: 0,
        expiryDate: '',
        weight: '',
        expiryMessage: '',
        price: 0,
        supplier: '',
        location: '',
        description: '',
        batches: [],
        variants: [],
      })
      await loadItems()
    } finally {
      setAddItemSubmitting(false)
    }
  }

  const handleAddItemFormChange = (field: keyof ItemInput, value: any) => {
    setAddItemForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditDraftChange = (field: keyof InventoryItem, value: any) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }))
  }

  const handleImport = async () => {
    if (!importFile) {
      toast({ title: 'Please choose a CSV/XLSX file', variant: 'error' })
      return
    }
    setImporting(true)
    try {
      const result = await inventoryService.importFile(importFile)
      toast({
        title: 'Import completed',
        description: `Created: ${result.created}, Updated: ${result.updated}`,
      })
      setImportFile(null)
      await loadItems()
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Please check your file format',
        variant: 'error',
      })
    } finally {
      setImporting(false)
    }
  }

  if (items.length === 0) {
    return (
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inventories</h2>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              className="h-10 w-auto"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
            <Button type="button" variant="outline" disabled={importing} onClick={() => void handleImport()}>
              {importing ? 'Importing...' : 'Import CSV/Excel'}
            </Button>
            <Button onClick={() => setAddItemModalOpen(true)}>+ Add Item</Button>
          </div>
        </div>
        <EmptyState title="No inventory found" subtitle="Add your first item or import CSV/Excel to get started." />
        <AddItemModal
          open={addItemModalOpen}
          onClose={() => setAddItemModalOpen(false)}
          onSubmit={handleAddItemSubmit}
          categories={categories}
          form={addItemForm}
          errors={addItemErrors}
          isSubmitting={addItemSubmitting}
          onFormChange={handleAddItemFormChange}
        />
      </Card>
    )
  }

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inventories</h2>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            className="h-10 w-auto"
            accept=".csv,.xlsx,.xls"
            onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="outline" disabled={importing} onClick={() => void handleImport()}>
            {importing ? 'Importing...' : 'Import CSV/Excel'}
          </Button>
          <Button onClick={() => setAddItemModalOpen(true)}>+ Add Item</Button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-5">
        <Input placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input placeholder="Filter category" value={category} onChange={(e) => setCategory(e.target.value)} />
        <Input placeholder="Filter location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm">
          <input type="checkbox" checked={expiredOnly} onChange={(e) => setExpiredOnly(e.target.checked)} />
          Expired only
        </label>
        {/* <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="quantity">Sort by Quantity</option>
          <option value="category">Sort by Category</option>
        </select>
        <select className="h-10 rounded-md border border-slate-300 px-3 text-sm" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select> */}
      </div>
      <div className="max-h-[60vh] overflow-x-auto pb-2">
        <table className="min-w-[1450px] table-fixed text-left text-sm">
          <thead>
            <tr className="border-b">
              <th className="sticky top-0 z-10 w-[160px] whitespace-nowrap bg-white px-3 py-2">Name</th>
              <th className="sticky top-0 z-10 w-[150px] whitespace-nowrap bg-white px-3 py-2">SKU</th>
              <th className="sticky top-0 z-10 w-[140px] whitespace-nowrap bg-white px-3 py-2">Category</th>
              <th className="sticky top-0 z-10 w-[90px] whitespace-nowrap bg-white px-3 py-2">On Hand</th>
              <th className="sticky top-0 z-10 w-[90px] whitespace-nowrap bg-white px-3 py-2">Reserved</th>
              <th className="sticky top-0 z-10 w-[100px] whitespace-nowrap bg-white px-3 py-2">Available</th>
              <th className="sticky top-0 z-10 w-[130px] whitespace-nowrap bg-white px-3 py-2">Expiry</th>
              <th className="sticky top-0 z-10 w-[160px] whitespace-nowrap bg-white px-3 py-2">Location</th>
              <th className="sticky top-0 z-10 w-[220px] whitespace-nowrap bg-white px-3 py-2">Codes</th>
              <th className="sticky top-0 z-10 w-[340px] whitespace-nowrap bg-white px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <Fragment key={item.id}>
                <tr key={item.id} className="border-b">
                  <td className="px-3 py-3">{item.name}</td>
                  <td className="px-3 py-3">{item.sku}</td>
                  <td className="px-3 py-3">{item.category}</td>
                  <td className="px-3 py-3">{item.quantity}</td>
                  <td className="px-3 py-3">{item.reservedQty}</td>
                  <td className="px-3 py-3">{item.availableQty}</td>
                  <td className="px-3 py-3">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-3">{item.location}</td>
                  <td className="space-x-1 px-3 py-3 whitespace-nowrap">
                    <Button type="button" variant="outline" onClick={() => openQrModal(item)}>Show QR</Button>
                    <Button type="button" variant="outline" onClick={() => openBarcodeModal(item)}>Show Barcode</Button>
                  </td>
                  <td className="space-x-1 px-3 py-3 whitespace-nowrap">
                    <Button type="button" variant="outline" onClick={() => downloadQr(item.qrValue, item.sku)}>Download QR</Button>
                    <Button type="button" variant="outline" onClick={() => downloadBarcode(item.barcodeValue, item.sku)}>Download Barcode</Button>
                    <Button type="button" variant="default" onClick={() => openViewModal(item)}>View</Button>
                    <Button type="button" variant="contained" onClick={() => openEditModal(item)}>Edit</Button>
                    <Button type="button" variant="destructive" onClick={() => openDeleteModal(item)}>Delete</Button>
                  </td>
                </tr>
                {/* modal used instead of inline panel */}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <p>Page {page} / {Math.max(1, Math.ceil(total / 8))}</p>
        <div className="space-x-2">
          <Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <Button type="button" variant="outline" onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
      <InventoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        modalType={modalType}
        modalItem={modalItem}
        modalQrImage={modalQrImage}
        modalBarcodeImage={modalBarcodeImage}
        editDraft={editDraft}
        onEditDraftChange={handleEditDraftChange}
        onDownloadQr={() => modalItem && downloadQr(modalItem.qrValue, modalItem.sku)}
        onDownloadBarcode={() => modalItem && downloadBarcode(modalItem.barcodeValue, modalItem.sku)}
        onPrintImage={printImage}
        onSaveEdit={() => modalItem && onSaveEdit(modalItem.id)}
        onConfirmDelete={confirmDelete}
        timelineEvents={timelineEvents}
        loadingTimeline={loadingTimeline}
      />
      <AddItemModal
        open={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        onSubmit={handleAddItemSubmit}
        categories={categories}
        form={addItemForm}
        errors={addItemErrors}
        isSubmitting={addItemSubmitting}
        onFormChange={handleAddItemFormChange}
      />
    </Card>
  )
}
