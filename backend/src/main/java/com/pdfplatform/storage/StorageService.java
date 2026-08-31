package com.pdfplatform.storage;

import com.pdfplatform.config.AppProperties;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.util.Base64;

@Service
public class StorageService {

    private final AppProperties appProperties;
    private Path basePath;

    public StorageService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @PostConstruct
    public void init() throws IOException {
        this.basePath = Paths.get(appProperties.getStorage().getBasePath()).toAbsolutePath().normalize();
        Files.createDirectories(basePath);
    }

    public void upload(String key, InputStream inputStream, long contentLength, String contentType) {
        try {
            Path filePath = basePath.resolve(key);
            Files.createDirectories(filePath.getParent());
            Files.copy(inputStream, filePath, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file: " + key, e);
        }
    }

    public InputStream download(String key) {
        try {
            Path filePath = basePath.resolve(key);
            return new FileInputStream(filePath.toFile());
        } catch (FileNotFoundException e) {
            throw new RuntimeException("File not found: " + key, e);
        }
    }

    public void delete(String key) {
        try {
            Path filePath = basePath.resolve(key);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            throw new RuntimeException("Failed to delete file: " + key, e);
        }
    }

    public String generatePresignedDownloadUrl(String key, Duration duration) {
        String encodedKey = Base64.getUrlEncoder().withoutPadding().encodeToString(key.getBytes());
        return "/api/storage/files/" + encodedKey;
    }

    public Path resolve(String key) {
        Path resolved = basePath.resolve(key).normalize();
        if (!resolved.startsWith(basePath)) {
            throw new IllegalArgumentException("Invalid storage key");
        }
        return resolved;
    }

    public Path getBasePath() {
        return basePath;
    }

    public String buildStorageKey(String... parts) {
        return String.join("/", parts);
    }
}
