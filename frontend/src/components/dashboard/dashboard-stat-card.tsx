import type { KeyboardEvent, ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DashboardStatCardProps {
  label: string
  value: ReactNode
  valueClassName?: string
  hint?: string
  onClick?: () => void
  disabled?: boolean
}

export const DashboardStatCard = ({
  label,
  value,
  valueClassName,
  hint,
  onClick,
  disabled = false,
}: DashboardStatCardProps) => {
  const clickable = Boolean(onClick) && !disabled

  return (
    <Card
      className={cn(
        'p-5 transition',
        clickable &&
          'cursor-pointer hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
        disabled && 'opacity-70',
      )}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={
        clickable
          ? (event: KeyboardEvent<HTMLDivElement>) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className={cn('mt-1 text-3xl font-semibold text-slate-900', valueClassName)}>{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-400">{hint}</p> : null}
    </Card>
  )
}

interface DashboardLinkRowProps {
  label: string
  value: ReactNode
  onClick?: () => void
  disabled?: boolean
}

export const DashboardLinkRow = ({ label, value, onClick, disabled = false }: DashboardLinkRowProps) => {
  const clickable = Boolean(onClick) && !disabled
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={cn(
        'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm text-slate-700 transition',
        clickable && 'hover:bg-slate-100',
        !clickable && 'cursor-default',
      )}
    >
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </button>
  )
}
