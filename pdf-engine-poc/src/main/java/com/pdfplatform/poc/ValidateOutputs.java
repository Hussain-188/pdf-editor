package com.pdfplatform.poc;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;

import java.io.File;

public class ValidateOutputs {
    public static void main(String[] args) throws Exception {
        String[] files = {
            "output/test-edited.pdf",
            "output/test-kerned-edited.pdf",
            "output/test-resized.pdf",
            "output/test-colored.pdf"
        };

        PDFTextStripper stripper = new PDFTextStripper();

        for (String f : files) {
            File file = new File(f);
            try (PDDocument doc = Loader.loadPDF(file)) {
                String text = stripper.getText(doc);
                System.out.println("VALID: " + f + " (" + doc.getNumberOfPages() + " page, " + file.length() + " bytes)");
                System.out.println("  Text: " + text.trim().replace("\n", " | "));
            } catch (Exception e) {
                System.out.println("INVALID: " + f + " - " + e.getMessage());
            }
            System.out.println();
        }
    }
}
