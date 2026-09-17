package com.pdfplatform.editor.service;

import com.pdfplatform.editor.dto.EditRequest;
import com.pdfplatform.editor.dto.PageAnalysisResponse;
import com.pdfplatform.editor.dto.PageAnalysisResponse.*;
import com.pdfplatform.engine.editor.ContentStreamEditor;
import com.pdfplatform.engine.extractor.TextBlockExtractor;
import com.pdfplatform.engine.model.TextBlock;
import com.pdfplatform.engine.model.TextRun;
import com.pdfplatform.engine.parser.ContentStreamParser;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class EditorService {

    private final ContentStreamEditor contentStreamEditor;
    private final ContentStreamParser contentStreamParser;
    private final TextBlockExtractor textBlockExtractor;

    public EditorService(ContentStreamEditor contentStreamEditor,
                         ContentStreamParser contentStreamParser,
                         TextBlockExtractor textBlockExtractor) {
        this.contentStreamEditor = contentStreamEditor;
        this.contentStreamParser = contentStreamParser;
        this.textBlockExtractor = textBlockExtractor;
    }

    public byte[] rotatePage(byte[] pdfBytes, int pageNumber, int degrees) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            validatePageNumber(pdf, pageNumber);
            PDPage page = pdf.getPage(pageNumber - 1);
            page.setRotation((page.getRotation() + degrees) % 360);
            return save(pdf);
        }
    }

    public byte[] deletePage(byte[] pdfBytes, int pageNumber) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            validatePageNumber(pdf, pageNumber);
            if (pdf.getNumberOfPages() <= 1) {
                throw new IllegalArgumentException("Cannot delete the only page");
            }
            pdf.removePage(pageNumber - 1);
            return save(pdf);
        }
    }

    public byte[] duplicatePage(byte[] pdfBytes, int pageNumber) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            validatePageNumber(pdf, pageNumber);
            PDPage original = pdf.getPage(pageNumber - 1);

            byte[] tempBytes;
            try (PDDocument temp = new PDDocument()) {
                temp.importPage(original);
                ByteArrayOutputStream tempOut = new ByteArrayOutputStream();
                temp.save(tempOut);
                tempBytes = tempOut.toByteArray();
            }

            try (PDDocument tempDoc = Loader.loadPDF(tempBytes);
                 PDDocument finalDoc = Loader.loadPDF(pdfBytes)) {
                PDPage cloned = tempDoc.getPage(0);
                finalDoc.getPages().insertAfter(cloned, finalDoc.getPage(pageNumber - 1));
                return save(finalDoc);
            }
        }
    }

    public byte[] insertBlankPage(byte[] pdfBytes, int afterPageNumber) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            if (afterPageNumber < 0 || afterPageNumber > pdf.getNumberOfPages()) {
                throw new IllegalArgumentException("Invalid page position");
            }
            PDPage blankPage = new PDPage(PDRectangle.A4);
            if (afterPageNumber == 0) {
                pdf.getPages().insertBefore(blankPage, pdf.getPage(0));
            } else {
                pdf.getPages().insertAfter(blankPage, pdf.getPage(afterPageNumber - 1));
            }
            return save(pdf);
        }
    }

    public byte[] reorderPages(byte[] pdfBytes, List<Integer> newOrder) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            int numPages = pdf.getNumberOfPages();
            if (newOrder.size() != numPages) {
                throw new IllegalArgumentException("New order must include all pages");
            }
            try (PDDocument reordered = new PDDocument()) {
                for (int pageNum : newOrder) {
                    reordered.importPage(pdf.getPage(pageNum - 1));
                }
                return save(reordered);
            }
        }
    }

    public byte[] applyEdit(byte[] pdfBytes, EditRequest request) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            int pageIndex = request.pageNumber() - 1;
            PDPage page = pdf.getPage(pageIndex);

            List<TextRun> runs = contentStreamParser.parse(page);
            List<TextBlock> blocks = textBlockExtractor.extract(runs, page);

            TextBlock targetBlock = findTargetBlock(blocks, request);
            if (targetBlock == null) {
                throw new IllegalArgumentException("Target text block not found on page " + request.pageNumber());
            }

            switch (request.operation()) {
                case "TEXT_REPLACE":
                    boolean replaced = contentStreamEditor.replaceText(pdf, pageIndex, targetBlock, request.oldText(), request.newText());
                    if (!replaced) {
                        throw new IllegalArgumentException("Text replacement failed");
                    }
                    break;
                case "FONT_SIZE_CHANGE":
                    if (request.fontSize() != null) {
                        contentStreamEditor.changeFontSize(pdf, pageIndex, targetBlock, request.fontSize().floatValue());
                    }
                    break;
                case "TEXT_COLOR_CHANGE":
                    if (request.color() != null && request.color().length == 3) {
                        contentStreamEditor.changeTextColor(pdf, pageIndex, targetBlock,
                                (float) request.color()[0], (float) request.color()[1], (float) request.color()[2]);
                    }
                    break;
                default:
                    throw new IllegalArgumentException("Unknown operation: " + request.operation());
            }

            return save(pdf);
        }
    }

    public byte[] addImage(byte[] pdfBytes, int pageNumber, byte[] imageBytes, String filename,
                           float x, float y, float width, float height) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDPage page = pdf.getPage(pageNumber - 1);
            PDImageXObject image = PDImageXObject.createFromByteArray(pdf, imageBytes, filename);

            if (width <= 0) width = image.getWidth();
            if (height <= 0) height = image.getHeight();

            PDRectangle mediaBox = page.getMediaBox();
            float maxW = mediaBox.getWidth() - x;
            float maxH = mediaBox.getHeight() - y;
            float scale = Math.min(maxW / width, maxH / height);
            if (scale < 1) {
                width *= scale;
                height *= scale;
            }

            try (PDPageContentStream cs = new PDPageContentStream(pdf, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                cs.drawImage(image, x, y, width, height);
            }

            return save(pdf);
        }
    }

    public PageAnalysisResponse analyzePage(byte[] pdfBytes, int pageNumber) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            validatePageNumber(pdf, pageNumber);
            PDPage page = pdf.getPage(pageNumber - 1);
            PDRectangle mediaBox = page.getMediaBox();

            List<TextRun> runs = contentStreamParser.parse(page);
            List<TextBlock> blocks = textBlockExtractor.extract(runs, page);

            return new PageAnalysisResponse(
                    pageNumber,
                    mediaBox.getWidth(),
                    mediaBox.getHeight(),
                    blocks.stream().map(this::toDto).toList()
            );
        }
    }

    public List<PageAnalysisResponse> analyzeAllPages(byte[] pdfBytes) throws IOException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            List<PageAnalysisResponse> results = new ArrayList<>();
            for (int i = 0; i < pdf.getNumberOfPages(); i++) {
                PDPage page = pdf.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();

                List<TextRun> runs = contentStreamParser.parse(page);
                List<TextBlock> blocks = textBlockExtractor.extract(runs, page);

                results.add(new PageAnalysisResponse(
                        i + 1,
                        mediaBox.getWidth(),
                        mediaBox.getHeight(),
                        blocks.stream().map(this::toDto).toList()
                ));
            }
            return results;
        }
    }

    public List<Map<String, Object>> find(byte[] pdfBytes, String searchText, boolean caseSensitive) throws IOException {
        List<Map<String, Object>> results = new ArrayList<>();
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            for (int i = 0; i < pdf.getNumberOfPages(); i++) {
                PDPage page = pdf.getPage(i);
                List<TextRun> runs = contentStreamParser.parse(page);
                List<TextBlock> blocks = textBlockExtractor.extract(runs, page);

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

    public byte[] replaceAll(byte[] pdfBytes, String searchText, String replaceText,
                             boolean caseSensitive) throws IOException {
        int replaceCount = 0;
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            for (int i = 0; i < pdf.getNumberOfPages(); i++) {
                PDPage page = pdf.getPage(i);
                List<TextRun> runs = contentStreamParser.parse(page);
                List<TextBlock> blocks = textBlockExtractor.extract(runs, page);

                for (TextBlock block : blocks) {
                    String blockText = block.getFullText();
                    String searchIn = caseSensitive ? blockText : blockText.toLowerCase();
                    String searchFor = caseSensitive ? searchText : searchText.toLowerCase();

                    if (searchIn.contains(searchFor)) {
                        String newText;
                        if (caseSensitive) {
                            newText = blockText.replace(searchText, replaceText);
                        } else {
                            newText = blockText.replaceAll("(?i)" + java.util.regex.Pattern.quote(searchText), replaceText);
                        }
                        try {
                            boolean replaced = contentStreamEditor.replaceText(pdf, i, block, blockText, newText);
                            if (replaced) replaceCount++;
                        } catch (Exception e) {
                            // skip blocks that can't be replaced
                        }
                    }
                }
            }

            if (replaceCount == 0) {
                throw new IllegalArgumentException("No replacements could be made");
            }

            return save(pdf);
        }
    }

    public OcrResult ocrPage(byte[] pdfBytes, int pageNumber) throws IOException {
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

    public List<OcrResult> ocrAllPages(byte[] pdfBytes) throws IOException {
        List<OcrResult> results = new ArrayList<>();
        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            for (int i = 1; i <= pdf.getNumberOfPages(); i++) {
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
        return results;
    }

    private boolean isScannedPage(byte[] pdfBytes, int pageNumber) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDPage page = doc.getPage(pageNumber - 1);
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setStartPage(pageNumber);
            stripper.setEndPage(pageNumber);
            String text = stripper.getText(doc).trim();
            boolean hasImages = page.getResources().getXObjectNames().iterator().hasNext();
            return text.length() < 20 && hasImages;
        }
    }

    private BufferedImage renderPageAsImage(byte[] pdfBytes, int pageNumber, int dpi) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            return renderer.renderImageWithDPI(pageNumber - 1, dpi);
        }
    }

    private OcrResult runTesseract(Path imagePath, Path outputBase, int pageNumber) throws IOException {
        ProcessBuilder pb = new ProcessBuilder(
                "tesseract", imagePath.toString(), outputBase.toString(),
                "--oem", "3", "--psm", "3", "tsv"
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
                        int w = Integer.parseInt(cols[8]);
                        int h = Integer.parseInt(cols[9]);
                        float confidence = Float.parseFloat(cols[10]);
                        words.add(new OcrWord(text, left / 300.0 * 72, top / 300.0 * 72,
                                w / 300.0 * 72, h / 300.0 * 72, confidence));
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
                    .forEach(p -> { try { Files.deleteIfExists(p); } catch (IOException ignored) {} });
        } catch (IOException ignored) {}
    }

    private TextBlock findTargetBlock(List<TextBlock> blocks, EditRequest request) {
        if (request.textBlockId() != null) {
            TextBlock match = blocks.stream()
                    .filter(b -> b.getId().equals(request.textBlockId()))
                    .findFirst().orElse(null);
            if (match != null) return match;
        }
        if (request.oldText() != null) {
            return blocks.stream()
                    .filter(b -> b.getFullText().contains(request.oldText()))
                    .findFirst().orElse(null);
        }
        return null;
    }

    private TextBlockDto toDto(TextBlock block) {
        List<TextRunDto> runDtos = block.getRuns().stream().map(run ->
                new TextRunDto(
                        run.getText(), run.getX(), run.getY(), run.getWidth(),
                        run.getFontSize(), run.getFontName(),
                        run.getContentStreamIndex(), run.getOperatorIndex(),
                        run.getOperatorType() != null ? run.getOperatorType().name() : null
                )).toList();

        TextBlock.EditabilityInfo edit = block.getEditability();
        EditabilityDto editDto = new EditabilityDto(
                edit.canEdit(), edit.canAddCharacters(), edit.canChangeFont(),
                edit.reason(), edit.confidence()
        );

        double[] color = block.getColor() != null
                ? new double[]{block.getColor()[0], block.getColor()[1], block.getColor()[2]}
                : new double[]{0, 0, 0};

        return new TextBlockDto(
                block.getId(), block.getFullText(),
                block.getX(), block.getY(), block.getWidth(), block.getHeight(),
                block.getFontName(), block.getFontSize(), color, editDto, runDtos
        );
    }

    private byte[] save(PDDocument pdf) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        pdf.save(out);
        return out.toByteArray();
    }

    private void validatePageNumber(PDDocument pdf, int pageNumber) {
        if (pageNumber < 1 || pageNumber > pdf.getNumberOfPages()) {
            throw new IllegalArgumentException("Invalid page number: " + pageNumber);
        }
    }

    public record OcrResult(int pageNumber, String text, List<OcrWord> words, String error) {
        public boolean isSuccess() { return error == null; }
    }

    public record OcrWord(String text, double x, double y, double width, double height, float confidence) {}
}
