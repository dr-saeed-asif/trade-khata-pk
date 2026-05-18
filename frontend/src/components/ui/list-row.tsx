import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface ListRowProps extends PropsWithChildren {
  className?: string
}

export const ListRow = ({ children, className }: ListRowProps) => (
  <div
    className={cn(
      'group rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition duration-200',
      'hover:border-sky-200/90 hover:shadow-md',
      className,
    )}
  >
    {children}
  </div>
)

export const ListEmptyMessage = ({ children }: PropsWithChildren) => (
  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-10 text-center text-sm text-slate-500">
    {children}
  </p>
)
