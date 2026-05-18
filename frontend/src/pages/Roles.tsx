import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { adminService, type AdminRoleInput, type AdminRoleRow } from '@/services/admin.service'
import { authService } from '@/services/auth.service'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/hooks/use-toast'
import { hasPermission, permissionKeys } from '@/lib/permissions'
import { toModuleLabel } from '@/lib/permission-display'
import { useAuthStore } from '@/store/auth-store'
import { RolesForm } from '@/components/roles/Roles-form'
import { RolesTable } from '@/components/roles/Roles-table'
import {
  getEditId,
  isModuleCreateRoute,
  isModuleEditRoute,
  navigateToEdit,
} from '@/lib/edit-route'

const ROLES_PATH = '/admin/roles'

type RoleSortKey = 'name' | 'permissions' | 'createdAt'
type SortState = { key: RoleSortKey; direction: 'asc' | 'desc' }
type EditorState = { mode: 'create' | 'edit'; id?: string; name: string; permissions: string[] }
type MatrixAction = 'create' | 'edit' | 'delete' | 'view' | 'export'

const matrixActions: Array<{ key: MatrixAction; label: string }> = [
  { key: 'create', label: 'Create' },
  { key: 'edit', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
  { key: 'view', label: 'View' },
  { key: 'export', label: 'Export' },
]

const toMatrixAction = (permission: string): MatrixAction | null => {
  if (permission === 'ai.chat') return 'view'
  if (permission.endsWith('.create') || permission.endsWith('.import')) return 'create'
  if (permission.endsWith('.update') || permission.endsWith('.manage') || permission.endsWith('.write')) return 'edit'
  if (permission.endsWith('.delete')) return 'delete'
  if (permission.endsWith('.export')) return 'export'
  if (permission.endsWith('.read') || permission.includes('.timeline.read')) return 'view'
  return null
}

const sortRoles = (rows: AdminRoleRow[], sort: SortState) =>
  [...rows].sort((left, right) => {
    const multiplier = sort.direction === 'asc' ? 1 : -1
    if (sort.key === 'permissions') return (left.permissions.length - right.permissions.length) * multiplier
    if (sort.key === 'createdAt') return (new Date(left[sort.key]).getTime() - new Date(right[sort.key]).getTime()) * multiplier
    return String(left[sort.key]).localeCompare(String(right[sort.key])) * multiplier
  })

const getErrorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response
    if ((err as { response?: { status?: number } }).response?.status === 403) {
      return 'You do not have permission to access this section.'
    }
    if (response?.data?.message) return response.data.message
  }
  if (err instanceof Error && err.message) return err.message
  return fallback
}

const emptyEditorState = (): EditorState => ({ mode: 'create', name: '', permissions: [] })

