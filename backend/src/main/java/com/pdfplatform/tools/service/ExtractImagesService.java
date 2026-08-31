package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class ExtractImagesService {

    public byte[] extractImages(byte[] pdfBytes) throws IOException {
        return extractImages(pdfBytes, "png");
    }

    public byte[] extractImages(byte[] pdfBytes, String format) throws IOException {
        String fmt = (format != null && format.equalsIgnoreCase("jpg")) ? "jpg" : "png";
        String ext = fmt.equals("jpg") ? "jpg" : "png";

        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            ByteArrayOutputStream zipOut = new ByteArrayOutputStream();
            try (ZipOutputStream zos = new ZipOutputStream(zipOut)) {
                int imageIndex = 1;

                for (int pageNum = 0; pageNum < doc.getNumberOfPages(); pageNum++) {
                    PDPage page = doc.getPage(pageNum);
                    PDResources resources = page.getResources();
                    if (resources == null) continue;

                    for (COSName name : resources.getXObjectNames()) {
                        if (resources.isImageXObject(name)) {
                            PDImageXObject image = (PDImageXObject) resources.getXObject(name);
                            BufferedImage bImg = image.getImage();
                            if (bImg != null) {
                                ByteArrayOutputStream imgOut = new ByteArrayOutputStream();
                                ImageIO.write(bImg, fmt, imgOut);
                                zos.putNextEntry(new ZipEntry("page" + (pageNum + 1) + "_image" + imageIndex + "." + ext));
                                zos.write(imgOut.toByteArray());
                                zos.closeEntry();
                                imageIndex++;
                            }
                        }
                    }
                }

                if (imageIndex == 1) {
                    zos.putNextEntry(new ZipEntry("no_images_found.txt"));
                    zos.write("No images were found in this PDF.".getBytes());
                    zos.closeEntry();
                }
            }
            return zipOut.toByteArray();
        }
    }
}
