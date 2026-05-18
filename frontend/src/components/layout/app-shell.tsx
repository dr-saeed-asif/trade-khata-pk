import { useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Boxes,
  FolderTree,
  Bell,
  LayoutDashboard,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  Bot,
  Receipt,
  ShoppingCart,
  Contact,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth-store'
import { useUiStore } from '@/store/ui-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { hasPermission, type Permission } from '@/lib/permissions'
import { alertsService } from '@/services/alerts.service'
import type { AlertSummary } from '@/types'
import { AiAssistant } from '@/components/ai/ai-assistant'
import { APP_NAME, appLogo } from '@/lib/branding'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.read' },
  // { to: '/add-item', label: 'Add Item' },
  { to: '/admin/inventory', label: 'Inventory Lists', icon: Boxes, permission: 'items.read' },
  { to: '/admin/sales', label: 'Sales', icon: Receipt, permission: 'sales.read' },
  { to: '/admin/purchases', label: 'Purchases', icon: ShoppingCart, permission: 'purchases.read' },
  { to: '/admin/parties', label: 'Parties', icon: Contact, permission: 'parties.read' },
  { to: '/admin/stock-operations', label: 'Stock Operations', icon: Warehouse, permission: 'stock.read' },
  { to: '/admin/scanner', label: 'QR Scanner', icon: QrCode, permission: 'scan.create' },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, permission: 'categories.read' },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, permission: 'reports.read' },
  { to: '/admin/alerts', label: 'Alerts', icon: Bell, permission: 'alerts.read' },
  { to: '/admin/users', label: 'Users', icon: Users, permission: 'users.read' },
  { to: '/admin/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.read' },
  // { to: '/admin/settings', label: 'Settings', icon: Settings, permission: 'settings.read' },
] as const satisfies Array<{ to: string; label: string; icon: (typeof LayoutDashboard); permission: Permission | null }>

