package com.pdfplatform.engine.editor;

import com.pdfplatform.engine.model.TextBlock;
import com.pdfplatform.engine.model.TextRun;
import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.pdfparser.PDFStreamParser;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDStream;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.springframework.stereotype.Service;

import java.io.*;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The core content stream manipulation engine.
 * Locates text operators in a page's content stream and rewrites them
 * with replacement text while preserving the surrounding structure.
 */
@Service
public class ContentStreamEditor {

    /**
     * Replaces text within a specific text block in the PDF.
     *
     * @param document The PDF document
     * @param pageIndex 0-based page index
     * @param textBlock The text block containing the text to replace
     * @param oldText The text to find and replace
     * @param newText The replacement text
     * @return true if replacement was successful
     */
    public boolean replaceText(PDDocument document, int pageIndex,
                               TextBlock textBlock, String oldText, String newText)
            throws IOException {

        PDPage page = document.getPage(pageIndex);
        PDFont originalFont = getFont(page, textBlock.getFontResourceName());

        if (originalFont == null) {
            throw new IOException("Font '" + textBlock.getFontResourceName() +
                    "' not found in page resources");
        }

        // Always use the original font — never silently substitute a different font.
        // Only validate characters that are truly new (not already in the old text).
        validateEncodingForEdit(originalFont, oldText, newText);

        PDFStreamParser parser = new PDFStreamParser(page);
        List<Object> tokens = parser.parse();

        boolean replaced = replaceInTokens(tokens, textBlock, oldText, newText, originalFont);

        if (!replaced) {
            return false;
        }

        writeModifiedStream(document, page, tokens);
        return true;
    }

    /**
     * Changes the font size of text within a text block.
     */
    public boolean changeFontSize(PDDocument document, int pageIndex,
                                  TextBlock textBlock, float newFontSize) throws IOException {
        PDPage page = document.getPage(pageIndex);
        PDFStreamParser parser = new PDFStreamParser(page);
        List<Object> tokens = parser.parse();

        boolean changed = changeFontSizeInTokens(tokens, textBlock, newFontSize);

        if (changed) {
            writeModifiedStream(document, page, tokens);
        }
        return changed;
    }

    /**
     * Changes the color of text within a text block.
     */
    public boolean changeTextColor(PDDocument document, int pageIndex,
                                   TextBlock textBlock, float r, float g, float b) throws IOException {
        PDPage page = document.getPage(pageIndex);
        PDFStreamParser parser = new PDFStreamParser(page);
        List<Object> tokens = parser.parse();

        boolean changed = changeColorInTokens(tokens, textBlock, r, g, b);

        if (changed) {
            writeModifiedStream(document, page, tokens);
        }
        return changed;
    }

    // --- Private Implementation ---

    private boolean replaceInTokens(List<Object> tokens, TextBlock textBlock,
                                    String oldText, String newText, PDFont font) throws IOException {
        List<TextRun> runs = textBlock.getRuns();

        // Case 1: The text to replace is entirely within a single run
        for (TextRun run : runs) {
            if (run.getText().contains(oldText)) {
                return replaceSingleOperator(tokens, run, oldText, newText, font);
            }
        }

        // Case 2: Full block text replacement — the frontend sends getFullText() as oldText,
        // which includes spaces inferred from glyph gaps. Match against getFullText() and
        // rewrite all operators in the block with the new text.
        String fullText = textBlock.getFullText();
        if (fullText.contains(oldText)) {
            String replacedFull = fullText.replaceFirst(
                    Pattern.quote(oldText), Matcher.quoteReplacement(newText));
            return replaceBlockText(tokens, runs, replacedFull, font);
        }

        // Case 3: Try raw concatenation (no gap-based spaces) as fallback
        String rawText = runs.stream().map(TextRun::getText).reduce("", String::concat);
        if (rawText.contains(oldText)) {
            String replacedRaw = rawText.replaceFirst(
                    Pattern.quote(oldText), Matcher.quoteReplacement(newText));
            return replaceBlockText(tokens, runs, replacedRaw, font);
        }

        return false;
    }

    private boolean replaceSingleOperator(List<Object> tokens, TextRun run,
                                          String oldText, String newText, PDFont font) throws IOException {
        int opIndex = run.getOperatorIndex();

        // Find the operator at this index
        int currentOpIndex = 0;
        for (int i = 0; i < tokens.size(); i++) {
            if (tokens.get(i) instanceof Operator) {
                if (currentOpIndex == opIndex) {
                    return replaceAtPosition(tokens, i, run, oldText, newText, font);
                }
                currentOpIndex++;
            }
        }
        return false;
    }

