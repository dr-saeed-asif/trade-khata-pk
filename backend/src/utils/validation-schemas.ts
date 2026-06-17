import { z } from 'zod'

const dateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date')

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9._-]+$/, 'Username can only contain letters, numbers, dot, underscore, or hyphen')

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email or username is required'),
  password: z.string().min(6),
})

export const usernameFieldSchema = usernameSchema.optional().or(z.literal(''))

export const forgotPasswordSchema = z.object({
  email: z.email(),
})

export const categorySchema = z.object({
  name: z.string().min(2),
})

export const warehouseSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  address: z.string().optional(),
})

export const locationSchema = z.object({
  warehouseId: z.uuid(),
  name: z.string().min(2).optional(),
  shelf: z.string().min(1),
  rack: z.string().min(1),
  bin: z.string().min(1),
})

const generateItemSku = () => `${Date.now()}${Math.floor(100 + Math.random() * 900)}`

export const itemSchema = z
  .object({
    name: z.string().trim().min(2),
    sku: z.string().min(2).optional(),
    categoryId: z.uuid(),
    locationId: z.uuid().optional(),
    categoryIds: z.array(z.uuid()).optional(),
    tags: z.array(z.string().min(1)).optional(),
    quantity: z.number().int().min(0).optional(),
    reservedQty: z.number().int().min(0).optional(),
    expiryDate: dateStringSchema.optional(),
    weight: z.string().optional(),
    expiryMessage: z.string().optional(),
    price: z.number().positive(),
    supplier: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    lowStockAt: z.number().int().min(0).optional(),
    batches: z
    .array(
      z.object({
        batchNumber: z.string().min(1),
        lotNumber: z.string().optional(),
        expiryDate: dateStringSchema.optional(),
        quantity: z.number().int().min(0),
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
        quantity: z.number().int().min(0).default(0),
        reservedQty: z.number().int().min(0).optional(),
        price: z.number().min(0).optional(),
      }),
    )
    .optional(),
  })
  .transform((data) => ({
    ...data,
    sku: data.sku?.trim() || generateItemSku(),
    quantity: data.quantity ?? 0,
    supplier: data.supplier?.trim() || 'General',
    location: data.location?.trim() || 'General',
    weight: data.weight?.trim() || undefined,
    expiryMessage: data.expiryMessage?.trim() || undefined,
  }))

export const itemUpdateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    sku: z.string().min(2).optional(),
    categoryId: z.uuid().optional(),
    locationId: z.uuid().optional(),
    categoryIds: z.array(z.uuid()).optional(),
    tags: z.array(z.string().min(1)).optional(),
    quantity: z.number().int().min(0).optional(),
    reservedQty: z.number().int().min(0).optional(),
    expiryDate: dateStringSchema.optional(),
    weight: z.string().optional(),
    expiryMessage: z.string().optional(),
    price: z.number().min(0).optional(),
    supplier: z.string().optional(),
    location: z.string().optional(),
    description: z.string().optional(),
    lowStockAt: z.number().int().min(0).optional(),
    batches: z
      .array(
        z.object({
          batchNumber: z.string().min(1),
          lotNumber: z.string().optional(),
          expiryDate: dateStringSchema.optional(),
          quantity: z.number().int().min(0),
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
          quantity: z.number().int().min(0).default(0),
          reservedQty: z.number().int().min(0).optional(),
          price: z.number().min(0).optional(),
        }),
      )
      .optional(),
  })
  .partial()

export const scanSchema = z.object({
  qrCode: z.string().min(1),
  note: z.string().optional(),
})

export const stockInSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().positive(),
  note: z.string().optional(),
  reference: z.string().optional(),
  destinationWarehouse: z.string().min(1).optional(),
})

export const stockOutSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().positive(),
  note: z.string().optional(),
  reference: z.string().optional(),
  sourceWarehouse: z.string().min(1).optional(),
})

export const stockTransferSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().positive(),
  sourceWarehouse: z.string().min(1),
  destinationWarehouse: z.string().min(1),
  note: z.string().optional(),
  reference: z.string().optional(),
})

export const stockAdjustmentSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().nonnegative(),
  reason: z.enum(['DAMAGE', 'LOSS', 'RECOUNT', 'MANUAL']),
  note: z.string().optional(),
  reference: z.string().optional(),
})

export const adminUserCreateSchema = z.object({
  name: z.string().min(2),
  username: usernameFieldSchema,
  email: z.email(),
  password: z.string().min(6),
  role: z.string().min(1),
})

export const adminUserUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  username: usernameFieldSchema,
  email: z.email().optional(),
  password: z.string().min(6).optional(),
  role: z.string().min(1).optional(),
})

export const adminRoleCreateSchema = z.object({
  name: z.string().min(2),
  permissions: z.array(z.string().min(1)).min(1),
})

export const adminRoleUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  permissions: z.array(z.string().min(1)).min(1).optional(),
})

export const partySchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().optional(),
  email: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined))
    .pipe(z.union([z.email(), z.undefined()])),
  address: z.string().optional(),
  type: z.enum(['CUSTOMER', 'SUPPLIER', 'BOTH']).optional(),
})

const commerceLineSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
})

export const saleSchema = z.object({
  partyId: z.uuid().optional(),
  saleDate: dateStringSchema.optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  lines: z.array(commerceLineSchema).min(1),
})

export const purchaseSchema = z.object({
  partyId: z.uuid().optional(),
  purchaseDate: dateStringSchema.optional(),
  discount: z.number().min(0).optional(),
  notes: z.string().optional(),
  lines: z.array(commerceLineSchema).min(1),
})
