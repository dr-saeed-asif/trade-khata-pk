import { BILL_TERMS_ENGLISH, BILL_TERMS_URDU } from '@/lib/business'

export const BILL_TERMS_TITLE = 'Terms and Conditions / شرائط و ضوابط'

export const billTermsHtml = (purple: string, escapeHtml: (value: string) => string) => `
  <div style="border:1px solid ${purple};border-radius:4px;overflow:hidden;">
    <div style="background:${purple};color:#fff;padding:6px 8px;font-size:11px;font-weight:bold;">${escapeHtml(BILL_TERMS_TITLE)}</div>
    <p style="margin:0;padding:8px 8px 4px;font-size:11px;line-height:1.5;">${escapeHtml(BILL_TERMS_ENGLISH)}</p>
    <p style="margin:0;padding:4px 8px 8px;font-size:11px;line-height:1.5;" dir="rtl">${escapeHtml(BILL_TERMS_URDU)}</p>
  </div>`
