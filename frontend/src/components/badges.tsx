import { Badge } from './ui/foundations/Badge'
import type { JobStatus, Verdict } from '../data/mockJobs'

export function StatusBadge({ status }: { status: JobStatus }) {
  if (status === 'done')
    return <Badge variant="success">Done</Badge>
  if (status === 'processing')
    return <Badge className="border-0 bg-blue-500/10 text-blue-700 dark:text-blue-400">● Processing</Badge>
  if (status === 'pending')
    return <Badge variant="secondary">Pending</Badge>
  return <Badge variant="outline">Failed</Badge>
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (!verdict)
    return <span className="text-sm text-muted-foreground">—</span>
  if (verdict === 'disinformation')
    return <Badge variant="destructive">⚠ Disinformation</Badge>
  return <Badge variant="success">✓ Authentic</Badge>
}

export function ConfidenceBar({ confidence, verdict }: { confidence: number; verdict: Verdict }) {
  const fill =
    verdict === 'disinformation' ? 'bg-red-500' :
    verdict === 'authentic'      ? 'bg-emerald-500' :
                                   'bg-primary'
  const pct = Math.round(confidence * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-foreground">{pct}%</span>
    </div>
  )
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
