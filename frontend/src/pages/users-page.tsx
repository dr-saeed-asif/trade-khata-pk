import { useEffect, useMemo, useState } from 'react'
import { ArrowDownUp, ChevronLeft, ChevronRight, PencilLine, Plus, Search, Trash2 } from 'lucide-react'
import { adminService, type AdminUserInput, type AdminUserRow } from '@/services/admin.service'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { useToast } from '@/hooks/use-toast'
import { summarizePermissionActions } from '@/lib/permission-display'
import { useAuthStore } from '@/store/auth-store'
import { cn } from '@/lib/utils'

type UserSortKey = 'name' | 'email' | 'role' | 'createdAt' | 'updatedAt'

type SortState = {
  key: UserSortKey
  direction: 'asc' | 'desc'
}

type EditorState = {
  open: boolean
  mode: 'create' | 'edit'
  id?: string
  name: string
  email: string
  password: string
  role: string
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

const sortUsers = (rows: AdminUserRow[], sort: SortState) =>
  [...rows].sort((left, right) => {
    const multiplier = sort.direction === 'asc' ? 1 : -1

    if (sort.key === 'createdAt' || sort.key === 'updatedAt') {
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

const logUserPermissions = (
  users: AdminUserRow[],
  roles: Array<{ role: string; permissions: string[]; actions?: string[] }>,
) => {
  const actionsByRole = new Map(
    roles.map((role) => [role.role, role.actions?.length ? role.actions : summarizePermissionActions(role.permissions)]),
  )
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

const emptyEditorState = (): EditorState => ({
  open: false,
  mode: 'create',
  name: '',
  email: '',
  password: '',
  role: 'USER',
})

export const UsersPage = () => {
  const { toast } = useToast()
  const currentUserRole = useAuthStore((state) => state.user?.role)
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

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersData, rolesData] = await Promise.all([adminService.listUsers(), adminService.listRoles()])
      setUsers(usersData)
      const dynamicRoles = Array.from(
        new Set([...rolesData.map((role) => role.role), 'ADMIN', 'MANAGER', 'USER']),
      )
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
  }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) =>
      [user.name, user.email, user.role].some((value) => value.toLowerCase().includes(query)),
    )
  }, [users, search])

  const sortedUsers = useMemo(() => sortUsers(filteredUsers, sort), [filteredUsers, sort])
  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const visibleUsers = sortedUsers.slice((currentPage - 1) * perPage, currentPage * perPage)

  useEffect(() => {
    setPage(1)
  }, [search, sort, perPage])

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages))
  }, [totalPages])

  const updateSort = (key: UserSortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const openCreateModal = () => setEditor({ ...emptyEditorState(), open: true })

  const openEditModal = (user: AdminUserRow) => {
    setEditor({
      open: true,
      mode: 'edit',
      id: user.id,
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
    })
  }

  const closeModal = () => setEditor(emptyEditorState())

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
  const canView = currentUserRole === 'ADMIN'
  const canCreate = currentUserRole === 'ADMIN'
  const canEdit = currentUserRole === 'ADMIN'
  const canDelete = currentUserRole === 'ADMIN'

  if (!loading && !error && !canView) {
    return <EmptyState title="Access denied" subtitle="You do not have permission to view users." />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-sky-600">Admin users</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Admin Users</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Manage admin user accounts and role assignments.</p>
        </div>
        {canCreate ? (
          <Button className="self-start shadow-lg shadow-sky-500/15" onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Create Admin User
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <Card key={item.label} className="space-y-1 p-5">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="space-y-6 p-0">
        <div className="flex flex-col gap-4 border-b border-slate-200/80 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search users..." className="pl-11" />
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
            <EmptyState title="Unable to load users" subtitle={error} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-5 py-4"><SortHeader label="Name" active={sort.key === 'name'} direction={sort.direction} onClick={() => updateSort('name')} /></th>
                    <th className="px-5 py-4"><SortHeader label="Email" active={sort.key === 'email'} direction={sort.direction} onClick={() => updateSort('email')} /></th>
                    <th className="px-5 py-4"><SortHeader label="Roles" active={sort.key === 'role'} direction={sort.direction} onClick={() => updateSort('role')} /></th>
                    <th className="px-5 py-4"><SortHeader label="Created At" active={sort.key === 'createdAt'} direction={sort.direction} onClick={() => updateSort('createdAt')} /></th>
                    <th className="px-5 py-4"><SortHeader label="Updated At" active={sort.key === 'updatedAt'} direction={sort.direction} onClick={() => updateSort('updatedAt')} /></th>
                    <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {visibleUsers.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50">
                      <td className="px-5 py-4 font-medium text-slate-950">{user.name}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{user.email}</td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                            user.role === 'ADMIN' && 'bg-emerald-100 text-emerald-800',
                            user.role === 'MANAGER' && 'bg-sky-100 text-sky-800',
                            user.role === 'USER' && 'bg-slate-100 text-slate-700',
                          )}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">{formatDate(user.updatedAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {canEdit ? (
                            <Button variant="outline" className="h-9 px-3 text-xs" type="button" onClick={() => openEditModal(user)}>
                              <PencilLine className="h-4 w-4" />
                              Edit
                            </Button>
                          ) : null}
                          {canDelete ? (
                            <Button variant="destructive" className="h-9 px-3 text-xs" type="button" onClick={() => handleDelete(user)}>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center text-sm text-slate-500">
                        No users match the current search.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * perPage + 1} to {(currentPage - 1) * perPage + visibleUsers.length} of {sortedUsers.length} users
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="h-9 px-3 text-xs"
                  disabled={currentPage === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  className="h-9 px-3 text-xs"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={editor.open}
        onClose={closeModal}
        title={editor.mode === 'create' ? 'Create Admin User' : 'Edit Admin User'}
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save User'}
            </Button>
          </div>
        )}
      >
        <div className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <Input value={editor.name} onChange={(event) => setEditor((current) => ({ ...current, name: event.target.value }))} placeholder="Enter full name" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <Input value={editor.email} onChange={(event) => setEditor((current) => ({ ...current, email: event.target.value }))} placeholder="Enter email" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select
              value={editor.role}
              onChange={(event) => setEditor((current) => ({ ...current, role: event.target.value }))}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password {editor.mode === 'edit' ? '(optional)' : ''}
            </label>
            <Input
              type="password"
              value={editor.password}
              onChange={(event) => setEditor((current) => ({ ...current, password: event.target.value }))}
              placeholder={editor.mode === 'edit' ? 'Leave empty to keep current password' : 'Enter password'}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
