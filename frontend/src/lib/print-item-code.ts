import { barcodeToDataUrlForLabel } from '@/lib/barcode'
import { formatItemExpiryLabel, formatItemLabelTitle, type ItemLabelInfo } from '@/lib/item-label'
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM } from '@/lib/label-printer'
import { qrCodeToDataUrlForLabel } from '@/lib/qr-code'
import { currency } from '@/lib/utils'

export {
  LABEL_HEIGHT_MICRONS,
  LABEL_HEIGHT_MM,
  LABEL_WIDTH_MICRONS,
  LABEL_WIDTH_MM,
} from '@/lib/label-printer'

export interface PrintItemCodeOptions {
  label: ItemLabelInfo
  imageUrl: string
  codeType: 'qr' | 'barcode'
  codeValue?: string
  title: string
  sku: string
  copies?: number
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export const buildItemCodePrintHtml = (
  { label, imageUrl, codeType, title, sku }: PrintItemCodeOptions & { imageUrl: string },
) => {
  const labelTitle = formatItemLabelTitle(label)
  const expiryText = formatItemExpiryLabel(label)
  const priceText = typeof label.price === 'number' ? currency(label.price) : '—'
  const expiryBesideCode = expiryText
    ? `<div class="expiry-wrap"><span class="expiry">${escapeHtml(expiryText)}</span></div>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${LABEL_WIDTH_MM}mm, height=${LABEL_HEIGHT_MM}mm" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page {
      size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm;
      margin: 0;
    }
    html, body {
      width: ${LABEL_WIDTH_MM}mm;
      height: ${LABEL_HEIGHT_MM}mm;
      min-width: ${LABEL_WIDTH_MM}mm;
      min-height: ${LABEL_HEIGHT_MM}mm;
      max-width: ${LABEL_WIDTH_MM}mm;
      max-height: ${LABEL_HEIGHT_MM}mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #fff;
      font-family: Arial, Helvetica, sans-serif;
      page-break-before: avoid;
      page-break-after: avoid;
    }
    @media print {
      html, body {
        width: ${LABEL_WIDTH_MM}mm !important;
        height: ${LABEL_HEIGHT_MM}mm !important;
        min-width: ${LABEL_WIDTH_MM}mm !important;
        min-height: ${LABEL_HEIGHT_MM}mm !important;
        max-width: ${LABEL_WIDTH_MM}mm !important;
        max-height: ${LABEL_HEIGHT_MM}mm !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        page-break-before: avoid !important;
        page-break-after: avoid !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    .label-root {
      position: absolute;
      top: 0;
      left: 0;
      width: ${LABEL_WIDTH_MM}mm;
      height: ${LABEL_HEIGHT_MM}mm;
      padding: 0.3mm 0.15mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
      page-break-inside: avoid;
      page-break-before: avoid;
      page-break-after: avoid;
    }
    .code-row {
      display: flex;
      align-items: stretch;
      justify-content: flex-start;
      gap: 0;
      width: 100%;
      height: 100%;
      max-height: ${LABEL_HEIGHT_MM}mm;
      overflow: hidden;
    }
    .code-block {
      flex: 1 1 auto;
      min-width: 0;
      max-width: calc(100% - 7mm);
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: center;
      gap: 0;
    }
    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.8mm;
      width: 100%;
      max-width: 100%;
      height: 4.5mm;
      margin-bottom: 0.2mm;
      overflow: hidden;
    }
    .price {
      flex: 0 0 auto;
      font-size: 2.8mm;
      font-weight: 700;
      line-height: 2.8mm;
      color: #000;
      text-align: left;
      white-space: nowrap;
    }
    .item-title {
      flex: 1 1 auto;
      min-width: 0;
      font-size: 2.5mm;
      font-weight: 700;
      line-height: 2.8mm;
      color: #000;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .code-block img {
      display: block;
      width: 100%;
      height: 10mm;
      max-height: 10mm;
      object-fit: contain;
    }
    .sku {
      width: 100%;
      font-size: 2.4mm;
      font-weight: 700;
      line-height: 2.6mm;
      color: #000;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
    }
    .expiry-wrap {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      align-self: stretch;
      padding-left: 0.2mm;
    }
    .expiry {
      font-size: 2mm;
      font-weight: 700;
      line-height: 1;
      color: #000;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      white-space: nowrap;
      overflow: visible;
    }
  </style>
</head>
<body>
  <div class="label-root">
    <div class="code-row">
      <div class="code-block">
        <div class="header-row">
          <span class="price">${escapeHtml(priceText)}</span>
          <span class="item-title">${escapeHtml(labelTitle)}</span>
        </div>
        <img src="${imageUrl}" alt="${codeType === 'barcode' ? 'Barcode' : 'QR'}" />
        <div class="sku">${escapeHtml(sku)}</div>
      </div>
      ${expiryBesideCode}
    </div>
  </div>
</body>
</html>`
}

const resolvePrintImageUrl = async (options: PrintItemCodeOptions) => {
  const value = options.codeValue?.trim()
  if (value && options.codeType === 'barcode') {
    return barcodeToDataUrlForLabel(value)
  }
  if (value && options.codeType === 'qr') {
    return qrCodeToDataUrlForLabel(value)
  }
  return options.imageUrl
}

const waitForDocumentImages = (doc: Document) =>
  Promise.all(
    Array.from(doc.images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve()
            return
          }
          img.addEventListener('load', () => resolve(), { once: true })
          img.addEventListener('error', () => resolve(), { once: true })
        }),
    ),
  )

const printHtmlInIframe = (html: string) =>
  new Promise<void>((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Print label')
    iframe.style.cssText = `position:fixed;left:0;top:0;width:${LABEL_WIDTH_MM}mm;height:${LABEL_HEIGHT_MM}mm;border:0;opacity:0;pointer-events:none;`
    document.body.appendChild(iframe)

    const frameWindow = iframe.contentWindow
    const doc = iframe.contentDocument
    if (!frameWindow || !doc) {
      iframe.remove()
      reject(new Error('Could not create print frame.'))
      return
    }

    let printStarted = false
    const runPrint = () => {
      if (printStarted) return
      printStarted = true
      frameWindow.focus()
      frameWindow.print()
    }

    let printScheduled = false
    const schedulePrint = () => {
      if (printScheduled) return
      printScheduled = true
      void waitForDocumentImages(doc).then(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(runPrint)
          resolve()
        })
      })
    }

    iframe.addEventListener('load', schedulePrint, { once: true })
    doc.open()
    doc.write(html)
    doc.close()

    frameWindow.addEventListener(
      'afterprint',
      () => {
        window.setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
        }, 200)
      },
      { once: true },
    )
  })

const printHtml = async (html: string, copies: number) => {
  if (window.desktop?.printLabel) {
    await window.desktop.printLabel(html, { copies })
    return
  }
  await printHtmlInIframe(html)
}

export const printItemCodeSticker = async (options: PrintItemCodeOptions) => {
  try {
    const copies = Math.min(10, Math.max(1, options.copies ?? 1))
    const imageUrl = await resolvePrintImageUrl(options)
    const html = buildItemCodePrintHtml({ ...options, imageUrl })
    await printHtml(html, copies)
  } catch (error) {
    console.error(error)
    window.alert(error instanceof Error ? error.message : 'Could not print label.')
  }
}
