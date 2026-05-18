import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppRouter } from '@/router/app-router'
import { Toaster } from '@/components/ui/toaster'
import { initOfflineQueueSync } from '@/services/offline-queue'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
      return
    }

    // Dev mode: remove active service workers to avoid HMR websocket issues.
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister()
      })
    })
  })
}

initOfflineQueueSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <AppRouter />
      <Toaster />
    </>
  </StrictMode>,
)
