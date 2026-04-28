import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui/foundations/button'
import { Input } from '../components/ui/foundations/input'
import { Card } from '../components/ui/foundations/card'
import { searchService, type SearchResult, type TikTokVideo } from '../utils/api'

export const Route = createFileRoute('/')({
  component: ScrapePage,
})

function ScrapePage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await searchService.search(query)
      setResult(data)
    } catch {
      setError('Agent failed. Make sure the worker is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          TikTok Disinformation Search
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter a topic or hashtag — the AI agent will search TikTok, scrape videos, and return comments.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6 flex gap-2">
        <Input
          type="text"
          placeholder="e.g. climate change, #fakenews, vaccines..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          disabled={loading}
          className="text-sm"
        />
        <Button type="submit" disabled={!query.trim() || loading} size="lg">
          {loading ? <Spinner /> : <SearchIcon />}
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </form>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Spinner large />
          <p className="text-sm">Agent is browsing TikTok...</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Found <span className="font-semibold text-foreground">{result.videos.length}</span> videos
          </p>
          {result.videos.map((video, i) => (
            <VideoCard key={i} video={video} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function VideoCard({ video, index }: { video: TikTokVideo; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const preview = expanded ? video.comments : video.comments.slice(0, 3)

  return (
    <Card.Root>
      <Card.Header className="border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Video {index + 1}
            </p>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-primary hover:underline break-all"
            >
              {video.url}
            </a>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {video.comments.length} comments
          </span>
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        {video.comments.length === 0 ? (
          <p className="px-5 py-4 text-sm text-muted-foreground">No comments found.</p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {preview.map((c, j) => (
                <li key={j} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-0.5 shrink-0 text-xs font-semibold text-foreground">
                    {c.author}
                  </span>
                  <span className="flex-1 text-sm text-muted-foreground">{c.text}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">♥ {c.likes}</span>
                </li>
              ))}
            </ul>
            {video.comments.length > 3 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="w-full border-t border-border px-5 py-2.5 text-xs font-medium text-primary hover:bg-muted/30 transition-colors"
              >
                {expanded ? 'Show less ↑' : `Show all ${video.comments.length} comments ↓`}
              </button>
            )}
          </>
        )}
      </Card.Content>
    </Card.Root>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function Spinner({ large }: { large?: boolean }) {
  const size = large ? 32 : 14
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
