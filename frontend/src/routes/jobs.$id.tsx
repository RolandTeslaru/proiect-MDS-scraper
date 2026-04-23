import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/jobs/$id')({
  component: JobDetail,
})

function JobDetail() {
  const { id } = Route.useParams()
  return (
    <section>
      <h1>Job {id}</h1>
    </section>
  )
}
