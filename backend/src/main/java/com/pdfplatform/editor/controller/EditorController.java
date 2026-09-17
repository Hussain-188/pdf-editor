package com.pdfplatform.editor.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pdfplatform.editor.dto.EditRequest;
import com.pdfplatform.editor.dto.PageAnalysisResponse;
import com.pdfplatform.editor.service.EditorService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/editor")
public class EditorController {

    private final EditorService editorService;
    private final ObjectMapper objectMapper;

    public EditorController(EditorService editorService, ObjectMapper objectMapper) {
        this.editorService = editorService;
        this.objectMapper = objectMapper;
    }

    @PostMapping("/rotate-page")
    public ResponseEntity<byte[]> rotatePage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pageNumber") int pageNumber,
            @RequestParam("degrees") int degrees) throws Exception {
        byte[] result = editorService.rotatePage(file.getBytes(), pageNumber, degrees);
        return pdfResponse(result);
    }

    @PostMapping("/delete-page")
    public ResponseEntity<byte[]> deletePage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pageNumber") int pageNumber) throws Exception {
        byte[] result = editorService.deletePage(file.getBytes(), pageNumber);
        return pdfResponse(result);
    }

    @PostMapping("/duplicate-page")
    public ResponseEntity<byte[]> duplicatePage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pageNumber") int pageNumber) throws Exception {
        byte[] result = editorService.duplicatePage(file.getBytes(), pageNumber);
        return pdfResponse(result);
    }

    @PostMapping("/insert-blank")
    public ResponseEntity<byte[]> insertBlankPage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("afterPage") int afterPage) throws Exception {
        byte[] result = editorService.insertBlankPage(file.getBytes(), afterPage);
        return pdfResponse(result);
    }

    @PostMapping("/reorder")
    public ResponseEntity<byte[]> reorderPages(
            @RequestParam("file") MultipartFile file,
            @RequestParam("order") String orderJson) throws Exception {
        List<Integer> order = objectMapper.readValue(orderJson,
                objectMapper.getTypeFactory().constructCollectionType(List.class, Integer.class));
        byte[] result = editorService.reorderPages(file.getBytes(), order);
        return pdfResponse(result);
    }

    @PostMapping("/edit")
    public ResponseEntity<byte[]> edit(
            @RequestParam("file") MultipartFile file,
            @RequestParam("editRequest") String editRequestJson) throws Exception {
        EditRequest request = objectMapper.readValue(editRequestJson, EditRequest.class);
        byte[] result = editorService.applyEdit(file.getBytes(), request);
        return pdfResponse(result);
    }

    @PostMapping("/add-image")
    public ResponseEntity<byte[]> addImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("image") MultipartFile image,
            @RequestParam("pageNumber") int pageNumber,
            @RequestParam(value = "x", defaultValue = "100") float x,
            @RequestParam(value = "y", defaultValue = "100") float y,
            @RequestParam(value = "width", defaultValue = "0") float width,
            @RequestParam(value = "height", defaultValue = "0") float height) throws Exception {
        byte[] result = editorService.addImage(file.getBytes(), pageNumber,
                image.getBytes(), image.getOriginalFilename(), x, y, width, height);
        return pdfResponse(result);
    }

    @PostMapping("/analyze")
    public ResponseEntity<List<PageAnalysisResponse>> analyzeAll(
            @RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(editorService.analyzeAllPages(file.getBytes()));
    }

    @PostMapping("/analyze-page")
    public ResponseEntity<PageAnalysisResponse> analyzePage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pageNumber") int pageNumber) throws Exception {
        return ResponseEntity.ok(editorService.analyzePage(file.getBytes(), pageNumber));
    }

    @PostMapping("/find")
    public ResponseEntity<List<Map<String, Object>>> find(
            @RequestParam("file") MultipartFile file,
            @RequestParam("searchText") String searchText,
            @RequestParam(value = "caseSensitive", defaultValue = "false") boolean caseSensitive) throws Exception {
        return ResponseEntity.ok(editorService.find(file.getBytes(), searchText, caseSensitive));
    }

    @PostMapping("/replace-all")
    public ResponseEntity<byte[]> replaceAll(
            @RequestParam("file") MultipartFile file,
            @RequestParam("searchText") String searchText,
            @RequestParam("replaceText") String replaceText,
            @RequestParam(value = "caseSensitive", defaultValue = "false") boolean caseSensitive) throws Exception {
        byte[] result = editorService.replaceAll(file.getBytes(), searchText, replaceText, caseSensitive);
        return pdfResponse(result);
    }

    @PostMapping("/ocr-page")
    public ResponseEntity<EditorService.OcrResult> ocrPage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("pageNumber") int pageNumber) throws Exception {
        return ResponseEntity.ok(editorService.ocrPage(file.getBytes(), pageNumber));
    }

    @PostMapping("/ocr-all")
    public ResponseEntity<List<EditorService.OcrResult>> ocrAll(
            @RequestParam("file") MultipartFile file) throws Exception {
        return ResponseEntity.ok(editorService.ocrAllPages(file.getBytes()));
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] bytes) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"document.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(bytes.length)
                .body(bytes);
    }
}
