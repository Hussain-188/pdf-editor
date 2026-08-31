package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Annotation;
import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.AnnotationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnnotationServiceTest {

    @Mock
    private AnnotationRepository annotationRepository;

    private AnnotationService annotationService;

    @BeforeEach
    void setUp() {
        annotationService = new AnnotationService(annotationRepository);
    }

    private Document createTestDocument() {
        Document doc = new Document();
        doc.setTitle("Test");
        return doc;
    }

    private Annotation createTestAnnotation(String type) {
        Annotation ann = new Annotation();
        ann.setPageNumber(1);
        ann.setType(type);
        ann.setX(100);
        ann.setY(200);
        ann.setWidth(300);
        ann.setHeight(20);
        ann.setColor("#FFFF00");
        ann.setStrokeWidth(2);
        return ann;
    }

    @Test
    void createSetsDocumentOnAnnotation() {
        Document doc = createTestDocument();
        Annotation ann = createTestAnnotation("highlight");

        when(annotationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        annotationService.create(doc, ann);

        ArgumentCaptor<Annotation> captor = ArgumentCaptor.forClass(Annotation.class);
        verify(annotationRepository).save(captor.capture());
        assertEquals(doc, captor.getValue().getDocument());
    }

    @Test
    void listForDocumentDelegates() {
        UUID docId = UUID.randomUUID();
        Annotation a1 = createTestAnnotation("highlight");
        Annotation a2 = createTestAnnotation("textbox");
        when(annotationRepository.findByDocumentIdOrderByPageNumberAscCreatedAtAsc(docId))
                .thenReturn(List.of(a1, a2));

        List<Annotation> result = annotationService.listForDocument(docId);

        assertEquals(2, result.size());
        verify(annotationRepository).findByDocumentIdOrderByPageNumberAscCreatedAtAsc(docId);
    }

    @Test
    void updateModifiesExistingAnnotation() {
        UUID annId = UUID.randomUUID();
        Annotation existing = createTestAnnotation("highlight");
        when(annotationRepository.findById(annId)).thenReturn(Optional.of(existing));
        when(annotationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Annotation updates = new Annotation();
        updates.setX(150);
        updates.setY(250);
        updates.setWidth(350);
        updates.setHeight(30);
        updates.setColor("#00FF00");
        updates.setStrokeWidth(3);

        Annotation result = annotationService.update(annId, updates);

        assertEquals(150, result.getX());
        assertEquals(250, result.getY());
        assertEquals("#00FF00", result.getColor());
        assertEquals(3, result.getStrokeWidth());
    }

    @Test
    void updateNotFoundThrows() {
        UUID annId = UUID.randomUUID();
        when(annotationRepository.findById(annId)).thenReturn(Optional.empty());

        Annotation updates = new Annotation();
        updates.setX(0);
        updates.setY(0);

        assertThrows(IllegalArgumentException.class,
                () -> annotationService.update(annId, updates));
    }

    @Test
    void deleteDelegates() {
        UUID annId = UUID.randomUUID();

        annotationService.delete(annId);

        verify(annotationRepository).deleteById(annId);
    }

    @Test
    void deleteAllForDocumentDelegates() {
        UUID docId = UUID.randomUUID();

        annotationService.deleteAllForDocument(docId);

        verify(annotationRepository).deleteByDocumentId(docId);
    }
}
