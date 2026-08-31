package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;

@Service
public class ResizeService {

    private static final Map<String, PDRectangle> SIZES = Map.ofEntries(
            Map.entry("a3", PDRectangle.A3),
            Map.entry("a4", PDRectangle.A4),
            Map.entry("a5", PDRectangle.A5),
            Map.entry("letter", PDRectangle.LETTER),
            Map.entry("legal", PDRectangle.LEGAL)
    );

    public byte[] resizeAll(byte[] pdfBytes, String targetSize) throws IOException {
        PDRectangle target = SIZES.get(targetSize.toLowerCase());
        if (target == null) {
            throw new IllegalArgumentException("Unknown page size: " + targetSize);
        }
        return resizeAll(pdfBytes, target.getWidth(), target.getHeight());
    }

    public byte[] resizeAll(byte[] pdfBytes, float width, float height) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDRectangle target = new PDRectangle(width, height);

            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                page.setMediaBox(target);
                page.setCropBox(target);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
