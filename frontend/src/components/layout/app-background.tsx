import { cn } from '@/lib/utils'

type AppBackgroundVariant = 'auth' | 'app'

interface AppBackgroundProps {
  variant?: AppBackgroundVariant
  className?: string
}

export const AppBackground = ({ variant = 'app', className }: AppBackgroundProps) => {
  const subtle = variant === 'app'

  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className={cn(
          'absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,165,233,0.22),transparent)]',
          subtle && 'opacity-70',
        )}
      />
      <div
        className={cn(
          'absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-400/25 blur-[100px] [animation:theme-orb-drift_18s_ease-in-out_infinite]',
          subtle && 'opacity-50',
        )}
      />
      <div
        className={cn(
          'absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-indigo-500/20 blur-[90px] [animation:theme-orb-drift_22s_ease-in-out_infinite_reverse]',
          subtle && 'opacity-50',
        )}
      />
      <div
        className={cn(
          'absolute left-1/2 top-1/2 h-[min(90vw,36rem)] w-[min(90vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/10 blur-[120px] [animation:theme-orb-drift_26s_ease-in-out_infinite]',
          subtle && 'opacity-40',
        )}
      />
      <div
        className={cn(
          'absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]',
          subtle && 'opacity-60',
        )}
      />
    </div>
  )
}
