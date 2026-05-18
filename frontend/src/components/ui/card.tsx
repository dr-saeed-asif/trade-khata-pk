import type { ComponentProps, PropsWithChildren } from 'react'
import { cn } from '@/lib/utils'

type CardProps = PropsWithChildren<ComponentProps<'div'>>

export const Card = ({ children, className, ...props }: CardProps) => (
  <div
    className={cn(
      'rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_40px_rgba(15,23,42,0.06)] backdrop-blur',
      className,
    )}
    {...props}
  >
    {children}
  </div>
)
