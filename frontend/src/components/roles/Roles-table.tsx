import { ArrowDownUp, ChevronLeft, ChevronRight, PencilLine, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { summarizePermissionModules } from '@/lib/permission-display'
import { cn } from '@/lib/utils'
import type { AdminRoleRow } from '@/services/admin.service'

type RoleSortKey = 'name' | 'permissions' | 'createdAt'

interface RolesTableProps {
  roles: AdminRoleRow[]
  loading: boolean
  error: string | null
  search: string
  perPage: number
  currentPage: number
  totalPages: number
  totalRoles: number
  canEdit: boolean
  canDelete: boolean
  sortKey: RoleSortKey
  sortDirection: 'asc' | 'desc'
  onSearchChange: (value: string) => void
  onPerPageChange: (value: number) => void
  onSort: (key: RoleSortKey) => void
  onEdit: (role: AdminRoleRow) => void
  onDelete: (role: AdminRoleRow) => void
  onPrevPage: () => void
  onNextPage: () => void
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

const SortHeader = ({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}) => (
  <button
    type="button"
    onClick={onClick}
    className="inline-flex items-center gap-2 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-900"
  >
    <span>{label}</span>
    <ArrowDownUp className={cn('h-3.5 w-3.5', active && 'text-slate-900')} />
    {active ? <span className="text-[10px] text-slate-400">{direction === 'asc' ? 'Asc' : 'Desc'}</span> : null}
  </button>
)

export const RolesTable = ({
  roles,
  loading,
  error,
  search,
  perPage,
  currentPage,
  totalPages,
  totalRoles,
  canEdit,
  canDelete,
  sortKey,
  sortDirection,
  onSearchChange,
  onPerPageChange,
  onSort,
  onEdit,
  onDelete,
  onPrevPage,
  onNextPage,
}: RolesTableProps) => (
  <Card className="space-y-6 p-0">
    <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="w-full lg:max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search roles..." className="pl-11" />
        </div>
      </div>
      <select
        value={perPage}
        onChange={(event) => onPerPageChange(Number(event.target.value))}
        className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
      >
        <option value={5}>5</option>
        <option value={10}>10</option>
        <option value={20}>20</option>
      </select>
    </div>

    {loading ? (
      <div className="flex items-center justify-center py-16"><Spinner /></div>
    ) : error ? (
      <div className="px-5 pb-5"><EmptyState title="Unable to load roles" subtitle={error} /></div>
    ) : (
      <>
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-4"><SortHeader label="Name" active={sortKey === 'name'} direction={sortDirection} onClick={() => onSort('name')} /></th>
                <th className="px-5 py-4"><SortHeader label="Permissions" active={sortKey === 'permissions'} direction={sortDirection} onClick={() => onSort('permissions')} /></th>
                <th className="px-5 py-4"><SortHeader label="Created Date" active={sortKey === 'createdAt'} direction={sortDirection} onClick={() => onSort('createdAt')} /></th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {roles.map((role) => {
                const modules = role.modules?.length ? role.modules : summarizePermissionModules(role.permissions)
                return (
                  <tr key={role.id} className="transition-colors hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-950">{role.name}</p>
                      <p className="text-sm text-slate-500">{role.userCount} assigned users</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {modules.slice(0, 3).map((moduleLabel) => (
                          <span key={`${role.id}-${moduleLabel}`} className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{moduleLabel}</span>
                        ))}
                        {modules.length > 3 ? <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">+{modules.length - 3} more</span> : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600">{formatDate(role.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {canEdit ? <Button variant="outline" className="h-9 px-3 text-xs" type="button" onClick={() => onEdit(role)}><PencilLine className="h-4 w-4" />Edit</Button> : null}
                        {canDelete ? <Button variant="destructive" className="h-9 px-3 text-xs" type="button" disabled={role.isSystem} onClick={() => onDelete(role)}><Trash2 className="h-4 w-4" />Delete</Button> : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {roles.length === 0 ? <tr><td colSpan={4} className="px-5 py-16 text-center text-sm text-slate-500">No roles match the current search.</td></tr> : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Page {currentPage} of {totalPages} ({totalRoles} roles)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 px-3 text-xs" disabled={currentPage === 1} onClick={onPrevPage}><ChevronLeft className="h-4 w-4" />Prev</Button>
            <Button variant="outline" className="h-9 px-3 text-xs" disabled={currentPage === totalPages} onClick={onNextPage}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </>
    )}
  </Card>
)
