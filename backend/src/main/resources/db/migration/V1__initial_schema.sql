-- V1: Initial schema for MySQL

-- =============================================
-- USERS
-- =============================================
CREATE TABLE users (
    id                  CHAR(36) NOT NULL PRIMARY KEY,
    email               VARCHAR(255) NOT NULL UNIQUE,
    email_verified      TINYINT(1) NOT NULL DEFAULT 0,
    password_hash       VARCHAR(255) NOT NULL,
    display_name        VARCHAR(100),
    avatar_url          VARCHAR(500),
    storage_used_bytes  BIGINT NOT NULL DEFAULT 0,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 1073741824,
    role                VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    last_login_at       DATETIME(6),
    is_active           TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active);

-- =============================================
-- REFRESH TOKENS
-- =============================================
CREATE TABLE refresh_tokens (
    id          CHAR(36) NOT NULL PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    device_info VARCHAR(500),
    expires_at  DATETIME(6) NOT NULL,
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    revoked_at  DATETIME(6),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- =============================================
-- EMAIL VERIFICATION TOKENS
-- =============================================
CREATE TABLE email_verifications (
    id          CHAR(36) NOT NULL PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  DATETIME(6) NOT NULL,
    used_at     DATETIME(6),
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- PASSWORD RESET TOKENS
-- =============================================
CREATE TABLE password_resets (
    id          CHAR(36) NOT NULL PRIMARY KEY,
    user_id     CHAR(36) NOT NULL,
    token_hash  VARCHAR(64) NOT NULL UNIQUE,
    expires_at  DATETIME(6) NOT NULL,
    used_at     DATETIME(6),
    created_at  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- GUEST SESSIONS
-- =============================================
CREATE TABLE guest_sessions (
    id                      CHAR(36) NOT NULL PRIMARY KEY,
    session_token           VARCHAR(64) NOT NULL UNIQUE,
    ip_address              VARCHAR(45),
    user_agent              TEXT,
    created_at              DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    expires_at              DATETIME(6) NOT NULL,
    converted_to_user_id    CHAR(36),
    is_expired              TINYINT(1) NOT NULL DEFAULT 0,
    document_count          INT NOT NULL DEFAULT 0,
    max_documents           INT NOT NULL DEFAULT 3,
    CONSTRAINT fk_guest_sessions_user FOREIGN KEY (converted_to_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_guest_sessions_token ON guest_sessions(session_token);
CREATE INDEX idx_guest_sessions_expires ON guest_sessions(expires_at);

-- =============================================
-- DOCUMENTS
-- =============================================
CREATE TABLE documents (
    id                      CHAR(36) NOT NULL PRIMARY KEY,
    owner_user_id           CHAR(36),
    guest_session_id        CHAR(36),

    title                   VARCHAR(500) NOT NULL,
    original_filename       VARCHAR(500),
    file_size_bytes         BIGINT NOT NULL,
    page_count              INT NOT NULL,
    mime_type               VARCHAR(50) NOT NULL DEFAULT 'application/pdf',

    storage_key_original    VARCHAR(1000) NOT NULL,
    storage_key_current     VARCHAR(1000),
    thumbnail_key           VARCHAR(1000),

    status                  VARCHAR(30) NOT NULL DEFAULT 'uploaded',
    analysis_status         VARCHAR(30) NOT NULL DEFAULT 'pending',

    pdf_version             VARCHAR(10),
    is_encrypted            TINYINT(1) NOT NULL DEFAULT 0,
    is_signed               TINYINT(1) NOT NULL DEFAULT 0,
    has_forms               TINYINT(1) NOT NULL DEFAULT 0,
    is_scanned              TINYINT(1),

    created_at              DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    last_edited_at          DATETIME(6),
    expires_at              DATETIME(6),
    deleted_at              DATETIME(6),

    CONSTRAINT fk_documents_user FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_documents_guest FOREIGN KEY (guest_session_id) REFERENCES guest_sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_documents_owner ON documents(owner_user_id);
CREATE INDEX idx_documents_guest ON documents(guest_session_id);
CREATE INDEX idx_documents_expires ON documents(expires_at);
CREATE INDEX idx_documents_status ON documents(status);

-- =============================================
-- DOCUMENT PAGES
-- =============================================
CREATE TABLE document_pages (
    id                  CHAR(36) NOT NULL PRIMARY KEY,
    document_id         CHAR(36) NOT NULL,
    page_number         INT NOT NULL,
    width               DECIMAL(10,4) NOT NULL,
    height              DECIMAL(10,4) NOT NULL,
    rotation            INT NOT NULL DEFAULT 0,
    text_block_count    INT NOT NULL DEFAULT 0,
    image_count         INT NOT NULL DEFAULT 0,
    is_scanned          TINYINT(1) NOT NULL DEFAULT 0,
    has_selectable_text TINYINT(1) NOT NULL DEFAULT 1,
    thumbnail_key       VARCHAR(1000),
    analysis_data_key   VARCHAR(1000),
    UNIQUE KEY uk_doc_page (document_id, page_number),
    CONSTRAINT fk_doc_pages_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_doc_pages_document ON document_pages(document_id);

-- =============================================
-- DOCUMENT VERSIONS
-- =============================================
CREATE TABLE document_versions (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    document_id     CHAR(36) NOT NULL,
    version_number  INT NOT NULL,
    storage_key     VARCHAR(1000) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    label           VARCHAR(200),
    created_by      VARCHAR(20) NOT NULL DEFAULT 'auto',
    operation_count INT NOT NULL DEFAULT 0,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY uk_doc_version (document_id, version_number),
    CONSTRAINT fk_doc_versions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_doc_versions_document ON document_versions(document_id);

-- =============================================
-- DOCUMENT OPERATIONS
-- =============================================
CREATE TABLE document_operations (
    id                  CHAR(36) NOT NULL PRIMARY KEY,
    document_id         CHAR(36) NOT NULL,
    sequence_number     BIGINT NOT NULL,
    operation_type      VARCHAR(50) NOT NULL,
    page_number         INT,
    target_object_id    VARCHAR(100),
    parameters          JSON NOT NULL,
    inverse_parameters  JSON,
    is_undone           TINYINT(1) NOT NULL DEFAULT 0,
    created_at          DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    version_id          CHAR(36),
    UNIQUE KEY uk_doc_op_seq (document_id, sequence_number),
    CONSTRAINT fk_doc_ops_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_doc_ops_version FOREIGN KEY (version_id) REFERENCES document_versions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_doc_ops_document_seq ON document_operations(document_id, sequence_number);

-- =============================================
-- USER ASSETS
-- =============================================
CREATE TABLE user_assets (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    user_id         CHAR(36) NOT NULL,
    asset_type      VARCHAR(30) NOT NULL,
    label           VARCHAR(200),
    storage_key     VARCHAR(1000) NOT NULL,
    mime_type       VARCHAR(50),
    file_size_bytes INT,
    signature_method VARCHAR(20),
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    last_used_at    DATETIME(6),
    is_default      TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_user_assets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_user_assets_user ON user_assets(user_id, asset_type);

-- =============================================
-- PROCESSING JOBS
-- =============================================
CREATE TABLE processing_jobs (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    document_id     CHAR(36),
    job_type        VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'queued',
    input_params    JSON,
    output_result   JSON,
    progress_percent INT NOT NULL DEFAULT 0,
    error_message   TEXT,
    retry_count     INT NOT NULL DEFAULT 0,
    max_retries     INT NOT NULL DEFAULT 3,
    priority        INT NOT NULL DEFAULT 5,
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    started_at      DATETIME(6),
    completed_at    DATETIME(6),
    CONSTRAINT fk_jobs_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_jobs_status ON processing_jobs(status, priority, created_at);
CREATE INDEX idx_jobs_document ON processing_jobs(document_id);
