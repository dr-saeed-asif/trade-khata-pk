import { ArrowDownUp, ChevronLeft, ChevronRight, PencilLine, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { AdminUserRow } from '@/services/admin.service'

interface UserTableProps {
  users: AdminUserRow[]
  loading: boolean
  error: string | null
  search: string
  perPage: number
  currentPage: number
  totalPages: number
  totalUsers: number
  canEdit: boolean
  canDelete: boolean
  sortKey: string
  sortDirection: 'asc' | 'desc'
  onSearchChange: (value: string) => void
  onPerPageChange: (value: number) => void
  onSort: (key: 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt') => void
  onEdit: (user: AdminUserRow) => void
  onDelete: (user: AdminUserRow) => void
  onPrevPage: () => void
  onNextPage: () => void
}

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

export const UserTable = ({
  users,
  loading,
  error,
  search,
  perPage,
  currentPage,
  totalPages,
  totalUsers,
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
}: UserTableProps) => (
  <Card className="space-y-6 p-0">
    <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="w-full lg:max-w-md">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search users..." className="pl-11" />
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
      <div className="flex items-center justify-center py-16">
        <Spinner />
      </div>
    ) : error ? (
      <div className="px-5 pb-5">
        <EmptyState title="Unable to load users" subtitle={error} />
      </div>
    ) : (
      <>
        <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50/80">
              <tr>
                <th className="px-5 py-4"><SortHeader label="Name" active={sortKey === 'name'} direction={sortDirection} onClick={() => onSort('name')} /></th>
                <th className="px-5 py-4"><SortHeader label="Email" active={sortKey === 'email'} direction={sortDirection} onClick={() => onSort('email')} /></th>
                <th className="px-5 py-4"><SortHeader label="Roles" active={sortKey === 'role'} direction={sortDirection} onClick={() => onSort('role')} /></th>
                <th className="px-5 py-4"><SortHeader label="Created At" active={sortKey === 'createdAt'} direction={sortDirection} onClick={() => onSort('createdAt')} /></th>
                <th className="px-5 py-4"><SortHeader label="Updated At" active={sortKey === 'updatedAt'} direction={sortDirection} onClick={() => onSort('updatedAt')} /></th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-slate-50">
                  <td className="px-5 py-4 font-medium text-slate-950">{user.name}</td>
                  <td className="px-5 py-4 text-sm text-slate-700">{user.email}</td>
                  <td className="px-5 py-4"><span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{user.role}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{new Date(user.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{new Date(user.updatedAt).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {canEdit ? <Button variant="outline" className="h-9 px-3 text-xs" type="button" onClick={() => onEdit(user)}><PencilLine className="h-4 w-4" />Edit</Button> : null}
                      {canDelete ? <Button variant="destructive" className="h-9 px-3 text-xs" type="button" onClick={() => onDelete(user)}><Trash2 className="h-4 w-4" />Delete</Button> : null}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-500">No users match the current search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">Page {currentPage} of {totalPages} ({totalUsers} users)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="h-9 px-3 text-xs" disabled={currentPage === 1} onClick={onPrevPage}><ChevronLeft className="h-4 w-4" />Prev</Button>
            <Button variant="outline" className="h-9 px-3 text-xs" disabled={currentPage === totalPages} onClick={onNextPage}>Next<ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </>
    )}
  </Card>
)
