import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { APP_NAME, APP_TAGLINE, appLogo } from '@/lib/branding'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { authService } from '@/services/auth.service'
import { cn } from '@/lib/utils'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccessMessage('')

    const parsed = emailSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid email')
      return
    }

    setLoading(true)
    try {
      const result = await authService.forgotPassword(parsed.data.email)
      setSuccessMessage(result.message)
    } catch {
      setError('Unable to process your request. Please try again.')
    } finally {
      setLoading(false)
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
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />

      <div className="relative z-10 w-full max-w-md">
        <Card className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/75 p-8 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-9">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-4 ring-white/60">
              <img src={appLogo} alt={`${APP_NAME} logo`} className="h-full w-full object-contain p-1" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Forgot password</h1>
            <p className="mt-1 text-sm text-slate-500">{APP_TAGLINE}</p>
            <p className="mt-2 text-sm text-slate-600">Enter your email and we will guide you on the next steps.</p>
          </div>

          <form onSubmit={(event) => void onSubmit(event)} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="forgot-email" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="h-11 border-slate-200/80 bg-white/90"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50/90 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
            {successMessage ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-800">
                {successMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 font-semibold text-white"
            >
              {loading ? 'Sending...' : 'Send reset request'}
            </Button>
          </form>

          <Link
            to="/login"
            className={cn(
              'mt-6 flex items-center justify-center gap-2 text-sm font-medium text-sky-600 transition hover:text-sky-700',
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </Card>
      </div>
    </div>
  )
}
