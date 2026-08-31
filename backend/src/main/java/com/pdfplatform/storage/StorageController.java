package com.pdfplatform.storage;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

@RestController
@RequestMapping("/api/storage")
public class StorageController {

    private final StorageService storageService;

    public StorageController(StorageService storageService) {
        this.storageService = storageService;
    }

    @GetMapping("/files/{encodedKey}")
    public ResponseEntity<Resource> serveFile(@PathVariable String encodedKey) {
        String key = new String(Base64.getUrlDecoder().decode(encodedKey));

        Path filePath;
        try {
            filePath = storageService.resolve(key);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new FileSystemResource(filePath);
        String contentType = guessContentType(key);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                .body(resource);
    }

    private String guessContentType(String key) {
        if (key.endsWith(".pdf")) return MediaType.APPLICATION_PDF_VALUE;
        if (key.endsWith(".png")) return MediaType.IMAGE_PNG_VALUE;
        if (key.endsWith(".jpg") || key.endsWith(".jpeg")) return MediaType.IMAGE_JPEG_VALUE;
        if (key.endsWith(".zip")) return "application/zip";
        return MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }
}
