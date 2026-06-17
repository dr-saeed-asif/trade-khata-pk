import { Inbox } from 'lucide-react'

interface Props {
  title: string
  subtitle: string
}

export const EmptyState = ({ title, subtitle }: Props) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sky-200/80 bg-gradient-to-b from-sky-50/50 via-white to-indigo-50/30 px-6 py-12 text-center backdrop-blur">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-sky-100 to-indigo-100 text-sky-500">
      <Inbox className="h-6 w-6" />
    </div>
    <p className="text-base font-semibold text-slate-800">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>
  </div>
)
