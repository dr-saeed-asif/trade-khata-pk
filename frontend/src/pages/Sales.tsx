import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { salesService } from '@/services/sales.service'
import { partyService } from '@/services/party.service'
import { inventoryService } from '@/services/inventory.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageListHeader } from '@/components/layout/page-list-header'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import type { InventoryItem, Party, SaleRecord } from '@/types'
import { TransactionForm, type DraftLine } from '@/components/commerce/Transaction-form'
import { SaleTransactionList } from '@/components/commerce/sale-transaction-list'
import { SaleBillPreviewModal } from '@/components/commerce/sale-bill-preview-modal'
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
import { printSaleBill } from '@/lib/print-bill'

const PAGE_SIZE = 10
const MODULE_PATH = '/admin/sales'
const emptyLines = (): DraftLine[] => [{ itemId: '', quantity: 0, unitPrice: 0 }]

const saleToDraftLines = (sale: SaleRecord): DraftLine[] =>
  sale.lines.map((line) => ({
    itemId: line.itemId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }))

export const SalesPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const canCreate = hasPermission(user?.role, 'sales.create', user?.permissions)
  const canDelete = hasPermission(user?.role, 'sales.delete', user?.permissions)
  const isCreateRoute = isModuleCreateRoute(location.pathname, MODULE_PATH)
  const isEditRoute = isModuleEditRoute(location.pathname, MODULE_PATH)
  const editId = getEditId(location)
  const isFormRoute = isCreateRoute || isEditRoute

  const [sales, setSales] = useState<SaleRecord[]>([])
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
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null)
  const [previewSale, setPreviewSale] = useState<SaleRecord | null>(null)

  const loadList = async (pageNum = page) => {
    setLoading(true)
    try {
      const res = await salesService.list({
        page: pageNum,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        partyId: filters.partyId || undefined,
        from: filters.dateFrom || undefined,
        to: filters.dateTo || undefined,
      })
      setSales(res.data)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  const loadFormData = async () => {
    const [partyRows, inventory] = await Promise.all([
      partyService.list({ type: 'CUSTOMER', page: 1, pageSize: 500 }),
      inventoryService.list({ page: 1, pageSize: 500 }),
    ])
    setParties(partyRows.data)
    setItems(inventory.data)
  }

  const loadSaleForEdit = async (id: string) => {
    setFormLoading(true)
    try {
      const sale = await salesService.getById(id)
      setEditingSale(sale)
      setPartyId(sale.partyId ?? '')
      setDiscount(sale.discount)
      setNotes(sale.notes ?? '')
      setLines(sale.lines.length ? saleToDraftLines(sale) : emptyLines())
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({ title: 'Could not load sale', description: message, variant: 'error' })
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
    void partyService.list({ type: 'CUSTOMER', page: 1, pageSize: 500 }).then((res) => setFilterParties(res.data))
  }, [isFormRoute])

  useEffect(() => {
    if (!isEditRoute) {
      setEditingSale(null)
      return
    }
    if (!editId) {
      navigate(MODULE_PATH)
      return
    }
    void loadSaleForEdit(editId)
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
    setEditingSale(null)
  }

  const closeForm = () => navigate(MODULE_PATH)

  const submitSale = async () => {
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
      if (isEditRoute && editingSale) {
        await salesService.update(editingSale.id, payload)
        toast({ title: 'Sale updated' })
      } else {
        await salesService.create(payload)
        toast({ title: 'Sale saved' })
      }
      resetForm()
      setPage(1)
      closeForm()
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({
        title: isEditRoute ? 'Update failed' : 'Sale failed',
        description: message,
        variant: 'error',
      })
    }
  }

  const openPreview = async (record: SaleRecord) => {
    try {
      const full = await salesService.getById(record.id)
      setPreviewSale(full)
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({ title: 'Could not load bill', description: message, variant: 'error' })
    }
  }

  const openDownload = async (record: SaleRecord) => {
    try {
      const full = await salesService.getById(record.id)
      printSaleBill(full)
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
      return <EmptyState title="Access denied" subtitle="You do not have permission to create sales." />
    }
    return (
      <div className="space-y-4">
        <PageListHeader title="New sale" subtitle="Record a sale and reduce stock." showAdd={false} />
        <Button variant="outline" onClick={closeForm}>
          Back to Sales
        </Button>
        <Card>
          <TransactionForm
            mode="sale"
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
            onSubmit={submitSale}
          />
        </Card>
      </div>
    )
  }

  if (isEditRoute) {
    if (!canCreate) {
      return <EmptyState title="Access denied" subtitle="You do not have permission to edit sales." />
    }
    if (formLoading || !editingSale) {
      return <EmptyState title="Loading sale…" subtitle="Please wait." />
    }
    return (
      <div className="space-y-4">
        <PageListHeader
          title={`Edit sale — ${editingSale.invoiceNo}`}
          subtitle="Update line items; stock is adjusted automatically."
          showAdd={false}
        />
        <Button variant="outline" onClick={closeForm}>
          Back to Sales
        </Button>
        <Card>
          <TransactionForm
            mode="sale"
            title={`Edit ${editingSale.invoiceNo}`}
            submitLabel="Update Sale"
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
            onSubmit={submitSale}
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
        emptySubtitle="No sales found. Click Add to create a sale."
        header={
          <PageListHeader
            title="Sales"
            subtitle="Record sales and reduce stock automatically."
            addLabel="Add"
            showAdd={canCreate}
            onAdd={() => navigate(`${MODULE_PATH}/create`)}
          />
        }
        filters={
          <CommerceListFilters
            mode="sale"
            parties={filterParties}
            values={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyCommerceFilters())}
          />
        }
        pagination={<ListPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
      >
        <SaleTransactionList
          records={sales}
          canEdit={canCreate}
          canDelete={canDelete}
          onPreview={openPreview}
          onEdit={(record) => navigateToEdit(navigate, MODULE_PATH, record.id)}
          onDownload={openDownload}
          onDelete={async (record) => {
            if (!window.confirm(`Delete sale ${record.invoiceNo}? Stock will be restored.`)) return
            try {
              await salesService.delete(record.id)
              if (sales.length === 1 && page > 1) setPage(page - 1)
              else await loadList(page)
              toast({ title: 'Sale deleted' })
            } catch (error) {
              const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
              toast({ title: 'Delete failed', description: message, variant: 'error' })
            }
          }}
        />
      </ListPageLayout>

      <SaleBillPreviewModal sale={previewSale} onClose={() => setPreviewSale(null)} />
    </>
  )
}
