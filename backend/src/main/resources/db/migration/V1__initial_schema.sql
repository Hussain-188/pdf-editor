-- V1: Initial schema - Users and Authentication

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- USERS
-- =============================================
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               VARCHAR(255) NOT NULL UNIQUE,
    email_verified      BOOLEAN NOT NULL DEFAULT FALSE,
    password_hash       VARCHAR(255) NOT NULL,
    display_name        VARCHAR(100),
    avatar_url          VARCHAR(500),
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824,
    role                VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at       TIMESTAMPTZ,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- =============================================
-- REFRESH TOKENS
-- =============================================
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at)
    WHERE revoked_at IS NULL;

-- =============================================
-- EMAIL VERIFICATION TOKENS
-- =============================================
CREATE TABLE email_verifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- PASSWORD RESET TOKENS
-- =============================================
CREATE TABLE password_resets (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- GUEST SESSIONS
-- =============================================
CREATE TABLE guest_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token           VARCHAR(64) NOT NULL UNIQUE,
    ip_address              INET,
    user_agent              TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at              TIMESTAMPTZ NOT NULL,
    converted_to_user_id    UUID REFERENCES users(id),
    is_expired              BOOLEAN NOT NULL DEFAULT FALSE,
    document_count          INTEGER NOT NULL DEFAULT 0,
    max_documents           INTEGER NOT NULL DEFAULT 3
);

CREATE INDEX idx_guest_sessions_token ON guest_sessions(session_token);
CREATE INDEX idx_guest_sessions_expires ON guest_sessions(expires_at)
    WHERE is_expired = FALSE;

-- =============================================
-- DOCUMENTS
-- =============================================
CREATE TABLE documents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    guest_session_id        UUID REFERENCES guest_sessions(id) ON DELETE SET NULL,

    title                   VARCHAR(500) NOT NULL,
    original_filename       VARCHAR(500),
    file_size_bytes         BIGINT NOT NULL,
    page_count              INTEGER NOT NULL,
    mime_type               VARCHAR(50) NOT NULL DEFAULT 'application/pdf',

    storage_key_original    VARCHAR(1000) NOT NULL,
    storage_key_current     VARCHAR(1000),
    thumbnail_key           VARCHAR(1000),

    status                  VARCHAR(30) NOT NULL DEFAULT 'uploaded',
    analysis_status         VARCHAR(30) NOT NULL DEFAULT 'pending',

    pdf_version             VARCHAR(10),
    is_encrypted            BOOLEAN NOT NULL DEFAULT FALSE,
    is_signed               BOOLEAN NOT NULL DEFAULT FALSE,
    has_forms               BOOLEAN NOT NULL DEFAULT FALSE,
    is_scanned              BOOLEAN,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_edited_at          TIMESTAMPTZ,
    expires_at              TIMESTAMPTZ,
    deleted_at              TIMESTAMPTZ,

    CONSTRAINT chk_document_owner CHECK (
        (owner_user_id IS NOT NULL AND guest_session_id IS NULL) OR
        (owner_user_id IS NULL AND guest_session_id IS NOT NULL)
    )
);

CREATE INDEX idx_documents_owner ON documents(owner_user_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_guest ON documents(guest_session_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_expires ON documents(expires_at)
    WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_documents_status ON documents(status);

-- =============================================
-- DOCUMENT PAGES
-- =============================================
CREATE TABLE document_pages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number         INTEGER NOT NULL,
    width               NUMERIC(10,4) NOT NULL,
    height              NUMERIC(10,4) NOT NULL,
    rotation            INTEGER NOT NULL DEFAULT 0,
    text_block_count    INTEGER NOT NULL DEFAULT 0,
    image_count         INTEGER NOT NULL DEFAULT 0,
    is_scanned          BOOLEAN NOT NULL DEFAULT FALSE,
    has_selectable_text BOOLEAN NOT NULL DEFAULT TRUE,
    thumbnail_key       VARCHAR(1000),
    analysis_data_key   VARCHAR(1000),

    UNIQUE(document_id, page_number)
);

CREATE INDEX idx_doc_pages_document ON document_pages(document_id);

-- =============================================
-- DOCUMENT VERSIONS
-- =============================================
CREATE TABLE document_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    storage_key     VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    label           VARCHAR(200),
    created_by      VARCHAR(20) NOT NULL DEFAULT 'auto',
    operation_count INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(document_id, version_number)
);

CREATE INDEX idx_doc_versions_document ON document_versions(document_id);

-- =============================================
-- DOCUMENT OPERATIONS
-- =============================================
CREATE TABLE document_operations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    sequence_number     BIGINT NOT NULL,
    operation_type      VARCHAR(50) NOT NULL,
    page_number         INTEGER,
    target_object_id    VARCHAR(100),
    parameters          JSONB NOT NULL,
    inverse_parameters  JSONB,
    is_undone           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version_id          UUID REFERENCES document_versions(id),

    UNIQUE(document_id, sequence_number)
);

CREATE INDEX idx_doc_ops_document_seq ON document_operations(document_id, sequence_number);

-- =============================================
-- USER ASSETS
-- =============================================
CREATE TABLE user_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_type      VARCHAR(30) NOT NULL,
    label           VARCHAR(200),
    storage_key     VARCHAR(1000) NOT NULL,
    mime_type       VARCHAR(50),
    file_size_bytes INTEGER,
    signature_method VARCHAR(20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_user_assets_user ON user_assets(user_id, asset_type);

-- =============================================
-- PROCESSING JOBS
-- =============================================
CREATE TABLE processing_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID REFERENCES documents(id) ON DELETE SET NULL,
    job_type        VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'queued',
    input_params    JSONB,
    output_result   JSONB,
    progress_percent INTEGER NOT NULL DEFAULT 0,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    priority        INTEGER NOT NULL DEFAULT 5,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_jobs_status ON processing_jobs(status, priority, created_at);
CREATE INDEX idx_jobs_document ON processing_jobs(document_id);
