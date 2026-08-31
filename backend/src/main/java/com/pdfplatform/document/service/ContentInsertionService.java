package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;

@Service
public class ContentInsertionService {

    private final DocumentRepository documentRepository;
    private final StorageService storageService;

    public ContentInsertionService(DocumentRepository documentRepository, StorageService storageService) {
        this.documentRepository = documentRepository;
        this.storageService = storageService;
    }

    @Transactional
    public Document addImage(Document doc, int pageNumber, byte[] imageBytes, String filename,
                              float x, float y, float width, float height) throws IOException {
        byte[] pdfBytes = loadPdfBytes(doc);

        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDPage page = pdf.getPage(pageNumber - 1);
            PDImageXObject image = PDImageXObject.createFromByteArray(pdf, imageBytes, filename);

            if (width <= 0) width = image.getWidth();
            if (height <= 0) height = image.getHeight();

            PDRectangle mediaBox = page.getMediaBox();
            float maxW = mediaBox.getWidth() - x;
            float maxH = mediaBox.getHeight() - y;
            float scale = Math.min(maxW / width, maxH / height);
            if (scale < 1) {
                width *= scale;
                height *= scale;
            }

            try (PDPageContentStream cs = new PDPageContentStream(pdf, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                cs.drawImage(image, x, y, width, height);
            }

            return savePdf(doc, pdf);
        }
    }

    @Transactional
    public Document addText(Document doc, int pageNumber, String text, float x, float y,
                             float fontSize, float[] color, String fontName) throws IOException {
        byte[] pdfBytes = loadPdfBytes(doc);

        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDPage page = pdf.getPage(pageNumber - 1);

            PDType1Font font = switch (fontName != null ? fontName : "Helvetica") {
                case "Helvetica-Bold" -> new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);
                case "Helvetica-Oblique" -> new PDType1Font(Standard14Fonts.FontName.HELVETICA_OBLIQUE);
                case "Times-Roman" -> new PDType1Font(Standard14Fonts.FontName.TIMES_ROMAN);
                case "Times-Bold" -> new PDType1Font(Standard14Fonts.FontName.TIMES_BOLD);
                case "Courier" -> new PDType1Font(Standard14Fonts.FontName.COURIER);
                case "Courier-Bold" -> new PDType1Font(Standard14Fonts.FontName.COURIER_BOLD);
                default -> new PDType1Font(Standard14Fonts.FontName.HELVETICA);
            };

            try (PDPageContentStream cs = new PDPageContentStream(pdf, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                cs.beginText();
                cs.setFont(font, fontSize);
                if (color != null && color.length == 3) {
                    cs.setNonStrokingColor(color[0], color[1], color[2]);
                }
                cs.newLineAtOffset(x, y);
                cs.showText(text);
                cs.endText();
            }

            return savePdf(doc, pdf);
        }
    }

    @Transactional
    public Document addShape(Document doc, int pageNumber, String shapeType,
                              float x, float y, float width, float height,
                              float[] fillColor, float[] strokeColor, float strokeWidth) throws IOException {
        byte[] pdfBytes = loadPdfBytes(doc);

        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDPage page = pdf.getPage(pageNumber - 1);

            try (PDPageContentStream cs = new PDPageContentStream(pdf, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                cs.setLineWidth(strokeWidth);
                if (strokeColor != null && strokeColor.length == 3) {
                    cs.setStrokingColor(strokeColor[0], strokeColor[1], strokeColor[2]);
                }

                switch (shapeType) {
                    case "rectangle" -> {
                        if (fillColor != null && fillColor.length == 3) {
                            cs.setNonStrokingColor(fillColor[0], fillColor[1], fillColor[2]);
                            cs.addRect(x, y, width, height);
                            cs.fillAndStroke();
                        } else {
                            cs.addRect(x, y, width, height);
                            cs.stroke();
                        }
                    }
                    case "ellipse" -> {
                        float cx = x + width / 2;
                        float cy = y + height / 2;
                        float rx = width / 2;
                        float ry = height / 2;
                        float k = 0.5522848f;
                        cs.moveTo(cx + rx, cy);
                        cs.curveTo(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry);
                        cs.curveTo(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy);
                        cs.curveTo(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry);
                        cs.curveTo(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy);
                        if (fillColor != null && fillColor.length == 3) {
                            cs.setNonStrokingColor(fillColor[0], fillColor[1], fillColor[2]);
                            cs.fillAndStroke();
                        } else {
                            cs.stroke();
                        }
                    }
                    case "line" -> {
                        cs.moveTo(x, y);
                        cs.lineTo(x + width, y + height);
                        cs.stroke();
                    }
                }
            }

            return savePdf(doc, pdf);
        }
    }

    @Transactional
    public Document addWhiteout(Document doc, int pageNumber,
                                 float x, float y, float width, float height) throws IOException {
        byte[] pdfBytes = loadPdfBytes(doc);

        try (PDDocument pdf = Loader.loadPDF(pdfBytes)) {
            PDPage page = pdf.getPage(pageNumber - 1);

            try (PDPageContentStream cs = new PDPageContentStream(pdf, page,
                    PDPageContentStream.AppendMode.APPEND, true, true)) {
                cs.setNonStrokingColor(1f, 1f, 1f);
                cs.addRect(x, y, width, height);
                cs.fill();
            }

            return savePdf(doc, pdf);
        }
    }

    private byte[] loadPdfBytes(Document doc) throws IOException {
        String key = doc.getStorageKeyCurrent() != null ? doc.getStorageKeyCurrent() : doc.getStorageKeyOriginal();
        try (InputStream is = storageService.download(key)) {
            return is.readAllBytes();
        }
    }

    private Document savePdf(Document doc, PDDocument pdf) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        pdf.save(out);
        byte[] bytes = out.toByteArray();

        String editedKey = doc.getStorageKeyOriginal().replace("original.pdf", "current.pdf");
        storageService.upload(editedKey, new ByteArrayInputStream(bytes), bytes.length, "application/pdf");

        doc.setStorageKeyCurrent(editedKey);
        doc.setLastEditedAt(Instant.now());
        doc.setPageCount(pdf.getNumberOfPages());
        return documentRepository.save(doc);
    }
}