export const RolesPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
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
  const canView = hasPermission(user?.role, 'roles.read', user?.permissions)
  const canCreate = hasPermission(user?.role, 'roles.create', user?.permissions)
  const canEdit = hasPermission(user?.role, 'roles.update', user?.permissions)
  const canDelete = hasPermission(user?.role, 'roles.delete', user?.permissions)

  const loadRoles = async () => {
    if (!canView) {
      setLoading(false)
      setError('You do not have permission to access this section.')
      return
    }

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
  }, [canView])

  useEffect(() => {
    if (isModuleCreateRoute(location.pathname, ROLES_PATH)) {
      setEditor(emptyEditorState())
      setViewMode('create')
      return
    }
    if (isModuleEditRoute(location.pathname, ROLES_PATH)) {
      const editId = getEditId(location)
      if (!editId) {
        navigate(ROLES_PATH, { replace: true })
        return
      }
      const selected = roles.find((role) => role.id === editId)
      if (selected) {
        setEditor({ mode: 'edit', id: selected.id, name: selected.name, permissions: [...selected.permissions] })
        setViewMode('edit')
      }
      return
    }
    setViewMode('list')
  }, [location.pathname, location.state, roles, navigate])

  const filteredRoles = useMemo(() => {
    const query = search.trim().toLowerCase()
    return roles.filter((role) => [role.name, role.role, ...(role.modules ?? []), ...(role.actions ?? []), ...role.permissions].some((value) => value.toLowerCase().includes(query)))
  }, [roles, search])
  const sortedRoles = useMemo(() => sortRoles(filteredRoles, sort), [filteredRoles, sort])
  const totalPages = Math.max(1, Math.ceil(sortedRoles.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const visibleRoles = sortedRoles.slice((currentPage - 1) * perPage, currentPage * perPage)
  const availablePermissions = useMemo(() => Array.from(new Set([...permissionKeys, ...roles.flatMap((role) => role.permissions)])).sort(), [roles])

  const permissionMatrixRows = useMemo(() => {
    const groups = new Map<string, Record<MatrixAction, string[]>>()
    for (const permission of availablePermissions) {
      const [group] = permission.split('.')
      const action = toMatrixAction(permission)
      if (!action) continue
      if (!groups.has(group)) groups.set(group, { create: [], edit: [], delete: [], view: [], export: [] })
      groups.get(group)?.[action].push(permission)
    }
    const preferredOrder = ['ai', 'items', 'categories', 'qr', 'reports', 'scan', 'stock']
    return Array.from(groups.entries())
      .sort(([left], [right]) => {
        const leftOrder = preferredOrder.indexOf(left)
        const rightOrder = preferredOrder.indexOf(right)
        if (leftOrder !== -1 || rightOrder !== -1) return (leftOrder === -1 ? 999 : leftOrder) - (rightOrder === -1 ? 999 : rightOrder)
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
          export: actions.export.sort(),
        },
      }))
  }, [availablePermissions])

  const actionColumns = useMemo(
    () =>
      matrixActions.map((action) => ({
        ...action,
        entries: permissionMatrixRows
          .map((row) => ({ moduleLabel: row.label, keys: row.actions[action.key] }))
          .filter((entry) => entry.keys.length > 0),
      })),
    [permissionMatrixRows],
  )

  useEffect(() => setPage(1), [search, sort, perPage])
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages])

  const updateSort = (key: RoleSortKey) => {
    setSort((current) => (current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))
  }
  const openCreateForm = () => { if (canCreate) navigate('/admin/roles/create') }
  const openEditForm = (role: AdminRoleRow) => {
    if (canEdit) navigateToEdit(navigate, ROLES_PATH, role.id)
  }
  const closeForm = () => navigate('/admin/roles')

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
    const payload: AdminRoleInput = { name: editor.name.trim(), permissions }
    setSaving(true)
    try {
      if (editor.mode === 'create') {
        await adminService.createRole(payload)
        toast({ title: 'Role created', description: `${payload.name} was created.` })
      } else if (editor.id) {
        await adminService.updateRole(editor.id, payload)
        toast({
          title: 'Role updated',
          description: `${payload.name} permissions saved. Other users with this role should log in again.`,
        })
      }
      await loadRoles()
      try {
        const session = await authService.refreshSession()
        setAuth(session.token, session.user)
      } catch {
        // Keep saved role even if session refresh fails.
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
    if (!actionAllowed) return <EmptyState title="Access denied" subtitle="You do not have permission for this action." />
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{viewMode === 'create' ? 'Create Role' : 'Edit Role'}</h1>
            <p className="mt-1 text-sm text-slate-500">{viewMode === 'create' ? 'Create a new role and assign permissions.' : 'Update role and manage permissions.'}</p>
          </div>
          <Button variant="outline" onClick={closeForm}>Back to Roles</Button>
        </div>
        <RolesForm
          mode={viewMode}
          name={editor.name}
          permissions={editor.permissions}
          actionColumns={actionColumns}
          saving={saving}
          onNameChange={(value) => setEditor((current) => ({ ...current, name: value }))}
          onToggleActionPermissions={toggleActionPermissions}
          onSubmit={handleSave}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {!loading && !error && !canView ? <EmptyState title="Access denied" subtitle="You do not have permission to view roles." /> : null}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950">Roles Management</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage user roles and their permissions.</p>
        </div>
        {canCreate ? <Button className="self-start shadow-lg shadow-sky-500/15" onClick={openCreateForm}><Plus className="h-4 w-4" />Create Role</Button> : null}
      </div>
      {canView ? (
        <RolesTable
          roles={visibleRoles}
          loading={loading}
          error={error}
          search={search}
          perPage={perPage}
          currentPage={currentPage}
          totalPages={totalPages}
          totalRoles={sortedRoles.length}
          canEdit={canEdit}
          canDelete={canDelete}
          sortKey={sort.key}
          sortDirection={sort.direction}
          onSearchChange={setSearch}
          onPerPageChange={setPerPage}
          onSort={updateSort}
          onEdit={openEditForm}
          onDelete={handleDelete}
          onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
          onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
        />
      ) : null}
    </div>
  )
}
