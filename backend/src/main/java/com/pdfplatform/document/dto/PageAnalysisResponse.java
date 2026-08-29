package com.pdfplatform.document.dto;

import java.util.List;

public record PageAnalysisResponse(
        int pageNumber,
        double width,
        double height,
        List<TextBlockDto> textBlocks
) {
    public record TextBlockDto(
            String id,
            String text,
            double x,
            double y,
            double width,
            double height,
            String fontName,
            double fontSize,
            double[] color,
            EditabilityDto editability,
            List<TextRunDto> runs
    ) {}

    public record TextRunDto(
            String text,
            double x,
            double y,
            double width,
            double fontSize,
            String fontName,
            int contentStreamIndex,
            int operatorIndex,
            String operatorType
    ) {}

    public record EditabilityDto(
            boolean canEdit,
            boolean canAddCharacters,
            boolean canChangeFont,
            String reason,
            double confidence
    ) {}
}
