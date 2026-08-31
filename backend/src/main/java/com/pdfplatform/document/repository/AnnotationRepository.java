package com.pdfplatform.document.repository;

import com.pdfplatform.document.entity.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AnnotationRepository extends JpaRepository<Annotation, UUID> {

    List<Annotation> findByDocumentIdOrderByPageNumberAscCreatedAtAsc(UUID documentId);

    List<Annotation> findByDocumentIdAndPageNumberOrderByCreatedAtAsc(UUID documentId, int pageNumber);

    void deleteByDocumentId(UUID documentId);
}
