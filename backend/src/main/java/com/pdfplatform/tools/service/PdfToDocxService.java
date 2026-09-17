package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.COSName;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDResources;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.util.Units;
import org.apache.poi.xwpf.usermodel.*;
import org.springframework.stereotype.Service;

import org.apache.poi.openxml4j.exceptions.InvalidFormatException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class PdfToDocxService {

    public byte[] convert(byte[] pdfBytes) throws IOException, InvalidFormatException {
        try (PDDocument pdf = Loader.loadPDF(pdfBytes);
             XWPFDocument docx = new XWPFDocument()) {

            int pageCount = pdf.getNumberOfPages();

            for (int i = 0; i < pageCount; i++) {
                if (i > 0) {
                    XWPFParagraph breakPara = docx.createParagraph();
                    breakPara.setPageBreak(true);
                }

                String pageText = extractPageText(pdf, i + 1);
                addTextToDocx(docx, pageText);

                List<byte[]> images = extractPageImages(pdf.getPage(i));
                for (byte[] imgBytes : images) {
                    addImageToDocx(docx, imgBytes);
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            docx.write(out);
            return out.toByteArray();
        }
    }

    private String extractPageText(PDDocument pdf, int pageNumber) throws IOException {
        PDFTextStripper stripper = new PDFTextStripper();
        stripper.setStartPage(pageNumber);
        stripper.setEndPage(pageNumber);
        stripper.setSortByPosition(true);
        return stripper.getText(pdf);
    }

    private void addTextToDocx(XWPFDocument docx, String text) {
        String[] lines = text.split("\r?\n");
        for (String line : lines) {
            if (line.isBlank()) continue;
            XWPFParagraph para = docx.createParagraph();
            XWPFRun run = para.createRun();
            run.setText(line);
            run.setFontSize(11);
            run.setFontFamily("Calibri");
        }
    }

    private List<byte[]> extractPageImages(PDPage page) {
        List<byte[]> images = new ArrayList<>();
        PDResources resources = page.getResources();
        if (resources == null) return images;

        for (COSName name : resources.getXObjectNames()) {
            try {
                if (resources.isImageXObject(name)) {
                    PDImageXObject image = (PDImageXObject) resources.getXObject(name);
                    BufferedImage bImg = image.getImage();
                    if (bImg != null) {
                        ByteArrayOutputStream imgOut = new ByteArrayOutputStream();
                        ImageIO.write(bImg, "png", imgOut);
                        images.add(imgOut.toByteArray());
                    }
                }
            } catch (IOException ignored) {
            }
        }
        return images;
    }

    private void addImageToDocx(XWPFDocument docx, byte[] imgBytes) throws IOException, InvalidFormatException {
        XWPFParagraph para = docx.createParagraph();
        para.setAlignment(ParagraphAlignment.CENTER);
        XWPFRun run = para.createRun();

        BufferedImage bImg = ImageIO.read(new ByteArrayInputStream(imgBytes));
        if (bImg == null) return;

        int maxWidthEmu = Units.toEMU(450);
        int imgWidthEmu = Units.toEMU(bImg.getWidth() * 72.0 / 96.0);
        int imgHeightEmu = Units.toEMU(bImg.getHeight() * 72.0 / 96.0);

        if (imgWidthEmu > maxWidthEmu) {
            double scale = (double) maxWidthEmu / imgWidthEmu;
            imgWidthEmu = maxWidthEmu;
            imgHeightEmu = (int) (imgHeightEmu * scale);
        }

        run.addPicture(
                new ByteArrayInputStream(imgBytes),
                XWPFDocument.PICTURE_TYPE_PNG,
                "image.png",
                imgWidthEmu,
                imgHeightEmu
        );
    }
}
