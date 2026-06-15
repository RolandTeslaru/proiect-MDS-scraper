# Workflow — Agentul de scraping

Agentul de scraping este construit cu **LangGraph** (`worker/src/agent/graph.ts`)
și folosește modelul **gpt-4o** prin LangChain. Are acces la un set de tool-uri
Playwright (`worker/src/agent/tools.ts`) care controlează un singur tab de browser.

## Graful agentului (LangGraph state machine)

```mermaid
stateDiagram-v2
    [*] --> agent
    agent --> tools: are tool_calls
    agent --> [*]: raspuns final (JSON)
    tools --> agent: rezultatul tool-ului
```

Bucla `agent → tools → agent` se repetă până când LLM-ul nu mai cere tool-uri și
returnează JSON-ul final cu videoclipuri + comentarii.

## Secvența unui scrape

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant BE as Backend
    participant WK as Worker (/scrape)
    participant AG as Agent (LangGraph + gpt-4o)
    participant PW as Playwright Tools
    participant TT as TikTok

    FE->>BE: POST /api/search { query }
    BE->>WK: POST /scrape { query }
    WK->>AG: runScrapeAgent(query)

    AG->>PW: get_tiktok_video_links(query)
    PW->>TT: search + scroll
    TT-->>PW: URL-uri video
    PW-->>AG: primele 5 URL-uri

    loop pentru fiecare din cele 5 videoclipuri
        AG->>PW: navigate_to(url)
        PW->>TT: deschide pagina video
        AG->>PW: scrape_comments(maxComments=15)
        PW->>TT: scroll + citeste comentarii
        TT-->>PW: comentarii
        PW-->>AG: comentarii (JSON)
    end

    AG-->>WK: { videos: [...] }
    WK-->>BE: rezultat scrape
    BE->>BE: normalizeSearchResult + saveScrapeResult
    BE-->>FE: { videos, runId, savedAt }
```

## Tool-urile disponibile agentului

| Tool | Descriere |
|------|-----------|
| `get_tiktok_video_links` | Caută pe TikTok și întoarce URL-uri unice de video |
| `navigate_to` | Navighează browserul la un URL |
| `scrape_comments` | Extrage comentariile de pe pagina curentă |
| `extract_video_url` | Extrage URL-ul direct MP4 al videoclipului |
| `get_page_text` / `get_element_text` | Citește text din pagină |
| `extract_links` | Extrage linkuri dintr-un selector CSS |
| `scroll_page` / `wait_for_element` / `click_element` | Acțiuni de navigare |

> **Constrângere cheie:** toate tool-urile partajează **un singur tab**, deci
> agentul nu apelează niciodată `navigate_to` în paralel — întâi navighează,
> apoi citește comentariile, apoi trece la următorul video.
