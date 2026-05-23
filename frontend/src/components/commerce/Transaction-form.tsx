import { InventoryItemPicker } from '@/components/commerce/inventory-item-picker'
import { formPlaceholders } from '@/lib/form-placeholders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { InventoryItem, Party } from '@/types'

export interface DraftLine {
  itemId: string
  quantity: number
  unitPrice: number
}

interface TransactionFormProps {
  mode: 'sale' | 'purchase'
  parties: Party[]
  items: InventoryItem[]
  partyId: string
  discount: number
  notes: string
  lines: DraftLine[]
  canCreate: boolean
  onPartyIdChange: (value: string) => void
  onDiscountChange: (value: number) => void
  onNotesChange: (value: string) => void
  onLinesChange: (lines: DraftLine[]) => void
  onSubmit: () => void
  onCancel?: () => void
  title?: string
  submitLabel?: string
}

const emptyLine = (): DraftLine => ({ itemId: '', quantity: 0, unitPrice: 0 })

const numberInputValue = (value: number) => (value === 0 ? '' : String(value))

export const TransactionForm = ({
  mode,
  parties,
  items,
  partyId,
  discount,
  notes,
  lines,
  canCreate,
  onPartyIdChange,
  onDiscountChange,
  onNotesChange,
  onLinesChange,
  onSubmit,
  onCancel,
  title,
  submitLabel,
}: TransactionFormProps) => {
  if (!canCreate) return null

  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
  const total = Math.max(0, subtotal - discount)

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    const next = lines.map((line, i) => {
      if (i !== index) return line
      const updated = { ...line, ...patch }
      if (patch.itemId) {
        const item = items.find((row) => row.id === patch.itemId)
        if (item) updated.unitPrice = item.price
      }
      return updated
    })
    onLinesChange(next)
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <h3 className="font-medium">
        {title ?? (mode === 'sale' ? 'New Sale' : 'New Purchase')}
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Party (optional)</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={partyId}
            onChange={(e) => onPartyIdChange(e.target.value)}
          >
            <option value="">— Walk-in —</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">Discount (Rs)</label>
          <Input
            type="number"
            min={0}
            value={numberInputValue(discount)}
            onChange={(e) => onDiscountChange(e.target.value === '' ? 0 : Number(e.target.value) || 0)}
            placeholder={formPlaceholders.commerce.discount}
          />
        </div>
        <div className="space-y-1 md:col-span-2">
          <label className="text-sm font-medium text-slate-700">Notes</label>
          <Input
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder={formPlaceholders.commerce.notes}
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-700">Line items</p>
        <div className="hidden gap-2 px-2 text-xs font-medium text-slate-500 md:grid md:grid-cols-4">
          <span className="md:col-span-2">Item (English / اردو)</span>
          <span>Quantity</span>
          <span>Unit price (Rs)</span>
        </div>
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 rounded border p-2 md:grid-cols-4">
            <InventoryItemPicker
              items={items}
              value={line.itemId}
              onChange={(itemId) => updateLine(index, { itemId })}
              aria-label="Item"
            />
            <Input
              type="number"
              min={1}
              value={numberInputValue(line.quantity)}
              onChange={(e) =>
                updateLine(index, { quantity: e.target.value === '' ? 0 : Number(e.target.value) || 0 })
              }
              placeholder={formPlaceholders.commerce.quantity}
              aria-label="Quantity"
            />
            <Input
              type="number"
              min={0}
              step="0.01"
              value={numberInputValue(line.unitPrice)}
              onChange={(e) =>
                updateLine(index, { unitPrice: e.target.value === '' ? 0 : Number(e.target.value) || 0 })
              }
              placeholder={formPlaceholders.commerce.unitPrice}
              aria-label="Unit price"
            />
          </div>
        ))}
        <Button
          variant="outline"
          type="button"
          onClick={() => onLinesChange([...lines, emptyLine()])}
        >
          Add line
        </Button>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <p className="text-sm text-slate-600">
          Subtotal: Rs {subtotal.toFixed(2)} · Total: <span className="font-semibold">Rs {total.toFixed(2)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onSubmit}>
            {submitLabel ?? (mode === 'sale' ? 'Save Sale' : 'Save Purchase')}
          </Button>
          {onCancel ? (
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
