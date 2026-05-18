import JsBarcode from 'jsbarcode'

export const barcodeToDataUrl = (value: string) => {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, value, {
    format: 'CODE128',
    displayValue: true,
    margin: 8,
    height: 80,
  })
  return canvas.toDataURL('image/png')
}
