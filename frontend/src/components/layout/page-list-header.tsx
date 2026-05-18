import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PageListHeaderProps {
  title: string
  subtitle: string
  addLabel?: string
  showAdd?: boolean
  onAdd?: () => void
}

export const PageListHeader = ({ title, subtitle, addLabel = 'Add', showAdd = false, onAdd }: PageListHeaderProps) => (
  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
    </div>
    {showAdd && onAdd ? (
      <Button
        className="h-11 shrink-0 self-start rounded-xl px-5 shadow-lg shadow-slate-900/10 transition hover:shadow-xl"
        onClick={onAdd}
      >
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    ) : null}
  </div>
)
