package com.pdfplatform.tools.service;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ProtectService {

    public byte[] protect(byte[] pdfBytes, String userPassword, String ownerPassword,
                          boolean allowPrint, boolean allowCopy) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes)) {
            AccessPermission ap = new AccessPermission();
            ap.setCanPrint(allowPrint);
            ap.setCanExtractContent(allowCopy);
            ap.setCanModify(false);
            ap.setCanModifyAnnotations(false);

            StandardProtectionPolicy policy = new StandardProtectionPolicy(
                    ownerPassword != null ? ownerPassword : userPassword,
                    userPassword,
                    ap
            );
            policy.setEncryptionKeyLength(256);
            doc.protect(policy);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }

    public byte[] unlock(byte[] pdfBytes, String password) throws IOException {
        try (PDDocument doc = Loader.loadPDF(pdfBytes, password)) {
            doc.setAllSecurityToBeRemoved(true);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();
        }
    }
}
