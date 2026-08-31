package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageFitDestination;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDDocumentOutline;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDOutlineItem;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.outline.PDOutlineNode;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class BookmarkService {

    public List<Map<String, Object>> getBookmarks(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDDocumentOutline outline = doc.getDocumentCatalog().getDocumentOutline();
            if (outline == null) return List.of();

            List<Map<String, Object>> result = new ArrayList<>();
            collectBookmarks(doc, outline, result, 0);
            return result;
        }
    }

    private void collectBookmarks(PDDocument doc, PDOutlineNode node, List<Map<String, Object>> result, int level) throws IOException {
        PDOutlineItem item = node.getFirstChild();
        while (item != null) {
            Map<String, Object> bookmark = new LinkedHashMap<>();
            bookmark.put("title", item.getTitle());
            bookmark.put("level", level);

            int pageNumber = -1;
            if (item.getDestination() instanceof PDPageDestination pageDest) {
                PDPage page = pageDest.getPage();
                if (page != null) {
                    pageNumber = doc.getPages().indexOf(page) + 1;
                } else {
                    pageNumber = pageDest.retrievePageNumber() + 1;
                }
            }
            bookmark.put("pageNumber", pageNumber);
            result.add(bookmark);

            if (item.hasChildren()) {
                collectBookmarks(doc, item, result, level + 1);
            }
            item = item.getNextSibling();
        }
    }

    public byte[] addBookmark(byte[] pdfBytes, String title, int pageNumber) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            if (pageNumber < 1 || pageNumber > doc.getNumberOfPages()) {
                throw new IllegalArgumentException("Page number out of range: " + pageNumber);
            }

            PDDocumentOutline outline = doc.getDocumentCatalog().getDocumentOutline();
            if (outline == null) {
                outline = new PDDocumentOutline();
                doc.getDocumentCatalog().setDocumentOutline(outline);
            }

            PDOutlineItem item = new PDOutlineItem();
            item.setTitle(title);
            PDPageFitDestination dest = new PDPageFitDestination();
            dest.setPage(doc.getPage(pageNumber - 1));
            item.setDestination(dest);
            outline.addLast(item);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public byte[] removeAllBookmarks(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            doc.getDocumentCatalog().setDocumentOutline(null);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
