package com.pdfplatform.engine;

import com.pdfplatform.engine.extractor.TextBlockExtractor;
import com.pdfplatform.engine.model.TextBlock;
import com.pdfplatform.engine.model.TextRun;
import com.pdfplatform.engine.parser.ContentStreamParser;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TextBlockExtractorTest {

    private final ContentStreamParser parser = new ContentStreamParser();
    private final TextBlockExtractor extractor = new TextBlockExtractor();

    @Test
    void singleLineProducesSingleBlock() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Hello World");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page);

            assertEquals(1, blocks.size());
            assertTrue(blocks.get(0).getFullText().contains("Hello World"));
        }
    }

    @Test
    void differentFontsSplitIntoSeparateBlocks() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font helv = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font times = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(helv, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Helvetica Text");
                cs.setFont(times, 12);
                cs.newLineAtOffset(200, 0);
                cs.showText("Times Text");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page);

            assertTrue(blocks.size() >= 2, "Different fonts should produce separate blocks");
        }
    }

    @Test
    void widelySpacedLinesProduceSeparateBlocks() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Top Section");
                cs.newLineAtOffset(0, -200);
                cs.showText("Bottom Section");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page);

            assertTrue(blocks.size() >= 2, "Widely spaced lines should be separate blocks");
        }
    }

    @Test
    void blockHasCorrectBoundingBox() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Test");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page);

            assertEquals(1, blocks.size());
            TextBlock block = blocks.get(0);
            assertTrue(block.getWidth() > 0, "Block width should be positive");
            assertTrue(block.getHeight() > 0, "Block height should be positive");
            assertTrue(block.getX() >= 72, "Block X should be at least 72");
        }
    }

    @Test
    void blockIdIsGenerated() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Block One");
                cs.newLineAtOffset(0, -200);
                cs.showText("Block Two");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page);

            for (TextBlock block : blocks) {
                assertNotNull(block.getId());
                assertTrue(block.getId().startsWith("block-"));
            }
            if (blocks.size() > 1) {
                assertNotEquals(blocks.get(0).getId(), blocks.get(1).getId());
            }
        }
    }

    @Test
    void editabilityAssessedForStandardFonts() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Standard Font");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page);

            assertEquals(1, blocks.size());
            assertNotNull(blocks.get(0).getEditability());
            assertTrue(blocks.get(0).getEditability().canEdit(),
                    "Standard 14 fonts should be editable");
        }
    }

    @Test
    void emptyRunsReturnEmptyBlocks() throws IOException {
        List<TextBlock> blocks = extractor.extract(List.of(), null);
        assertTrue(blocks.isEmpty());
    }
}
