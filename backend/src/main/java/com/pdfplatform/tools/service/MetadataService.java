package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentInformation;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class MetadataService {

    public Map<String, String> getMetadata(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDDocumentInformation info = doc.getDocumentInformation();
            Map<String, String> metadata = new LinkedHashMap<>();
            if (info.getTitle() != null) metadata.put("title", info.getTitle());
            if (info.getAuthor() != null) metadata.put("author", info.getAuthor());
            if (info.getSubject() != null) metadata.put("subject", info.getSubject());
            if (info.getKeywords() != null) metadata.put("keywords", info.getKeywords());
            if (info.getCreator() != null) metadata.put("creator", info.getCreator());
            if (info.getProducer() != null) metadata.put("producer", info.getProducer());
            Calendar creationDate = info.getCreationDate();
            if (creationDate != null) metadata.put("creationDate", creationDate.toInstant().toString());
            Calendar modDate = info.getModificationDate();
            if (modDate != null) metadata.put("modificationDate", modDate.toInstant().toString());
            metadata.put("pageCount", String.valueOf(doc.getNumberOfPages()));
            return metadata;
        }
    }

    public byte[] removeMetadata(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDDocumentInformation info = new PDDocumentInformation();
            doc.setDocumentInformation(info);

            if (doc.getDocumentCatalog().getMetadata() != null) {
                doc.getDocumentCatalog().setMetadata(null);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
