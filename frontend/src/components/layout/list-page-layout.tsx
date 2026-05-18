import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

interface ListPageLayoutProps {
  header: ReactNode
  filters?: ReactNode
  loading?: boolean
  isEmpty?: boolean
  emptyTitle?: string
  emptySubtitle?: string
  pagination?: ReactNode
  children: ReactNode
  className?: string
}

export const ListPageLayout = ({
  header,
  filters,
  loading = false,
  isEmpty = false,
  emptyTitle = 'Record not available',
  emptySubtitle = 'No records found. Click Add to create one.',
  pagination,
  children,
  className,
}: ListPageLayoutProps) => (
  <Card className={cn('flex max-h-[calc(100vh-8rem)] min-h-[24rem] flex-col gap-5 p-5', className)}>
    <div className="shrink-0 space-y-3">
      {header}
      {filters}
    </div>
    {loading ? (
      <div className="flex flex-1 items-center justify-center py-12">
        <p className="text-sm font-medium text-slate-500">Loading...</p>
      </div>
    ) : isEmpty ? (
      <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
    ) : (
      <>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">{children}</div>
        {pagination ? <div className="shrink-0 border-t border-slate-100 pt-1">{pagination}</div> : null}
      </>
    )}
  </Card>
)
