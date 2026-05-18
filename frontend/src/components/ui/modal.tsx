import React from 'react'

interface ModalProps {
  open: boolean
  title?: string
  onClose: () => void
  children?: React.ReactNode
  footer?: React.ReactNode
}

export const Modal = ({ open, title, onClose, children, footer }: ModalProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-md bg-white shadow-lg">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-lg font-medium">{title}</h3>
          <button onClick={onClose} className="text-slate-600 hover:text-slate-900">✕</button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
        {footer ? <div className="px-4 py-3 border-t">{footer}</div> : null}
      </div>
    </div>
  )
}

export default Modal
