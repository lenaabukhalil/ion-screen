export default function App() {
  return (
    <div className="min-h-screen bg-background p-8 text-foreground">
      <h1 className="text-2xl font-bold tracking-tight">ion-screen</h1>
      <p className="mt-3 max-w-xl text-sm text-muted-foreground">
        Phase 0: mock API foundation. With <code className="rounded bg-muted px-1 py-0.5">VITE_USE_MOCKS=true</code>, open the
        browser console — you should see{' '}
        <code className="rounded bg-muted px-1 py-0.5">[MSW] Mocking enabled</code>.
      </p>
    </div>
  )
}
