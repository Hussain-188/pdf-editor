package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ExportService {

    private final StorageService storageService;

    public ExportService(StorageService storageService) {
        this.storageService = storageService;
    }

    public String exportAsPdf(Document doc, ExportOptions options) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        byte[] pdfBytes = storageService.download(key).readAllBytes();

        if (options.pageRange() != null && !options.pageRange().isEmpty()) {
            pdfBytes = extractPages(pdfBytes, options.pageRange());
        }

        String exportId = UUID.randomUUID().toString();
        String exportKey = doc.getStorageKeyOriginal()
                .replace("original.pdf", "exports/" + exportId + ".pdf");

        storageService.upload(exportKey, new ByteArrayInputStream(pdfBytes), pdfBytes.length, "application/pdf");
        return storageService.generatePresignedDownloadUrl(exportKey, Duration.ofMinutes(30));
    }

    public String exportAsImages(Document doc, String format, int dpi, List<Integer> pages) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        byte[] pdfBytes = storageService.download(key).readAllBytes();

        List<byte[]> images = renderPagesToImages(pdfBytes, format, dpi, pages);

        if (images.size() == 1) {
            String exportKey = doc.getStorageKeyOriginal()
                    .replace("original.pdf", "exports/page." + format);
            storageService.upload(exportKey, new ByteArrayInputStream(images.get(0)),
                    images.get(0).length, "image/" + format);
            return storageService.generatePresignedDownloadUrl(exportKey, Duration.ofMinutes(30));
        }

        ByteArrayOutputStream zipOut = new ByteArrayOutputStream();
        try (java.util.zip.ZipOutputStream zos = new java.util.zip.ZipOutputStream(zipOut)) {
            for (int i = 0; i < images.size(); i++) {
                int pageNum = pages != null ? pages.get(i) : i + 1;
                zos.putNextEntry(new java.util.zip.ZipEntry("page-" + pageNum + "." + format));
                zos.write(images.get(i));
                zos.closeEntry();
            }
        }

        byte[] zipBytes = zipOut.toByteArray();
        String exportKey = doc.getStorageKeyOriginal()
                .replace("original.pdf", "exports/pages.zip");
        storageService.upload(exportKey, new ByteArrayInputStream(zipBytes), zipBytes.length, "application/zip");
        return storageService.generatePresignedDownloadUrl(exportKey, Duration.ofMinutes(30));
    }

    private byte[] extractPages(byte[] pdfBytes, List<Integer> pageNumbers) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes)) {
            PDDocument result = new PDDocument();
            for (int page : pageNumbers) {
                if (page >= 1 && page <= source.getNumberOfPages()) {
                    result.importPage(source.getPage(page - 1));
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            result.save(out);
            result.close();
            return out.toByteArray();
        }
    }

    private List<byte[]> renderPagesToImages(byte[] pdfBytes, String format, int dpi, List<Integer> pages)
            throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            List<byte[]> images = new ArrayList<>();

            List<Integer> pageList = pages;
            if (pageList == null || pageList.isEmpty()) {
                pageList = new ArrayList<>();
                for (int i = 1; i <= doc.getNumberOfPages(); i++) {
                    pageList.add(i);
                }
            }

            for (int page : pageList) {
                BufferedImage img = renderer.renderImageWithDPI(page - 1, dpi);
                ByteArrayOutputStream imgOut = new ByteArrayOutputStream();
                ImageIO.write(img, format, imgOut);
                images.add(imgOut.toByteArray());
            }
            return images;
        }
    }

    public record ExportOptions(
            List<Integer> pageRange,
            boolean flattenAnnotations,
            String imageFormat,
            int imageDpi
    ) {
        public ExportOptions() {
            this(null, true, "png", 150);
        }
    }
}
