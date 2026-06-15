# Design Patterns folosite

Acest document descrie pattern-urile de proiectare aplicate în cod, cu referințe
la fișierele unde apar.

## 1. Singleton — `DatabaseManager`

**Unde:** `backend/src/db/client.ts`

Conexiunea la baza de date trebuie să fie unică pe tot procesul: deschiderea mai
multor conexiuni SQLite ar duce la lock-uri și la reinițializări inutile ale
schemei. `DatabaseManager` are un constructor `private` și expune `getInstance()`,
care întoarce mereu aceeași instanță. Suplimentar, instanța e cache-uită pe
`globalThis` ca să supraviețuiască hot-reload-ului în dev.

```ts
export class DatabaseManager {
  private static instance: DatabaseManager | undefined;
  private constructor(targetPath: string) { /* ... */ }
  static getInstance() {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance =
        globalThis.__backendDbSingleton__ ?? new DatabaseManager(databasePath);
      globalThis.__backendDbSingleton__ = DatabaseManager.instance;
    }
    return DatabaseManager.instance;
  }
}
```

## 2. Tool / Strategy — tool-urile agentului

**Unde:** `worker/src/agent/tools.ts`

Fiecare acțiune de browser e încapsulată ca un `tool` independent, cu schemă
`zod` proprie. Agentul LLM alege la runtime care tool ("strategie") să execute,
fără ca graful să cunoască implementarea concretă. Adăugarea unui tool nou
înseamnă doar extinderea listei `allTools` — restul codului rămâne neschimbat
(Open/Closed Principle).

## 3. Repository — accesul la date

**Unde:** `backend/src/db/scrapes.ts`, `backend/src/db/jobs.ts`

Logica de business nu scrie SQL direct; folosește funcții-repository
(`saveScrapeResult`, `listScrapeRuns`, `createAnalysisJob`, ...) care ascund
detaliile de persistență. Asta permite migrarea SQLite → Supabase fără să
modificăm restul aplicației.

## 4. State Machine (graf) — orchestrarea agentului

**Unde:** `worker/src/agent/graph.ts`

Agentul e modelat ca un `StateGraph` LangGraph cu nodurile `agent` și `tools` și
tranziții condiționate (`shouldContinue`). Bucla `agent → tools → agent` continuă
până la răspunsul final — un pattern clasic de mașină de stări.

## (Planificat) 5. Chain of Responsibility — pipeline-ul cu doi agenți

Agentul de scraping (Agent 1) pasează rezultatul către agentul de clasificare
(Agent 2, în lucru pe `second-agent-work`), fiecare cu o responsabilitate clară
în lanțul de procesare.
