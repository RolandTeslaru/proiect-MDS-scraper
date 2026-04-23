# Agentic Disinformation Detection Pipeline

Using agentic AI to sift through news content and identify disinformation aimed at destabilising and influencing populations.

## Overview

A TikTok scraper that detects fake news. An LLM drives a set of Playwright-backed tools that browse TikTok, navigate pages dynamically, and capture the embedded MP4 URL for a given video.

The backend then downloads the MP4 through a provider and forwards it to **Google Vertex AI**, which processes MP4s natively and classifies the clip as disinformation or authentic, unbiased news.

## Pipeline

1. **Agent** (LangChain / LangGraph) plans how to reach the target video.
2. **Playwright tools** expose browser actions the agent can call to navigate TikTok and extract the MP4 URL.
3. **Backend** downloads the MP4 and uploads it to Vertex AI.
4. **Vertex AI** classifies the video; result is persisted to Supabase.
5. **Frontend** surfaces the verdict and supporting evidence.

## Stack

| Layer     | Tech                                                       |
| --------- | ---------------------------------------------------------- |
| Language  | TypeScript                                                 |
| Agent     | LangChain (possibly LangGraph)                             |
| Tools     | Playwright                                                 |
| Frontend  | React + Vite + TanStack Router — hosted on **Vercel**      |
| Backend   | Node.js + Express — hosted on **Railway**                  |
| Worker    | Node.js + Express + Playwright (separate service)          |
| Classifier| Google Vertex AI (native MP4 input)                        |
| Database  | Supabase                                                   |

## Repo Layout

```
frontend/   Vite + React + TanStack Router   (port 5173)
backend/    Express API                       (port 3001)
worker/     Express + Playwright              (port 3002)
```

The worker is split out from the backend so the browser runtime can be scaled, restarted, and deployed independently.

## Dev

```sh
# three terminals
cd frontend && npm run dev
cd backend && npm run dev
cd worker && npm run dev
```

Or from the repo root: `npm run dev:frontend`, `npm run dev:backend`, `npm run dev:worker`.

The Vite dev server proxies `/api/*` → `http://localhost:3001` (backend). The backend talks to the worker over HTTP (or a queue — to be decided).
