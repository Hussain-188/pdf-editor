package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class HeaderFooterService {

    public byte[] addHeaderFooter(byte[] pdfBytes, String headerText, String footerText,
                                   float fontSize, String alignment) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                PDRectangle rect = page.getMediaBox();

                String processedHeader = replaceVariables(headerText, i + 1, doc.getNumberOfPages());
                String processedFooter = replaceVariables(footerText, i + 1, doc.getNumberOfPages());

                try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                        PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.setFont(font, fontSize);
                    cs.setNonStrokingColor(0.3f, 0.3f, 0.3f);

                    if (processedHeader != null && !processedHeader.isEmpty()) {
                        float headerWidth = font.getStringWidth(processedHeader) / 1000 * fontSize;
                        float x = getAlignedX(rect.getWidth(), headerWidth, alignment);
                        float y = rect.getHeight() - 25;
                        cs.beginText();
                        cs.newLineAtOffset(x, y);
                        cs.showText(processedHeader);
                        cs.endText();
                    }

                    if (processedFooter != null && !processedFooter.isEmpty()) {
                        float footerWidth = font.getStringWidth(processedFooter) / 1000 * fontSize;
                        float x = getAlignedX(rect.getWidth(), footerWidth, alignment);
                        float y = 20;
                        cs.beginText();
                        cs.newLineAtOffset(x, y);
                        cs.showText(processedFooter);
                        cs.endText();
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    private String replaceVariables(String text, int pageNum, int totalPages) {
        if (text == null) return "";
        return text
                .replace("{page}", String.valueOf(pageNum))
                .replace("{total}", String.valueOf(totalPages));
    }

    private float getAlignedX(float pageWidth, float textWidth, String alignment) {
        return switch (alignment) {
            case "left" -> 40;
            case "right" -> pageWidth - 40 - textWidth;
            default -> (pageWidth - textWidth) / 2;
        };
    }
}
