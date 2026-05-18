import type { PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

interface FilterBarProps extends PropsWithChildren {
  className?: string
}

export const FilterBar = ({ children, className }: FilterBarProps) => (
  <div
    className={cn(
      'rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-3 shadow-sm',
      className,
    )}
  >
    {children}
  </div>
)
