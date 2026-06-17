import { useEffect, useRef, useState } from 'react'
import type { ComponentType } from 'react'
import * as QRScannerLib from '@yudiel/react-qr-scanner'
import { Card } from '@/components/ui/card'
import { inventoryService } from '@/services/inventory.service'
import type { ScannedLocation } from '@/services/inventory.service'
import type { InventoryItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import axios from 'axios'

const Scanner = (QRScannerLib as unknown as { Scanner: ComponentType<any> }).Scanner

type ScanSource = 'camera' | 'manual' | 'handheld'
type ScanSyncStatus = 'synced' | 'queued'
type ScanTarget = 'item' | 'location'

type BatchScanEntry = {
  id: string
  at: string
  code: string
  source: ScanSource
  status: ScanSyncStatus
  item?: {
    id: string
    name: string
    sku: string
    location: string
  }
}

type QueuedScan = {
  id: string
  qrCode: string
  note?: string
  createdAt: string
}

const queueStorageKey = 'scanner-offline-queue-v1'

export const ScannerPage = () => {
  const { toast } = useToast()
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [locationResult, setLocationResult] = useState<ScannedLocation | null>(null)
  const [error, setError] = useState('')
  const [manualCode, setManualCode] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [batchMode, setBatchMode] = useState(true)
  const [handheldMode, setHandheldMode] = useState(true)
  const [scanTarget, setScanTarget] = useState<ScanTarget>('item')
  const [batchEntries, setBatchEntries] = useState<BatchScanEntry[]>([])
  const [offlineQueue, setOfflineQueue] = useState<QueuedScan[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem(queueStorageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw) as QueuedScan[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })

  const handheldInputRef = useRef<HTMLInputElement | null>(null)
  const recentCameraScansRef = useRef<Map<string, number>>(new Map())
  const isResolvingRef = useRef(false)
  const isSyncingQueueRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(queueStorageKey, JSON.stringify(offlineQueue))
  }, [offlineQueue])

  useEffect(() => {
    if (!handheldMode) return
    handheldInputRef.current?.focus()
  }, [handheldMode])

  const addToBatch = (entry: BatchScanEntry) => {
    if (!batchMode) return
    setBatchEntries((current) => [entry, ...current].slice(0, 100))
  }

  const queueScan = (qrCode: string, noteText?: string) => {
    const queued: QueuedScan = {
      id: crypto.randomUUID(),
      qrCode,
      note: noteText,
      createdAt: new Date().toISOString(),
    }
    setOfflineQueue((current) => [...current, queued])
    return queued
  }

  const syncOfflineQueue = async () => {
    if (isSyncingQueueRef.current) return
    if (!navigator.onLine || offlineQueue.length === 0) return

    isSyncingQueueRef.current = true
    try {
      let sent = 0
      let remaining = [...offlineQueue]

      for (const queued of offlineQueue) {
        try {
          await inventoryService.logScan(queued.qrCode, queued.note)
          remaining = remaining.filter((item) => item.id !== queued.id)
          sent += 1
        } catch (syncError) {
          if (axios.isAxiosError(syncError) && syncError.response?.status === 404) {
            remaining = remaining.filter((item) => item.id !== queued.id)
            continue
          }
          break
        }
      }

      setOfflineQueue(remaining)
      if (sent > 0) {
        toast({ title: 'Offline scans synced', description: `${sent} queued scan${sent === 1 ? '' : 's'} uploaded.` })
      }
    } finally {
      isSyncingQueueRef.current = false
    }
  }

  useEffect(() => {
    const onOnline = () => {
      void syncOfflineQueue()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [offlineQueue])

  useEffect(() => {
    if (navigator.onLine && offlineQueue.length > 0) {
      void syncOfflineQueue()
    }
  }, [])

  const resolveCode = async (rawCode: string, source: ScanSource) => {
    const code = rawCode.trim()
    if (!code) return
    if (isResolvingRef.current) return

    if (source === 'camera') {
      const lastAt = recentCameraScansRef.current.get(code) ?? 0
      if (Date.now() - lastAt < 1500) return
      recentCameraScansRef.current.set(code, Date.now())
    }

    isResolvingRef.current = true
    setLoading(true)
    try {
      if (scanTarget === 'location') {
        const foundLocation = await inventoryService.locationFromCode(code)
        setLocationResult(foundLocation)
        setItem(null)
        setError('')
        addToBatch({
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          code,
          source,
          status: 'synced',
        })
        if (source !== 'camera') {
          setManualCode('')
        }
        return
      }

      const found = await inventoryService.detailsFromCode(code)

      let status: ScanSyncStatus = 'synced'
      try {
        await inventoryService.logScan(code, note.trim() || undefined)
      } catch (scanError) {
        if (!navigator.onLine || (axios.isAxiosError(scanError) && !scanError.response)) {
          queueScan(code, note.trim() || undefined)
          status = 'queued'
        } else {
          throw scanError
        }
      }

      setItem(found)
      setLocationResult(null)
      setError('')
      addToBatch({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        code,
        source,
        status,
        item: {
          id: found.id,
          name: found.name,
          sku: found.sku,
          location: found.location,
        },
      })

      if (source !== 'camera') {
        setManualCode('')
      }

      if (status === 'queued') {
        toast({ title: 'Scan queued', description: 'Saved offline and will sync when online.' })
      }
    } catch (scanError) {
      if (axios.isAxiosError(scanError) && scanError.response?.status === 404) {
        setError(scanTarget === 'location' ? 'Location not found for this code' : 'Item not found for this code')
      } else if (axios.isAxiosError(scanError) && scanError.response?.status === 401) {
        setError('Session expired. Please login again.')
      } else if (axios.isAxiosError(scanError) && (!scanError.response || scanError.code === 'ECONNREFUSED' || scanError.message.includes('Network'))) {
        setError('Backend unavailable. Make sure the server is running on localhost:4000.')
      } else if (axios.isAxiosError(scanError) && scanError.response?.status) {
        setError(`Server error: ${scanError.response.status}. Please try again.`)
      } else {
        setError('Scanner request failed. Please try again.')
      }
      setItem(null)
      setLocationResult(null)
    } finally {
      setLoading(false)
      isResolvingRef.current = false
      if (handheldMode) {
        handheldInputRef.current?.focus()
      }
    }
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">QR / Barcode Scanner</h2>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant={scanTarget === 'item' ? 'default' : 'outline'} onClick={() => setScanTarget('item')}>
            Scan Items
          </Button>
          <Button type="button" variant={scanTarget === 'location' ? 'default' : 'outline'} onClick={() => setScanTarget('location')}>
            Scan Locations
          </Button>
          <Button type="button" variant={batchMode ? 'default' : 'outline'} onClick={() => setBatchMode((current) => !current)}>
            {batchMode ? 'Batch: ON' : 'Batch: OFF'}
          </Button>
          <Button type="button" variant={handheldMode ? 'default' : 'outline'} onClick={() => setHandheldMode((current) => !current)}>
            {handheldMode ? 'Handheld: ON' : 'Handheld: OFF'}
          </Button>
          <Button type="button" variant="outline" disabled={offlineQueue.length === 0 || !navigator.onLine} onClick={() => void syncOfflineQueue()}>
            Sync Queue ({offlineQueue.length})
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
        <p>Offline queue: <span className="font-semibold">{offlineQueue.length}</span> pending</p>
        <p>Connectivity: <span className="font-semibold">{navigator.onLine ? 'Online' : 'Offline'}</span></p>
        <p>Target: <span className="font-semibold">{scanTarget === 'item' ? 'Item lookup' : 'Location lookup'}</span></p>
      </div>

      <div className="h-[300px] w-[400px] max-w-full overflow-hidden rounded-md border border-slate-200">
        <Scanner
          formats={['qr_code', 'code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e']}
          onScan={(codes: Array<{ rawValue?: string; raw?: string }> | { rawValue?: string; raw?: string } | null) => {
            const firstCode = Array.isArray(codes) ? codes[0] : codes
            const value = firstCode?.rawValue ?? firstCode?.raw
            if (!value) return
            void resolveCode(value, 'camera')
          }}
          onError={() => setError('Unable to access webcam')}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          ref={handheldInputRef}
          placeholder={handheldMode ? `Handheld ${scanTarget} code input (auto focus, press Enter)` : `Enter ${scanTarget} barcode/QR manually`}
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void resolveCode(manualCode, handheldMode ? 'handheld' : 'manual')
            }
          }}
          className="max-w-md"
        />
        <Input
          placeholder="Optional scan note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="max-w-xs"
          disabled={scanTarget === 'location'}
        />
        <Button type="button" variant="outline" disabled={loading} onClick={() => void resolveCode(manualCode, handheldMode ? 'handheld' : 'manual')}>
          {loading ? 'Checking...' : 'Find Item'}
        </Button>
      </div>
      {error ? <p className="text-red-600">{error}</p> : null}
      {item ? (
        <div className="rounded-md border border-slate-200 p-4">
          <p className="font-semibold">{item.name}</p>
          <p>SKU: {item.sku}</p>
          <p>Category: {item.category}</p>
          <p>Quantity: {item.quantity}</p>
          <p>Location: {item.location}</p>
          <p>Barcode: {item.barcodeValue}</p>
        </div>
      ) : null}

      {locationResult ? (
        <div className="space-y-2 rounded-md border border-slate-200 p-4">
          <p className="font-semibold">{locationResult.name}</p>
          <p>Warehouse: {locationResult.warehouse.name} ({locationResult.warehouse.code})</p>
          <p>Slot: Shelf {locationResult.shelf}, Rack {locationResult.rack}, Bin {locationResult.bin}</p>
          <p>Items in location: {locationResult.items.length}</p>

          <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {locationResult.items.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{entry.name}</td>
                    <td className="px-3 py-2">{entry.sku}</td>
                    <td className="px-3 py-2">{entry.category.name}</td>
                    <td className="px-3 py-2">{entry.quantity}</td>
                  </tr>
                ))}
                {locationResult.items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-2 text-slate-500" colSpan={4}>No items in this location.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {batchMode ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Batch Session</h3>
            <Button type="button" variant="outline" onClick={() => setBatchEntries([])} disabled={batchEntries.length === 0}>
              Clear Session
            </Button>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Time</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Sync</th>
                </tr>
              </thead>
              <tbody>
                {batchEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-500">{new Date(entry.at).toLocaleTimeString()}</td>
                    <td className="px-3 py-2 font-mono text-xs">{entry.code}</td>
                    <td className="px-3 py-2">{entry.item ? `${entry.item.name} (${entry.item.sku})` : 'Unknown'}</td>
                    <td className="px-3 py-2 uppercase text-xs text-slate-500">{entry.source}</td>
                    <td className="px-3 py-2">
                      <span className={entry.status === 'queued' ? 'text-amber-600' : 'text-emerald-600'}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {batchEntries.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">No scans in this batch session yet.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
