# Arhitectura sistemului

**Agentic Disinformation Detection Pipeline** — detectarea dezinformării în conținut TikTok cu ajutorul agenților AI.

## Diagrama componentelor

```mermaid
flowchart LR
    subgraph Client
        UI["Frontend<br/>React + Vite + TanStack Router<br/>(port 5173 · Vercel)"]
    end

    subgraph Server
        API["Backend API<br/>Node.js + Express<br/>(port 3003 · Railway)"]
        Q["Job Queue<br/>(analysis_jobs)"]
        DB[("SQLite / Supabase<br/>DatabaseManager (Singleton)")]
    end

    subgraph Worker["Worker (port 3002)"]
        AG1["Agent 1: Scraper<br/>LangGraph + gpt-4o"]
        PW["Playwright Tools<br/>(navigate, scrape_comments, ...)"]
        AG2["Agent 2: Classifier<br/>(in lucru: second-agent-work)"]
    end

    BR["TikTok<br/>(browser session)"]

    UI -->|"POST /api/search, /api/analyze"| API
    UI -->|"GET /api/scrapes, /api/jobs"| API
    API --> Q
    API <--> DB
    API -->|"POST /scrape"| AG1
    AG1 --> PW
    PW <--> BR
    AG1 --> AG2
    AG2 -->|"verdict + confidence"| API
```

## Responsabilitatea fiecărui serviciu

| Serviciu | Tehnologie | Rol |
|----------|-----------|-----|
| **frontend** | React + Vite + TanStack Router | UI: input de query, lista de joburi, verdictul per video |
| **backend** | Express | API REST, coada de joburi, persistența în DB |
| **worker** | Express + Playwright + LangGraph | Rulează agenții AI care navighează TikTok și clasifică conținutul |
| **DB** | better-sqlite3 (local) → Supabase | `scrape_runs`, `analysis_jobs` |

## De ce e worker-ul separat de backend

Runtime-ul de browser (Playwright) e greu și instabil. Separându-l într-un
serviciu propriu, poate fi scalat, restartat și deployat independent, fără să
afecteze API-ul principal.

## Fluxul de date (high level)

1. Utilizatorul trimite un query / URL de TikTok din frontend.
2. Backend pune un job în coadă (`analysis_jobs`) și/sau cheamă worker-ul.
3. **Agent 1 (scraper)** găsește videoclipuri și extrage comentarii + URL-ul MP4.
4. **Agent 2 (classifier)** analizează conținutul și emite un verdict
   (dezinformare / autentic) cu un scor de încredere.
5. Rezultatul e persistat și afișat în frontend.
