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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

@Service
public class ContentStreamParser {

    private static class GraphicsState {
        final Matrix ctm;
        final PDFont currentFont;
        final String currentFontResourceName;
        final float currentFontSize;
        final float[] currentColor;
        final float wordSpacing;
        final float charSpacing;
        final float textLeading;
        final float textRise;
        final float horizontalScaling;

        GraphicsState(ParseContext ctx) {
            this.ctm = ctx.ctm.clone();
            this.currentFont = ctx.currentFont;
            this.currentFontResourceName = ctx.currentFontResourceName;
            this.currentFontSize = ctx.currentFontSize;
            this.currentColor = ctx.currentColor.clone();
            this.wordSpacing = ctx.wordSpacing;
            this.charSpacing = ctx.charSpacing;
            this.textLeading = ctx.textLeading;
            this.textRise = ctx.textRise;
            this.horizontalScaling = ctx.horizontalScaling;
        }

        void restoreTo(ParseContext ctx) {
            ctx.ctm = this.ctm;
            ctx.currentFont = this.currentFont;
            ctx.currentFontResourceName = this.currentFontResourceName;
            ctx.currentFontSize = this.currentFontSize;
            ctx.currentColor = this.currentColor;
            ctx.wordSpacing = this.wordSpacing;
            ctx.charSpacing = this.charSpacing;
            ctx.textLeading = this.textLeading;
            ctx.textRise = this.textRise;
            ctx.horizontalScaling = this.horizontalScaling;
        }
    }

    private static class ParseContext {
        PDResources resources;
        Matrix textMatrix;
        Matrix textLineMatrix;
        Matrix ctm = new Matrix();
        Deque<GraphicsState> graphicsStateStack = new ArrayDeque<>();
        PDFont currentFont;
        String currentFontResourceName;
        float currentFontSize = 12;
        float[] currentColor = {0, 0, 0};
        float wordSpacing;
        float charSpacing;
        float textLeading;
        float textRise;
        float horizontalScaling = 100;
    }

    public List<TextRun> parse(PDPage page) throws IOException {
        List<TextRun> runs = new ArrayList<>();
        ParseContext ctx = new ParseContext();
        ctx.resources = page.getResources();

        PDFStreamParser parser = new PDFStreamParser(page);
        List<Object> tokens = parser.parse();

        int operatorIndex = 0;
        List<COSBase> operands = new ArrayList<>();

        for (Object token : tokens) {
            if (token instanceof Operator operator) {
                processOperator(ctx, operator, operands, runs, operatorIndex);
                operatorIndex++;
                operands.clear();
            } else if (token instanceof COSBase cosBase) {
                operands.add(cosBase);
            }
        }

        return runs;
    }

    public List<Object> getTokens(PDPage page) throws IOException {
        PDFStreamParser parser = new PDFStreamParser(page);
        return parser.parse();
    }

    private void processOperator(ParseContext ctx, Operator operator, List<COSBase> operands,
                                 List<TextRun> runs, int operatorIndex) throws IOException {
        String op = operator.getName();

        switch (op) {
            case "Tf" -> handleTf(ctx, operands);
            case "Tc" -> handleTc(ctx, operands);
            case "Tw" -> handleTw(ctx, operands);
            case "TL" -> handleTL(ctx, operands);
            case "Ts" -> handleTs(ctx, operands);
            case "Tz" -> handleTz(ctx, operands);

            case "BT" -> handleBT(ctx);
            case "ET" -> handleET(ctx);
            case "Td" -> handleTd(ctx, operands);
            case "TD" -> handleTD(ctx, operands);
            case "Tm" -> handleTm(ctx, operands);
            case "T*" -> handleTStar(ctx);

            case "Tj" -> handleTj(ctx, operands, runs, operatorIndex);
            case "TJ" -> handleTJ(ctx, operands, runs, operatorIndex);
            case "'" -> handleQuote(ctx, operands, runs, operatorIndex);
            case "\"" -> handleDoubleQuote(ctx, operands, runs, operatorIndex);

            case "g" -> handleGray(ctx, operands);
            case "rg" -> handleRGB(ctx, operands);
            case "k" -> handleCMYK(ctx, operands);

            case "cm" -> handleCm(ctx, operands);
            case "q" -> handleQ(ctx);
            case "Q" -> handleQRestore(ctx);

            case "cs", "sc", "scn" -> {}
            default -> {}
        }
    }

