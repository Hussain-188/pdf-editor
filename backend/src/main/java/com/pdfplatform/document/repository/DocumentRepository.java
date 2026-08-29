package com.pdfplatform.document.repository;

import com.pdfplatform.document.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @Query("SELECT d FROM Document d WHERE d.ownerUser.id = :userId AND d.deletedAt IS NULL ORDER BY d.updatedAt DESC")
    Page<Document> findByOwnerUserId(@Param("userId") UUID userId, Pageable pageable);

    @Query("SELECT d FROM Document d WHERE d.guestSession.id = :sessionId AND d.deletedAt IS NULL ORDER BY d.createdAt DESC")
    List<Document> findByGuestSessionId(@Param("sessionId") UUID sessionId);

    @Query("SELECT d FROM Document d WHERE d.ownerUser.id = :userId AND d.deletedAt IS NULL AND LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%'))")
    Page<Document> searchByOwner(@Param("userId") UUID userId, @Param("query") String query, Pageable pageable);
}
