package com.pdfplatform.tools;

import com.pdfplatform.tools.service.WatermarkService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.junit.jupiter.api.Assertions.*;

class WatermarkServiceTest {

    private final WatermarkService service = new WatermarkService();

    @Test
    void shouldAddWatermarkToAllPages() throws IOException {
        byte[] pdf = createMultiPagePdf(3);
        byte[] result = service.addWatermark(pdf, "DRAFT", 0.3f, 45f, 48f);

        assertNotNull(result);
        try (PDDocument doc = Loader.loadPDF(result)) {
            assertEquals(3, doc.getNumberOfPages());
        }
    }

    @Test
    void shouldHandleCustomRotation() throws IOException {
        byte[] pdf = createMultiPagePdf(1);
        byte[] result = service.addWatermark(pdf, "CONFIDENTIAL", 0.5f, 0f, 24f);
        assertNotNull(result);
        assertTrue(result.length > 0);
    }

    private byte[] createMultiPagePdf(int pages) throws IOException {
        PDDocument doc = new PDDocument();
        for (int i = 0; i < pages; i++) {
            doc.addPage(new PDPage(PDRectangle.A4));
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        doc.save(out);
        doc.close();
        return out.toByteArray();
    }
}