    private boolean replaceAtPosition(List<Object> tokens, int operatorTokenIndex,
                                      TextRun run, String oldText, String newText, PDFont font)
            throws IOException {

        Operator op = (Operator) tokens.get(operatorTokenIndex);
        String opName = op.getName();

        if ("Tj".equals(opName)) {
            // Simple case: (text) Tj
            // The operand is immediately before the operator
            int operandIndex = findOperandIndex(tokens, operatorTokenIndex);
            if (operandIndex < 0) return false;

            COSString cosString = (COSString) tokens.get(operandIndex);
            String decoded = decodeString(cosString, font);
            String replaced = decoded.replaceFirst(Pattern.quote(oldText), Matcher.quoteReplacement(newText));

            COSString newCosString = encodeString(replaced, font);
            tokens.set(operandIndex, newCosString);
            return true;

        } else if ("TJ".equals(opName)) {
            // Array case: [(text) kern (text)] TJ
            int operandIndex = findOperandIndex(tokens, operatorTokenIndex);
            if (operandIndex < 0 || !(tokens.get(operandIndex) instanceof COSArray)) return false;

            COSArray array = (COSArray) tokens.get(operandIndex);

            if (run.getTjArrayIndex() >= 0 && run.getTjArrayIndex() < array.size()) {
                // Replace within specific array element
                COSBase element = array.get(run.getTjArrayIndex());
                if (element instanceof COSString cosString) {
                    String decoded = decodeString(cosString, font);
                    String replaced = decoded.replaceFirst(Pattern.quote(oldText), Matcher.quoteReplacement(newText));
                    COSString newCosString = encodeString(replaced, font);
                    array.set(run.getTjArrayIndex(), newCosString);
                    return true;
                }
            } else {
                // Search all string elements in the array
                return replaceInTJArray(array, oldText, newText, font);
            }
        }

        return false;
    }

    private boolean replaceInTJArray(COSArray array, String oldText, String newText, PDFont font)
            throws IOException {
        // Build the full text from the array to find the target
        StringBuilder fullText = new StringBuilder();
        List<Integer> stringIndices = new ArrayList<>();

        for (int i = 0; i < array.size(); i++) {
            COSBase element = array.get(i);
            if (element instanceof COSString cosString) {
                fullText.append(decodeString(cosString, font));
                stringIndices.add(i);
            }
        }

        String full = fullText.toString();
        int pos = full.indexOf(oldText);
        if (pos < 0) return false;

        // Simple approach: if the old text is entirely within one string element, replace there
        int charCount = 0;
        for (int idx : stringIndices) {
            COSString cosString = (COSString) array.get(idx);
            String decoded = decodeString(cosString, font);
            int startInElement = pos - charCount;
            int endInElement = (pos + oldText.length()) - charCount;

            if (startInElement >= 0 && endInElement <= decoded.length()) {
                // Entire replacement is within this element
                String replaced = decoded.substring(0, startInElement)
                        + newText + decoded.substring(endInElement);
                array.set(idx, encodeString(replaced, font));
                return true;
            }

            charCount += decoded.length();
        }

        // Complex case: text spans multiple array elements
        // Replace the entire array with a single string
        COSArray newArray = new COSArray();
        String replacedFull = full.replaceFirst(Pattern.quote(oldText), Matcher.quoteReplacement(newText));
        newArray.add(encodeString(replacedFull, font));

        // Copy the new array contents back
        array.clear();
        for (int i = 0; i < newArray.size(); i++) {
            array.add(newArray.get(i));
        }
        return true;
    }

    private boolean replaceBlockText(List<Object> tokens, List<TextRun> runs,
                                     String newFullText, PDFont font) throws IOException {
        if (runs.isEmpty()) return false;

        // Collect distinct operator indices used by this block's runs
        java.util.Set<Integer> opIndices = new java.util.LinkedHashSet<>();
        for (TextRun run : runs) {
            opIndices.add(run.getOperatorIndex());
        }

        int firstOpIndex = runs.get(0).getOperatorIndex();
        int currentOpIndex = 0;
        boolean firstDone = false;

        for (int i = 0; i < tokens.size(); i++) {
            if (!(tokens.get(i) instanceof Operator)) continue;

            if (currentOpIndex == firstOpIndex && !firstDone) {
                // Put all replacement text in the first operator
                int operandIdx = findOperandIndex(tokens, i);
                if (operandIdx >= 0) {
                    Object operand = tokens.get(operandIdx);
                    if (operand instanceof COSString) {
                        tokens.set(operandIdx, encodeString(newFullText, font));
                        firstDone = true;
                    } else if (operand instanceof COSArray array) {
                        array.clear();
                        array.add(encodeString(newFullText, font));
                        firstDone = true;
                    }
                }
            } else if (firstDone && opIndices.contains(currentOpIndex)) {
                // Clear subsequent operators that belong to this block
                int operandIdx = findOperandIndex(tokens, i);
                if (operandIdx >= 0) {
                    Object operand = tokens.get(operandIdx);
                    if (operand instanceof COSString) {
                        tokens.set(operandIdx, encodeString("", font));
                    } else if (operand instanceof COSArray array) {
                        for (int j = 0; j < array.size(); j++) {
                            if (array.get(j) instanceof COSString) {
                                array.set(j, encodeString("", font));
                            }
                        }
                    }
                }
            }
            currentOpIndex++;
        }

        return firstDone;
    }

