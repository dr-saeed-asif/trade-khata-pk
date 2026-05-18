import { buildPurchaseBillDocument } from '@/lib/purchase-bill-html'
import { buildSaleBillDocument } from '@/lib/sale-bill-html'
import type { PurchaseRecord, SaleRecord } from '@/types'

const runPrintWhenReady = (targetWindow: Window, onDone?: () => void) => {
  const triggerPrint = () => {
    targetWindow.focus()
    targetWindow.print()
    if (onDone) {
      targetWindow.onafterprint = onDone
    }
  }

  const logo = targetWindow.document.querySelector('img')
  if (logo && !logo.complete) {
    logo.addEventListener('load', triggerPrint, { once: true })
    logo.addEventListener('error', triggerPrint, { once: true })
    window.setTimeout(triggerPrint, 1500)
    return
  }

  window.setTimeout(triggerPrint, 300)
}

const printViaIframe = (html: string) => {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Bill print')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)

  const frameWindow = iframe.contentWindow
  if (!frameWindow) {
    document.body.removeChild(iframe)
    throw new Error('Could not open print view.')
  }

  frameWindow.document.open()
  frameWindow.document.write(html)
  frameWindow.document.close()

  runPrintWhenReady(frameWindow, () => {
    window.setTimeout(() => {
      document.body.removeChild(iframe)
    }, 500)
  })
}

const openBillPrint = (html: string) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=920,height=1100')

  if (!printWindow) {
    printViaIframe(html)
    return
  }

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
  runPrintWhenReady(printWindow, () => {
    printWindow.close()
  })
}

/** Open print dialog with a fully styled bill (choose Save as PDF in the dialog). */
export const printSaleBill = (sale: SaleRecord) => {
  openBillPrint(buildSaleBillDocument(sale, `${sale.invoiceNo} - Bill`))
}

export const printPurchaseBill = (purchase: PurchaseRecord) => {
  openBillPrint(buildPurchaseBillDocument(purchase, `${purchase.invoiceNo} - Purchase Bill`))
}
