package com.pdfplatform.document.service;

import com.pdfplatform.document.dto.PageAnalysisResponse;
import com.pdfplatform.document.dto.PageAnalysisResponse.*;
import com.pdfplatform.engine.extractor.TextBlockExtractor;
import com.pdfplatform.engine.model.TextBlock;
import com.pdfplatform.engine.model.TextRun;
import com.pdfplatform.engine.parser.ContentStreamParser;
import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class TextAnalysisService {

    private final StorageService storageService;
    private final ContentStreamParser contentStreamParser;
    private final TextBlockExtractor textBlockExtractor;

    public TextAnalysisService(StorageService storageService,
                                ContentStreamParser contentStreamParser,
                                TextBlockExtractor textBlockExtractor) {
        this.storageService = storageService;
        this.contentStreamParser = contentStreamParser;
        this.textBlockExtractor = textBlockExtractor;
    }

    public PageAnalysisResponse analyzePage(String storageKey, int pageNumber) throws IOException {
        try (InputStream is = storageService.download(storageKey)) {
            byte[] pdfBytes = is.readAllBytes();
            try (PDDocument document = Loader.loadPDF(pdfBytes)) {
                if (pageNumber < 1 || pageNumber > document.getNumberOfPages()) {
                    throw new IllegalArgumentException("Invalid page number: " + pageNumber);
                }

                PDPage page = document.getPage(pageNumber - 1);
                PDRectangle mediaBox = page.getMediaBox();

                List<TextRun> runs = contentStreamParser.parse(page);
                List<TextBlock> blocks = textBlockExtractor.extract(runs, page, pageNumber);

                List<TextBlockDto> blockDtos = new ArrayList<>();
                for (TextBlock block : blocks) {
                    blockDtos.add(toDto(block));
                }

                return new PageAnalysisResponse(
                        pageNumber,
                        mediaBox.getWidth(),
                        mediaBox.getHeight(),
                        blockDtos
                );
            }
        }
    }

    public List<PageAnalysisResponse> analyzeAllPages(String storageKey) throws IOException {
        try (InputStream is = storageService.download(storageKey)) {
            byte[] pdfBytes = is.readAllBytes();
            try (PDDocument document = Loader.loadPDF(pdfBytes)) {
                List<PageAnalysisResponse> results = new ArrayList<>();
                for (int i = 0; i < document.getNumberOfPages(); i++) {
                    PDPage page = document.getPage(i);
                    PDRectangle mediaBox = page.getMediaBox();

                    List<TextRun> runs = contentStreamParser.parse(page);
                    List<TextBlock> blocks = textBlockExtractor.extract(runs, page, i + 1);

                    List<TextBlockDto> blockDtos = new ArrayList<>();
                    for (TextBlock block : blocks) {
                        blockDtos.add(toDto(block));
                    }

                    results.add(new PageAnalysisResponse(
                            i + 1,
                            mediaBox.getWidth(),
                            mediaBox.getHeight(),
                            blockDtos
                    ));
                }
                return results;
            }
        }
    }

    private TextBlockDto toDto(TextBlock block) {
        List<TextRunDto> runDtos = new ArrayList<>();
        for (TextRun run : block.getRuns()) {
            runDtos.add(new TextRunDto(
                    run.getText(),
                    run.getX(),
                    run.getY(),
                    run.getWidth(),
                    run.getFontSize(),
                    run.getFontName(),
                    run.getContentStreamIndex(),
                    run.getOperatorIndex(),
                    run.getOperatorType() != null ? run.getOperatorType().name() : null
            ));
        }

        TextBlock.EditabilityInfo edit = block.getEditability();
        EditabilityDto editDto = new EditabilityDto(
                edit.canEdit(),
                edit.canAddCharacters(),
                edit.canChangeFont(),
                edit.reason(),
                edit.confidence()
        );

        double[] color = block.getColor() != null
                ? new double[]{block.getColor()[0], block.getColor()[1], block.getColor()[2]}
                : new double[]{0, 0, 0};

        return new TextBlockDto(
                block.getId(),
                block.getFullText(),
                block.getX(),
                block.getY(),
                block.getWidth(),
                block.getHeight(),
                block.getFontName(),
                block.getFontSize(),
                color,
                editDto,
                runDtos
        );
    }
}
