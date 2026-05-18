import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ItemCodeSticker } from '@/components/Item/item-code-sticker'
import type { ItemLabelInfo } from '@/lib/item-label'

interface ItemTableProps {
  label?: ItemLabelInfo | null
  qrImage: string
  barcodeImage: string
  onDownload: (imageUrl: string, filename: string) => void
}

export const ItemTable = ({ label, qrImage, barcodeImage, onDownload }: ItemTableProps) => {
  if ((!qrImage && !barcodeImage) || !label) return null

  return (
    <Card className="space-y-4 print:border-0 print:shadow-none">
      <p className="font-medium">Generated Codes</p>
      <div className="grid gap-6 md:grid-cols-2">
        {qrImage ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-slate-700">QR Code</p>
            <ItemCodeSticker label={label} imageUrl={qrImage} codeType="qr" />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onDownload(qrImage, `qr-code-${Date.now()}.png`)}
            >
              Download QR
            </Button>
          </div>
        ) : null}
        {barcodeImage ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-slate-700">Barcode (CODE128)</p>
            <ItemCodeSticker label={label} imageUrl={barcodeImage} codeType="barcode" />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onDownload(barcodeImage, `barcode-${Date.now()}.png`)}
            >
              Download Barcode
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex gap-2 print:hidden">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print Codes
        </Button>
      </div>
    </Card>
  )
}
