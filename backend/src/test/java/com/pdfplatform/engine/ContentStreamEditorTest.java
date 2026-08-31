package com.pdfplatform.engine;

import com.pdfplatform.engine.editor.ContentStreamEditor;
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

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ContentStreamEditorTest {

    private final ContentStreamParser parser = new ContentStreamParser();
    private final ContentStreamEditor editor = new ContentStreamEditor();
    private final TextBlockExtractor extractor = new TextBlockExtractor();

    private PDDocument createDocWithText(String text) throws IOException {
        return createDocWithText(text, 12f);
    }

    private PDDocument createDocWithText(String text, float fontSize) throws IOException {
        PDDocument doc = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            cs.beginText();
            cs.setFont(font, fontSize);
            cs.newLineAtOffset(72, 700);
            cs.showText(text);
            cs.endText();
        }
        return doc;
    }

    private PDDocument roundTrip(PDDocument doc) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        doc.save(baos);
        doc.close();
        return org.apache.pdfbox.Loader.loadPDF(baos.toByteArray());
    }

    private TextBlock findBlock(PDDocument doc) throws IOException {
        PDPage page = doc.getPage(0);
        List<TextRun> runs = parser.parse(page);
        List<TextBlock> blocks = extractor.extract(runs, page);
        assertFalse(blocks.isEmpty(), "Expected at least one text block");
        return blocks.get(0);
    }

    @Test
    void replaceTextSimple() throws IOException {
        try (PDDocument doc = createDocWithText("Hello World")) {
            TextBlock block = findBlock(doc);
            assertTrue(block.getFullText().contains("Hello World"));

            boolean replaced = editor.replaceText(doc, 0, block, "Hello World", "Goodbye World");
            assertTrue(replaced);

            PDDocument reloaded = roundTrip(doc);
            TextBlock newBlock = findBlock(reloaded);
            assertTrue(newBlock.getFullText().contains("Goodbye World"));
            reloaded.close();
        }
    }

    @Test
    void replacePartialText() throws IOException {
        try (PDDocument doc = createDocWithText("Hello World Today")) {
            TextBlock block = findBlock(doc);

            boolean replaced = editor.replaceText(doc, 0, block, "World", "Earth");
            assertTrue(replaced);

            PDDocument reloaded = roundTrip(doc);
            TextBlock newBlock = findBlock(reloaded);
            assertTrue(newBlock.getFullText().contains("Hello Earth Today"),
                    "Expected 'Hello Earth Today' but got: " + newBlock.getFullText());
            reloaded.close();
        }
    }

    @Test
    void replaceTextNotFound() throws IOException {
        try (PDDocument doc = createDocWithText("Hello World")) {
            TextBlock block = findBlock(doc);

            boolean replaced = editor.replaceText(doc, 0, block, "Missing Text", "New Text");
            assertFalse(replaced, "Should not replace when old text not found");
        }
    }

    @Test
    void changeFontSize() throws IOException {
        try (PDDocument doc = createDocWithText("Size Test", 12f)) {
            TextBlock block = findBlock(doc);
            assertEquals(12, block.getFontSize(), 0.1);

            boolean changed = editor.changeFontSize(doc, 0, block, 24f);
            assertTrue(changed);

            PDDocument reloaded = roundTrip(doc);
            TextBlock newBlock = findBlock(reloaded);
            assertEquals(24, newBlock.getFontSize(), 0.1);
            reloaded.close();
        }
    }

    @Test
    void changeTextColor() throws IOException {
        try (PDDocument doc = createDocWithText("Color Test")) {
            TextBlock block = findBlock(doc);

            boolean changed = editor.changeTextColor(doc, 0, block, 1.0f, 0.0f, 0.0f);
            assertTrue(changed);

            PDDocument reloaded = roundTrip(doc);
            TextBlock newBlock = findBlock(reloaded);
            float[] color = newBlock.getColor();
            assertEquals(1.0, color[0], 0.01, "Red channel should be 1.0");
            assertEquals(0.0, color[1], 0.01, "Green channel should be 0.0");
            assertEquals(0.0, color[2], 0.01, "Blue channel should be 0.0");
            reloaded.close();
        }
    }

    @Test
    void replaceTextPreservesOtherContent() throws IOException {
        PDDocument doc = new PDDocument();
        PDPage page = new PDPage(PDRectangle.A4);
        doc.addPage(page);

        PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
        try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
            cs.beginText();
            cs.setFont(font, 12);
            cs.newLineAtOffset(72, 700);
            cs.showText("First Line");
            cs.newLineAtOffset(0, -20);
            cs.showText("Second Line");
            cs.endText();
        }

        List<TextRun> runs = parser.parse(page);
        List<TextBlock> blocks = extractor.extract(runs, page);

        TextBlock targetBlock = blocks.stream()
                .filter(b -> b.getFullText().contains("First"))
                .findFirst()
                .orElseThrow();

        editor.replaceText(doc, 0, targetBlock, "First Line", "Modified");

        PDDocument reloaded = roundTrip(doc);
        List<TextRun> newRuns = parser.parse(reloaded.getPage(0));
        String allText = newRuns.stream().map(TextRun::getText).reduce("", String::concat);

        assertTrue(allText.contains("Modified"), "Modified text should be present");
        assertTrue(allText.contains("Second Line"), "Other text should be preserved");
        reloaded.close();
    }

    @Test
    void invalidCharacterThrowsException() throws IOException {
        try (PDDocument doc = createDocWithText("Hello")) {
            TextBlock block = findBlock(doc);

            // Standard14 fonts can't encode CJK characters
            assertThrows(IOException.class, () ->
                    editor.replaceText(doc, 0, block, "Hello", "世界"));
        }
    }
}
