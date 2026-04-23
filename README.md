# MDS Scraper

TikTok scraper split into three services.

```
frontend/   Vite + React + TanStack Router   (port 5173)
backend/    Express API                       (port 3001)
worker/     Express + Playwright              (port 3002)
```

Backend receives scrape requests from the frontend and dispatches them to the worker service. The worker owns Playwright.

## Dev

```sh
# three terminals
cd frontend && npm run dev
cd backend && npm run dev
cd worker && npm run dev
```

Or from the repo root: `npm run dev:frontend`, `npm run dev:backend`, `npm run dev:worker`.

The Vite dev server proxies `/api/*` to `http://localhost:3001` (the backend). Wire backend → worker however you prefer (HTTP, Redis queue, etc.).
