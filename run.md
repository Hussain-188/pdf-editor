# PDF Platform - Setup & Run Guide

Complete instructions for running the PDF platform locally, with Docker, and in production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Docker Compose)](#quick-start-docker-compose)
3. [Manual Local Development Setup](#manual-local-development-setup)
   - [Infrastructure Services](#1-infrastructure-services)
   - [Backend](#2-backend)
   - [Frontend](#3-frontend)
4. [Environment Variables Reference](#environment-variables-reference)
5. [Database](#database)
6. [Object Storage (MinIO)](#object-storage-minio)
7. [API Endpoints](#api-endpoints)
8. [Running Tests](#running-tests)
9. [Production Deployment](#production-deployment)
10. [Troubleshooting](#troubleshooting)
11. [Project Structure](#project-structure)

---

## Prerequisites

### Required

| Tool           | Version  | Verify Command            | Download                                         |
|----------------|----------|---------------------------|--------------------------------------------------|
| Java (JDK)     | 21+      | `java -version`           | Eclipse Temurin: https://adoptium.net/            |
| Node.js        | 20+      | `node -v`                 | https://nodejs.org/                               |
| npm            | 10+      | `npm -v`                  | Bundled with Node.js                              |
| Docker         | 24+      | `docker --version`        | https://docs.docker.com/get-docker/               |
| Docker Compose | 2.20+    | `docker compose version`  | Bundled with Docker Desktop                       |
| Git            | 2.40+    | `git --version`           | https://git-scm.com/                              |

### Optional (for specific features)

| Tool         | Version | Used For                           | Download                                |
|--------------|---------|------------------------------------|-----------------------------------------|
| Tesseract    | 5.x     | OCR on scanned PDFs (Phase 12)     | https://github.com/tesseract-ocr/tesseract |
| Playwright   | latest  | End-to-end tests                   | Installed via npm                       |

### Windows-Specific: JAVA_HOME

The `JAVA_HOME` environment variable must point to the JDK root directory, **not** the `bin/` subfolder.

```bash
# Correct
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.6.7-hotspot"

# Wrong (will cause "bin/bin/java not found")
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.6.7-hotspot/bin"
```

Set this in your terminal session or add it to your shell profile (`~/.bashrc`, `~/.zshrc`, or Windows Environment Variables).

---

## Quick Start (Docker Compose)

The fastest way to run the entire stack. This starts PostgreSQL, Redis, MinIO, the backend, and the frontend all at once.

```bash
# From the project root
docker compose up --build
```

Once all containers are healthy:

| Service          | URL                          |
|------------------|------------------------------|
| Frontend         | http://localhost:3000         |
| Backend API      | http://localhost:8080/api     |
| Health Check     | http://localhost:8080/api/health |
| MinIO Console    | http://localhost:9001         |
| PostgreSQL       | localhost:5432                |
| Redis            | localhost:6379                |

**Default credentials:**

| Service    | Username      | Password      |
|------------|---------------|---------------|
| PostgreSQL | pdfplatform   | devpassword   |
| MinIO      | minioadmin    | minioadmin    |

To stop everything:

```bash
docker compose down          # Stop containers (keeps data)
docker compose down -v       # Stop and delete all data volumes
```

---

## Manual Local Development Setup

Use this approach for faster iteration when actively developing. You run the infrastructure in Docker but the backend and frontend natively.

### 1. Infrastructure Services

Start only the database, cache, and object storage:

```bash
docker compose up postgres redis minio minio-init -d
```

Wait until MinIO init completes (creates the `pdf-platform` bucket). You can verify at http://localhost:9001 (login: `minioadmin` / `minioadmin`).

#### Without Docker (manual setup)

If you prefer not to use Docker for infrastructure:

**PostgreSQL:**
1. Install PostgreSQL 16
2. Create a database and user:
   ```sql
   CREATE USER pdfplatform WITH PASSWORD 'devpassword';
   CREATE DATABASE pdfplatform OWNER pdfplatform;
   ```

**Redis:**
1. Install Redis 7
2. Start with default config (port 6379, no password)

**MinIO:**
1. Download the MinIO binary from https://min.io/download
2. Run: `minio server ./data --console-address ":9001"`
3. Create the bucket:
   ```bash
   mc alias set local http://localhost:9000 minioadmin minioadmin
   mc mb local/pdf-platform
   ```

### 2. Backend

```bash
cd backend

# Set JAVA_HOME (if not already in your profile)
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.6.7-hotspot"

# Build (first time — downloads dependencies, takes ~2-3 minutes)
./mvnw compile

# Run the application
./mvnw spring-boot:run
```

The backend starts on **http://localhost:8080**. Flyway automatically runs database migrations on startup.

Verify it's running:

```bash
curl http://localhost:8080/api/health
# Should return: {"status":"UP"} or similar
```

**Hot reload:** Spring Boot DevTools is included. The backend restarts automatically when `.class` files change. If using an IDE, enable auto-build on save.

### 3. Frontend

```bash
cd frontend

# Install dependencies (first time)
npm install

# Start the dev server
npm run dev
```

The frontend starts on **http://localhost:3000** with hot module replacement (HMR).

The Vite dev server proxies all `/api/*` requests to `http://localhost:8080`, so no CORS issues during development.

**Build for production preview:**

```bash
npm run build          # Outputs to frontend/dist/
npm run preview        # Serves the production build locally on port 4173
```

---

## Environment Variables Reference

### Backend (`application.yml` / env vars)

All variables have dev defaults — you only need to set these for custom setups or production.

| Variable                  | Default (dev)                | Description                        |
|---------------------------|------------------------------|------------------------------------|
| `DB_HOST`                 | `localhost`                  | PostgreSQL host                    |
| `DB_PORT`                 | `5432`                       | PostgreSQL port                    |
| `DB_NAME`                 | `pdfplatform`                | Database name                      |
| `DB_USER`                 | `pdfplatform`                | Database username                  |
| `DB_PASSWORD`             | `devpassword`                | Database password                  |
| `REDIS_HOST`              | `localhost`                  | Redis host                         |
| `REDIS_PORT`              | `6379`                       | Redis port                         |
| `S3_ENDPOINT`             | `http://localhost:9000`      | MinIO/S3 endpoint                  |
| `S3_ACCESS_KEY`           | `minioadmin`                 | S3 access key                      |
| `S3_SECRET_KEY`           | `minioadmin`                 | S3 secret key                      |
| `S3_BUCKET`               | `pdf-platform`               | S3 bucket name                     |
| `S3_REGION`               | `us-east-1`                  | S3 region                          |
| `JWT_SECRET`              | `dev-secret-key-change-...`  | JWT signing key (min 256 bits)     |
| `SPRING_PROFILES_ACTIVE`  | `dev`                        | Spring profile (`dev` or `prod`)   |

### Frontend

| Variable        | Default                    | Description                |
|-----------------|----------------------------|----------------------------|
| `VITE_API_URL`  | (uses Vite proxy in dev)   | Backend API URL (prod)     |

---

## Database

### Migrations

Database schema is managed by **Flyway**. Migrations are in:

```
backend/src/main/resources/db/migration/
└── V1__initial_schema.sql
```

Migrations run automatically on backend startup. The initial migration creates all tables:

- `users` — user accounts with email/password auth
- `refresh_tokens` — JWT refresh token rotation
- `guest_sessions` — anonymous guest sessions (24h TTL)
- `documents` — uploaded PDFs with dual ownership (user OR guest)
- `document_pages` — per-page metadata and analysis data
- `document_versions` — version snapshots (up to 20 per document)
- `document_operations` — edit operation history (undo/redo)
- `user_assets` — user-uploaded assets (signatures, stamps)
- `processing_jobs` — async job tracking
- `email_verifications`, `password_resets` — auth token tables

### Manual Database Access

```bash
# Via Docker
docker compose exec postgres psql -U pdfplatform -d pdfplatform

# Directly
psql -h localhost -U pdfplatform -d pdfplatform
```

### Reset Database

```bash
docker compose down -v    # Deletes the volume
docker compose up postgres -d   # Recreates fresh
# Then restart the backend — Flyway re-runs all migrations
```

---

## Object Storage (MinIO)

MinIO provides S3-compatible storage locally. The `minio-init` container automatically creates the `pdf-platform` bucket on first run.

**MinIO Console:** http://localhost:9001 (minioadmin / minioadmin)

### Storage Key Structure

```
pdf-platform/
├── users/{userId}/documents/{documentId}/
│   ├── original.pdf          # Uploaded file (immutable)
│   ├── current.pdf           # Latest edited version
│   ├── versions/v001.pdf     # Version snapshots
│   ├── thumbnails/cover.png  # Page thumbnail
│   ├── analysis/             # Text analysis JSON
│   └── exports/              # Exported files
├── guests/{sessionId}/documents/{documentId}/
│   └── (same structure)
└── temp/processing/{jobId}/
    └── (temporary processing files)
```

---

## API Endpoints

### Authentication

| Method | Path                | Auth   | Description                      |
|--------|---------------------|--------|----------------------------------|
| POST   | `/api/auth/register`| None   | Create new user account          |
| POST   | `/api/auth/login`   | None   | Login, returns JWT tokens        |
| POST   | `/api/auth/refresh` | None   | Refresh access token             |
| POST   | `/api/auth/logout`  | JWT    | Revoke refresh token             |
| GET    | `/api/auth/me`      | JWT    | Get current user profile         |

### Guest Sessions

| Method | Path                | Auth   | Description                      |
|--------|---------------------|--------|----------------------------------|
| POST   | `/api/guest/session`| None   | Create anonymous guest session   |
| POST   | `/api/guest/convert`| None   | Convert guest session to user    |

### Documents

| Method | Path                              | Auth       | Description                     |
|--------|-----------------------------------|------------|---------------------------------|
| POST   | `/api/documents/upload`           | JWT/Guest  | Upload PDF                      |
| GET    | `/api/documents`                  | JWT/Guest  | List documents (paginated)      |
| GET    | `/api/documents/{id}`             | JWT        | Get document details            |
| PATCH  | `/api/documents/{id}`             | JWT        | Rename document                 |
| DELETE | `/api/documents/{id}`             | JWT        | Soft-delete document            |
| GET    | `/api/documents/{id}/url`         | JWT        | Get pre-signed download URL     |

### PDF Analysis & Editing

| Method | Path                                        | Description                  |
|--------|---------------------------------------------|------------------------------|
| POST   | `/api/documents/{id}/analyze`               | Analyze all pages            |
| GET    | `/api/documents/{id}/pages/{p}/analysis`    | Get page analysis            |
| POST   | `/api/documents/{id}/edit`                  | Apply text edit              |
| POST   | `/api/documents/{id}/undo`                  | Undo last operation          |
| POST   | `/api/documents/{id}/redo`                  | Redo undone operation        |

### Page Management

| Method | Path                                         | Description                  |
|--------|----------------------------------------------|------------------------------|
| POST   | `/api/documents/{id}/pages/{p}/rotate`       | Rotate page (body: `{degrees}`) |
| DELETE | `/api/documents/{id}/pages/{p}`              | Delete page                  |
| POST   | `/api/documents/{id}/pages/{p}/duplicate`    | Duplicate page               |
| POST   | `/api/documents/{id}/pages/insert-blank`     | Insert blank page            |
| POST   | `/api/documents/{id}/pages/reorder`          | Reorder pages (body: `{order}`) |

### OCR

| Method | Path                                   | Description                     |
|--------|----------------------------------------|---------------------------------|
| POST   | `/api/documents/{id}/ocr/{p}`          | OCR a single page               |
| POST   | `/api/documents/{id}/ocr`              | OCR all scanned pages           |

### Versioning

| Method | Path                                            | Description              |
|--------|-------------------------------------------------|--------------------------|
| GET    | `/api/documents/{id}/versions`                  | List version history     |
| POST   | `/api/documents/{id}/versions`                  | Create manual snapshot   |
| POST   | `/api/documents/{id}/versions/{vid}/restore`    | Restore a version        |
| POST   | `/api/documents/{id}/autosave`                  | Trigger auto-save        |

### Export

| Method | Path                                   | Description                      |
|--------|----------------------------------------|----------------------------------|
| POST   | `/api/documents/{id}/export`           | Export as PDF (with page range)  |
| POST   | `/api/documents/{id}/export/images`    | Export pages as images (PNG/JPG) |

### PDF Tools (standalone, no account required)

All tool endpoints accept `multipart/form-data` with a `file` field and return the processed PDF as a download.

| Method | Path                     | Parameters                                    |
|--------|--------------------------|-----------------------------------------------|
| POST   | `/api/tools/compress`    | `quality` (0.0-1.0, default 0.5)             |
| POST   | `/api/tools/watermark`   | `text`, `opacity`, `rotation`, `fontSize`     |
| POST   | `/api/tools/protect`     | `password`, `ownerPassword`, `allowPrint`, `allowCopy` |
| POST   | `/api/tools/unlock`      | `password`                                    |
| POST   | `/api/tools/page-numbers`| `position`, `startFrom`, `fontSize`           |

---

## Running Tests

### Backend Unit Tests

```bash
cd backend
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.6.7-hotspot"

# Run all unit tests (does NOT require running services)
./mvnw test

# Run specific test class
./mvnw test -Dtest="PdfValidationServiceTest"

# Run tests matching a pattern
./mvnw test -Dtest="com.pdfplatform.tools.**"
```

Test files:

| Test                          | What It Tests                                     |
|-------------------------------|---------------------------------------------------|
| `PdfValidationServiceTest`    | File validation (magic bytes, size limits, parsing)|
| `PageManagementServiceTest`   | Page rotate, delete, insert, reorder (mocked S3)  |
| `CompressServiceTest`         | PDF compression produces valid output              |
| `WatermarkServiceTest`        | Watermark text applied to all pages                |

### Frontend Type Check

```bash
cd frontend
npx tsc --noEmit
```

### Frontend E2E Tests (Playwright)

```bash
cd frontend

# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests (requires frontend + backend running)
npx playwright test

# Run with visible browser
npx playwright test --headed

# View test report
npx playwright show-report
```

E2E tests cover:
- Landing page renders upload area
- Navigation to login/register
- Invalid login shows error
- Unauthenticated dashboard redirects to login
- Tools page displays all tools and opens workflows

### Full CI Test Suite (what GitHub Actions runs)

```bash
# Backend
cd backend && ./mvnw verify -B

# Frontend
cd frontend && npx tsc --noEmit && npm run build
```

---

## Production Deployment

### Docker Production Build

```bash
# Build production images
docker build -t pdf-platform-backend ./backend
docker build -t pdf-platform-frontend ./frontend
```

The backend image includes Tesseract OCR. The frontend image uses nginx with gzip compression, asset caching, and SPA fallback routing.

### Required Production Environment Variables

Set these on your hosting platform (Railway, Fly.io, AWS, etc.):

```env
# Backend
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL=jdbc:postgresql://host:5432/dbname
DB_USER=produser
DB_PASSWORD=strong-password-here
REDIS_HOST=redis-host
REDIS_PORT=6379
REDIS_PASSWORD=redis-password
S3_ENDPOINT=https://your-s3-endpoint.com
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=pdf-platform
S3_REGION=us-east-1
JWT_SECRET=generate-a-random-64-char-string-here-use-openssl-rand

# Frontend (build-time)
VITE_API_URL=https://your-api-domain.com
```

Generate a secure JWT secret:

```bash
openssl rand -base64 48
```

### Recommended Production Stack

| Component      | Service                  | Estimated Cost |
|----------------|--------------------------|----------------|
| Backend        | Railway / Fly.io         | $5-15/mo       |
| Frontend       | Vercel / Cloudflare Pages| Free           |
| PostgreSQL     | Railway / Supabase       | $0-7/mo        |
| Redis          | Upstash                  | Free (10k/day) |
| Object Storage | Cloudflare R2            | Free (10GB)    |
| **Total**      |                          | **$5-25/mo**   |

### CI/CD (GitHub Actions)

The pipeline (`.github/workflows/ci.yml`) runs on push to `main` and on pull requests:

1. **Backend tests** — builds with Maven, runs unit tests against a PostgreSQL service container
2. **Frontend checks** — installs deps, runs TypeScript type check, builds production bundle
3. **Docker build** — builds both images (only on merge to `main`)

---

## Troubleshooting

### Backend won't start: "relation does not exist"

Flyway migrations haven't run. Check that PostgreSQL is running and accessible:

```bash
# Test connection
psql -h localhost -U pdfplatform -d pdfplatform -c "SELECT 1"

# If database doesn't exist
createdb -h localhost -U pdfplatform pdfplatform
```

### Backend: "bin/bin/java not found"

`JAVA_HOME` includes the `/bin` directory. Remove it:

```bash
# Check current value
echo $JAVA_HOME

# Fix — should NOT end with /bin
export JAVA_HOME="C:/Program Files/Eclipse Adoptium/jdk-21.0.6.7-hotspot"
```

### MinIO: "bucket does not exist"

The `minio-init` container may not have finished. Create the bucket manually:

```bash
# Using MinIO client
docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker compose exec minio mc mb local/pdf-platform --ignore-existing

# Or via MinIO Console at http://localhost:9001
```

### Frontend: blank page or API errors

Check that the Vite proxy is working. The dev server should proxy `/api/*` to `localhost:8080`:

```bash
# Verify backend is reachable
curl http://localhost:8080/api/health

# Check Vite output for proxy errors
npm run dev
# Look for lines like: [vite] http proxy error
```

### Upload fails: "File exceeds maximum size"

Default limits:
- Guest users: 50 MB per file, max 3 documents
- Authenticated users: 200 MB per file

These are configured in `application.yml` under `app.guest.max-file-size-mb` and `app.upload.max-file-size-mb`.

### OCR not working

Tesseract must be installed and on the system PATH:

```bash
# Check installation
tesseract --version

# Windows: Install from https://github.com/UB-Mannheim/tesseract/wiki
# macOS: brew install tesseract
# Linux: apt install tesseract-ocr tesseract-ocr-eng
# Docker: Already included in the backend Dockerfile
```

### Port conflicts

Default ports used:

| Port  | Service               |
|-------|-----------------------|
| 3000  | Frontend (Vite dev)   |
| 8080  | Backend (Spring Boot) |
| 5432  | PostgreSQL            |
| 6379  | Redis                 |
| 9000  | MinIO (S3 API)        |
| 9001  | MinIO (Console)       |

To change a port, set the corresponding environment variable before starting the service.

### Docker Compose: "port already allocated"

Another process is using the port. Find and stop it:

```bash
# Find what's using port 5432 (example)
netstat -ano | findstr :5432    # Windows
lsof -i :5432                   # macOS/Linux

# Or change the port mapping in docker-compose.yml
# e.g., "5433:5432" to expose on 5433 instead
```

### Tests fail: "No bean of type ... found"

Unit tests that need Spring context will fail without a running database. The pure unit tests (`PdfValidationServiceTest`, `CompressServiceTest`, etc.) do not need Spring and should always work. If `PdfPlatformApplicationTests` fails, ensure PostgreSQL is running.

---

## Project Structure

```
pdf-editor/
├── backend/                              # Java 21 + Spring Boot 3.3
│   ├── src/main/java/com/pdfplatform/
│   │   ├── auth/                         # Authentication (JWT, refresh tokens)
│   │   │   ├── controller/AuthController.java
│   │   │   ├── dto/                      # LoginRequest, RegisterRequest, AuthResponse
│   │   │   ├── filter/JwtAuthenticationFilter.java
│   │   │   └── service/                  # AuthService, TokenService
│   │   ├── config/                       # App config, security, filters
│   │   │   ├── AppProperties.java        # Typed config (storage, jwt, guest, upload)
│   │   │   ├── SecurityConfig.java       # Spring Security filter chain
│   │   │   ├── RateLimitFilter.java      # 120 req/min general, 10/min auth per IP
│   │   │   ├── SecurityHeadersFilter.java # CSP, X-Frame-Options, etc.
│   │   │   └── GlobalExceptionHandler.java
│   │   ├── document/                     # Core document domain
│   │   │   ├── controller/DocumentController.java  # All doc/page/version/OCR/export endpoints
│   │   │   ├── dto/                      # DocumentResponse, EditRequest, PageAnalysisResponse
│   │   │   ├── entity/                   # Document, DocumentVersion, DocumentOperation
│   │   │   ├── repository/               # Spring Data JPA repositories
│   │   │   └── service/
│   │   │       ├── DocumentService.java       # Upload, list, search, delete
│   │   │       ├── DocumentEditService.java   # Text editing via content stream engine
│   │   │       ├── PageManagementService.java # Rotate, delete, duplicate, reorder
│   │   │       ├── TextAnalysisService.java   # PDF text block extraction
│   │   │       ├── ThumbnailService.java      # Page thumbnail generation
│   │   │       ├── PdfValidationService.java  # Upload validation
│   │   │       ├── OperationService.java      # Edit operations + undo/redo
│   │   │       ├── VersionService.java        # Snapshots, auto-save, restore
│   │   │       ├── ExportService.java         # PDF/image export
│   │   │       └── OcrService.java            # Tesseract OCR integration
│   │   ├── engine/                       # Custom PDF content stream engine
│   │   │   ├── model/TextBlock.java, TextRun.java
│   │   │   ├── parser/ContentStreamParser.java
│   │   │   ├── extractor/TextBlockExtractor.java
│   │   │   └── editor/ContentStreamEditor.java, ContentStreamWriter.java
│   │   ├── guest/                        # Guest session management
│   │   │   ├── controller/GuestController.java
│   │   │   ├── entity/GuestSession.java
│   │   │   └── service/GuestSessionService.java, GuestConversionService.java
│   │   ├── storage/StorageService.java   # S3-compatible storage (MinIO/R2)
│   │   ├── tools/                        # Standalone PDF tools
│   │   │   ├── controller/ToolsController.java
│   │   │   └── service/                  # Compress, Watermark, Protect, PageNumber
│   │   └── user/                         # User entity and repositories
│   ├── src/main/resources/
│   │   ├── application.yml               # Dev + prod config profiles
│   │   ├── application-prod.yml          # Production overrides
│   │   └── db/migration/V1__initial_schema.sql
│   ├── src/test/java/com/pdfplatform/   # Unit tests
│   ├── Dockerfile                        # Multi-stage production build
│   └── pom.xml
│
├── frontend/                             # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/                   # Editor UI components
│   │   │   │   ├── PageRenderer.tsx      # PDF.js canvas rendering + text layer
│   │   │   │   ├── Toolbar.tsx           # Zoom, page nav, undo/redo
│   │   │   │   ├── AnnotationToolbar.tsx # Annotation tool selection
│   │   │   │   ├── AnnotationLayer.tsx   # SVG annotation drawing
│   │   │   │   ├── TextBlockOverlay.tsx  # Editable text block hit targets
│   │   │   │   ├── InlineTextEditor.tsx  # In-place text editing
│   │   │   │   ├── PropertiesPanel.tsx   # Font size, color, editability
│   │   │   │   ├── PagePanel.tsx         # Page sidebar (drag-reorder, context menu)
│   │   │   │   ├── OcrOverlay.tsx        # OCR word bounding boxes
│   │   │   │   ├── VersionHistoryPanel.tsx
│   │   │   │   └── ExportDialog.tsx
│   │   │   ├── DocumentCard.tsx          # Dashboard document card
│   │   │   ├── UploadDropzone.tsx        # Drag-and-drop PDF upload
│   │   │   └── ProtectedRoute.tsx        # Auth route guard
│   │   ├── hooks/
│   │   │   ├── useViewport.ts            # Zoom state (0.25x-4x)
│   │   │   └── useCoordinateTransform.ts # PDF ↔ screen coordinate mapping
│   │   ├── lib/
│   │   │   ├── api.ts                    # Axios instance with JWT interceptors
│   │   │   └── pdfWorker.ts              # PDF.js web worker setup
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx           # Upload CTA
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx         # Document grid with search
│   │   │   ├── EditorPage.tsx            # Full PDF editor
│   │   │   └── ToolsPage.tsx             # Standalone tools grid
│   │   ├── stores/                       # Zustand state stores
│   │   │   ├── authStore.ts              # Login, register, token management
│   │   │   ├── guestStore.ts             # Guest session management
│   │   │   ├── editorStore.ts            # Document analysis, block selection
│   │   │   ├── annotationStore.ts        # Annotation state
│   │   │   └── ocrStore.ts               # OCR results
│   │   ├── App.tsx                       # Routes with lazy loading
│   │   └── main.tsx                      # Entry point
│   ├── e2e/landing.spec.ts              # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── Dockerfile                        # Production build (nginx)
│   ├── Dockerfile.dev                    # Development build (Vite)
│   ├── nginx.conf                        # Production nginx config
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── .github/workflows/ci.yml             # GitHub Actions CI/CD pipeline
├── docker-compose.yml                    # Full dev stack orchestration
└── run.md                                # This file
```
