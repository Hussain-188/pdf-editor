package com.pdfplatform.document.controller;

import com.pdfplatform.document.entity.Annotation;
import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.service.AnnotationService;
import com.pdfplatform.document.service.DocumentService;
import com.pdfplatform.guest.entity.GuestSession;
import com.pdfplatform.guest.service.GuestSessionService;
import com.pdfplatform.user.entity.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents/{documentId}/annotations")
public class AnnotationController {

    private final AnnotationService annotationService;
    private final DocumentService documentService;
    private final GuestSessionService guestSessionService;

    public AnnotationController(AnnotationService annotationService,
                                DocumentService documentService,
                                GuestSessionService guestSessionService) {
        this.annotationService = annotationService;
        this.documentService = documentService;
        this.guestSessionService = guestSessionService;
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> list(
            @PathVariable UUID documentId,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {
        getAuthorizedDocument(documentId, user, guestToken);
        List<Annotation> annotations = annotationService.listForDocument(documentId);
        return ResponseEntity.ok(annotations.stream().map(this::toResponse).toList());
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> create(
            @PathVariable UUID documentId,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {
        Document doc = getAuthorizedDocument(documentId, user, guestToken);

        Annotation annotation = new Annotation();
        annotation.setPageNumber(((Number) body.get("pageNumber")).intValue());
        annotation.setType((String) body.get("type"));
        annotation.setX(((Number) body.get("x")).doubleValue());
        annotation.setY(((Number) body.get("y")).doubleValue());
        annotation.setWidth(body.containsKey("width") ? ((Number) body.get("width")).doubleValue() : 0);
        annotation.setHeight(body.containsKey("height") ? ((Number) body.get("height")).doubleValue() : 0);
        annotation.setText((String) body.get("text"));
        annotation.setColor(body.containsKey("color") ? (String) body.get("color") : "#FFD700");
        annotation.setStrokeWidth(body.containsKey("strokeWidth") ? ((Number) body.get("strokeWidth")).doubleValue() : 2);
        if (body.containsKey("points") && body.get("points") != null) {
            annotation.setPoints(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(body.get("points")).toString());
        }
        annotation.setShapeType((String) body.get("shapeType"));

        Annotation saved = annotationService.create(doc, annotation);
        return ResponseEntity.ok(toResponse(saved));
    }

    @PutMapping("/{annotationId}")
    public ResponseEntity<Map<String, Object>> update(
            @PathVariable UUID documentId,
            @PathVariable UUID annotationId,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {
        getAuthorizedDocument(documentId, user, guestToken);

        Annotation updates = new Annotation();
        updates.setX(((Number) body.get("x")).doubleValue());
        updates.setY(((Number) body.get("y")).doubleValue());
        updates.setWidth(body.containsKey("width") ? ((Number) body.get("width")).doubleValue() : 0);
        updates.setHeight(body.containsKey("height") ? ((Number) body.get("height")).doubleValue() : 0);
        updates.setText((String) body.get("text"));
        updates.setColor(body.containsKey("color") ? (String) body.get("color") : "#FFD700");
        updates.setStrokeWidth(body.containsKey("strokeWidth") ? ((Number) body.get("strokeWidth")).doubleValue() : 2);
        if (body.containsKey("points") && body.get("points") != null) {
            updates.setPoints(new com.fasterxml.jackson.databind.ObjectMapper().valueToTree(body.get("points")).toString());
        }

        Annotation saved = annotationService.update(annotationId, updates);
        return ResponseEntity.ok(toResponse(saved));
    }

    @DeleteMapping("/{annotationId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID documentId,
            @PathVariable UUID annotationId,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {
        getAuthorizedDocument(documentId, user, guestToken);
        annotationService.delete(annotationId);
        return ResponseEntity.noContent().build();
    }

    private Document getAuthorizedDocument(UUID id, User user, String guestToken) {
        Document doc = documentService.getById(id);
        if (user != null && doc.getOwnerUser() != null && doc.getOwnerUser().getId().equals(user.getId())) {
            return doc;
        }
        if (guestToken != null && doc.getGuestSession() != null) {
            GuestSession session = guestSessionService.validateSession(guestToken);
            if (session.getId().equals(doc.getGuestSession().getId())) {
                return doc;
            }
        }
        throw new org.springframework.security.access.AccessDeniedException("Access denied");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> toResponse(Annotation a) {
        var map = new java.util.LinkedHashMap<String, Object>();
        map.put("id", a.getId().toString());
        map.put("pageNumber", a.getPageNumber());
        map.put("type", a.getType());
        map.put("x", a.getX());
        map.put("y", a.getY());
        map.put("width", a.getWidth());
        map.put("height", a.getHeight());
        map.put("text", a.getText());
        map.put("color", a.getColor());
        map.put("strokeWidth", a.getStrokeWidth());
        if (a.getPoints() != null) {
            try {
                map.put("points", new com.fasterxml.jackson.databind.ObjectMapper().readValue(a.getPoints(), List.class));
            } catch (Exception e) {
                map.put("points", null);
            }
        }
        map.put("shapeType", a.getShapeType());
        map.put("createdAt", a.getCreatedAt().toString());
        return map;
    }
}
