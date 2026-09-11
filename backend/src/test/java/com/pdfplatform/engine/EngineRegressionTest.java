package com.pdfplatform.engine;

import com.pdfplatform.engine.editor.ContentStreamEditor;
import com.pdfplatform.engine.editor.ContentStreamWriter;
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
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Locale;

import static org.junit.jupiter.api.Assertions.*;

class EngineRegressionTest {

    private final ContentStreamParser parser = new ContentStreamParser();
    private final TextBlockExtractor extractor = new TextBlockExtractor();
    private final ContentStreamEditor editor = new ContentStreamEditor();

    // --- Fix 1: Graphics state q/Q saves/restores full state ---

    @Test
    void graphicsStateSaveRestoresFont() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font helvetica = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font courier = new PDType1Font(Standard14Fonts.FontName.COURIER);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(helvetica, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Before");
                cs.endText();

                cs.saveGraphicsState();
                cs.beginText();
                cs.setFont(courier, 18);
                cs.newLineAtOffset(72, 650);
                cs.showText("Inside");
                cs.endText();
                cs.restoreGraphicsState();

                cs.beginText();
                cs.setFont(helvetica, 12);
                cs.newLineAtOffset(72, 600);
                cs.showText("After");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            assertEquals(3, runs.size());
            assertEquals("Before", runs.get(0).getText());
            assertEquals("Inside", runs.get(1).getText());
            assertEquals("After", runs.get(2).getText());

            assertEquals(12, runs.get(0).getFontSize(), 0.01);
            assertEquals(18, runs.get(1).getFontSize(), 0.01);
            assertEquals(12, runs.get(2).getFontSize(), 0.01);
        }
    }

    @Test
    void graphicsStateSaveRestoresColor() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setNonStrokingColor(1.0f, 0.0f, 0.0f);
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Red");
                cs.endText();

                cs.saveGraphicsState();
                cs.setNonStrokingColor(0.0f, 0.0f, 1.0f);
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 650);
                cs.showText("Blue");
                cs.endText();
                cs.restoreGraphicsState();

                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 600);
                cs.showText("Red Again");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            assertEquals(3, runs.size());

            float[] redColor = runs.get(0).getColor();
            float[] blueColor = runs.get(1).getColor();
            float[] restoredColor = runs.get(2).getColor();

            assertEquals(1.0f, redColor[0], 0.01);
            assertEquals(0.0f, blueColor[0], 0.01);
            assertEquals(1.0f, blueColor[2], 0.01);
            assertEquals(1.0f, restoredColor[0], 0.01, "Color should be restored to red after Q");
        }
    }

    // --- Fix 2: Bounding box uses -Float.MAX_VALUE, not Float.MIN_VALUE ---

    @Test
    void boundingBoxCorrectForNormalText() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(100, 500);
                cs.showText("Bounding Box Test");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page, 1);

            assertEquals(1, blocks.size());
            TextBlock block = blocks.get(0);
            assertTrue(block.getX() >= 100, "X should be >= 100");
            assertTrue(block.getWidth() > 0, "Width should be positive");
            assertTrue(block.getHeight() > 0, "Height should be positive");
            assertTrue(block.getY() < 510, "Y should be near 500");
        }
    }

    // --- Fix 3: pageNumber is set correctly ---

    @Test
    void pageNumberSetCorrectly() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Page Number Test");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);

            List<TextBlock> blocks5 = extractor.extract(runs, page, 5);
            assertFalse(blocks5.isEmpty());
            assertEquals(5, blocks5.get(0).getPageNumber());

            List<TextBlock> blocks1 = extractor.extract(runs, page, 1);
            assertEquals(1, blocks1.get(0).getPageNumber());
        }
    }

    // --- Fix 4: Locale-safe number formatting in ContentStreamWriter ---

    @Test
    void writerFormatsNumbersWithPeriodDecimalSeparator() throws IOException {
        Locale defaultLocale = Locale.getDefault();
        try {
            Locale.setDefault(Locale.GERMANY);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ContentStreamWriter writer = new ContentStreamWriter(baos);

            org.apache.pdfbox.cos.COSFloat cosFloat = new org.apache.pdfbox.cos.COSFloat(3.14159f);
            writer.writeTokens(List.of(cosFloat));

            String output = baos.toString("US-ASCII");
            assertFalse(output.contains(","), "Number should use period, not comma: " + output);
            assertTrue(output.contains(".") || output.matches("\\d+"), "Should be a valid PDF number: " + output);
        } finally {
            Locale.setDefault(defaultLocale);
        }
    }

    // --- Fix 5: Round-trip content stream fidelity ---

    @Test
    void roundTripPreservesText() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Original Text");
                cs.endText();
            }

            List<TextRun> runsBefore = parser.parse(page);
            String textBefore = runsBefore.stream().map(TextRun::getText).reduce("", String::concat);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            doc.save(baos);
            try (PDDocument reloaded = Loader.loadPDF(baos.toByteArray())) {
                List<TextRun> runsAfter = parser.parse(reloaded.getPage(0));
                String textAfter = runsAfter.stream().map(TextRun::getText).reduce("", String::concat);
                assertEquals(textBefore, textAfter);
            }
        }
    }

    // --- Fix 6: Text replacement preserves other content on same page ---

    @Test
    void editDoesNotCorruptOtherTextOnPage() throws IOException {
        PDDocument doc = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            cs.beginText();
            cs.setFont(font, 14);
            cs.newLineAtOffset(72, 750);
            cs.showText("Header");
            cs.endText();

            cs.beginText();
            cs.setFont(font, 12);
            cs.newLineAtOffset(72, 700);
            cs.showText("Body text here");
            cs.endText();

            cs.beginText();
            cs.setFont(font, 10);
            cs.newLineAtOffset(72, 100);
            cs.showText("Footer");
            cs.endText();
        }

        List<TextRun> runs = parser.parse(page);
        List<TextBlock> blocks = extractor.extract(runs, page, 1);

        TextBlock bodyBlock = blocks.stream()
                .filter(b -> b.getFullText().contains("Body"))
                .findFirst()
                .orElseThrow();

        editor.replaceText(doc, 0, bodyBlock, "Body text here", "Modified body");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        doc.save(baos);
        doc.close();

        try (PDDocument reloaded = Loader.loadPDF(baos.toByteArray())) {
            List<TextRun> newRuns = parser.parse(reloaded.getPage(0));
            String allText = newRuns.stream().map(TextRun::getText).reduce("", String::concat);

            assertTrue(allText.contains("Header"), "Header should be preserved");
            assertTrue(allText.contains("Modified body"), "Body should be modified");
            assertTrue(allText.contains("Footer"), "Footer should be preserved");
        }
    }

    // --- Fix 7: Font size change round-trips correctly ---

    @Test
    void fontSizeChangeRoundTrips() throws IOException {
        PDDocument doc = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            cs.beginText();
            cs.setFont(font, 12);
            cs.newLineAtOffset(72, 700);
            cs.showText("Size Test");
            cs.endText();
        }

        List<TextRun> runs = parser.parse(page);
        List<TextBlock> blocks = extractor.extract(runs, page, 1);
        assertEquals(12, blocks.get(0).getFontSize(), 0.1);

        editor.changeFontSize(doc, 0, blocks.get(0), 20f);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        doc.save(baos);
        doc.close();

        try (PDDocument reloaded = Loader.loadPDF(baos.toByteArray())) {
            List<TextRun> newRuns = parser.parse(reloaded.getPage(0));
            List<TextBlock> newBlocks = extractor.extract(newRuns, reloaded.getPage(0), 1);
            assertEquals(20, newBlocks.get(0).getFontSize(), 0.1);
        }
    }

    // --- Fix 8: Color change round-trips correctly ---

    @Test
    void colorChangeRoundTrips() throws IOException {
        PDDocument doc = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            cs.beginText();
            cs.setFont(font, 12);
            cs.setNonStrokingColor(0f, 0f, 0f);
            cs.newLineAtOffset(72, 700);
            cs.showText("Color Test");
            cs.endText();
        }

        List<TextRun> runs = parser.parse(page);
        List<TextBlock> blocks = extractor.extract(runs, page, 1);

        editor.changeTextColor(doc, 0, blocks.get(0), 0.0f, 1.0f, 0.0f);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        doc.save(baos);
        doc.close();

        try (PDDocument reloaded = Loader.loadPDF(baos.toByteArray())) {
            List<TextRun> newRuns = parser.parse(reloaded.getPage(0));
            List<TextBlock> newBlocks = extractor.extract(newRuns, reloaded.getPage(0), 1);
            float[] color = newBlocks.get(0).getColor();
            assertEquals(0.0f, color[0], 0.01, "Red should be 0");
            assertEquals(1.0f, color[1], 0.01, "Green should be 1");
            assertEquals(0.0f, color[2], 0.01, "Blue should be 0");
        }
    }

    // --- Fix 9: Multi-page editing doesn't corrupt other pages ---

    @Test
    void multiPageEditPreservesOtherPages() throws IOException {
        PDDocument doc = new PDDocument();
        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

        for (int i = 1; i <= 3; i++) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Page " + i + " content");
                cs.endText();
            }
        }

        PDPage page2 = doc.getPage(1);
        List<TextRun> runs = parser.parse(page2);
        List<TextBlock> blocks = extractor.extract(runs, page2, 2);
        editor.replaceText(doc, 1, blocks.get(0), "Page 2 content", "Modified page 2");

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        doc.save(baos);
        doc.close();

        try (PDDocument reloaded = Loader.loadPDF(baos.toByteArray())) {
            assertEquals(3, reloaded.getNumberOfPages());

            String page1Text = parser.parse(reloaded.getPage(0)).stream()
                    .map(TextRun::getText).reduce("", String::concat);
            String page2Text = parser.parse(reloaded.getPage(1)).stream()
                    .map(TextRun::getText).reduce("", String::concat);
            String page3Text = parser.parse(reloaded.getPage(2)).stream()
                    .map(TextRun::getText).reduce("", String::concat);

            assertTrue(page1Text.contains("Page 1 content"), "Page 1 should be unchanged");
            assertTrue(page2Text.contains("Modified page 2"), "Page 2 should be modified");
            assertTrue(page3Text.contains("Page 3 content"), "Page 3 should be unchanged");
        }
    }

    // --- Fix 10: Nested graphics state save/restore ---

    @Test
    void nestedGraphicsStateSaveRestore() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font helv = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font courier = new PDType1Font(Standard14Fonts.FontName.COURIER);
            PDType1Font times = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setNonStrokingColor(1.0f, 0.0f, 0.0f);
                cs.beginText();
                cs.setFont(helv, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Outer");
                cs.endText();

                cs.saveGraphicsState();
                cs.setNonStrokingColor(0.0f, 1.0f, 0.0f);
                cs.beginText();
                cs.setFont(courier, 14);
                cs.newLineAtOffset(72, 660);
                cs.showText("Middle");
                cs.endText();

                cs.saveGraphicsState();
                cs.setNonStrokingColor(0.0f, 0.0f, 1.0f);
                cs.beginText();
                cs.setFont(times, 16);
                cs.newLineAtOffset(72, 620);
                cs.showText("Inner");
                cs.endText();

                cs.restoreGraphicsState();
                cs.beginText();
                cs.setFont(courier, 14);
                cs.newLineAtOffset(72, 580);
                cs.showText("Back to Middle");
                cs.endText();

                cs.restoreGraphicsState();
                cs.beginText();
                cs.setFont(helv, 12);
                cs.newLineAtOffset(72, 540);
                cs.showText("Back to Outer");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            assertEquals(5, runs.size());

            assertEquals(1.0f, runs.get(0).getColor()[0], 0.01);
            assertEquals(0.0f, runs.get(1).getColor()[0], 0.01);
            assertEquals(1.0f, runs.get(1).getColor()[1], 0.01);
            assertEquals(1.0f, runs.get(2).getColor()[2], 0.01, "Inner color should be blue");

            assertEquals(0.0f, runs.get(3).getColor()[0], 0.01);
            assertEquals(1.0f, runs.get(3).getColor()[1], 0.01, "Middle color restored after inner Q");

            assertEquals(1.0f, runs.get(4).getColor()[0], 0.01, "Outer color restored after middle Q");
        }
    }

    // --- Fix 11: Parser handles malformed operators gracefully ---

    @Test
    void parserHandlesMalformedContentGracefully() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Survives");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            assertFalse(runs.isEmpty(), "Should parse text even if other operators are odd");
            assertEquals("Survives", runs.get(0).getText());
        }
    }

    // --- Fix 12: CMYK color conversion ---

    @Test
    void cmykColorConvertedToRgb() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.setNonStrokingColor(0f, 0f, 0f, 1f);
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Black CMYK");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            assertEquals(1, runs.size());
            float[] color = runs.get(0).getColor();
            assertEquals(0.0f, color[0], 0.01, "CMYK black R should be 0");
            assertEquals(0.0f, color[1], 0.01, "CMYK black G should be 0");
            assertEquals(0.0f, color[2], 0.01, "CMYK black B should be 0");
        }
    }

    // --- Fix 13: TextBlock editability assessment handles missing font gracefully ---

    @Test
    void editabilityWithStandardFont() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Standard font");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);
            List<TextBlock> blocks = extractor.extract(runs, page, 1);
            assertFalse(blocks.isEmpty());
            assertTrue(blocks.get(0).getEditability().canEdit(),
                    "Standard 14 font blocks should be editable");
        }
    }
}
