import { useEffect, useState } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { itemSchema, type ItemInput } from '@/lib/validators'
import { inventoryService } from '@/services/inventory.service'
import { categoryService } from '@/services/category.service'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import type { Category, InventoryItem } from '@/types'
import { groceryCatalogData } from '@/lib/grocery-catalog'
import { ItemForm } from '@/components/Item/Item-form'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { getEditId } from '@/lib/edit-route'

const INVENTORY_PATH = '/admin/inventory'

const staticCatalogNames = Array.from(
  new Set(
    groceryCatalogData.categories.flatMap((category) => category.items.map((item) => item.nameEn)),
  ),
).sort((left, right) => left.localeCompare(right))

const emptyForm = (): ItemInput => ({
  name: '',
  sku: '',
  categoryId: '',
  quantity: 0,
  price: 0,
  supplier: '',
  location: '',
  description: '',
  weight: '',
  expiryMessage: '',
})

const itemToForm = (item: InventoryItem): ItemInput => ({
  name: item.name,
  sku: item.sku,
  categoryId: item.categoryId ?? item.categories?.[0]?.id ?? '',
  quantity: item.quantity,
  price: item.price,
  supplier: item.supplier,
  location: item.location,
  description: item.description ?? '',
  weight: item.weight ?? '',
  expiryMessage: item.expiryMessage ?? '',
  expiryDate: item.expiryDate,
})

export const EditItemPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const editId = getEditId(location)
  const user = useAuthStore((state) => state.user)
  const canUpdateItem = hasPermission(user?.role, 'items.update', user?.permissions)

  const [categories, setCategories] = useState<Category[]>([])
  const [itemOptions, setItemOptions] = useState<string[]>([])
  const [formLoading, setFormLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ItemInput, string>>>({})
  const [form, setForm] = useState<ItemInput>(emptyForm())

  useEffect(() => {
    categoryService.list({ page: 1, pageSize: 500 }).then((res) => setCategories(res.data))
  }, [])

  useEffect(() => {
    const loadItemOptions = async () => {
      try {
        const names = await inventoryService.catalogNames()
        setItemOptions(Array.from(new Set([...staticCatalogNames, ...names])).sort((left, right) => left.localeCompare(right)))
      } catch {
        setItemOptions(staticCatalogNames)
      }
    }

    void loadItemOptions()
  }, [])

  useEffect(() => {
    if (!editId) {
      navigate(INVENTORY_PATH, { replace: true })
      return
    }

    setFormLoading(true)
    void inventoryService
      .getById(editId)
      .then((item) => setForm(itemToForm(item)))
      .catch((error) => {
        const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
        toast({
          title: 'Failed to load item',
          description: message ?? (error instanceof Error ? error.message : 'Please try again.'),
          variant: 'error',
        })
        navigate(INVENTORY_PATH)
      })
      .finally(() => setFormLoading(false))
  }, [editId, navigate, toast])

  const closeForm = () => navigate(INVENTORY_PATH)

  const onSubmit = async (values: ItemInput) => {
    if (!editId) return
    const parsed = itemSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(parsed.error.issues.reduce<Partial<Record<keyof ItemInput, string>>>((acc, issue) => {
        const path = issue.path[0] as keyof ItemInput
        acc[path] = issue.message
        return acc
      }, {}))
      return
    }
    setErrors({})
    setIsSubmitting(true)
    try {
      await inventoryService.update(editId, parsed.data)
      toast({ title: 'Item updated successfully' })
      closeForm()
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : undefined
      toast({
        title: 'Update failed',
        description: message ?? (error instanceof Error ? error.message : 'Please try again.'),
        variant: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canUpdateItem) {
    return <EmptyState title="Access denied" subtitle="You do not have permission to edit inventory items." />
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Edit Item</h2>
        <Button type="button" variant="outline" onClick={closeForm}>
          Back to Inventories
        </Button>
      </div>
      {formLoading ? (
        <p className="text-sm text-slate-500">Loading item...</p>
      ) : (
        <ItemForm
          form={form}
          categories={categories}
          itemOptions={itemOptions}
          errors={errors}
          isSubmitting={isSubmitting}
          mode="edit"
          onCancel={closeForm}
          onFormChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
          onSubmit={() => void onSubmit(form)}
        />
      )}
    </Card>
  )
}
