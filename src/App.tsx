import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { RequireAdmin } from '@/components/guards/RequireAdmin'
import { RequireAuth } from '@/components/guards/RequireAuth'
import { AppShell } from '@/components/layout/AppShell'
import { AuthProvider } from '@/contexts/AuthContext'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import AllMediaPage from '@/pages/admin/AllMediaPage'
import AllSchedulesPage from '@/pages/admin/AllSchedulesPage'
import ApprovalsQueuePage from '@/pages/admin/ApprovalsQueuePage'
import BillingByOrgPage from '@/pages/admin/BillingByOrgPage'
import ScreensPage from '@/pages/admin/ScreensPage'
import { HomeRedirect } from '@/pages/HomeRedirect'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'
import MediaDetailPage from '@/pages/partner/MediaDetailPage'
import MediaListPage from '@/pages/partner/MediaListPage'
import MediaUploadPage from '@/pages/partner/MediaUploadPage'
import MyBillingPage from '@/pages/partner/MyBillingPage'
import PartnerDashboard from '@/pages/partner/PartnerDashboard'
import ScheduleCreatePage from '@/pages/partner/ScheduleCreatePage'
import SchedulesListPage from '@/pages/partner/SchedulesListPage'

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
              <Route path="partner" element={<AppShell role="partner" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<PartnerDashboard />} />
                <Route path="media" element={<MediaListPage />} />
                <Route path="media/upload" element={<MediaUploadPage />} />
                <Route path="media/:id" element={<MediaDetailPage />} />
                <Route path="schedules" element={<SchedulesListPage />} />
                <Route path="schedules/new" element={<ScheduleCreatePage />} />
                <Route path="billing" element={<MyBillingPage />} />
              </Route>
              <Route element={<RequireAdmin />}>
                <Route path="admin" element={<AppShell role="admin" />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="approvals" element={<ApprovalsQueuePage />} />
                  <Route path="media" element={<AllMediaPage />} />
                  <Route path="schedules" element={<AllSchedulesPage />} />
                  <Route path="screens" element={<ScreensPage />} />
                  <Route path="billing" element={<BillingByOrgPage />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster richColors position="top-center" />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