    private boolean changeFontSizeInTokens(List<Object> tokens, TextBlock textBlock, float newSize) {
        // Find the Tf operator that sets the font for this block
        List<TextRun> runs = textBlock.getRuns();
        if (runs.isEmpty()) return false;

        int targetOpIndex = runs.get(0).getOperatorIndex();

        // Walk backwards from the text operator to find the preceding Tf
        int currentOpIndex = 0;
        int lastTfOperandIndex = -1;

        for (int i = 0; i < tokens.size(); i++) {
            if (tokens.get(i) instanceof Operator op) {
                if ("Tf".equals(op.getName())) {
                    lastTfOperandIndex = i - 1; // Size is second operand (index i-1)
                }
                if (currentOpIndex == targetOpIndex) {
                    // Found target op, use the last Tf we saw
                    if (lastTfOperandIndex >= 0 && tokens.get(lastTfOperandIndex) instanceof COSNumber) {
                        tokens.set(lastTfOperandIndex, new COSFloat(newSize));
                        return true;
                    }
                    return false;
                }
                currentOpIndex++;
            }
        }
        return false;
    }

    private boolean changeColorInTokens(List<Object> tokens, TextBlock textBlock,
                                        float r, float g, float b) {
        List<TextRun> runs = textBlock.getRuns();
        if (runs.isEmpty()) return false;

        int targetOpIndex = runs.get(0).getOperatorIndex();

        // Find position just before the target text operator and insert/replace color operator
        int currentOpIndex = 0;
        int lastColorOpStart = -1;
        int lastColorOpEnd = -1;

        for (int i = 0; i < tokens.size(); i++) {
            if (tokens.get(i) instanceof Operator op) {
                String name = op.getName();
                if ("rg".equals(name) || "g".equals(name) || "k".equals(name)) {
                    lastColorOpEnd = i;
                    // Find start of this color operator's operands
                    lastColorOpStart = i;
                    while (lastColorOpStart > 0 && tokens.get(lastColorOpStart - 1) instanceof COSNumber) {
                        lastColorOpStart--;
                    }
                }
                if (currentOpIndex == targetOpIndex) {
                    if (lastColorOpStart >= 0) {
                        // Replace existing color operator
                        int removeCount = lastColorOpEnd - lastColorOpStart + 1;
                        for (int j = 0; j < removeCount; j++) {
                            tokens.remove(lastColorOpStart);
                        }
                        // Insert new rg operator
                        tokens.add(lastColorOpStart, new COSFloat(r));
                        tokens.add(lastColorOpStart + 1, new COSFloat(g));
                        tokens.add(lastColorOpStart + 2, new COSFloat(b));
                        tokens.add(lastColorOpStart + 3, Operator.getOperator("rg"));
                        return true;
                    } else {
                        // No prior color operator, insert one before the text operator
                        int insertPos = findFirstOperandIndex(tokens, i);
                        tokens.add(insertPos, new COSFloat(r));
                        tokens.add(insertPos + 1, new COSFloat(g));
                        tokens.add(insertPos + 2, new COSFloat(b));
                        tokens.add(insertPos + 3, Operator.getOperator("rg"));
                        return true;
                    }
                }
                currentOpIndex++;
            }
        }
        return false;
    }


    // --- Utility Methods ---

    private PDFont getFont(PDPage page, String fontResourceName) throws IOException {
        if (page.getResources() == null) return null;
        return page.getResources().getFont(COSName.getPDFName(fontResourceName));
    }

