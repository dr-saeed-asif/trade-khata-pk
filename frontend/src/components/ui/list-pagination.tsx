import { Button } from '@/components/ui/button'

interface ListPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

export const ListPagination = ({ page, pageSize, total, onPageChange }: ListPaginationProps) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm">
      <p className="font-medium text-slate-600">
        Showing <span className="text-slate-900">{from}–{to}</span> of{' '}
        <span className="text-slate-900">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          Page {page} / {totalPages}
        </span>
        <Button type="button" variant="outline" className="h-9" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
