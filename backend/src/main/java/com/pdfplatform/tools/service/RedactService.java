package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.PDFTextStripperByArea;
import org.springframework.stereotype.Service;

import java.awt.geom.Rectangle2D;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@Service
public class RedactService {

    public byte[] redactRegions(byte[] pdfBytes, List<Map<String, Object>> regions) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            for (Map<String, Object> region : regions) {
                int pageNum = ((Number) region.get("page")).intValue();
                float x = ((Number) region.get("x")).floatValue();
                float y = ((Number) region.get("y")).floatValue();
                float width = ((Number) region.get("width")).floatValue();
                float height = ((Number) region.get("height")).floatValue();

                PDPage page = doc.getPage(pageNum - 1);

                try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                        PDPageContentStream.AppendMode.APPEND, true, true)) {
                    cs.setNonStrokingColor(0f, 0f, 0f);
                    cs.addRect(x, y, width, height);
                    cs.fill();
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public byte[] redactText(byte[] pdfBytes, String searchText) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFTextStripper stripper = new PDFTextStripper();

            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();

                PDFTextStripperByArea areaStripper = new PDFTextStripperByArea();
                areaStripper.addRegion("page", new Rectangle2D.Float(
                        0, 0, mediaBox.getWidth(), mediaBox.getHeight()));
                areaStripper.extractRegions(page);
                String pageText = areaStripper.getTextForRegion("page");

                if (pageText != null && pageText.toLowerCase().contains(searchText.toLowerCase())) {
                    try (PDPageContentStream cs = new PDPageContentStream(doc, page,
                            PDPageContentStream.AppendMode.APPEND, true, true)) {
                        cs.setNonStrokingColor(0f, 0f, 0f);
                    }
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
