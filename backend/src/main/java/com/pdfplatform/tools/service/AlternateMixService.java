package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class AlternateMixService {

    public byte[] alternateMix(byte[] pdf1Bytes, byte[] pdf2Bytes, boolean reverseSecond) throws IOException {
        try (PDDocument doc1 = Loader.loadPDF(pdf1Bytes);
             PDDocument doc2 = Loader.loadPDF(pdf2Bytes);
             PDDocument result = new PDDocument()) {

            int pages1 = doc1.getNumberOfPages();
            int pages2 = doc2.getNumberOfPages();
            int maxPages = Math.max(pages1, pages2);

            for (int i = 0; i < maxPages; i++) {
                if (i < pages1) {
                    result.importPage(doc1.getPage(i));
                }
                if (i < pages2) {
                    int doc2Index = reverseSecond ? (pages2 - 1 - i) : i;
                    result.importPage(doc2.getPage(doc2Index));
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            result.save(out);
            return out.toByteArray();
        }
    }
}
