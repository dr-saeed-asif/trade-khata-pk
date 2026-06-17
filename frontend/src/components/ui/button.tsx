import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'outline' | 'destructive' | 'contained'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export const Button = ({ className, variant = 'default', ...props }: Props) => (
  <button
    className={cn(
      'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'default' &&
        'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md shadow-slate-900/20 hover:shadow-lg hover:brightness-110 active:scale-[0.98]',
      variant === 'outline' &&
        'border border-white/60 bg-white/80 text-slate-700 shadow-sm backdrop-blur hover:border-sky-200 hover:bg-sky-50/50 active:scale-[0.98]',
      variant === 'destructive' &&
        'bg-red-600 text-white shadow-sm hover:bg-red-500 hover:shadow-md active:scale-[0.98]',
      variant === 'contained' &&
        'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-900/20 hover:from-sky-500 hover:to-indigo-500 hover:shadow-lg active:scale-[0.98]',
      className,
    )}
    {...props}
  />
)
