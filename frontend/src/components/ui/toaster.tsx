import { useEffect } from 'react'
import { useToastStore } from '@/store/toast-store'
import { cn } from '@/lib/utils'

export const Toaster = () => {
  const items = useToastStore((state) => state.items)
  const remove = useToastStore((state) => state.remove)

  useEffect(() => {
    if (items.length === 0) return
    const timeout = setTimeout(() => remove(items[0].id), 3000)
    return () => clearTimeout(timeout)
  }, [items, remove])

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto w-80 rounded-md border bg-white p-4 shadow-lg',
            item.variant === 'error' && 'border-red-200 bg-red-50',
          )}
        >
          <p className="text-sm font-semibold">{item.title}</p>
          {item.description ? <p className="text-xs text-slate-600">{item.description}</p> : null}
        </div>
      ))}
    </div>
  )
}
