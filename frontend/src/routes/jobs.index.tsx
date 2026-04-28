import { createFileRoute, Link } from '@tanstack/react-router'
import { Card } from '../components/ui/foundations/card'
import { StatusBadge, VerdictBadge, ConfidenceBar, formatTime } from '../components/badges'
import { MOCK_JOBS } from '../data/mockJobs'

export const Route = createFileRoute('/jobs/')({
  component: JobsList,
})

function JobsList() {
  const total       = MOCK_JOBS.length
  const disinfo     = MOCK_JOBS.filter(j => j.verdict === 'disinformation').length
  const authentic   = MOCK_JOBS.filter(j => j.verdict === 'authentic').length
  const inProgress  = MOCK_JOBS.filter(j => j.status === 'processing' || j.status === 'pending').length
  const failed      = MOCK_JOBS.filter(j => j.status === 'failed').length

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-foreground">All Analyses</h1>
        <p className="text-sm text-muted-foreground">Every video submitted to the disinformation detection pipeline.</p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-5 gap-3">
        <StatCard value={total}      label="Total"          color="text-foreground"      icon={<GridIcon />}   />
        <StatCard value={disinfo}    label="Disinformation" color="text-red-600 dark:text-red-400"   icon={<AlertIcon />}  bg="bg-red-500/8" />
        <StatCard value={authentic}  label="Authentic"      color="text-emerald-600 dark:text-emerald-400" icon={<CheckIcon />}  bg="bg-emerald-500/8" />
        <StatCard value={inProgress} label="In Progress"    color="text-blue-600 dark:text-blue-400"  icon={<ClockIcon />}  bg="bg-blue-500/8" />
        <StatCard value={failed}     label="Failed"         color="text-muted-foreground" icon={<XIcon />}     bg="bg-muted/50" />
      </div>

      {/* Table */}
      <Card.Root>
        <Card.Header className="border-b border-border">
          <Card.Title>Jobs</Card.Title>
        </Card.Header>
        <Card.Content className="p-0">
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
              {MOCK_JOBS.map((job, i) => (
                <tr
                  key={job.id}
                  className={`border-b border-border transition-colors hover:bg-muted/30 ${i === MOCK_JOBS.length - 1 ? 'border-b-0' : ''}`}
                >
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{job.id}</td>
                  <td className="max-w-[200px] px-5 py-3">
                    <span className="block truncate font-mono text-xs text-muted-foreground" title={job.url}>
                      {job.url.replace('https://', '')}
                    </span>
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-5 py-3"><VerdictBadge verdict={job.verdict} /></td>
                  <td className="px-5 py-3">
                    {job.confidence !== null
                      ? <ConfidenceBar confidence={job.confidence} verdict={job.verdict} />
                      : <span className="text-sm text-muted-foreground">—</span>}
                  </td>
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
