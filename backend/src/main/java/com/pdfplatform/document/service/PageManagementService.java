package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.List;

@Service
public class PageManagementService {

    private final StorageService storageService;
    private final DocumentRepository documentRepository;
    private final ThumbnailService thumbnailService;

    public PageManagementService(StorageService storageService, DocumentRepository documentRepository,
                                  ThumbnailService thumbnailService) {
        this.storageService = storageService;
        this.documentRepository = documentRepository;
        this.thumbnailService = thumbnailService;
    }

    @Transactional
    public Document rotatePage(Document doc, int pageNumber, int degrees) throws IOException {
        try (PDDocument pdf = loadPdf(doc)) {
            validatePageNumber(pdf, pageNumber);
            PDPage page = pdf.getPage(pageNumber - 1);
            int current = page.getRotation();
            page.setRotation((current + degrees) % 360);
            return savePdf(doc, pdf);
        }
    }

    @Transactional
    public Document deletePage(Document doc, int pageNumber) throws IOException {
        try (PDDocument pdf = loadPdf(doc)) {
            validatePageNumber(pdf, pageNumber);
            if (pdf.getNumberOfPages() <= 1) {
                throw new IllegalArgumentException("Cannot delete the only page");
            }
            pdf.removePage(pageNumber - 1);
            return savePdf(doc, pdf);
        }
    }

    @Transactional
    public Document duplicatePage(Document doc, int pageNumber) throws IOException {
        try (PDDocument pdf = loadPdf(doc)) {
            validatePageNumber(pdf, pageNumber);
            PDPage original = pdf.getPage(pageNumber - 1);
            pdf.importPage(original);

            PDDocument temp = new PDDocument();
            temp.importPage(original);
            ByteArrayOutputStream tempOut = new ByteArrayOutputStream();
            temp.save(tempOut);
            temp.close();

            PDDocument tempDoc = Loader.loadPDF(tempOut.toByteArray());
            PDPage cloned = tempDoc.getPage(0);

            PDDocument finalDoc = loadPdf(doc);
            finalDoc.getPages().insertAfter(cloned, finalDoc.getPage(pageNumber - 1));
            Document result = savePdf(doc, finalDoc);
            finalDoc.close();
            tempDoc.close();
            return result;
        }
    }

    @Transactional
    public Document insertBlankPage(Document doc, int afterPageNumber) throws IOException {
        try (PDDocument pdf = loadPdf(doc)) {
            if (afterPageNumber < 0 || afterPageNumber > pdf.getNumberOfPages()) {
                throw new IllegalArgumentException("Invalid page position");
            }
            PDPage blankPage = new PDPage(PDRectangle.A4);
            if (afterPageNumber == 0) {
                pdf.getPages().insertBefore(blankPage, pdf.getPage(0));
            } else {
                pdf.getPages().insertAfter(blankPage, pdf.getPage(afterPageNumber - 1));
            }
            return savePdf(doc, pdf);
        }
    }

    @Transactional
    public Document reorderPages(Document doc, List<Integer> newOrder) throws IOException {
        try (PDDocument pdf = loadPdf(doc)) {
            int numPages = pdf.getNumberOfPages();
            if (newOrder.size() != numPages) {
                throw new IllegalArgumentException("New order must include all pages");
            }
            for (int p : newOrder) {
                if (p < 1 || p > numPages) {
                    throw new IllegalArgumentException("Invalid page number: " + p);
                }
            }

            PDDocument reordered = new PDDocument();
            for (int pageNum : newOrder) {
                PDPage page = pdf.getPage(pageNum - 1);
                reordered.importPage(page);
            }
            Document result = savePdf(doc, reordered);
            reordered.close();
            return result;
        }
    }

    @Transactional
    public List<byte[]> splitDocument(Document doc, List<List<Integer>> pageGroups) throws IOException {
        try (PDDocument pdf = loadPdf(doc)) {
            return pageGroups.stream().map(group -> {
                try {
                    PDDocument part = new PDDocument();
                    for (int pageNum : group) {
                        part.importPage(pdf.getPage(pageNum - 1));
                    }
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    part.save(out);
                    part.close();
                    return out.toByteArray();
                } catch (IOException e) {
                    throw new RuntimeException("Failed to split PDF", e);
                }
            }).toList();
        }
    }

    @Transactional
    public Document mergeDocuments(Document targetDoc, List<Document> sourceDocs) throws IOException {
        try (PDDocument target = loadPdf(targetDoc)) {
            for (Document sourceDoc : sourceDocs) {
                try (PDDocument source = loadPdf(sourceDoc)) {
                    for (int i = 0; i < source.getNumberOfPages(); i++) {
                        target.importPage(source.getPage(i));
                    }
                }
            }
            return savePdf(targetDoc, target);
        }
    }

    private PDDocument loadPdf(Document doc) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        InputStream is = storageService.download(key);
        return Loader.loadPDF(is.readAllBytes());
    }

    private Document savePdf(Document doc, PDDocument pdf) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        pdf.save(out);
        byte[] bytes = out.toByteArray();

        String currentKey = doc.getStorageKeyOriginal().replace("original.pdf", "current.pdf");
        storageService.upload(currentKey, new ByteArrayInputStream(bytes), bytes.length, "application/pdf");

        doc.setStorageKeyCurrent(currentKey);
        doc.setPageCount(pdf.getNumberOfPages());
        doc.setFileSizeBytes(bytes.length);
        doc.setLastEditedAt(Instant.now());

        regenerateThumbnail(doc, bytes);
        return documentRepository.save(doc);
    }

    private void regenerateThumbnail(Document doc, byte[] pdfBytes) {
        try {
            String thumbnailKey = doc.getStorageKeyOriginal().replace("original.pdf", "thumbnails/cover.png");
            thumbnailService.generateAndStore(new ByteArrayInputStream(pdfBytes), thumbnailKey);
            doc.setThumbnailKey(thumbnailKey);
        } catch (IOException e) {
            // Non-critical
        }
    }

    private void validatePageNumber(PDDocument pdf, int pageNumber) {
        if (pageNumber < 1 || pageNumber > pdf.getNumberOfPages()) {
            throw new IllegalArgumentException("Invalid page number: " + pageNumber);
        }
    }
}
