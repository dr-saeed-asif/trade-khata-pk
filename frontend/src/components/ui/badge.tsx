import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'customer' | 'supplier' | 'both' | 'success' | 'warning'

const variantClass: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200/80',
  customer: 'bg-sky-50 text-sky-800 ring-sky-200/80',
  supplier: 'bg-amber-50 text-amber-800 ring-amber-200/80',
  both: 'bg-violet-50 text-violet-800 ring-violet-200/80',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  warning: 'bg-orange-50 text-orange-800 ring-orange-200/80',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export const Badge = ({ children, variant = 'default', className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
      variantClass[variant],
      className,
    )}
  >
    {children}
  </span>
)
