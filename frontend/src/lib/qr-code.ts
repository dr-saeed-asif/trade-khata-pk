import QRCode from 'qrcode'
import { mmToDots } from '@/lib/label-printer'

/** QR error correction levels (approximate damage recovery). */
export const QR_ERROR_CORRECTION_LEVELS = {
  L: '~7%',
  M: '~15%',
  Q: '~25%',
  H: '~30%',
} as const

export type QrErrorCorrectionLevel = keyof typeof QR_ERROR_CORRECTION_LEVELS

/** Default for printed labels — survives scratches and dirt better than M. */
export const DEFAULT_QR_ERROR_CORRECTION: QrErrorCorrectionLevel = 'H'

export const qrCodeToDataUrl = (
  value: string,
  errorCorrectionLevel: QrErrorCorrectionLevel = DEFAULT_QR_ERROR_CORRECTION,
  width = 512,
) =>
  QRCode.toDataURL(value, {
    errorCorrectionLevel,
    margin: 1,
    width,
  })

/** Small QR for 50×25mm thermal labels. */
export const qrCodeToDataUrlForLabel = (value: string) =>
  qrCodeToDataUrl(value, DEFAULT_QR_ERROR_CORRECTION, mmToDots(14))
