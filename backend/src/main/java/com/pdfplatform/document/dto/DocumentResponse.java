package com.pdfplatform.document.dto;

import com.pdfplatform.document.entity.Document;

import java.time.Instant;

public record DocumentResponse(
        String id,
        String title,
        String originalFilename,
        long fileSizeBytes,
        int pageCount,
        String status,
        String analysisStatus,
        String pdfVersion,
        boolean encrypted,
        boolean signed,
        String thumbnailUrl,
        Instant createdAt,
        Instant updatedAt
) {
    public static DocumentResponse from(Document doc) {
        return from(doc, null);
    }

    public static DocumentResponse from(Document doc, String thumbnailUrl) {
        return new DocumentResponse(
                doc.getId().toString(),
                doc.getTitle(),
                doc.getOriginalFilename(),
                doc.getFileSizeBytes(),
                doc.getPageCount(),
                doc.getStatus(),
                doc.getAnalysisStatus(),
                doc.getPdfVersion(),
                doc.isEncrypted(),
                doc.isSigned(),
                thumbnailUrl,
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
