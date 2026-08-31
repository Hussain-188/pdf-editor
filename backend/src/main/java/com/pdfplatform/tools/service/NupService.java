package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.multipdf.LayerUtility;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.form.PDFormXObject;
import org.springframework.stereotype.Service;

import java.awt.geom.AffineTransform;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class NupService {

    public byte[] nup(byte[] pdfBytes, int pagesPerSheet) throws IOException {
        int cols, rows;
        switch (pagesPerSheet) {
            case 2 -> { cols = 2; rows = 1; }
            case 4 -> { cols = 2; rows = 2; }
            case 6 -> { cols = 3; rows = 2; }
            case 9 -> { cols = 3; rows = 3; }
            default -> throw new IllegalArgumentException("Pages per sheet must be 2, 4, 6, or 9");
        }

        try (PDDocument source = Loader.loadPDF(pdfBytes);
             PDDocument output = new PDDocument()) {

            LayerUtility layerUtility = new LayerUtility(output);
            int totalPages = source.getNumberOfPages();
            PDRectangle targetSize = PDRectangle.A4;
            if (pagesPerSheet == 2) {
                targetSize = new PDRectangle(PDRectangle.A4.getHeight(), PDRectangle.A4.getWidth());
            }

            float cellWidth = targetSize.getWidth() / cols;
            float cellHeight = targetSize.getHeight() / rows;

            for (int pageIdx = 0; pageIdx < totalPages; pageIdx += pagesPerSheet) {
                PDPage outputPage = new PDPage(targetSize);
                output.addPage(outputPage);

                for (int slot = 0; slot < pagesPerSheet && (pageIdx + slot) < totalPages; slot++) {
                    int col = slot % cols;
                    int row = slot / cols;

                    PDPage srcPage = source.getPage(pageIdx + slot);
                    PDRectangle srcBox = srcPage.getMediaBox();
                    PDFormXObject form = layerUtility.importPageAsForm(source, pageIdx + slot);

                    float scaleX = cellWidth / srcBox.getWidth();
                    float scaleY = cellHeight / srcBox.getHeight();
                    float scale = Math.min(scaleX, scaleY);

                    float scaledW = srcBox.getWidth() * scale;
                    float scaledH = srcBox.getHeight() * scale;
                    float offsetX = col * cellWidth + (cellWidth - scaledW) / 2;
                    float offsetY = targetSize.getHeight() - (row + 1) * cellHeight + (cellHeight - scaledH) / 2;

                    AffineTransform transform = new AffineTransform();
                    transform.translate(offsetX, offsetY);
                    transform.scale(scale, scale);

                    try (PDPageContentStream cs = new PDPageContentStream(output, outputPage,
                            PDPageContentStream.AppendMode.APPEND, true, true)) {
                        cs.saveGraphicsState();
                        cs.transform(new org.apache.pdfbox.util.Matrix(transform));
                        cs.drawForm(form);
                        cs.restoreGraphicsState();
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            output.save(out);
            return out.toByteArray();
        }
    }
}