export const AppShell = () => {
  const MIN_ASSISTANT_WIDTH = 320
  const MAX_ASSISTANT_WIDTH = 700
  const [collapsed, setCollapsed] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantWidth, setAssistantWidth] = useState(420)
  const [isResizingAssistant, setIsResizingAssistant] = useState(false)
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null)
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const locale = useUiStore((state) => state.locale)
  const setLocale = useUiStore((state) => state.setLocale)
  const lastUnreadCount = useRef(0)
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(assistantWidth)
  const canReadAlerts = hasPermission(user?.role, 'alerts.read', user?.permissions)
  const canUseAi = hasPermission(user?.role, 'ai.chat', user?.permissions)
  const visibleLinks = links.filter((link) =>
    link.permission ? hasPermission(user?.role, link.permission, user?.permissions) : true,
  )
  const initials = (user?.name ?? 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  useEffect(() => {
    let cancelled = false

    const loadSummary = async () => {
      if (!canReadAlerts) {
        setAlertSummary(null)
        return
      }
      try {
        const summary = await alertsService.summary()
        if (cancelled) return
        setAlertSummary(summary)

        if (typeof Notification !== 'undefined') {
          if (Notification.permission === 'default' && summary.unread > 0) {
            void Notification.requestPermission()
          }
          if (Notification.permission === 'granted' && summary.unread > lastUnreadCount.current) {
            const alerts = await alertsService.list()
            const firstUnread = alerts.find((alert) => !alert.isRead)
            if (firstUnread) {
              new Notification(firstUnread.title, { body: firstUnread.message })
            }
          }
        }

        lastUnreadCount.current = summary.unread
      } catch {
        // Keep the shell usable if alerts are temporarily unavailable.
      }
    }

    void loadSummary()
    const interval = window.setInterval(() => {
      void loadSummary()
    }, 60000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [canReadAlerts])

  useEffect(() => {
    if (!canUseAi) setAssistantOpen(false)
  }, [canUseAi])

  useEffect(() => {
    if (!isResizingAssistant) return

    const onMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - resizeStartXRef.current
      const next = resizeStartWidthRef.current - deltaX
      const bounded = Math.max(MIN_ASSISTANT_WIDTH, Math.min(MAX_ASSISTANT_WIDTH, next))
      setAssistantWidth(bounded)
    }

    const onMouseUp = () => {
      setIsResizingAssistant(false)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingAssistant])

  const startAssistantResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    resizeStartXRef.current = event.clientX
    resizeStartWidthRef.current = assistantWidth
    setIsResizingAssistant(true)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside
        className={cn(
          'flex h-screen flex-col border-r border-slate-200 bg-white/95 p-3 shadow-sm transition-all',
          collapsed ? 'w-20' : 'w-72',
        )}
      >
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-2 rounded-xl bg-white/95 py-1 backdrop-blur">
          <div className={cn('flex min-w-0 items-center gap-2', collapsed ? 'justify-center' : '')}>
            <img
              src={appLogo}
              alt={`${APP_NAME} logo`}
              className={cn('shrink-0 object-contain', collapsed ? 'h-9 w-9' : 'h-10 w-10')}
            />
            {!collapsed ? (
              <span className="truncate px-1 text-lg font-semibold tracking-tight text-slate-900">{APP_NAME}</span>
            ) : null}
          </div>
          <Button
            variant="outline"
            className="h-11 w-11 p-0"
            onClick={() =>
              setCollapsed((s) => {
                const next = !s
                if (next) setUserMenuOpen(false)
                return next
              })
            }
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto pb-4">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900',
                )
              }
              title={link.label}
            >
              {({ isActive }) => (
                <>
                  <link.icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-slate-500')} />
                  {!collapsed ? (
                    <span className={cn('truncate', isActive ? 'text-white' : 'text-slate-700')}>{link.label}</span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-3">
          <div className={cn('rounded-xl border border-slate-200 bg-slate-50', collapsed ? 'p-2' : 'p-3')}>
            {!collapsed && !userMenuOpen ? (
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left hover:bg-slate-100"
                onClick={() => setUserMenuOpen((current) => !current)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-sm font-semibold text-slate-700">
                    {initials || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-slate-900">{user?.name ?? 'User'}</p>
                  </div>
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500" />
              </button>
            ) : null}
            {!collapsed && userMenuOpen ? (
              <div className="space-y-1">
                <button
                  type="button"
                  className="flex w-full items-start justify-between rounded-md px-2 pb-2 text-left hover:bg-slate-100"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <div>
                    <p className="truncate text-base font-semibold text-slate-900">{user?.name ?? 'User'}</p>
                    <p className="truncate text-sm text-slate-600">{user?.email ?? 'No email'}</p>
                  </div>
                  <ChevronsUpDown className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                </button>
                <div className="border-t border-slate-200" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-base text-slate-700 hover:bg-slate-200/60"
                  onClick={() => navigate('/admin/settings')}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-base text-slate-700 hover:bg-slate-200/60"
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : collapsed ? (
              <div className="mt-2 flex justify-center">
                <Button
                  variant="outline"
                  className="h-9 w-9 p-0"
                  title="Profile Menu"
                  onClick={() => setUserMenuOpen((current) => !current)}
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>
      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-6">
          <div>
            <p className="text-sm text-slate-500">Welcome</p>
            <p className="font-semibold">{user?.name ?? 'User'}</p>
          </div>
          <div className="flex items-center gap-3">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 transition-colors ${locale === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  onClick={() => setLocale('en')}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`rounded-md px-2.5 py-1 transition-colors ${locale === 'ur' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  onClick={() => setLocale('ur')}
                >
                  Urdu
                </button>
              </div>
              {canUseAi ? (
                <Button variant="outline" onClick={() => setAssistantOpen((current) => !current)}>
                  <Bot className="h-4 w-4" />
                  <span>{assistantOpen ? 'Hide AI' : 'Open AI'}</span>
                </Button>
              ) : null}
          {canReadAlerts ? (
              <Button variant="outline" className="relative" onClick={() => navigate('/admin/alerts')}>
                <Bell className="h-4 w-4" />
                <span>Open alerts</span>
                {alertSummary?.unread ? (
                  <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
                    {alertSummary.unread}
                  </span>
                ) : null}
              </Button>
          ) : null}
            </div>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="flex h-full min-h-0">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
              <Outlet />
            </div>
            {assistantOpen && canUseAi ? (
              <>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  aria-label="Resize chatbot panel"
                  className="w-1 shrink-0 cursor-col-resize bg-slate-200/70 transition-colors hover:bg-sky-400/70 active:bg-sky-500"
                  onMouseDown={startAssistantResize}
                />
                <aside
                  className="h-full shrink-0 border-l border-slate-200 bg-white/90 p-4 backdrop-blur md:p-5"
                  style={{ width: `${assistantWidth}px` }}
                >
                  <AiAssistant className="h-full" />
                </aside>
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
