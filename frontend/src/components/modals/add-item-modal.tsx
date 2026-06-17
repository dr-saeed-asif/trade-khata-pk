import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { Category } from '@/types'
import type { ItemInput } from '@/lib/validators'

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onSubmit: () => Promise<void>
  categories: Category[]
  form: ItemInput
  errors: Partial<Record<keyof ItemInput, string>>
  isSubmitting: boolean
  onFormChange: (field: keyof ItemInput, value: any) => void
}

export const AddItemModal = ({
  open,
  onClose,
  onSubmit,
  categories,
  form,
  errors,
  isSubmitting,
  onFormChange,
}: AddItemModalProps) => {
  return (
    <Modal
      open={open}
      title="Add New Item"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={isSubmitting} onClick={onSubmit}>
            {isSubmitting ? 'Adding...' : 'Add Item'}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Input
            placeholder="Item Name"
            value={form.name}
            onChange={(e) => onFormChange('name', e.target.value)}
          />
          {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
        </div>
        <div>
          <Input
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => onFormChange('sku', e.target.value)}
          />
          {errors.sku && <p className="text-xs text-red-600 mt-1">{errors.sku}</p>}
        </div>
        <div>
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={form.categoryId}
            onChange={(e) => onFormChange('categoryId', e.target.value)}
          >
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="text-xs text-red-600 mt-1">{errors.categoryId}</p>}
        </div>
        <div>
          <Input
            type="number"
            placeholder="Quantity"
            value={form.quantity === 0 ? '' : String(form.quantity)}
            onChange={(e) => onFormChange('quantity', Number(e.target.value || 0))}
          />
          {errors.quantity && <p className="text-xs text-red-600 mt-1">{errors.quantity}</p>}
        </div>
        <div>
          <Input
            type="number"
            placeholder="Reserved Qty"
            value={form.reservedQty ? String(form.reservedQty) : ''}
            onChange={(e) => onFormChange('reservedQty', Number(e.target.value || 0))}
          />
          {errors.reservedQty && <p className="text-xs text-red-600 mt-1">{errors.reservedQty}</p>}
        </div>
        <div>
          <Input
            type="date"
            placeholder="Expiry Date"
            value={form.expiryDate ?? ''}
            onChange={(e) => onFormChange('expiryDate', e.target.value)}
          />
          {errors.expiryDate && <p className="text-xs text-red-600 mt-1">{errors.expiryDate}</p>}
        </div>
        <div>
          <Input
            type="number"
            step="0.01"
            placeholder="Price"
            value={form.price === 0 ? '' : String(form.price)}
            onChange={(e) => onFormChange('price', Number(e.target.value || 0))}
          />
          {errors.price && <p className="text-xs text-red-600 mt-1">{errors.price}</p>}
        </div>
        <div>
          <Input
            placeholder="Supplier"
            value={form.supplier}
            onChange={(e) => onFormChange('supplier', e.target.value)}
          />
          {errors.supplier && <p className="text-xs text-red-600 mt-1">{errors.supplier}</p>}
        </div>
        <div>
          <Input
            placeholder="Location"
            value={form.location}
            onChange={(e) => onFormChange('location', e.target.value)}
          />
          {errors.location && <p className="text-xs text-red-600 mt-1">{errors.location}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs text-slate-600">Additional categories (multi-select)</label>
          <select
            multiple
            className="min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={form.categoryIds ?? []}
            onChange={(e) =>
              onFormChange(
                'categoryIds',
                Array.from(e.currentTarget.selectedOptions).map((option) => option.value),
              )
            }
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Input
            placeholder="Tags (comma separated)"
            value={(form.tags ?? []).join(', ')}
            onChange={(e) =>
              onFormChange(
                'tags',
                e.target.value
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
        <div className="md:col-span-2 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold">Batch / Lot (optional)</p>
          <div className="grid gap-2 md:grid-cols-4">
            <Input
              placeholder="Batch Number"
              value={form.batches?.[0]?.batchNumber ?? ''}
              onChange={(e) =>
                onFormChange('batches', [
                  {
                    ...(form.batches?.[0] ?? { quantity: form.quantity }),
                    batchNumber: e.target.value,
                  },
                ])
              }
            />
            <Input
              placeholder="Lot Number"
              value={form.batches?.[0]?.lotNumber ?? ''}
              onChange={(e) =>
                onFormChange('batches', [
                  {
                    ...(form.batches?.[0] ?? { quantity: form.quantity }),
                    lotNumber: e.target.value,
                    batchNumber: form.batches?.[0]?.batchNumber ?? '',
                  },
                ])
              }
            />
            <Input
              type="date"
              placeholder="Batch Expiry"
              value={form.batches?.[0]?.expiryDate ?? ''}
              onChange={(e) =>
                onFormChange('batches', [
                  {
                    ...(form.batches?.[0] ?? { quantity: form.quantity }),
                    expiryDate: e.target.value,
                    batchNumber: form.batches?.[0]?.batchNumber ?? '',
                  },
                ])
              }
            />
            <Input
              type="number"
              placeholder="Batch Qty"
              value={String(form.batches?.[0]?.quantity ?? form.quantity)}
              onChange={(e) =>
                onFormChange('batches', [
                  {
                    ...(form.batches?.[0] ?? {}),
                    quantity: Number(e.target.value || 0),
                    batchNumber: form.batches?.[0]?.batchNumber ?? '',
                  },
                ])
              }
            />
          </div>
        </div>
        <div className="md:col-span-2 rounded-md border border-slate-200 p-3">
          <p className="mb-2 text-sm font-semibold">Primary Variant (optional)</p>
          <div className="grid gap-2 md:grid-cols-3">
            <Input
              placeholder="Variant SKU"
              value={form.variants?.[0]?.sku ?? ''}
              onChange={(e) =>
                onFormChange('variants', [
                  {
                    ...form.variants?.[0],
                    sku: e.target.value,
                    quantity: form.variants?.[0]?.quantity ?? 0,
                  },
                ])
              }
            />
            <Input
              placeholder="Size"
              value={form.variants?.[0]?.size ?? ''}
              onChange={(e) =>
                onFormChange('variants', [
                  {
                    ...form.variants?.[0],
                    sku: form.variants?.[0]?.sku ?? '',
                    quantity: form.variants?.[0]?.quantity ?? 0,
                    size: e.target.value,
                  },
                ])
              }
            />
            <Input
              placeholder="Color"
              value={form.variants?.[0]?.color ?? ''}
              onChange={(e) =>
                onFormChange('variants', [
                  {
                    ...form.variants?.[0],
                    sku: form.variants?.[0]?.sku ?? '',
                    quantity: form.variants?.[0]?.quantity ?? 0,
                    color: e.target.value,
                  },
                ])
              }
            />
            <Input
              placeholder="Model"
              value={form.variants?.[0]?.model ?? ''}
              onChange={(e) =>
                onFormChange('variants', [
                  {
                    ...form.variants?.[0],
                    sku: form.variants?.[0]?.sku ?? '',
                    quantity: form.variants?.[0]?.quantity ?? 0,
                    model: e.target.value,
                  },
                ])
              }
            />
            <Input
              type="number"
              placeholder="Variant Qty"
              value={String(form.variants?.[0]?.quantity ?? 0)}
              onChange={(e) =>
                onFormChange('variants', [
                  {
                    ...form.variants?.[0],
                    sku: form.variants?.[0]?.sku ?? '',
                    quantity: Number(e.target.value || 0),
                  },
                ])
              }
            />
            <Input
              type="number"
              placeholder="Variant Reserved Qty"
              value={String(form.variants?.[0]?.reservedQty ?? 0)}
              onChange={(e) =>
                onFormChange('variants', [
                  {
                    ...form.variants?.[0],
                    sku: form.variants?.[0]?.sku ?? '',
                    quantity: form.variants?.[0]?.quantity ?? 0,
                    reservedQty: Number(e.target.value || 0),
                  },
                ])
              }
            />
          </div>
        </div>
        <div className="md:col-span-2">
          <textarea
            className="min-h-24 w-full rounded-md border border-slate-300 p-3 text-sm"
            placeholder="Description (optional)"
            value={form.description ?? ''}
            onChange={(e) => onFormChange('description', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
