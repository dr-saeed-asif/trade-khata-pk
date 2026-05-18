import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { purchasesService } from '@/services/purchases.service'
import { partyService } from '@/services/party.service'
import { inventoryService } from '@/services/inventory.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageListHeader } from '@/components/layout/page-list-header'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import type { InventoryItem, Party, PurchaseRecord } from '@/types'
import { TransactionForm, type DraftLine } from '@/components/commerce/Transaction-form'
import { PurchaseTransactionList } from '@/components/commerce/purchase-transaction-list'
import { PurchaseBillPreviewModal } from '@/components/commerce/purchase-bill-preview-modal'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { ListPagination } from '@/components/ui/list-pagination'
import {
  CommerceListFilters,
  emptyCommerceFilters,
  type CommerceListFilterValues,
} from '@/components/commerce/commerce-list-filters'
import { useDebounce } from '@/hooks/use-debounce'
import {
  getEditId,
  isModuleCreateRoute,
  isModuleEditRoute,
  navigateToEdit,
} from '@/lib/edit-route'
import { printPurchaseBill } from '@/lib/print-bill'

const PAGE_SIZE = 10
const MODULE_PATH = '/admin/purchases'
const emptyLines = (): DraftLine[] => [{ itemId: '', quantity: 0, unitPrice: 0 }]

const purchaseToDraftLines = (purchase: PurchaseRecord): DraftLine[] =>
  purchase.lines.map((line) => ({
    itemId: line.itemId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }))

