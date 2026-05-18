import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

type MatrixAction = 'create' | 'edit' | 'delete' | 'view' | 'export'

interface ActionColumn {
  key: MatrixAction
  label: string
  entries: Array<{
    moduleLabel: string
    keys: string[]
  }>
}

interface RolesFormProps {
  mode: 'create' | 'edit'
  name: string
  permissions: string[]
  actionColumns: ActionColumn[]
  saving: boolean
  onNameChange: (value: string) => void
  onToggleActionPermissions: (keys: string[]) => void
  onSubmit: () => void
}

export const RolesForm = ({
  mode,
  name,
  permissions,
  actionColumns,
  saving,
  onNameChange,
  onToggleActionPermissions,
  onSubmit,
}: RolesFormProps) => (
  <Card className="space-y-5 p-5 md:p-6">
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">Role Name *</label>
      <Input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="Enter role name" />
    </div>

    <div>
      <p className="mb-3 text-sm font-semibold text-slate-700">Permissions</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {actionColumns.map((column) => {
          const allColumnKeys = Array.from(new Set(column.entries.flatMap((entry) => entry.keys)))
          const columnSelectAllChecked =
            allColumnKeys.length > 0 && allColumnKeys.every((permission) => permissions.includes(permission))

          return (
            <div key={column.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-base font-semibold text-slate-800">{column.label}</h3>
              {allColumnKeys.length > 0 ? (
                <label className="mb-3 flex cursor-pointer items-center gap-2 border-b border-slate-100 pb-3 text-sm font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={columnSelectAllChecked}
                    onChange={() => onToggleActionPermissions(allColumnKeys)}
                  />
                  <span>Select all</span>
                </label>
              ) : null}
              <div className="max-h-80 space-y-2 overflow-auto pr-1">
                {column.entries.map((entry) => {
                  const checked = entry.keys.every((permission) => permissions.includes(permission))
                  return (
                    <label key={`${column.key}-${entry.moduleLabel}`} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={checked} onChange={() => onToggleActionPermissions(entry.keys)} />
                      <span className="truncate">{entry.moduleLabel}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>

    <div className="flex justify-end">
      <Button type="button" onClick={onSubmit} disabled={saving}>
        {saving ? 'Saving...' : mode === 'create' ? 'Create Role' : 'Update Role'}
      </Button>
    </div>
  </Card>
)
