# InsightVault — AI-Powered Personal Knowledge Journal

> A fully client-side PWA built with Next.js, Gemini AI, and IndexedDB.  
> **No backend. No server costs. Your data never leaves your device.**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                         │
│                                                                 │
│  ┌────────────┐   ┌───────────────┐   ┌──────────────────────┐ │
│  │  Next.js   │   │  React Hooks  │   │    Gemini AI (API)   │ │
│  │  App Router│◄──│  useInsights  │──►│  Text generation     │ │
│  │  Tailwind  │   │  useChat      │   │  text-embedding-004  │ │
│  │  Shadcn UI │   │  useApiKey    │   └──────────┬───────────┘ │
│  └────────────┘   └───────┬───────┘              │             │
│                           │                      │ embeddings  │
│  ┌────────────────────────▼──────────────────────▼───────────┐ │
│  │                    Service Layer                          │ │
│  │  services/ai/    tagging.ts  embedding.ts  rag.ts         │ │
│  │  services/storage/   apiKey.ts (AES-GCM encrypted)        │ │
│  └────────────────────────┬──────────────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼──────────────────────────────────┐ │
│  │                   Data Layer (IndexedDB)                  │ │
│  │  Dexie.js wrapper                                         │ │
│  │  ┌──────────┐  ┌─────────────┐  ┌────────────────────┐   │ │
│  │  │ insights │  │chatMessages │  │    appSettings     │   │ │
│  │  │ id       │  │ id          │  │    geminiKeyHash   │   │ │
│  │  │ content  │  │ role        │  │    geminiKeyIv     │   │ │
│  │  │ type     │  │ content     │  └────────────────────┘   │ │
│  │  │ tags[]   │  │ sourceIds[] │                            │ │
│  │  │ embedding│  │ createdAt   │                            │ │
│  │  │ createdAt│  └─────────────┘                            │ │
│  │  └──────────┘                                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                 lib/vector.ts                             │ │
│  │  cosineSimilarity() — topKSearch() — in-memory only       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

```typescript
// Stored in IndexedDB via Dexie.js

Insight {
  id:        string      // crypto.randomUUID()
  content:   string      // the actual note / quote / idea
  type:      InsightType // "quote" | "idea" | "observation" | "book_highlight" | "note"
  tags:      string[]    // AI-generated + manual tags
  embedding: number[]    // 768-dim Gemini embedding for semantic search
  source?:   string      // book title, URL, person name
  createdAt: Date
  updatedAt: Date
}

ChatMessage {
  id:        string
  role:      "user" | "assistant"
  content:   string
  sourceIds: string[]    // insight ids used as RAG context
  createdAt: Date
}

AppSettings {
  id:             1      // singleton
  geminiKeyHash:  string // AES-GCM encrypted Gemini API key
  geminiKeyIv:    string // IV for decryption
  theme:          "dark" | "light"
}
```

---

## Project Structure

```
insight-vault/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout + PWA metadata
│   ├── page.tsx                  # Main dashboard (Insights + Chat)
│   ├── tags/page.tsx             # Tag browser
│   ├── ask/page.tsx              # Dedicated AI chat page
│   ├── settings/page.tsx         # API key + data management
│   └── globals.css               # Tailwind + custom tokens
│
├── components/
│   ├── ui/                       # Primitive components (Shadcn-style)
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   └── toast.tsx
│   ├── layout/
│   │   ├── AppShell.tsx          # Root shell with sidebar
│   │   └── Sidebar.tsx           # Navigation sidebar
│   ├── insights/
│   │   ├── InsightCard.tsx       # Single insight display card
│   │   ├── InsightFeed.tsx       # Searchable list of cards
│   │   └── AddInsightModal.tsx   # Capture form dialog
│   ├── chat/
│   │   └── ChatPanel.tsx         # AI chat with streaming
│   └── settings/
│       └── ApiKeySettings.tsx    # Key input + security info
│
├── db/
│   ├── schema.ts                 # Dexie DB class + TypeScript types
│   └── operations.ts             # CRUD helper functions
│
├── services/
│   ├── ai/
│   │   ├── gemini.ts             # Gemini client factory
│   │   ├── tagging.ts            # AI tag generation
│   │   ├── embedding.ts          # Embedding generation
│   │   └── rag.ts                # RAG pipeline (stream + non-stream)
│   └── storage/
│       └── apiKey.ts             # Encrypted key persistence
│
├── lib/
│   ├── utils.ts                  # cn(), formatDate(), type constants
│   ├── crypto.ts                 # AES-GCM encrypt/decrypt
│   └── vector.ts                 # cosineSimilarity + topKSearch
│
├── hooks/
│   ├── useApiKey.ts              # Key lifecycle hook
│   ├── useInsights.ts            # Insight CRUD + AI enrichment
│   └── useChat.ts                # Chat state + streaming
│
├── public/
│   ├── manifest.json             # PWA Web App Manifest
│   └── icons/                    # App icons (192 + 512)
│
└── scripts/
    └── generate-icons.js         # One-time icon generation script
```

---

## Core Feature Implementation

### 1. AI Tagging Flow

