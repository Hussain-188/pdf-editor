package com.pdfplatform.engine;

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

class ContentStreamParserTest {

    private final ContentStreamParser parser = new ContentStreamParser();

    @Test
    void parseSingleTextLine() throws IOException {
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

            assertFalse(runs.isEmpty(), "Should find at least one text run");
            TextRun run = runs.get(0);
            assertEquals("Hello World", run.getText());
            assertEquals(12, run.getFontSize(), 0.01);
            assertTrue(run.getX() >= 72, "X position should be at least 72");
            assertEquals(700, run.getY(), 1.0);
        }
    }

    @Test
    void parseMultipleTextLines() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Line One");
                cs.newLineAtOffset(0, -15);
                cs.showText("Line Two");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);

            assertEquals(2, runs.size());
            assertEquals("Line One", runs.get(0).getText());
            assertEquals("Line Two", runs.get(1).getText());
            assertTrue(runs.get(0).getY() > runs.get(1).getY(), "First line should be higher on page");
        }
    }

    @Test
    void parseFontSizeAndName() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 24);
                cs.newLineAtOffset(100, 600);
                cs.showText("Big Title");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);

            assertEquals(1, runs.size());
            assertEquals("Big Title", runs.get(0).getText());
            assertEquals(24, runs.get(0).getFontSize(), 0.01);
            assertTrue(runs.get(0).getFontName().contains("Times"), "Font name should contain 'Times'");
        }
    }

    @Test
    void parseColorRGB() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(font, 12);
                cs.setNonStrokingColor(1.0f, 0.0f, 0.0f);
                cs.newLineAtOffset(72, 700);
                cs.showText("Red Text");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);

            assertEquals(1, runs.size());
            float[] color = runs.get(0).getColor();
            assertEquals(1.0, color[0], 0.01);
            assertEquals(0.0, color[1], 0.01);
            assertEquals(0.0, color[2], 0.01);
        }
    }

    @Test
    void parseMultipleFontsInOneBlock() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            PDType1Font helv = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDType1Font helvBold = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                cs.beginText();
                cs.setFont(helv, 12);
                cs.newLineAtOffset(72, 700);
                cs.showText("Normal ");
                cs.setFont(helvBold, 12);
                cs.showText("Bold");
                cs.endText();
            }

            List<TextRun> runs = parser.parse(page);

            assertEquals(2, runs.size());
            assertEquals("Normal ", runs.get(0).getText());
            assertEquals("Bold", runs.get(1).getText());
            assertTrue(runs.get(1).getFontName().contains("Bold"));
        }
    }

    @Test
    void parseEmptyPage() throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            doc.addPage(page);

            List<TextRun> runs = parser.parse(page);
            assertTrue(runs.isEmpty());
        }
    }

    @Test
    void parseOperatorTypeTracking() throws IOException {
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

            assertFalse(runs.isEmpty());
            assertNotNull(runs.get(0).getOperatorType());
            assertTrue(runs.get(0).getOperatorIndex() >= 0, "Operator index should be non-negative");
        }
    }
}
