# PDF Platform - Setup & Run Guide

---

## Prerequisites

| Tool       | Version | Verify Command   | Download                              |
|------------|---------|------------------|---------------------------------------|
| Java (JDK) | 21+    | `java -version`  | Oracle: https://www.oracle.com/java/  |
| Node.js    | 20+    | `node -v`        | https://nodejs.org/                   |
| npm        | 10+    | `npm -v`         | Bundled with Node.js                  |
| MySQL      | 8.0+   | `mysql --version`| https://dev.mysql.com/downloads/      |
| Git        | 2.40+  | `git --version`  | https://git-scm.com/                  |

### Optional

| Tool       | Version | Used For                  |
|------------|---------|---------------------------|
| Tesseract  | 5.x    | OCR on scanned PDFs       |

### Windows Notes

- **Use Git Bash** to run backend commands (`./mvnw`). There is no `mvnw.cmd` wrapper, so CMD/PowerShell won't work for Maven commands.
- `JAVA_HOME` must point to the JDK root, **not** the `bin/` subfolder:

```bash
# Correct
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.12.1"

# Wrong (causes "bin/bin/java not found")
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.12.1/bin"
```

---

## Quick Start

### 1. Start MySQL

Make sure MySQL is running on port **3306** (default) with the following database:

```sql
CREATE DATABASE IF NOT EXISTS pdfplatform;
```

Default connection settings (configured in `application.yml`):

| Setting  | Value       |
|----------|-------------|
| Host     | localhost   |
| Port     | 3306        |
| Database | pdfplatform |
| Username | root        |
| Password | root        |

To use different credentials, set environment variables before starting the backend:

```bash
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=pdfplatform
export DB_USER=root
export DB_PASSWORD=root
```

### 2. Start Backend

```bash
cd backend

# Set JAVA_HOME if not already in your profile
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.12.1"

# First time: compiles and downloads dependencies (~2-3 minutes)
./mvnw spring-boot:run
```

The backend starts on **http://localhost:8080**. Flyway runs database migrations automatically on startup.

Verify:

```bash
curl http://localhost:8080/api/health
# {"status":"ok","version":"0.1.0",...}
```

### 3. Start Frontend

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

The frontend starts on **http://localhost:3000** with hot module replacement. The Vite dev server proxies `/api/*` requests to `http://localhost:8080`.

---

## Architecture

This app runs **without Docker, Redis, or MinIO**:

- **Database**: MySQL 8.0+ on port 3306
- **File storage**: Local filesystem at `./storage` (relative to backend working directory)
- **No Redis**: No caching layer required
- **No MinIO/S3**: Files stored directly on disk

### Storage Layout

```
backend/storage/
├── users/{userId}/documents/{documentId}/
│   ├── original.pdf          # Uploaded file (immutable)
│   ├── current.pdf           # Latest edited version
│   ├── versions/v001.pdf     # Version snapshots
│   └── thumbnails/cover.png  # Page thumbnail
└── guests/{sessionId}/documents/{documentId}/
    └── (same structure)
```

---

## Environment Variables

All have dev defaults — only set these for custom setups or production.

| Variable                 | Default                                                       | Description             |
|--------------------------|---------------------------------------------------------------|-------------------------|
| `DB_HOST`                | `localhost`                                                   | MySQL host              |
| `DB_PORT`                | `3306`                                                        | MySQL port              |
| `DB_NAME`                | `pdfplatform`                                                 | Database name           |
| `DB_USER`                | `root`                                                        | Database username       |
| `DB_PASSWORD`            | `root`                                                        | Database password       |
| `STORAGE_PATH`           | `./storage`                                                   | Local file storage path |
| `JWT_SECRET`             | `dev-secret-key-change-in-production-must-be-at-least-256-bits-long` | JWT signing key  |
| `SPRING_PROFILES_ACTIVE` | `dev`                                                         | Spring profile          |

---

## Database

### Migrations

Managed by **Flyway** in `backend/src/main/resources/db/migration/`:

