import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface CategoryFormProps {
  name: string
  canManage: boolean
  placeholder: string
  submitLabel: string
  onNameChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
}

export const CategoryForm = ({
  name,
  canManage,
  placeholder,
  submitLabel,
  onNameChange,
  onSubmit,
  onCancel,
}: CategoryFormProps) => {
  if (!canManage) return null

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-white p-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">Category name</label>
        <Input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder={placeholder} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onSubmit}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  )
}
