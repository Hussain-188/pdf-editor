package com.pdfplatform.tools.controller;

import com.pdfplatform.tools.service.CompressService;
import com.pdfplatform.tools.service.PageNumberService;
import com.pdfplatform.tools.service.ProtectService;
import com.pdfplatform.tools.service.WatermarkService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/tools")
public class ToolsController {

    private final CompressService compressService;
    private final WatermarkService watermarkService;
    private final ProtectService protectService;
    private final PageNumberService pageNumberService;

    public ToolsController(CompressService compressService, WatermarkService watermarkService,
                           ProtectService protectService, PageNumberService pageNumberService) {
        this.compressService = compressService;
        this.watermarkService = watermarkService;
        this.protectService = protectService;
        this.pageNumberService = pageNumberService;
    }

    @PostMapping("/compress")
    public ResponseEntity<byte[]> compress(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "0.5") float quality) throws IOException {
        byte[] result = compressService.compress(file.getBytes(), quality);
        return pdfResponse(result, "compressed.pdf");
    }

    @PostMapping("/watermark")
    public ResponseEntity<byte[]> watermark(
            @RequestParam("file") MultipartFile file,
            @RequestParam String text,
            @RequestParam(defaultValue = "0.3") float opacity,
            @RequestParam(defaultValue = "45") float rotation,
            @RequestParam(defaultValue = "48") float fontSize) throws IOException {
        byte[] result = watermarkService.addWatermark(file.getBytes(), text, opacity, rotation, fontSize);
        return pdfResponse(result, "watermarked.pdf");
    }

    @PostMapping("/protect")
    public ResponseEntity<byte[]> protect(
            @RequestParam("file") MultipartFile file,
            @RequestParam String password,
            @RequestParam(required = false) String ownerPassword,
            @RequestParam(defaultValue = "true") boolean allowPrint,
            @RequestParam(defaultValue = "false") boolean allowCopy) throws IOException {
        byte[] result = protectService.protect(file.getBytes(), password, ownerPassword, allowPrint, allowCopy);
        return pdfResponse(result, "protected.pdf");
    }

    @PostMapping("/unlock")
    public ResponseEntity<byte[]> unlock(
            @RequestParam("file") MultipartFile file,
            @RequestParam String password) throws IOException {
        byte[] result = protectService.unlock(file.getBytes(), password);
        return pdfResponse(result, "unlocked.pdf");
    }

    @PostMapping("/page-numbers")
    public ResponseEntity<byte[]> addPageNumbers(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "bottom-center") String position,
            @RequestParam(defaultValue = "1") int startFrom,
            @RequestParam(defaultValue = "10") float fontSize) throws IOException {
        byte[] result = pageNumberService.addPageNumbers(file.getBytes(), position, startFrom, fontSize);
        return pdfResponse(result, "numbered.pdf");
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] data, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(data.length)
                .body(data);
    }
}
