import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { barcodeToDataUrl } from '@/lib/barcode'
import { qrCodeToDataUrl } from '@/lib/qr-code'
import { itemSchema, type ItemInput } from '@/lib/validators'
import { inventoryService } from '@/services/inventory.service'
import { categoryService } from '@/services/category.service'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Category } from '@/types'
import { groceryCatalogData } from '@/lib/grocery-catalog'
import { ItemForm } from '@/components/Item/Item-form'
import { ItemTable } from '@/components/Item/Item-table'
import type { ItemLabelInfo } from '@/lib/item-label'

const staticCatalogNames = Array.from(
  new Set(
    groceryCatalogData.categories.flatMap((category) => category.items.map((item) => item.nameEn)),
  ),
).sort((left, right) => left.localeCompare(right))

const INVENTORY_PATH = '/admin/inventory'

export const AddItemPage = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [qrImage, setQrImage] = useState<string>('')
  const [barcodeImage, setBarcodeImage] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [itemOptions, setItemOptions] = useState<string[]>([])
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
  const [codeLabel, setCodeLabel] = useState<ItemLabelInfo | null>(null)

  useEffect(() => {
    categoryService.list({ page: 1, pageSize: 500 }).then((res) => setCategories(res.data))
  }, [])

  useEffect(() => {
    const loadItemOptions = async () => {
      try {
        const names = await inventoryService.catalogNames()
        setItemOptions(Array.from(new Set([...staticCatalogNames, ...names])).sort((left, right) => left.localeCompare(right)))
      } catch {
        setItemOptions(staticCatalogNames)
      }
    }

    void loadItemOptions()
  }, [])

  const onSubmit = async (values: ItemInput) => {
    const parsed = itemSchema.safeParse(values)
    if (!parsed.success) {
      setErrors(parsed.error.issues.reduce<Partial<Record<keyof ItemInput, string>>>((acc, issue) => {
        const path = issue.path[0] as keyof ItemInput
        acc[path] = issue.message
        return acc
      }, {}))
      return
    }
    setErrors({})
    setIsSubmitting(true)
    try {
      const item = await inventoryService.create(parsed.data)
      setCodeLabel({
        name: item.name,
        weight: item.weight,
        expiryMessage: item.expiryMessage,
        expiryDate: item.expiryDate,
        price: item.price,
      })
      setQrImage(await qrCodeToDataUrl(item.qrValue))
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Add Item</h2>
        <Button type="button" variant="outline" onClick={() => navigate(INVENTORY_PATH)}>
          Back to list
        </Button>
      </div>
      <ItemForm form={form} categories={categories} itemOptions={itemOptions} errors={errors} isSubmitting={isSubmitting} onFormChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))} onSubmit={() => void onSubmit(form)} />
      <ItemTable label={codeLabel} qrImage={qrImage} barcodeImage={barcodeImage} onDownload={downloadGeneratedCode} />
    </Card>
  )
}

