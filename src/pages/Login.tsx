import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { canAccessApp } from '@/lib/permissions'
import { login } from '@/services/api'

const USE_MOCK = String(import.meta.env.VITE_USE_MOCK).toLowerCase() === 'true'

export default function Login() {
  const { user, setUser, setAuthToken } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user && canAccessApp(user)) return <Navigate to="/" replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await login(identifier, password)
      if (!res.success || !res.data) {
        setError(res.message || 'Login failed')
        return
      }
      setAuthToken(res.data.token)
      setUser(res.data.user)
      if (!canAccessApp(res.data.user)) {
        setError('Your account could not be loaded.')
        return
      }
      navigate('/')
    } catch {
      setError('Login request failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-background">
      <Card className="w-full max-w-md border border-border">
        <CardHeader className="space-y-1">
          <div className="mb-2">
            <h2 className="text-xl font-semibold">ION Screen</h2>
            <p className="text-xs text-muted-foreground">Media Management</p>
          </div>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Mobile</Label>
              <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <p className="text-xs text-muted-foreground">Access screen dashboard</p>
            {USE_MOCK ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground/90">Access dashboard</p>
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>admin@test.com</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>partner@test.com</span>
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground/70 italic pt-0.5">Use password: 12345678</p>
              </div>
            ) : null}
            {error ? <div className="text-sm text-destructive">{error}</div> : null}
            <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
