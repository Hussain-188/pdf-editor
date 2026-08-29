package com.pdfplatform.engine.parser;

import com.pdfplatform.engine.model.TextRun;
import org.apache.pdfbox.contentstream.operator.Operator;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.pdfparser.PDFStreamParser;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses PDF content streams at the operator level to extract text operations
 * with full positional and font context. This works directly with the token
 * stream rather than using the high-level PDFStreamEngine, giving us the
 * operator indices we need for content stream rewriting.
 */
@Service
public class ContentStreamParser {

    private PDResources resources;
    private Matrix textMatrix;
    private Matrix textLineMatrix;
    private PDFont currentFont;
    private String currentFontResourceName;
    private float currentFontSize;
    private float[] currentColor;
    private float wordSpacing;
    private float charSpacing;
    private float textLeading;
    private float textRise;
    private float horizontalScaling;

    public List<TextRun> parse(PDPage page) throws IOException {
        List<TextRun> runs = new ArrayList<>();
        resources = page.getResources();
        resetState();

        PDFStreamParser parser = new PDFStreamParser(page);
        List<Object> tokens = parser.parse();

        int operatorIndex = 0;
        List<COSBase> operands = new ArrayList<>();

        for (Object token : tokens) {
            if (token instanceof Operator operator) {
                processOperator(operator, operands, runs, operatorIndex);
                operatorIndex++;
                operands.clear();
            } else if (token instanceof COSBase cosBase) {
                operands.add(cosBase);
            }
        }

        return runs;
    }

    /**
     * Returns the raw token list for a page's content stream.
     * Used by the editor to rebuild modified streams.
     */
    public List<Object> getTokens(PDPage page) throws IOException {
        PDFStreamParser parser = new PDFStreamParser(page);
        return parser.parse();
    }

    private void processOperator(Operator operator, List<COSBase> operands,
                                 List<TextRun> runs, int operatorIndex) throws IOException {
        String op = operator.getName();

        switch (op) {
            // Text state operators
            case "Tf" -> handleTf(operands);
            case "Tc" -> handleTc(operands);
            case "Tw" -> handleTw(operands);
            case "TL" -> handleTL(operands);
            case "Ts" -> handleTs(operands);
            case "Tz" -> handleTz(operands);

            // Text positioning operators
            case "BT" -> handleBT();
            case "ET" -> handleET();
            case "Td" -> handleTd(operands);
            case "TD" -> handleTD(operands);
            case "Tm" -> handleTm(operands);
            case "T*" -> handleTStar();

            // Text showing operators
            case "Tj" -> handleTj(operands, runs, operatorIndex);
            case "TJ" -> handleTJ(operands, runs, operatorIndex);
            case "'" -> handleQuote(operands, runs, operatorIndex);
            case "\"" -> handleDoubleQuote(operands, runs, operatorIndex);

            // Color operators (non-stroking)
            case "g" -> handleGray(operands);
            case "rg" -> handleRGB(operands);
            case "k" -> handleCMYK(operands);
            case "cs", "sc", "scn" -> {} // Complex color spaces - use default

            default -> {}
        }
    }

    private void resetState() {
        textMatrix = null;
        textLineMatrix = null;
        currentFont = null;
        currentFontResourceName = null;
        currentFontSize = 12;
        currentColor = new float[]{0, 0, 0};
        wordSpacing = 0;
        charSpacing = 0;
        textLeading = 0;
        textRise = 0;
        horizontalScaling = 100;
    }

    // --- Text State Operators ---

    private void handleTf(List<COSBase> operands) throws IOException {
        if (operands.size() < 2) return;
        COSName fontName = (COSName) operands.get(0);
        currentFontSize = ((COSNumber) operands.get(1)).floatValue();
        currentFontResourceName = fontName.getName();

        if (resources != null) {
            currentFont = resources.getFont(fontName);
        }
    }

