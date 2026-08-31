package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Annotation;
import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.AnnotationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class AnnotationService {

    private final AnnotationRepository annotationRepository;

    public AnnotationService(AnnotationRepository annotationRepository) {
        this.annotationRepository = annotationRepository;
    }

    public List<Annotation> listForDocument(UUID documentId) {
        return annotationRepository.findByDocumentIdOrderByPageNumberAscCreatedAtAsc(documentId);
    }

    public Annotation create(Document document, Annotation annotation) {
        annotation.setDocument(document);
        return annotationRepository.save(annotation);
    }

    public Annotation update(UUID annotationId, Annotation updates) {
        Annotation existing = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new IllegalArgumentException("Annotation not found"));

        existing.setX(updates.getX());
        existing.setY(updates.getY());
        existing.setWidth(updates.getWidth());
        existing.setHeight(updates.getHeight());
        existing.setText(updates.getText());
        existing.setColor(updates.getColor());
        existing.setStrokeWidth(updates.getStrokeWidth());
        existing.setPoints(updates.getPoints());

        return annotationRepository.save(existing);
    }

    @Transactional
    public void delete(UUID annotationId) {
        annotationRepository.deleteById(annotationId);
    }

    @Transactional
    public void deleteAllForDocument(UUID documentId) {
        annotationRepository.deleteByDocumentId(documentId);
    }
}
