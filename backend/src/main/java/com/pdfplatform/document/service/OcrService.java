package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Service
public class OcrService {

    private final StorageService storageService;
    private final DocumentRepository documentRepository;

    public OcrService(StorageService storageService, DocumentRepository documentRepository) {
        this.storageService = storageService;
        this.documentRepository = documentRepository;
    }

    public boolean isScannedPage(byte[] pdfBytes, int pageNumber) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDPage page = doc.getPage(pageNumber - 1);
            String text = new org.apache.pdfbox.text.PDFTextStripper() {{
                setStartPage(pageNumber);
                setEndPage(pageNumber);
            }}.getText(doc).trim();
            boolean hasImages = !page.getResources().getXObjectNames().iterator().hasNext()
                    ? false
                    : true;
            return text.length() < 20 && hasImages;
        }
    }

    public OcrResult ocrPage(Document doc, int pageNumber) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        byte[] pdfBytes = storageService.download(key).readAllBytes();

        BufferedImage pageImage = renderPageAsImage(pdfBytes, pageNumber, 300);

        Path tempDir = Files.createTempDirectory("ocr-");
        Path imagePath = tempDir.resolve("page.png");
        Path outputBase = tempDir.resolve("output");
        ImageIO.write(pageImage, "png", imagePath.toFile());

        try {
            return runTesseract(imagePath, outputBase, pageNumber);
        } finally {
            deleteDir(tempDir);
        }
    }

    public List<OcrResult> ocrAllPages(Document doc) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        byte[] pdfBytes = storageService.download(key).readAllBytes();
        List<OcrResult> results = new ArrayList<>();

        try (PDDocument pdfDoc = Loader.loadPDF(pdfBytes)) {
            for (int i = 1; i <= pdfDoc.getNumberOfPages(); i++) {
                if (isScannedPage(pdfBytes, i)) {
                    BufferedImage img = renderPageAsImage(pdfBytes, i, 300);
                    Path tempDir = Files.createTempDirectory("ocr-");
                    Path imagePath = tempDir.resolve("page.png");
                    Path outputBase = tempDir.resolve("output");
                    ImageIO.write(img, "png", imagePath.toFile());
                    try {
                        results.add(runTesseract(imagePath, outputBase, i));
                    } finally {
                        deleteDir(tempDir);
                    }
                }
            }
        }

        if (!results.isEmpty()) {
            doc.setScanned(true);
            documentRepository.save(doc);
        }
        return results;
    }

    private BufferedImage renderPageAsImage(byte[] pdfBytes, int pageNumber, int dpi) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            return renderer.renderImageWithDPI(pageNumber - 1, dpi);
        }
    }

    private OcrResult runTesseract(Path imagePath, Path outputBase, int pageNumber) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(
                "tesseract",
                imagePath.toString(),
                outputBase.toString(),
                "--oem", "3",
                "--psm", "3",
                "tsv"
        );
        pb.redirectErrorStream(true);
        Process process = pb.start();

        try {
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                String stderr = new String(process.getInputStream().readAllBytes());
                return new OcrResult(pageNumber, "", List.of(),
                        "Tesseract failed (exit " + exitCode + "): " + stderr);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new OcrResult(pageNumber, "", List.of(), "OCR interrupted");
        }

        Path tsvPath = Path.of(outputBase + ".tsv");
        List<OcrWord> words = new ArrayList<>();
        StringBuilder fullText = new StringBuilder();

        if (Files.exists(tsvPath)) {
            List<String> lines = Files.readAllLines(tsvPath);
            for (int i = 1; i < lines.size(); i++) {
                String[] cols = lines.get(i).split("\t", -1);
                if (cols.length >= 12) {
                    String text = cols[11].trim();
                    if (text.isEmpty() || cols[6].equals("-1")) continue;
                    try {
                        int left = Integer.parseInt(cols[6]);
                        int top = Integer.parseInt(cols[7]);
                        int width = Integer.parseInt(cols[8]);
                        int height = Integer.parseInt(cols[9]);
                        float confidence = Float.parseFloat(cols[10]);

                        words.add(new OcrWord(text, left / 300.0 * 72,
                                top / 300.0 * 72, width / 300.0 * 72,
                                height / 300.0 * 72, confidence));
                        fullText.append(text).append(" ");
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        return new OcrResult(pageNumber, fullText.toString().trim(), words, null);
    }

    private void deleteDir(Path dir) {
        try {
            Files.walk(dir)
                    .sorted(java.util.Comparator.reverseOrder())
                    .forEach(p -> {
                        try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                    });
        } catch (IOException ignored) {}
    }

    public record OcrResult(int pageNumber, String text, List<OcrWord> words, String error) {
        public boolean isSuccess() { return error == null; }
    }

    public record OcrWord(String text, double x, double y, double width, double height, float confidence) {}
}
