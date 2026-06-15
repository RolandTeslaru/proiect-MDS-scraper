# Raport: folosirea instrumentelor AI în dezvoltare

**Proiect:** Agentic Disinformation Detection Pipeline
**Echipă:** Roland Teslaru, Marius Frățilă, Nechita Spânu

---

## 1. Instrumente folosite

Întreaga echipă a folosit un singur instrument AI pe parcursul dezvoltării:

- **Claude Code** (CLI-ul oficial Anthropic) — asistent AI rulat din terminal,
  folosit ca suport pentru scrierea de cod și pentru învățarea tehnologiilor noi
  întâlnite în proiect.

> Notă: pe lângă instrumentul de dezvoltare, proiectul folosește un model AI și
> *în interiorul produsului* — agentul de scraping rulează pe **gpt-4o** prin
> LangChain/LangGraph. Acela face parte din arhitectură (vezi
> [`architecture.md`](./architecture.md)), nu din procesul de dezvoltare descris aici.

---

## 2. Pentru ce am folosit Claude Code

### 2.1 Scrierea de boilerplate
O parte semnificativă din munca repetitivă a fost accelerată cu ajutorul AI-ului,
pe care apoi am adaptat-o și integrat-o noi:
- structura de bază a serverelor Express (backend și worker) și definirea rutelor;
- definițiile de tool-uri Playwright pentru agent (schema `zod`, structura
  funcțiilor), pe care le-am completat cu logica de scraping;
- componente de UI și tipurile TypeScript partajate între servicii;
- schema SQL și funcțiile de acces la baza de date.

### 2.2 Învățarea de tehnologii noi
Proiectul ne-a pus în fața mai multor tehnologii cu care nu lucraserăm înainte.
Am folosit Claude Code ca să le înțelegem mai repede:
- **LangGraph / LangChain** — cum se construiește un agent ca mașină de stări
  (`StateGraph`), bucla `agent → tools → agent`, legarea tool-urilor de LLM;
- **Playwright** — selectoare, așteptarea elementelor dinamice, automatizarea
  navigării și a scroll-ului pe pagini care încarcă conținut lazy;
- **TanStack Router** — rutare type-safe în frontend;
- **better-sqlite3** și pattern-ul de conexiune unică la baza de date.

### 2.3 Explicații și depanare
Am cerut explicații punctuale despre erori, despre concepte (de ex. cum
funcționează un agent cu tool-uri, diferența dintre cele două servicii) și
sugestii de rezolvare atunci când ne blocam.

---

## 3. Impact

**Ce a mers bine:**
- A scurtat timpul petrecut pe cod repetitiv (boilerplate), lăsându-ne să ne
  concentrăm pe logica specifică proiectului (scraping, clasificare).
- A funcționat ca un material de învățare „la cerere" pentru tehnologiile noi,
  mai rapid decât căutarea prin documentație.

**Ce a trebuit verificat / corectat manual:**
- Codul generat nu era întotdeauna corect din prima — selectoarele Playwright
  pentru TikTok au trebuit ajustate manual, fiindcă pagina reală diferea de ce
  presupunea AI-ul.
- Sugestiile trebuiau confruntate cu documentația oficială; uneori se bazau pe
  ipoteze care nu se potriveau cu versiunile bibliotecilor folosite de noi.

---

## 4. Verificarea output-ului

Nu am preluat orbește codul generat. Tot ce a sugerat AI-ul a fost citit,
înțeles, adaptat la proiect și testat înainte de a fi integrat. Deciziile de
arhitectură și implementarea finală au rămas munca echipei.

---

## 5. Concluzie

Claude Code a fost util mai ales ca **accelerator pentru boilerplate** și ca
**ajutor în învățarea tehnologiilor noi** (LangGraph, Playwright, TanStack
Router). Beneficiul principal a fost reducerea timpului pierdut pe cod repetitiv
și pe documentare, fără a înlocui înțelegerea noastră asupra codului — pe care a
trebuit oricum să o avem ca să adaptăm și să corectăm ce genera.
