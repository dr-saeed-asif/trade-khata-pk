import { useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import * as QRScannerLib from '@yudiel/react-qr-scanner'
import { Card } from '@/components/ui/card'
import { inventoryService } from '@/services/inventory.service'
import type { ScannedLocation } from '@/services/inventory.service'
import type { InventoryItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/store/auth-store'

const Scanner = (QRScannerLib as unknown as { Scanner: ComponentType<any> }).Scanner

export const ScannerPage = () => {
  const user = useAuthStore((state) => state.user)
  const canScanItems = hasPermission(user?.role, 'qr.read', user?.permissions)
  const canScanLocations = hasPermission(user?.role, 'items.read', user?.permissions)
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [locationResult, setLocationResult] = useState<ScannedLocation | null>(null)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [scanTarget, setScanTarget] = useState<'item' | 'location'>('item')

  useEffect(() => {
    if (scanTarget === 'item' && !canScanItems && canScanLocations) setScanTarget('location')
    if (scanTarget === 'location' && !canScanLocations && canScanItems) setScanTarget('item')
  }, [scanTarget, canScanItems, canScanLocations])

  const resolveCode = async (rawCode: string) => {
    const code = rawCode.trim()
    if (!code) return
    try {
      if (scanTarget === 'location') {
        const foundLocation = await inventoryService.locationFromCode(code)
        setLocationResult(foundLocation)
        setItem(null)
      } else {
        const found = await inventoryService.detailsFromCode(code)
        setItem(found)
        setLocationResult(null)
      }
      setError('')
      setManualCode('')
    } catch {
      setError(scanTarget === 'location' ? 'Location not found for this code' : 'Item not found for this code')
      setItem(null)
      setLocationResult(null)
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">QR / Barcode Scanner</h2>
        <div className="flex gap-2">
          {canScanItems ? <Button type="button" variant={scanTarget === 'item' ? 'default' : 'outline'} onClick={() => setScanTarget('item')}>Scan Items</Button> : null}
          {canScanLocations ? <Button type="button" variant={scanTarget === 'location' ? 'default' : 'outline'} onClick={() => setScanTarget('location')}>Scan Locations</Button> : null}
        </div>
      </div>
      {!canScanItems && !canScanLocations ? <p className="text-sm text-red-600">You do not have permission to scan items or locations.</p> : null}
      {canScanItems || canScanLocations ? (
        <div className="h-[300px] w-[400px] max-w-full overflow-hidden rounded-md border border-slate-200">
          <Scanner
            formats={['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e']}
            onScan={(codes: Array<{ rawValue?: string; raw?: string }> | { rawValue?: string; raw?: string } | null) => {
              const firstCode = Array.isArray(codes) ? codes[0] : codes
              const value = firstCode?.rawValue ?? firstCode?.raw
              if (!value) return
              void resolveCode(value)
            }}
            onError={() => setError('Unable to access webcam')}
          />
        </div>
      ) : null}
      {canScanItems || canScanLocations ? (
        <div className="flex items-center gap-2">
          <Input
            placeholder={`Enter ${scanTarget} barcode/QR manually`}
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void resolveCode(manualCode)
              }
            }}
            className="max-w-md"
          />
          <Button type="button" variant="outline" onClick={() => void resolveCode(manualCode)}>Find</Button>
        </div>
      ) : null}
      {error ? <p className="text-red-600">{error}</p> : null}
      {item ? <div className="rounded-md border border-slate-200 p-4"><p className="font-semibold">{item.name}</p><p>SKU: {item.sku}</p><p>Category: {item.category}</p></div> : null}
      {locationResult ? <div className="rounded-md border border-slate-200 p-4"><p className="font-semibold">{locationResult.name}</p><p>Warehouse: {locationResult.warehouse.name}</p><p>Items: {locationResult.items.length}</p></div> : null}
    </Card>
  )
}

