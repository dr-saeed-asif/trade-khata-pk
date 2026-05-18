import { alertsService } from '@/services/alerts.service'
import { inventoryService } from '@/services/inventory.service'
import { partyService } from '@/services/party.service'
import { purchasesService } from '@/services/purchases.service'
import { salesService } from '@/services/sales.service'
import type { AlertSummary } from '@/types'

export interface DashboardSummary {
  inventory: {
    totalItems: number
    categories: number
    lowStockItems: number
    recentItems: number
  }
  commerce: {
    sales: number
    purchases: number
    parties: number
  }
  alerts: AlertSummary
}

interface DashboardLoadOptions {
  includeSales?: boolean
  includePurchases?: boolean
  includeParties?: boolean
}

export const dashboardService = {
  load: async (options: DashboardLoadOptions = {}): Promise<DashboardSummary> => {
    const [inventory, alerts, sales, purchases, parties] = await Promise.all([
      inventoryService.summary(),
      alertsService.summary(),
      options.includeSales
        ? salesService.list({ page: 1, pageSize: 1 }).then((res) => res.total)
        : Promise.resolve(0),
      options.includePurchases
        ? purchasesService.list({ page: 1, pageSize: 1 }).then((res) => res.total)
        : Promise.resolve(0),
      options.includeParties
        ? partyService.list({ page: 1, pageSize: 1 }).then((res) => res.total)
        : Promise.resolve(0),
    ])

    return {
      inventory,
      alerts,
      commerce: { sales, purchases, parties },
    }
  },
}
