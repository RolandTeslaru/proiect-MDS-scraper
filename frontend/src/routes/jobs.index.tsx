import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/jobs/')({
  component: JobsList,
})

function JobsList() {
  return (
    <section>
      <h1>Jobs</h1>
    </section>
  )
}
