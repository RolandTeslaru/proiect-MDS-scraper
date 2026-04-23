import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: ScrapePage,
})

function ScrapePage() {
  return (
    <section>
      <h1>TikTok Scraper</h1>
    </section>
  )
}
