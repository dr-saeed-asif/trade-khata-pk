import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { groceryUiStrings } from '@/lib/grocery-catalog'
import { useUiStore } from '@/store/ui-store'

interface InventoryFormProps {
  importFile: File | null
  importing: boolean
  exporting: boolean
  canCreate: boolean
  canImport: boolean
  canExport: boolean
  search: string
  category: string
  location: string
  lowStockOnly: boolean
  expiredOnly: boolean
  onImportFileChange: (file: File | null) => void
  onImport: () => void
  onExport: () => void
  onAddItem: () => void
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onLocationChange: (value: string) => void
  onLowStockOnlyChange: (checked: boolean) => void
  onExpiredOnlyChange: (checked: boolean) => void
}

export const InventoryForm = ({
  importing,
  exporting,
  canCreate,
  canImport,
  canExport,
  search,
  category,
  location,
  lowStockOnly,
  expiredOnly,
  onImportFileChange,
  onImport,
  onExport,
  onAddItem,
  onSearchChange,
  onCategoryChange,
  onLocationChange,
  onLowStockOnlyChange,
  onExpiredOnlyChange,
}: InventoryFormProps) => {
  const locale = useUiStore((state) => state.locale)
  const t = groceryUiStrings(locale)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {canImport ? (
            <>
              <Input
                type="file"
                className="h-10 w-auto min-w-[8rem]"
                accept=".csv,.xlsx,.xls"
                onChange={(event) => onImportFileChange(event.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" disabled={importing} onClick={onImport}>
                {importing ? t.importing : t.importCsv}
              </Button>
            </>
          ) : null}
          {canExport ? (
            <Button type="button" variant="outline" disabled={exporting} onClick={onExport}>
              {exporting ? t.exporting : t.exportCsvExcel}
            </Button>
          ) : null}
          {canCreate ? (
            <Button type="button" onClick={onAddItem}>
              {t.addItem}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        <Input placeholder={t.searchPlaceholder} value={search} onChange={(e) => onSearchChange(e.target.value)} />
        <Input placeholder={t.categoryPlaceholder} value={category} onChange={(e) => onCategoryChange(e.target.value)} />
        <Input placeholder={t.locationPlaceholder} value={location} onChange={(e) => onLocationChange(e.target.value)} />
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => onLowStockOnlyChange(e.target.checked)} />
          {t.lowStockOnly}
        </label>
        <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm">
          <input type="checkbox" checked={expiredOnly} onChange={(e) => onExpiredOnlyChange(e.target.checked)} />
          {t.expiredOnly}
        </label>
      </div>
    </>
  )
}
