import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { itemSchema, type ItemInput } from '@/lib/validators'
import { barcodeToDataUrl } from '@/lib/barcode'
import { inventoryService } from '@/services/inventory.service'
import { categoryService } from '@/services/category.service'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import type { Category } from '@/types'

export const AddItemPage = () => {
  const { toast } = useToast()
  const [qrImage, setQrImage] = useState<string>('')
  const [barcodeImage, setBarcodeImage] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof ItemInput, string>>>({})
  const [form, setForm] = useState<ItemInput>({
    name: '',
    sku: '',
    categoryId: '',
    quantity: 0,
    price: 0,
    supplier: '',
    location: '',
    description: '',
    weight: '',
    expiryMessage: '',
  })

  useEffect(() => {
    categoryService.list({ page: 1, pageSize: 500 }).then((res) => setCategories(res.data))
  }, [])

  const onSubmit = async (values: ItemInput) => {
    const parsed = itemSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(
        parsed.error.issues.reduce<Partial<Record<keyof ItemInput, string>>>((acc, issue) => {
          const path = issue.path[0] as keyof ItemInput
          acc[path] = issue.message
          return acc
        }, {}),
      )
      return
    }
    setErrors({})
    setIsSubmitting(true)
    try {
      const item = await inventoryService.create(parsed.data)
      setQrImage(await QRCode.toDataURL(item.qrValue))
      setBarcodeImage(barcodeToDataUrl(item.barcodeValue))
      toast({ title: 'Item created successfully' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadGeneratedCode = async (imageUrl: string, filename: string) => {
    if (!imageUrl) return
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold">Add Item</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit(form)
        }}
        className="grid gap-3 md:grid-cols-2"
      >
        <div>
          <Input
            placeholder="Item Name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <p className="text-xs text-red-600">{errors.name}</p>
        </div>
        <div>
          <Input
            placeholder="SKU"
            value={form.sku}
            onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
          />
          <p className="text-xs text-red-600">{errors.sku}</p>
        </div>
        <div>
          <select
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            value={form.categoryId}
            onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-red-600">{errors.categoryId}</p>
        </div>
        <Input
          type="number"
          placeholder="Quantity"
          value={String(form.quantity)}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, quantity: Number(event.target.value || 0) }))
          }
        />
        <Input
          type="number"
          step="0.01"
          placeholder="Price"
          value={String(form.price)}
          onChange={(event) => setForm((prev) => ({ ...prev, price: Number(event.target.value || 0) }))}
        />
        <Input
          placeholder="Supplier"
          value={form.supplier}
          onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))}
        />
        <Input
          placeholder="Location"
          value={form.location}
          onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
        />
        <textarea
          className="min-h-24 rounded-md border border-slate-300 p-3 text-sm md:col-span-2"
          placeholder="Description"
          value={form.description ?? ''}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <Button disabled={isSubmitting} className="md:col-span-2">{isSubmitting ? 'Saving...' : 'Create Item'}</Button>
      </form>
      {qrImage || barcodeImage ? (
        <Card className="space-y-2">
          <p className="font-medium">Generated Codes</p>
          <div className="grid gap-4 md:grid-cols-2">
            {qrImage ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">QR Code</p>
                <img src={qrImage} alt="Generated QR code" className="h-40 w-40" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadGeneratedCode(qrImage, `qr-code-${Date.now()}.png`)}
                >
                  Download QR
                </Button>
              </div>
            ) : null}
            {barcodeImage ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Barcode (CODE128)</p>
                <img src={barcodeImage} alt="Generated barcode" className="h-28 w-full max-w-xs object-contain" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadGeneratedCode(barcodeImage, `barcode-${Date.now()}.png`)}
                >
                  Download Barcode
                </Button>
              </div>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => window.print()}>Print Codes</Button>
          </div>
        </Card>
      ) : null}
    </Card>
  )
}
