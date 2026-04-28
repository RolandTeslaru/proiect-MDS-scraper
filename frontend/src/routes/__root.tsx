import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: Root,
})

function Root() {
  return (
    <>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground no-underline">
          <ShieldIcon />
          DisInfo Detector
        </Link>
        <nav className="flex items-center gap-1">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: 'rounded-md px-3 py-1.5 text-sm no-underline bg-accent/10 text-accent border border-accent/30' }}
          >
            Analyze
          </Link>
          <Link
            to="/jobs"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground no-underline transition-colors hover:bg-muted hover:text-foreground"
            activeProps={{ className: 'rounded-md px-3 py-1.5 text-sm no-underline bg-accent/10 text-accent border border-accent/30' }}
          >
            All Jobs
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 py-8">
        <Outlet />
      </main>

      <TanStackRouterDevtools />
    </>
  )
}

function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
