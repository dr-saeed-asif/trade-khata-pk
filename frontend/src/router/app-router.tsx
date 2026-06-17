import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactElement } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { LoginPage } from '@/pages/Login'
import { SignUpPage } from '@/pages/SignUp'
import { ForgotPasswordPage } from '@/pages/ForgotPassword'
import { AppShell } from '@/components/layout/app-shell'
import { DashboardPage } from '@/pages/Dashboard'
import { AddItemPage } from '@/pages/Item'
import { EditItemPage } from '@/pages/EditItem'
import { InventoryListPage } from '@/pages/Inventory'
import { ScannerPage } from '@/pages/Scanner'
import { CategoriesPage } from '@/pages/Category'
import { ReportsPage } from '@/pages/Reports'
import { SettingsPage } from '@/pages/Settings'
import { StockOperationsPage } from '@/pages/Stock-Operations'
import { UsersPage } from '@/pages/User'
import { RolesPage } from '@/pages/Roles'
import { AlertsPage } from '@/pages/Alerts'
import { PartiesPage } from '@/pages/Parties'
import { SalesPage } from '@/pages/Sales'
import { PurchasesPage } from '@/pages/Purchases'
import { hasPermission, type Permission } from '@/lib/permissions'

const isDesktopFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'
const RouterProvider = isDesktopFileProtocol ? HashRouter : BrowserRouter
const SAFE_FALLBACK_ROUTE = '/admin/dashboard'

const RequirePermission = ({ permission, children }: { permission: Permission; children: ReactElement }) => {
  const user = useAuthStore((state) => state.user)
  if (!user) return <Navigate to="/signup" replace />
  if (!hasPermission(user.role, permission, user.permissions)) {
    if (permission === 'settings.read') return <Navigate to="/signup" replace />
    return <Navigate to={SAFE_FALLBACK_ROUTE} replace />
  }
  return children
}

const ProtectedRoutes = () => {
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  if (!token || !user) return <Navigate to="/signup" replace />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/inventory" element={<Navigate to="/admin/inventory" replace />} />
        <Route path="/stock-operations" element={<Navigate to="/admin/stock-operations" replace />} />
        <Route path="/scanner" element={<Navigate to="/admin/scanner" replace />} />
        <Route path="/categories" element={<Navigate to="/admin/categories" replace />} />
        <Route path="/parties" element={<Navigate to="/admin/parties" replace />} />
        <Route path="/sales" element={<Navigate to="/admin/sales" replace />} />
        <Route path="/purchases" element={<Navigate to="/admin/purchases" replace />} />
        <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
        <Route path="/alerts" element={<Navigate to="/admin/alerts" replace />} />
        <Route path="/users" element={<Navigate to="/admin/users" replace />} />
        <Route path="/roles" element={<Navigate to="/admin/roles" replace />} />
        <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
        <Route path="/admin/dashboard" element={<RequirePermission permission="dashboard.read"><DashboardPage /></RequirePermission>} />
        <Route path="/admin/add-item" element={<RequirePermission permission="items.create"><AddItemPage /></RequirePermission>} />
        <Route path="/admin/inventory" element={<RequirePermission permission="items.read"><InventoryListPage /></RequirePermission>} />
        <Route path="/admin/inventory/edit" element={<RequirePermission permission="items.update"><EditItemPage /></RequirePermission>} />
        <Route path="/admin/scanner" element={<RequirePermission permission="scan.create"><ScannerPage /></RequirePermission>} />
        <Route path="/admin/stock-operations" element={<RequirePermission permission="stock.read"><StockOperationsPage /></RequirePermission>} />
        <Route path="/admin/categories" element={<RequirePermission permission="categories.read"><CategoriesPage /></RequirePermission>} />
        <Route path="/admin/reports" element={<RequirePermission permission="reports.read"><ReportsPage /></RequirePermission>} />
        <Route path="/admin/alerts" element={<RequirePermission permission="alerts.read"><AlertsPage /></RequirePermission>} />
        <Route path="/admin/users" element={<RequirePermission permission="users.read"><UsersPage /></RequirePermission>} />
        <Route path="/admin/users/create" element={<RequirePermission permission="users.create"><UsersPage /></RequirePermission>} />
        <Route path="/admin/users/edit" element={<RequirePermission permission="users.update"><UsersPage /></RequirePermission>} />
        <Route path="/admin/roles" element={<RequirePermission permission="roles.read"><RolesPage /></RequirePermission>} />
        <Route path="/admin/roles/create" element={<RequirePermission permission="roles.create"><RolesPage /></RequirePermission>} />
        <Route path="/admin/roles/edit" element={<RequirePermission permission="roles.update"><RolesPage /></RequirePermission>} />
        <Route path="/admin/settings" element={<RequirePermission permission="settings.read"><SettingsPage /></RequirePermission>} />
        <Route path="/admin/parties" element={<RequirePermission permission="parties.read"><PartiesPage /></RequirePermission>} />
        <Route path="/admin/parties/create" element={<RequirePermission permission="parties.manage"><PartiesPage /></RequirePermission>} />
        <Route path="/admin/parties/edit" element={<RequirePermission permission="parties.manage"><PartiesPage /></RequirePermission>} />
        <Route path="/admin/sales" element={<RequirePermission permission="sales.read"><SalesPage /></RequirePermission>} />
        <Route path="/admin/sales/create" element={<RequirePermission permission="sales.create"><SalesPage /></RequirePermission>} />
        <Route path="/admin/sales/edit" element={<RequirePermission permission="sales.create"><SalesPage /></RequirePermission>} />
        <Route path="/admin/purchases" element={<RequirePermission permission="purchases.read"><PurchasesPage /></RequirePermission>} />
        <Route path="/admin/purchases/create" element={<RequirePermission permission="purchases.create"><PurchasesPage /></RequirePermission>} />
        <Route path="/admin/purchases/edit" element={<RequirePermission permission="purchases.create"><PurchasesPage /></RequirePermission>} />
        <Route path="/admin/categories/create" element={<RequirePermission permission="categories.manage"><CategoriesPage /></RequirePermission>} />
        <Route path="/admin/categories/edit" element={<RequirePermission permission="categories.manage"><CategoriesPage /></RequirePermission>} />
      </Route>
    </Routes>
  )
}

export const AppRouter = () => (
  <RouterProvider>
    <Routes>
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/*" element={<ProtectedRoutes />} />
    </Routes>
  </RouterProvider>
)
