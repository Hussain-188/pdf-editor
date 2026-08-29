package com.pdfplatform.engine.model;

import java.util.ArrayList;
import java.util.List;

/**
 * A logical grouping of TextRuns that form a coherent text block on the page.
 * Groups are determined by spatial proximity and shared font properties.
 */
public class TextBlock {
    private final String id;
    private final int pageNumber;
    private final List<TextRun> runs;
    private final float x;
    private final float y;
    private final float width;
    private final float height;
    private final String fontName;
    private final String fontResourceName;
    private final float fontSize;
    private final float[] color;
    private final EditabilityInfo editability;

    public TextBlock(String id, int pageNumber, List<TextRun> runs,
                     float x, float y, float width, float height,
                     String fontName, String fontResourceName, float fontSize,
                     float[] color, EditabilityInfo editability) {
        this.id = id;
        this.pageNumber = pageNumber;
        this.runs = new ArrayList<>(runs);
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fontName = fontName;
        this.fontResourceName = fontResourceName;
        this.fontSize = fontSize;
        this.color = color;
        this.editability = editability;
    }

    public String getFullText() {
        StringBuilder sb = new StringBuilder();
        for (TextRun run : runs) {
            sb.append(run.getText());
        }
        return sb.toString();
    }

    public String getId() { return id; }
    public int getPageNumber() { return pageNumber; }
    public List<TextRun> getRuns() { return runs; }
    public float getX() { return x; }
    public float getY() { return y; }
    public float getWidth() { return width; }
    public float getHeight() { return height; }
    public String getFontName() { return fontName; }
    public String getFontResourceName() { return fontResourceName; }
    public float getFontSize() { return fontSize; }
    public float[] getColor() { return color; }
    public EditabilityInfo getEditability() { return editability; }

    @Override
    public String toString() {
        return String.format("TextBlock[id=%s, text=\"%s\", pos=(%.1f,%.1f), font=%s/%.1f, editable=%s]",
                id, getFullText(), x, y, fontName, fontSize, editability.canEdit());
    }

    public record EditabilityInfo(
            boolean canEdit,
            boolean canAddCharacters,
            boolean canChangeFont,
            String reason,
            double confidence
    ) {
        public static EditabilityInfo fullyEditable() {
            return new EditabilityInfo(true, true, true, null, 1.0);
        }

        public static EditabilityInfo partiallyEditable(String reason) {
            return new EditabilityInfo(true, false, false, reason, 0.7);
        }

        public static EditabilityInfo notEditable(String reason) {
            return new EditabilityInfo(false, false, false, reason, 1.0);
        }
    }
}
