import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Eye, EyeOff, User as UserIcon, KeyRound, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import {
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
  type ChangePasswordInput,
  type UpdateProfileInput,
} from '@/lib/validators'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth-store'
import { useToast } from '@/hooks/use-toast'
import { theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

const roleLabels = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  USER: 'User',
} as const

export const SettingsPage = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
  const logout = useAuthStore((state) => state.logout)

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [memberSince, setMemberSince] = useState('')

  const [profileName, setProfileName] = useState(user?.name ?? '')
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '')
  const [profileErrors, setProfileErrors] = useState<Partial<Record<keyof UpdateProfileInput, string>>>({})

  const [passwordForm, setPasswordForm] = useState<ChangePasswordInput>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<Partial<Record<keyof ChangePasswordInput, string>>>({})
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.name) setProfileName(user.name)
      if (user?.email) setProfileEmail(user.email)

      try {
        const profile = await authService.getProfile()
        setProfileName(profile.name)
        setProfileEmail(profile.email)
        if (profile.createdAt) {
          setMemberSince(new Date(profile.createdAt).toLocaleDateString())
        }
      } catch (err) {
        const status = axios.isAxiosError(err) ? err.response?.status : undefined
        if (!user?.name && !user?.email) {
          toast({
            title: 'Could not load profile',
            description:
              status === 404
                ? 'Restart the backend server so the latest profile API is available.'
                : 'Please sign in again or check your connection.',
            variant: 'error',
          })
        }
      } finally {
        setLoadingProfile(false)
      }
    }
    void loadProfile()
  }, [toast, user?.email, user?.name])

  const handleSaveProfile = async () => {
    const parsed = updateProfileSchema.safeParse({ name: profileName })
    if (!parsed.success) {
      setProfileErrors(
        parsed.error.issues.reduce<Partial<Record<keyof UpdateProfileInput, string>>>((acc, issue) => {
          const path = issue.path[0] as keyof UpdateProfileInput
          acc[path] = issue.message
          return acc
        }, {}),
      )
      return
    }
    setProfileErrors({})
    setSavingProfile(true)
    try {
      const response = await authService.updateProfile(parsed.data)
      setAuth(response.token, response.user)
      toast({ title: 'Profile updated successfully' })
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'Could not update profile'
      toast({ title: message, variant: 'error' })
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    const parsed = changePasswordSchema.safeParse(passwordForm)
    if (!parsed.success) {
      setPasswordErrors(
        parsed.error.issues.reduce<Partial<Record<keyof ChangePasswordInput, string>>>((acc, issue) => {
          const path = issue.path[0] as keyof ChangePasswordInput
          acc[path] = issue.message
          return acc
        }, {}),
      )
      return
    }
    setPasswordErrors({})
    setSavingPassword(true)
    try {
      await authService.changePassword({
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      })
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast({ title: 'Password changed successfully' })
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'Could not change password'
      toast({ title: message, variant: 'error' })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    const parsed = deleteAccountSchema.safeParse({ password: deletePassword })
    if (!parsed.success) {
      setDeleteError(parsed.error.issues[0]?.message ?? 'Password is required')
      return
    }
    if (!window.confirm('This will permanently delete your account. This action cannot be undone. Continue?')) {
      return
    }
    setDeleteError('')
    setDeletingAccount(true)
    try {
      await authService.deleteAccount(parsed.data)
      logout()
      toast({ title: 'Your account has been deleted' })
      navigate('/signup', { replace: true })
    } catch (err) {
      const message =
        axios.isAxiosError(err) && typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : 'Could not delete account'
      setDeleteError(message)
      toast({ title: message, variant: 'error' })
    } finally {
      setDeletingAccount(false)
    }
  }

  if (loadingProfile) {
    return (
      <Card className="p-6">
        <p className="text-sm text-slate-500">Loading account settings…</p>
      </Card>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className={cn('text-2xl font-semibold', theme.headingGradient)}>Account Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your profile, password, and account preferences.</p>
      </div>

      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <UserIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
            <p className="text-sm text-slate-500">Update your personal information</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="settings-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Full Name
            </label>
            <Input
              id="settings-name"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder={formPlaceholders.user.fullName}
            />
            <p className="text-xs text-red-600">{profileErrors.name}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="settings-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <Input
              id="settings-email"
              type="email"
              value={profileEmail}
              readOnly
              className="cursor-not-allowed bg-slate-50 text-slate-600"
              placeholder={formPlaceholders.user.email}
            />
            <p className="text-xs text-slate-500">Email cannot be changed from settings.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span>
            Role: <strong className="text-slate-900">{roleLabels[user?.role ?? 'USER']}</strong>
          </span>
          {memberSince ? (
            <>
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span>
                Member since: <strong className="text-slate-900">{memberSince}</strong>
              </span>
            </>
          ) : null}
        </div>

        <Button type="button" disabled={savingProfile} onClick={() => void handleSaveProfile()}>
          {savingProfile ? 'Saving…' : 'Save profile'}
        </Button>
      </Card>

      <Card className="space-y-5 p-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Change Password</h2>
            <p className="text-sm text-slate-500">Use a strong password you do not use elsewhere</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="current-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current Password
            </label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrentPassword ? 'text' : 'password'}
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                }
                placeholder={formPlaceholders.auth.password}
                className="pr-11"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                onClick={() => setShowCurrentPassword((current) => !current)}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-red-600">{passwordErrors.currentPassword}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                New Password
              </label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                  }
                  placeholder={formPlaceholders.user.password}
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowNewPassword((current) => !current)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-red-600">{passwordErrors.newPassword}</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Confirm New Password
              </label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(event) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
                  }
                  placeholder={formPlaceholders.user.password}
                  className="pr-11"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-red-600">{passwordErrors.confirmPassword}</p>
            </div>
          </div>
        </div>

        <Button type="button" disabled={savingPassword} onClick={() => void handleChangePassword()}>
          {savingPassword ? 'Updating…' : 'Update password'}
        </Button>
      </Card>

      <Card className="space-y-5 border-red-200 p-6">
        <div className="flex items-center gap-3 border-b border-red-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-700">Delete Account</h2>
            <p className="text-sm text-slate-500">
              Permanently remove your account and sign out. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="delete-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Confirm with your password
          </label>
          <Input
            id="delete-password"
            type="password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            placeholder={formPlaceholders.auth.password}
          />
          <p className="text-xs text-red-600">{deleteError}</p>
        </div>

        <Button
          type="button"
          variant="destructive"
          disabled={deletingAccount}
          onClick={() => void handleDeleteAccount()}
        >
          {deletingAccount ? 'Deleting…' : 'Delete my account'}
        </Button>
      </Card>
    </div>
  )
}
