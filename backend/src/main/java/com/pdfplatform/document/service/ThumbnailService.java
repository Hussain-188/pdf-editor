package com.pdfplatform.document.service;

import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;

@Service
public class ThumbnailService {

    private static final int THUMBNAIL_DPI = 72;
    private static final int THUMBNAIL_MAX_WIDTH = 400;

    private final StorageService storageService;

    public ThumbnailService(StorageService storageService) {
        this.storageService = storageService;
    }

    public String generateAndStore(InputStream pdfStream, String thumbnailKey) throws IOException {
        byte[] pdfBytes = pdfStream.readAllBytes();

        try (PDDocument document = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(document);
            BufferedImage image = renderer.renderImageWithDPI(0, THUMBNAIL_DPI);

            if (image.getWidth() > THUMBNAIL_MAX_WIDTH) {
                image = scaleImage(image, THUMBNAIL_MAX_WIDTH);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, "png", baos);
            byte[] thumbnailBytes = baos.toByteArray();

            storageService.upload(
                    thumbnailKey,
                    new ByteArrayInputStream(thumbnailBytes),
                    thumbnailBytes.length,
                    "image/png"
            );

            return thumbnailKey;
        }
    }

    public String generateFromStorageKey(String pdfStorageKey, String thumbnailKey) throws IOException {
        try (InputStream pdfStream = storageService.download(pdfStorageKey)) {
            return generateAndStore(pdfStream, thumbnailKey);
        }
    }

    private BufferedImage scaleImage(BufferedImage original, int targetWidth) {
        double scale = (double) targetWidth / original.getWidth();
        int targetHeight = (int) (original.getHeight() * scale);

        BufferedImage scaled = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
        var g = scaled.createGraphics();
        g.setRenderingHint(java.awt.RenderingHints.KEY_INTERPOLATION, java.awt.RenderingHints.VALUE_INTERPOLATION_BILINEAR);
        g.drawImage(original, 0, 0, targetWidth, targetHeight, null);
        g.dispose();
        return scaled;
    }
}
