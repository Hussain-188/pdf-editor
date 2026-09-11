package com.pdfplatform.document.dto;

import com.pdfplatform.document.entity.Document;

/**
 * Holds the result of a document edit, including the updated document
 * and the original property values of the affected text block (needed for undo).
 */
public record EditResult(
        Document document,
        Double originalFontSize,
        double[] originalColor
) {}
