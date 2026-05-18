import { BILL_TERMS_ENGLISH, BILL_TERMS_URDU } from '@/lib/business'
import { BILL_TERMS_TITLE } from '@/lib/bill-terms'

interface BillTermsSectionProps {
  borderColor: string
}

export const BillTermsSection = ({ borderColor }: BillTermsSectionProps) => (
  <div className="rounded border" style={{ borderColor }}>
    <div className="px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: borderColor }}>
      {BILL_TERMS_TITLE}
    </div>
    <p className="px-2 pt-2 text-xs leading-relaxed">{BILL_TERMS_ENGLISH}</p>
    <p className="px-2 pb-3 text-xs leading-relaxed" dir="rtl">
      {BILL_TERMS_URDU}
    </p>
  </div>
)
