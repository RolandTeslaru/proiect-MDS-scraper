import { createFileRoute, Link } from '@tanstack/react-router'
import { Card } from '../components/ui/foundations/card'
import { Button } from '../components/ui/foundations/button'
import { Badge } from '../components/ui/foundations/Badge'
import { ConfidenceBar, formatTime } from '../components/badges'
import { jobsService } from '../utils/api'

export const Route = createFileRoute('/jobs/$id')({
  loader: ({ params }) => jobsService.getById(params.id),
  errorComponent: JobDetailError,
  component: JobDetail,
})

function JobDetailError() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <h2 className="text-lg font-semibold text-foreground">Job not found</h2>
      <p className="text-sm text-muted-foreground">This job does not exist or the backend is unavailable.</p>
      <Button asChild variant="outline" size="sm">
        <Link to="/jobs">← Back to All Jobs</Link>
      </Button>
    </div>
  )
}

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

      {/* Scraped comments */}
      <Card.Root className="mb-4">
        <Card.Header className="flex flex-row items-center justify-between border-b border-border pb-3">
          <Card.Title className="text-sm">Scraped Comments</Card.Title>
          <span className="text-xs text-muted-foreground">{job.comments.length}</span>
        </Card.Header>
        <Card.Content className="pt-3">
          {job.comments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No comments were scraped for this video.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {job.comments.map(comment => (
                <li key={comment.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                    {comment.author.replace(/^@/, '').charAt(0) || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-semibold text-foreground">{comment.author}</span>
                      {comment.likes && (
                        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <HeartIcon /> {comment.likes}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 break-words text-sm text-foreground">{comment.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card.Content>
      </Card.Root>

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

function HeartIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
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
