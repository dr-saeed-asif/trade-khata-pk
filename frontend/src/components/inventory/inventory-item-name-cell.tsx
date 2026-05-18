import { lookupGroceryItemUrduName } from '@/lib/grocery-catalog'

interface InventoryItemNameCellProps {
  name: string
}

export const InventoryItemNameCell = ({ name }: InventoryItemNameCellProps) => {
  const nameUr = lookupGroceryItemUrduName(name)

  return (
    <div className="min-w-0">
      <p className="font-medium leading-snug text-slate-900">{name}</p>
      {nameUr ? (
        <p className="mt-0.5 text-left text-xs leading-snug text-slate-600" dir="rtl" lang="ur">
          {nameUr}
        </p>
      ) : null}
    </div>
  )
}
