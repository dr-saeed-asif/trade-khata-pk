import type { Location, NavigateFunction } from 'react-router-dom'

export type EditNavigationState = {
  editId?: string
}

export const getEditId = (location: Location): string | undefined => {
  const state = location.state as EditNavigationState | null
  return state?.editId?.trim() || undefined
}

export const navigateToEdit = (navigate: NavigateFunction, modulePath: string, id: string) => {
  navigate(`${modulePath}/edit`, { state: { editId: id } satisfies EditNavigationState })
}

export const isModuleCreateRoute = (pathname: string, modulePath: string) =>
  pathname === `${modulePath}/create`

export const isModuleEditRoute = (pathname: string, modulePath: string) =>
  pathname === `${modulePath}/edit`
