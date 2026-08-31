package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class CropService {

    public byte[] cropAll(byte[] pdfBytes, float left, float bottom, float right, float top) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            for (int i = 0; i < doc.getNumberOfPages(); i++) {
                PDPage page = doc.getPage(i);
                PDRectangle mediaBox = page.getMediaBox();
                float newX = mediaBox.getLowerLeftX() + left;
                float newY = mediaBox.getLowerLeftY() + bottom;
                float newWidth = mediaBox.getWidth() - left - right;
                float newHeight = mediaBox.getHeight() - bottom - top;

                if (newWidth <= 0 || newHeight <= 0) {
                    throw new IllegalArgumentException("Crop margins are too large for page " + (i + 1));
                }

                PDRectangle cropBox = new PDRectangle(newX, newY, newWidth, newHeight);
                page.setCropBox(cropBox);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public byte[] cropPage(byte[] pdfBytes, int pageNumber, float left, float bottom, float right, float top) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDPage page = doc.getPage(pageNumber - 1);
            PDRectangle mediaBox = page.getMediaBox();
            float newX = mediaBox.getLowerLeftX() + left;
            float newY = mediaBox.getLowerLeftY() + bottom;
            float newWidth = mediaBox.getWidth() - left - right;
            float newHeight = mediaBox.getHeight() - bottom - top;

            if (newWidth <= 0 || newHeight <= 0) {
                throw new IllegalArgumentException("Crop margins are too large");
            }

            page.setCropBox(new PDRectangle(newX, newY, newWidth, newHeight));

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
