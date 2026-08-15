# Code Together

Real-time collaborative code editor with a VS Code–style UI, multi-file workspaces, GitHub repo import, and code execution via a Redis-backed worker.

**Live demo:** [https://express-server-production-7bee.up.railway.app](https://express-server-production-7bee.up.railway.app)

## Features

- **IDE chrome** — activity bar, file explorer, tabs, terminal/output/input panel, status bar
- **Live collaboration** — room-based editing with presence and invite links
- **Multi-file workspace** — create/open files, search, local source-control checkpoints
- **GitHub import** — pull a public `owner/repo` into the workspace (optional PAT/OAuth for private repos)
- **Run code** — JavaScript, Python, C++, Java, Rust, Go via Redis queue + worker

## Architecture

```
Browser (Vite React / served UI)
  ├─ WebSocket :5000  → rooms, sync, output
  └─ HTTP POST :3000/submit
         ↓
      Redis list "problems"
         ↓
      Worker (run languages)
         ↓
      Redis PUBLISH roomId → WebSocket → terminal panel
```

## Monorepo layout

| App | Role | Default port |
|-----|------|----------------|
| `apps/frontend` | React + Monaco IDE | `5173` |
| `apps/express-server` | Submit API + GitHub import (+ production UI) | `3000` |
| `apps/websocket-server` | Rooms & live sync | `5000` |
| `apps/worker` | Compile / run jobs | — |
| Redis (`docker-compose`) | Queue + pub/sub | `6379` |

## Local setup

### Prerequisites

- Node.js 18+
- Docker Desktop (for Redis; also for Docker-based execution if `USE_DOCKER=true`)

### 1. Start Redis

```bash
docker compose up -d
# or: docker start redis-cache
```

### 2. Install dependencies

From each app (recommended on Windows if workspace symlinks fail):

```bash
cd apps/frontend && npm install --no-workspaces
cd ../express-server && npm install --no-workspaces
cd ../websocket-server && npm install --no-workspaces
cd ../worker && npm install --no-workspaces
```

### 3. Run all services (4 terminals)

```bash
cd apps/frontend && npm run dev
cd apps/express-server && npm run dev
cd apps/websocket-server && npm run dev
cd apps/worker && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) → enter a name → create or join a room.

### Optional env

Copy `apps/express-server/.env.example` → `.env` for:

- `REDIS_URL` (defaults to local Redis)
- `GITHUB_TOKEN` / OAuth client keys (private repos & Connect GitHub)
- `FRONTEND_URL` (OAuth callback)

Frontend production build uses:

- `VITE_API_URL`
- `VITE_WS_URL`

See `apps/frontend/.env.production`.

## Production (Railway)

| Service | URL |
|---------|-----|
| App (UI + API) | https://express-server-production-7bee.up.railway.app |
| WebSocket | `wss://websocket-server-production-4884.up.railway.app` |

Worker and Redis run privately on the same Railway project.
