package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.entity.DocumentVersion;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.document.repository.DocumentVersionRepository;
import com.pdfplatform.storage.StorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class VersionService {

    private final DocumentVersionRepository versionRepository;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;

    public VersionService(DocumentVersionRepository versionRepository,
                          DocumentRepository documentRepository,
                          StorageService storageService) {
        this.versionRepository = versionRepository;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
    }

    @Transactional
    public DocumentVersion createSnapshot(Document doc, String label) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        byte[] pdfBytes = storageService.download(key).readAllBytes();

        int nextVersion = versionRepository.findMaxVersionNumber(doc.getId()) + 1;
        String versionKey = doc.getStorageKeyOriginal()
                .replace("original.pdf", "versions/v" + String.format("%03d", nextVersion) + ".pdf");

        storageService.upload(versionKey, new ByteArrayInputStream(pdfBytes), pdfBytes.length, "application/pdf");

        DocumentVersion version = new DocumentVersion();
        version.setDocument(doc);
        version.setVersionNumber(nextVersion);
        version.setStorageKey(versionKey);
        version.setFileSizeBytes(pdfBytes.length);
        version.setLabel(label != null ? label : "Version " + nextVersion);
        version.setCreatedBy("system");

        pruneOldVersions(doc.getId(), 20);

        return versionRepository.save(version);
    }

    public List<DocumentVersion> listVersions(UUID documentId) {
        return versionRepository.findByDocumentId(documentId);
    }

    @Transactional
    public Document restoreVersion(UUID documentId, UUID versionId) throws IOException {
        Document doc = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found"));
        DocumentVersion version = versionRepository.findById(versionId)
                .orElseThrow(() -> new IllegalArgumentException("Version not found"));

        if (!version.getDocument().getId().equals(documentId)) {
            throw new IllegalArgumentException("Version does not belong to this document");
        }

        byte[] versionBytes = storageService.download(version.getStorageKey()).readAllBytes();
        String currentKey = doc.getStorageKeyOriginal().replace("original.pdf", "current.pdf");
        storageService.upload(currentKey, new ByteArrayInputStream(versionBytes), versionBytes.length, "application/pdf");

        doc.setStorageKeyCurrent(currentKey);
        doc.setFileSizeBytes(versionBytes.length);
        doc.setLastEditedAt(Instant.now());

        return documentRepository.save(doc);
    }

    @Transactional
    public DocumentVersion autoSave(Document doc) throws IOException {
        return createSnapshot(doc, "Auto-save");
    }

    private void pruneOldVersions(UUID documentId, int keepCount) {
        List<DocumentVersion> versions = versionRepository.findByDocumentId(documentId);
        if (versions.size() <= keepCount) return;

        List<DocumentVersion> toDelete = versions.subList(keepCount, versions.size());
        for (DocumentVersion v : toDelete) {
            try {
                storageService.delete(v.getStorageKey());
            } catch (Exception ignored) {}
            versionRepository.delete(v);
        }
    }
}
