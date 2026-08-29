package com.pdfplatform.poc;

import com.pdfplatform.poc.editor.ContentStreamWriter;
import com.pdfplatform.poc.extractor.TextBlockExtractor;
import com.pdfplatform.poc.model.TextBlock;
import com.pdfplatform.poc.model.TextRun;
import com.pdfplatform.poc.parser.ContentStreamParser;
import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.pdfparser.PDFStreamParser;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * PDF Editor Proof of Concept - Phase 0
 *
 * Demonstrates true content stream text editing:
 * 1. Creates a test PDF with various text elements
 * 2. Parses the content stream to extract text with positions
 * 3. Identifies editable text blocks
 * 4. Replaces text by rewriting content stream operators
 * 5. Outputs a valid modified PDF
 */
public class PdfEditorPoc {

    public static void main(String[] args) throws Exception {
        System.out.println("=== PDF Editor - Phase 0 Proof of Concept ===\n");

        Path outputDir = Path.of("output");
        Files.createDirectories(outputDir);

        // Step 1: Create test PDFs
        System.out.println("--- Step 1: Creating test PDFs ---");
        Path testPdf = createTestPdf(outputDir.resolve("test-original.pdf"));
        Path testPdfKerned = createKernedTestPdf(outputDir.resolve("test-kerned-original.pdf"));
        System.out.println("Created: " + testPdf);
        System.out.println("Created: " + testPdfKerned);

        // Step 2: Parse and extract text
        System.out.println("\n--- Step 2: Parsing content stream ---");
        demonstrateTextExtraction(testPdf);

        // Step 3: Edit text (simple Tj replacement)
        System.out.println("\n--- Step 3: Text replacement (Tj operator) ---");
        demonstrateTextReplacement(testPdf, outputDir.resolve("test-edited.pdf"),
                "Hello World", "Hello Universe");

        // Step 4: Edit text (TJ array with kerning)
        System.out.println("\n--- Step 4: Text replacement (TJ array with kerning) ---");
        demonstrateTextReplacement(testPdfKerned, outputDir.resolve("test-kerned-edited.pdf"),
                "Welcome", "Greetings");

        // Step 5: Font size change
        System.out.println("\n--- Step 5: Font size change ---");
        demonstrateFontSizeChange(testPdf, outputDir.resolve("test-resized.pdf"));

        // Step 6: Color change
        System.out.println("\n--- Step 6: Text color change ---");
        demonstrateColorChange(testPdf, outputDir.resolve("test-colored.pdf"));

        System.out.println("\n=== Proof of Concept Complete ===");
        System.out.println("Check the 'output' directory for results.");
    }

