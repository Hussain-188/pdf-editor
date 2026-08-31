package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.JPEGFactory;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import java.awt.*;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class DeskewService {

    private static final float RENDER_DPI = 200f;

    public byte[] deskew(byte[] pdfBytes) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes);
             PDDocument result = new PDDocument()) {

            PDFRenderer renderer = new PDFRenderer(source);

            for (int i = 0; i < source.getNumberOfPages(); i++) {
                PDPage origPage = source.getPage(i);
                float scale = RENDER_DPI / 72f;
                BufferedImage image = renderer.renderImage(i, scale);

                double angle = detectSkewAngle(image);

                if (Math.abs(angle) < 0.1) {
                    result.importPage(origPage);
                    continue;
                }

                BufferedImage rotated = rotateImage(image, -angle);

                PDRectangle pageSize = origPage.getMediaBox();
                PDPage newPage = new PDPage(pageSize);
                result.addPage(newPage);

                PDImageXObject pdImage = JPEGFactory.createFromImage(result, rotated, 0.92f);
                try (PDPageContentStream cs = new PDPageContentStream(result, newPage)) {
                    cs.drawImage(pdImage, 0, 0, pageSize.getWidth(), pageSize.getHeight());
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            result.save(out);
            return out.toByteArray();
        }
    }

    private double detectSkewAngle(BufferedImage image) {
        int width = image.getWidth();
        int height = image.getHeight();

        int sampleWidth = Math.min(width, 800);
        int sampleHeight = Math.min(height, 800);
        float xScale = (float) width / sampleWidth;
        float yScale = (float) height / sampleHeight;

        boolean[][] edges = new boolean[sampleHeight][sampleWidth];
        for (int y = 1; y < sampleHeight - 1; y++) {
            for (int x = 1; x < sampleWidth - 1; x++) {
                int sx = (int) (x * xScale);
                int sy = (int) (y * yScale);
                if (sx >= width - 1 || sy >= height - 1) continue;

                int c = brightness(image.getRGB(sx, sy));
                int cr = brightness(image.getRGB(Math.min(sx + 1, width - 1), sy));
                int cb = brightness(image.getRGB(sx, Math.min(sy + 1, height - 1)));
                int gradient = Math.abs(c - cr) + Math.abs(c - cb);
                edges[y][x] = gradient > 30;
            }
        }

        int maxDist = (int) Math.sqrt(sampleWidth * sampleWidth + sampleHeight * sampleHeight);
        double angleStep = Math.PI / 180.0;
        int angleSteps = 360;
        double angleStart = Math.toRadians(-10);

        int[] accumulator = new int[angleSteps * (2 * maxDist + 1)];

        for (int y = 0; y < sampleHeight; y++) {
            for (int x = 0; x < sampleWidth; x++) {
                if (!edges[y][x]) continue;
                for (int a = 0; a < angleSteps; a++) {
                    double theta = angleStart + a * angleStep * (20.0 / angleSteps);
                    int dist = (int) (x * Math.cos(theta) + y * Math.sin(theta)) + maxDist;
                    if (dist >= 0 && dist < 2 * maxDist + 1) {
                        accumulator[a * (2 * maxDist + 1) + dist]++;
                    }
                }
            }
        }

        int bestAngleIdx = 0;
        int bestCount = 0;
        for (int a = 0; a < angleSteps; a++) {
            for (int d = 0; d < 2 * maxDist + 1; d++) {
                if (accumulator[a * (2 * maxDist + 1) + d] > bestCount) {
                    bestCount = accumulator[a * (2 * maxDist + 1) + d];
                    bestAngleIdx = a;
                }
            }
        }

        double bestAngle = angleStart + bestAngleIdx * angleStep * (20.0 / angleSteps);
        double skewDegrees = Math.toDegrees(bestAngle) - 90 + 90;

        if (skewDegrees > 10) skewDegrees = 0;
        if (skewDegrees < -10) skewDegrees = 0;

        return skewDegrees;
    }

    private int brightness(int rgb) {
        int r = (rgb >> 16) & 0xFF;
        int g = (rgb >> 8) & 0xFF;
        int b = rgb & 0xFF;
        return (r + g + b) / 3;
    }

    private BufferedImage rotateImage(BufferedImage image, double angleDegrees) {
        double radians = Math.toRadians(angleDegrees);
        int w = image.getWidth();
        int h = image.getHeight();

        double cos = Math.abs(Math.cos(radians));
        double sin = Math.abs(Math.sin(radians));
        int newW = (int) Math.ceil(w * cos + h * sin);
        int newH = (int) Math.ceil(h * cos + w * sin);

        BufferedImage rotated = new BufferedImage(newW, newH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g2d = rotated.createGraphics();
        g2d.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2d.setColor(Color.WHITE);
        g2d.fillRect(0, 0, newW, newH);

        AffineTransform transform = new AffineTransform();
        transform.translate((newW - w) / 2.0, (newH - h) / 2.0);
        transform.rotate(radians, w / 2.0, h / 2.0);
        g2d.setTransform(transform);
        g2d.drawImage(image, 0, 0, null);
        g2d.dispose();

        return rotated;
    }
}
