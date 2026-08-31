package com.pdfplatform.tools.controller;

import com.pdfplatform.tools.service.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tools")
public class ToolsController {

    private final CompressService compressService;
    private final WatermarkService watermarkService;
    private final ProtectService protectService;
    private final PageNumberService pageNumberService;
    private final MergeService mergeService;
    private final SplitService splitService;
    private final RotateService rotateService;
    private final ExtractService extractService;
    private final GrayscaleService grayscaleService;
    private final FlattenService flattenService;
    private final HeaderFooterService headerFooterService;
    private final ImageConversionService imageConversionService;
    private final CropService cropService;
    private final ResizeService resizeService;
    private final RepairService repairService;
    private final PdfToTextService pdfToTextService;
    private final BatesNumberService batesNumberService;
    private final NupService nupService;
    private final RedactService redactService;
    private final OrganizeService organizeService;
    private final FormService formService;
    private final CompareService compareService;
    private final MetadataService metadataService;
    private final ExtractImagesService extractImagesService;
    private final AlternateMixService alternateMixService;
    private final DeskewService deskewService;
    private final BookmarkService bookmarkService;

    public ToolsController(CompressService compressService, WatermarkService watermarkService,
                           ProtectService protectService, PageNumberService pageNumberService,
                           MergeService mergeService, SplitService splitService,
                           RotateService rotateService, ExtractService extractService,
                           GrayscaleService grayscaleService, FlattenService flattenService,
                           HeaderFooterService headerFooterService, ImageConversionService imageConversionService,
                           CropService cropService, ResizeService resizeService,
                           RepairService repairService, PdfToTextService pdfToTextService,
                           BatesNumberService batesNumberService, NupService nupService,
                           RedactService redactService, OrganizeService organizeService,
                           FormService formService, CompareService compareService,
                           MetadataService metadataService, ExtractImagesService extractImagesService,
                           AlternateMixService alternateMixService, DeskewService deskewService,
                           BookmarkService bookmarkService) {
        this.compressService = compressService;
        this.watermarkService = watermarkService;
        this.protectService = protectService;
        this.pageNumberService = pageNumberService;
        this.mergeService = mergeService;
        this.splitService = splitService;
        this.rotateService = rotateService;
        this.extractService = extractService;
        this.grayscaleService = grayscaleService;
        this.flattenService = flattenService;
        this.headerFooterService = headerFooterService;
        this.imageConversionService = imageConversionService;
        this.cropService = cropService;
        this.resizeService = resizeService;
        this.repairService = repairService;
        this.pdfToTextService = pdfToTextService;
        this.batesNumberService = batesNumberService;
        this.nupService = nupService;
        this.redactService = redactService;
        this.organizeService = organizeService;
        this.formService = formService;
        this.compareService = compareService;
        this.metadataService = metadataService;
        this.extractImagesService = extractImagesService;
        this.alternateMixService = alternateMixService;
        this.deskewService = deskewService;
        this.bookmarkService = bookmarkService;
    }

