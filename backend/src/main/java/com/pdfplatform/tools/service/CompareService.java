package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;
import java.util.List;

@Service
public class CompareService {

    public Map<String, Object> compare(byte[] pdf1Bytes, byte[] pdf2Bytes) throws IOException {
        try (PDDocument doc1 = Loader.loadPDF(pdf1Bytes);
             PDDocument doc2 = Loader.loadPDF(pdf2Bytes)) {

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("pages1", doc1.getNumberOfPages());
            result.put("pages2", doc2.getNumberOfPages());

            PDFTextStripper stripper = new PDFTextStripper();
            String text1 = stripper.getText(doc1);
            String text2 = stripper.getText(doc2);
            result.put("textMatch", text1.equals(text2));

            int maxPages = Math.max(doc1.getNumberOfPages(), doc2.getNumberOfPages());
            List<Map<String, Object>> pageDiffs = new ArrayList<>();

            PDFRenderer renderer1 = new PDFRenderer(doc1);
            PDFRenderer renderer2 = new PDFRenderer(doc2);

            for (int i = 0; i < maxPages; i++) {
                Map<String, Object> pageDiff = new LinkedHashMap<>();
                pageDiff.put("page", i + 1);

                if (i >= doc1.getNumberOfPages()) {
                    pageDiff.put("status", "added");
                    pageDiff.put("diffImage", renderPageBase64(renderer2, i));
                } else if (i >= doc2.getNumberOfPages()) {
                    pageDiff.put("status", "removed");
                    pageDiff.put("diffImage", renderPageBase64(renderer1, i));
                } else {
                    BufferedImage img1 = renderer1.renderImageWithDPI(i, 100);
                    BufferedImage img2 = renderer2.renderImageWithDPI(i, 100);
                    BufferedImage diff = createDiffImage(img1, img2);
                    boolean identical = isDiffEmpty(diff, img1.getWidth(), img1.getHeight());

                    pageDiff.put("status", identical ? "identical" : "changed");
                    if (!identical) {
                        ByteArrayOutputStream out = new ByteArrayOutputStream();
                        ImageIO.write(diff, "png", out);
                        pageDiff.put("diffImage", "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray()));
                    }
                }

                pageDiffs.add(pageDiff);
            }

            result.put("pageDiffs", pageDiffs);
            return result;
        }
    }

    private String renderPageBase64(PDFRenderer renderer, int pageIndex) throws IOException {
        BufferedImage img = renderer.renderImageWithDPI(pageIndex, 100);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
    }

    private BufferedImage createDiffImage(BufferedImage img1, BufferedImage img2) {
        int w = Math.max(img1.getWidth(), img2.getWidth());
        int h = Math.max(img1.getHeight(), img2.getHeight());
        BufferedImage diff = new BufferedImage(w, h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = diff.createGraphics();
        g.drawImage(img2, 0, 0, null);

        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int rgb1 = (x < img1.getWidth() && y < img1.getHeight()) ? img1.getRGB(x, y) : 0;
                int rgb2 = (x < img2.getWidth() && y < img2.getHeight()) ? img2.getRGB(x, y) : 0;
                if (rgb1 != rgb2) {
                    diff.setRGB(x, y, new Color(255, 0, 0, 120).getRGB());
                }
            }
        }
        g.dispose();
        return diff;
    }

    private boolean isDiffEmpty(BufferedImage diff, int w, int h) {
        int changedPixels = 0;
        int totalPixels = w * h;
        for (int y = 0; y < h; y++) {
            for (int x = 0; x < w; x++) {
                int alpha = (diff.getRGB(x, y) >> 24) & 0xFF;
                if (alpha > 0 && ((diff.getRGB(x, y) & 0x00FF0000) >> 16) > 200) {
                    changedPixels++;
                }
            }
        }
        return changedPixels < totalPixels * 0.001;
    }
}