    // --- Graphics State Operators ---

    private void handleCm(ParseContext ctx, List<COSBase> operands) {
        if (operands.size() < 6) return;
        float a = ((COSNumber) operands.get(0)).floatValue();
        float b = ((COSNumber) operands.get(1)).floatValue();
        float c = ((COSNumber) operands.get(2)).floatValue();
        float d = ((COSNumber) operands.get(3)).floatValue();
        float e = ((COSNumber) operands.get(4)).floatValue();
        float f = ((COSNumber) operands.get(5)).floatValue();
        Matrix cm = new Matrix(a, b, c, d, e, f);
        ctx.ctm = cm.multiply(ctx.ctm);
    }

    private void handleQ(ParseContext ctx) {
        ctx.graphicsStateStack.push(new GraphicsState(ctx));
    }

    private void handleQRestore(ParseContext ctx) {
        if (!ctx.graphicsStateStack.isEmpty()) {
            ctx.graphicsStateStack.pop().restoreTo(ctx);
        }
    }

    // --- Text State Operators ---

    private void handleTf(ParseContext ctx, List<COSBase> operands) throws IOException {
        if (operands.size() < 2) return;
        COSName fontName = (COSName) operands.get(0);
        ctx.currentFontSize = ((COSNumber) operands.get(1)).floatValue();
        ctx.currentFontResourceName = fontName.getName();

        if (ctx.resources != null) {
            ctx.currentFont = ctx.resources.getFont(fontName);
        }
    }

