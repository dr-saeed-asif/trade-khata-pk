import appLogo from '@/assets/banu-adam-logo.png'
import {
  BUSINESS_ADDRESS_URDU,
  BUSINESS_NAME,
  BUSINESS_NAME_URDU,
  BUSINESS_PHONE,
  BILL_TERMS_URDU,
} from '@/lib/business'
import { invoiceBannerHtml } from '@/components/commerce/invoice-banner'
import { amountToWords } from '@/lib/number-to-words'
import type { SaleRecord } from '@/types'

const PURPLE = '#6b21a8'
const PURPLE_LIGHT = '#f3e8ff'

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const formatBillDate = (value: string) => {
  const d = new Date(value)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

const resolveLogoUrl = () => {
  if (appLogo.startsWith('http') || appLogo.startsWith('data:') || appLogo.startsWith('file:')) {
    return appLogo
  }
  try {
    return new URL(appLogo, window.location.href).href
  } catch {
    return appLogo
  }
}

const lineRows = (sale: SaleRecord) =>
  sale.lines
    .map((line, index) => {
      const amount = line.lineTotal ?? line.quantity * line.unitPrice
      const zebra = index % 2 === 1 ? `background:${PURPLE_LIGHT};` : ''
      return `<tr style="border-bottom:1px solid #e2e8f0;${zebra}">
        <td style="padding:4px 6px;">${index + 1}</td>
        <td style="padding:4px 8px;">${escapeHtml(line.itemName ?? '—')}</td>
        <td style="padding:4px 8px;text-align:right;">${line.quantity}</td>
        <td style="padding:4px 8px;text-align:right;">Rs ${line.unitPrice.toFixed(2)}</td>
        <td style="padding:4px 8px;text-align:right;font-weight:600;">Rs ${amount.toFixed(2)}</td>
      </tr>`
    })
    .join('')

const discountRow =
  (sale: SaleRecord) =>
  sale.discount > 0
    ? `<tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:6px 8px;font-weight:500;">Discount</td>
        <td style="padding:6px 8px;text-align:right;">Rs ${sale.discount.toFixed(2)}</td>
      </tr>`
    : ''

/** Self-contained HTML for print / PDF (inline styles, no Tailwind). */
export const buildSaleBillDocument = (sale: SaleRecord, title?: string) => {
  const logoUrl = resolveLogoUrl()
  const docTitle = escapeHtml(title ?? `${sale.invoiceNo} - Bill`)
  const partyName = escapeHtml(sale.party?.name ?? 'Walk-in Customer')
  const partyPhone = sale.party?.phone ? `<p style="margin:4px 0 0;font-size:11px;color:#64748b;">${escapeHtml(sale.party.phone)}</p>` : ''
  const notesBlock = sale.notes
    ? `<p style="margin:8px 0 0;font-size:11px;color:#64748b;"><strong>Notes:</strong> ${escapeHtml(sale.notes)}</p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${docTitle}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: Arial, Helvetica, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
    @media print {
      body { padding: 0; }
      @page { size: A4; margin: 12mm; }
    }
  </style>
</head>
<body>
  <div style="max-width:210mm;margin:0 auto;background:#fff;">
    <table style="width:100%;border-collapse:collapse;border-bottom:2px solid ${PURPLE};margin-bottom:12px;">
      <tr>
        <td style="width:88px;vertical-align:top;padding-bottom:12px;">
          <img src="${logoUrl}" alt="Logo" width="80" height="80" style="display:block;border-radius:50%;object-fit:contain;" />
        </td>
        <td style="vertical-align:top;text-align:right;padding-bottom:12px;">
          <p style="margin:0;font-size:16px;font-weight:bold;color:${PURPLE};">${escapeHtml(BUSINESS_NAME)}</p>
          <p style="margin:4px 0 0;font-size:13px;font-weight:600;" dir="rtl">${escapeHtml(BUSINESS_NAME_URDU)}</p>
          <p style="margin:4px 0 0;font-size:11px;" dir="rtl">${escapeHtml(BUSINESS_ADDRESS_URDU)}</p>
          <p style="margin:6px 0 0;font-size:11px;font-weight:500;">Phone: ${escapeHtml(BUSINESS_PHONE)}</p>
        </td>
      </tr>
    </table>

    ${invoiceBannerHtml('INVOICE', 'بل', PURPLE)}

    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr>
        <td style="width:50%;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:${PURPLE};text-transform:uppercase;">Bill To</p>
          <p style="margin:0;font-size:13px;font-weight:600;">${partyName}</p>
          ${partyPhone}
        </td>
        <td style="width:50%;vertical-align:top;text-align:right;font-size:12px;">
          <p style="margin:0;"><strong>Invoice No.:</strong> ${escapeHtml(sale.invoiceNo)}</p>
          <p style="margin:6px 0 0;"><strong>Date:</strong> ${formatBillDate(sale.saleDate)}</p>
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:16px;">
      <thead>
        <tr style="background:${PURPLE};color:#fff;">
          <th style="padding:6px;border:1px solid rgba(255,255,255,0.2);text-align:left;width:32px;">#</th>
          <th style="padding:6px 8px;border:1px solid rgba(255,255,255,0.2);text-align:left;">Item name</th>
          <th style="padding:6px 8px;border:1px solid rgba(255,255,255,0.2);text-align:left;width:72px;">Item code</th>
          <th style="padding:6px 8px;border:1px solid rgba(255,255,255,0.2);text-align:right;width:48px;">Qty</th>
          <th style="padding:6px 8px;border:1px solid rgba(255,255,255,0.2);text-align:right;width:88px;">Price / unit</th>
          <th style="padding:6px 8px;border:1px solid rgba(255,255,255,0.2);text-align:right;width:88px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${lineRows(sale)}
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="width:50%;vertical-align:top;padding-right:12px;">
          <div style="border:1px solid ${PURPLE};border-radius:4px;overflow:hidden;margin-bottom:12px;">
            <div style="background:${PURPLE};color:#fff;padding:6px 8px;font-size:11px;font-weight:bold;">Invoice Amount In Words</div>
            <p style="margin:0;padding:8px;font-size:11px;text-transform:capitalize;">${escapeHtml(amountToWords(sale.total))}</p>
          </div>
          <div style="border:1px solid ${PURPLE};border-radius:4px;overflow:hidden;">
            <div style="background:${PURPLE};color:#fff;padding:6px 8px;font-size:11px;font-weight:bold;">Terms and Conditions</div>
            <p style="margin:0;padding:8px;font-size:11px;line-height:1.5;" dir="rtl">${escapeHtml(BILL_TERMS_URDU)}</p>
          </div>
          ${notesBlock}
        </td>
        <td style="width:50%;vertical-align:top;">
          <div style="border:1px solid ${PURPLE};border-radius:4px;overflow:hidden;">
            <div style="background:${PURPLE};color:#fff;padding:6px 8px;font-size:11px;font-weight:bold;">Amounts</div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <tbody>
                <tr style="background:${PURPLE_LIGHT};border-bottom:1px solid #e2e8f0;">
                  <td style="padding:6px 8px;font-weight:500;">Sub Total</td>
                  <td style="padding:6px 8px;text-align:right;">Rs ${sale.subtotal.toFixed(2)}</td>
                </tr>
                ${discountRow(sale)}
                <tr style="border-bottom:1px solid #e2e8f0;font-weight:bold;">
                  <td style="padding:6px 8px;">Total</td>
                  <td style="padding:6px 8px;text-align:right;">Rs ${sale.total.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 8px;font-weight:500;">Balance</td>
                  <td style="padding:6px 8px;text-align:right;font-weight:600;">Rs ${sale.total.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`
}
