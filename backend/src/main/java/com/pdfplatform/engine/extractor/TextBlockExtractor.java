package com.pdfplatform.engine.extractor;

import com.pdfplatform.engine.model.TextBlock;
import com.pdfplatform.engine.model.TextBlock.EditabilityInfo;
import com.pdfplatform.engine.model.TextRun;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDFontDescriptor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;

/**
 * Groups TextRuns into logical TextBlocks based on spatial proximity and font properties.
 * Also assesses editability of each block based on font embedding and encoding.
 */
@Service
public class TextBlockExtractor {

    private static final float LINE_SPACING_THRESHOLD = 1.5f; // Factor of font size
    private static final float WORD_SPACING_THRESHOLD = 3.0f; // Factor of average char width

    public List<TextBlock> extract(List<TextRun> runs, PDPage page) {
        if (runs.isEmpty()) return List.of();

        List<List<TextRun>> groups = groupRunsIntoBlocks(runs);
        List<TextBlock> blocks = new ArrayList<>();
        int blockIdCounter = 0;

        for (List<TextRun> group : groups) {
            TextBlock block = buildBlock(group, page, ++blockIdCounter);
            if (block != null) blocks.add(block);
        }

        return blocks;
    }

    private List<List<TextRun>> groupRunsIntoBlocks(List<TextRun> runs) {
        List<List<TextRun>> groups = new ArrayList<>();
        List<TextRun> currentGroup = new ArrayList<>();
        currentGroup.add(runs.get(0));

        for (int i = 1; i < runs.size(); i++) {
            TextRun prev = runs.get(i - 1);
            TextRun curr = runs.get(i);

            if (shouldGroupTogether(prev, curr)) {
                currentGroup.add(curr);
            } else {
                groups.add(currentGroup);
                currentGroup = new ArrayList<>();
                currentGroup.add(curr);
            }
        }

        if (!currentGroup.isEmpty()) {
            groups.add(currentGroup);
        }

        return groups;
    }

    private boolean shouldGroupTogether(TextRun prev, TextRun curr) {
        // Different fonts = different block
        if (!Objects.equals(prev.getFontResourceName(), curr.getFontResourceName())) {
            return false;
        }

        // Very different font sizes = different block
        if (Math.abs(prev.getFontSize() - curr.getFontSize()) > 0.5f) {
            return false;
        }

        float fontSize = prev.getFontSize();
        float verticalDistance = Math.abs(prev.getY() - curr.getY());
        float horizontalDistance = curr.getX() - (prev.getX() + prev.getWidth());

        // Same line: group if within reasonable word spacing (reject large negative gaps)
        if (verticalDistance < fontSize * 0.3f) {
            return horizontalDistance >= -fontSize * 0.5f
                    && horizontalDistance < fontSize * WORD_SPACING_THRESHOLD;
        }

        // Different lines: group if within line spacing threshold and horizontally aligned
        if (verticalDistance < fontSize * LINE_SPACING_THRESHOLD) {
            float leftAlignment = Math.abs(prev.getX() - curr.getX());
            return leftAlignment < fontSize * 2;
        }

        return false;
    }

    private TextBlock buildBlock(List<TextRun> runs, PDPage page, int blockIdCounter) {
        if (runs.isEmpty()) return null;

        String id = "block-" + blockIdCounter;
        TextRun first = runs.get(0);

        // Calculate bounding box
        float minX = Float.MAX_VALUE, minY = Float.MAX_VALUE;
        float maxX = Float.MIN_VALUE, maxY = Float.MIN_VALUE;

        for (TextRun run : runs) {
            float fontSize = run.getFontSize();
            float ascent = fontSize * 0.8f;
            float descent = fontSize * 0.25f;
            minX = Math.min(minX, run.getX());
            minY = Math.min(minY, run.getY() - descent);
            maxX = Math.max(maxX, run.getX() + run.getWidth());
            maxY = Math.max(maxY, run.getY() + ascent);
        }

        float width = maxX - minX;
        float height = maxY - minY;

        // Assess editability
        EditabilityInfo editability = assessEditability(first, page);

        return new TextBlock(
                id, 0, runs, minX, minY, width, height,
                first.getFontName(), first.getFontResourceName(),
                first.getFontSize(), first.getColor(), editability
        );
    }

    private EditabilityInfo assessEditability(TextRun representative, PDPage page) {
        if (page.getResources() == null) {
            return EditabilityInfo.notEditable("No page resources available");
        }

        try {
            PDFont font = page.getResources().getFont(
                    org.apache.pdfbox.cos.COSName.getPDFName(representative.getFontResourceName()));

            if (font == null) {
                return EditabilityInfo.notEditable("Font not found in resources");
            }

            PDFontDescriptor descriptor = font.getFontDescriptor();

            // Check if font is embedded
            boolean isEmbedded = false;
            if (descriptor != null) {
                isEmbedded = descriptor.getFontFile() != null
                        || descriptor.getFontFile2() != null
                        || descriptor.getFontFile3() != null;
            }

            // Check if it's a subset font
            boolean isSubset = font.getName() != null && font.getName().contains("+");

            if (!isEmbedded && isSubset) {
                return EditabilityInfo.notEditable(
                        "Font is subset but not embedded - cannot determine available glyphs");
            }

            if (isSubset) {
                return EditabilityInfo.partiallyEditable(
                        "Subset font - only characters present in original text can be used");
            }

            if (isEmbedded) {
                return EditabilityInfo.fullyEditable();
            }

            // Standard 14 fonts or system fonts: editable but may look different
            return new EditabilityInfo(true, true, false,
                    "Font not embedded - appearance may differ across viewers", 0.8);

        } catch (IOException e) {
            return EditabilityInfo.notEditable("Error analyzing font: " + e.getMessage());
        }
    }
}
