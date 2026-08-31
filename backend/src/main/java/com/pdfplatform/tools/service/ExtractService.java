package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class ExtractService {

    public byte[] extractPages(byte[] pdfBytes, List<Integer> pageNumbers) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes)) {
            try (PDDocument extracted = new PDDocument()) {
                for (int pageNum : pageNumbers) {
                    if (pageNum >= 1 && pageNum <= source.getNumberOfPages()) {
                        extracted.importPage(source.getPage(pageNum - 1));
                    }
                }
                if (extracted.getNumberOfPages() == 0) {
                    throw new IllegalArgumentException("No valid pages specified");
                }
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                extracted.save(out);
                return out.toByteArray();
            }
        }
    }
}
