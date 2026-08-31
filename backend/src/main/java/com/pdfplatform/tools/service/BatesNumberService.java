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
public class BatesNumberService {

    public byte[] addBatesNumbers(byte[] pdfBytes, String prefix, int startNumber,
                                   int digits, String suffix, String position,
                                   float fontSize) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();
                String number = String.format("%0" + digits + "d", startNumber + i);
                String batesLabel = prefix + number + suffix;

                float textWidth = font.getStringWidth(batesLabel) / 1000 * fontSize;
                float x, y;

                switch (position != null ? position : "bottom-right") {
                    case "bottom-left" -> { x = 36; y = 20; }
                    case "bottom-center" -> { x = (mediaBox.getWidth() - textWidth) / 2; y = 20; }
                    case "top-left" -> { x = 36; y = mediaBox.getHeight() - 20 - fontSize; }
                    case "top-center" -> { x = (mediaBox.getWidth() - textWidth) / 2; y = mediaBox.getHeight() - 20 - fontSize; }
                    case "top-right" -> { x = mediaBox.getWidth() - textWidth - 36; y = mediaBox.getHeight() - 20 - fontSize; }
                    default -> { x = mediaBox.getWidth() - textWidth - 36; y = 20; }
                }

                try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                        PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.beginText();
                    cs.setFont(font, fontSize);
                    cs.setNonStrokingColor(0f, 0f, 0f);
                    cs.newLineAtOffset(x, y);
                    cs.showText(batesLabel);
                    cs.endText();
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