    private static void demonstrateTextExtraction(Path pdfPath) throws Exception {
        try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdfPath.toFile())) {
            PDPage page = doc.getPage(0);
            ContentStreamParser parser = new ContentStreamParser();
            List<TextRun> runs = parser.parse(page);

            System.out.println("Extracted " + runs.size() + " text runs:");
            for (TextRun run : runs) {
                System.out.printf("  \"%s\" at (%.1f, %.1f) font=%s size=%.1f width=%.1f%n",
                        run.getText(), run.getX(), run.getY(),
                        run.getFontResourceName(), run.getFontSize(), run.getWidth());
            }

            // Group into blocks
            TextBlockExtractor extractor = new TextBlockExtractor(page);
            List<TextBlock> blocks = extractor.extract(runs);

            System.out.println("\nGrouped into " + blocks.size() + " text blocks:");
            for (TextBlock block : blocks) {
                System.out.printf("  [%s] \"%s\" editable=%s%n",
                        block.getId(), block.getFullText(), block.getEditability().canEdit());
                if (!block.getEditability().canEdit()) {
                    System.out.printf("    Reason: %s%n", block.getEditability().reason());
                }
            }
        }
    }

    private static void demonstrateTextReplacement(Path inputPath, Path outputPath,
                                                    String oldText, String newText) throws Exception {
        try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(inputPath.toFile())) {
            PDPage page = doc.getPage(0);

            // Parse to find text blocks
            ContentStreamParser parser = new ContentStreamParser();
            List<TextRun> runs = parser.parse(page);
            TextBlockExtractor extractor = new TextBlockExtractor(page);
            List<TextBlock> blocks = extractor.extract(runs);

            // Find the block containing our target text
            TextBlock targetBlock = null;
            for (TextBlock block : blocks) {
                if (block.getFullText().contains(oldText)) {
                    targetBlock = block;
                    break;
                }
            }

            if (targetBlock == null) {
                System.out.println("ERROR: Could not find text '" + oldText + "' in document");
                return;
            }

            System.out.println("Found target: " + targetBlock);
            System.out.println("Editability: " + targetBlock.getEditability());

            // Perform the replacement at the content stream level
            boolean success = replaceTextInStream(doc, page, targetBlock, oldText, newText);

            if (success) {
                doc.save(outputPath.toFile());
                System.out.println("SUCCESS: Saved edited PDF to " + outputPath);
                System.out.println("  Replaced \"" + oldText + "\" with \"" + newText + "\"");

                // Verify by re-parsing
                verifyReplacement(outputPath, newText);
            } else {
                System.out.println("FAILED: Could not replace text");
            }
        }
    }

    private static boolean replaceTextInStream(PDDocument doc, PDPage page,
                                               TextBlock block, String oldText, String newText)
            throws IOException {
        PDFont font = page.getResources().getFont(
                COSName.getPDFName(block.getFontResourceName()));
        if (font == null) {
            System.out.println("ERROR: Font not found: " + block.getFontResourceName());
            return false;
        }

        // Parse tokens
        PDFStreamParser streamParser = new PDFStreamParser(page);
        List<Object> tokens = streamParser.parse();

        // Find the target operator
        TextRun targetRun = null;
        for (TextRun run : block.getRuns()) {
            if (run.getText().contains(oldText)) {
                targetRun = run;
                break;
            }
        }
        if (targetRun == null) {
            // Try full block text
            String fullText = block.getFullText();
            if (fullText.contains(oldText)) {
                targetRun = block.getRuns().get(0);
            } else {
                return false;
            }
        }

        // Navigate to the operator
        int targetOpIndex = targetRun.getOperatorIndex();
        int currentOpIndex = 0;

        for (int i = 0; i < tokens.size(); i++) {
            if (tokens.get(i) instanceof Operator op) {
                if (currentOpIndex == targetOpIndex) {
                    String opName = op.getName();
                    if ("Tj".equals(opName) || "'".equals(opName)) {
                        // Find the COSString operand before this operator
                        for (int j = i - 1; j >= 0; j--) {
                            if (tokens.get(j) instanceof COSString cosString) {
                                String decoded = decodeWithFont(cosString, font);
                                if (decoded.contains(oldText)) {
                                    String replaced = decoded.replace(oldText, newText);
                                    byte[] encoded = font.encode(replaced);
                                    tokens.set(j, new COSString(encoded));
                                    writeTokensToPage(doc, page, tokens);
                                    return true;
                                }
                                break;
                            }
                            if (tokens.get(j) instanceof Operator) break;
                        }
                    } else if ("TJ".equals(opName)) {
                        // Find the COSArray operand
                        for (int j = i - 1; j >= 0; j--) {
                            if (tokens.get(j) instanceof COSArray array) {
                                if (replaceInArray(array, oldText, newText, font)) {
                                    writeTokensToPage(doc, page, tokens);
                                    return true;
                                }
                                break;
                            }
                            if (tokens.get(j) instanceof Operator) break;
                        }
                    }
                }
                currentOpIndex++;
            }
        }

        return false;
    }

    private static boolean replaceInArray(COSArray array, String oldText, String newText, PDFont font)
            throws IOException {
        // First, try to find the text in a single array element
        for (int i = 0; i < array.size(); i++) {
            COSBase element = array.get(i);
            if (element instanceof COSString cosString) {
                String decoded = decodeWithFont(cosString, font);
                if (decoded.contains(oldText)) {
                    String replaced = decoded.replace(oldText, newText);
                    byte[] encoded = font.encode(replaced);
                    array.set(i, new COSString(encoded));
                    return true;
                }
            }
        }

        // If not found in single element, try concatenated text
        StringBuilder fullText = new StringBuilder();
        for (int i = 0; i < array.size(); i++) {
            if (array.get(i) instanceof COSString cosString) {
                fullText.append(decodeWithFont(cosString, font));
            }
        }

        if (fullText.toString().contains(oldText)) {
            // Replace the entire array content with a single string
            String replaced = fullText.toString().replace(oldText, newText);
            byte[] encoded = font.encode(replaced);
            array.clear();
            array.add(new COSString(encoded));
            return true;
        }

        return false;
    }

    private static void demonstrateFontSizeChange(Path inputPath, Path outputPath) throws Exception {
        try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(inputPath.toFile())) {
            PDPage page = doc.getPage(0);

            ContentStreamParser parser = new ContentStreamParser();
            List<TextRun> runs = parser.parse(page);
            TextBlockExtractor extractor = new TextBlockExtractor(page);
            List<TextBlock> blocks = extractor.extract(runs);

            if (blocks.isEmpty()) {
                System.out.println("ERROR: No text blocks found");
                return;
            }

            TextBlock target = blocks.get(0); // First block
            System.out.println("Changing font size of: \"" + target.getFullText() + "\"");
            System.out.println("  Original size: " + target.getFontSize());
            float newSize = target.getFontSize() * 1.5f;

            // Parse tokens and find the Tf operator for this block
            PDFStreamParser streamParser = new PDFStreamParser(page);
            List<Object> tokens = streamParser.parse();

            int targetOpIndex = target.getRuns().get(0).getOperatorIndex();
            int currentOpIndex = 0;
            int lastTfSizeIndex = -1;

            for (int i = 0; i < tokens.size(); i++) {
                if (tokens.get(i) instanceof Operator op) {
                    if ("Tf".equals(op.getName())) {
                        // The size operand is at i-1 (second operand of Tf)
                        lastTfSizeIndex = i - 1;
                    }
                    if (currentOpIndex == targetOpIndex) {
                        if (lastTfSizeIndex >= 0) {
                            tokens.set(lastTfSizeIndex, new COSFloat(newSize));
                            writeTokensToPage(doc, page, tokens);
                            doc.save(outputPath.toFile());
                            System.out.println("SUCCESS: Changed font size to " + newSize);
                            System.out.println("  Saved to: " + outputPath);
                            return;
                        }
                        break;
                    }
                    currentOpIndex++;
                }
            }

            System.out.println("FAILED: Could not find Tf operator for target block");
        }
    }

    private static void demonstrateColorChange(Path inputPath, Path outputPath) throws Exception {
        try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(inputPath.toFile())) {
            PDPage page = doc.getPage(0);

            ContentStreamParser parser = new ContentStreamParser();
            List<TextRun> runs = parser.parse(page);
            TextBlockExtractor extractor = new TextBlockExtractor(page);
            List<TextBlock> blocks = extractor.extract(runs);

            if (blocks.isEmpty()) {
                System.out.println("ERROR: No text blocks found");
                return;
            }

            TextBlock target = blocks.get(0);
            System.out.println("Changing color of: \"" + target.getFullText() + "\"");

            // Parse tokens
            PDFStreamParser streamParser = new PDFStreamParser(page);
            List<Object> tokens = streamParser.parse();

            int targetOpIndex = target.getRuns().get(0).getOperatorIndex();
            int currentOpIndex = 0;

            for (int i = 0; i < tokens.size(); i++) {
                if (tokens.get(i) instanceof Operator op) {
                    if (currentOpIndex == targetOpIndex) {
                        // Insert color operator before the text show operator's operands
                        int insertPos = i;
                        while (insertPos > 0 && !(tokens.get(insertPos - 1) instanceof Operator)) {
                            insertPos--;
                        }
                        // Insert: 1 0 0 rg (red)
                        tokens.add(insertPos, new COSFloat(1.0f));
                        tokens.add(insertPos + 1, new COSFloat(0.0f));
                        tokens.add(insertPos + 2, new COSFloat(0.0f));
                        tokens.add(insertPos + 3, Operator.getOperator("rg"));

                        writeTokensToPage(doc, page, tokens);
                        doc.save(outputPath.toFile());
                        System.out.println("SUCCESS: Changed text color to red");
                        System.out.println("  Saved to: " + outputPath);
                        return;
                    }
                    currentOpIndex++;
                }
            }

            System.out.println("FAILED: Could not locate target operator");
        }
    }

    private static void verifyReplacement(Path pdfPath, String expectedText) throws Exception {
        try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(pdfPath.toFile())) {
            PDPage page = doc.getPage(0);
            ContentStreamParser parser = new ContentStreamParser();
            List<TextRun> runs = parser.parse(page);

            boolean found = false;
            for (TextRun run : runs) {
                if (run.getText().contains(expectedText)) {
                    found = true;
                    break;
                }
            }

            if (found) {
                System.out.println("VERIFIED: New text '" + expectedText + "' found in output PDF");
            } else {
                System.out.println("WARNING: Could not verify new text in output");
                System.out.println("  Text runs found:");
                for (TextRun run : runs) {
                    System.out.println("    \"" + run.getText() + "\"");
                }
            }
        }
    }

    // --- Test PDF Creation ---

    private static Path createTestPdf(Path path) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);

            PDFont helvetica = new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            PDFont times = new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
            PDFont courier = new PDType1Font(Standard14Fonts.FontName.COURIER);

            try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                // Title
                cs.beginText();
                cs.setFont(helvetica, 24);
                cs.newLineAtOffset(72, 700);
                cs.showText("Hello World");
                cs.endText();

                // Subtitle
                cs.beginText();
                cs.setFont(times, 16);
                cs.newLineAtOffset(72, 660);
                cs.showText("This is a test PDF for the content stream editor.");
                cs.endText();

                // Body text
                cs.beginText();
                cs.setFont(helvetica, 12);
                cs.newLineAtOffset(72, 620);
                cs.showText("The quick brown fox jumps over the lazy dog.");
                cs.endText();

                // Colored text
                cs.beginText();
                cs.setFont(courier, 14);
                cs.setNonStrokingColor(0.0f, 0.0f, 0.8f); // Blue
                cs.newLineAtOffset(72, 580);
                cs.showText("Blue monospace text for testing.");
                cs.endText();

                // Multi-line paragraph
                cs.beginText();
                cs.setFont(helvetica, 11);
                cs.setNonStrokingColor(0.0f, 0.0f, 0.0f);
                cs.newLineAtOffset(72, 540);
                cs.showText("Line one of a paragraph.");
                cs.newLineAtOffset(0, -15);
                cs.showText("Line two continues here.");
                cs.newLineAtOffset(0, -15);
                cs.showText("Line three ends the paragraph.");
                cs.endText();
            }

            doc.save(path.toFile());
        }
        return path;
    }

    private static Path createKernedTestPdf(Path path) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            PDPage page = new PDPage();
            doc.addPage(page);

            PDFont helvetica = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            // Manually write content stream with TJ operator (kerned text)
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PrintWriter pw = new PrintWriter(baos);
            pw.println("BT");
            pw.println("/F1 20 Tf");
            pw.println("72 700 Td");
            // TJ array: [(W) -80 (elcome) -40 ( to) -60 ( PDF) -50 ( Editing)] TJ
            pw.println("[(W) -80 (elcome to PDF Editing)] TJ");
            pw.println("ET");
            pw.println("BT");
            pw.println("/F1 14 Tf");
            pw.println("72 650 Td");
            pw.println("(This uses TJ operator with kerning adjustments.) Tj");
            pw.println("ET");
            pw.flush();

            // Register the font in page resources
            org.apache.pdfbox.pdmodel.PDResources resources = new org.apache.pdfbox.pdmodel.PDResources();
            resources.put(COSName.getPDFName("F1"), helvetica);
            page.setResources(resources);

            // Set the content stream
            PDStream pdStream = new PDStream(doc, new ByteArrayInputStream(baos.toByteArray()));
            page.setContents(pdStream);

            doc.save(path.toFile());
        }
        return path;
    }

    // --- Utility ---

    private static void writeTokensToPage(PDDocument doc, PDPage page, List<Object> tokens)
            throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ContentStreamWriter writer = new ContentStreamWriter(baos);
        writer.writeTokens(tokens);

        PDStream pdStream = new PDStream(doc, new ByteArrayInputStream(baos.toByteArray()));
        page.setContents(pdStream);
    }

    private static String decodeWithFont(COSString cosString, PDFont font) throws IOException {
        byte[] bytes = cosString.getBytes();
        StringBuilder sb = new StringBuilder();

        if (font instanceof org.apache.pdfbox.pdmodel.font.PDSimpleFont simpleFont) {
            for (byte b : bytes) {
                int code = b & 0xFF;
                String unicode = simpleFont.toUnicode(code);
                sb.append(unicode != null ? unicode : String.valueOf((char) code));
            }
        } else {
            return cosString.getString();
        }

        return sb.toString();
    }
}