    private void handleTc(ParseContext ctx, List<COSBase> operands) {
        if (!operands.isEmpty()) ctx.charSpacing = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTw(ParseContext ctx, List<COSBase> operands) {
        if (!operands.isEmpty()) ctx.wordSpacing = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTL(ParseContext ctx, List<COSBase> operands) {
        if (!operands.isEmpty()) ctx.textLeading = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTs(ParseContext ctx, List<COSBase> operands) {
        if (!operands.isEmpty()) ctx.textRise = ((COSNumber) operands.get(0)).floatValue();
    }

    private void handleTz(ParseContext ctx, List<COSBase> operands) {
        if (!operands.isEmpty()) ctx.horizontalScaling = ((COSNumber) operands.get(0)).floatValue();
    }

    // --- Text Positioning Operators ---

    private void handleBT(ParseContext ctx) {
        ctx.textMatrix = new Matrix();
        ctx.textLineMatrix = new Matrix();
    }

    private void handleET(ParseContext ctx) {
        ctx.textMatrix = null;
        ctx.textLineMatrix = null;
    }

    private void handleTd(ParseContext ctx, List<COSBase> operands) {
        if (operands.size() < 2) return;
        float tx = ((COSNumber) operands.get(0)).floatValue();
        float ty = ((COSNumber) operands.get(1)).floatValue();
        Matrix translation = Matrix.getTranslateInstance(tx, ty);
        ctx.textLineMatrix = translation.multiply(ctx.textLineMatrix);
        ctx.textMatrix = ctx.textLineMatrix.clone();
    }

    private void handleTD(ParseContext ctx, List<COSBase> operands) {
        if (operands.size() < 2) return;
        float ty = ((COSNumber) operands.get(1)).floatValue();
        ctx.textLeading = -ty;
        handleTd(ctx, operands);
    }

    private void handleTm(ParseContext ctx, List<COSBase> operands) {
        if (operands.size() < 6) return;
        float a = ((COSNumber) operands.get(0)).floatValue();
        float b = ((COSNumber) operands.get(1)).floatValue();
        float c = ((COSNumber) operands.get(2)).floatValue();
        float d = ((COSNumber) operands.get(3)).floatValue();
        float e = ((COSNumber) operands.get(4)).floatValue();
        float f = ((COSNumber) operands.get(5)).floatValue();
        ctx.textMatrix = new Matrix(a, b, c, d, e, f);
        ctx.textLineMatrix = ctx.textMatrix.clone();
    }

    private void handleTStar(ParseContext ctx) {
        List<COSBase> operands = new ArrayList<>();
        operands.add(new COSFloat(0));
        operands.add(new COSFloat(-ctx.textLeading));
        handleTd(ctx, operands);
    }

    // --- Text Showing Operators ---

    private void handleTj(ParseContext ctx, List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        if (operands.isEmpty() || !(operands.get(0) instanceof COSString cosString)) return;
        if (ctx.textMatrix == null || ctx.currentFont == null) return;

        String text = decodeString(ctx, cosString);
        if (text.isEmpty()) return;

        float width = calculateStringWidth(ctx, text);
        TextRun run = buildTextRun(ctx, text, width, TextRun.OperatorType.Tj, operatorIndex, -1);
        runs.add(run);

        advanceTextPosition(ctx, text);
    }

    private void handleTJ(ParseContext ctx, List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        if (operands.isEmpty() || !(operands.get(0) instanceof COSArray array)) return;
        if (ctx.textMatrix == null || ctx.currentFont == null) return;

        int arrayIndex = 0;
        for (COSBase element : array) {
            if (element instanceof COSString cosString) {
                String text = decodeString(ctx, cosString);
                if (!text.isEmpty()) {
                    float width = calculateStringWidth(ctx, text);
                    TextRun run = buildTextRun(ctx, text, width, TextRun.OperatorType.TJ, operatorIndex, arrayIndex);
                    runs.add(run);
                    advanceTextPosition(ctx, text);
                }
            } else if (element instanceof COSNumber num) {
                float adjustment = num.floatValue();
                float displacement = -adjustment / 1000f * ctx.currentFontSize * (ctx.horizontalScaling / 100f);
                ctx.textMatrix = Matrix.getTranslateInstance(displacement, 0).multiply(ctx.textMatrix);
            }
            arrayIndex++;
        }
    }

    private void handleQuote(ParseContext ctx, List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        handleTStar(ctx);
        if (operands.isEmpty() || !(operands.get(0) instanceof COSString cosString)) return;
        if (ctx.textMatrix == null || ctx.currentFont == null) return;

        String text = decodeString(ctx, cosString);
        if (text.isEmpty()) return;

        float width = calculateStringWidth(ctx, text);
        TextRun run = buildTextRun(ctx, text, width, TextRun.OperatorType.QUOTE, operatorIndex, -1);
        runs.add(run);
        advanceTextPosition(ctx, text);
    }

    private void handleDoubleQuote(ParseContext ctx, List<COSBase> operands, List<TextRun> runs, int operatorIndex) throws IOException {
        if (operands.size() < 3) return;
        ctx.wordSpacing = ((COSNumber) operands.get(0)).floatValue();
        ctx.charSpacing = ((COSNumber) operands.get(1)).floatValue();
        handleTStar(ctx);

        if (!(operands.get(2) instanceof COSString cosString)) return;
        if (ctx.textMatrix == null || ctx.currentFont == null) return;

        String text = decodeString(ctx, cosString);
        if (text.isEmpty()) return;

        float width = calculateStringWidth(ctx, text);
        TextRun run = buildTextRun(ctx, text, width, TextRun.OperatorType.DOUBLE_QUOTE, operatorIndex, -1);
        runs.add(run);
        advanceTextPosition(ctx, text);
    }

    // --- Color Operators ---

    private void handleGray(ParseContext ctx, List<COSBase> operands) {
        if (!operands.isEmpty()) {
            float g = ((COSNumber) operands.get(0)).floatValue();
            ctx.currentColor = new float[]{g, g, g};
        }
    }

    private void handleRGB(ParseContext ctx, List<COSBase> operands) {
        if (operands.size() >= 3) {
            ctx.currentColor = new float[]{
                ((COSNumber) operands.get(0)).floatValue(),
                ((COSNumber) operands.get(1)).floatValue(),
                ((COSNumber) operands.get(2)).floatValue()
            };
        }
    }

    private void handleCMYK(ParseContext ctx, List<COSBase> operands) {
        if (operands.size() >= 4) {
            float c = ((COSNumber) operands.get(0)).floatValue();
            float m = ((COSNumber) operands.get(1)).floatValue();
            float y = ((COSNumber) operands.get(2)).floatValue();
            float k = ((COSNumber) operands.get(3)).floatValue();
            ctx.currentColor = new float[]{
                (1 - c) * (1 - k),
                (1 - m) * (1 - k),
                (1 - y) * (1 - k)
            };
        }
    }

    // --- Helper Methods ---

    private TextRun buildTextRun(ParseContext ctx, String text, float width, TextRun.OperatorType opType,
                                 int operatorIndex, int tjArrayIndex) {
        Matrix effectiveMatrix = ctx.textMatrix.multiply(ctx.ctm);
        float x = effectiveMatrix.getTranslateX();
        float y = effectiveMatrix.getTranslateY();

        String fontName = ctx.currentFont.getName() != null ? ctx.currentFont.getName() : "Unknown";
        float[] tm = {
            ctx.textMatrix.getScaleX(), ctx.textMatrix.getShearY(),
            ctx.textMatrix.getShearX(), ctx.textMatrix.getScaleY(),
            ctx.textMatrix.getTranslateX(), ctx.textMatrix.getTranslateY()
        };

        return new TextRun(text, x, y, width, ctx.currentFontSize, fontName,
                ctx.currentFontResourceName, ctx.currentColor.clone(), tm, 0, operatorIndex,
                opType, tjArrayIndex);
    }

    private void advanceTextPosition(ParseContext ctx, String text) throws IOException {
        float tx = 0;
        for (int i = 0; i < text.length(); i++) {
            int codePoint = text.codePointAt(i);
            float charWidth;
            try {
                charWidth = ctx.currentFont.getWidth(codePoint) / 1000f * ctx.currentFontSize;
            } catch (Exception e) {
                charWidth = ctx.currentFontSize * 0.5f;
            }
            tx += charWidth;
            tx += ctx.charSpacing;
            if (codePoint == ' ') {
                tx += ctx.wordSpacing;
            }
        }
        tx *= (ctx.horizontalScaling / 100f);
        ctx.textMatrix = Matrix.getTranslateInstance(tx, 0).multiply(ctx.textMatrix);
    }

    private String decodeString(ParseContext ctx, COSString cosString) {
        if (ctx.currentFont == null) return cosString.getString();

        byte[] bytes = cosString.getBytes();
        StringBuilder sb = new StringBuilder();

        if (ctx.currentFont instanceof org.apache.pdfbox.pdmodel.font.PDSimpleFont simpleFont) {
            for (byte b : bytes) {
                int code = b & 0xFF;
                String unicode = simpleFont.toUnicode(code);
                sb.append(unicode != null ? unicode : String.valueOf((char) code));
            }
        } else if (ctx.currentFont instanceof org.apache.pdfbox.pdmodel.font.PDType0Font type0Font) {
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

    private float calculateStringWidth(ParseContext ctx, String text) {
        try {
            return ctx.currentFont.getStringWidth(text) / 1000f * ctx.currentFontSize * (ctx.horizontalScaling / 100f);
        } catch (Exception e) {
            return text.length() * ctx.currentFontSize * 0.5f;
        }
    }
}
