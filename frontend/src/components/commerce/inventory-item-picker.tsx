import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { lookupGroceryItemUrduName } from '@/lib/grocery-catalog'
import type { InventoryItem } from '@/types'

interface InventoryItemPickerProps {
  items: InventoryItem[]
  value: string
  onChange: (itemId: string) => void
  'aria-label'?: string
}

const MAX_OPTIONS = 80

function itemMatchesQuery(item: InventoryItem, query: string): boolean {
  const trimmed = query.trim()
  if (!trimmed) return true
  const lower = trimmed.toLowerCase()
  if (item.name.toLowerCase().includes(lower)) return true
  const urdu = lookupGroceryItemUrduName(item.name)
  return urdu ? urdu.includes(trimmed) : false
}

export const InventoryItemPicker = ({ items, value, onChange, 'aria-label': ariaLabel }: InventoryItemPickerProps) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selectedItem = useMemo(() => items.find((row) => row.id === value), [items, value])

  useEffect(() => {
    if (selectedItem) {
      setQuery(selectedItem.name)
    } else if (!value) {
      setQuery('')
    }
  }, [selectedItem, value])

  const filteredItems = useMemo(
    () => items.filter((item) => itemMatchesQuery(item, query)).slice(0, MAX_OPTIONS),
    [items, query],
  )

  const selectItem = (item: InventoryItem) => {
    onChange(item.id)
    setQuery(item.name)
    setIsOpen(false)
  }

  const selectedUrdu = selectedItem ? lookupGroceryItemUrduName(selectedItem.name) : undefined

  return (
    <div className="relative md:col-span-2">
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          if (value) onChange('')
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 120)
        }}
        placeholder={formPlaceholders.commerce.searchItem}
        aria-label={ariaLabel ?? 'Item'}
        autoComplete="off"
      />
      {selectedItem && !isOpen ? (
        <div className="mt-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
          <p className="text-sm font-medium text-slate-900">{selectedItem.name}</p>
          {/* <p className="mt-0.5 text-xs text-slate-500">
            <span className="font-medium text-slate-600">Item #:</span> {selectedItem.sku}
          </p> */}
          {selectedUrdu ? (
            <p className="mt-0.5 text-left text-xs leading-snug text-slate-600" dir="rtl" lang="ur">
              {selectedUrdu}
            </p>
          ) : null}
          <p className="mt-0.5 text-xs text-slate-500">Stock: {selectedItem.quantity}</p>
        </div>
      ) : null}
      {isOpen ? (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          {filteredItems.length ? (
            filteredItems.map((item) => {
              const urduName = lookupGroceryItemUrduName(item.name)
              return (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full items-start justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    selectItem(item)
                  }}
                >
                  <span className="min-w-0 text-slate-800">
                    {item.name}
                    <span className="block text-xs text-slate-500">
                      Item #: {item.sku} · stock: {item.quantity}
                    </span>
                  </span>
                  {urduName ? (
                    <span className="shrink-0 text-xs text-slate-500" dir="rtl" lang="ur">
                      {urduName}
                    </span>
                  ) : null}
                </button>
              )
            })
          ) : (
            <p className="px-2 py-1.5 text-xs text-slate-500">No matching items. Try another name.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
