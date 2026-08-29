package com.pdfplatform.document.service;

import com.pdfplatform.config.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import static org.junit.jupiter.api.Assertions.*;

class PdfValidationServiceTest {

    private PdfValidationService service;

    @BeforeEach
    void setUp() {
        AppProperties props = new AppProperties();
        AppProperties.Guest guest = new AppProperties.Guest();
        guest.setMaxFileSizeMb(50);
        guest.setMaxDocuments(5);
        props.setGuest(guest);

        AppProperties.Upload upload = new AppProperties.Upload();
        upload.setMaxFileSizeMb(200);
        upload.setMaxPages(500);
        props.setUpload(upload);

        service = new PdfValidationService(props);
    }

    @Test
    void shouldRejectNonPdfFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.txt", "text/plain", "Hello World".getBytes());
        var result = service.validate(file, false);
        assertFalse(result.valid());
    }

    @Test
    void shouldRejectEmptyFile() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.pdf", "application/pdf", new byte[0]);
        var result = service.validate(file, false);
        assertFalse(result.valid());
    }

    @Test
    void shouldAcceptValidPdf() throws Exception {
        byte[] minimalPdf = createMinimalPdf();
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.pdf", "application/pdf", minimalPdf);
        var result = service.validate(file, false);
        assertNotNull(result);
    }

    private byte[] createMinimalPdf() throws Exception {
        var doc = new org.apache.pdfbox.pdmodel.PDDocument();
        doc.addPage(new org.apache.pdfbox.pdmodel.PDPage());
        var out = new java.io.ByteArrayOutputStream();
        doc.save(out);
        doc.close();
        return out.toByteArray();
    }
}
