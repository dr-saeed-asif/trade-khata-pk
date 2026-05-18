import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type IntegrationStatus = 'connected' | 'disconnected' | 'needs-setup'
type IntegrationConfig = { id: string; name: string; status: IntegrationStatus; endpoint: string; apiKey: string }

const storageKey = 'integration-settings-v1'
const defaultIntegrations: IntegrationConfig[] = [
  { id: 'pos', name: 'POS Integration', status: 'needs-setup', endpoint: '', apiKey: '' },
  { id: 'erp', name: 'ERP Integration', status: 'needs-setup', endpoint: '', apiKey: '' },
  { id: 'shopify', name: 'Shopify Connector', status: 'disconnected', endpoint: '', apiKey: '' },
  { id: 'woocommerce', name: 'WooCommerce Connector', status: 'disconnected', endpoint: '', apiKey: '' },
]

export const SettingsPage = () => {
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

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="text-sm text-slate-500">Connect POS, ERP, Shopify, and WooCommerce</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {integrations.map((integration) => (
          <Card key={integration.id} className="space-y-3 p-5">
            <h3 className="text-lg font-semibold">{integration.name}</h3>
            <Input value={integration.endpoint} onChange={(event) => updateIntegration(integration.id, { endpoint: event.target.value })} placeholder="Endpoint URL" />
            <Input value={integration.apiKey} onChange={(event) => updateIntegration(integration.id, { apiKey: event.target.value })} placeholder="API Key" />
            <div className="flex gap-2">
              <Button type="button" onClick={() => updateIntegration(integration.id, { status: 'connected' })}>Test Connection</Button>
              <Button type="button" variant="outline" onClick={() => updateIntegration(integration.id, { status: 'disconnected' })}>Disconnect</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

