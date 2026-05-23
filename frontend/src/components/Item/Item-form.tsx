import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { groceryCatalogData } from '@/lib/grocery-catalog'
import type { Category } from '@/types'
import type { ItemInput } from '@/lib/validators'

interface ItemFormProps {
  form: ItemInput
  categories: Category[]
  itemOptions: string[]
  errors: Partial<Record<keyof ItemInput, string>>
  isSubmitting: boolean
  mode?: 'create' | 'edit'
  submitLabel?: string
  onCancel?: () => void
  onFormChange: (field: keyof ItemInput, value: unknown) => void
  onSubmit: () => void
}

const generateNumericSku = () => `${Date.now()}${Math.floor(100 + Math.random() * 900)}`

const FieldLabel = ({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
    {children}
  </label>
)

const FieldError = ({ message }: { message?: string }) => (
  <p className="min-h-[1rem] text-xs text-red-600">{message}</p>
)

export const ItemForm = ({
  form,
  categories,
  itemOptions,
  errors,
  isSubmitting,
  mode = 'create',
  submitLabel,
  onCancel,
  onFormChange,
  onSubmit,
}: ItemFormProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const isEditMode = mode === 'edit'
  const setAutoSku = () => onFormChange('sku', generateNumericSku())
  const urduNameLookup = useMemo(
    () =>
      new Map(
        groceryCatalogData.categories.flatMap((category) =>
          category.items.map((item) => [item.nameEn, item.nameUr] as const),
        ),
      ),
    [],
  )
  const urduCategoryLookup = useMemo(
    () => new Map(groceryCatalogData.categories.map((category) => [category.nameEn, category.nameUr] as const)),
    [],
  )
  const filteredOptions = useMemo(() => {
    const query = form.name.trim().toLowerCase()
    if (!query) return itemOptions.slice(0, 80)
    return itemOptions
      .filter((name) => {
        const urduName = urduNameLookup.get(name)
        return name.toLowerCase().includes(query) || (urduName ? urduName.includes(form.name.trim()) : false)
      })
      .slice(0, 80)
  }, [form.name, itemOptions, urduNameLookup])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-1.5 md:col-span-2">
        <FieldLabel htmlFor="item-name">Select item (English / اردو) or type manually *</FieldLabel>
        <div className="relative">
          <Input
            id="item-name"
            placeholder={formPlaceholders.item.name}
            value={form.name}
            onChange={(event) => {
              const selectedName = event.target.value
              onFormChange('name', selectedName)
              if (!isEditMode && !form.sku && selectedName.trim()) setAutoSku()
              setIsDropdownOpen(true)
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsDropdownOpen(false), 120)
            }}
          />
          {isDropdownOpen ? (
            <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
              {filteredOptions.length ? (
                filteredOptions.map((name) => {
                  const urduName = urduNameLookup.get(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                      onMouseDown={(event) => {
                        event.preventDefault()
                        onFormChange('name', name)
                        if (!isEditMode && !form.sku) setAutoSku()
                        setIsDropdownOpen(false)
                      }}
                    >
                      <span className="text-slate-800">{name}</span>
                      {urduName ? (
                        <span className="text-xs text-slate-500" dir="rtl">
                          {urduName}
                        </span>
                      ) : null}
                    </button>
                  )
                })
              ) : (
                <p className="px-2 py-1.5 text-xs text-slate-500">No match. You can still type a custom item name.</p>
              )}
            </div>
          ) : null}
        </div>
        <FieldError message={errors.name} />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-category">Select category *</FieldLabel>
        <select
          id="item-category"
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          value={form.categoryId}
          onChange={(event) => onFormChange('categoryId', event.target.value)}
        >
          <option value="">{formPlaceholders.item.category}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {urduCategoryLookup.has(category.name)
                ? `${category.name} (${urduCategoryLookup.get(category.name)})`
                : category.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId} />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-price">Price (e.g. 199.99) *</FieldLabel>
        <Input
          id="item-price"
          type="number"
          step="0.01"
          placeholder={formPlaceholders.item.price}
          value={form.price === 0 ? '' : String(form.price)}
          onChange={(event) => onFormChange('price', Number(event.target.value || 0))}
        />
        <FieldError message={errors.price} />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-quantity">Quantity (optional)</FieldLabel>
        <Input
          id="item-quantity"
          type="number"
          placeholder={formPlaceholders.item.quantity}
          value={form.quantity === 0 ? '' : String(form.quantity)}
          onChange={(event) => onFormChange('quantity', Number(event.target.value || 0))}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-supplier">Supplier (optional)</FieldLabel>
        <Input
          id="item-supplier"
          placeholder={formPlaceholders.item.supplier}
          value={form.supplier}
          onChange={(event) => onFormChange('supplier', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-location">Location (optional)</FieldLabel>
        <Input
          id="item-location"
          placeholder={formPlaceholders.item.location}
          value={form.location}
          onChange={(event) => onFormChange('location', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-weight">Weight (optional)</FieldLabel>
        <Input
          id="item-weight"
          placeholder={formPlaceholders.item.weight}
          value={form.weight ?? ''}
          onChange={(event) => onFormChange('weight', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-expiry-message">Expiry message (optional)</FieldLabel>
        <Input
          id="item-expiry-message"
          placeholder={formPlaceholders.item.expiryMessage}
          value={form.expiryMessage ?? ''}
          onChange={(event) => onFormChange('expiryMessage', event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <FieldLabel htmlFor="item-expiry-date">Expiry date (optional)</FieldLabel>
        <Input
          id="item-expiry-date"
          type="date"
          placeholder={formPlaceholders.item.expiryDate}
          value={form.expiryDate?.slice(0, 10) ?? ''}
          onChange={(event) => onFormChange('expiryDate', event.target.value || undefined)}
        />
      </div>

      <div className="space-y-1.5 md:col-span-2">
        <FieldLabel htmlFor="item-description">Description (optional)</FieldLabel>
        <textarea
          id="item-description"
          className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm placeholder:text-slate-400"
          placeholder={formPlaceholders.item.description}
          value={form.description ?? ''}
          onChange={(event) => onFormChange('description', event.target.value)}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
        {onCancel ? (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel ?? (isEditMode ? 'Save changes' : 'Create Item')}
        </Button>
      </div>
    </form>
  )
}
