import { formatItemExpiryLabel, formatItemLabelTitle, type ItemLabelInfo } from '@/lib/item-label'
import { cn, currency } from '@/lib/utils'

interface ItemCodeStickerProps {
  label: ItemLabelInfo
  imageUrl: string
  codeType: 'qr' | 'barcode'
  sku?: string
  className?: string
}

/** Barcode column width — header and code stay inside this box. */
const BARCODE_COL_CLASS = 'w-full max-w-[252px]'

export const ItemCodeSticker = ({ label, imageUrl, codeType, sku, className }: ItemCodeStickerProps) => {
  const expiryText = formatItemExpiryLabel(label)
  const labelTitle = formatItemLabelTitle(label)
  const priceText = typeof label.price === 'number' ? currency(label.price) : '—'
  const isBarcode = codeType === 'barcode'
  const codeImageClass = isBarcode
    ? 'h-auto w-full max-h-[76px] object-contain'
    : 'h-44 w-44 object-contain'
  const codeColClass = isBarcode ? BARCODE_COL_CLASS : 'w-44'

  return (
    <div
      className={cn(
        'relative mx-auto w-fit overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm',
        isBarcode ? 'px-1 py-2' : 'p-4',
        className,
      )}
    >
      <div className={cn('flex items-stretch', isBarcode ? 'gap-0' : 'gap-2')}>
        <div className={cn(codeColClass, 'flex min-w-0 shrink-0 flex-col')}>
          <div className="mb-0.5 flex min-w-0 items-center justify-between gap-1.5 text-sm font-bold leading-tight text-slate-900">
            <span className="shrink-0 ml-2 whitespace-nowrap">{priceText}</span>
            <span className="min-w-0 truncate text-right">{labelTitle}</span>
          </div>
          <img src={imageUrl} alt={isBarcode ? 'Barcode' : 'QR code'} className={codeImageClass} />
          {sku?.trim() ? (
            <p className="w-full truncate text-center text-xs font-bold leading-tight text-slate-900">
              {sku.trim()}
            </p>
          ) : null}
        </div>
        {expiryText ? (
          <div className={cn('flex shrink-0 items-center', isBarcode ? 'pl-0.5' : 'px-1')}>
            <p
              className={cn(
                'whitespace-nowrap p-0 font-bold leading-none text-slate-900',
                isBarcode ? 'text-[10px]' : 'text-sm',
              )}
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
              aria-label={`Expiry: ${expiryText}`}
            >
              {expiryText}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
