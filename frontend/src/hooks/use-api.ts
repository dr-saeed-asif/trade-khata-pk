import { useCallback, useState } from 'react'

export const useApi = <TData, TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<TData>,
) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = useCallback(
    async (...args: TArgs) => {
      setLoading(true)
      setError(null)
      try {
        return await fn(...args)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Request failed')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fn],
  )

  return { execute, loading, error }
}
