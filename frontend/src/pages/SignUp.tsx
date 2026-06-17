import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { APP_NAME, APP_TAGLINE, appLogo } from '@/lib/branding'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { formPlaceholders } from '@/lib/form-placeholders'
import { registerSchema, type RegisterInput } from '@/lib/validators'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth-store'
import { useApi } from '@/hooks/use-api'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
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
              <p className="mt-1 text-xs text-slate-400">Create your account to get started</p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void onSubmit(form)
              }}
              className="relative space-y-5"
            >
              <div className="space-y-1.5">
                <label htmlFor="signup-name" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full Name
                </label>
                <Input
                  id="signup-name"
                  autoComplete="name"
                  placeholder={formPlaceholders.user.fullName}
                  className="h-11 border-slate-200/80 bg-white/90 shadow-sm transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                />
                <p className="min-h-[1rem] text-xs text-red-600">{fieldErrors.name}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  placeholder={formPlaceholders.user.email}
                  className="h-11 border-slate-200/80 bg-white/90 shadow-sm transition-shadow duration-200 focus-visible:ring-2 focus-visible:ring-sky-500/30"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                />
                <p className="min-h-[1rem] text-xs text-red-600">{fieldErrors.email}</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder={formPlaceholders.user.password}
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
              {error ? (
                <p className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700 shadow-sm">{error}</p>
              ) : null}
              <Button
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 font-semibold text-white shadow-lg shadow-slate-900/25 transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? 'Creating account…' : 'Sign up'}
              </Button>
              <p className="text-center text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-sky-600 hover:text-sky-700">
                  Sign in
                </Link>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
