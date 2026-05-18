import { Download, Printer } from 'lucide-react'
import { SaleBillSlip } from '@/components/commerce/sale-bill-slip'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { printSaleBill } from '@/lib/print-bill'
import type { SaleRecord } from '@/types'

interface SaleBillPreviewModalProps {
  sale: SaleRecord | null
  onClose: () => void
}

const slipId = 'sale-bill-slip-print'

export const SaleBillPreviewModal = ({ sale, onClose }: SaleBillPreviewModalProps) => {
  if (!sale) return null

  const handlePrint = () => {
    try {
      printSaleBill(sale)
    } catch (error) {
      if (error instanceof Error) {
        window.alert(error.message)
      }
    }
  }

  return (
    <Modal
      open={Boolean(sale)}
      title={`Bill preview — ${sale.invoiceNo}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" className="gap-1.5" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button className="gap-1.5" onClick={handlePrint}>
            <Download className="h-4 w-4" />
            Download bill (PDF)
          </Button>
        </div>
      }
    >
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <SaleBillSlip sale={sale} slipId={slipId} />
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">
        Use Print or Download, then choose &quot;Save as PDF&quot; in the print dialog.
      </p>
    </Modal>
  )
}
