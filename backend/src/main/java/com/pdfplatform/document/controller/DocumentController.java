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
import com.pdfplatform.document.service.ContentInsertionService;
import com.pdfplatform.document.service.FindReplaceService;
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
    private final ContentInsertionService contentInsertionService;
    private final FindReplaceService findReplaceService;

    public DocumentController(DocumentService documentService, GuestSessionService guestSessionService,
                              TextAnalysisService textAnalysisService, DocumentEditService documentEditService,
                              OperationService operationService, PageManagementService pageManagementService,
                              OcrService ocrService, VersionService versionService, ExportService exportService,
                              ContentInsertionService contentInsertionService, FindReplaceService findReplaceService) {
        this.documentService = documentService;
        this.guestSessionService = guestSessionService;
        this.textAnalysisService = textAnalysisService;
        this.documentEditService = documentEditService;
        this.operationService = operationService;
        this.pageManagementService = pageManagementService;
        this.ocrService = ocrService;
        this.versionService = versionService;
        this.exportService = exportService;
        this.contentInsertionService = contentInsertionService;
        this.findReplaceService = findReplaceService;
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
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {

        Document doc = getAuthorizedDocument(id, user, guestToken);
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        List<PageAnalysisResponse> analysis = textAnalysisService.analyzeAllPages(key);

        doc.setAnalysisStatus("completed");
        return ResponseEntity.ok(analysis);
    }

    @GetMapping("/{id}/pages/{pageNumber}/analysis")
    public ResponseEntity<PageAnalysisResponse> analyzePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {

        Document doc = getAuthorizedDocument(id, user, guestToken);
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        PageAnalysisResponse analysis = textAnalysisService.analyzePage(key, pageNumber);
        return ResponseEntity.ok(analysis);
    }

    @PostMapping("/{id}/edit")
    public ResponseEntity<DocumentResponse> edit(
            @PathVariable UUID id,
            @RequestBody EditRequest request,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {

        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document edited = operationService.executeAndRecord(doc, request);
        return ResponseEntity.ok(toResponse(edited));
    }

    @PostMapping("/{id}/undo")
    public ResponseEntity<DocumentResponse> undo(
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = operationService.undo(doc);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/redo")
    public ResponseEntity<DocumentResponse> redo(
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = operationService.redo(doc);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/ocr/{pageNumber}")
    public ResponseEntity<OcrService.OcrResult> ocrPage(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        OcrService.OcrResult result = ocrService.ocrPage(doc, pageNumber);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/ocr")
    public ResponseEntity<List<OcrService.OcrResult>> ocrAllPages(
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        List<OcrService.OcrResult> results = ocrService.ocrAllPages(doc);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/{id}/pages/{pageNumber}/rotate")
    public ResponseEntity<DocumentResponse> rotatePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestBody Map<String, Integer> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        int degrees = body.getOrDefault("degrees", 90);
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = pageManagementService.rotatePage(doc, pageNumber, degrees);
        return ResponseEntity.ok(toResponse(result));
    }

    @DeleteMapping("/{id}/pages/{pageNumber}")
    public ResponseEntity<DocumentResponse> deletePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = pageManagementService.deletePage(doc, pageNumber);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/{pageNumber}/duplicate")
    public ResponseEntity<DocumentResponse> duplicatePage(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = pageManagementService.duplicatePage(doc, pageNumber);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/insert-blank")
    public ResponseEntity<DocumentResponse> insertBlankPage(
            @PathVariable UUID id,
            @RequestBody Map<String, Integer> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        int afterPage = body.getOrDefault("afterPage", 0);
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = pageManagementService.insertBlankPage(doc, afterPage);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/reorder")
    public ResponseEntity<DocumentResponse> reorderPages(
            @PathVariable UUID id,
            @RequestBody Map<String, List<Integer>> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        List<Integer> newOrder = body.get("order");
        if (newOrder == null || newOrder.isEmpty()) {
            throw new IllegalArgumentException("order is required");
        }
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = pageManagementService.reorderPages(doc, newOrder);
        return ResponseEntity.ok(toResponse(result));
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<List<Map<String, Object>>> listVersions(
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) {
        getAuthorizedDocument(id, user, guestToken);
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
            @RequestBody(required = false) Map<String, String> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
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
            @PathVariable UUID versionId,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        getAuthorizedDocument(id, user, guestToken);
        Document doc = versionService.restoreVersion(id, versionId);
        return ResponseEntity.ok(toResponse(doc));
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/{id}/export")
    public ResponseEntity<Map<String, String>> exportPdf(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
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
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        String format = (String) body.getOrDefault("format", "png");
        int dpi = body.containsKey("dpi") ? ((Number) body.get("dpi")).intValue() : 150;
        List<Integer> pages = body.containsKey("pages") ? (List<Integer>) body.get("pages") : null;
        String url = exportService.exportAsImages(doc, format, dpi, pages);
        return ResponseEntity.ok(Map.of("url", url));
    }

    @PostMapping("/{id}/find")
    public ResponseEntity<List<Map<String, Object>>> findText(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        String searchText = (String) body.get("searchText");
        boolean caseSensitive = body.containsKey("caseSensitive") && (boolean) body.get("caseSensitive");
        var results = findReplaceService.find(doc, searchText, caseSensitive);
        return ResponseEntity.ok(results);
    }

    @PostMapping("/{id}/replace-all")
    public ResponseEntity<DocumentResponse> replaceAll(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        String searchText = (String) body.get("searchText");
        String replaceText = (String) body.get("replaceText");
        boolean caseSensitive = body.containsKey("caseSensitive") && (boolean) body.get("caseSensitive");
        Document result = findReplaceService.replaceAll(doc, searchText, replaceText, caseSensitive);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/{pageNumber}/add-image")
    public ResponseEntity<DocumentResponse> addImage(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestParam("image") MultipartFile image,
            @RequestParam(defaultValue = "50") float x,
            @RequestParam(defaultValue = "50") float y,
            @RequestParam(defaultValue = "0") float width,
            @RequestParam(defaultValue = "0") float height,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        Document result = contentInsertionService.addImage(doc, pageNumber, image.getBytes(),
                image.getOriginalFilename() != null ? image.getOriginalFilename() : "image.jpg",
                x, y, width, height);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/{pageNumber}/add-text")
    public ResponseEntity<DocumentResponse> addText(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        String text = (String) body.get("text");
        float x = ((Number) body.getOrDefault("x", 50)).floatValue();
        float y = ((Number) body.getOrDefault("y", 50)).floatValue();
        float fontSize = ((Number) body.getOrDefault("fontSize", 12)).floatValue();
        String fontName = (String) body.getOrDefault("fontName", "Helvetica");
        float[] color = null;
        if (body.containsKey("color")) {
            var colorList = (java.util.List<?>) body.get("color");
            color = new float[]{
                    ((Number) colorList.get(0)).floatValue(),
                    ((Number) colorList.get(1)).floatValue(),
                    ((Number) colorList.get(2)).floatValue()
            };
        }
        Document result = contentInsertionService.addText(doc, pageNumber, text, x, y, fontSize, color, fontName);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/{pageNumber}/add-shape")
    public ResponseEntity<DocumentResponse> addShape(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        String shapeType = (String) body.getOrDefault("shapeType", "rectangle");
        float x = ((Number) body.getOrDefault("x", 50)).floatValue();
        float y = ((Number) body.getOrDefault("y", 50)).floatValue();
        float w = ((Number) body.getOrDefault("width", 100)).floatValue();
        float h = ((Number) body.getOrDefault("height", 50)).floatValue();
        float strokeWidth = ((Number) body.getOrDefault("strokeWidth", 1)).floatValue();
        float[] strokeColor = parseColorArray(body, "strokeColor");
        float[] fillColor = parseColorArray(body, "fillColor");
        Document result = contentInsertionService.addShape(doc, pageNumber, shapeType, x, y, w, h, fillColor, strokeColor, strokeWidth);
        return ResponseEntity.ok(toResponse(result));
    }

    @PostMapping("/{id}/pages/{pageNumber}/whiteout")
    public ResponseEntity<DocumentResponse> whiteout(
            @PathVariable UUID id,
            @PathVariable int pageNumber,
            @RequestBody Map<String, Object> body,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        float x = ((Number) body.get("x")).floatValue();
        float y = ((Number) body.get("y")).floatValue();
        float w = ((Number) body.get("width")).floatValue();
        float h = ((Number) body.get("height")).floatValue();
        Document result = contentInsertionService.addWhiteout(doc, pageNumber, x, y, w, h);
        return ResponseEntity.ok(toResponse(result));
    }

    private float[] parseColorArray(Map<String, Object> body, String key) {
        if (!body.containsKey(key)) return null;
        var list = (java.util.List<?>) body.get(key);
        if (list == null || list.size() < 3) return null;
        return new float[]{
                ((Number) list.get(0)).floatValue(),
                ((Number) list.get(1)).floatValue(),
                ((Number) list.get(2)).floatValue()
        };
    }

    @PostMapping("/{id}/autosave")
    public ResponseEntity<Map<String, String>> autoSave(
            @PathVariable UUID id,
            @RequestParam(required = false) String guestToken,
            @AuthenticationPrincipal User user) throws IOException {
        Document doc = getAuthorizedDocument(id, user, guestToken);
        versionService.autoSave(doc);
        return ResponseEntity.ok(Map.of("status", "saved"));
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

    private DocumentResponse toResponse(Document doc) {
        String thumbnailUrl = documentService.getThumbnailUrl(doc);
        return DocumentResponse.from(doc, thumbnailUrl);
    }
}