    private void handleTc(List<COSBase> operands) {
        if (!operands.isEmpty()) charSpacing = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTw(List<COSBase> operands) {
        if (!operands.isEmpty()) wordSpacing = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTL(List<COSBase> operands) {
        if (!operands.isEmpty()) textLeading = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTs(List<COSBase> operands) {
        if (!operands.isEmpty()) textRise = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTz(List<COSBase> operands) {
        if (!operands.isEmpty()) horizontalScaling = ((COSNumber) operands.get(0)).floatValue();
    }

    // --- Text Positioning Operators ---

    private void handleBT() {
        textMatrix = new Matrix();
        textLineMatrix = new Matrix();
    }

    private void handleET() {
        textMatrix = null;
        textLineMatrix = null;
    }

    private void handleTd(List<COSBase> operands) {
        if (operands.size() < 2) return;
        float tx = ((COSNumber) operands.get(0)).floatValue();
        float ty = ((COSNumber) operands.get(1)).floatValue();
        Matrix translation = Matrix.getTranslateInstance(tx, ty);
        textLineMatrix = translation.multiply(textLineMatrix);
        textMatrix = textLineMatrix.clone();
    }

    private void handleTD(List<COSBase> operands) {
        if (operands.size() < 2) return;
        float ty = ((COSNumber) operands.get(1)).floatValue();
        textLeading = -ty;
        handleTd(operands);
    }

    private void handleTm(List<COSBase> operands) {
        if (operands.size() < 6) return;
        float a = ((COSNumber) operands.get(0)).floatValue();
        float b = ((COSNumber) operands.get(1)).floatValue();
        float c = ((COSNumber) operands.get(2)).floatValue();
        float d = ((COSNumber) operands.get(3)).floatValue();
        float e = ((COSNumber) operands.get(4)).floatValue();
        float f = ((COSNumber) operands.get(5)).floatValue();
        textMatrix = new Matrix(a, b, c, d, e, f);
        textLineMatrix = textMatrix.clone();
    }

    private void handleTStar() {
        List<COSBase> operands = new ArrayList<>();
        operands.add(new COSFloat(0));
        operands.add(new COSFloat(-textLeading));
        handleTd(operands);
    }

    // --- Text Showing Operators ---

    private void handleTj(List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        if (operands.isEmpty() || !(operands.get(0) instanceof COSString cosString)) return;
        if (textMatrix == null || currentFont == null) return;

        String text = decodeString(cosString);
        if (text.isEmpty()) return;

        float width = calculateStringWidth(text);
        TextRun run = buildTextRun(text, width, TextRun.OperatorType.Tj, operatorIndex, -1);
        runs.add(run);

        advanceTextPosition(text);
    }

    private void handleTJ(List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        if (operands.isEmpty() || !(operands.get(0) instanceof COSArray array)) return;
        if (textMatrix == null || currentFont == null) return;

        int arrayIndex = 0;
        for (COSBase element : array) {
            if (element instanceof COSString cosString) {
                String text = decodeString(cosString);
                if (!text.isEmpty()) {
                    float width = calculateStringWidth(text);
                    TextRun run = buildTextRun(text, width, TextRun.OperatorType.TJ, operatorIndex, arrayIndex);
                    runs.add(run);
                    advanceTextPosition(text);
                }
            } else if (element instanceof COSNumber num) {
                // Kerning adjustment: move text position
                // Negative values move right, positive move left (in thousandths of text space unit)
                float adjustment = num.floatValue();
                float displacement = -adjustment / 1000f * currentFontSize * (horizontalScaling / 100f);
                textMatrix = Matrix.getTranslateInstance(displacement, 0).multiply(textMatrix);
            }
            arrayIndex++;
        }
    }

    private void handleQuote(List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        handleTStar();
        if (operands.isEmpty() || !(operands.get(0) instanceof COSString cosString)) return;
        if (textMatrix == null || currentFont == null) return;

        String text = decodeString(cosString);
        if (text.isEmpty()) return;

        float width = calculateStringWidth(text);
        TextRun run = buildTextRun(text, width, TextRun.OperatorType.QUOTE, operatorIndex, -1);
        runs.add(run);
        advanceTextPosition(text);
    }

    private void handleDoubleQuote(List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        if (operands.size() < 3) return;
        wordSpacing = ((COSNumber) operands.get(0)).floatValue();
        charSpacing = ((COSNumber) operands.get(1)).floatValue();
        handleTStar();

        if (!(operands.get(2) instanceof COSString cosString)) return;
        if (textMatrix == null || currentFont == null) return;

        String text = decodeString(cosString);
        if (text.isEmpty()) return;

        float width = calculateStringWidth(text);
        TextRun run = buildTextRun(text, width, TextRun.OperatorType.DOUBLE_QUOTE, operatorIndex, -1);
        runs.add(run);
        advanceTextPosition(text);
    }

    // --- Color Operators ---

    private void handleGray(List<COSBase> operands) {
        if (!operands.isEmpty()) {
            float g = ((COSNumber) operands.get(0)).floatValue();
            currentColor = new float[]{g, g, g};
        }
    }

    private void handleRGB(List<COSBase> operands) {
        if (operands.size() >= 3) {
            currentColor = new float[]{
                ((COSNumber) operands.get(0)).floatValue(),
                ((COSNumber) operands.get(1)).floatValue(),
                ((COSNumber) operands.get(2)).floatValue()
            };
        }
    }

    private void handleCMYK(List<COSBase> operands) {
        if (operands.size() >= 4) {
            float c = ((COSNumber) operands.get(0)).floatValue();
            float m = ((COSNumber) operands.get(1)).floatValue();
            float y = ((COSNumber) operands.get(2)).floatValue();
            float k = ((COSNumber) operands.get(3)).floatValue();
            // CMYK to RGB approximation
            currentColor = new float[]{
                (1 - c) * (1 - k),
                (1 - m) * (1 - k),
                (1 - y) * (1 - k)
            };
        }
    }

    // --- Helper Methods ---

    private TextRun buildTextRun(String text, float width, TextRun.OperatorType opType,
                                 int operatorIndex, int tjArrayIndex) {
        float x = textMatrix.getTranslateX();
        float y = textMatrix.getTranslateY();

        String fontName = currentFont.getName() != null ? currentFont.getName() : "Unknown";
        float[] tm = {
            textMatrix.getScaleX(), textMatrix.getShearY(),
            textMatrix.getShearX(), textMatrix.getScaleY(),
            textMatrix.getTranslateX(), textMatrix.getTranslateY()
        };

        return new TextRun(text, x, y, width, currentFontSize, fontName,
                currentFontResourceName, currentColor.clone(), tm, 0, operatorIndex,
                opType, tjArrayIndex);
    }

    private void advanceTextPosition(String text) throws IOException {
        float tx = 0;
        for (int i = 0; i < text.length(); i++) {
            int codePoint = text.codePointAt(i);
            float charWidth;
            try {
                charWidth = currentFont.getWidth(codePoint) / 1000f * currentFontSize;
            } catch (Exception e) {
                charWidth = currentFontSize * 0.5f; // Fallback
            }
            tx += charWidth;
            tx += charSpacing;
            if (codePoint == ' ') {
                tx += wordSpacing;
            }
        }
        tx *= (horizontalScaling / 100f);
        textMatrix = Matrix.getTranslateInstance(tx, 0).multiply(textMatrix);
    }

    private String decodeString(COSString cosString) {
        if (currentFont == null) return cosString.getString();

        byte[] bytes = cosString.getBytes();
        StringBuilder sb = new StringBuilder();

        if (currentFont instanceof org.apache.pdfbox.pdmodel.font.PDSimpleFont simpleFont) {
            for (byte b : bytes) {
                int code = b & 0xFF;
                String unicode = simpleFont.toUnicode(code);
                sb.append(unicode != null ? unicode : String.valueOf((char) code));
            }
        } else if (currentFont instanceof org.apache.pdfbox.pdmodel.font.PDType0Font type0Font) {
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

    private float calculateStringWidth(String text) {
        try {
            return currentFont.getStringWidth(text) / 1000f * currentFontSize * (horizontalScaling / 100f);
        } catch (Exception e) {
            return text.length() * currentFontSize * 0.5f;
        }
    }
}
