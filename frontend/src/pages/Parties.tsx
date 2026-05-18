import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { partyService } from '@/services/party.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageListHeader } from '@/components/layout/page-list-header'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import type { PartyType } from '@/types'
import { PartyForm } from '@/components/parties/Party-form'
import { PartyTable } from '@/components/parties/Party-table'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { ListPagination } from '@/components/ui/list-pagination'
import {
  PartyListFilters,
  emptyPartyFilters,
  type PartyListFilterValues,
} from '@/components/parties/party-list-filters'
import { useDebounce } from '@/hooks/use-debounce'
import {
  getEditId,
  isModuleCreateRoute,
  isModuleEditRoute,
  navigateToEdit,
} from '@/lib/edit-route'

const PAGE_SIZE = 10
const PARTIES_PATH = '/admin/parties'

export const PartiesPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const canManage = hasPermission(user?.role, 'parties.manage', user?.permissions)
  const isCreateRoute = isModuleCreateRoute(location.pathname, PARTIES_PATH)
  const isEditRoute = isModuleEditRoute(location.pathname, PARTIES_PATH)
  const isFormRoute = isCreateRoute || isEditRoute
  const editId = getEditId(location)

  const [parties, setParties] = useState<Awaited<ReturnType<typeof partyService.list>>['data']>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<PartyListFilterValues>(emptyPartyFilters)
  const debouncedSearch = useDebounce(filters.search, 300)
  const hasActiveFilters = Boolean(filters.search || filters.type)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [type, setType] = useState<PartyType>('BOTH')

  const load = async (pageNum = page) => {
    setLoading(true)
    try {
      const res = await partyService.list({
        page: pageNum,
        pageSize: PAGE_SIZE,
        search: debouncedSearch || undefined,
        type: filters.type || undefined,
      })
      setParties(res.data)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isFormRoute) return
    void load(page)
  }, [isFormRoute, page, debouncedSearch, filters.type])

  useEffect(() => {
    if (isFormRoute) return
    setPage(1)
  }, [isFormRoute, debouncedSearch, filters.type])

  useEffect(() => {
    if (isCreateRoute) resetForm()
  }, [isCreateRoute])

  useEffect(() => {
    if (!isEditRoute) return
    if (!editId) {
      navigate(PARTIES_PATH, { replace: true })
      return
    }
    setFormLoading(true)
    void partyService
      .getById(editId)
      .then((party) => {
        setName(party.name)
        setPhone(party.phone ?? '')
        setEmail(party.email ?? '')
        setAddress(party.address ?? '')
        setType(party.type)
      })
      .catch((error) => {
        const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
        toast({ title: 'Failed to load party', description: message, variant: 'error' })
        navigate('/admin/parties')
      })
      .finally(() => setFormLoading(false))
  }, [isEditRoute, editId, navigate, toast])

  const resetForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setAddress('')
    setType('BOTH')
  }

  const closeForm = () => navigate('/admin/parties')

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      toast({ title: 'Name is required', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = { name, phone, email, address, type }
      if (isCreateRoute) {
        await partyService.create(payload)
        resetForm()
        toast({ title: 'Party added' })
        setPage(1)
      } else if (isEditRoute && editId) {
        await partyService.update(editId, payload)
        toast({ title: 'Party updated' })
      }
      closeForm()
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({
        title: isCreateRoute ? 'Failed to add party' : 'Update failed',
        description: message,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (isFormRoute) {
    if (!canManage) {
      return <EmptyState title="Access denied" subtitle="You do not have permission to manage parties." />
    }
    return (
      <div className="space-y-4">
        <PageListHeader
          title={isCreateRoute ? 'Add party' : 'Edit party'}
          subtitle={
            isCreateRoute
              ? 'Create a customer or supplier.'
              : 'Update party details for sales and purchases.'
          }
          showAdd={false}
        />
        <Button variant="outline" onClick={closeForm}>
          Back to Parties
        </Button>
        <Card className="p-4">
          {formLoading ? (
            <p className="text-sm text-slate-500">Loading party...</p>
          ) : (
            <PartyForm
              name={name}
              phone={phone}
              email={email}
              address={address}
              type={type}
              canManage
              submitLabel={saving ? 'Saving...' : isCreateRoute ? 'Save party' : 'Update party'}
              onNameChange={setName}
              onPhoneChange={setPhone}
              onEmailChange={setEmail}
              onAddressChange={setAddress}
              onTypeChange={setType}
              onCancel={closeForm}
              onSubmit={() => void handleSubmit()}
            />
          )}
        </Card>
      </div>
    )
  }

  return (
    <ListPageLayout
      loading={loading}
      isEmpty={!loading && total === 0 && !hasActiveFilters}
      emptySubtitle="No parties found. Click Add to create one."
      header={
        <PageListHeader
          title="Parties"
          subtitle="Customers and suppliers for sales and purchases."
          addLabel="Add"
          showAdd={canManage}
          onAdd={() => navigate('/admin/parties/create')}
        />
      }
      filters={
        <PartyListFilters
          values={filters}
          onChange={setFilters}
          onClear={() => setFilters(emptyPartyFilters())}
        />
      }
      pagination={<ListPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
    >
      <PartyTable
        parties={parties}
        canManage={canManage}
        onEdit={(party) => navigateToEdit(navigate, PARTIES_PATH, party.id)}
        onDelete={async (party) => {
          if (!window.confirm(`Delete "${party.name}"?`)) return
          try {
            await partyService.delete(party.id)
            if (parties.length === 1 && page > 1) setPage(page - 1)
            else await load(page)
            toast({ title: 'Party deleted' })
          } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
            toast({ title: 'Delete failed', description: message, variant: 'error' })
          }
        }}
      />
    </ListPageLayout>
  )
}
