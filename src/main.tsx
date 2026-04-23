import React from 'react'
import ReactDOM from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import '@/i18n'
import App from '@/App'
import '@/index.css'

async function enableMocks() {
  console.log('[mock-check] VITE_USE_MOCKS =', import.meta.env.VITE_USE_MOCKS)
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return
  try {
    const { worker } = await import('@/mocks/browser')
    await worker.start({ onUnhandledRequest: 'bypass' })
    console.log('[MSW] worker started successfully')
  } catch (e) {
    console.error('[MSW] worker failed to start', e)
  }
}

void enableMocks().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
})
