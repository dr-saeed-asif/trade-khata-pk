const moduleLabelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  items: 'Inventory',
  categories: 'Category',
  qr: 'QR Code',
  reports: 'Report',
  alerts: 'Alerts',
  scan: 'Scan',
  stock: 'Stock',
  users: 'Users',
  roles: 'Roles',
  settings: 'Settings',
  ai: 'AI Assistant',
  parties: 'Parties',
  sales: 'Sales',
  purchases: 'Purchases',
}

export const getPermissionActionLabel = (permission: string): string | null => {
  const action = permission.split('.')[1] ?? permission
  const normalized = action.toLowerCase()
  if (normalized === 'read') return 'View'
  if (normalized === 'create') return 'Create'
  if (normalized === 'update' || normalized === 'write') return 'Edit'
  if (normalized === 'delete') return 'Delete'
  if (normalized === 'manage') return 'Manage'
  if (normalized === 'import') return 'Import'
  if (normalized === 'export') return 'Export'
  return null
}

export const toPermissionModule = (permission: string) => permission.split('.')[0] ?? permission

export const toModuleLabel = (moduleKey: string) =>
  moduleLabelMap[moduleKey] ??
  moduleKey
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const summarizePermissionActions = (permissions: string[]) =>
  Array.from(
    new Set(
      permissions
        .map((permission) => getPermissionActionLabel(permission))
        .filter((action): action is string => Boolean(action)),
    ),
  )

export const summarizePermissionModules = (permissions: string[]) =>
  Array.from(new Set(permissions.map(toPermissionModule))).map((moduleKey) => toModuleLabel(moduleKey))
