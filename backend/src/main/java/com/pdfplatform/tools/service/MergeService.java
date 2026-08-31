package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

@Service
public class MergeService {

    public byte[] merge(List<byte[]> pdfFiles) throws IOException {
        try (PDDocument merged = new PDDocument()) {
            for (byte[] pdfBytes : pdfFiles) {
                try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
                    for (int i = 0; i < doc.getNumberOfPages(); i++) {
                        merged.importPage(doc.getPage(i));
                    }
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            merged.save(out);
            return out.toByteArray();
        }
    }
}
