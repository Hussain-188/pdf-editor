package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.engine.editor.ContentStreamEditor;
import com.pdfplatform.engine.extractor.TextBlockExtractor;
import com.pdfplatform.engine.model.TextBlock;
import com.pdfplatform.engine.model.TextRun;
import com.pdfplatform.engine.parser.ContentStreamParser;
import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class FindReplaceService {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final ContentStreamParser contentStreamParser;
    private final TextBlockExtractor textBlockExtractor;
    private final ContentStreamEditor contentStreamEditor;

    public FindReplaceService(DocumentRepository documentRepository, StorageService storageService,
                               ContentStreamParser contentStreamParser, TextBlockExtractor textBlockExtractor,
                               ContentStreamEditor contentStreamEditor) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.contentStreamParser = contentStreamParser;
        this.textBlockExtractor = textBlockExtractor;
        this.contentStreamEditor = contentStreamEditor;
    }

    public List<Map<String, Object>> find(Document doc, String searchText, boolean caseSensitive) throws IOException {
        byte[] pdfBytes = loadPdfBytes(doc);
        List<Map<String, Object>> results = new ArrayList<>();

        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            for (int i = 0; i < pdf.getNumberOfPages(); i++) {
                PDPage page = pdf.getPage(i);
                List<TextRun> runs = contentStreamParser.parse(page);
                List<TextBlock> blocks = textBlockExtractor.extract(runs, page, i + 1);

                for (TextBlock block : blocks) {
                    String blockText = block.getFullText();
                    String searchIn = caseSensitive ? blockText : blockText.toLowerCase();
                    String searchFor = caseSensitive ? searchText : searchText.toLowerCase();

                    if (searchIn.contains(searchFor)) {
                        results.add(Map.of(
                                "pageNumber", i + 1,
                                "blockId", block.getId(),
                                "text", blockText,
                                "x", block.getX(),
                                "y", block.getY(),
                                "width", block.getWidth(),
                                "height", block.getHeight()
                        ));
                    }
                }
            }
        }
        return results;
    }

    @Transactional
    public Document replaceAll(Document doc, String searchText, String replaceText,
                                boolean caseSensitive) throws IOException {
        byte[] pdfBytes = loadPdfBytes(doc);
        int replaceCount = 0;

        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            for (int i = 0; i < pdf.getNumberOfPages(); i++) {
                PDPage page = pdf.getPage(i);
                List<TextRun> runs = contentStreamParser.parse(page);
                List<TextBlock> blocks = textBlockExtractor.extract(runs, page, i + 1);

                for (TextBlock block : blocks) {
                    String blockText = block.getFullText();
                    String searchIn = caseSensitive ? blockText : blockText.toLowerCase();
                    String searchFor = caseSensitive ? searchText : searchText.toLowerCase();

                    if (searchIn.contains(searchFor)) {
                        String newText;
                        if (caseSensitive) {
                            newText = blockText.replace(searchText, replaceText);
                        } else {
                            newText = blockText.replaceAll("(?i)" + java.util.regex.Pattern.quote(searchText), java.util.regex.Matcher.quoteReplacement(replaceText));
                        }
                        try {
                            boolean replaced = contentStreamEditor.replaceText(pdf, i, block, blockText, newText);
                            if (replaced) replaceCount++;
                        } catch (Exception e) {
                            // Skip blocks that can't be replaced
                        }
                    }
                }
            }

            if (replaceCount == 0) {
                throw new IllegalArgumentException("No replacements could be made");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            pdf.save(out);
            byte[] bytes = out.toByteArray();

            String editedKey = doc.getStorageKeyOriginal().replace("original.pdf", "current.pdf");
            storageService.upload(editedKey, new ByteArrayInputStream(bytes), bytes.length, "application/pdf");

            doc.setStorageKeyCurrent(editedKey);
            doc.setLastEditedAt(Instant.now());
            return documentRepository.save(doc);
        }
    }

    private byte[] loadPdfBytes(Document doc) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        try (InputStream is = storageService.download(key)) {
            return is.readAllBytes();
        }
    }
}
