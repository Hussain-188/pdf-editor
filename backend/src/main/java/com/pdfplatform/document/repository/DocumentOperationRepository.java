package com.pdfplatform.document.repository;

import com.pdfplatform.document.entity.DocumentOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentOperationRepository extends JpaRepository<DocumentOperation, UUID> {

    @Query("SELECT o FROM DocumentOperation o WHERE o.document.id = :docId ORDER BY o.sequenceNumber ASC")
    List<DocumentOperation> findByDocumentId(@Param("docId") UUID documentId);

    @Query("SELECT COALESCE(MAX(o.sequenceNumber), 0) FROM DocumentOperation o WHERE o.document.id = :docId")
    int findMaxSequenceNumber(@Param("docId") UUID documentId);

    @Query("SELECT o FROM DocumentOperation o WHERE o.document.id = :docId AND o.undone = false ORDER BY o.sequenceNumber DESC")
    List<DocumentOperation> findUndoable(@Param("docId") UUID documentId);

    @Query("SELECT o FROM DocumentOperation o WHERE o.document.id = :docId AND o.undone = true ORDER BY o.sequenceNumber ASC")
    List<DocumentOperation> findRedoable(@Param("docId") UUID documentId);
}
