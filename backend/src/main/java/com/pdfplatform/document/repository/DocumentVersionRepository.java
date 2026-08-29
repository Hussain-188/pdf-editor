package com.pdfplatform.document.repository;

import com.pdfplatform.document.entity.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, UUID> {

    @Query("SELECT v FROM DocumentVersion v WHERE v.document.id = :docId ORDER BY v.versionNumber DESC")
    List<DocumentVersion> findByDocumentId(@Param("docId") UUID documentId);

    @Query("SELECT COALESCE(MAX(v.versionNumber), 0) FROM DocumentVersion v WHERE v.document.id = :docId")
    int findMaxVersionNumber(@Param("docId") UUID documentId);
}