export const PurchasesPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const canCreate = hasPermission(user?.role, 'purchases.create', user?.permissions)
  const canDelete = hasPermission(user?.role, 'purchases.delete', user?.permissions)
  const isCreateRoute = isModuleCreateRoute(location.pathname, MODULE_PATH)
  const isEditRoute = isModuleEditRoute(location.pathname, MODULE_PATH)
  const editId = getEditId(location)
  const isFormRoute = isCreateRoute || isEditRoute

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([])
  const [parties, setParties] = useState<Party[]>([])
  const [filterParties, setFilterParties] = useState<Party[]>([])
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<CommerceListFilterValues>(emptyCommerceFilters)
  const debouncedSearch = useDebounce(filters.search, 300)
  const hasActiveFilters = Boolean(
    filters.search || filters.partyId || filters.dateFrom || filters.dateTo,
  )
  const [partyId, setPartyId] = useState('')
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<DraftLine[]>(emptyLines())
  const [editingPurchase, setEditingPurchase] = useState<PurchaseRecord | null>(null)
  const [previewPurchase, setPreviewPurchase] = useState<PurchaseRecord | null>(null)

  const loadList = async (pageNum = page) => {
    setLoading(true)
    try {
      const res = await purchasesService.list({
        page: pageNum,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        partyId: filters.partyId || undefined,
        from: filters.dateFrom || undefined,
        to: filters.dateTo || undefined,
      })
      setPurchases(res.data)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  const loadFormData = async () => {
    const [partyRows, inventory] = await Promise.all([
      partyService.list({ type: 'SUPPLIER', page: 1, pageSize: 500 }),
      inventoryService.list({ page: 1, pageSize: 500 }),
    ])
    setParties(partyRows.data)
    setItems(inventory.data)
  }

  const loadPurchaseForEdit = async (id: string) => {
    setFormLoading(true)
    try {
      const purchase = await purchasesService.getById(id)
      setEditingPurchase(purchase)
      setPartyId(purchase.partyId ?? '')
      setDiscount(purchase.discount)
      setNotes(purchase.notes ?? '')
      setLines(purchase.lines.length ? purchaseToDraftLines(purchase) : emptyLines())
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({ title: 'Could not load purchase', description: message, variant: 'error' })
      navigate(MODULE_PATH)
    } finally {
      setFormLoading(false)
    }
  }

  useEffect(() => {
    if (isFormRoute) {
      void loadFormData()
      return
    }
    void partyService.list({ type: 'SUPPLIER', page: 1, pageSize: 500 }).then((res) => setFilterParties(res.data))
  }, [isFormRoute])

  useEffect(() => {
    if (!isEditRoute) {
      setEditingPurchase(null)
      return
    }
    if (!editId) {
      navigate(MODULE_PATH)
      return
    }
    void loadPurchaseForEdit(editId)
  }, [isEditRoute, editId])

  useEffect(() => {
    if (isFormRoute) return
    void loadList(page)
  }, [isFormRoute, page, debouncedSearch, filters.partyId, filters.dateFrom, filters.dateTo])

  useEffect(() => {
    if (isFormRoute) return
    setPage(1)
  }, [isFormRoute, debouncedSearch, filters.partyId, filters.dateFrom, filters.dateTo])

  const resetForm = () => {
    setPartyId('')
    setDiscount(0)
    setNotes('')
    setLines(emptyLines())
    setEditingPurchase(null)
  }

  const closeForm = () => navigate(MODULE_PATH)

  const submitPurchase = async () => {
    const validLines = lines.filter((l) => l.itemId && l.quantity > 0)
    if (!validLines.length) {
      toast({ title: 'Add at least one item', variant: 'error' })
      return
    }
    const payload = {
      partyId: partyId || undefined,
      discount,
      notes: notes || undefined,
      lines: validLines,
    }
    try {
      if (isEditRoute && editingPurchase) {
        await purchasesService.update(editingPurchase.id, payload)
        toast({ title: 'Purchase updated' })
      } else {
        await purchasesService.create(payload)
        toast({ title: 'Purchase saved' })
      }
      resetForm()
      setPage(1)
      closeForm()
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({
        title: isEditRoute ? 'Update failed' : 'Purchase failed',
        description: message,
        variant: 'error',
      })
    }
  }

  const openPreview = async (record: PurchaseRecord) => {
    try {
      const full = await purchasesService.getById(record.id)
      setPreviewPurchase(full)
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({ title: 'Could not load bill', description: message, variant: 'error' })
    }
  }

  const openDownload = async (record: PurchaseRecord) => {
    try {
      const full = await purchasesService.getById(record.id)
      printPurchaseBill(full)
    } catch (error) {
      if (error instanceof Error && error.message.includes('Pop-up blocked')) {
        toast({ title: 'Pop-up blocked', description: error.message, variant: 'error' })
        return
      }
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({ title: 'Could not download bill', description: message, variant: 'error' })
    }
  }

  if (isCreateRoute) {
    if (!canCreate) {
      return (
        <EmptyState title="Access denied" subtitle="You do not have permission to create purchases." />
      )
    }
    return (
      <div className="space-y-4">
        <PageListHeader title="New purchase" subtitle="Record a purchase and increase stock." showAdd={false} />
        <Button variant="outline" onClick={closeForm}>
          Back to Purchases
        </Button>
        <Card>
          <TransactionForm
            mode="purchase"
            parties={parties}
            items={items}
            partyId={partyId}
            discount={discount}
            notes={notes}
            lines={lines}
            canCreate
            onPartyIdChange={setPartyId}
            onDiscountChange={setDiscount}
            onNotesChange={setNotes}
            onLinesChange={setLines}
            onCancel={closeForm}
            onSubmit={submitPurchase}
          />
        </Card>
      </div>
    )
  }

  if (isEditRoute) {
    if (!canCreate) {
      return <EmptyState title="Access denied" subtitle="You do not have permission to edit purchases." />
    }
    if (formLoading || !editingPurchase) {
      return <EmptyState title="Loading purchase…" subtitle="Please wait." />
    }
    return (
      <div className="space-y-4">
        <PageListHeader
          title={`Edit purchase — ${editingPurchase.invoiceNo}`}
          subtitle="Update line items; stock is adjusted automatically."
          showAdd={false}
        />
        <Button variant="outline" onClick={closeForm}>
          Back to Purchases
        </Button>
        <Card>
          <TransactionForm
            mode="purchase"
            title={`Edit ${editingPurchase.invoiceNo}`}
            submitLabel="Update Purchase"
            parties={parties}
            items={items}
            partyId={partyId}
            discount={discount}
            notes={notes}
            lines={lines}
            canCreate
            onPartyIdChange={setPartyId}
            onDiscountChange={setDiscount}
            onNotesChange={setNotes}
            onLinesChange={setLines}
            onCancel={closeForm}
            onSubmit={submitPurchase}
          />
        </Card>
      </div>
    )
  }

  return (
    <>
      <ListPageLayout
        loading={loading}
        isEmpty={!loading && total === 0 && !hasActiveFilters}
        emptySubtitle="No purchases found. Click Add to create a purchase."
        header={
          <PageListHeader
            title="Purchases"
            subtitle="Record purchases and increase stock automatically."
            addLabel="Add"
            showAdd={canCreate}
            onAdd={() => navigate(`${MODULE_PATH}/create`)}
          />
        }
        filters={
          <CommerceListFilters
            mode="purchase"
            parties={filterParties}
            values={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyCommerceFilters())}
          />
        }
        pagination={<ListPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
      >
        <PurchaseTransactionList
          records={purchases}
          canEdit={canCreate}
          canDelete={canDelete}
          onPreview={openPreview}
          onEdit={(record) => navigateToEdit(navigate, MODULE_PATH, record.id)}
          onDownload={openDownload}
          onDelete={async (record) => {
            if (!window.confirm(`Delete purchase ${record.invoiceNo}? Stock will be adjusted.`)) return
            try {
              await purchasesService.delete(record.id)
              if (purchases.length === 1 && page > 1) setPage(page - 1)
              else await loadList(page)
              toast({ title: 'Purchase deleted' })
            } catch (error) {
              const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
              toast({ title: 'Delete failed', description: message, variant: 'error' })
            }
          }}
        />
      </ListPageLayout>

      <PurchaseBillPreviewModal purchase={previewPurchase} onClose={() => setPreviewPurchase(null)} />
    </>
  )
}
