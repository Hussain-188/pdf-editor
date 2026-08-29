package com.pdfplatform.guest.entity;

import com.pdfplatform.user.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "guest_sessions")
public class GuestSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_token", nullable = false, unique = true, length = 64)
    private String sessionToken;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", columnDefinition = "text")
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "converted_to_user_id")
    private User convertedToUser;

    @Column(name = "is_expired", nullable = false)
    private boolean expired = false;

    @Column(name = "document_count", nullable = false)
    private int documentCount = 0;

    @Column(name = "max_documents", nullable = false)
    private int maxDocuments = 3;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    public boolean isValid() {
        return !expired && Instant.now().isBefore(expiresAt) && convertedToUser == null;
    }

    public boolean canUpload() {
        return isValid() && documentCount < maxDocuments;
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }
    public String getIpAddress() { return ipAddress; }
    public void setIpAddress(String ipAddress) { this.ipAddress = ipAddress; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public User getConvertedToUser() { return convertedToUser; }
    public void setConvertedToUser(User convertedToUser) { this.convertedToUser = convertedToUser; }
    public boolean isExpired() { return expired; }
    public void setExpired(boolean expired) { this.expired = expired; }
    public int getDocumentCount() { return documentCount; }
    public void setDocumentCount(int documentCount) { this.documentCount = documentCount; }
    public int getMaxDocuments() { return maxDocuments; }
    public void setMaxDocuments(int maxDocuments) { this.maxDocuments = maxDocuments; }
}
