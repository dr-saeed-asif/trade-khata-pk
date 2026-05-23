import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { categoryService } from '@/services/category.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageListHeader } from '@/components/layout/page-list-header'
import { ListPageLayout } from '@/components/layout/list-page-layout'
import { CategoryForm } from '@/components/categories/Category-form'
import { CategoryTable } from '@/components/categories/Category-table'
import { categoriesI18n } from '@/components/categories/i18n'
import { formPlaceholders } from '@/lib/form-placeholders'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth-store'
import { useUiStore } from '@/store/ui-store'
import { hasPermission } from '@/lib/permissions'
import { ListPagination } from '@/components/ui/list-pagination'
import {
  getEditId,
  isModuleCreateRoute,
  isModuleEditRoute,
  navigateToEdit,
} from '@/lib/edit-route'

const PAGE_SIZE = 10
const CATEGORIES_PATH = '/admin/categories'

export const CategoriesPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const canManage = hasPermission(user?.role, 'categories.manage', user?.permissions)
  const locale = useUiStore((state) => state.locale)
  const isCreateRoute = isModuleCreateRoute(location.pathname, CATEGORIES_PATH)
  const isEditRoute = isModuleEditRoute(location.pathname, CATEGORIES_PATH)
  const isFormRoute = isCreateRoute || isEditRoute
  const editId = getEditId(location)
  const t = categoriesI18n[locale]

  const [categories, setCategories] = useState<Awaited<ReturnType<typeof categoryService.list>>['data']>([])
  const [loading, setLoading] = useState(true)
  const [formLoading, setFormLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [name, setName] = useState('')

  const load = async (pageNum = page) => {
    setLoading(true)
    try {
      const res = await categoryService.list({ page: pageNum, pageSize: PAGE_SIZE })
      setCategories(res.data)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isFormRoute) return
    void load(page)
  }, [isFormRoute, page])

  useEffect(() => {
    if (isCreateRoute) setName('')
  }, [isCreateRoute])

  useEffect(() => {
    if (!isEditRoute) return
    if (!editId) {
      navigate(CATEGORIES_PATH, { replace: true })
      return
    }
    setFormLoading(true)
    void categoryService
      .getById(editId)
      .then((category) => setName(category.name))
      .catch((error) => {
        const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
        toast({ title: 'Failed to load category', description: message, variant: 'error' })
        navigate('/admin/categories')
      })
      .finally(() => setFormLoading(false))
  }, [isEditRoute, editId, navigate, toast])

  const closeForm = () => navigate('/admin/categories')

  const handleSubmit = async () => {
    if (name.trim().length < 2) {
      toast({ title: 'Category name is required', variant: 'error' })
      return
    }
    setSaving(true)
    try {
      if (isCreateRoute) {
        await categoryService.create({ name })
        setName('')
        toast({ title: 'Category added' })
        setPage(1)
      } else if (isEditRoute && editId) {
        await categoryService.update(editId, { name })
        toast({ title: 'Category updated' })
      }
      closeForm()
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({
        title: isCreateRoute ? 'Failed to add category' : 'Update failed',
        description: message,
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  if (isFormRoute) {
    if (!canManage) {
      return <EmptyState title="Access denied" subtitle="You do not have permission to manage categories." />
    }
    return (
      <div className="space-y-4">
        <PageListHeader
          title={isCreateRoute ? t.title : 'Edit category'}
          subtitle={isCreateRoute ? 'Add a new category.' : 'Update category name.'}
          showAdd={false}
        />
        <Button variant="outline" onClick={closeForm}>
          Back to Categories
        </Button>
        <Card className="p-4">
          {formLoading ? (
            <p className="text-sm text-slate-500">Loading category...</p>
          ) : (
            <CategoryForm
              name={name}
              canManage
              placeholder={formPlaceholders.category.name}
              submitLabel={saving ? 'Saving...' : isCreateRoute ? t.add : t.save}
              onNameChange={setName}
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
      isEmpty={!loading && total === 0}
      emptySubtitle="No categories found. Click Add to create one."
      header={
        <PageListHeader
          title={t.title}
          subtitle="Organize inventory items by category."
          addLabel="Add"
          showAdd={canManage}
          onAdd={() => navigate('/admin/categories/create')}
        />
      }
      pagination={<ListPagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />}
    >
      <CategoryTable
        categories={categories}
        canManage={canManage}
        editLabel={t.edit}
        deleteLabel={t.delete}
        itemsLabel={t.items}
        onEdit={(category) => navigateToEdit(navigate, CATEGORIES_PATH, category.id)}
        onDelete={async (category) => {
          if (!window.confirm(t.deleteConfirm)) return
          try {
            await categoryService.delete(category.id)
            if (categories.length === 1 && page > 1) setPage(page - 1)
            else await load(page)
            toast({ title: 'Category deleted successfully' })
          } catch (error) {
            const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
            toast({
              title: 'Delete failed',
              description: message || (error instanceof Error ? error.message : 'Please try again.'),
              variant: 'error',
            })
          }
        }}
      />
    </ListPageLayout>
  )
}
