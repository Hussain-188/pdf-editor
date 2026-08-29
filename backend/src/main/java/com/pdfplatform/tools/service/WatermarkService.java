package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.state.PDExtendedGraphicsState;
import org.apache.pdfbox.util.Matrix;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class WatermarkService {

    public byte[] addWatermark(byte[] pdfBytes, String text, float opacity, float rotation, float fontSize)
            throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDType1Font font = new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);

            PDExtendedGraphicsState gs = new PDExtendedGraphicsState();
            gs.setNonStrokingAlphaConstant(opacity);
            gs.setStrokingAlphaConstant(opacity);

            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                PDRectangle rect = page.getMediaBox();

                try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                        PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.saveGraphicsState();
                    cs.setGraphicsStateParameters(gs);
                    cs.setNonStrokingColor(0.7f, 0.7f, 0.7f);
                    cs.beginText();
                    cs.setFont(font, fontSize);

                    float textWidth = font.getStringWidth(text) / 1000 * fontSize;
                    float cx = rect.getWidth() / 2;
                    float cy = rect.getHeight() / 2;

                    Matrix matrix = new Matrix(
                            (float) Math.cos(Math.toRadians(rotation)), (float) Math.sin(Math.toRadians(rotation)),
                            (float) -Math.sin(Math.toRadians(rotation)), (float) Math.cos(Math.toRadians(rotation)),
                            cx - textWidth / 2, cy
                    );
                    cs.setTextMatrix(matrix);
                    cs.showText(text);
                    cs.endText();
                    cs.restoreGraphicsState();
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
