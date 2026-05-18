const slipPurple = '#6b21a8'

interface InvoiceBannerProps {
  titleEn: string
  titleUr: string
}

/** Bilingual invoice title — LTR order avoids Urdu/English bidi swap in the bar. */
export const InvoiceBanner = ({ titleEn, titleUr }: InvoiceBannerProps) => (
  <div
    className="my-3 flex items-center justify-center gap-2.5 py-2 text-sm font-bold tracking-wide text-white"
    style={{ backgroundColor: slipPurple }}
    dir="ltr"
  >
    <span>{titleEn}</span>
    <span className="font-normal opacity-90" aria-hidden="true">
      /
    </span>
    <span dir="rtl" lang="ur">
      {titleUr}
    </span>
  </div>
)

export const invoiceBannerHtml = (titleEn: string, titleUr: string, purple: string) =>
  `<div style="background:${purple};color:#fff;text-align:center;padding:10px 0;font-size:13px;font-weight:bold;margin-bottom:16px;" dir="ltr">
    <span style="display:inline-block;vertical-align:middle;">${titleEn}</span>
    <span style="display:inline-block;vertical-align:middle;margin:0 10px;font-weight:400;opacity:0.95;">/</span>
    <span style="display:inline-block;vertical-align:middle;" dir="rtl" lang="ur">${titleUr}</span>
  </div>`
