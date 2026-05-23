import JsBarcode from 'jsbarcode'
import { mmToDots } from '@/lib/label-printer'

interface BarcodeOptions {
  forPreview?: boolean
}

const scaleCanvasToWidth = (source: HTMLCanvasElement, targetWidth: number) => {
  if (source.width <= 0 || source.height <= 0) return source
  const scaled = document.createElement('canvas')
  scaled.width = targetWidth
  scaled.height = Math.max(1, Math.round((source.height * targetWidth) / source.width))
  const ctx = scaled.getContext('2d')
  if (!ctx) return source
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, scaled.width, scaled.height)
  ctx.drawImage(source, 0, 0, scaled.width, scaled.height)
  return scaled
}

const scaleCanvasToFit = (source: HTMLCanvasElement, targetWidth: number, maxHeight: number) => {
  const scaled = scaleCanvasToWidth(source, targetWidth)
  if (scaled.height <= maxHeight) return scaled
  const fitted = document.createElement('canvas')
  fitted.width = targetWidth
  fitted.height = maxHeight
  const ctx = fitted.getContext('2d')
  if (!ctx) return scaled
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, fitted.width, fitted.height)
  ctx.drawImage(scaled, 0, 0, targetWidth, maxHeight, 0, 0, scaled.width, scaled.height)
  return fitted
}

export const barcodeToDataUrl = (value: string, options?: BarcodeOptions) => {
  const forPreview = options?.forPreview ?? false
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: false,
    margin: forPreview ? 2 : 0,
    height: forPreview ? 72 : 26,
    width: forPreview ? 2 : 1.6,
  })

  if (forPreview) {
    return canvas.toDataURL('image/png')
  }

  const targetWidth = mmToDots(46)
  const maxHeight = mmToDots(10)
  return scaleCanvasToFit(canvas, targetWidth, maxHeight).toDataURL('image/png')
}

export const barcodeToDataUrlForLabel = (value: string) => barcodeToDataUrl(value)
