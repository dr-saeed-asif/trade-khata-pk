import { lookupGroceryItemUrduName } from '@/lib/grocery-catalog'

interface CommerceLineItemRowProps {
  lineNumber: number
  itemName: string
  itemSku?: string
  quantity: number
  unitPrice: number
  lineTotal?: number
}

export const CommerceLineItemRow = ({
  lineNumber,
  itemName,
  itemSku,
  quantity,
  unitPrice,
  lineTotal,
}: CommerceLineItemRowProps) => {
  const total = lineTotal ?? quantity * unitPrice
  const nameUr = lookupGroceryItemUrduName(itemName)

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 border-b border-slate-100/80 py-2 last:border-0 last:pb-0 first:pt-0">
      <div className="col-start-1 row-start-1 min-w-0">
        <p className="font-medium leading-snug text-slate-900">
          <span className="mr-1.5 text-slate-400">{lineNumber}.</span>
          {itemName}
        </p>
      </div>
      <span className="col-start-2 row-start-1 shrink-0 whitespace-nowrap text-right text-slate-600">
        × {quantity} @ Rs {unitPrice} = Rs {total.toFixed(2)}
      </span>
      {nameUr ? (
        <p className="col-start-1 row-start-2 text-left text-xs leading-snug text-slate-600" dir="rtl" lang="ur">
          {nameUr}
        </p>
      ) : null}
    </li>
  )
}
