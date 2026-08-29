package com.pdfplatform.document.service;

import com.pdfplatform.config.AppProperties;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Service
public class PdfValidationService {

    private final AppProperties appProperties;

    public PdfValidationService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public ValidationResult validate(MultipartFile file, boolean isGuest) {
        int maxSizeMb = isGuest
                ? appProperties.getGuest().getMaxFileSizeMb()
                : appProperties.getUpload().getMaxFileSizeMb();

        if (file.isEmpty()) {
            return ValidationResult.invalid("File is empty");
        }

        if (file.getSize() > (long) maxSizeMb * 1024 * 1024) {
            return ValidationResult.invalid("File exceeds maximum size of " + maxSizeMb + "MB");
        }

        try (InputStream is = file.getInputStream()) {
            byte[] header = new byte[5];
            int read = is.read(header);
            if (read < 5 || header[0] != '%' || header[1] != 'P' || header[2] != 'D' || header[3] != 'F' || header[4] != '-') {
                return ValidationResult.invalid("File is not a valid PDF");
            }
        } catch (IOException e) {
            return ValidationResult.invalid("Cannot read file");
        }

        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            int pageCount = doc.getNumberOfPages();
            if (pageCount == 0) {
                return ValidationResult.invalid("PDF has no pages");
            }
            if (pageCount > appProperties.getUpload().getMaxPages()) {
                return ValidationResult.invalid("PDF exceeds maximum of " + appProperties.getUpload().getMaxPages() + " pages");
            }

            boolean encrypted = doc.isEncrypted();
            String version = String.valueOf(doc.getVersion());

            return ValidationResult.valid(pageCount, encrypted, version);
        } catch (IOException e) {
            return ValidationResult.invalid("Cannot parse PDF: file may be corrupted");
        }
    }

    public record ValidationResult(
            boolean valid,
            String error,
            int pageCount,
            boolean encrypted,
            String pdfVersion
    ) {
        public static ValidationResult valid(int pageCount, boolean encrypted, String pdfVersion) {
            return new ValidationResult(true, null, pageCount, encrypted, pdfVersion);
        }

        public static ValidationResult invalid(String error) {
            return new ValidationResult(false, error, 0, false, null);
        }
    }
}
