package com.pdfplatform.document.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "document_operations")
public class DocumentOperation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(name = "sequence_number", nullable = false)
    private long sequenceNumber;

    @Column(name = "operation_type", nullable = false, length = 50)
    private String operationType;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "target_object_id")
    private String targetObjectId;

    @Column(name = "parameters", columnDefinition = "jsonb")
    private String parameters;

    @Column(name = "inverse_parameters", columnDefinition = "jsonb")
    private String inverseParameters;

    @Column(name = "is_undone", nullable = false)
    private boolean undone = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "version_id")
    private DocumentVersion version;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Document getDocument() { return document; }
    public void setDocument(Document document) { this.document = document; }
    public long getSequenceNumber() { return sequenceNumber; }
    public void setSequenceNumber(long sequenceNumber) { this.sequenceNumber = sequenceNumber; }
    public String getOperationType() { return operationType; }
    public void setOperationType(String operationType) { this.operationType = operationType; }
    public Integer getPageNumber() { return pageNumber; }
    public void setPageNumber(Integer pageNumber) { this.pageNumber = pageNumber; }
    public String getTargetObjectId() { return targetObjectId; }
    public void setTargetObjectId(String targetObjectId) { this.targetObjectId = targetObjectId; }
    public String getParameters() { return parameters; }
    public void setParameters(String parameters) { this.parameters = parameters; }
    public String getInverseParameters() { return inverseParameters; }
    public void setInverseParameters(String inverseParameters) { this.inverseParameters = inverseParameters; }
    public boolean isUndone() { return undone; }
    public void setUndone(boolean undone) { this.undone = undone; }
    public Instant getCreatedAt() { return createdAt; }
    public DocumentVersion getVersion() { return version; }
    public void setVersion(DocumentVersion version) { this.version = version; }
}
