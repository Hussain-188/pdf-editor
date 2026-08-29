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
public class PageNumberService {

    public byte[] addPageNumbers(byte[] pdfBytes, String position, int startFrom, float fontSize) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA);

            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                PDRectangle rect = page.getMediaBox();
                String text = String.valueOf(startFrom + i);
                float textWidth = font.getStringWidth(text) / 1000 * fontSize;

                float x;
                float y;

                switch (position) {
                    case "bottom-left":
                        x = 40;
                        y = 30;
                        break;
                    case "bottom-right":
                        x = rect.getWidth() - 40 - textWidth;
                        y = 30;
                        break;
                    case "top-center":
                        x = (rect.getWidth() - textWidth) / 2;
                        y = rect.getHeight() - 30;
                        break;
                    case "top-left":
                        x = 40;
                        y = rect.getHeight() - 30;
                        break;
                    case "top-right":
                        x = rect.getWidth() - 40 - textWidth;
                        y = rect.getHeight() - 30;
                        break;
                    default: // bottom-center
                        x = (rect.getWidth() - textWidth) / 2;
                        y = 30;
                        break;
                }

                try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                        PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.beginText();
                    cs.setFont(font, fontSize);
                    cs.setNonStrokingColor(0.3f, 0.3f, 0.3f);
                    cs.newLineAtOffset(x, y);
                    cs.showText(text);
                    cs.endText();
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
