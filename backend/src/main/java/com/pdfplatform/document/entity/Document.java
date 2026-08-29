package com.pdfplatform.document.entity;

import com.pdfplatform.guest.entity.GuestSession;
import com.pdfplatform.user.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private User ownerUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_session_id")
    private GuestSession guestSession;

    @Column(nullable = false, length = 500)
    private String title;

    @Column(name = "original_filename", length = 500)
    private String originalFilename;

    @Column(name = "file_size_bytes", nullable = false)
    private long fileSizeBytes;

    @Column(name = "page_count", nullable = false)
    private int pageCount;

    @Column(name = "mime_type", nullable = false, length = 50)
    private String mimeType = "application/pdf";

    @Column(name = "storage_key_original", nullable = false, length = 1000)
    private String storageKeyOriginal;

    @Column(name = "storage_key_current", length = 1000)
    private String storageKeyCurrent;

    @Column(name = "thumbnail_key", length = 1000)
    private String thumbnailKey;

    @Column(nullable = false, length = 30)
    private String status = "uploaded";

    @Column(name = "analysis_status", nullable = false, length = 30)
    private String analysisStatus = "pending";

    @Column(name = "pdf_version", length = 10)
    private String pdfVersion;

    @Column(name = "is_encrypted", nullable = false)
    private boolean encrypted = false;

    @Column(name = "is_signed", nullable = false)
    private boolean signed = false;

    @Column(name = "has_forms", nullable = false)
    private boolean hasForms = false;

    @Column(name = "is_scanned")
    private Boolean scanned;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "last_edited_at")
    private Instant lastEditedAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public User getOwnerUser() { return ownerUser; }
    public void setOwnerUser(User ownerUser) { this.ownerUser = ownerUser; }
    public GuestSession getGuestSession() { return guestSession; }
    public void setGuestSession(GuestSession guestSession) { this.guestSession = guestSession; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }
    public long getFileSizeBytes() { return fileSizeBytes; }
    public void setFileSizeBytes(long fileSizeBytes) { this.fileSizeBytes = fileSizeBytes; }
    public int getPageCount() { return pageCount; }
    public void setPageCount(int pageCount) { this.pageCount = pageCount; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public String getStorageKeyOriginal() { return storageKeyOriginal; }
    public void setStorageKeyOriginal(String storageKeyOriginal) { this.storageKeyOriginal = storageKeyOriginal; }
    public String getStorageKeyCurrent() { return storageKeyCurrent; }
    public void setStorageKeyCurrent(String storageKeyCurrent) { this.storageKeyCurrent = storageKeyCurrent; }
    public String getThumbnailKey() { return thumbnailKey; }
    public void setThumbnailKey(String thumbnailKey) { this.thumbnailKey = thumbnailKey; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getAnalysisStatus() { return analysisStatus; }
    public void setAnalysisStatus(String analysisStatus) { this.analysisStatus = analysisStatus; }
    public String getPdfVersion() { return pdfVersion; }
    public void setPdfVersion(String pdfVersion) { this.pdfVersion = pdfVersion; }
    public boolean isEncrypted() { return encrypted; }
    public void setEncrypted(boolean encrypted) { this.encrypted = encrypted; }
    public boolean isSigned() { return signed; }
    public void setSigned(boolean signed) { this.signed = signed; }
    public boolean isHasForms() { return hasForms; }
    public void setHasForms(boolean hasForms) { this.hasForms = hasForms; }
    public Boolean getScanned() { return scanned; }
    public void setScanned(Boolean scanned) { this.scanned = scanned; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getLastEditedAt() { return lastEditedAt; }
    public void setLastEditedAt(Instant lastEditedAt) { this.lastEditedAt = lastEditedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant deletedAt) { this.deletedAt = deletedAt; }
}
