import { formatItemExpiryLabel, type ItemLabelInfo } from '@/lib/item-label'
import { currency } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ItemCodeLabelDetailsProps {
  label: ItemLabelInfo
  /** compact = smaller text above QR/barcode image */
  compact?: boolean
  className?: string
}

export const ItemCodeLabelDetails = ({ label, compact = false, className }: ItemCodeLabelDetailsProps) => {
  const expiryText = formatItemExpiryLabel(label)
  const titleClass = compact ? 'text-xs font-semibold text-slate-900' : 'text-sm font-semibold text-slate-900'
  const metaClass = compact ? 'text-[10px] text-slate-600' : 'text-xs text-slate-600'
  const expiryClass = compact ? 'text-[10px] font-medium text-amber-800' : 'text-xs font-medium text-amber-800'
  const priceClass = compact ? 'text-[10px] font-semibold text-slate-800' : 'text-xs font-semibold text-slate-800'

  return (
    <div className={cn('text-center', className)}>
      <p className={titleClass}>{label.name}</p>
      {typeof label.price === 'number' ? <p className={cn('mt-0.5', priceClass)}>{currency(label.price)}</p> : null}
      {label.weight?.trim() ? (
        <p className={cn('mt-0.5', metaClass)}>{compact ? `Wt: ${label.weight.trim()}` : `Weight: ${label.weight.trim()}`}</p>
      ) : null}
      {expiryText ? <p className={cn('mt-0.5', expiryClass)}>{expiryText}</p> : null}
    </div>
  )
}
