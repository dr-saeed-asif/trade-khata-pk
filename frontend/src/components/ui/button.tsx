import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'outline' | 'destructive' | 'contained'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export const Button = ({ className, variant = 'default', ...props }: Props) => (
  <button
    className={cn(
      'inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-50',
      variant === 'default' &&
        'bg-slate-900 text-white shadow-sm hover:bg-slate-800 hover:shadow-md active:scale-[0.98]',
      variant === 'outline' &&
        'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]',
      variant === 'destructive' &&
        'bg-red-600 text-white shadow-sm hover:bg-red-500 hover:shadow-md active:scale-[0.98]',
      variant === 'contained' &&
        'bg-blue-600 text-white shadow-sm hover:bg-blue-500 hover:shadow-md active:scale-[0.98]',
      className,
    )}
    {...props}
  />
)
