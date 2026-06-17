/** Shared theme class strings (login / signup sky–indigo–violet palette). */
export const theme = {
  headingGradient: 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent',
  link: 'font-medium text-sky-600 transition hover:text-sky-700',
  label: 'text-xs font-semibold uppercase tracking-wide text-slate-500',
  panelGlass: 'border-white/40 bg-white/75 backdrop-blur-xl',
  navActive:
    'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md shadow-slate-900/20',
  navInactive: 'text-slate-700 hover:bg-sky-50/90 hover:text-slate-900',
  avatar: 'bg-gradient-to-br from-sky-100 to-indigo-100 text-slate-800',
} as const
