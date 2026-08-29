package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.guest.entity.GuestSession;
import com.pdfplatform.guest.service.GuestSessionService;
import com.pdfplatform.storage.StorageService;
import com.pdfplatform.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final PdfValidationService pdfValidationService;
    private final GuestSessionService guestSessionService;
    private final ThumbnailService thumbnailService;

    public DocumentService(DocumentRepository documentRepository, StorageService storageService,
                           PdfValidationService pdfValidationService, GuestSessionService guestSessionService,
                           ThumbnailService thumbnailService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.pdfValidationService = pdfValidationService;
        this.guestSessionService = guestSessionService;
        this.thumbnailService = thumbnailService;
    }

    @Transactional
    public Document uploadForUser(MultipartFile file, User user) throws IOException {
        var validation = pdfValidationService.validate(file, false);
        if (!validation.valid()) {
            throw new IllegalArgumentException(validation.error());
        }

        String docId = UUID.randomUUID().toString();
        String storageKey = storageService.buildStorageKey("users", user.getId().toString(), "documents", docId, "original.pdf");

        storageService.upload(storageKey, file.getInputStream(), file.getSize(), "application/pdf");

        Document doc = new Document();
        doc.setOwnerUser(user);
        doc.setTitle(stripExtension(file.getOriginalFilename()));
        doc.setOriginalFilename(file.getOriginalFilename());
        doc.setFileSizeBytes(file.getSize());
        doc.setPageCount(validation.pageCount());
        doc.setStorageKeyOriginal(storageKey);
        doc.setEncrypted(validation.encrypted());
        doc.setPdfVersion(validation.pdfVersion());

        Document saved = documentRepository.save(doc);
        generateThumbnailAsync(saved);
        return saved;
    }

    @Transactional
    public Document uploadForGuest(MultipartFile file, GuestSession session) throws IOException {
        if (!session.canUpload()) {
            throw new IllegalArgumentException("Document limit reached for guest session");
        }

        var validation = pdfValidationService.validate(file, true);
        if (!validation.valid()) {
            throw new IllegalArgumentException(validation.error());
        }

        String docId = UUID.randomUUID().toString();
        String storageKey = storageService.buildStorageKey("guests", session.getId().toString(), "documents", docId, "original.pdf");

        storageService.upload(storageKey, file.getInputStream(), file.getSize(), "application/pdf");

        Document doc = new Document();
        doc.setGuestSession(session);
        doc.setTitle(stripExtension(file.getOriginalFilename()));
        doc.setOriginalFilename(file.getOriginalFilename());
        doc.setFileSizeBytes(file.getSize());
        doc.setPageCount(validation.pageCount());
        doc.setStorageKeyOriginal(storageKey);
        doc.setEncrypted(validation.encrypted());
        doc.setPdfVersion(validation.pdfVersion());
        doc.setExpiresAt(session.getExpiresAt());

        Document saved = documentRepository.save(doc);
        guestSessionService.incrementDocumentCount(session);
        generateThumbnailAsync(saved);
        return saved;
    }

    public Page<Document> listForUser(UUID userId, Pageable pageable) {
        return documentRepository.findByOwnerUserId(userId, pageable);
    }

    public List<Document> listForGuest(UUID sessionId) {
        return documentRepository.findByGuestSessionId(sessionId);
    }

    public Page<Document> searchForUser(UUID userId, String query, Pageable pageable) {
        return documentRepository.searchByOwner(userId, query, pageable);
    }

    public String getDownloadUrl(Document document) {
        String key = document.getStorageKeyCurrent() != null
                ? document.getStorageKeyCurrent()
                : document.getStorageKeyOriginal();
        return storageService.generatePresignedDownloadUrl(key, Duration.ofMinutes(15));
    }

    @Transactional
    public void softDelete(UUID documentId, UUID userId) {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));

        if (doc.getOwnerUser() == null || !doc.getOwnerUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Not authorized to delete this document");
        }

        doc.setDeletedAt(java.time.Instant.now());
        documentRepository.save(doc);
    }

    public Document getById(UUID documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
    }

    @Transactional
    public Document rename(UUID documentId, UUID userId, String newTitle) {
        Document doc = getById(documentId);
        if (doc.getOwnerUser() == null || !doc.getOwnerUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Not authorized to rename this document");
        }
        doc.setTitle(newTitle.trim());
        return documentRepository.save(doc);
    }

    public String getThumbnailUrl(Document document) {
        if (document.getThumbnailKey() == null) return null;
        return storageService.generatePresignedDownloadUrl(document.getThumbnailKey(), Duration.ofMinutes(60));
    }

    private void generateThumbnailAsync(Document doc) {
        String thumbnailKey = doc.getStorageKeyOriginal()
                .replace("original.pdf", "thumbnails/cover.png");
        try {
            thumbnailService.generateFromStorageKey(doc.getStorageKeyOriginal(), thumbnailKey);
            doc.setThumbnailKey(thumbnailKey);
            documentRepository.save(doc);
        } catch (IOException e) {
            // Thumbnail generation is non-critical; log and continue
        }
    }

    private String stripExtension(String filename) {
        if (filename == null) return "Untitled";
        int dot = filename.lastIndexOf('.');
        return dot > 0 ? filename.substring(0, dot) : filename;
    }
}
