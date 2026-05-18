import { randomUUID } from 'node:crypto'

export const generateQrValue = () => randomUUID()

export const generateBarcodeValue = (sku: string) => sku.trim().toUpperCase()
