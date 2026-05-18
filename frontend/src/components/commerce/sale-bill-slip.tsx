import { appLogo } from '@/lib/branding'
import {
  BUSINESS_ADDRESS_URDU,
  BUSINESS_NAME,
  BUSINESS_NAME_URDU,
  BUSINESS_PHONE,
  BILL_TERMS_URDU,
} from '@/lib/business'
import { InvoiceBanner } from '@/components/commerce/invoice-banner'
import { amountToWords } from '@/lib/number-to-words'
import type { SaleRecord } from '@/types'

const slipPurple = '#6b21a8'
const slipPurpleLight = '#f3e8ff'

const formatBillDate = (value: string) => {
  const d = new Date(value)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

interface SaleBillSlipProps {
  sale: SaleRecord
  /** DOM id used when printing / downloading */
  slipId?: string
}

export const SaleBillSlip = ({ sale, slipId = 'sale-bill-slip' }: SaleBillSlipProps) => (
  <div
    id={slipId}
    className="mx-auto w-full max-w-[210mm] bg-white text-[11px] leading-snug text-slate-900"
    style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
  >
    <div className="flex items-start justify-between gap-4 border-b-2 pb-3" style={{ borderColor: slipPurple }}>
      <img src={appLogo} alt="" className="h-20 w-20 shrink-0 rounded-full object-contain" />
      <div className="min-w-0 flex-1 text-right">
        <p className="text-base font-bold" style={{ color: slipPurple }}>
          {BUSINESS_NAME}
        </p>
        <p className="mt-0.5 text-sm font-semibold" dir="rtl">
          {BUSINESS_NAME_URDU}
        </p>
        <p className="mt-1 text-xs" dir="rtl">
          {BUSINESS_ADDRESS_URDU}
        </p>
        <p className="mt-1 text-xs font-medium">Phone: {BUSINESS_PHONE}</p>
      </div>
    </div>

    <InvoiceBanner titleEn="INVOICE" titleUr="بل" />

    <div className="mb-4 grid grid-cols-2 gap-4">
      <div>
        <p className="mb-1 text-xs font-bold uppercase" style={{ color: slipPurple }}>
          Bill To
        </p>
        <p className="text-sm font-semibold">{sale.party?.name ?? 'Walk-in Customer'}</p>
        {sale.party?.phone ? <p className="text-xs text-slate-600">{sale.party.phone}</p> : null}
      </div>
      <div className="text-right text-sm">
        <p>
          <span className="font-semibold">Invoice No.: </span>
          {sale.invoiceNo}
        </p>
        <p className="mt-1">
          <span className="font-semibold">Date: </span>
          {formatBillDate(sale.saleDate)}
        </p>
      </div>
    </div>

    <table className="w-full border-collapse text-[10px]">
      <thead>
        <tr style={{ backgroundColor: slipPurple, color: '#fff' }}>
          <th className="w-8 border border-white/20 px-1 py-1.5 text-left">#</th>
          <th className="border border-white/20 px-2 py-1.5 text-left">Item name</th>
          <th className="border border-white/20 px-2 py-1.5 text-left">Item code</th>
          <th className="w-14 border border-white/20 px-2 py-1.5 text-right">Qty</th>
          <th className="w-24 border border-white/20 px-2 py-1.5 text-right">Price / unit</th>
          <th className="w-24 border border-white/20 px-2 py-1.5 text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {sale.lines.map((line, index) => (
          <tr key={line.id ?? `${line.itemId}-${index}`} className="border-b border-slate-200">
            <td className="px-1 py-1">{index + 1}</td>
            <td className="px-2 py-1">{line.itemName ?? '—'}</td>
            <td className="px-2 py-1"></td>
            <td className="px-2 py-1 text-right">{line.quantity}</td>
            <td className="px-2 py-1 text-right">Rs {line.unitPrice.toFixed(2)}</td>
            <td className="px-2 py-1 text-right font-medium">
              Rs {(line.lineTotal ?? line.quantity * line.unitPrice).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <div className="mt-4 grid grid-cols-2 gap-4">
      <div className="space-y-3">
        <div className="overflow-hidden rounded border" style={{ borderColor: slipPurple }}>
          <div className="px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: slipPurple }}>
            Invoice Amount In Words
          </div>
          <p className="px-2 py-2 text-xs capitalize">{amountToWords(sale.total)}</p>
        </div>
        <div className="overflow-hidden rounded border" style={{ borderColor: slipPurple }}>
          <div className="px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: slipPurple }}>
            Terms and Conditions
          </div>
          <p className="px-2 py-2 text-xs leading-relaxed" dir="rtl">
            {BILL_TERMS_URDU}
          </p>
        </div>
        {sale.notes ? (
          <p className="text-xs text-slate-600">
            <span className="font-semibold">Notes: </span>
            {sale.notes}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded border" style={{ borderColor: slipPurple }}>
        <div className="px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: slipPurple }}>
          Amounts
        </div>
        <table className="w-full text-xs">
          <tbody>
            <tr className="border-b border-slate-200" style={{ backgroundColor: slipPurpleLight }}>
              <td className="px-2 py-1.5 font-medium">Sub Total</td>
              <td className="px-2 py-1.5 text-right">Rs {sale.subtotal.toFixed(2)}</td>
            </tr>
            {sale.discount > 0 ? (
              <tr className="border-b border-slate-200">
                <td className="px-2 py-1.5 font-medium">Discount</td>
                <td className="px-2 py-1.5 text-right">Rs {sale.discount.toFixed(2)}</td>
              </tr>
            ) : null}
            <tr className="border-b border-slate-200 font-bold">
              <td className="px-2 py-1.5">Total</td>
              <td className="px-2 py-1.5 text-right">Rs {sale.total.toFixed(2)}</td>
            </tr>
            <tr>
              <td className="px-2 py-1.5 font-medium">Balance</td>
              <td className="px-2 py-1.5 text-right font-semibold">Rs {sale.total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
)
