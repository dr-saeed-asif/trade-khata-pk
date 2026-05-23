import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'

interface UserFormProps {
  isCreate: boolean
  name: string
  username: string
  email: string
  role: string
  roleOptions: string[]
  password: string
  saving: boolean
  onNameChange: (value: string) => void
  onUsernameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onRoleChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export const UserForm = ({
  isCreate,
  name,
  username,
  email,
  role,
  roleOptions,
  password,
  saving,
  onNameChange,
  onUsernameChange,
  onEmailChange,
  onRoleChange,
  onPasswordChange,
  onSubmit,
  onCancel,
}: UserFormProps) => (
  <Card className="space-y-5 p-5 md:p-6">
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
        <Input
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={formPlaceholders.user.fullName}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Username</label>
        <Input
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          placeholder={formPlaceholders.user.username}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
        <Input
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder={formPlaceholders.user.email}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
        <select
          value={role}
          onChange={(event) => onRoleChange(event.target.value)}
          className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none"
        >
          {roleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Password {!isCreate ? '(optional)' : ''}
        </label>
        <Input
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          placeholder={!isCreate ? formPlaceholders.user.passwordKeep : formPlaceholders.user.password}
        />
      </div>
    </div>
    <div className="flex justify-end gap-2">
      <Button variant="outline" type="button" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" onClick={onSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save User'}
      </Button>
    </div>
  </Card>
)
