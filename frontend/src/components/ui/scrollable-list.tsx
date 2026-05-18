import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Shared max height for scrollable record lists (matches inventory table). */
export const LIST_SCROLL_CLASS = 'max-h-[60vh] overflow-y-auto overflow-x-hidden pr-1'

interface ScrollableListProps {
  children: ReactNode
  className?: string
}

export const ScrollableList = ({ children, className }: ScrollableListProps) => (
  <div className={cn(LIST_SCROLL_CLASS, className)}>{children}</div>
)
