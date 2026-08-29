package com.pdfplatform.guest.service;

import com.pdfplatform.document.entity.Document;
import com.pdfplatform.document.repository.DocumentRepository;
import com.pdfplatform.guest.entity.GuestSession;
import com.pdfplatform.guest.repository.GuestSessionRepository;
import com.pdfplatform.storage.StorageService;
import com.pdfplatform.user.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Service
public class GuestConversionService {

    private final GuestSessionRepository guestSessionRepository;
    private final DocumentRepository documentRepository;
    private final StorageService storageService;
    private final GuestSessionService guestSessionService;

    public GuestConversionService(GuestSessionRepository guestSessionRepository,
                                   DocumentRepository documentRepository,
                                   StorageService storageService,
                                   GuestSessionService guestSessionService) {
        this.guestSessionRepository = guestSessionRepository;
        this.documentRepository = documentRepository;
        this.storageService = storageService;
        this.guestSessionService = guestSessionService;
    }

    @Transactional
    public int convertGuestToUser(String sessionToken, User user) {
        GuestSession session = guestSessionService.validateSession(sessionToken);

        List<Document> guestDocs = documentRepository.findByGuestSessionId(session.getId());

        for (Document doc : guestDocs) {
            String oldKey = doc.getStorageKeyOriginal();
            String newKey = oldKey.replace(
                    "guests/" + session.getId(),
                    "users/" + user.getId()
            );

            try {
                copyStorageObject(oldKey, newKey);
                doc.setStorageKeyOriginal(newKey);

                if (doc.getStorageKeyCurrent() != null) {
                    String newCurrentKey = doc.getStorageKeyCurrent().replace(
                            "guests/" + session.getId(),
                            "users/" + user.getId()
                    );
                    copyStorageObject(doc.getStorageKeyCurrent(), newCurrentKey);
                    doc.setStorageKeyCurrent(newCurrentKey);
                }

                if (doc.getThumbnailKey() != null) {
                    String newThumbKey = doc.getThumbnailKey().replace(
                            "guests/" + session.getId(),
                            "users/" + user.getId()
                    );
                    copyStorageObject(doc.getThumbnailKey(), newThumbKey);
                    doc.setThumbnailKey(newThumbKey);
                }
            } catch (IOException e) {
                throw new RuntimeException("Failed to migrate document storage: " + doc.getId(), e);
            }

            doc.setOwnerUser(user);
            doc.setGuestSession(null);
            doc.setExpiresAt(null);
            documentRepository.save(doc);
        }

        session.setConvertedToUser(user);
        session.setExpired(true);
        guestSessionRepository.save(session);

        return guestDocs.size();
    }

    private void copyStorageObject(String sourceKey, String destKey) throws IOException {
        try (InputStream is = storageService.download(sourceKey)) {
            byte[] data = is.readAllBytes();
            storageService.upload(destKey, new java.io.ByteArrayInputStream(data), data.length, "application/octet-stream");
        }
    }
}
