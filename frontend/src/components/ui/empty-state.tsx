import { Inbox } from 'lucide-react'

interface Props {
  title: string
  subtitle: string
}

export const EmptyState = ({ title, subtitle }: Props) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-12 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <Inbox className="h-6 w-6" />
    </div>
    <p className="text-base font-semibold text-slate-800">{title}</p>
    <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>
  </div>
)