```
User saves insight
       │
       ▼
generateTags(content)         ← services/ai/tagging.ts
       │
       ▼  Gemini prompt:
       │  "Generate 3-5 tags as JSON: {"tags": [...]}"
       │
       ▼
Parse JSON response
       │
       ▼
Store tags[] in IndexedDB     ← db/operations.ts → addInsight()
```

### 2. Embedding Generation Flow

```
User saves insight
       │
       ▼
generateEmbedding(content)    ← services/ai/embedding.ts
       │                         uses text-embedding-004 model
       ▼
768-dim float[] vector
       │
       ▼
Stored in insight.embedding   ← IndexedDB
```

### 3. RAG Question Answering Flow

```
User types question
       │
       ▼
generateEmbedding(question)        ← embed the query
       │
       ▼
getAllInsightsWithEmbeddings()      ← load all from IndexedDB
       │
       ▼
topKSearch(queryEmb, allDocs, 5)   ← cosine similarity ranking
       │
       ▼
Build grounded prompt:
  "You are answering using the user's notes only.
   [Note 1] ... [Note 2] ... [Note 3] ...
   Question: ..."
       │
       ▼
Gemini streaming response          ← streamed token by token
       │
       ▼
Display in ChatPanel               ← useChat hook + streamBuffer state
       │
       ▼
Persist to chatMessages DB         ← with sourceIds for traceability
```

### 4. Vector Search (Cosine Similarity)

```typescript
// lib/vector.ts

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

### 5. API Key Security

```
User enters API key in Settings
       │
       ▼
encryptApiKey(key)            ← lib/crypto.ts
  - generates random 32-byte device key (stored in localStorage)
  - encrypts API key with AES-GCM (12-byte random IV)
  - returns { encrypted: base64, iv: base64 }
       │
       ▼
Save to appSettings (IndexedDB)
       │
       ▼
initGemini(plainKey)          ← in-memory only, never persisted plain

On app restart:
  loadAndInitApiKey()
  → decryptApiKey(hash, iv)   ← retrieves device key from localStorage
  → initGemini(plainKey)
```

---

## Quick Start

```bash
# 1. Install dependencies
cd insight-vault
npm install

# 2. (Optional) Generate PWA icons
npm install --save-dev canvas
node scripts/generate-icons.js

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
#    Go to Settings → enter your Gemini API key
#    Start adding insights!
```

---

## 7-Day Build Plan

| Day | Focus | Tasks |
|-----|-------|-------|
| **Day 1** | Project Scaffold | Init Next.js, Tailwind, Shadcn, Dexie. Set up folder structure. Deploy skeleton to Vercel. |
| **Day 2** | Database Layer | Implement `db/schema.ts`, `db/operations.ts`. Test CRUD in browser DevTools. |
| **Day 3** | AI Services | Implement `gemini.ts`, `tagging.ts`, `embedding.ts`. Test with console logs. Wire up API key settings page. |
| **Day 4** | Vector Search + RAG | Implement `lib/vector.ts` cosine search. Build full RAG pipeline in `rag.ts`. Manual test with 10+ notes. |
| **Day 5** | Core UI | Build `InsightCard`, `InsightFeed`, `AddInsightModal`. Wire up `useInsights` hook. Full add/delete flow working. |
| **Day 6** | Chat Panel + Polish | Build streaming `ChatPanel`. Wire up `useChat`. Add tag browser page. Mobile responsive layout. |
| **Day 7** | PWA + Deploy | Add `manifest.json`, generate icons, configure `next-pwa`. Test install on mobile. Ship to Vercel/Netlify. |

---

## Scaling to Supabase (Post-MVP)

The architecture is designed for zero-friction migration:

```
Current (Local)           →  Future (Supabase)
─────────────────────────────────────────────────────
db/operations.ts          →  Supabase client queries
IndexedDB (Dexie)         →  PostgreSQL + pgvector
lib/vector.ts topKSearch  →  pgvector <=> operator
services/storage/apiKey   →  Supabase Auth + Vault
Local first (offline)     →  Sync on reconnect
```

Since all AI logic is in `services/ai/` and data access is abstracted in `db/operations.ts`, swapping the storage backend requires touching only the DB layer — zero AI or UI changes needed.

---

## PWA Features

| Feature | Implementation |
|---------|---------------|
| Installable | `manifest.json` with icons + `display: standalone` |
| Offline notes | IndexedDB stores all data locally |
| Service Worker | `next-pwa` generates SW with `NetworkFirst` cache |
| App shortcuts | manifest shortcuts for "Add Insight" and "Ask AI" |
| Theme color | `#0d1117` matches the dark UI |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + custom dark tokens |
| UI Primitives | Radix UI + custom Shadcn-style components |
| Local DB | IndexedDB via Dexie.js |
| AI | Google Gemini API (`@google/generative-ai`) |
| Embeddings | Gemini `text-embedding-004` (768 dims) |
| Vector Search | Custom cosine similarity (no external lib) |
| Crypto | Web Crypto API (AES-GCM, built into all browsers) |
| PWA | next-pwa (Workbox-based service worker) |

---

## License

MIT
