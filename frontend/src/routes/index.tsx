import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '../components/ui/foundations/button'
import { Input } from '../components/ui/foundations/input'
import { Card } from '../components/ui/foundations/card'
import { StatusBadge, VerdictBadge, formatTime } from '../components/badges'
import { MOCK_JOBS } from '../data/mockJobs'

export const Route = createFileRoute('/')({
  component: ScrapePage,
})

function ScrapePage() {
  const [url, setUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitted(true)
    setUrl('')
  }

  const done = MOCK_JOBS.filter(j => j.status === 'done')
  const disinfoRate = done.length
    ? Math.round((done.filter(j => j.verdict === 'disinformation').length / done.length) * 100)
    : 0
  const recent = MOCK_JOBS.slice(0, 5)

  return (
    <div className="mx-auto max-w-2xl">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-foreground">
          Detect TikTok Disinformation
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a TikTok video URL — our AI agent scrapes, downloads, and classifies it via Google Vertex AI.
        </p>
      </div>

      {/* URL form */}
      <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
        <Input
          type="url"
          placeholder="https://tiktok.com/@username/video/..."
          value={url}
          onChange={e => setUrl(e.target.value)}
          className="font-mono text-sm"
        />
        <Button type="submit" disabled={!url.trim()} size="lg">
          <SearchIcon />
          Analyze
        </Button>
      </form>

      {/* Success banner */}
      {submitted && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckIcon />
          Job queued —{' '}
          <Link to="/jobs" className="ml-1 underline underline-offset-2">
            track it in All Jobs →
          </Link>
        </div>
      )}

      {/* Stats strip */}
      <div className="mb-8 flex gap-8 border-y border-border py-4">
        <Stat value="1,247" label="videos analyzed" />
        <Stat value={`${disinfoRate}%`} label="flagged as disinformation" />
        <Stat value="< 3 s" label="avg. analysis time" />
        <Stat value="Vertex AI" label="classifier" />
      </div>

      {/* Recent analyses */}
      <Card.Root>
        <Card.Header className="border-b border-border">
          <div className="flex items-center justify-between">
            <Card.Title>Recent Analyses</Card.Title>
            <Link to="/jobs" className="text-xs font-medium text-primary hover:underline">
              View all →
            </Link>
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">URL</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verdict</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submitted</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {recent.map((job, i) => (
                <tr
                  key={job.id}
                  className={`border-b border-border transition-colors hover:bg-muted/30 ${i === recent.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="max-w-[220px] truncate px-5 py-3 font-mono text-xs text-muted-foreground">
                    {job.url.replace('https://', '')}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3"><VerdictBadge verdict={job.verdict} /></td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">{formatTime(job.submittedAt)}</td>
                  <td className="px-5 py-3">
                    <Link
                      to="/jobs/$id"
                      params={{ id: job.id }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card.Root>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
