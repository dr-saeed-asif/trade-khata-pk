import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

type IntegrationStatus = 'connected' | 'disconnected' | 'needs-setup'

type IntegrationConfig = {
  id: string
  name: string
  description: string
  status: IntegrationStatus
  endpoint: string
  apiKey: string
  webhookSecret: string
  syncMode: 'push' | 'pull' | 'bidirectional'
}

const storageKey = 'integration-settings-v1'

const defaultIntegrations: IntegrationConfig[] = [
  {
    id: 'pos',
    name: 'POS Integration',
    description: 'Sync sales, returns, and stock movements from your in-store checkout system.',
    status: 'needs-setup',
    endpoint: '',
    apiKey: '',
    webhookSecret: '',
    syncMode: 'bidirectional',
  },
  {
    id: 'erp',
    name: 'ERP Integration',
    description: 'Keep ERP item masters, transfers, and warehouse balances aligned.',
    status: 'needs-setup',
    endpoint: '',
    apiKey: '',
    webhookSecret: '',
    syncMode: 'push',
  },
  {
    id: 'shopify',
    name: 'Shopify Connector',
    description: 'Import orders, reservations, and fulfillment updates from Shopify.',
    status: 'disconnected',
    endpoint: '',
    apiKey: '',
    webhookSecret: '',
    syncMode: 'pull',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce Connector',
    description: 'Connect storefront orders and inventory updates from WooCommerce.',
    status: 'disconnected',
    endpoint: '',
    apiKey: '',
    webhookSecret: '',
    syncMode: 'pull',
  },
]

const statusLabel: Record<IntegrationStatus, string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  'needs-setup': 'Needs setup',
}

const statusClass: Record<IntegrationStatus, string> = {
  connected: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  disconnected: 'border-slate-200 bg-slate-100 text-slate-600',
  'needs-setup': 'border-amber-200 bg-amber-50 text-amber-700',
}

const syncModes: Array<IntegrationConfig['syncMode']> = ['push', 'pull', 'bidirectional']

export const SettingsPage = () => {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>(() => {
    if (typeof window === 'undefined') return defaultIntegrations
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return defaultIntegrations
      const parsed = JSON.parse(raw) as IntegrationConfig[]
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : defaultIntegrations
    } catch {
      return defaultIntegrations
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, JSON.stringify(integrations))
  }, [integrations])

  const updateIntegration = (id: string, patch: Partial<IntegrationConfig>) => {
    setIntegrations((current) => current.map((integration) => (integration.id === id ? { ...integration, ...patch } : integration)))
  }

  const testConnection = (integration: IntegrationConfig) => {
    const isConfigured = Boolean(integration.endpoint.trim() && integration.apiKey.trim())
    const nextStatus: IntegrationStatus = isConfigured ? 'connected' : 'needs-setup'
    updateIntegration(integration.id, { status: nextStatus })
    toast({
      title: `${integration.name} ${nextStatus === 'connected' ? 'connected' : 'needs setup'}`,
      description: isConfigured
        ? 'Saved settings look valid for a basic connection test.'
        : 'Add an endpoint and API key to enable the connector.',
    })
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200">
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-6 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Integrations</p>
          <h2 className="mt-2 text-2xl font-semibold">Connect POS, ERP, Shopify, and WooCommerce</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Configure external systems here so sales, orders, transfers, and stock updates can flow into the inventory platform.
          </p>
        </div>
        <div className="grid gap-4 border-t border-slate-200 bg-white p-6 md:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold text-slate-900">4</p>
            <p className="text-sm text-slate-500">Connector templates</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">3</p>
            <p className="text-sm text-slate-500">Sync modes available</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">1</p>
            <p className="text-sm text-slate-500">Saved configuration space</p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id} className="space-y-4 border-slate-200 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{integration.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{integration.description}</p>
              </div>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass[integration.status]}`}>
                {statusLabel[integration.status]}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Endpoint URL</span>
                <Input
                  value={integration.endpoint}
                  onChange={(event) => updateIntegration(integration.id, { endpoint: event.target.value })}
                  placeholder="https://api.example.com/webhooks/inventory"
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">API Key</span>
                <Input
                  value={integration.apiKey}
                  onChange={(event) => updateIntegration(integration.id, { apiKey: event.target.value })}
                  placeholder="sk_live_..."
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Webhook Secret</span>
                <Input
                  value={integration.webhookSecret}
                  onChange={(event) => updateIntegration(integration.id, { webhookSecret: event.target.value })}
                  placeholder="whsec_..."
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Sync Mode</span>
                <select
                  value={integration.syncMode}
                  onChange={(event) => updateIntegration(integration.id, { syncMode: event.target.value as IntegrationConfig['syncMode'] })}
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400"
                >
                  {syncModes.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode === 'push' ? 'Push to external system' : mode === 'pull' ? 'Pull from external system' : 'Bidirectional'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="default" onClick={() => testConnection(integration)}>
                Test Connection
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => updateIntegration(integration.id, { status: 'disconnected' })}
              >
                Disconnect
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => updateIntegration(integration.id, { endpoint: '', apiKey: '', webhookSecret: '', status: 'needs-setup' })}
              >
                Reset
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 p-5">
        <h3 className="text-base font-semibold text-slate-900">Integration coverage</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-900">POS integration</p>
            <p className="mt-1 text-sm text-slate-500">Sync checkout sales, returns, and stock decrements.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-900">ERP integration</p>
            <p className="mt-1 text-sm text-slate-500">Exchange item masters, purchase orders, and warehouse balances.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="font-medium text-slate-900">Shopify / WooCommerce</p>
            <p className="mt-1 text-sm text-slate-500">Connect storefront orders and fulfillment updates to inventory.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