    @PostMapping("/compress")
    public ResponseEntity<byte[]> compress(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "0.5") float quality) throws IOException {
        byte[] result = compressService.compress(file.getBytes(), quality);
        return pdfResponse(result, "compressed.pdf");
    }

    @PostMapping("/watermark")
    public ResponseEntity<byte[]> watermark(
            @RequestParam("file") MultipartFile file,
            @RequestParam String text,
            @RequestParam(defaultValue = "0.3") float opacity,
            @RequestParam(defaultValue = "45") float rotation,
            @RequestParam(defaultValue = "48") float fontSize) throws IOException {
        byte[] result = watermarkService.addWatermark(file.getBytes(), text, opacity, rotation, fontSize);
        return pdfResponse(result, "watermarked.pdf");
    }

    @PostMapping("/protect")
    public ResponseEntity<byte[]> protect(
            @RequestParam("file") MultipartFile file,
            @RequestParam String password,
            @RequestParam(required = false) String ownerPassword,
            @RequestParam(defaultValue = "true") boolean allowPrint,
            @RequestParam(defaultValue = "false") boolean allowCopy) throws IOException {
        byte[] result = protectService.protect(file.getBytes(), password, ownerPassword, allowPrint, allowCopy);
        return pdfResponse(result, "protected.pdf");
    }

    @PostMapping("/unlock")
    public ResponseEntity<byte[]> unlock(
            @RequestParam("file") MultipartFile file,
            @RequestParam String password) throws IOException {
        byte[] result = protectService.unlock(file.getBytes(), password);
        return pdfResponse(result, "unlocked.pdf");
    }

    @PostMapping("/page-numbers")
    public ResponseEntity<byte[]> addPageNumbers(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "bottom-center") String position,
            @RequestParam(defaultValue = "1") int startFrom,
            @RequestParam(defaultValue = "10") float fontSize) throws IOException {
        byte[] result = pageNumberService.addPageNumbers(file.getBytes(), position, startFrom, fontSize);
        return pdfResponse(result, "numbered.pdf");
    }

    @PostMapping("/merge")
    public ResponseEntity<byte[]> merge(
            @RequestParam("files") MultipartFile[] files) throws IOException {
        List<byte[]> pdfFiles = new ArrayList<>();
        for (MultipartFile file : files) {
            pdfFiles.add(file.getBytes());
        }
        byte[] result = mergeService.merge(pdfFiles);
        return pdfResponse(result, "merged.pdf");
    }

    @PostMapping("/split")
    public ResponseEntity<byte[]> split(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "all") String mode,
            @RequestParam(required = false) String ranges,
            @RequestParam(defaultValue = "1") int interval,
            @RequestParam(defaultValue = "0") long maxSize) throws IOException {
        byte[] result;
        switch (mode) {
            case "ranges" -> {
                List<int[]> parsedRanges = parseRanges(ranges);
                result = splitService.splitByRanges(file.getBytes(), parsedRanges);
            }
            case "interval" -> result = splitService.splitByInterval(file.getBytes(), interval);
            case "half" -> result = splitService.splitInHalf(file.getBytes());
            case "size" -> result = splitService.splitBySize(file.getBytes(), maxSize);
            default -> result = splitService.splitEveryPage(file.getBytes());
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"split.zip\"")
                .contentType(MediaType.valueOf("application/zip"))
                .contentLength(result.length)
                .body(result);
    }

    @PostMapping("/rotate")
    public ResponseEntity<byte[]> rotate(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "90") int degrees) throws IOException {
        byte[] result = rotateService.rotateAll(file.getBytes(), degrees);
        return pdfResponse(result, "rotated.pdf");
    }

    @PostMapping("/extract")
    public ResponseEntity<byte[]> extractPages(
            @RequestParam("file") MultipartFile file,
            @RequestParam String pages) throws IOException {
        List<Integer> pageNumbers = parsePageList(pages);
        byte[] result = extractService.extractPages(file.getBytes(), pageNumbers);
        return pdfResponse(result, "extracted.pdf");
    }

    @PostMapping("/grayscale")
    public ResponseEntity<byte[]> grayscale(
            @RequestParam("file") MultipartFile file) throws IOException {
        byte[] result = grayscaleService.convertToGrayscale(file.getBytes());
        return pdfResponse(result, "grayscale.pdf");
    }

    @PostMapping("/flatten")
    public ResponseEntity<byte[]> flatten(
            @RequestParam("file") MultipartFile file) throws IOException {
        byte[] result = flattenService.flatten(file.getBytes());
        return pdfResponse(result, "flattened.pdf");
    }

    @PostMapping("/header-footer")
    public ResponseEntity<byte[]> headerFooter(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "") String headerText,
            @RequestParam(defaultValue = "") String footerText,
            @RequestParam(defaultValue = "10") float fontSize,
            @RequestParam(defaultValue = "center") String alignment) throws IOException {
        byte[] result = headerFooterService.addHeaderFooter(file.getBytes(), headerText, footerText, fontSize, alignment);
        return pdfResponse(result, "with_header_footer.pdf");
    }

    @PostMapping("/images-to-pdf")
    public ResponseEntity<byte[]> imagesToPdf(
            @RequestParam("files") MultipartFile[] files) throws IOException {
        List<byte[]> images = new ArrayList<>();
        List<String> filenames = new ArrayList<>();
        for (MultipartFile file : files) {
            images.add(file.getBytes());
            filenames.add(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image.jpg");
        }
        byte[] result = imageConversionService.imagesToPdf(images, filenames);
        return pdfResponse(result, "images.pdf");
    }

    @PostMapping("/pdf-to-images")
    public ResponseEntity<byte[]> pdfToImages(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "jpg") String format,
            @RequestParam(defaultValue = "150") int dpi) throws IOException {
        byte[] result = imageConversionService.pdfToImages(file.getBytes(), format, dpi);

        try (var doc = org.apache.pdfbox.Loader.loadPDF(file.getBytes())) {
            if (doc.getNumberOfPages() == 1) {
                String contentType = format.equals("png") ? "image/png" : "image/jpeg";
                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"page_1." + format + "\"")
                        .contentType(MediaType.valueOf(contentType))
                        .contentLength(result.length)
                        .body(result);
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"pages.zip\"")
                .contentType(MediaType.valueOf("application/zip"))
                .contentLength(result.length)
                .body(result);
    }

    @PostMapping("/crop")
    public ResponseEntity<byte[]> crop(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "0") float left,
            @RequestParam(defaultValue = "0") float bottom,
            @RequestParam(defaultValue = "0") float right,
            @RequestParam(defaultValue = "0") float top) throws IOException {
        byte[] result = cropService.cropAll(file.getBytes(), left, bottom, right, top);
        return pdfResponse(result, "cropped.pdf");
    }

    @PostMapping("/resize")
    public ResponseEntity<byte[]> resize(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) String targetSize,
            @RequestParam(defaultValue = "0") float width,
            @RequestParam(defaultValue = "0") float height) throws IOException {
        byte[] result;
        if (targetSize != null && !targetSize.isBlank()) {
            result = resizeService.resizeAll(file.getBytes(), targetSize);
        } else {
            result = resizeService.resizeAll(file.getBytes(), width, height);
        }
        return pdfResponse(result, "resized.pdf");
    }

    @PostMapping("/repair")
    public ResponseEntity<byte[]> repair(
            @RequestParam("file") MultipartFile file) throws IOException {
        byte[] result = repairService.repair(file.getBytes());
        return pdfResponse(result, "repaired.pdf");
    }

    @PostMapping("/pdf-to-text")
    public ResponseEntity<byte[]> pdfToText(
            @RequestParam("file") MultipartFile file) throws IOException {
        String text = pdfToTextService.extractText(file.getBytes());
        byte[] textBytes = text.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"extracted.txt\"")
                .contentType(MediaType.TEXT_PLAIN)
                .contentLength(textBytes.length)
                .body(textBytes);
    }

    @PostMapping("/bates-number")
    public ResponseEntity<byte[]> batesNumber(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "") String prefix,
            @RequestParam(defaultValue = "1") int startNumber,
            @RequestParam(defaultValue = "6") int digits,
            @RequestParam(defaultValue = "") String suffix,
            @RequestParam(defaultValue = "bottom-right") String position,
            @RequestParam(defaultValue = "9") float fontSize) throws IOException {
        byte[] result = batesNumberService.addBatesNumbers(file.getBytes(), prefix, startNumber, digits, suffix, position, fontSize);
        return pdfResponse(result, "bates_numbered.pdf");
    }

    @PostMapping("/nup")
    public ResponseEntity<byte[]> nup(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "4") int pagesPerSheet) throws IOException {
        byte[] result = nupService.nup(file.getBytes(), pagesPerSheet);
        return pdfResponse(result, "nup.pdf");
    }

    @PostMapping("/redact")
    public ResponseEntity<byte[]> redact(
            @RequestParam("file") MultipartFile file,
            @RequestParam String regions) throws IOException {
        List<java.util.Map<String, Object>> regionList = parseRedactRegions(regions);
        byte[] result = redactService.redactRegions(file.getBytes(), regionList);
        return pdfResponse(result, "redacted.pdf");
    }

    @PostMapping("/organize/info")
    public ResponseEntity<List<java.util.Map<String, Object>>> organizeInfo(
            @RequestParam("file") MultipartFile file) throws IOException {
        var info = organizeService.getPageInfo(file.getBytes());
        return ResponseEntity.ok(info);
    }

    @PostMapping("/organize")
    public ResponseEntity<byte[]> organize(
            @RequestParam("file") MultipartFile file,
            @RequestParam String order,
            @RequestParam(required = false) String rotations,
            @RequestParam(required = false) String deleted) throws IOException {
        List<Integer> orderList = parsePageList(order);
        List<Integer> rotationList = rotations != null && !rotations.isBlank()
                ? Arrays.stream(rotations.split(",")).map(s -> Integer.parseInt(s.trim())).collect(Collectors.toList())
                : null;
        List<Integer> deletedList = deleted != null && !deleted.isBlank()
                ? Arrays.stream(deleted.split(",")).map(s -> Integer.parseInt(s.trim())).collect(Collectors.toList())
                : null;
        byte[] result = organizeService.applyChanges(file.getBytes(), orderList, rotationList, deletedList);
        return pdfResponse(result, "organized.pdf");
    }

    @PostMapping("/form/detect")
    public ResponseEntity<List<java.util.Map<String, Object>>> detectFormFields(
            @RequestParam("file") MultipartFile file) throws IOException {
        var fields = formService.detectFields(file.getBytes());
        return ResponseEntity.ok(fields);
    }

    @PostMapping("/form/fill")
    public ResponseEntity<byte[]> fillForm(
            @RequestParam("file") MultipartFile file,
            @RequestParam String fields) throws IOException {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        java.util.Map<String, String> fieldMap = mapper.readValue(fields, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        byte[] result = formService.fillForm(file.getBytes(), fieldMap);
        return pdfResponse(result, "filled.pdf");
    }

    @PostMapping("/form/flatten")
    public ResponseEntity<byte[]> flattenForm(
            @RequestParam("file") MultipartFile file) throws IOException {
        byte[] result = formService.flattenForm(file.getBytes());
        return pdfResponse(result, "flattened_form.pdf");
    }

    @PostMapping("/form/export")
    public ResponseEntity<java.util.Map<String, String>> exportFormData(
            @RequestParam("file") MultipartFile file) throws IOException {
        var data = formService.exportFormData(file.getBytes());
        return ResponseEntity.ok(data);
    }

    @PostMapping("/compare")
    public ResponseEntity<java.util.Map<String, Object>> comparePdfs(
            @RequestParam("file1") MultipartFile file1,
            @RequestParam("file2") MultipartFile file2) throws IOException {
        var result = compareService.compare(file1.getBytes(), file2.getBytes());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/remove-metadata")
    public ResponseEntity<byte[]> removeMetadata(
            @RequestParam("file") MultipartFile file) throws IOException {
        byte[] result = metadataService.removeMetadata(file.getBytes());
        return pdfResponse(result, "no_metadata.pdf");
    }

    @PostMapping("/get-metadata")
    public ResponseEntity<java.util.Map<String, String>> getMetadata(
            @RequestParam("file") MultipartFile file) throws IOException {
        var metadata = metadataService.getMetadata(file.getBytes());
        return ResponseEntity.ok(metadata);
    }

    @PostMapping("/extract-images")
    public ResponseEntity<byte[]> extractImages(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "png") String format) throws IOException {
        byte[] result = extractImagesService.extractImages(file.getBytes(), format);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"images.zip\"")
                .contentType(MediaType.valueOf("application/zip"))
                .contentLength(result.length)
                .body(result);
    }

    @PostMapping("/alternate-mix")
    public ResponseEntity<byte[]> alternateMix(
            @RequestParam("file1") MultipartFile file1,
            @RequestParam("file2") MultipartFile file2,
            @RequestParam(defaultValue = "false") boolean reverseSecond) throws IOException {
        byte[] result = alternateMixService.alternateMix(file1.getBytes(), file2.getBytes(), reverseSecond);
        return pdfResponse(result, "mixed.pdf");
    }

    @PostMapping("/deskew")
    public ResponseEntity<byte[]> deskew(
            @RequestParam("file") MultipartFile file) throws IOException {
        byte[] result = deskewService.deskew(file.getBytes());
        return pdfResponse(result, "deskewed.pdf");
    }

    @PostMapping("/bookmarks")
    public ResponseEntity<List<java.util.Map<String, Object>>> getBookmarks(
            @RequestParam("file") MultipartFile file) throws IOException {
        var bookmarks = bookmarkService.getBookmarks(file.getBytes());
        return ResponseEntity.ok(bookmarks);
    }

    @PostMapping("/bookmarks/add")
    public ResponseEntity<byte[]> addBookmark(
            @RequestParam("file") MultipartFile file,
            @RequestParam String title,
            @RequestParam int pageNumber) throws IOException {
        byte[] result = bookmarkService.addBookmark(file.getBytes(), title, pageNumber);
        return pdfResponse(result, "bookmarked.pdf");
    }

    @PostMapping("/bookmarks/remove")
    public ResponseEntity<byte[]> removeBookmarks(
            @RequestParam("file") MultipartFile file) throws IOException {
        byte[] result = bookmarkService.removeAllBookmarks(file.getBytes());
        return pdfResponse(result, "no_bookmarks.pdf");
    }

    private List<java.util.Map<String, Object>> parseRedactRegions(String regionsJson) {
        try {
            var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            return mapper.readValue(regionsJson, new com.fasterxml.jackson.core.type.TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid redaction regions JSON");
        }
    }

    private ResponseEntity<byte[]> pdfResponse(byte[] data, String filename) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .contentLength(data.length)
                .body(data);
    }

    private List<int[]> parseRanges(String ranges) {
        if (ranges == null || ranges.isBlank()) {
            throw new IllegalArgumentException("Ranges parameter is required");
        }
        return Arrays.stream(ranges.split(","))
                .map(String::trim)
                .map(range -> {
                    String[] parts = range.split("-");
                    if (parts.length == 1) {
                        int page = Integer.parseInt(parts[0].trim());
                        return new int[]{page, page};
                    }
                    return new int[]{
                            Integer.parseInt(parts[0].trim()),
                            Integer.parseInt(parts[1].trim())
                    };
                })
                .collect(Collectors.toList());
    }

    private List<Integer> parsePageList(String pages) {
        List<Integer> result = new ArrayList<>();
        for (String part : pages.split(",")) {
            part = part.trim();
            if (part.contains("-")) {
                String[] range = part.split("-");
                int start = Integer.parseInt(range[0].trim());
                int end = Integer.parseInt(range[1].trim());
                for (int i = start; i <= end; i++) {
                    result.add(i);
                }
            } else {
                result.add(Integer.parseInt(part));
            }
        }
        return result;
    }
}
