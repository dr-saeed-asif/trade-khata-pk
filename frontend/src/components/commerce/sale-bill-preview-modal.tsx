import { Download, Printer } from 'lucide-react'
import { SaleBillSlip } from '@/components/commerce/sale-bill-slip'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { downloadSaleBillPdf, printSaleBill } from '@/lib/print-bill'
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

  const handleDownload = () => {
    void downloadSaleBillPdf(sale).catch((error) => {
      if (error instanceof Error) {
        window.alert(error.message)
      }
    })
  }

  return (
    <Modal
      open={Boolean(sale)}
      title={`Bill preview — ${sale.invoiceNo}`}
      onClose={onClose}
      panelClassName="max-w-[52rem]"
      bodyClassName="p-0"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Print opens the print dialog. Download saves a PDF file directly.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="gap-1.5" onClick={onClose}>
              Close
            </Button>
            <Button variant="outline" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button className="gap-1.5" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download bill (PDF)
            </Button>
          </div>
        </div>
      }
    >
      <SaleBillSlip sale={sale} slipId={slipId} className="max-w-none px-5 py-5 sm:px-8 sm:py-6" />
    </Modal>
  )
}
