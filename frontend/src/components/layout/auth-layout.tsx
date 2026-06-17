import type { PropsWithChildren, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AppBackground } from '@/components/layout/app-background'
import { Card } from '@/components/ui/card'

interface AuthLayoutProps extends PropsWithChildren {
  className?: string
}

export const AuthLayout = ({ children, className }: AuthLayoutProps) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
    <AppBackground variant="auth" />
    <div className={cn('relative z-10 w-full max-w-md [perspective:1200px]', className)}>{children}</div>
  </div>
)

interface AuthCardProps extends PropsWithChildren {
  className?: string
  footer?: ReactNode
}

export const AuthCard = ({ children, className, footer }: AuthCardProps) => (
  <div className="relative">
    <div
      className={cn(
        'transform-gpu transition-[transform,box-shadow] duration-500 ease-out will-change-transform',
        'hover:-translate-y-1 hover:shadow-[0_32px_64px_-16px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.08)_inset]',
        '[animation:theme-card-in_0.75s_ease-out_both]',
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-sky-400/50 via-indigo-400/35 to-violet-500/40 opacity-75 blur-[1px] [animation:theme-border-glow_4s_ease-in-out_infinite]"
      />
      <Card variant="glass" className={cn('relative overflow-hidden p-8 md:p-9', className)}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-indigo-200/35 blur-2xl" />
        <div className="relative">{children}</div>
        {footer ? <div className="relative mt-6">{footer}</div> : null}
      </Card>
    </div>
  </div>
)
