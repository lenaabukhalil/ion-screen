import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from '@/components/AdminLayout'
import { PartnerLayout } from '@/components/PartnerLayout'
import { useAuth } from '@/context/AuthContext'
import { useRole } from '@/hooks/useRole'
import { canAccessApp } from '@/lib/permissions'
import Dashboard from '@/pages/Dashboard'
import Login from '@/pages/Login'
import MediaLibrary from '@/pages/MediaLibrary'
import MyMedia from '@/pages/partner/MyMedia'
import PartnerUpload from '@/pages/partner/Upload'
import PendingReview from '@/pages/PendingReview'
function AuthenticatedShell() {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading...</div>
  if (!user || !canAccessApp(user)) return <Navigate to="/login" replace />
  return <RoleRoutes />
}

function RoleRoutes() {
  const { isAdmin } = useRole()
  if (isAdmin) {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          {/* Pending Review: approve/reject — only organization_id === 1 (see RequireAdmin + PendingReview guard). */}
          <Route path="pending" element={<PendingReview />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<PartnerLayout />}>
        <Route index element={<MyMedia />} />
        <Route path="upload" element={<PartnerUpload />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<AuthenticatedShell />} />
    </Routes>
  )
}
