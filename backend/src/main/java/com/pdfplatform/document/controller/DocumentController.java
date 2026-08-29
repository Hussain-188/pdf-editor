package com.pdfplatform.document.controller;

import com.pdfplatform.document.dto.DocumentResponse;
import com.pdfplatform.document.dto.EditRequest;
import com.pdfplatform.document.dto.PageAnalysisResponse;
import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.service.DocumentEditService;
import com.pdfplatform.document.service.DocumentService;
import com.pdfplatform.document.service.OperationService;
import com.pdfplatform.document.service.ExportService;
import com.pdfplatform.document.service.OcrService;
import com.pdfplatform.document.service.PageManagementService;
import com.pdfplatform.document.service.TextAnalysisService;
import com.pdfplatform.document.service.VersionService;
import com.pdfplatform.document.entity.DocumentVersion;
import com.pdfplatform.guest.entity.GuestSession;
import com.pdfplatform.guest.service.GuestSessionService;
import com.pdfplatform.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final GuestSessionService guestSessionService;
    private final TextAnalysisService textAnalysisService;
    private final DocumentEditService documentEditService;
    private final OperationService operationService;
    private final PageManagementService pageManagementService;
    private final OcrService ocrService;
    private final VersionService versionService;
    private final ExportService exportService;

    public DocumentController(DocumentService documentService, GuestSessionService guestSessionService,
                              TextAnalysisService textAnalysisService, DocumentEditService documentEditService,
                              OperationService operationService, PageManagementService pageManagementService,
                              OcrService ocrService, VersionService versionService, ExportService exportService) {
        this.documentService = documentService;
        this.guestSessionService = guestSessionService;
        this.textAnalysisService = textAnalysisService;
        this.documentEditService = documentEditService;
        this.operationService = operationService;
        this.pageManagementService = pageManagementService;
        this.ocrService = ocrService;
        this.versionService = versionService;
        this.exportService = exportService;
    }

    @PostMapping("/upload")
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "guestToken", required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {

        Document doc;
        if (user != null) {
            doc = documentService.uploadForUser(file, user);
        } else if (guestToken != null) {
            GuestSession session = guestSessionService.validateSession(guestToken);
            doc = documentService.uploadForGuest(file, session);
        } else {
            return ResponseEntity.status(401).build();
        }

        return ResponseEntity.ok(toResponse(doc));
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {

        if (user != null) {
            var pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());
            Page<Document> docs = (search != null && !search.isBlank())
                    ? documentService.searchForUser(user.getId(), search, pageable)
                    : documentService.listForUser(user.getId(), pageable);

            Page<DocumentResponse> response = docs.map(this::toResponse);
            return ResponseEntity.ok(response);
        } else if (guestToken != null) {
            GuestSession session = guestSessionService.validateSession(guestToken);
            List<DocumentResponse> docs = documentService.listForGuest(session.getId())
                    .stream().map(this::toResponse).toList();
            return ResponseEntity.ok(docs);
        }

        return ResponseEntity.status(401).build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentResponse> getOne(
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {

        Document doc = documentService.getById(id);
        if (user != null && doc.getOwnerUser() != null && doc.getOwnerUser().getId().equals(user.getId())) {
            return ResponseEntity.ok(toResponse(doc));
        }
        if (guestToken != null && doc.getGuestSession() != null) {
            GuestSession session = guestSessionService.validateSession(guestToken);
            if (session.getId().equals(doc.getGuestSession().getId())) {
                return ResponseEntity.ok(toResponse(doc));
            }
        }
        return ResponseEntity.status(403).build();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DocumentResponse> rename(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal User user) {

        if (user == null) return ResponseEntity.status(401).build();
        String newTitle = body.get("title");
        if (newTitle == null || newTitle.isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }

        Document doc = documentService.rename(id, user.getId(), newTitle);
        return ResponseEntity.ok(toResponse(doc));
    }

    @GetMapping("/{id}/url")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {

        Document doc = documentService.getById(id);
        boolean authorized = false;
        if (user != null && doc.getOwnerUser() != null && doc.getOwnerUser().getId().equals(user.getId())) {
            authorized = true;
        } else if (guestToken != null && doc.getGuestSession() != null) {
            GuestSession session = guestSessionService.validateSession(guestToken);
            if (session.getId().equals(doc.getGuestSession().getId())) {
                authorized = true;
            }
        }
        if (!authorized) return ResponseEntity.status(403).build();

        String url = documentService.getDownloadUrl(doc);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID id,
            @AuthenticationPrincipal User user) {

        if (user == null) return ResponseEntity.status(401).build();
        documentService.softDelete(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/analyze")
    public ResponseEntity<List<PageAnalysisResponse>> analyze(
            @PathVariable UUID id) throws IOException {

        Document doc = documentService.getById(id);
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        List<PageAnalysisResponse> analysis = textAnalysisService.analyzeAllPages(key);

        doc.setAnalysisStatus("completed");
        return ResponseEntity.ok(analysis);
    }

    @GetMapping("/{id}/pages/{pageNumber}/analysis")
    public ResponseEntity<PageAnalysisResponse> analyzePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber) throws IOException {

        Document doc = documentService.getById(id);
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        PageAnalysisResponse analysis = textAnalysisService.analyzePage(key, pageNumber);
        return ResponseEntity.ok(analysis);
    }

    @PostMapping("/{id}/edit")
    public ResponseEntity<DocumentResponse> edit(
            @PathVariable UUID id,
            @RequestBody EditRequest request) throws IOException {

        Document doc = documentService.getById(id);
        Document edited = operationService.executeAndRecord(doc, request);
        return ResponseEntity.ok(toResponse(edited));
    }

    @PostMapping("/{id}/undo")
    public ResponseEntity<DocumentResponse> undo(@PathVariable UUID id) throws IOException {
        Document doc = documentService.getById(id);
        Document result = operationService.undo(doc);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/redo")
    public ResponseEntity<DocumentResponse> redo(@PathVariable UUID id) throws IOException {
        Document doc = documentService.getById(id);
        Document result = operationService.redo(doc);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/ocr/{pageNumber}")
    public ResponseEntity<OcrService.OcrResult> ocrPage(
            @PathVariable UUID id,
            @PathVariable int pageNumber) throws IOException {
        Document doc = documentService.getById(id);
        OcrService.OcrResult result = ocrService.ocrPage(doc, pageNumber);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/ocr")
    public ResponseEntity<List<OcrService.OcrResult>> ocrAllPages(
            @PathVariable UUID id) throws IOException {
        Document doc = documentService.getById(id);
        List<OcrService.OcrResult> results = ocrService.ocrAllPages(doc);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/{id}/pages/{pageNumber}/rotate")
    public ResponseEntity<DocumentResponse> rotatePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestBody Map<String, Integer> body) throws IOException {
        int degrees = body.getOrDefault("degrees", 90);
        Document doc = documentService.getById(id);
        Document result = pageManagementService.rotatePage(doc, pageNumber, degrees);
        return ResponseEntity.ok(toResponse(result));
    }

    @DeleteMapping("/{id}/pages/{pageNumber}")
    public ResponseEntity<DocumentResponse> deletePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber) throws IOException {
        Document doc = documentService.getById(id);
        Document result = pageManagementService.deletePage(doc, pageNumber);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/{pageNumber}/duplicate")
    public ResponseEntity<DocumentResponse> duplicatePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber) throws IOException {
        Document doc = documentService.getById(id);
        Document result = pageManagementService.duplicatePage(doc, pageNumber);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/insert-blank")
    public ResponseEntity<DocumentResponse> insertBlankPage(
            @PathVariable UUID id,
            @RequestBody Map<String, Integer> body) throws IOException {
        int afterPage = body.getOrDefault("afterPage", 0);
        Document doc = documentService.getById(id);
        Document result = pageManagementService.insertBlankPage(doc, afterPage);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/reorder")
    public ResponseEntity<DocumentResponse> reorderPages(
            @PathVariable UUID id,
            @RequestBody Map<String, List<Integer>> body) throws IOException {
        List<Integer> newOrder = body.get("order");
        if (newOrder == null || newOrder.isEmpty()) {
            throw new IllegalArgumentException("order is required");
        }
        Document doc = documentService.getById(id);
        Document result = pageManagementService.reorderPages(doc, newOrder);
        return ResponseEntity.ok(toResponse(result));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<Map<String, Object>>> listVersions(@PathVariable UUID id) {
        List<DocumentVersion> versions = versionService.listVersions(id);
        List<Map<String, Object>> response = versions.stream().map(v -> Map.<String, Object>of(
                "id", v.getId().toString(),
                "versionNumber", v.getVersionNumber(),
                "label", v.getLabel() != null ? v.getLabel() : "",
                "fileSizeBytes", v.getFileSizeBytes(),
                "createdAt", v.getCreatedAt().toString()
        )).toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/versions")
    public ResponseEntity<Map<String, Object>> createVersion(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) throws IOException {
        Document doc = documentService.getById(id);
        String label = body != null ? body.get("label") : null;
        DocumentVersion version = versionService.createSnapshot(doc, label);
        return ResponseEntity.ok(Map.of(
                "id", version.getId().toString(),
                "versionNumber", version.getVersionNumber()
        ));
    }

    @PostMapping("/{id}/versions/{versionId}/restore")
    public ResponseEntity<DocumentResponse> restoreVersion(
            @PathVariable UUID id,
            @PathVariable UUID versionId) throws IOException {
        Document doc = versionService.restoreVersion(id, versionId);
        return ResponseEntity.ok(toResponse(doc));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/{id}/export")
    public ResponseEntity<Map<String, String>> exportPdf(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) throws IOException {
        Document doc = documentService.getById(id);
        List<Integer> pageRange = body.containsKey("pageRange") ? (List<Integer>) body.get("pageRange") : null;
        boolean flatten = body.containsKey("flattenAnnotations") ? (boolean) body.get("flattenAnnotations") : true;
        var options = new ExportService.ExportOptions(pageRange, flatten, "png", 150);
        String url = exportService.exportAsPdf(doc, options);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/{id}/export/images")
    public ResponseEntity<Map<String, String>> exportImages(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) throws IOException {
        Document doc = documentService.getById(id);
        String format = (String) body.getOrDefault("format", "png");
        int dpi = body.containsKey("dpi") ? ((Number) body.get("dpi")).intValue() : 150;
        List<Integer> pages = body.containsKey("pages") ? (List<Integer>) body.get("pages") : null;
        String url = exportService.exportAsImages(doc, format, dpi, pages);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/{id}/autosave")
    public ResponseEntity<Map<String, String>> autoSave(@PathVariable UUID id) throws IOException {
        Document doc = documentService.getById(id);
        versionService.autoSave(doc);
        return ResponseEntity.ok(Map.of("status", "saved"));
    }

    private DocumentResponse toResponse(Document doc) {
        String thumbnailUrl = documentService.getThumbnailUrl(doc);
        return DocumentResponse.from(doc, thumbnailUrl);
    }
}
