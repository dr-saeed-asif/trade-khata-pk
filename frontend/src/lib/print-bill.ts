import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { buildPurchaseBillDocument } from '@/lib/purchase-bill-html'
import { buildSaleBillDocument } from '@/lib/sale-bill-html'
import type { PurchaseRecord, SaleRecord } from '@/types'

const BILL_FRAME_WIDTH_PX = 794
const BILL_ROOT_SELECTOR = '#bill-document-root, [data-bill-root]'
const PDF_MARGIN_MM = 10
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297

const parseBillHtml = (html: string) => {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  if (parsed.querySelector('parsererror')) {
    throw new Error('Could not parse bill document.')
  }

  const root = parsed.querySelector(BILL_ROOT_SELECTOR) ?? parsed.body?.firstElementChild
  if (!(root instanceof HTMLElement)) {
    throw new Error('Bill document root not found.')
  }

  return { parsed, root }
}

const mountBillHost = (html: string) => {
  const { parsed, root } = parseBillHtml(html)

  const host = document.createElement('div')
  host.setAttribute('data-bill-host', 'true')
  host.style.cssText = `position:fixed;left:-9999px;top:0;width:${BILL_FRAME_WIDTH_PX}px;background:#fff;z-index:-1;overflow:visible;`

  parsed.querySelectorAll('style').forEach((styleNode) => {
    if (styleNode.textContent) {
      const style = document.createElement('style')
      style.textContent = styleNode.textContent
      host.appendChild(style)
    }
  })

  const mountedRoot = root.cloneNode(true)
  if (!(mountedRoot instanceof HTMLElement)) {
    throw new Error('Bill document root not found.')
  }
  host.appendChild(mountedRoot)
  document.body.appendChild(host)

  return { host, root: mountedRoot }
}

const unmountBillHost = (host: HTMLElement) => {
  if (host.parentNode) host.parentNode.removeChild(host)
}

const waitForImages = (root: HTMLElement) =>
  new Promise<void>((resolve) => {
    const images = Array.from(root.querySelectorAll('img'))
    if (!images.length) {
      resolve()
      return
    }

    let pending = images.length
    const done = () => {
      pending -= 1
      if (pending <= 0) resolve()
    }

    images.forEach((image) => {
      if (image.complete) {
        done()
        return
      }
      image.addEventListener('load', done, { once: true })
      image.addEventListener('error', done, { once: true })
    })

    window.setTimeout(resolve, 3000)
  })

const renderBillRootToPdf = async (root: HTMLElement, filename: string) => {
  await waitForImages(root)

  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    width: BILL_FRAME_WIDTH_PX,
    windowWidth: BILL_FRAME_WIDTH_PX,
  })

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const usableW = A4_WIDTH_MM - PDF_MARGIN_MM * 2
  const usableH = A4_HEIGHT_MM - PDF_MARGIN_MM * 2

  const imgWidthMm = usableW
  const imgHeightMm = (canvas.height * usableW) / canvas.width
  const imgData = canvas.toDataURL('image/jpeg', 0.92)

  if (imgHeightMm <= usableH) {
    pdf.addImage(imgData, 'JPEG', PDF_MARGIN_MM, PDF_MARGIN_MM, imgWidthMm, imgHeightMm)
  } else {
    const scale = usableH / imgHeightMm
    const scaledW = imgWidthMm * scale
    const x = PDF_MARGIN_MM + (usableW - scaledW) / 2
    pdf.addImage(imgData, 'JPEG', x, PDF_MARGIN_MM, scaledW, usableH)
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

const printViaBlobUrl = (html: string) => {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const printWindow = window.open(url, '_blank')

  if (!printWindow) {
    URL.revokeObjectURL(url)
    throw new Error('Pop-up blocked. Please allow pop-ups to print the bill.')
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

const printViaHiddenIframe = (html: string) => {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Bill print')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  iframe.src = url

  iframe.onload = () => {
    URL.revokeObjectURL(url)
    const frameWindow = iframe.contentWindow
    if (!frameWindow) return
    frameWindow.focus()
    frameWindow.print()
    window.setTimeout(() => {
      if (iframe.parentNode) document.body.removeChild(iframe)
    }, 1000)
  }
}

const printBillHtml = (html: string) => {
  try {
    printViaBlobUrl(html)
  } catch {
    printViaHiddenIframe(html)
  }
}

const downloadBillPdfFromHtml = async (html: string, filename: string) => {
  const { host, root } = mountBillHost(html)
  try {
    await renderBillRootToPdf(root, filename)
  } finally {
    unmountBillHost(host)
  }
}

export const printSaleBill = (sale: SaleRecord) => {
  try {
    printBillHtml(buildSaleBillDocument(sale, `${sale.invoiceNo} - Bill`))
  } catch (error) {
    console.error(error)
    window.alert(error instanceof Error ? error.message : 'Could not print bill.')
  }
}

export const printPurchaseBill = (purchase: PurchaseRecord) => {
  try {
    printBillHtml(buildPurchaseBillDocument(purchase, `${purchase.invoiceNo} - Purchase Bill`))
  } catch (error) {
    console.error(error)
    window.alert(error instanceof Error ? error.message : 'Could not print bill.')
  }
}

export const downloadSaleBillPdf = async (sale: SaleRecord) => {
  await downloadBillPdfFromHtml(
    buildSaleBillDocument(sale, `${sale.invoiceNo} - Bill`),
    `${sale.invoiceNo}-sale-bill.pdf`,
  )
}

export const downloadPurchaseBillPdf = async (purchase: PurchaseRecord) => {
  await downloadBillPdfFromHtml(
    buildPurchaseBillDocument(purchase, `${purchase.invoiceNo} - Purchase Bill`),
    `${purchase.invoiceNo}-purchase-bill.pdf`,
  )
}
