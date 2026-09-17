package com.pdfplatform.editor.dto;

public record EditRequest(
        int pageNumber,
        String textBlockId,
        String operation,
        String oldText,
        String newText,
        Double fontSize,
        double[] color
) {}
