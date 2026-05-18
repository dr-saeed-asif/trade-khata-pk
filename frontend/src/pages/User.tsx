import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminService, type AdminUserInput, type AdminUserRow } from '@/services/admin.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useToast } from '@/hooks/use-toast'
import { summarizePermissionActions } from '@/lib/permission-display'
import { useAuthStore } from '@/store/auth-store'
import { hasPermission } from '@/lib/permissions'
import { UserForm } from '@/components/users/User-form'
import { UserTable } from '@/components/users/User-table'
import {
  getEditId,
  isModuleCreateRoute,
  isModuleEditRoute,
  navigateToEdit,
} from '@/lib/edit-route'

const USERS_PATH = '/admin/users'

type UserSortKey = 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'
type SortState = { key: UserSortKey; direction: 'asc' | 'desc' }
type EditorState = { mode: 'create' | 'edit'; id?: string; name: string; username: string; email: string; password: string; role: string }

const sortUsers = (rows: AdminUserRow[], sort: SortState) =>
  [...rows].sort((left, right) => {
    const multiplier = sort.direction === 'asc' ? 1 : -1
    if (sort.key === 'createdAt' || sort.key === 'updatedAt') {
      return (new Date(left[sort.key]).getTime() - new Date(right[sort.key]).getTime()) * multiplier
    }
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

const logUserPermissions = (
  users: AdminUserRow[],
  roles: Array<{ role: string; permissions: string[]; actions?: string[] }>,
) => {
  const actionsByRole = new Map(roles.map((role) => [role.role, role.actions?.length ? role.actions : summarizePermissionActions(role.permissions)]))
  const rows = users.map((user) => ({
    user: user.name,
    email: user.email,
    role: user.role,
    permissions: (actionsByRole.get(user.role) ?? []).join(', ') || 'No permissions assigned',
  }))
  console.groupCollapsed('User Permission Mapping')
  console.table(rows)
  console.groupEnd()
}

const emptyEditorState = (): EditorState => ({ mode: 'create', name: '', username: '', email: '', password: '', role: 'USER' })

export const UsersPage = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [roleOptions, setRoleOptions] = useState<string[]>(['ADMIN', 'MANAGER', 'USER'])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'name', direction: 'asc' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [editor, setEditor] = useState<EditorState>(emptyEditorState)
  const canView = hasPermission(user?.role, 'users.read', user?.permissions)
  const canCreate = hasPermission(user?.role, 'users.create', user?.permissions)
  const canEdit = hasPermission(user?.role, 'users.update', user?.permissions)
  const canDelete = hasPermission(user?.role, 'users.delete', user?.permissions)

  const loadUsers = async () => {
    if (!canView) {
      setLoading(false)
      setError('You do not have permission to access this section.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [usersData, rolesData] = await Promise.all([adminService.listUsers(), adminService.listRoles()])
      setUsers(usersData)
      const dynamicRoles = Array.from(new Set([...rolesData.map((role) => role.role), 'ADMIN', 'MANAGER', 'USER']))
      setRoleOptions(dynamicRoles)
      logUserPermissions(usersData, rolesData)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [canView])

  useEffect(() => {
    if (isModuleCreateRoute(location.pathname, USERS_PATH)) {
      setEditor({ ...emptyEditorState(), mode: 'create' })
      return
    }
    if (isModuleEditRoute(location.pathname, USERS_PATH)) {
      const editId = getEditId(location)
      if (!editId) {
        navigate(USERS_PATH, { replace: true })
        return
      }
      const selected = users.find((row) => row.id === editId)
      if (!selected) return
      setEditor({
        mode: 'edit',
        id: selected.id,
        name: selected.name,
        username: selected.username ?? '',
        email: selected.email,
        password: '',
        role: selected.role,
      })
      return
    }
    setEditor(emptyEditorState())
  }, [location.pathname, location.state, users, navigate])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) =>
      [user.name, user.username ?? '', user.email, user.role].some((value) => value.toLowerCase().includes(query)),
    )
  }, [users, search])
  const sortedUsers = useMemo(() => sortUsers(filteredUsers, sort), [filteredUsers, sort])
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const visibleUsers = sortedUsers.slice((currentPage - 1) * perPage, currentPage * perPage)

  useEffect(() => setPage(1), [search, sort, perPage])
  useEffect(() => setPage((current) => Math.min(current, totalPages)), [totalPages])

  const updateSort = (key: UserSortKey) => {
    setSort((current) => (current.key === key ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }))
  }
  const openCreateModal = () => navigate('/admin/users/create')
  const openEditModal = (row: AdminUserRow) => navigateToEdit(navigate, USERS_PATH, row.id)
  const closeModal = () => navigate('/admin/users')

  const handleSave = async () => {
    if (!editor.name.trim() || !editor.email.trim()) {
      toast({ title: 'Validation error', description: 'Name and email are required.', variant: 'error' })
      return
    }
    if (editor.mode === 'create' && editor.password.length < 6) {
      toast({ title: 'Validation error', description: 'Password must be at least 6 characters.', variant: 'error' })
      return
    }
    const payload: AdminUserInput = {
      name: editor.name.trim(),
      username: editor.username.trim() || undefined,
      email: editor.email.trim(),
      role: editor.role,
      ...(editor.password ? { password: editor.password } : {}),
    }
    setSaving(true)
    try {
      if (editor.mode === 'create') {
        const created = await adminService.createUser(payload)
        setUsers((current) => [created, ...current])
        toast({ title: 'User created', description: `${created.email} was added successfully.` })
      } else if (editor.id) {
        const updated = await adminService.updateUser(editor.id, payload)
        setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)))
        toast({ title: 'User updated', description: `${updated.email} was updated successfully.` })
      }
      closeModal()
    } catch (err) {
      toast({ title: 'Request failed', description: getErrorMessage(err, 'Unable to save user.'), variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: AdminUserRow) => {
    if (!window.confirm(`Delete user ${user.email}?`)) return
    try {
      await adminService.deleteUser(user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      toast({ title: 'User deleted', description: `${user.email} was deleted.` })
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err, 'Unable to delete user.'), variant: 'error' })
    }
  }

  const summary = [
    { label: 'Total Users', value: users.length },
    { label: 'Admins', value: users.filter((user) => user.role === 'ADMIN').length },
    { label: 'Managers', value: users.filter((user) => user.role === 'MANAGER').length },
  ]
  const isCreateRoute = isModuleCreateRoute(location.pathname, USERS_PATH)
  const isEditRoute = isModuleEditRoute(location.pathname, USERS_PATH)

  if (!loading && !error && !canView) return <EmptyState title="Access denied" subtitle="You do not have permission to view users." />

  if (isCreateRoute || isEditRoute) {
    const canOpenForm = isCreateRoute ? canCreate : canEdit
    if (!canOpenForm) return <EmptyState title="Access denied" subtitle="You do not have permission for this action." />
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{isCreateRoute ? 'Create Admin User' : 'Edit Admin User'}</h1>
            <p className="mt-1 text-sm text-slate-500">{isCreateRoute ? 'Create a new admin user and assign role.' : 'Update admin user details and role.'}</p>
          </div>
          <Button variant="outline" onClick={closeModal}>Back to Users</Button>
        </div>
        <Card className="space-y-5 p-5 md:p-6">
          <UserForm
            isCreate={isCreateRoute}
            name={editor.name}
            username={editor.username}
            email={editor.email}
            role={editor.role}
            roleOptions={roleOptions}
            password={editor.password}
            saving={saving}
            onNameChange={(value) => setEditor((current) => ({ ...current, name: value }))}
            onUsernameChange={(value) => setEditor((current) => ({ ...current, username: value }))}
            onEmailChange={(value) => setEditor((current) => ({ ...current, email: value }))}
            onRoleChange={(value) => setEditor((current) => ({ ...current, role: value }))}
            onPasswordChange={(value) => setEditor((current) => ({ ...current, password: value }))}
            onSubmit={handleSave}
            onCancel={closeModal}
          />
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Admin users</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Admin Users</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage admin user accounts and role assignments.</p>
        </div>
        {canCreate ? <Button className="self-start shadow-lg shadow-sky-500/15" onClick={openCreateModal}><Plus className="h-4 w-4" />Create Admin User</Button> : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label} className="space-y-1 p-5">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
          </Card>
        ))}
      </div>

      <UserTable
        users={visibleUsers}
        loading={loading}
        error={error}
        search={search}
        perPage={perPage}
        currentPage={currentPage}
        totalPages={totalPages}
        totalUsers={sortedUsers.length}
        canEdit={canEdit}
        canDelete={canDelete}
        sortKey={sort.key}
        sortDirection={sort.direction}
        onSearchChange={setSearch}
        onPerPageChange={setPerPage}
        onSort={updateSort}
        onEdit={openEditModal}
        onDelete={handleDelete}
        onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
      />
    </div>
  )
}
