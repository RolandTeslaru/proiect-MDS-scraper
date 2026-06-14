import { createFileRoute, Link } from '@tanstack/react-router'
import { Card } from '../components/ui/foundations/card'
import { Button } from '../components/ui/foundations/button'
import { Badge } from '../components/ui/foundations/Badge'
import { ConfidenceBar, formatTime } from '../components/badges'
import { jobsService } from '../utils/api'

export const Route = createFileRoute('/jobs/$id')({
  loader: ({ params }) => jobsService.getById(params.id),
  component: JobDetail,
})

function JobDetail() {
  const job = Route.useLoaderData()

  const isDisinfo  = job.verdict === 'disinformation'
  const isAuth     = job.verdict === 'authentic'
  const isPending  = !job.verdict

  return (
    <div className="mx-auto max-w-3xl">
      {/* Back + breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/jobs">← All Jobs</Link>
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-mono text-xs text-muted-foreground">{job.id}</span>
      </div>

      {/* Page title */}
      <div className="mb-6">
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground">Analysis Detail</h1>
        <p className="max-w-full truncate font-mono text-xs text-muted-foreground">{job.sourceUrl}</p>
      </div>

      {/* Verdict hero */}
      <div
        className={[
          'mb-6 flex items-center gap-5 rounded-xl border p-6',
          isDisinfo ? 'border-red-500/20 bg-red-500/5'      : '',
          isAuth    ? 'border-emerald-500/20 bg-emerald-500/5' : '',
          isPending ? 'border-border bg-muted/30'            : '',
        ].join(' ')}
      >
        <div
          className={[
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl',
            isDisinfo ? 'bg-red-500/15'      : '',
            isAuth    ? 'bg-emerald-500/15'  : '',
            isPending ? 'bg-muted'           : '',
          ].join(' ')}
        >
          {isDisinfo ? '⚠' : isAuth ? '✓' : '⏳'}
        </div>
        <div>
          <div
            className={[
              'text-xl font-bold',
              isDisinfo ? 'text-red-600 dark:text-red-400'         : '',
              isAuth    ? 'text-emerald-600 dark:text-emerald-400' : '',
              isPending ? 'text-muted-foreground'                  : '',
            ].join(' ')}
          >
            {isDisinfo ? 'Disinformation' : isAuth ? 'Authentic News' : job.status === 'processing' ? 'Analyzing…' : 'Pending'}
          </div>
          <div className="mt-1 text-sm text-muted-foreground">
            {isDisinfo && 'This video was classified as disinformation by Vertex AI.'}
            {isAuth    && 'This video was classified as authentic news by Vertex AI.'}
            {isPending && job.status === 'processing' && 'The agent is currently analyzing this video.'}
            {isPending && job.status === 'pending'    && 'This job is waiting in the queue.'}
            {isPending && job.status === 'failed'     && 'Processing failed. The video could not be analyzed.'}
          </div>
        </div>
        {job.confidence !== null && (
          <div className="ml-auto text-right">
            <div className="mb-1 text-xs text-muted-foreground">Confidence</div>
            <ConfidenceBar confidence={job.confidence} verdict={job.verdict} />
          </div>
        )}
      </div>

      {/* Details grid */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        {/* Evidence */}
        {job.evidence && (
          <Card.Root className="col-span-2">
            <Card.Header className="border-b border-border pb-3">
              <Card.Title className="text-sm">Evidence</Card.Title>
            </Card.Header>
            <Card.Content className="pt-3">
              <blockquote className="rounded-lg border-l-4 border-border bg-muted/40 py-3 pl-4 pr-3 font-sans text-sm italic text-muted-foreground">
                {job.evidence}
              </blockquote>
            </Card.Content>
          </Card.Root>
        )}

        {/* Reasons */}
        {job.reasons && job.reasons.length > 0 && (
          <Card.Root>
            <Card.Header className="border-b border-border pb-3">
              <Card.Title className="text-sm">Classification Signals</Card.Title>
            </Card.Header>
            <Card.Content className="pt-3">
              <ul className="flex flex-col gap-2">
                {job.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </Card.Content>
          </Card.Root>
        )}

        {/* Timeline */}
        <Card.Root>
          <Card.Header className="border-b border-border pb-3">
            <Card.Title className="text-sm">Timeline</Card.Title>
          </Card.Header>
          <Card.Content className="pt-3">
            <ol className="flex flex-col gap-4">
              <TimelineStep
                label="Submitted"
                time={formatTime(job.createdAt)}
                done
              />
              <TimelineStep
                label="Processing"
                time={job.status === 'processing' ? 'In progress…' : job.processedAt ? 'Started' : '—'}
                done={job.status !== 'pending'}
              />
              <TimelineStep
                label="Classified"
                time={job.processedAt ? formatTime(job.processedAt) : '—'}
                done={job.status === 'done'}
              />
            </ol>
          </Card.Content>
        </Card.Root>
      </div>

      {/* Metadata strip */}
      <Card.Root>
        <Card.Content className="flex flex-wrap gap-6 py-3">
          <Meta label="Job ID"    value={job.id} mono />
          <Meta label="Status">
            <Badge
              variant={
                job.status === 'done'       ? 'success'     :
                job.status === 'failed'     ? 'outline'     :
                job.status === 'pending'    ? 'secondary'   :
                                              'secondary'
              }
            >
              {job.status}
            </Badge>
          </Meta>
          <Meta label="Submitted" value={formatTime(job.createdAt)} />
          {job.processedAt && <Meta label="Processed" value={formatTime(job.processedAt)} />}
        </Card.Content>
      </Card.Root>
    </div>
  )
}

function TimelineStep({ label, time, done }: { label: string; time: string; done: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <div
        className={[
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs',
          done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        ].join(' ')}
      >
        {done ? '✓' : '○'}
      </div>
      <div>
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{time}</div>
      </div>
    </li>
  )
}

function Meta({
  label, value, mono, children,
}: {
  label: string
  value?: string
  mono?: boolean
  children?: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-0.5 text-xs text-muted-foreground">{label}</div>
      {children ?? (
        <span className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>{value}</span>
      )}
    </div>
  )
}
