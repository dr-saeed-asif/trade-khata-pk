import { Prisma } from '@prisma/client'

export interface CommerceLineInput {
  itemId: string
  quantity: number
  unitPrice: number
}

export const calcLineTotal = (quantity: number, unitPrice: number) =>
  new Prisma.Decimal(quantity).mul(unitPrice)

export const calcTotals = (lines: CommerceLineInput[], discount = 0) => {
  const subtotal = lines.reduce(
    (sum, line) => sum.add(calcLineTotal(line.quantity, line.unitPrice)),
    new Prisma.Decimal(0),
  )
  const discountDec = new Prisma.Decimal(discount)
  const total = subtotal.sub(discountDec)
  return { subtotal, discount: discountDec, total }
}

export const nextInvoiceNo = async (
  prefix: 'SALE' | 'PUR',
  countFn: () => Promise<number>,
) => {
  const count = await countFn()
  const seq = String(count + 1).padStart(5, '0')
  return `${prefix}-${seq}`
}
