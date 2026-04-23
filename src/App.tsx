import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { RequireAdmin } from '@/components/guards/RequireAdmin'
import { RequireAuth } from '@/components/guards/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/contexts/AuthContext'
import { HomeRedirect } from '@/pages/HomeRedirect'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import DashboardPage from '@/pages/DashboardPage'
import LocationsPage from '@/pages/LocationsPage'
import ChargersPage from '@/pages/ChargersPage'
import OrganizationsPage from '@/pages/OrganizationsPage'
import MediaListPage from '@/pages/partner/MediaListPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomeRedirect />} />
            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="locations" element={<LocationsPage />} />
                <Route path="chargers" element={<ChargersPage />} />
                <Route path="media" element={<MediaListPage />} />
                <Route element={<RequireAdmin />}>
                  <Route path="organizations" element={<OrganizationsPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster richColors position="top-center" closeButton />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
