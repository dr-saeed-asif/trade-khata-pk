import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { loginSchema, type LoginInput } from '@/lib/validators'
import { authService } from '@/services/auth.service'
import { useAuthStore } from '@/store/auth-store'
import { useApi } from '@/hooks/use-api'

export const LoginPage = () => {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginInput, string>>>({})
  const [form, setForm] = useState<LoginInput>({
    identifier: '',
    password: '',
  })
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
      setAuth(response.token, response.user)
      navigate('/')
    } catch {
      setError('Invalid credentials. Please try again.')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <h1 className="mb-4 text-xl font-semibold">Login</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit(form)
          }}
          className="space-y-4"
        >
          <div>
            <Input
              placeholder="Email or username"
              value={form.identifier}
              onChange={(event) => setForm((prev) => ({ ...prev, identifier: event.target.value }))}
            />
            <p className="text-xs text-red-600">{fieldErrors.identifier}</p>
          </div>
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
            <p className="text-xs text-red-600">{fieldErrors.password}</p>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button disabled={loading} className="w-full">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
