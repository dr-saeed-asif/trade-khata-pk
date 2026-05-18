import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ListEmptyMessage, ListRow } from '@/components/ui/list-row'
import type { Party, PartyType } from '@/types'

interface PartyTableProps {
  parties: Party[]
  canManage: boolean
  onEdit: (party: Party) => void
  onDelete: (party: Party) => void
}

const typeLabel: Record<PartyType, string> = {
  CUSTOMER: 'Customer',
  SUPPLIER: 'Supplier',
  BOTH: 'Customer & Supplier',
}

const typeBadge: Record<PartyType, 'customer' | 'supplier' | 'both'> = {
  CUSTOMER: 'customer',
  SUPPLIER: 'supplier',
  BOTH: 'both',
}

export const PartyTable = ({ parties, canManage, onEdit, onDelete }: PartyTableProps) => (
  <div className="space-y-3">
    {parties.length === 0 ? (
      <ListEmptyMessage>No parties match the current filters.</ListEmptyMessage>
    ) : null}
    {parties.map((party) => (
      <ListRow key={party.id}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold text-slate-900">{party.name}</p>
              <Badge variant={typeBadge[party.type]}>{typeLabel[party.type]}</Badge>
            </div>
            {(party.phone || party.email) && (
              <p className="text-sm text-slate-600">
                {party.phone}
                {party.phone && party.email ? ' · ' : ''}
                {party.email}
              </p>
            )}
            <p className="text-xs font-medium text-slate-400">
              {party.salesCount ?? 0} sales · {party.purchasesCount ?? 0} purchases
            </p>
          </div>
          {canManage ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" className="gap-1.5" onClick={() => onEdit(party)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button variant="destructive" className="gap-1.5" onClick={() => onDelete(party)}>
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          ) : null}
        </div>
      </ListRow>
    ))}
  </div>
)
