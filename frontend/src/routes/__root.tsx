import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'

export const Route = createRootRoute({
  component: () => (
    <>
      <header style={{ padding: '12px 20px', borderBottom: '1px solid #333' }}>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link to="/">Scrape</Link>
          <Link to="/jobs">Jobs</Link>
        </nav>
      </header>
      <main style={{ padding: 20 }}>
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  ),
})
