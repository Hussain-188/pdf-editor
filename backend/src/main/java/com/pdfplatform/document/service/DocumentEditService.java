package com.pdfplatform.document.service;

import com.pdfplatform.document.dto.EditRequest;
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
import java.util.List;

@Service
public class DocumentEditService {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final ContentStreamEditor contentStreamEditor;
    private final ContentStreamParser contentStreamParser;
    private final TextBlockExtractor textBlockExtractor;

    public DocumentEditService(DocumentRepository documentRepository,
                                StorageService storageService,
                                ContentStreamEditor contentStreamEditor,
                                ContentStreamParser contentStreamParser,
                                TextBlockExtractor textBlockExtractor) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.contentStreamEditor = contentStreamEditor;
        this.contentStreamParser = contentStreamParser;
        this.textBlockExtractor = textBlockExtractor;
    }

    @Transactional
    public Document applyEdit(Document doc, EditRequest request) throws IOException {
        String currentKey = doc.getStorageKeyCurrent() != null
                ? doc.getStorageKeyCurrent()
                : doc.getStorageKeyOriginal();

        byte[] pdfBytes;
        try (InputStream is = storageService.download(currentKey)) {
            pdfBytes = is.readAllBytes();
        }

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            int pageIndex = request.pageNumber() - 1;
            PDPage page = document.getPage(pageIndex);

            List<TextRun> runs = contentStreamParser.parse(page);
            List<TextBlock> blocks = textBlockExtractor.extract(runs, page);

            TextBlock targetBlock = findTargetBlock(blocks, request);
            if (targetBlock == null) {
                throw new IllegalArgumentException("Target text block not found on page " + request.pageNumber());
            }

            switch (request.operation()) {
                case "TEXT_REPLACE":
                    contentStreamEditor.replaceText(document, pageIndex, targetBlock, request.oldText(), request.newText());
                    break;
                case "FONT_SIZE_CHANGE":
                    if (request.fontSize() != null) {
                        contentStreamEditor.changeFontSize(document, pageIndex, targetBlock, request.fontSize().floatValue());
                    }
                    break;
                case "TEXT_COLOR_CHANGE":
                    if (request.color() != null && request.color().length == 3) {
                        contentStreamEditor.changeTextColor(document, pageIndex, targetBlock,
                                (float) request.color()[0], (float) request.color()[1], (float) request.color()[2]);
                    }
                    break;
                default:
                    throw new IllegalArgumentException("Unknown operation: " + request.operation());
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            document.save(baos);
            byte[] editedBytes = baos.toByteArray();

            String editedKey = currentKey.contains("original.pdf")
                    ? currentKey.replace("original.pdf", "current.pdf")
                    : currentKey;

            storageService.upload(editedKey, new ByteArrayInputStream(editedBytes), editedBytes.length, "application/pdf");

            doc.setStorageKeyCurrent(editedKey);
            doc.setLastEditedAt(Instant.now());
            return documentRepository.save(doc);
        }
    }

    private TextBlock findTargetBlock(List<TextBlock> blocks, EditRequest request) {
        if (request.textBlockId() != null) {
            return blocks.stream()
                    .filter(b -> b.getId().equals(request.textBlockId()))
                    .findFirst()
                    .orElse(null);
        }
        if (request.oldText() != null) {
            return blocks.stream()
                    .filter(b -> b.getFullText().contains(request.oldText()))
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }
}
