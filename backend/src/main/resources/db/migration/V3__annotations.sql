-- V3: Annotations table for persisting editor annotations

CREATE TABLE annotations (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    document_id     CHAR(36) NOT NULL,
    page_number     INT NOT NULL,
    type            VARCHAR(20) NOT NULL,
    x               DOUBLE NOT NULL,
    y               DOUBLE NOT NULL,
    width           DOUBLE NOT NULL DEFAULT 0,
    height          DOUBLE NOT NULL DEFAULT 0,
    text            TEXT,
    color           VARCHAR(30) NOT NULL DEFAULT '#FFD700',
    stroke_width    DOUBLE NOT NULL DEFAULT 2,
    points          JSON,
    shape_type      VARCHAR(20),
    created_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at      DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

    CONSTRAINT fk_annotations_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_annotations_document ON annotations(document_id);
CREATE INDEX idx_annotations_document_page ON annotations(document_id, page_number);
