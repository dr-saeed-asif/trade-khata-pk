import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_NAME, APP_TAGLINE, appLogo } from '@/lib/branding'
import { Input } from '@/components/ui/input'
import { formPlaceholders } from '@/lib/form-placeholders'
import { loginSchema, type LoginInput } from '@/lib/validators'
import {
  clearRememberedLogin,
  isRememberMeEnabled,
  loadRememberedLogin,
  saveRememberedLogin,
} from '@/lib/remember-login'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth-store'
import { useApi } from '@/hooks/use-api'
import { AuthCard, AuthLayout } from '@/components/layout/auth-layout'
import { theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

type LoginLocationState = {
  registered?: boolean
  email?: string
}

const getInitialForm = (): LoginInput => {
  const remembered = loadRememberedLogin()
  return remembered ?? { identifier: '', password: '' }
}

export const LoginPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = (location.state ?? {}) as LoginLocationState
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState('')
  const [successMessage] = useState(
    locationState.registered ? 'Account created successfully. Please sign in to continue.' : '',
  )
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(isRememberMeEnabled)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({})
  const [form, setForm] = useState<LoginInput>(() => {
    const initial = getInitialForm()
    if (locationState.email) {
      return { ...initial, identifier: locationState.email }
    }
    return initial
  })
  const { execute, loading } = useApi(authService.login)

  if (token && user) return <Navigate to="/" replace />

  const onSubmit = async (values: LoginInput) => {
    setError('')
    const parsed = loginSchema.safeParse(values)
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.issues.reduce<Partial<Record<keyof LoginInput, string>>>((acc, issue) => {
          const path = issue.path[0] as keyof LoginInput
          acc[path] = issue.message
          return acc
        }, {}),
      )
      return
    }
    setFieldErrors({})
    try {
      const response = await execute(values)
      if (rememberMe) {
        saveRememberedLogin({ identifier: values.identifier, password: values.password })
      } else {
        clearRememberedLogin()
      }
      setAuth(response.token, response.user)
      navigate('/')
    } catch {
      setError('Invalid credentials. Please try again.')
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
          <p className="mt-1 text-xs text-slate-400">Sign in to continue</p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit(form)
          }}
          className="space-y-5"
        >
          <div className="space-y-1.5">
            <label htmlFor="login-identifier" className={theme.label}>
              Email or Username
            </label>
            <Input
              id="login-identifier"
              autoComplete="username"
              placeholder={formPlaceholders.auth.loginId}
              value={form.identifier}
              onChange={(event) => setForm((prev) => ({ ...prev, identifier: event.target.value }))}
            />
            <p className="min-h-[1rem] text-xs text-red-600">{fieldErrors.identifier}</p>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="login-password" className={theme.label}>
                Password
              </label>
              <Link to="/forgot-password" className={cn('text-xs', theme.link)}>
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={formPlaceholders.auth.password}
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
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => {
                const checked = event.target.checked
                setRememberMe(checked)
                if (!checked) clearRememberedLogin()
              }}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-sky-500/30"
            />
            Remember me
          </label>
          {successMessage ? (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800 shadow-sm">
              {successMessage}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700 shadow-sm">{error}</p>
          ) : null}
          <Button disabled={loading} className="h-11 w-full font-semibold">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className={theme.link}>
              Sign up
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthLayout>
  )
}