- `V1__initial_schema.sql` — All tables (users, documents, operations, versions, etc.)
- `V2__fix_ip_address_column_type.sql` — No-op for MySQL

Migrations run automatically on backend startup.

### Reset Database

```sql
DROP DATABASE pdfplatform;
CREATE DATABASE pdfplatform;
```

Then restart the backend — Flyway re-runs all migrations.

---

## API Endpoints

### Authentication

| Method | Path                 | Auth | Description                |
|--------|----------------------|------|----------------------------|
| POST   | `/api/auth/register` | None | Create user account        |
| POST   | `/api/auth/login`    | None | Login, returns JWT tokens  |
| POST   | `/api/auth/refresh`  | None | Refresh access token       |
| POST   | `/api/auth/logout`   | JWT  | Revoke refresh token       |
| GET    | `/api/auth/me`       | JWT  | Get current user profile   |

### Guest Sessions

| Method | Path                 | Auth | Description                |
|--------|----------------------|------|----------------------------|
| POST   | `/api/guest/session` | None | Create anonymous session   |
| POST   | `/api/guest/convert` | None | Convert guest to user      |

### Documents

| Method | Path                           | Auth      | Description              |
|--------|--------------------------------|-----------|--------------------------|
| POST   | `/api/documents/upload`        | JWT/Guest | Upload PDF               |
| GET    | `/api/documents`               | JWT/Guest | List documents           |
| GET    | `/api/documents/{id}`          | JWT       | Get document details     |
| PATCH  | `/api/documents/{id}`          | JWT       | Rename document          |
| DELETE | `/api/documents/{id}`          | JWT       | Soft-delete document     |
| GET    | `/api/documents/{id}/url`      | JWT       | Get download URL         |

### PDF Analysis & Editing

| Method | Path                                     | Description            |
|--------|------------------------------------------|------------------------|
| POST   | `/api/documents/{id}/analyze`            | Analyze all pages      |
| GET    | `/api/documents/{id}/pages/{p}/analysis` | Get page analysis      |
| POST   | `/api/documents/{id}/edit`               | Apply text edit        |
| POST   | `/api/documents/{id}/undo`               | Undo last operation    |
| POST   | `/api/documents/{id}/redo`               | Redo undone operation  |

### Page Management

| Method | Path                                      | Description     |
|--------|-------------------------------------------|-----------------|
| POST   | `/api/documents/{id}/pages/{p}/rotate`    | Rotate page     |
| DELETE | `/api/documents/{id}/pages/{p}`           | Delete page     |
| POST   | `/api/documents/{id}/pages/{p}/duplicate` | Duplicate page  |
| POST   | `/api/documents/{id}/pages/insert-blank`  | Insert blank    |
| POST   | `/api/documents/{id}/pages/reorder`       | Reorder pages   |

### OCR

| Method | Path                          | Description        |
|--------|-------------------------------|--------------------|
| POST   | `/api/documents/{id}/ocr/{p}` | OCR single page   |
| POST   | `/api/documents/{id}/ocr`     | OCR all pages     |

### Versioning

| Method | Path                                         | Description         |
|--------|----------------------------------------------|---------------------|
| GET    | `/api/documents/{id}/versions`               | List versions       |
| POST   | `/api/documents/{id}/versions`               | Create snapshot     |
| POST   | `/api/documents/{id}/versions/{vid}/restore` | Restore version     |
| POST   | `/api/documents/{id}/autosave`               | Trigger auto-save   |

### Export

| Method | Path                                | Description           |
|--------|-------------------------------------|-----------------------|
| POST   | `/api/documents/{id}/export`        | Export as PDF         |
| POST   | `/api/documents/{id}/export/images` | Export as images      |

### Standalone PDF Tools (no account required)

| Method | Path                      | Parameters                                     |
|--------|---------------------------|-------------------------------------------------|
| POST   | `/api/tools/compress`     | `quality` (0.0-1.0, default 0.5)              |
| POST   | `/api/tools/watermark`    | `text`, `opacity`, `rotation`, `fontSize`      |
| POST   | `/api/tools/protect`      | `password`, `ownerPassword`, `allowPrint`, `allowCopy` |
| POST   | `/api/tools/unlock`       | `password`                                     |
| POST   | `/api/tools/page-numbers` | `position`, `startFrom`, `fontSize`            |

