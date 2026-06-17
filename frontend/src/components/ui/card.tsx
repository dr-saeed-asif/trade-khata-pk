import type { ComponentProps, PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'glass'

type CardProps = PropsWithChildren<ComponentProps<'div'> & { variant?: CardVariant }>

export const Card = ({ children, className, variant = 'default', ...props }: CardProps) => (
  <div
    className={cn(
      'rounded-2xl border p-4 backdrop-blur',
      variant === 'default' &&
        'border-slate-200/80 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.06)]',
      variant === 'glass' &&
        'border-white/40 bg-white/75 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)
