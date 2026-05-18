import React from 'react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
  bodyClassName?: string
  panelClassName?: string
}

export const Modal = ({
  open,
  title,
  onClose,
  children,
  footer,
  bodyClassName,
  panelClassName,
}: ModalProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className={cn(
          'relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl',
          panelClassName,
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className={cn('min-h-0 flex-1 overflow-y-auto p-4', bodyClassName)}>{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">{footer}</div>
        ) : null}
      </div>
    </div>
  )
}

export default Modal
