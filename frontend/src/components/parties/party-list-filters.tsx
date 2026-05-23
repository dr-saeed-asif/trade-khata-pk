import { Button } from '@/components/ui/button'
import { FilterBar } from '@/components/ui/filter-bar'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { filterClearButtonClass, selectClass } from '@/lib/form-styles'
import { cn } from '@/lib/utils'
import type { PartyType } from '@/types'

export interface PartyListFilterValues {
  search: string
  type: '' | PartyType
}

interface PartyListFiltersProps {
  values: PartyListFilterValues
  onChange: (values: PartyListFilterValues) => void
  onClear: () => void
}

export const PartyListFilters = ({ values, onChange, onClear }: PartyListFiltersProps) => {
  const hasActive = Boolean(values.search || values.type)

  return (
    <FilterBar>
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <Input
          className="md:min-w-[14rem] md:flex-1"
          placeholder={formPlaceholders.party.search}
          value={values.search}
          onChange={(e) => onChange({ ...values, search: e.target.value })}
        />
        <select
          className={cn(selectClass, 'md:min-w-[10rem] md:flex-1')}
          value={values.type}
          onChange={(e) => onChange({ ...values, type: e.target.value as PartyListFilterValues['type'] })}
          aria-label="Party type"
        >
          <option value="">All types</option>
          <option value="CUSTOMER">Customer</option>
          <option value="SUPPLIER">Supplier</option>
          <option value="BOTH">Customer & supplier</option>
        </select>
        <Button
          type="button"
          variant="outline"
          className={cn(filterClearButtonClass, hasActive && 'border-sky-200 text-sky-700')}
          disabled={!hasActive}
          onClick={onClear}
        >
          Clear filters
        </Button>
      </div>
    </FilterBar>
  )
}

export const emptyPartyFilters = (): PartyListFilterValues => ({
  search: '',
  type: '',
})
