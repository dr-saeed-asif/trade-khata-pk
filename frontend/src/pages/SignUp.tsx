import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { APP_NAME, APP_TAGLINE, appLogo } from '@/lib/branding'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { registerSchema, type RegisterInput } from '@/lib/validators'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth-store'
import { useApi } from '@/hooks/use-api'
import { AuthCard, AuthLayout } from '@/components/layout/auth-layout'
import { theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export const SignUpPage = () => {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterInput, string>>>({})
  const [form, setForm] = useState<RegisterInput>({ name: '', email: '', password: '' })
  const { execute, loading } = useApi(authService.register)

  if (token && user) return <Navigate to="/" replace />

  const onSubmit = async (values: RegisterInput) => {
    setError('')
    const parsed = registerSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<Partial<Record<keyof RegisterInput, string>>>((acc, issue) => {
          const path = issue.path[0] as keyof RegisterInput
          acc[path] = issue.message
          return acc
        }, {}),
      )
      return
    }
    setFieldErrors({})
    try {
      await execute(parsed.data)
      navigate('/login', {
        replace: true,
        state: { registered: true, email: parsed.data.email },
      })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setError('This email is already registered. Please sign in instead.')
        return
      }
      setError('Could not create account. Please try again.')
    }
  }

  return (
    <AuthLayout>
      <AuthCard>
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-900/15 ring-4 ring-white/60 transition-transform duration-300 hover:scale-105">
            <img src={appLogo} alt={`${APP_NAME} logo`} className="h-full w-full object-contain p-1" />
          </div>
          <h1 className={cn('text-2xl font-bold tracking-tight', theme.headingGradient)}>{APP_NAME}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{APP_TAGLINE}</p>
          <p className="mt-1 text-xs text-slate-400">Create your account to get started</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit(form)
          }}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="signup-name" className={theme.label}>
              Full Name
            </label>
            <Input
              id="signup-name"
              autoComplete="name"
              placeholder={formPlaceholders.user.fullName}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <p className="min-h-[1rem] text-xs text-red-600">{fieldErrors.name}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="signup-email" className={theme.label}>
              Email
            </label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder={formPlaceholders.user.email}
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <p className="min-h-[1rem] text-xs text-red-600">{fieldErrors.email}</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="signup-password" className={theme.label}>
              Password
            </label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder={formPlaceholders.user.password}
                className="pr-11"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1 text-slate-400 transition hover:text-slate-700"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="min-h-[1rem] text-xs text-red-600">{fieldErrors.password}</p>
          </div>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700 shadow-sm">{error}</p>
          ) : null}
          <Button disabled={loading} className="h-11 w-full font-semibold">
            {loading ? 'Creating account…' : 'Sign up'}
          </Button>
          <p className="text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className={theme.link}>
              Sign in
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}
