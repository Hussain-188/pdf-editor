package com.pdfplatform.tools;

import com.pdfplatform.tools.service.CompressService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class CompressServiceTest {

    private final CompressService service = new CompressService();

    @Test
    void shouldCompressSimplePdf() throws IOException {
        byte[] pdf = createSimplePdf();
        byte[] result = service.compress(pdf, 0.5f);
        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    @Test
    void shouldNotCorruptPdf() throws IOException {
        byte[] pdf = createSimplePdf();
        byte[] result = service.compress(pdf, 0.8f);
        // Verify result is still a valid PDF
        assertTrue(new String(result, 0, 5).startsWith("%PDF"));
    }

    private byte[] createSimplePdf() throws IOException {
        PDDocument doc = new PDDocument();
        doc.addPage(new PDPage(PDRectangle.A4));
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        doc.save(out);
        doc.close();
        return out.toByteArray();
    }
}
