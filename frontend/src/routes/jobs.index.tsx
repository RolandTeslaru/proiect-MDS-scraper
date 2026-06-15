import { useState, useMemo } from 'react'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Card } from '../components/ui/foundations/card'
import { Button } from '../components/ui/foundations/button'
import { Input } from '../components/ui/foundations/input'
import { Skeleton } from '../components/ui/foundations/skeleton'
import { StatusBadge, VerdictBadge, ConfidenceBar, formatTime } from '../components/badges'
import { jobsService, analysisService, type JobStatus, type Verdict } from '../utils/api'

export const Route = createFileRoute('/jobs/')({
  loader: () => jobsService.list(),
  pendingComponent: JobsListSkeleton,
  errorComponent: JobsListError,
  component: JobsList,
})

function JobsList() {
  const jobs = Route.useLoaderData()
  const router = useRouter()

  const [url, setUrl]               = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')
  const [verdictFilter, setVerdictFilter] = useState<Verdict | 'all'>('all')

  const filtered = useMemo(
    () => jobs.filter(j => {
      if (statusFilter !== 'all' && j.status !== statusFilter) return false
      if (verdictFilter !== 'all' && j.verdict !== verdictFilter) return false
      return true
    }),
    [jobs, statusFilter, verdictFilter],
  )

  const { total, disinfo, authentic, inProgress, failed } = useMemo(() => ({
    total:      jobs.length,
    disinfo:    jobs.filter(j => j.verdict === 'disinformation').length,
    authentic:  jobs.filter(j => j.verdict === 'authentic').length,
    inProgress: jobs.filter(j => j.status === 'processing' || j.status === 'pending').length,
    failed:     jobs.filter(j => j.status === 'failed').length,
  }), [jobs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await analysisService.analyzeVideo({ url: url.trim() })
      setUrl('')
      await router.invalidate()
    } catch {
      setSubmitError('Failed to submit. Check that the backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">All Analyses</h1>
        <p className="text-sm text-muted-foreground">Every video submitted to the disinformation detection pipeline.</p>
      </div>

      {/* Submit form */}
      <Card.Root className="mb-6">
        <Card.Content className="py-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="url"
              placeholder="https://tiktok.com/@user/video/..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="flex-1"
              disabled={submitting}
            />
            <Button type="submit" disabled={submitting || !url.trim()} size="sm">
              {submitting ? 'Submitting…' : 'Analyze'}
            </Button>
          </form>
          {submitError && (
            <p className="mt-2 text-xs text-destructive">{submitError}</p>
          )}
        </Card.Content>
      </Card.Root>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-5 gap-3">
        <StatCard value={total}      label="Total"          color="text-foreground"                        icon={<GridIcon />}  />
        <StatCard value={disinfo}    label="Disinformation" color="text-red-600 dark:text-red-400"         icon={<AlertIcon />} bg="bg-red-500/8" />
        <StatCard value={authentic}  label="Authentic"      color="text-emerald-600 dark:text-emerald-400" icon={<CheckIcon />} bg="bg-emerald-500/8" />
        <StatCard value={inProgress} label="In Progress"    color="text-blue-600 dark:text-blue-400"       icon={<ClockIcon />} bg="bg-blue-500/8" />
        <StatCard value={failed}     label="Failed"         color="text-muted-foreground"                  icon={<XIcon />}     bg="bg-muted/50" />
      </div>

      {/* Table */}
      <Card.Root>
        <Card.Header className="flex flex-row items-center justify-between border-b border-border">
          <Card.Title>Jobs</Card.Title>
          {/* Filters */}
          <div className="flex items-center gap-2">
            <FilterChips
              label="Status"
              value={statusFilter}
              options={[
                { value: 'all',        label: 'All' },
                { value: 'pending',    label: 'Pending' },
                { value: 'processing', label: 'Processing' },
                { value: 'done',       label: 'Done' },
                { value: 'failed',     label: 'Failed' },
              ]}
              onChange={v => setStatusFilter(v as JobStatus | 'all')}
            />
            <div className="h-4 w-px bg-border" />
            <FilterChips
              label="Verdict"
              value={verdictFilter === null ? 'null' : verdictFilter}
              options={[
                { value: 'all',             label: 'All' },
                { value: 'disinformation',  label: 'Disinfo' },
                { value: 'authentic',       label: 'Authentic' },
              ]}
              onChange={v => setVerdictFilter(v === 'all' ? 'all' : v as Verdict)}
            />
          </div>
        </Card.Header>
        <Card.Content className="p-0">
          {filtered.length === 0 ? (
            <EmptyState hasJobs={jobs.length > 0} />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <Th>ID</Th>
                  <Th>URL</Th>
                  <Th>Status</Th>
                  <Th>Verdict</Th>
                  <Th>Confidence</Th>
                  <Th>Submitted</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((job, i) => (
                  <tr
                    key={job.id}
                    className={`border-b border-border transition-colors hover:bg-muted/30 ${i === filtered.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{job.id}</td>
                    <td className="max-w-[200px] px-5 py-3">
                      <span className="block truncate font-mono text-xs text-muted-foreground" title={job.sourceUrl}>
                        {job.sourceUrl.replace('https://', '')}
                      </span>
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-5 py-3"><VerdictBadge verdict={job.verdict} /></td>
                    <td className="px-5 py-3">
                      {job.confidence !== null
                        ? <ConfidenceBar confidence={job.confidence} verdict={job.verdict} />
                        : <span className="text-sm text-muted-foreground">—</span>}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{formatTime(job.createdAt)}</td>
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
          )}
        </Card.Content>
      </Card.Root>
    </div>
  )
}

function EmptyState({ hasJobs }: { hasJobs: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
        <GridIcon />
      </div>
      <p className="text-sm font-medium text-foreground">
        {hasJobs ? 'No jobs match the current filters' : 'No analyses yet'}
      </p>
      <p className="text-xs text-muted-foreground">
        {hasJobs ? 'Try clearing the filters above.' : 'Submit a TikTok URL above to get started.'}
      </p>
    </div>
  )
}

function JobsListSkeleton() {
  return (
    <div>
      <div className="mb-6">
        <Skeleton className="mb-2 h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="mb-6 h-14 w-full rounded-xl" />
      <div className="mb-6 grid grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  )
}

function JobsListError() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm font-medium text-foreground">Failed to load jobs</p>
      <p className="text-xs text-muted-foreground">Check that the backend is running and try refreshing.</p>
    </div>
  )
}

function FilterChips({
  value, options, onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={[
            'rounded-md px-2.5 py-1 text-xs transition-colors',
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  )
}

function StatCard({
  value, label, color, icon, bg = 'bg-muted/40',
}: {
  value: number
  label: string
  color: string
  icon: React.ReactNode
  bg?: string
}) {
  return (
    <Card.Root className="gap-3 py-4">
      <Card.Content>
        <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>
          {icon}
        </div>
        <div className={`text-2xl font-semibold ${color}`}>{value}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
      </Card.Content>
    </Card.Root>
  )
}

function GridIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> }
function AlertIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.29 3.86-8.6 14.9A2 2 0 0 0 3.41 22h17.18a2 2 0 0 0 1.72-3.24l-8.59-14.9a2 2 0 0 0-3.43 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> }
function CheckIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> }
function ClockIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> }
function XIcon()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> }
