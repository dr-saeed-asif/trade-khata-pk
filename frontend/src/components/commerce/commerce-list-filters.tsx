import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/ui/filter-bar'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { filterClearButtonClass, selectClass } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import type { Party } from '@/types'

export interface CommerceListFilterValues {
  search: string
  partyId: string
  dateFrom: string
  dateTo: string
}

interface CommerceListFiltersProps {
  mode: 'sale' | 'purchase'
  parties: Party[]
  values: CommerceListFilterValues
  onChange: (values: CommerceListFilterValues) => void
  onClear: () => void
}

export const CommerceListFilters = ({
  mode,
  parties,
  values,
  onChange,
  onClear,
}: CommerceListFiltersProps) => {
  const patch = (partial: Partial<CommerceListFilterValues>) => onChange({ ...values, ...partial })
  const hasActive = Boolean(values.search || values.partyId || values.dateFrom || values.dateTo)

  return (
    <FilterBar>
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <Input
          className="lg:min-w-[14rem] lg:flex-[1.4]"
          placeholder={
            mode === 'sale' ? formPlaceholders.commerce.searchSale : formPlaceholders.commerce.searchPurchase
          }
          value={values.search}
          onChange={(e) => patch({ search: e.target.value })}
        />
        <select
          className={cn(selectClass, 'lg:min-w-[10rem] lg:flex-1')}
          value={values.partyId}
          onChange={(e) => patch({ partyId: e.target.value })}
          aria-label="Party"
        >
          <option value="">All parties</option>
          <option value="walk-in">Walk-in only</option>
          {parties.map((party) => (
            <option key={party.id} value={party.id}>
              {party.name}
            </option>
          ))}
        </select>
        <Input
          type="date"
          className={cn('lg:w-[10.5rem] lg:shrink-0', !values.dateFrom && 'text-slate-400')}
          placeholder={formPlaceholders.commerce.dateFrom}
          value={values.dateFrom}
          onChange={(e) => patch({ dateFrom: e.target.value })}
          aria-label="From date"
          title={formPlaceholders.commerce.dateFrom}
        />
        <Input
          type="date"
          className={cn('lg:w-[10.5rem] lg:shrink-0', !values.dateTo && 'text-slate-400')}
          placeholder={formPlaceholders.commerce.dateTo}
          value={values.dateTo}
          onChange={(e) => patch({ dateTo: e.target.value })}
          aria-label="To date"
          title={formPlaceholders.commerce.dateTo}
        />
        <Button
          type="button"
          variant="outline"
          className={cn(filterClearButtonClass, 'lg:w-auto', hasActive && 'border-sky-200 text-sky-700')}
          disabled={!hasActive}
          onClick={onClear}
        >
          Clear filters
        </Button>
      </div>
    </FilterBar>
  )
}

export const emptyCommerceFilters = (): CommerceListFilterValues => ({
  search: '',
  partyId: '',
  dateFrom: '',
  dateTo: '',
})
