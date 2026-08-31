package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Service
public class SplitService {

    public byte[] splitByRanges(byte[] pdfBytes, List<int[]> ranges) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes)) {
            int totalPages = source.getNumberOfPages();
            List<byte[]> parts = new ArrayList<>();

            for (int[] range : ranges) {
                int start = Math.max(1, range[0]);
                int end = Math.min(totalPages, range[1]);
                try (PDDocument part = new PDDocument()) {
                    for (int i = start; i <= end; i++) {
                        part.importPage(source.getPage(i - 1));
                    }
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    part.save(out);
                    parts.add(out.toByteArray());
                }
            }

            return zipParts(parts);
        }
    }

    public byte[] splitEveryPage(byte[] pdfBytes) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes)) {
            List<byte[]> parts = new ArrayList<>();
            for (int i = 0; i < source.getNumberOfPages(); i++) {
                try (PDDocument part = new PDDocument()) {
                    part.importPage(source.getPage(i));
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    part.save(out);
                    parts.add(out.toByteArray());
                }
            }
            return zipParts(parts);
        }
    }

    public byte[] splitByInterval(byte[] pdfBytes, int interval) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes)) {
            int totalPages = source.getNumberOfPages();
            List<byte[]> parts = new ArrayList<>();

            for (int start = 0; start < totalPages; start += interval) {
                int end = Math.min(start + interval, totalPages);
                try (PDDocument part = new PDDocument()) {
                    for (int i = start; i < end; i++) {
                        part.importPage(source.getPage(i));
                    }
                    ByteArrayOutputStream out = new ByteArrayOutputStream();
                    part.save(out);
                    parts.add(out.toByteArray());
                }
            }

            return zipParts(parts);
        }
    }

    public byte[] splitInHalf(byte[] pdfBytes) throws IOException {
        try (PDDocument source = Loader.loadPDF(pdfBytes)) {
            int totalPages = source.getNumberOfPages();
            if (totalPages < 2) {
                return zipParts(List.of(pdfBytes));
            }

            int midpoint = totalPages / 2;
            List<byte[]> parts = new ArrayList<>();

            try (PDDocument firstHalf = new PDDocument()) {
                for (int i = 0; i < midpoint; i++) {
                    firstHalf.importPage(source.getPage(i));
                }
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                firstHalf.save(out);
                parts.add(out.toByteArray());
            }

            try (PDDocument secondHalf = new PDDocument()) {
                for (int i = midpoint; i < totalPages; i++) {
                    secondHalf.importPage(source.getPage(i));
                }
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                secondHalf.save(out);
                parts.add(out.toByteArray());
            }

            return zipParts(parts);
        }
    }

    public byte[] splitBySize(byte[] pdfBytes, long maxSizeBytes) throws IOException {
        if (maxSizeBytes <= 0) {
            throw new IllegalArgumentException("maxSize must be greater than 0");
        }

        try (PDDocument source = Loader.loadPDF(pdfBytes)) {
            int totalPages = source.getNumberOfPages();
            List<byte[]> parts = new ArrayList<>();
            int startPage = 0;

            while (startPage < totalPages) {
                int endPage = startPage + 1;

                while (endPage <= totalPages) {
                    byte[] candidate = buildPart(source, startPage, endPage);
                    if (candidate.length > maxSizeBytes && endPage > startPage + 1) {
                        break;
                    }
                    endPage++;
                }
                endPage = Math.min(endPage - 1, totalPages);
                if (endPage <= startPage) endPage = startPage + 1;

                parts.add(buildPart(source, startPage, endPage));
                startPage = endPage;
            }

            return zipParts(parts);
        }
    }

    private byte[] buildPart(PDDocument source, int startPage, int endPage) throws IOException {
        try (PDDocument part = new PDDocument()) {
            for (int i = startPage; i < endPage; i++) {
                part.importPage(source.getPage(i));
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            part.save(out);
            return out.toByteArray();
        }
    }

    private byte[] zipParts(List<byte[]> parts) throws IOException {
        ByteArrayOutputStream zipOut = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(zipOut)) {
            for (int i = 0; i < parts.size(); i++) {
                zos.putNextEntry(new ZipEntry("part_" + (i + 1) + ".pdf"));
                zos.write(parts.get(i));
                zos.closeEntry();
            }
        }
        return zipOut.toByteArray();
    }
}
