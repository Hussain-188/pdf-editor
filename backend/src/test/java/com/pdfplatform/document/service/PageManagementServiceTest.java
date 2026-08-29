package com.pdfplatform.document.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.storage.StorageService;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PageManagementServiceTest {

    @Mock private StorageService storageService;
    @Mock private DocumentRepository documentRepository;
    @Mock private ThumbnailService thumbnailService;

    private PageManagementService service;

    @BeforeEach
    void setUp() {
        service = new PageManagementService(storageService, documentRepository, thumbnailService);
    }

    @Test
    void shouldRotatePage() throws IOException {
        byte[] pdfBytes = createTestPdf(3);
        Document doc = createTestDocument();
        when(storageService.download(anyString())).thenReturn(new ByteArrayInputStream(pdfBytes));
        when(documentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Document result = service.rotatePage(doc, 1, 90);

        assertNotNull(result);
        verify(storageService).upload(anyString(), any(), anyLong(), eq("application/pdf"));
    }

    @Test
    void shouldDeletePage() throws IOException {
        byte[] pdfBytes = createTestPdf(3);
        Document doc = createTestDocument();
        when(storageService.download(anyString())).thenReturn(new ByteArrayInputStream(pdfBytes));
        when(documentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Document result = service.deletePage(doc, 2);

        assertEquals(2, result.getPageCount());
    }

    @Test
    void shouldNotDeleteLastPage() throws IOException {
        byte[] pdfBytes = createTestPdf(1);
        Document doc = createTestDocument();
        when(storageService.download(anyString())).thenReturn(new ByteArrayInputStream(pdfBytes));

        assertThrows(IllegalArgumentException.class, () -> service.deletePage(doc, 1));
    }

    @Test
    void shouldInsertBlankPage() throws IOException {
        byte[] pdfBytes = createTestPdf(2);
        Document doc = createTestDocument();
        when(storageService.download(anyString())).thenReturn(new ByteArrayInputStream(pdfBytes));
        when(documentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Document result = service.insertBlankPage(doc, 1);

        assertEquals(3, result.getPageCount());
    }

    @Test
    void shouldRejectInvalidPageNumber() throws IOException {
        byte[] pdfBytes = createTestPdf(2);
        Document doc = createTestDocument();
        when(storageService.download(anyString())).thenReturn(new ByteArrayInputStream(pdfBytes));

        assertThrows(IllegalArgumentException.class, () -> service.rotatePage(doc, 5, 90));
    }

    @Test
    void shouldReorderPages() throws IOException {
        byte[] pdfBytes = createTestPdf(3);
        Document doc = createTestDocument();
        when(storageService.download(anyString())).thenReturn(new ByteArrayInputStream(pdfBytes));
        when(documentRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Document result = service.reorderPages(doc, List.of(3, 1, 2));

        assertNotNull(result);
        assertEquals(3, result.getPageCount());
    }

    private byte[] createTestPdf(int pages) throws IOException {
        PDDocument doc = new PDDocument();
        for (int i = 0; i < pages; i++) {
            doc.addPage(new PDPage(PDRectangle.A4));
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        doc.save(out);
        doc.close();
        return out.toByteArray();
    }

    private Document createTestDocument() {
        Document doc = new Document();
        doc.setId(UUID.randomUUID());
        doc.setStorageKeyOriginal("users/test/documents/123/original.pdf");
        doc.setPageCount(3);
        doc.setFileSizeBytes(1024);
        doc.setTitle("Test");
        return doc;
    }
}
