# PDF Platform — Technical Reference

## How to Run

```bash
# Backend (port 8080) — requires MySQL on port 3307, database "pdfplatform", user root/root
cd backend
JAVA_HOME="C:\Program Files\Eclipse Adoptium\jdk-21.0.6.7-hotspot" ./mvnw spring-boot:run

# Frontend (port 3000) — proxies /api to localhost:8080
cd frontend
npm run dev
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Java 21, Spring Boot 3.3.2, Apache PDFBox 3.0.3 |
| Auth | JJWT 0.12.6 (JWT access + refresh tokens) |
| Database | MySQL 5.7 (port 3307), Flyway migrations, Spring Data JPA |
| Test DB | H2 in-memory (`@ActiveProfiles("test")`) |
| Frontend | React 18, TypeScript 5.5, Vite 5.4 |
| PDF Render | pdfjs-dist 6.2.108 |
| State | Zustand 4.5 (4 stores) |
| Styling | TailwindCSS 3.4 |
| HTTP | Axios (with JWT interceptor) |
| Icons | lucide-react |

---

## Backend Structure

```
com.pdfplatform/
├── PdfPlatformApplication.java          — Entry point (@EnableAsync)
├── auth/
│   ├── controller/AuthController.java   — /api/auth/* endpoints
│   ├── dto/                             — AuthResponse, LoginRequest, RefreshRequest, RegisterRequest
│   ├── filter/JwtAuthenticationFilter.java
│   └── service/AuthService.java, TokenService.java
├── config/
│   ├── AppProperties.java               — @ConfigurationProperties for app.* settings
│   ├── GlobalExceptionHandler.java       — @ControllerAdvice
│   ├── RateLimitFilter.java             — In-memory sliding window (120/min, 10/min auth)
│   ├── SecurityConfig.java              — Spring Security config (permitAll for most paths)
│   └── SecurityHeadersFilter.java       — CSP, X-Frame-Options, etc.
├── document/
│   ├── controller/DocumentController.java — /api/documents/* endpoints (30+ endpoints)
│   ├── dto/
│   │   ├── DocumentResponse.java        — Response record
│   │   ├── EditRequest.java             — record(pageNumber, textBlockId, operation, oldText, newText, fontSize, color)
│   │   └── PageAnalysisResponse.java    — Text blocks with bounding boxes
│   ├── entity/
│   │   ├── Document.java                — UUID PK, FK to User/GuestSession, storage keys, metadata
│   │   ├── DocumentOperation.java       — Edit operation log (sequence, type, params JSON, inverse JSON, isUndone)
│   │   └── DocumentVersion.java         — Version snapshots (storage key, file size, label)
│   ├── repository/                      — DocumentRepository, DocumentOperationRepository, DocumentVersionRepository
│   └── service/
│       ├── DocumentService.java         — Upload, list, search, rename, delete, download URL
│       ├── DocumentEditService.java     — Apply edits using the engine package
│       ├── ExportService.java           — Export PDF (page range), export images (PNG/JPG/ZIP)
│       ├── OcrService.java              — Tesseract via ProcessBuilder, scanned page detection
│       ├── OperationService.java        — Execute + record operations, undo, redo
│       ├── PageManagementService.java   — Rotate, delete, duplicate, insert, reorder, split, merge
│       ├── PdfValidationService.java    — Magic byte, size, page count, encryption checks
│       ├── TextAnalysisService.java     — Orchestrates parser + extractor for page analysis
│       ├── ThumbnailService.java        — PDFBox render page 1 at 72 DPI → PNG
│       └── VersionService.java          — Snapshots, restore, autosave, prune (keeps 20)
├── engine/                              — Low-level PDF content stream processing
│   ├── editor/
│   │   ├── ContentStreamEditor.java     — replaceText, changeFontSize, changeTextColor
│   │   └── ContentStreamWriter.java     — Serialize tokens → PDF content stream bytes
│   ├── extractor/TextBlockExtractor.java — Group TextRuns → TextBlocks by spatial proximity
│   ├── model/
│   │   ├── TextBlock.java               — Grouped text with bounding box, EditabilityInfo
│   │   └── TextRun.java                 — Single text op: text, x, y, width, font, color, operatorIndex
│   └── parser/ContentStreamParser.java  — Parse page content stream → TextRun list
├── guest/
│   ├── controller/GuestController.java  — /api/guest/* endpoints
│   ├── entity/GuestSession.java         — UUID PK, token, ip, expires, document count
│   ├── repository/GuestSessionRepository.java
│   └── service/GuestSessionService.java, GuestConversionService.java
├── health/HealthController.java         — GET /api/health
├── storage/
│   ├── StorageController.java           — GET /api/storage/files/{base64key}
│   └── StorageService.java              — Local filesystem CRUD, base64 URL generation
├── tools/
│   ├── controller/ToolsController.java  — /api/tools/* (stateless, no auth)
│   └── service/CompressService, PageNumberService, ProtectService, WatermarkService
└── user/
    ├── entity/User.java, RefreshToken.java
    └── repository/UserRepository.java, RefreshTokenRepository.java
```

---

## Frontend Structure

```
frontend/src/
├── main.tsx                             — App entry, QueryClient setup
├── App.tsx                              — React Router routes
├── lib/
│   ├── api.ts                           — Axios instance, JWT/guest token interceptor, 401 refresh
│   ├── pdfWorker.ts                     — pdfjs-dist worker config
│   └── fontMapper.ts                    — PDF font name → CSS font-family
├── hooks/
│   ├── useViewport.ts                   — Zoom scale (0.25x–4.0x)
│   └── useCoordinateTransform.ts        — PDF coords ↔ screen pixels
├── stores/
│   ├── authStore.ts                     — login, register, logout, fetchUser (localStorage tokens)
│   ├── guestStore.ts                    — guest session create/validate (localStorage token)
│   ├── editorStore.ts                   — document analysis, text block selection, undo/redo
│   ├── annotationStore.ts              — Backend-synced annotations (optimistic UI + REST CRUD)
│   └── ocrStore.ts                      — OCR results per page
├── pages/
│   ├── LandingPage.tsx                  — Marketing hero page
│   ├── LoginPage.tsx                    — Login form
│   ├── RegisterPage.tsx                 — Register form + guest conversion
│   ├── DashboardPage.tsx                — Document list, search, upload, tools grid
│   ├── EditorPage.tsx                   — Main editor orchestrator (loads PDF, renders pages)
│   └── ToolsPage.tsx                    — 5 standalone PDF tools
└── components/
    ├── ProtectedRoute.tsx               — Auth guard (redirects to /login)
    ├── UploadDropzone.tsx               — Drag-and-drop upload with progress
    ├── DocumentCard.tsx                 — Document thumbnail card (rename/delete)
    └── editor/
        ├── Toolbar.tsx                  — Top bar: mode switch, zoom, undo/redo, save, export
        ├── AnnotationToolbar.tsx        — Annotation tools: select, textbox, highlight, draw, shape, sticky
        ├── PagePanel.tsx                — Left sidebar: thumbnails, drag reorder, context menu
        ├── PageRenderer.tsx             — Canvas PDF rendering + text layer + overlays
        ├── TextBlockOverlay.tsx         — Clickable text block regions for editing
        ├── InlineTextEditor.tsx         — contentEditable inline text editor
        ├── PropertiesPanel.tsx          — Right sidebar: font size, color, editability
        ├── AnnotationLayer.tsx          — SVG annotation rendering + drawing
        ├── OcrOverlay.tsx               — OCR word bounding boxes
        ├── ExportDialog.tsx             — Export modal (PDF/PNG/JPG, page range, DPI)
        └── VersionHistoryPanel.tsx      — Version list, create, restore
```

---

## Routes

| Path | Component | Auth Required |
|------|-----------|--------------|
| `/` | LandingPage | No |
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/editor/:id` | EditorPage | No (guest token OK) |
| `/tools` | ToolsPage | No |

---

## API Endpoints

### Auth (`/api/auth`)
| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/register` | `{name, email, password}` | `{accessToken, refreshToken, user}` |
| POST | `/login` | `{email, password}` | `{accessToken, refreshToken, user}` |
| POST | `/refresh` | `{refreshToken}` | `{accessToken, refreshToken}` |
| POST | `/logout` | `{refreshToken}` | 204 |
| GET | `/me` | Bearer token | `{id, email, displayName, role}` |

### Guest (`/api/guest`)
| Method | Path | Returns |
|--------|------|---------|
| POST | `/session` | `{sessionToken, maxDocuments, expiresAt}` |
| GET | `/session/validate?guestToken=X` | `{valid, expiresAt}` |
| POST | `/convert` (auth required) | converts guest docs to user |

### Documents (`/api/documents`) — all accept `?guestToken=X` or Bearer token
| Method | Path | Body/Params | Returns |
|--------|------|-------------|---------|
| POST | `/upload` | FormData: file | DocumentResponse |
| GET | `/` | `?page=0&size=20&search=X` | DocumentResponse[] (or Page for users) |
| GET | `/{id}` | | DocumentResponse |
| PATCH | `/{id}` | `{title}` | DocumentResponse |
| DELETE | `/{id}` | | 204 |
| GET | `/{id}/url` | | `{url}` |
| POST | `/{id}/analyze` | | PageAnalysisResponse[] |
| GET | `/{id}/pages/{n}/analysis` | | PageAnalysisResponse |
| POST | `/{id}/edit` | EditRequest (see below) | DocumentResponse |
| POST | `/{id}/undo` | | DocumentResponse |
| POST | `/{id}/redo` | | DocumentResponse |
| POST | `/{id}/pages/{n}/rotate` | `{degrees: 90}` | DocumentResponse |
| DELETE | `/{id}/pages/{n}` | | DocumentResponse |
| POST | `/{id}/pages/{n}/duplicate` | | DocumentResponse |
| POST | `/{id}/pages/insert-blank` | `{afterPage: N}` | DocumentResponse |
| POST | `/{id}/pages/reorder` | `{order: [2,1,3]}` | DocumentResponse |
| GET | `/{id}/versions` | | `[{id, versionNumber, label, fileSizeBytes, createdAt}]` |
| POST | `/{id}/versions` | `{label: "..."}` | `{id, versionNumber}` |
| POST | `/{id}/versions/{vid}/restore` | | DocumentResponse |
| POST | `/{id}/export` | `{format, pageRange: [1,2], flattenAnnotations}` | `{url}` |
| POST | `/{id}/export/images` | `{format: "png", dpi: 150, pages: [1,2]}` | `{url}` |
| POST | `/{id}/autosave` | | `{status: "saved"}` |
| POST | `/{id}/ocr/{n}` | | OcrResult |
| POST | `/{id}/ocr` | | OcrResult[] |

### EditRequest format
```json
{
  "pageNumber": 1,
  "textBlockId": "block-1",
  "operation": "TEXT_REPLACE",     // or FONT_SIZE_CHANGE, TEXT_COLOR_CHANGE
  "oldText": "old",
  "newText": "new",
  "fontSize": 14.0,
  "color": [1.0, 0.0, 0.0]
}
```

### Annotations (`/api/documents/{id}/annotations`) — guestToken or Bearer
| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/` | | `[{id, pageNumber, type, x, y, width, height, text, color, strokeWidth, points, shapeType, createdAt}]` |
| POST | `/` | `{pageNumber, type, x, y, width, height, text?, color, strokeWidth, points?, shapeType?}` | annotation object |
| PUT | `/{annotationId}` | `{x, y, width, height, text?, color, strokeWidth, points?}` | annotation object |
| DELETE | `/{annotationId}` | | 204 |

Annotation types: `textbox`, `highlight`, `freehand`, `shape`, `sticky`

### Tools (`/api/tools`) — no auth, FormData in, PDF bytes out
| Method | Path | FormData fields |
|--------|------|----------------|
| POST | `/compress` | file, quality (0.0-1.0) |
| POST | `/watermark` | file, text, fontSize, opacity, rotation |
| POST | `/protect` | file, password, allowPrinting, allowCopying |
| POST | `/unlock` | file, password |
| POST | `/page-numbers` | file, position, startNumber, fontSize |

### Storage
| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/storage/files/{base64key}` | File bytes (PDF, PNG, etc.) |

### Health
| Method | Path | Returns |
|--------|------|---------|
| GET | `/api/health` | `{status, version, timestamp}` |

---

## Database Schema (Flyway V1 + V2 + V3)

### Tables with Java entities
| Table | Entity | Key columns |
|-------|--------|-------------|
| `users` | User | UUID PK, email (unique), password_hash, display_name, storage_used/limit_bytes, role, is_active |
| `refresh_tokens` | RefreshToken | UUID PK, FK users, token_hash (SHA-256), expires_at, revoked_at |
| `guest_sessions` | GuestSession | UUID PK, session_token (unique), ip_address, expires_at, document_count, converted_to_user_id |
| `documents` | Document | UUID PK, FK users/guest_sessions, title, file_size, page_count, storage keys (original/current/thumbnail), status, analysis_status, pdf metadata, deleted_at, expires_at |
| `document_versions` | DocumentVersion | UUID PK, FK documents, version_number, storage_key, file_size, label |
| `document_operations` | DocumentOperation | UUID PK, FK documents/versions, sequence_number, operation_type, page_number, parameters (JSON), inverse_parameters (JSON), is_undone |
| `annotations` | Annotation | UUID PK, FK documents, page_number, type, x, y, width, height, text, color, stroke_width, points (JSON), shape_type |

### Tables WITHOUT Java entities (schema only)
| Table | Purpose | Status |
|-------|---------|--------|
| `email_verifications` | Email verification tokens | Not implemented |
| `password_resets` | Password reset tokens | Not implemented |
| `document_pages` | Per-page metadata (dimensions, text/image counts) | Not implemented |
| `user_assets` | User uploaded assets (signatures, stamps) | Not implemented |
| `processing_jobs` | Background job queue | Not implemented |

---

## Storage Layout (local filesystem)

```
backend/storage/
├── users/{userId}/documents/{docId}/
│   ├── original.pdf
│   ├── current.pdf
│   ├── thumbnails/cover.png
│   ├── versions/v001.pdf, v002.pdf
│   └── exports/
└── guests/{sessionId}/documents/{docId}/
    └── (same structure)
```

---

## Configuration (application.yml defaults)

| Setting | Value |
|---------|-------|
| DB | MySQL localhost:3307, database pdfplatform, root/root |
| Upload limit | 200MB |
| Page limit | 2000 |
| JWT access token | 15 min |
| JWT refresh token | 30 days |
| Guest session | 24h, max 3 docs, 50MB each |
| Storage | ./storage (local filesystem) |
| Rate limit | 120 req/min general, 10 req/min auth |

---

## Zustand Stores

| Store | Key state | Persisted |
|-------|-----------|-----------|
| authStore | user, isAuthenticated, tokens in localStorage | Yes (localStorage) |
| guestStore | sessionToken, expiresAt in localStorage | Yes (localStorage) |
| editorStore | documentId, pageAnalyses (Map), selectedBlockId | No (session only) |
| annotationStore | annotations[], activeTool, activeColor, strokeWidth, documentId | Yes (backend REST API) |
| ocrStore | ocrResults (Map of page→OcrResult) | No (session only) |

---

## Known Gaps / Not Implemented

1. ~~**Annotations not persisted**~~ — **DONE** (V3 migration, AnnotationController, annotationStore synced)
2. **Split/merge** — service methods exist but no controller endpoints
3. **Email verification** — DB table exists, no code
4. **Password reset** — DB table exists, no code
5. **User assets (signatures/stamps)** — DB table exists, no code
6. **Background job queue** — DB table exists, no code
7. **TanStack React Query** — configured but unused (all fetching via direct axios)
8. **Docker uses PostgreSQL** but code is MySQL-only — needs docker-compose fix

---

## Test Coverage (41 tests, BUILD SUCCESS)

- **8 test files, 41 test methods** — all passing
- Test config: H2 in-memory, Flyway disabled, `@ActiveProfiles("test")`

| Test Class | Tests | What it covers |
|------------|-------|---------------|
| PdfPlatformApplicationTests | 1 | Spring context loads |
| ContentStreamParserTest | 7 | Parse single/multi-line, fonts, colors, empty page, operator tracking |
| ContentStreamEditorTest | 7 | Text replace (simple/partial/not-found), font size, color, preservation, encoding validation |
| TextBlockExtractorTest | 7 | Grouping, font split, spacing split, bounding box, IDs, editability, empty input |
| AnnotationServiceTest | 6 | CRUD operations, document association, not-found error |
| PageManagementServiceTest | 6 | Rotate, delete, duplicate, insert blank, reorder (Mockito) |
| CompressServiceTest | 2 | Output validity |
| WatermarkServiceTest | 2 | Page count preservation |
| PdfValidationServiceTest | 3 | Non-PDF rejection, empty rejection, valid acceptance |

Still untested: auth/token flows, controller integration, export, OCR, version service

---

## Verified Working (2026-08-31)

All backend APIs tested via curl. Bugs found and fixed:
- **StorageService.java line 27**: Added `.normalize()` to basePath initialization to fix file serving 400 errors on Windows with `./storage` relative paths.

### Features verified end-to-end:
1. **Build & Boot** — backend compiles and starts, frontend builds and serves
2. **PDF Upload & View** — guest session, upload, dashboard, editor rendering, zoom, thumbnails
3. **Authentication** — register, login, JWT refresh, /me endpoint
4. **Text Editing** — analysis, inline edit, font size/color, undo/redo
5. **Page Management** — rotate, delete, duplicate, insert blank, reorder
6. **PDF Tools** — compress, watermark, protect, unlock, page numbers
7. **Export & Versions** — PDF export (page range), image export, version snapshots, restore
8. **Annotation Persistence** — CRUD API (all 5 types), frontend optimistic sync, guest token auth
