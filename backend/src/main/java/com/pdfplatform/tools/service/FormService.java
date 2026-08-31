package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.form.*;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

@Service
public class FormService {

    public List<Map<String, Object>> detectFields(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDAcroForm form = doc.getDocumentCatalog().getAcroForm();
            if (form == null) return Collections.emptyList();

            List<Map<String, Object>> fields = new ArrayList<>();
            for (PDField field : form.getFieldTree()) {
                if (field instanceof PDNonTerminalField) continue;

                Map<String, Object> info = new LinkedHashMap<>();
                info.put("name", field.getFullyQualifiedName());
                info.put("type", getFieldType(field));
                info.put("value", field.getValueAsString());

                if (field instanceof PDChoice choice) {
                    info.put("options", choice.getOptions());
                }
                if (field instanceof PDCheckBox) {
                    info.put("checked", field.getValueAsString().equals("Yes"));
                }
                if (field.isReadOnly()) {
                    info.put("readOnly", true);
                }

                fields.add(info);
            }
            return fields;
        }
    }

    public byte[] fillForm(byte[] pdfBytes, Map<String, String> fieldValues) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDAcroForm form = doc.getDocumentCatalog().getAcroForm();
            if (form == null) {
                throw new IllegalArgumentException("PDF does not contain form fields");
            }

            for (Map.Entry<String, String> entry : fieldValues.entrySet()) {
                PDField field = form.getField(entry.getKey());
                if (field != null && !field.isReadOnly()) {
                    field.setValue(entry.getValue());
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public byte[] flattenForm(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDAcroForm form = doc.getDocumentCatalog().getAcroForm();
            if (form != null) {
                form.flatten();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public Map<String, String> exportFormData(byte[] pdfBytes) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            PDAcroForm form = doc.getDocumentCatalog().getAcroForm();
            if (form == null) return Collections.emptyMap();

            Map<String, String> data = new LinkedHashMap<>();
            for (PDField field : form.getFieldTree()) {
                if (field instanceof PDNonTerminalField) continue;
                data.put(field.getFullyQualifiedName(), field.getValueAsString());
            }
            return data;
        }
    }

    public byte[] importFormData(byte[] pdfBytes, Map<String, String> data) throws IOException {
        return fillForm(pdfBytes, data);
    }

    private String getFieldType(PDField field) {
        if (field instanceof PDTextField) return "text";
        if (field instanceof PDCheckBox) return "checkbox";
        if (field instanceof PDRadioButton) return "radio";
        if (field instanceof PDComboBox) return "combobox";
        if (field instanceof PDListBox) return "listbox";
        if (field instanceof PDSignatureField) return "signature";
        if (field instanceof PDPushButton) return "button";
        return "unknown";
    }
}
