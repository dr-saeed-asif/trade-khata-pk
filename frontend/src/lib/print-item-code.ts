import { formatItemExpiryLabel, formatItemLabelTitle, type ItemLabelInfo } from '@/lib/item-label'
import { currency } from '@/lib/utils'

export interface PrintItemCodeOptions {
  label: ItemLabelInfo
  imageUrl: string
  codeType: 'qr' | 'barcode'
  title: string
  sku: string
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const buildItemCodePrintHtml = ({ label, imageUrl, codeType, title, sku }: PrintItemCodeOptions) => {
  const labelTitle = formatItemLabelTitle(label)
  const expiryText = formatItemExpiryLabel(label)
  const priceText = typeof label.price === 'number' ? currency(label.price) : '—'
  const codeWidth = codeType === 'qr' ? 176 : 280
  const codeHeight = codeType === 'qr' ? 176 : 96
  const expiryBlock = expiryText
    ? `<p style="margin:0;font-size:8px;font-weight:600;line-height:1.15;color:#92400e;writing-mode:vertical-rl;text-orientation:sideways;max-height:${codeHeight}px;overflow:hidden;">${escapeHtml(expiryText)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: Arial, Helvetica, sans-serif; }
    @page { size: auto; margin: 12mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div style="max-width:420px;margin:0 auto;padding:16px;border:1px solid #e2e8f0;border-radius:8px;">
    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#0f172a;">${escapeHtml(priceText)}</p>
    <div style="display:flex;align-items:flex-start;gap:4px;">
      <div style="flex:1;min-width:0;">
        <img src="${imageUrl}" alt="${codeType === 'qr' ? 'QR code' : 'Barcode'}" width="${codeWidth}" height="${codeHeight}" style="display:block;max-width:100%;height:auto;margin:0 auto;object-fit:contain;" />
        <p style="margin:8px 0 0;text-align:center;font-size:14px;font-weight:600;line-height:1.35;color:#0f172a;">${escapeHtml(labelTitle)}</p>
      </div>
      ${expiryBlock}
    </div>
    <p style="margin:12px 0 0;text-align:center;font-size:11px;color:#64748b;">SKU: ${escapeHtml(sku)}</p>
  </div>
</body>
</html>`
}

const printHtml = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')

  if (!printWindow) {
    URL.revokeObjectURL(url)
    throw new Error('Pop-up blocked. Please allow pop-ups to print the label.')
  }

  const cleanup = () => URL.revokeObjectURL(url)

  printWindow.addEventListener(
    'load',
    () => {
      printWindow.focus()
      printWindow.print()
      printWindow.addEventListener('afterprint', () => {
        printWindow.close()
        cleanup()
      })
      window.setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close()
          cleanup()
        }
      }, 60000)
    },
    { once: true },
  )
}

export const printItemCodeSticker = (options: PrintItemCodeOptions) => {
  try {
    printHtml(buildItemCodePrintHtml(options))
  } catch (error) {
    console.error(error)
    window.alert(error instanceof Error ? error.message : 'Could not print label.')
  }
}