    private void validateEncodingForEdit(PDFont font, String oldText, String newText) throws IOException {
        // Fast path: try encoding the entire new text as a single call.
        try {
            font.encode(newText);
            return;
        } catch (IllegalArgumentException | IOException wholeStringFailed) {
            // Fall through to per-character analysis
        }

        // Characters from oldText are already in the PDF and known to work.
        // Whitespace is handled by encodeString's fallback (raw byte 0x20).
        Set<Character> oldChars = new HashSet<>();
        for (char c : oldText.toCharArray()) {
            oldChars.add(c);
        }

        List<Character> unsupported = new ArrayList<>();
        for (int i = 0; i < newText.length(); i++) {
            char c = newText.charAt(i);
            if (oldChars.contains(c) || Character.isWhitespace(c)) continue;
            try {
                byte[] enc = font.encode(String.valueOf(c));
                if (enc == null || enc.length == 0) {
                    unsupported.add(c);
                }
            } catch (IllegalArgumentException | IOException e) {
                unsupported.add(c);
            }
        }

        if (unsupported.isEmpty()) {
            return;
        }

        String chars = unsupported.stream()
                .map(c -> "'" + c + "'")
                .distinct()
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
        boolean isSubset = font.getName() != null && font.getName().contains("+");
        String hint = isSubset
                ? ". This is a subset font — only characters present in the original document are available"
                : "";
        throw new IOException("Characters " + chars + " cannot be encoded with font '"
                + font.getName() + "'" + hint
                + ". Try using characters that already appear in this text block.");
    }

    private COSString encodeString(String text, PDFont font) throws IOException {
        // Fast path: try encoding the whole string at once
        try {
            return new COSString(font.encode(text));
        } catch (IllegalArgumentException | IOException e) {
            // Fall back to character-by-character with whitespace handling
            return encodeStringWithFallback(text, font);
        }
    }

    private COSString encodeStringWithFallback(String text, PDFont font) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        boolean isType0 = font instanceof org.apache.pdfbox.pdmodel.font.PDType0Font;

        for (int i = 0; i < text.length(); i++) {
            char c = text.charAt(i);
            try {
                baos.write(font.encode(String.valueOf(c)));
            } catch (IllegalArgumentException | IOException e) {
                if (c == ' ' || Character.isWhitespace(c)) {
                    if (isType0) {
                        // Type0/CID fonts use 2-byte codes
                        baos.write(0x00);
                        baos.write(0x20);
                    } else {
                        // Type1/Simple fonts: space is at byte position 0x20
                        baos.write(0x20);
                    }
                } else {
                    throw new IOException("Character '" + c + "' (U+"
                            + String.format("%04X", (int) c)
                            + ") cannot be encoded with font '" + font.getName() + "'");
                }
            }
        }
        return new COSString(baos.toByteArray());
    }

    private String decodeString(COSString cosString, PDFont font) throws IOException {
        byte[] bytes = cosString.getBytes();
        StringBuilder sb = new StringBuilder();

        if (font instanceof org.apache.pdfbox.pdmodel.font.PDSimpleFont simpleFont) {
            for (byte b : bytes) {
                int code = b & 0xFF;
                String unicode = simpleFont.toUnicode(code);
                sb.append(unicode != null ? unicode : String.valueOf((char) code));
            }
        } else if (font instanceof org.apache.pdfbox.pdmodel.font.PDType0Font type0Font) {
            int i = 0;
            while (i < bytes.length) {
                int code;
                if (i + 1 < bytes.length) {
                    code = ((bytes[i] & 0xFF) << 8) | (bytes[i + 1] & 0xFF);
                    i += 2;
                } else {
                    code = bytes[i] & 0xFF;
                    i++;
                }
                String unicode = type0Font.toUnicode(code);
                if (unicode != null) sb.append(unicode);
            }
        } else {
            return cosString.getString();
        }

        return sb.toString();
    }

    private int findOperandIndex(List<Object> tokens, int operatorTokenIndex) {
        // Walk backwards to find the operand(s) for this operator
        for (int i = operatorTokenIndex - 1; i >= 0; i--) {
            if (tokens.get(i) instanceof COSString || tokens.get(i) instanceof COSArray) {
                return i;
            }
            if (tokens.get(i) instanceof Operator) break;
        }
        return -1;
    }

    private int findFirstOperandIndex(List<Object> tokens, int operatorTokenIndex) {
        int first = operatorTokenIndex;
        for (int i = operatorTokenIndex - 1; i >= 0; i--) {
            if (tokens.get(i) instanceof Operator) break;
            first = i;
        }
        return first;
    }

    private boolean isTextShowingOperator(List<Object> tokens, int tokenIndex) {
        if (!(tokens.get(tokenIndex) instanceof Operator op)) return false;
        String name = op.getName();
        return "Tj".equals(name) || "TJ".equals(name) || "'".equals(name) || "\"".equals(name);
    }


    /**
     * Writes modified tokens back to the page content stream.
     * This is the public version that accepts the document reference.
     */
    public void writeModifiedStream(PDDocument document, PDPage page, List<Object> tokens)
            throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ContentStreamWriter writer = new ContentStreamWriter(baos);
        writer.writeTokens(tokens);

        PDStream pdStream = new PDStream(document, new ByteArrayInputStream(baos.toByteArray()));
        page.setContents(pdStream);
    }
}
