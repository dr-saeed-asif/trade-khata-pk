import { formatItemExpiryLabel, formatItemLabelTitle, type ItemLabelInfo } from '@/lib/item-label'
import { cn, currency } from '@/lib/utils'

interface ItemCodeStickerProps {
  label: ItemLabelInfo
  imageUrl: string
  codeType: 'qr' | 'barcode'
  className?: string
}

const BARCODE_MAX_WIDTH = 'max-w-[200px]'

export const ItemCodeSticker = ({ label, imageUrl, codeType, className }: ItemCodeStickerProps) => {
  const expiryText = formatItemExpiryLabel(label)
  const labelTitle = formatItemLabelTitle(label)
  const codeColumnClass =
    codeType === 'qr' ? 'mx-auto w-44' : cn('mx-auto w-full', BARCODE_MAX_WIDTH)
  const codeImageClass =
    codeType === 'qr' ? 'h-44 w-44 object-contain' : cn('h-24 w-full object-contain', BARCODE_MAX_WIDTH)
  const expiryMaxHeight = codeType === 'qr' ? 'max-h-44' : 'max-h-24'

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-md overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <div className={cn(codeColumnClass, 'flex flex-col')}>
        <p className="min-w-0 truncate text-sm font-bold text-slate-900">
          {typeof label.price === 'number' ? currency(label.price) : '—'}
        </p>

        <div className="flex items-start gap-1">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <img src={imageUrl} alt={codeType === 'qr' ? 'QR code' : 'Barcode'} className={codeImageClass} />
            <p className="text-center text-sm font-semibold leading-snug text-slate-900">{labelTitle}</p>
          </div>

          {expiryText ? (
            <p
              className={cn(
                'shrink-0 self-stretch overflow-hidden text-[8px] font-semibold leading-[1.15] text-amber-800',
                expiryMaxHeight,
              )}
              style={{ writingMode: 'vertical-rl', textOrientation: 'sideways' }}
              aria-label={`Expiry: ${expiryText}`}
            >
              {expiryText}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
