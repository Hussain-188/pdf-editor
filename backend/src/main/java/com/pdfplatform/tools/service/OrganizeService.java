package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class OrganizeService {

    public List<Map<String, Object>> getPageInfo(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            List<Map<String, Object>> pages = new ArrayList<>();

            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                BufferedImage thumb = renderer.renderImageWithDPI(i, 72);
                ByteArrayOutputStream thumbOut = new ByteArrayOutputStream();
                ImageIO.write(thumb, "jpg", thumbOut);
                String thumbBase64 = Base64.getEncoder().encodeToString(thumbOut.toByteArray());

                pages.add(Map.of(
                        "pageNumber", i + 1,
                        "width", page.getMediaBox().getWidth(),
                        "height", page.getMediaBox().getHeight(),
                        "rotation", page.getRotation(),
                        "thumbnail", "data:image/jpeg;base64," + thumbBase64
                ));
            }
            return pages;
        }
    }

    public byte[] applyChanges(byte[] pdfBytes, List<Integer> order, List<Integer> rotations,
                                List<Integer> deletedPages) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes);
             PDDocument output = new PDDocument()) {

            for (int i = 0; i < order.size(); i++) {
                int srcPageNum = order.get(i);
                if (deletedPages != null && deletedPages.contains(srcPageNum)) continue;

                PDPage srcPage = source.getPage(srcPageNum - 1);
                PDPage imported = output.importPage(srcPage);

                if (rotations != null && i < rotations.size() && rotations.get(i) != 0) {
                    imported.setRotation(imported.getRotation() + rotations.get(i));
                }
            }

            if (output.getNumberOfPages() == 0) {
                throw new IllegalArgumentException("Cannot delete all pages");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            output.save(out);
            return out.toByteArray();
        }
    }
}
