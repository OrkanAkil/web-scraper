<p align="center">
  <img src="https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" alt="Docker" />
</p>

# 🚀 ScrapePilot — Web Scraping Studio

A **production-grade web scraping studio** with a full-featured UI, real-time monitoring, job scheduling, and data export. Built for portfolio demonstration and daily use.

## ✨ Key Features

| Feature | Description |
|---|---|
| 🧙 **5-Step Wizard** | Guided scrape configuration: URL → Selectors → Pagination → Options → Preview |
| ⚡ **Dual Engine** | Static (httpx + BS4) and Dynamic (Playwright headless Chrome) scraping |
| 📡 **Live Monitoring** | Real-time WebSocket log streaming during scrape execution |
| 📊 **Data Table** | Dynamic columns, pagination, search, and filter |
| 📤 **Multi-Format Export** | CSV, JSON, and Excel (XLSX) with one click |
| 🔗 **Share Links** | Token-based result sharing with optional TTL expiration |
| 🕐 **Scheduler** | Cron-based automated scraping with Celery Beat |
| 📂 **Projects** | Workspace organization with run history |
| 🔄 **Retry & Backoff** | Automatic exponential retry on failures |
| 🤖 **robots.txt** | Pre-scrape compliance check with user override |
| 🌓 **Dark/Light Mode** | Toggle theme with system preference detection |
| 🐳 **One Command Deploy** | `docker-compose up --build` and you're live |

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│   React + Vite  │────▶│  FastAPI Backend  │────▶│ PostgreSQL  │
│   (Tailwind)    │ WS  │  (REST + WS)     │     │   Database  │
└─────────────────┘     └────────┬─────────┘     └─────────────┘
                                 │
                        ┌────────▼─────────┐     ┌─────────────┐
                        │  Celery Workers  │────▶│    Redis     │
                        │  (Playwright)    │     │  (Broker)    │
                        └──────────────────┘     └─────────────┘
```

## 🚀 Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Launch
```bash
# Clone the repo
git clone https://github.com/yourusername/scrapepilot.git
cd scrapepilot

# Start all services (PostgreSQL, Redis, Backend, Worker, Beat, Frontend)
docker-compose up --build
```

Then open **http://localhost:5173** in your browser.

### Demo Scenario
1. Click **"Quick Scrape"** on the dashboard
2. Select the **"Quotes to Scrape"** template (auto-fills URL + selectors)
3. Walk through the wizard steps, click **"Preview First Page"** on Step 5
4. Hit **"Launch Scraping"** and watch live logs stream in
5. View results in the data table, export as CSV/JSON/Excel
6. Create a **share link** and open it in an incognito window

## 📁 Project Structure

```
scrapepilot/
├── docker-compose.yml          # 6 services orchestration
├── .env                        # Environment variables
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI app + lifespan
│       ├── config.py           # Pydantic settings
│       ├── database.py         # Async SQLAlchemy
│       ├── models/             # 5 SQLAlchemy models
│       ├── schemas/            # 5 Pydantic schema modules
│       ├── api/                # 6 route modules + WebSocket
│       ├── services/           # Scraper engine, robots, export
│       └── worker/             # Celery app + tasks
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── App.jsx             # React Router
        ├── api/client.js       # Axios API client
        ├── hooks/              # WebSocket, theme hooks
        ├── components/layout/  # Sidebar + layout
        ├── pages/              # 7 page components
        └── utils/constants.js  # Shared constants
```

## 🛣️ Routes

| Route | Page | Description |
|---|---|---|
| `/` | Dashboard | Project listing with search and stats |
| `/new` | New Job Wizard | 5-step guided scrape configuration |
| `/projects/:id` | Project Detail | Run history, stats, inline editing |
| `/runs/:id` | Run Detail | Live logs, results, export, share |
| `/share/:token` | Share View | Read-only public result viewer |
| `/schedules` | Schedules | Cron job management |
| `/settings` | Settings | Health check, about, legal disclaimer |

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Python 3.12, FastAPI, Uvicorn |
| Scraping (Static) | httpx, BeautifulSoup4, lxml |
| Scraping (Dynamic) | Playwright (Chromium) |
| Job Queue | Celery + Redis |
| Scheduler | Celery Beat |
| Database | PostgreSQL 16, SQLAlchemy 2.0 (async) |
| Frontend | React 18, Vite, Tailwind CSS 3 |
| Real-time | WebSocket + Redis Pub/Sub |
| Export | CSV, JSON, openpyxl (Excel) |
| Container | Docker Compose |

## 🌐 Deploy Guide

### Render.com
1. Create a **PostgreSQL** and **Redis** instance on Render
2. Create a **Web Service** pointing to the `backend/` directory
3. Set env vars: `DATABASE_URL`, `REDIS_URL`, `CELERY_BROKER_URL`
4. Create a **Static Site** pointing to `frontend/` with build command `npm run build`

### Railway
1. Create a new project, add **PostgreSQL** and **Redis** plugins
2. Deploy backend and frontend as separate services
3. Railway auto-detects Dockerfiles

### Fly.io
1. `fly launch` in both `backend/` and `frontend/` directories
2. Create Fly PostgreSQL: `fly postgres create`
3. Create Fly Redis: `fly redis create`
4. Set secrets: `fly secrets set DATABASE_URL=... REDIS_URL=...`

## ⚖️ Legal & Ethical Disclaimer

> **⚠️ Important:** Web scraping may be subject to legal restrictions. By using ScrapePilot:
>
> - Always respect `robots.txt` directives
> - Comply with target website Terms of Service
> - Do not scrape personal data without consent
> - Use rate limiting to avoid server overload
> - Accept full responsibility for scraping activities
>
> The developers are not responsible for any misuse of this tool.

## 📸 Screenshots

Portfolio screenshot pages:
1. **Dashboard** — Project grid with stats (`/`)
2. **Wizard** — Step-by-step scrape config (`/new`)
3. **Live Logs** — WebSocket log streaming (`/runs/:id` → Logs tab)
4. **Results Table** — Data with search/export (`/runs/:id` → Results tab)
5. **Share Page** — Read-only public view (`/share/:token`)
6. **Dark Mode** — Toggle theme demonstration

## 🐛 Known Limitations

- No user authentication (single-user mode for portfolio)
- Playwright dynamic scraping requires more memory (~500MB per worker)
- Infinite scroll pagination requires `dynamic` render mode
- CSS selector parsing may need adjustment for complex DOM structures
- Share links don't support password protection (token-only)
- Scheduled jobs require Celery Beat container to be running

## 📄 License

MIT License — Feel free to use for portfolio, learning, or production.
