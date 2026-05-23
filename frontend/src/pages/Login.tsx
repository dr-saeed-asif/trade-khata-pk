import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_NAME, APP_TAGLINE, appLogo } from '@/lib/branding'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
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
import { cn } from '@/lib/utils'

const getInitialForm = (): LoginInput => {
  const remembered = loadRememberedLogin()
  return remembered ?? { identifier: '', password: '' }
}

export const LoginPage = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(isRememberMeEnabled)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({})
  const [form, setForm] = useState<LoginInput>(getInitialForm)
  const { execute, loading } = useApi(authService.login)

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Animated depth background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,165,233,0.22),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/4 h-[28rem] w-[28rem] rounded-full bg-sky-400/25 blur-[100px] [animation:login-orb-drift_18s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 h-[26rem] w-[26rem] rounded-full bg-indigo-500/20 blur-[90px] [animation:login-orb-drift_22s_ease-in-out_infinite_reverse]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(90vw,36rem)] w-[min(90vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/10 blur-[120px] [animation:login-orb-drift_26s_ease-in-out_infinite]"
      />

      {/* Subtle grid for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />

      <div className="relative z-10 w-full max-w-md [perspective:1200px]">
        <div
          className={cn(
            'transform-gpu transition-[transform,box-shadow] duration-500 ease-out will-change-transform',
            'hover:-translate-y-1 hover:shadow-[0_32px_64px_-16px_rgba(15,23,42,0.28),0_0_0_1px_rgba(255,255,255,0.08)_inset]',
            '[animation:login-card-in_0.75s_ease-out_both]',
          )}
        >
          {/* Glow ring */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-sky-400/50 via-indigo-400/35 to-violet-500/40 opacity-75 blur-[1px] [animation:login-border-glow_4s_ease-in-out_infinite]"
          />
          <Card className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/75 p-8 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-9">
            <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-200/40 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -left-12 h-36 w-36 rounded-full bg-indigo-200/35 blur-2xl" />

            <div className="relative mb-8 text-center">
              <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-900/15 ring-4 ring-white/60 transition-transform duration-300 hover:scale-105">
                <img src={appLogo} alt={`${APP_NAME} logo`} className="h-full w-full object-contain p-1" />
              </div>
              <h1 className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                {APP_NAME}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">{APP_TAGLINE}</p>
              <p className="mt-1 text-xs text-slate-400">Sign in to continue</p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void onSubmit(form)
              }}
              className="relative space-y-5"
            >
              <div className="space-y-1.5">
                <label htmlFor="login-identifier" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email or Username
                </label>
                <Input
                  id="login-identifier"
                  autoComplete="username"
                  placeholder={formPlaceholders.auth.loginId}
                  className="h-11 border-slate-200/80 bg-white/90 shadow-sm transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  value={form.identifier}
                  onChange={(event) => setForm((prev) => ({ ...prev, identifier: event.target.value }))}
                />
                <p className="min-h-[1rem] text-xs text-red-600">{fieldErrors.identifier}</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Password
                  </label>
                  <Link to="/forgot-password" className="text-xs font-medium text-sky-600 hover:text-sky-700">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={formPlaceholders.auth.password}
                    className="h-11 border-slate-200/80 bg-white/90 pr-11 shadow-sm transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-sky-500/30"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700"
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
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700 shadow-sm">{error}</p>
              ) : null}
              <Button
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 font-semibold text-white shadow-lg shadow-slate-900/25 transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
