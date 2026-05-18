import { z } from 'zod'

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, 'Email or username is required'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  })
  .superRefine((data, ctx) => {
    if (!data.identifier.includes('@')) return
    const emailCheck = z.string().email().safeParse(data.identifier)
    if (!emailCheck.success) {
      ctx.addIssue({
        code: 'custom',
        message: 'Please enter a valid email address',
        path: ['identifier'],
      })
    }
  })

const generateNumericSku = () => `${Date.now()}${Math.floor(100 + Math.random() * 900)}`

export const itemSchema = z
  .object({
    name: z.string().trim().min(2, 'Item name is required'),
    sku: z.string().optional(),
    categoryId: z.string().min(1, 'Category is required'),
    categoryIds: z.array(z.string()).optional(),
    tags: z.array(z.string().min(1)).optional(),
    quantity: z.number().min(0, 'Quantity cannot be negative').optional(),
    reservedQty: z.number().min(0, 'Reserved qty cannot be negative').optional(),
    expiryDate: z.string().optional(),
    weight: z.string().optional(),
    expiryMessage: z.string().optional(),
    price: z.number({ error: 'Price is required' }).positive('Price is required'),
    supplier: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
  batches: z
    .array(
      z.object({
        batchNumber: z.string().min(1),
        lotNumber: z.string().optional(),
        expiryDate: z.string().optional(),
        quantity: z.number().min(0),
      }),
    )
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().optional(),
        sku: z.string().min(2),
        size: z.string().optional(),
        color: z.string().optional(),
        model: z.string().optional(),
        quantity: z.number().min(0),
        reservedQty: z.number().min(0).optional(),
        price: z.number().min(0).optional(),
      }),
    )
    .optional(),
  })
  .transform((data) => ({
    ...data,
    sku: data.sku?.trim() || generateNumericSku(),
    quantity: data.quantity ?? 0,
    supplier: data.supplier?.trim() || 'General',
    location: data.location?.trim() || 'General',
    weight: data.weight?.trim() || undefined,
    expiryMessage: data.expiryMessage?.trim() || undefined,
  }))

export const categorySchema = z.object({
  name: z.string().min(2, 'Category name is required'),
})

export const partySchema = z.object({
  name: z.string().trim().min(2, 'Name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().optional(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).optional(),
})

const commerceLineSchema = z.object({
  itemId: z.string().min(1, 'Item is required'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Price cannot be negative'),
})

export const saleSchema = z.object({
  partyId: z.string().optional(),
  saleDate: z.string().optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  lines: z.array(commerceLineSchema).min(1, 'Add at least one line'),
})

export const purchaseSchema = z.object({
  partyId: z.string().optional(),
  purchaseDate: z.string().optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  lines: z.array(commerceLineSchema).min(1, 'Add at least one line'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type ItemInput = z.infer<typeof itemSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type PartyInput = z.infer<typeof partySchema>
export type SaleInput = z.infer<typeof saleSchema>
export type PurchaseInput = z.infer<typeof purchaseSchema>
