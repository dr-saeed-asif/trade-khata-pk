import { formatItemExpiryLabel, type ItemLabelInfo } from '@/lib/item-label'
import { cn, currency } from '@/lib/utils'

interface ItemCodeStickerProps {
  label: ItemLabelInfo
  imageUrl: string
  codeType: 'qr' | 'barcode'
  className?: string
}

export const ItemCodeSticker = ({ label, imageUrl, codeType, className }: ItemCodeStickerProps) => {
  const expiryText = formatItemExpiryLabel(label)
  const weightText = label.weight?.trim() ? `Wt: ${label.weight.trim()}` : null

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      {expiryText ? (
        <p
          className="absolute bottom-6 right-2 top-10 z-10 max-h-[calc(100%-3rem)] text-[10px] font-semibold leading-tight text-amber-800"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          aria-label={`Expiry: ${expiryText}`}
        >
          {expiryText}
        </p>
      ) : null}

      <div className={cn('flex flex-col', expiryText ? 'pr-6' : undefined)}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="text-sm font-bold text-slate-900">
            {typeof label.price === 'number' ? currency(label.price) : '—'}
          </p>
          {weightText ? (
            <p className="text-right text-sm font-medium text-slate-600">{weightText}</p>
          ) : (
            <span />
          )}
        </div>

        <div className="flex flex-col items-center gap-2 pt-1">
          <img
            src={imageUrl}
            alt={codeType === 'qr' ? 'QR code' : 'Barcode'}
            className={
              codeType === 'qr'
                ? 'h-44 w-44 object-contain'
                : 'h-24 w-full max-w-[280px] object-contain'
            }
          />
          <p className="w-full text-center text-sm font-semibold text-slate-900">{label.name}</p>
        </div>
      </div>
    </div>
  )
}
