const REMEMBER_FLAG_KEY = 'inventory_remember_me'
const REMEMBER_CREDENTIALS_KEY = 'inventory_remember_credentials'

export interface RememberedLogin {
  identifier: string
  password: string
}

const encodeValue = (value: string) => btoa(unescape(encodeURIComponent(value)))

const decodeValue = (value: string) => {
  try {
    return decodeURIComponent(escape(atob(value)))
  } catch {
    return ''
  }
}

export const isRememberMeEnabled = () => localStorage.getItem(REMEMBER_FLAG_KEY) === 'true'

export const loadRememberedLogin = (): RememberedLogin | null => {
  if (!isRememberMeEnabled()) return null
  const raw = localStorage.getItem(REMEMBER_CREDENTIALS_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { identifier?: string; email?: string; password?: string }
    const identifier = parsed.identifier ?? parsed.email ?? ''
    if (!identifier || !parsed.password) return null
    return {
      identifier: decodeValue(identifier),
      password: decodeValue(parsed.password),
    }
  } catch {
    return null
  }
}

export const saveRememberedLogin = (credentials: RememberedLogin) => {
  localStorage.setItem(REMEMBER_FLAG_KEY, 'true')
  localStorage.setItem(
    REMEMBER_CREDENTIALS_KEY,
    JSON.stringify({
      identifier: encodeValue(credentials.identifier),
      password: encodeValue(credentials.password),
    }),
  )
}

export const clearRememberedLogin = () => {
  localStorage.removeItem(REMEMBER_FLAG_KEY)
  localStorage.removeItem(REMEMBER_CREDENTIALS_KEY)
}
