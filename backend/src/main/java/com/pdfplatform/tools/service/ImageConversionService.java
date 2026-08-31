package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ImageConversionService {

    public byte[] imagesToPdf(List<byte[]> images, List<String> filenames) throws IOException {
        try (PDDocument doc = new PDDocument()) {
            for (int i = 0; i < images.size(); i++) {
                String name = filenames.get(i).toLowerCase();
                PDImageXObject pdImage = PDImageXObject.createFromByteArray(doc, images.get(i), name);

                float imgWidth = pdImage.getWidth();
                float imgHeight = pdImage.getHeight();

                float maxWidth = PDRectangle.A4.getWidth() - 40;
                float maxHeight = PDRectangle.A4.getHeight() - 40;
                float scale = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
                if (scale > 1) scale = 1;

                float scaledWidth = imgWidth * scale;
                float scaledHeight = imgHeight * scale;

                PDPage page = new PDPage(new PDRectangle(scaledWidth + 40, scaledHeight + 40));
                doc.addPage(page);

                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.drawImage(pdImage, 20, 20, scaledWidth, scaledHeight);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public byte[] pdfToImages(byte[] pdfBytes, String format, int dpi) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDFRenderer renderer = new PDFRenderer(doc);
            int numPages = doc.getNumberOfPages();

            if (numPages == 1) {
                BufferedImage image = renderer.renderImageWithDPI(0, dpi, ImageType.RGB);
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                ImageIO.write(image, format, out);
                return out.toByteArray();
            }

            ByteArrayOutputStream zipOut = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(zipOut)) {
                for (int i = 0; i < numPages; i++) {
                    BufferedImage image = renderer.renderImageWithDPI(i, dpi, ImageType.RGB);
                    ByteArrayOutputStream imgOut = new ByteArrayOutputStream();
                    ImageIO.write(image, format, imgOut);
                    zos.putNextEntry(new ZipEntry("page_" + (i + 1) + "." + format));
                    zos.write(imgOut.toByteArray());
                    zos.closeEntry();
                }
            }
            return zipOut.toByteArray();
        }
    }
}
