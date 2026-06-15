# Specificația cerințelor software (SRS)

**Proiect:** Agentic Disinformation Detection Pipeline
**Versiune:** 1.0
**Echipă:** Roland Teslaru, Marius Frățilă, Nechita Spânu

---

## 1. Introducere

### 1.1 Scop
Acest document descrie cerințele funcționale și non-funcționale ale aplicației
**Agentic Disinformation Detection Pipeline** — un sistem care analizează conținut
de pe TikTok și clasifică videoclipurile drept *dezinformare* sau *conținut
autentic*, folosind agenți AI.

### 1.2 Scopul produsului
Dezinformarea pe platformele video scurte (TikTok) se răspândește rapid și e greu
de moderat manual. Sistemul automatizează procesul: pornind de la un query sau un
URL de videoclip, agenți AI navighează TikTok, extrag conținutul relevant
(videoclip + comentarii) și emit un verdict cu un scor de încredere.

### 1.3 Definiții și abrevieri
| Termen | Semnificație |
|--------|--------------|
| **Agent** | Componentă AI autonomă care planifică și execută acțiuni prin tool-uri |
| **Scraper (Agent 1)** | Agentul care navighează TikTok și extrage date |
| **Classifier (Agent 2)** | Agentul care analizează conținutul și emite verdictul |
| **Tool** | Acțiune de browser expusă agentului (navigate, scrape_comments, etc.) |
| **Pipeline** | Lanțul de procesare scraper → classifier |
| **Job** | O cerere de analiză înregistrată în coadă (`analysis_jobs`) |
| **LLM** | Large Language Model (gpt-4o) |
| **SRS** | Software Requirements Specification |

---

## 2. Descriere generală

### 2.1 Context
Sistemul este compus din trei servicii independente:
- **frontend** — interfața utilizatorului (React + Vite)
- **backend** — API REST + coada de joburi + persistență (Express)
- **worker** — runtime-ul de browser și agenții AI (Express + Playwright + LangGraph)

Worker-ul e separat de backend pentru ca runtime-ul de browser (greu și instabil)
să poată fi scalat și restartat independent. Pentru diagrama completă a
componentelor vezi [`architecture.md`](./architecture.md).

### 2.2 Utilizatori
- **Utilizator final** — introduce un query/URL și consultă verdictele.

### 2.3 Constrângeri
- TikTok aplică rate limiting și încărcare dinamică a conținutului → navigarea se
  face cu scroll-uri și așteptări randomizate, printr-o sesiune de browser
  persistată (`tiktok_session`).
- Agenții partajează **un singur tab de browser** → tool-urile nu se apelează în
  paralel.
- Clasificarea depinde de capabilitățile modelului LLM folosit (gpt-4o).

---

## 3. Cerințe funcționale

| ID | Cerință |
|----|---------|
| **CF-1** | Utilizatorul poate trimite un query text pentru a căuta videoclipuri pe TikTok. |
| **CF-2** | Sistemul caută pe TikTok și extrage URL-urile primelor videoclipuri relevante. |
| **CF-3** | Pentru fiecare videoclip, sistemul extrage comentariile (autor, text, like-uri). |
| **CF-4** | Utilizatorul poate trimite un URL de videoclip pentru analiză (`POST /api/analyze`), care creează un job în coadă. |
| **CF-5** | Sistemul clasifică conținutul ca *dezinformare* / *autentic*, cu un scor de încredere și motive. |
| **CF-6** | Rezultatele scrape-urilor sunt persistate și pot fi listate (`GET /api/scrapes`) și consultate individual (`GET /api/scrapes/:id`). |
| **CF-7** | Joburile de analiză au un status urmăribil (pending → processing → done/failed). |
| **CF-8** | Frontend-ul afișează lista de joburi și verdictul detaliat per videoclip. |

---

## 4. Cerințe non-funcționale

| ID | Cerință |
|----|---------|
| **CNF-1 (Scalabilitate)** | Worker-ul de browser e un serviciu separat, deployabil și scalabil independent de API. |
| **CNF-2 (Reziliență)** | Erorile agentului nu trebuie să blocheze API-ul; joburile eșuate sunt marcate `failed`. |
| **CNF-3 (Persistență)** | Datele sunt stocate într-o bază relațională (SQLite în dev, Supabase în producție) printr-un strat de repository. |
| **CNF-4 (Mentenabilitate)** | Cod TypeScript, tool-uri modulare, pattern-uri documentate (vezi [`design-patterns.md`](./design-patterns.md)). |
| **CNF-5 (Anti-detecție)** | Navigarea imită comportament uman (scroll + delay randomizat) și refolosește o sesiune de browser. |

---

## 5. Descrierea pipeline-ului

Sistemul folosește **doi agenți AI** înlănțuiți. Diagramele detaliate sunt în
[`workflow-agent.md`](./workflow-agent.md).

### 5.1 Agent 1 — Scraper
Construit cu **LangGraph** și modelul **gpt-4o**, are acces la tool-uri Playwright.
Pașii:
1. Caută pe TikTok după query (`get_tiktok_video_links`) și alege primele videoclipuri.
2. Pentru fiecare videoclip: navighează (`navigate_to`) și extrage comentariile
   (`scrape_comments`), eventual URL-ul MP4 (`extract_video_url`).
3. Returnează un JSON structurat cu videoclipuri + comentarii.

Agentul rulează o buclă `agent → tools → agent` până produce răspunsul final.

### 5.2 Agent 2 — Classifier
Primește output-ul Agentului 1 și analizează conținutul (text comentarii și/sau
videoclipul) pentru a emite:
- **verdict** — dezinformare / autentic
- **confidence** — scor de încredere
- **reasons / evidence** — justificarea verdictului

Rezultatul se persistă în `analysis_jobs`.

### 5.3 Fluxul end-to-end
```
Utilizator → Frontend → Backend (coadă/job)
   → Worker: Agent 1 (scraper) → Agent 2 (classifier)
   → verdict persistat → afișat în Frontend
```

---

## 6. Interfețe externe (API)

| Metodă | Endpoint | Descriere |
|--------|----------|-----------|
| `GET`  | `/api/health` | Stare backend |
| `POST` | `/api/search` | Caută și extrage videoclipuri pentru un query |
| `POST` | `/api/analyze` | Adaugă un URL în coada de analiză |
| `GET`  | `/api/scrapes` | Listează run-urile de scraping |
| `GET`  | `/api/scrapes/:id` | Detaliile unui run |

Modelul de date complet (tabele și relații) este descris în
[`data-model.md`](./data-model.md).
