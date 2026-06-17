import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { adminService, type AdminRoleInput, type AdminRoleRow } from '@/services/admin.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'
import { permissionKeys } from '@/lib/permissions'
import {
  summarizePermissionModules,
  toModuleLabel,
} from '@/lib/permission-display'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'

type RoleSortKey = 'name' | 'permissions' | 'createdAt'

type SortState = {
  key: RoleSortKey
  direction: 'asc' | 'desc'
}

type EditorState = {
  mode: 'create' | 'edit'
  id?: string
  name: string
  permissions: string[]
}

type MatrixAction = 'create' | 'edit' | 'delete' | 'view'

const matrixActions: Array<{ key: MatrixAction; label: string }> = [
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'view', label: 'View' },
]

const toMatrixAction = (permission: string): MatrixAction | null => {
  if (permission.endsWith('.create') || permission.endsWith('.import')) return 'create'
  if (permission.endsWith('.update') || permission.endsWith('.manage') || permission.endsWith('.write'))
    return 'edit'
  if (permission.endsWith('.delete')) return 'delete'
  if (permission.endsWith('.read') || permission.includes('.timeline.read')) return 'view'
  return null
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

const sortRoles = (rows: AdminRoleRow[], sort: SortState) =>
  [...rows].sort((left, right) => {
    const multiplier = sort.direction === 'asc' ? 1 : -1

    if (sort.key === 'permissions') {
      return (left.permissions.length - right.permissions.length) * multiplier
    }

    if (sort.key === 'createdAt') {
      return (new Date(left[sort.key]).getTime() - new Date(right[sort.key]).getTime()) * multiplier
    }

    return String(left[sort.key]).localeCompare(String(right[sort.key])) * multiplier
  })

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

const getErrorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    if (response?.data?.message) return response.data.message
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

const emptyEditorState = (): EditorState => ({
  mode: 'create',
  name: '',
  permissions: [],
})

export const RolesPage = () => {
  const { toast } = useToast()
  const currentUserRole = useAuthStore((state) => state.user?.role)
  const [roles, setRoles] = useState<AdminRoleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'name', direction: 'asc' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editor, setEditor] = useState<EditorState>(emptyEditorState())

  const loadRoles = async () => {
    setLoading(true)
    setError(null)
    try {
      setRoles(await adminService.listRoles())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load roles'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRoles()
  }, [])

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase()
    return roles.filter((role) =>
      [role.name, role.role, ...(role.modules ?? []), ...(role.actions ?? []), ...role.permissions].some((value) =>
        value.toLowerCase().includes(query),
      ),
    )
  }, [roles, search])

  const sortedRoles = useMemo(() => sortRoles(filteredRoles, sort), [filteredRoles, sort])
  const totalPages = Math.max(1, Math.ceil(sortedRoles.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const visibleRoles = sortedRoles.slice((currentPage - 1) * perPage, currentPage * perPage)
  const availablePermissions = useMemo(
    () => Array.from(new Set([...permissionKeys, ...roles.flatMap((role) => role.permissions)])).sort(),
    [roles],
  )
  const permissionMatrixRows = useMemo(() => {
    const groups = new Map<string, Record<MatrixAction, string[]>>()
    for (const permission of availablePermissions) {
      const [group] = permission.split('.')
      const action = toMatrixAction(permission)
      if (!action) continue
      if (!groups.has(group)) {
        groups.set(group, { create: [], edit: [], delete: [], view: [] })
      }
      groups.get(group)?.[action].push(permission)
    }
    const preferredOrder = ['items', 'categories', 'qr', 'reports', 'scan', 'stock']
    return Array.from(groups.entries())
      .sort(([left], [right]) => {
        const leftOrder = preferredOrder.indexOf(left)
        const rightOrder = preferredOrder.indexOf(right)
        if (leftOrder !== -1 || rightOrder !== -1) {
          return (leftOrder === -1 ? 999 : leftOrder) - (rightOrder === -1 ? 999 : rightOrder)
        }
        return left.localeCompare(right)
      })
      .map(([moduleKey, actions]) => ({
        moduleKey,
        label: toModuleLabel(moduleKey),
        actions: {
          create: actions.create.sort(),
          edit: actions.edit.sort(),
          delete: actions.delete.sort(),
          view: actions.view.sort(),
        },
      }))
  }, [availablePermissions])
  const canView = currentUserRole === 'ADMIN'
  const canCreate = currentUserRole === 'ADMIN'
  const canEdit = currentUserRole === 'ADMIN'
  const canDelete = currentUserRole === 'ADMIN'
  const actionColumns = useMemo(
    () =>
      matrixActions.map((action) => ({
        ...action,
        entries: permissionMatrixRows
          .map((row) => ({
            moduleLabel: row.label,
            keys: row.actions[action.key],
          }))
          .filter((entry) => entry.keys.length > 0),
      })),
    [permissionMatrixRows],
  )

  useEffect(() => {
    setPage(1)
  }, [search, sort, perPage])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const updateSort = (key: RoleSortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const openCreateForm = () => {
    if (!canCreate) return
    setEditor(emptyEditorState())
    setViewMode('create')
  }

  const openEditForm = (role: AdminRoleRow) => {
    if (!canEdit) return
    setEditor({
      mode: 'edit',
      id: role.id,
      name: role.name,
      permissions: [...role.permissions],
    })
    setViewMode('edit')
  }

  const closeForm = () => {
    setViewMode('list')
    setEditor(emptyEditorState())
  }

  const handleSave = async () => {
    if (!editor.name.trim()) {
      toast({ title: 'Validation error', description: 'Role name is required.', variant: 'error' })
      return
    }

    const permissions = editor.permissions
    if (permissions.length === 0) {
      toast({ title: 'Validation error', description: 'At least one permission is required.', variant: 'error' })
      return
    }

    const payload: AdminRoleInput = {
      name: editor.name.trim(),
      permissions,
    }

    setSaving(true)
    try {
      if (editor.mode === 'create') {
        const created = await adminService.createRole(payload)
        setRoles((current) => [created, ...current])
        toast({ title: 'Role created', description: `${created.name} was created.` })
      } else if (editor.id) {
        const updated = await adminService.updateRole(editor.id, payload)
        setRoles((current) => current.map((role) => (role.id === updated.id ? updated : role)))
        toast({ title: 'Role updated', description: `${updated.name} was updated.` })
      }

      closeForm()
    } catch (err) {
      toast({ title: 'Save failed', description: getErrorMessage(err, 'Unable to save role.'), variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (role: AdminRoleRow) => {
    if (role.isSystem) {
      toast({ title: 'Delete blocked', description: 'System roles cannot be deleted.', variant: 'error' })
      return
    }

    if (!window.confirm(`Delete role ${role.name}?`)) return

    try {
      await adminService.deleteRole(role.id)
      setRoles((current) => current.filter((item) => item.id !== role.id))
      toast({ title: 'Role deleted', description: `${role.name} was deleted.` })
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err, 'Unable to delete role.'), variant: 'error' })
    }
  }

  const toggleActionPermissions = (keys: string[]) => {
    if (keys.length === 0) return
    setEditor((current) => {
      const allEnabled = keys.every((permission) => current.permissions.includes(permission))
      return {
        ...current,
        permissions: allEnabled
          ? current.permissions.filter((permission) => !keys.includes(permission))
          : Array.from(new Set([...current.permissions, ...keys])),
      }
    })
  }

  if (viewMode !== 'list') {
    const actionAllowed = viewMode === 'create' ? canCreate : canEdit
    if (!actionAllowed) {
      return <EmptyState title="Access denied" subtitle="You do not have permission for this action." />
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {viewMode === 'create' ? 'Create Role' : 'Edit Role'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {viewMode === 'create'
                ? 'Create a new role and assign permissions.'
                : 'Update role and manage permissions.'}
            </p>
          </div>
          <Button variant="outline" onClick={closeForm}>
            Back to Roles
          </Button>
        </div>

        <Card className="space-y-5 p-5 md:p-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Role Name *</label>
            <Input
              value={editor.name}
              onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))}
              placeholder="Enter role name"
            />
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700">Permissions</p>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {actionColumns.map((column) => (
                <div key={column.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-3 text-base font-semibold text-slate-800">{column.label}</h3>
                  <div className="max-h-80 space-y-2 overflow-auto pr-1">
                    {column.entries.map((entry) => {
                      const checked = entry.keys.every((permission) => editor.permissions.includes(permission))
                      return (
                        <label key={`${column.key}-${entry.moduleLabel}`} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleActionPermissions(entry.keys)}
                          />
                          <span className="truncate">{entry.moduleLabel}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : viewMode === 'create' ? 'Create Role' : 'Update Role'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!loading && !error && !canView ? (
        <EmptyState title="Access denied" subtitle="You do not have permission to view roles." />
      ) : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Roles Management</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage user roles and their permissions.</p>
        </div>
        {canCreate ? (
          <Button className="self-start shadow-lg shadow-sky-500/15" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        ) : null}
      </div>

      {canView ? <Card className="space-y-6 p-0">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search roles..." className="pl-11" />
            </div>
          </div>
          <select
            value={perPage}
            onChange={(event) => setPerPage(Number(event.target.value))}
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
            <EmptyState title="Unable to load roles" subtitle={error} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-4"><SortHeader label="Name" active={sort.key === 'name'} direction={sort.direction} onClick={() => updateSort('name')} /></th>
                    <th className="px-5 py-4"><SortHeader label="Permissions" active={sort.key === 'permissions'} direction={sort.direction} onClick={() => updateSort('permissions')} /></th>
                    <th className="px-5 py-4"><SortHeader label="Created Date" active={sort.key === 'createdAt'} direction={sort.direction} onClick={() => updateSort('createdAt')} /></th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleRoles.map((role) => (
                    <tr key={role.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-950">{role.name}</p>
                        <p className="text-sm text-slate-500">{role.userCount} assigned users</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {(role.modules?.length ? role.modules : summarizePermissionModules(role.permissions))
                            .slice(0, 3)
                            .map((moduleLabel) => (
                            <span key={`${role.id}-${moduleLabel}`} className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {moduleLabel}
                            </span>
                          ))}
                          {(role.modules?.length ? role.modules : summarizePermissionModules(role.permissions)).length > 3 ? (
                            <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                              +{(role.modules?.length ? role.modules : summarizePermissionModules(role.permissions)).length - 3} more
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(role.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {canEdit ? (
                            <Button variant="outline" className="h-9 px-3 text-xs" type="button" onClick={() => openEditForm(role)}>
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button
                              variant="destructive"
                              className="h-9 px-3 text-xs"
                              type="button"
                              disabled={role.isSystem}
                              onClick={() => handleDelete(role)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleRoles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-16 text-center text-sm text-slate-500">No roles match the current search.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * perPage + 1} to {(currentPage - 1) * perPage + visibleRoles.length} of {sortedRoles.length} roles
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" className="h-9 px-3 text-xs" disabled={currentPage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">Page {currentPage} of {totalPages}</div>
                <Button variant="outline" className="h-9 px-3 text-xs" disabled={currentPage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card> : null}
    </div>
  )
}
