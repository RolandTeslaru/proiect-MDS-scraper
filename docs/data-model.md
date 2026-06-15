# Modelul de date

Persistența folosește `better-sqlite3` în dev (fișier local) și se mută pe
**Supabase** în producție. Schema e definită în `backend/src/db/schema.ts`.

## Diagrama ER

```mermaid
erDiagram
    scrape_runs ||--o{ scraped_videos : "are"
    scraped_videos ||--o{ scraped_comments : "are"

    scrape_runs {
        TEXT id PK
        TEXT query
        TEXT created_at
        INTEGER video_count
    }
    scraped_videos {
        TEXT id PK
        TEXT scrape_run_id FK
        TEXT source_url
        INTEGER position
        TEXT created_at
    }
    scraped_comments {
        TEXT id PK
        TEXT video_id FK
        TEXT author
        TEXT text
        TEXT likes
        INTEGER position
    }
    analysis_jobs {
        TEXT id PK
        TEXT source_url
        TEXT status
        TEXT created_at
    }
```

`scraped_videos` și `scraped_comments` au `ON DELETE CASCADE` — ștergerea unui
run șterge automat videoclipurile și comentariile asociate.

## Diagrama de clase (acces la date)

```mermaid
classDiagram
    class DatabaseManager {
        -static instance: DatabaseManager
        +connection: Database
        +databasePath: string
        -constructor(targetPath)
        +static getInstance() DatabaseManager
    }
    class ScrapeRepository {
        +saveScrapeResult(query, data)
        +listScrapeRuns(limit)
        +getScrapeRunById(id)
    }
    class JobsRepository {
        +createAnalysisJob(url)
        +listJobs()
        +getJobById(id)
    }

    DatabaseManager <.. ScrapeRepository : foloseste connection
    DatabaseManager <.. JobsRepository : foloseste connection
```