---

## Running Tests

### Backend

```bash
cd backend
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.12.1"

./mvnw test                                  # All tests
./mvnw test -Dtest="PdfValidationServiceTest" # Specific class
```

### Frontend

```bash
cd frontend
npx tsc --noEmit          # Type check
npm run build             # Production build
```

### E2E (Playwright)

```bash
cd frontend
npx playwright install    # First time only
npx playwright test       # Requires frontend + backend running
npx playwright test --headed  # With visible browser
```

---

## Production

### Build

```bash
# Backend
cd backend && ./mvnw package -DskipTests

# Frontend
cd frontend && npm run build   # Outputs to frontend/dist/
```

### Required Production Environment Variables

```env
SPRING_PROFILES_ACTIVE=prod
DB_HOST=your-mysql-host
DB_PORT=3306
DB_NAME=pdfplatform
DB_USER=produser
DB_PASSWORD=strong-password
STORAGE_PATH=/var/data/pdf-storage
JWT_SECRET=generate-a-random-64-char-string
```

Generate a secure JWT secret:

```bash
openssl rand -base64 48
```

---

## Troubleshooting

### "bin/bin/java not found"

`JAVA_HOME` includes `/bin`. Fix:

```bash
export JAVA_HOME="C:/Program Files/Java/jdk-21.0.12.1"
```

### Backend won't connect to MySQL

Check MySQL is running on port 3306:

```bash
mysql -u root -proot -h localhost -P 3306 -e "SELECT 1"
```

### Frontend blank page / API errors

Check backend is reachable:

```bash
curl http://localhost:8080/api/health
```

### Upload fails: "File exceeds maximum size"

Default limits: guest 50 MB, authenticated 200 MB. Configured in `application.yml`.

### Port conflicts

| Port | Service               |
|------|-----------------------|
| 3000 | Frontend (Vite dev)   |
| 8080 | Backend (Spring Boot) |
| 3306 | MySQL                 |

---

## Project Structure

```
pdf-editor/
├── backend/                              # Java 21 + Spring Boot 3.3
│   ├── src/main/java/com/pdfplatform/
│   │   ├── auth/                         # JWT authentication
│   │   ├── config/                       # Security, rate limiting, CORS
│   │   ├── document/                     # Core document domain
│   │   │   ├── controller/               # REST endpoints
│   │   │   ├── dto/                      # Request/response DTOs
│   │   │   ├── entity/                   # JPA entities
│   │   │   ├── repository/               # Spring Data repositories
│   │   │   └── service/                  # Business logic
│   │   ├── engine/                       # PDF content stream engine
│   │   │   ├── model/                    # TextBlock, TextRun
│   │   │   ├── parser/                   # ContentStreamParser
│   │   │   ├── extractor/                # TextBlockExtractor
│   │   │   └── editor/                   # ContentStreamEditor, Writer
│   │   ├── guest/                        # Guest session management
│   │   ├── storage/                      # Local filesystem storage
│   │   ├── tools/                        # Standalone PDF tools
│   │   └── user/                         # User entity
│   ├── src/main/resources/
│   │   ├── application.yml               # Dev config (MySQL, local storage)
│   │   ├── application-prod.yml          # Production overrides
│   │   └── db/migration/                 # Flyway SQL migrations
│   └── pom.xml
│
├── frontend/                             # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── components/editor/            # PDF editor UI
│   │   ├── hooks/                        # useViewport, useCoordinateTransform
│   │   ├── lib/                          # API client, PDF.js worker
│   │   ├── pages/                        # Landing, Login, Dashboard, Editor, Tools
│   │   └── stores/                       # Zustand state (auth, editor, annotations)
│   ├── vite.config.ts                    # Dev server + API proxy
│   └── package.json
│
├── docker-compose.yml                    # Optional: full Docker stack
└── run.md                                # This file
```
