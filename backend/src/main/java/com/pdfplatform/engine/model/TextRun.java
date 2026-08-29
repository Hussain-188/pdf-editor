package com.pdfplatform.engine.model;

/**
 * Represents a single text rendering operation extracted from a PDF content stream.
 * Maps to one Tj or one element within a TJ array.
 */
public class TextRun {
    private final String text;
    private final float x;
    private final float y;
    private final float width;
    private final float fontSize;
    private final String fontName;
    private final String fontResourceName;
    private final float[] color;
    private final float[] textMatrix;

    // Content stream location for editing
    private final int contentStreamIndex;
    private final int operatorIndex;
    private final OperatorType operatorType;
    private final int tjArrayIndex; // -1 if simple Tj, otherwise index within TJ array

    public TextRun(String text, float x, float y, float width, float fontSize,
                   String fontName, String fontResourceName, float[] color,
                   float[] textMatrix, int contentStreamIndex, int operatorIndex,
                   OperatorType operatorType, int tjArrayIndex) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.width = width;
        this.fontSize = fontSize;
        this.fontName = fontName;
        this.fontResourceName = fontResourceName;
        this.color = color;
        this.textMatrix = textMatrix;
        this.contentStreamIndex = contentStreamIndex;
        this.operatorIndex = operatorIndex;
        this.operatorType = operatorType;
        this.tjArrayIndex = tjArrayIndex;
    }

    public String getText() { return text; }
    public float getX() { return x; }
    public float getY() { return y; }
    public float getWidth() { return width; }
    public float getFontSize() { return fontSize; }
    public String getFontName() { return fontName; }
    public String getFontResourceName() { return fontResourceName; }
    public float[] getColor() { return color; }
    public float[] getTextMatrix() { return textMatrix; }
    public int getContentStreamIndex() { return contentStreamIndex; }
    public int getOperatorIndex() { return operatorIndex; }
    public OperatorType getOperatorType() { return operatorType; }
    public int getTjArrayIndex() { return tjArrayIndex; }

    @Override
    public String toString() {
        return String.format("TextRun[\"%s\" at (%.1f, %.1f) font=%s size=%.1f]",
                text, x, y, fontName, fontSize);
    }

    public enum OperatorType {
        Tj,   // Show string: (text) Tj
        TJ,   // Show with positioning: [(text) kern (text)] TJ
        QUOTE, // Move to next line and show: (text) '
        DOUBLE_QUOTE // Set spacing, move, show: aw ac (text) "
    }
}
