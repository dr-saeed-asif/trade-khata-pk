import { http } from '@/services/http'

export interface StockMovement {
  id: string
  itemId: string
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'
  quantity: number
  beforeQty: number
  afterQty: number
  note?: string
  reference?: string
  sourceWarehouse?: string
  destinationWarehouse?: string
  adjustmentReason?: 'DAMAGE' | 'LOSS' | 'RECOUNT' | 'MANUAL'
  createdAt: string
  item?: { id: string; name: string; sku: string }
  user?: { id: string; name: string; email: string }
}

interface BaseStockPayload {
  itemId: string
  quantity: number
  note?: string
  reference?: string
}

export const stockService = {
  in: async (payload: BaseStockPayload & { destinationWarehouse?: string }) => {
    const { data } = await http.post('/stock/in', payload)
    return data
  },
  out: async (payload: BaseStockPayload & { sourceWarehouse?: string }) => {
    const { data } = await http.post('/stock/out', payload)
    return data
  },
  transfer: async (
    payload: BaseStockPayload & { sourceWarehouse: string; destinationWarehouse: string },
  ) => {
    const { data } = await http.post('/stock/transfer', payload)
    return data
  },
  adjustment: async (
    payload: BaseStockPayload & { reason: 'DAMAGE' | 'LOSS' | 'RECOUNT' | 'MANUAL' },
  ) => {
    const { data } = await http.post('/stock/adjustment', payload)
    return data
  },
  history: async (params?: { itemId?: string; type?: StockMovement['type'] }) => {
    const { data } = await http.get<StockMovement[]>('/stock/history', {
      params: params?.itemId || params?.type ? params : undefined,
    })
    return data
  },
}
